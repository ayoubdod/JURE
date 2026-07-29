import { useCallback, useEffect, useRef, useState } from 'react';
import useChatStore, { subscribeCallMessages, type WebSocketMessage } from '@/stores/chatStore';
import useCallsWsStore, {
  subscribeCallsMessages,
  type CallsWsMessage,
} from '@/stores/callsWsStore';
import {
  subscribeConversationCallMessages,
  sendConversationCallSignal,
} from '@/stores/conversationCallBridge';
import useUserStore from '@/stores/userStore';
import { devError, devLog, devWarn } from '@/utils/devLog';
import {
  addIceCandidate,
  cleanupCall,
  createAnswer,
  createOffer,
  fetchIceServers,
  initPeerConnection,
  setRemoteAnswer,
  type CallMediaRefs,
} from '@/utils/webrtc';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'error';

export interface CallRemoteUser {
  id: number;
  name: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
}

export interface CallUiState {
  status: CallStatus;
  groupName: string | null;
  remoteUser: CallRemoteUser | null;
  startTime: Date | null;
  endedDurationSec: number | null;
  isMuted: boolean;
  micDenied: boolean;
  callingProgress: number;
  kind: 'voice' | 'video';
  conversationId: number | null;
}

const CALLING_TIMEOUT_MS = 30_000;
const TERMINAL_RESET_MS = 3000;
/** Same ring may arrive on chat + /ws/calls/ + /ws/conversation/<id>/ within a short window. */
const INCOMING_CALL_DEDUPE_MS = 2500;

function mergeCallPayload(data: WebSocketMessage | CallsWsMessage): Record<string, unknown> {
  const base = data as Record<string, unknown>;
  const p = base.payload;
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return { ...base, ...(p as Record<string, unknown>) };
  }
  return { ...base };
}

/**
 * Send call signaling on the first available socket: `/ws/calls/`, then `/ws/chat/`, then
 * `/ws/conversation/<conversationId>/` (active thread). Callees who only have the thread socket open
 * must still be able to accept / exchange SDP.
 */
function sendCallSignal(
  obj: Record<string, unknown>,
  conversationId: number | null | undefined
): boolean {
  if (useCallsWsStore.getState().send(obj)) return true;
  const chatWs = useChatStore.getState().ws;
  if (chatWs && chatWs.readyState === WebSocket.OPEN) {
    try {
      chatWs.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      devWarn('[call] chat WebSocket send failed', e);
    }
  }
  if (
    conversationId != null &&
    sendConversationCallSignal(conversationId, obj)
  ) {
    return true;
  }
  devWarn('[call] signal not sent (no open calls/chat/conversation WebSocket):', obj.type);
  return false;
}

function parseSdp(raw: unknown, fallbackType: RTCSdpType): RTCSessionDescriptionInit | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    return { type: fallbackType, sdp: raw };
  }
  if (typeof raw === 'object' && raw !== null && 'sdp' in raw) {
    const o = raw as RTCSessionDescriptionInit;
    if (typeof o.sdp === 'string') {
      return { type: o.type ?? fallbackType, sdp: o.sdp };
    }
  }
  return null;
}

function attachRemoteStream(stream: MediaStream) {
  const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
  if (el) {
    el.srcObject = stream;
    void el.play().catch(() => {});
  }
}

const initialUi = (): CallUiState => ({
  status: 'idle',
  groupName: null,
  remoteUser: null,
  startTime: null,
  endedDurationSec: null,
  isMuted: false,
  micDenied: false,
  callingProgress: 0,
  kind: 'voice',
  conversationId: null,
});

export function useWebRtcCall() {
  const [ui, setUi] = useState<CallUiState>(initialUi);
  const statusRef = useRef<CallStatus>(ui.status);
  statusRef.current = ui.status;

  const mediaRef = useRef<CallMediaRefs>({ pc: null, localStream: null });
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const groupNameRef = useRef<string | null>(null);
  const callerIdRef = useRef<number | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const pendingRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);
  const offerPendingRef = useRef<RTCSessionDescriptionInit | null>(null);
  const calleeReadyRef = useRef(false);
  const callStartMsRef = useRef<number | null>(null);
  const callingDeadlineRef = useRef<number | null>(null);
  const terminalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callingAnimRef = useRef<number | null>(null);
  const connectingRef = useRef(false);
  /** Dedupe duplicate rings from chat + /ws/calls/ + /ws/conversation/<id>/. */
  const lastIncomingDedupeRef = useRef<{ key: string; t: number } | null>(null);

  const clearTerminalTimer = useCallback(() => {
    if (terminalTimerRef.current) {
      clearTimeout(terminalTimerRef.current);
      terminalTimerRef.current = null;
    }
  }, []);

  const scheduleTerminalReset = useCallback(() => {
    clearTerminalTimer();
    terminalTimerRef.current = setTimeout(() => {
      setUi(initialUi());
      terminalTimerRef.current = null;
    }, TERMINAL_RESET_MS);
  }, [clearTerminalTimer]);

  const teardownMedia = useCallback(() => {
    if (callingAnimRef.current) {
      cancelAnimationFrame(callingAnimRef.current);
      callingAnimRef.current = null;
    }
    cleanupCall(mediaRef.current);
    pendingRemoteIceRef.current = [];
    offerPendingRef.current = null;
    calleeReadyRef.current = false;
    connectingRef.current = false;
    const el = document.getElementById('remote-audio') as HTMLAudioElement | null;
    if (el) el.srcObject = null;
  }, []);

  const resetIdle = useCallback(() => {
    clearTerminalTimer();
    teardownMedia();
    roleRef.current = null;
    groupNameRef.current = null;
    callerIdRef.current = null;
    conversationIdRef.current = null;
    callStartMsRef.current = null;
    callingDeadlineRef.current = null;
    setUi(initialUi());
  }, [clearTerminalTimer, teardownMedia]);

  const flushRemoteIce = useCallback(async (pc: RTCPeerConnection) => {
    const q = pendingRemoteIceRef.current;
    pendingRemoteIceRef.current = [];
    for (const c of q) {
      await addIceCandidate(pc, c);
    }
  }, []);

  const handleRemoteIce = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = mediaRef.current.pc;
      if (!pc) {
        pendingRemoteIceRef.current.push(candidate);
        return;
      }
      if (!pc.remoteDescription) {
        pendingRemoteIceRef.current.push(candidate);
        return;
      }
      await addIceCandidate(pc, candidate);
    },
    []
  );

  const setupPcCommon = useCallback(
    (pc: RTCPeerConnection) => {
      pc.onicecandidate = (ev) => {
        const gn = groupNameRef.current;
        if (!gn) return;
        if (ev.candidate) {
          sendCallSignal(
            {
              type: 'call.ice_candidate',
              candidate: ev.candidate.toJSON(),
              groupName: gn,
            },
            conversationIdRef.current
          );
        }
      };
      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (stream) attachRemoteStream(stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          setUi((prev) =>
            prev.status === 'idle'
              ? prev
              : { ...prev, status: 'error', micDenied: false }
          );
        }
      };
    },
    []
  );

  const processCalleeOffer = useCallback(
    async (offerSdp: RTCSessionDescriptionInit) => {
      const pc = mediaRef.current.pc;
      if (!pc) return;
      const gn = groupNameRef.current;
      if (!gn) return;
      try {
        const answer = await createAnswer(pc, offerSdp);
        sendCallSignal({ type: 'call.answer', sdp: answer, groupName: gn });
        await flushRemoteIce(pc);
        const start = new Date();
        callStartMsRef.current = start.getTime();
        setUi((prev) => ({
          ...prev,
          status: 'active',
          startTime: start,
        }));
      } catch (e) {
        devError('[call] answer failed', e);
        sendCallSignal(
          { type: 'call.end', groupName: gn },
          conversationIdRef.current
        );
        teardownMedia();
        setUi((prev) => ({ ...prev, status: 'error', micDenied: false }));
        scheduleTerminalReset();
      }
    },
    [flushRemoteIce, scheduleTerminalReset, teardownMedia]
  );

  const ensureCalleeOfferProcessed = useCallback(async () => {
    const pending = offerPendingRef.current;
    if (!pending || !calleeReadyRef.current) return;
    offerPendingRef.current = null;
    await processCalleeOffer(pending);
  }, [processCalleeOffer]);

  const startCalleeMedia = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    const gn = groupNameRef.current;
    const convId = conversationIdRef.current;
    if (!gn || convId == null) {
      connectingRef.current = false;
      return;
    }
    try {
      const ice = await fetchIceServers();
      const pc = initPeerConnection(ice);
      mediaRef.current.pc = pc;
      setupPcCommon(pc);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaRef.current.localStream = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      calleeReadyRef.current = true;
      setUi((prev) => ({ ...prev, micDenied: false }));
      await ensureCalleeOfferProcessed();
      connectingRef.current = false;
    } catch (e) {
      devError('[call] callee media', e);
      connectingRef.current = false;
      calleeReadyRef.current = false;
      teardownMedia();
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
      setUi((prev) => ({
        ...prev,
        status: 'error',
        micDenied: denied,
      }));
      if (gn) {
        sendCallSignal(
          { type: 'call.end', groupName: gn },
          conversationIdRef.current
        );
      }
      scheduleTerminalReset();
    }
  }, [ensureCalleeOfferProcessed, scheduleTerminalReset, setupPcCommon, teardownMedia]);

  const startCallerPipeline = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    const gn = groupNameRef.current;
    if (!gn) {
      connectingRef.current = false;
      return;
    }
    try {
      setUi((prev) => ({ ...prev, status: 'connecting' }));
      const ice = await fetchIceServers();
      const pc = initPeerConnection(ice);
      mediaRef.current.pc = pc;
      setupPcCommon(pc);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaRef.current.localStream = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await createOffer(pc);
      sendCallSignal(
        { type: 'call.offer', sdp: offer, groupName: gn },
        conversationIdRef.current
      );
      await flushRemoteIce(pc);
      setUi((prev) => ({ ...prev, micDenied: false }));
    } catch (e) {
      devError('[call] caller pipeline', e);
      connectingRef.current = false;
      teardownMedia();
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
      setUi((prev) => ({
        ...prev,
        status: 'error',
        micDenied: denied,
      }));
      sendCallSignal(
        { type: 'call.end', groupName: gn },
        conversationIdRef.current
      );
      scheduleTerminalReset();
    }
  }, [flushRemoteIce, scheduleTerminalReset, setupPcCommon, teardownMedia]);

  const onWsMessage = useCallback(
    (data: WebSocketMessage | CallsWsMessage) => {
      const m = mergeCallPayload(data);
      const type = m.type as string;
      const myId = useUserStore.getState().user?.id;

      if (type === 'error') {
        const payload = m.payload as { message?: string } | undefined;
        const msg =
          typeof m.message === 'string'
            ? m.message
            : typeof payload?.message === 'string'
              ? payload.message
              : 'Call error';
        devError('[call]', msg);
        setUi((prev) =>
          prev.status === 'idle' ? prev : { ...prev, status: 'error', micDenied: false }
        );
        scheduleTerminalReset();
        return;
      }

      if (type === 'call.incoming') {
        const st = statusRef.current;
        if (st !== 'idle' && st !== 'ringing') return;
        const targetCallee = Number(m.target_user_id ?? m.targetUserId);
        if (Number.isFinite(targetCallee) && myId != null && targetCallee !== myId) {
          return;
        }
        const callerId = Number(m.callerId ?? m.caller_id);
        const conversationId = Number(m.conversationId ?? m.conversation_id);
        const groupName = String(m.groupName ?? m.group_name ?? `conversation-${conversationId}`);
        const name =
          (m.callerName as string) ||
          (m.caller_name as string) ||
          (m.name as string) ||
          (m.display_name as string) ||
          'Unknown';
        const avatar = (m.caller_avatar ?? m.avatar ?? null) as string | null;
        const firstName = (m.caller_first_name ?? m.first_name) as string | undefined;
        const lastName = (m.caller_last_name ?? m.last_name) as string | undefined;
        if (!Number.isFinite(callerId) || !Number.isFinite(conversationId)) return;
        callerIdRef.current = callerId;
        conversationIdRef.current = conversationId;
        groupNameRef.current = groupName;
        roleRef.current = 'callee';
        setUi({
          ...initialUi(),
          status: 'ringing',
          groupName,
          conversationId,
          kind: 'voice',
          remoteUser: {
            id: callerId,
            name,
            avatar,
            firstName,
            lastName,
          },
        });
        return;
      }

      if (type === 'call.accepted') {
        if (roleRef.current !== 'caller') return;
        const gn = String(m.groupName ?? m.group_name ?? groupNameRef.current ?? '');
        if (!gn) {
          devWarn('[call] call.accepted missing groupName');
          return;
        }
        groupNameRef.current = gn;
        const receiverName = typeof m.receiverName === 'string' ? m.receiverName : undefined;
        if (receiverName) {
          setUi((prev) =>
            prev.remoteUser
              ? { ...prev, remoteUser: { ...prev.remoteUser, name: receiverName } }
              : prev
          );
        }
        void startCallerPipeline();
        return;
      }

      if (type === 'call.offer') {
        const offerSid = Number(m.senderId ?? m.sender_id);
        if (Number.isFinite(offerSid) && myId != null && offerSid === myId) return;
        const sdp = parseSdp(m.sdp ?? m.offer, 'offer');
        if (!sdp) return;
        if (roleRef.current !== 'callee') return;
        if (!calleeReadyRef.current || !mediaRef.current.pc) {
          offerPendingRef.current = sdp;
          return;
        }
        void processCalleeOffer(sdp);
        return;
      }

      if (type === 'call.answer') {
        if (roleRef.current !== 'caller') return;
        const answerSid = Number(m.senderId ?? m.sender_id);
        if (Number.isFinite(answerSid) && myId != null && answerSid === myId) return;
        const sdp = parseSdp(m.sdp ?? m.answer, 'answer');
        const pc = mediaRef.current.pc;
        if (!sdp || !pc) return;
        void (async () => {
          try {
            await setRemoteAnswer(pc, sdp);
            await flushRemoteIce(pc);
            connectingRef.current = false;
            const start = new Date();
            callStartMsRef.current = start.getTime();
            setUi((prev) => ({
              ...prev,
              status: 'active',
              startTime: start,
            }));
          } catch (e) {
            devError('[call] setRemote answer', e);
          }
        })();
        return;
      }

      if (type === 'call.ice_candidate') {
        const senderId = Number(m.senderId ?? m.sender_id);
        if (Number.isFinite(senderId) && myId != null && senderId === myId) {
          return;
        }
        const c = m.candidate as RTCIceCandidateInit | undefined;
        if (!c) return;
        const cand = typeof c === 'object' && 'candidate' in c ? c : null;
        if (!cand) return;
        void handleRemoteIce(cand);
        return;
      }

      if (type === 'call.rejected') {
        if (roleRef.current !== 'caller') return;
        teardownMedia();
        setUi((prev) => ({
          ...prev,
          status: 'declined',
          startTime: null,
        }));
        scheduleTerminalReset();
        return;
      }

      if (type === 'call.ended') {
        const startMs = callStartMsRef.current;
        let durSec: number | null = null;
        if (startMs != null) {
          durSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        }
        teardownMedia();
        setUi((prev) => ({
          ...prev,
          status: 'ended',
          endedDurationSec: durSec,
          startTime: null,
        }));
        scheduleTerminalReset();
        return;
      }

      if (type === 'call.missed') {
        if (roleRef.current !== 'caller') return;
        teardownMedia();
        setUi((prev) => ({
          ...prev,
          status: 'missed',
          startTime: null,
        }));
        scheduleTerminalReset();
        return;
      }
    },
    [
      flushRemoteIce,
      handleRemoteIce,
      processCalleeOffer,
      scheduleTerminalReset,
      startCallerPipeline,
      teardownMedia,
    ]
  );

  const ingestCallMessage = useCallback(
    (raw: WebSocketMessage | CallsWsMessage) => {
      const m = mergeCallPayload(raw);
      if (
        typeof m.type === 'string' &&
        (m.type.startsWith('call.') || m.type === 'error')
      ) {
        devLog('[call signaling] ←', m.type);
      }
      if (m.type === 'call.incoming') {
        const gn = String(m.groupName ?? m.group_name ?? '');
        const callerId = Number(m.callerId ?? m.caller_id);
        const convId = Number(m.conversationId ?? m.conversation_id);
        const dedupeKey =
          gn ||
          (Number.isFinite(callerId) && Number.isFinite(convId)
            ? `c${callerId}:v${convId}`
            : '');
        if (dedupeKey) {
          const now = Date.now();
          const prev = lastIncomingDedupeRef.current;
          if (prev && prev.key === dedupeKey && now - prev.t < INCOMING_CALL_DEDUPE_MS) {
            return;
          }
          lastIncomingDedupeRef.current = { key: dedupeKey, t: now };
        }
      }
      onWsMessage(raw);
    },
    [onWsMessage]
  );

  useEffect(() => {
    const unsubChat = subscribeCallMessages(ingestCallMessage);
    const unsubCalls = subscribeCallsMessages(ingestCallMessage);
    const unsubConv = subscribeConversationCallMessages(ingestCallMessage);
    return () => {
      unsubChat();
      unsubCalls();
      unsubConv();
    };
  }, [ingestCallMessage]);

  useEffect(() => {
    return () => {
      resetIdle();
    };
  }, [resetIdle]);

  const initiateCall = useCallback(
    (opts: {
      conversationId: number;
      targetUserId: number;
      remoteUser: CallRemoteUser;
      kind?: 'voice' | 'video';
    }) => {
      const { conversationId, targetUserId, remoteUser, kind = 'voice' } = opts;
      if (kind === 'video') {
        return false;
      }
      if (ui.status !== 'idle') return false;
      roleRef.current = 'caller';
      conversationIdRef.current = conversationId;
      groupNameRef.current = null;
      callerIdRef.current = null;
      callingDeadlineRef.current = Date.now() + CALLING_TIMEOUT_MS;
      setUi({
        ...initialUi(),
        status: 'calling',
        conversationId,
        kind,
        remoteUser,
        callingProgress: 0,
      });
      void (async () => {
        await useCallsWsStore.getState().connect().catch(() => {
          /* optional; initiate may use /ws/chat/ or /ws/conversation/<id>/ */
        });
        useChatStore.getState().connect().catch(() => {});
        const ok = sendCallSignal(
          {
            type: 'call.initiate',
            targetUserId,
            conversationId,
          },
          conversationId
        );
        if (!ok) {
          devError(
            '[call] call.initiate not sent — open the conversation (thread socket) or ensure /ws/chat/ or /ws/calls/ is connected; check JWT.'
          );
          setUi(initialUi());
        }
      })();
      return true;
    },
    [ui.status]
  );

  useEffect(() => {
    if (ui.status !== 'calling') {
      if (callingAnimRef.current) {
        cancelAnimationFrame(callingAnimRef.current);
        callingAnimRef.current = null;
      }
      return;
    }
    const start = Date.now();
    const deadline = callingDeadlineRef.current ?? start + CALLING_TIMEOUT_MS;
    const tick = () => {
      const now = Date.now();
      const p = Math.min(1, (now - start) / CALLING_TIMEOUT_MS);
      setUi((prev) => (prev.status === 'calling' ? { ...prev, callingProgress: p } : prev));
      if (now >= deadline) {
        teardownMedia();
        setUi((prev) =>
          prev.status === 'calling'
            ? { ...prev, status: 'missed', startTime: null, callingProgress: 1 }
            : prev
        );
        scheduleTerminalReset();
        return;
      }
      callingAnimRef.current = requestAnimationFrame(tick);
    };
    callingAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (callingAnimRef.current) cancelAnimationFrame(callingAnimRef.current);
      callingAnimRef.current = null;
    };
  }, [ui.status, scheduleTerminalReset, teardownMedia]);

  const acceptIncoming = useCallback(() => {
    if (ui.status !== 'ringing') return;
    const gn = groupNameRef.current;
    if (!gn) return;
    void (async () => {
      await useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      /** Backend contract: `{ type: 'call.accept', groupName }` (from `call.incoming`). */
      const ok = sendCallSignal(
        { type: 'call.accept', groupName: gn },
        conversationIdRef.current
      );
      if (!ok) {
        devError('[call] call.accept not sent — no signaling WebSocket available');
        resetIdle();
        return;
      }
      setUi((prev) => ({ ...prev, status: 'connecting' }));
      void startCalleeMedia();
    })();
  }, [resetIdle, startCalleeMedia, ui.status]);

  const rejectIncoming = useCallback(() => {
    if (ui.status !== 'ringing') return;
    const gn = groupNameRef.current;
    void (async () => {
      try {
        if (gn) {
          await useCallsWsStore.getState().connect().catch(() => {});
          useChatStore.getState().connect().catch(() => {});
          sendCallSignal(
            { type: 'call.reject', groupName: gn },
            conversationIdRef.current
          );
        }
      } finally {
        resetIdle();
      }
    })();
  }, [resetIdle, ui.status]);

  const endCall = useCallback(() => {
    const gn = groupNameRef.current;
    const startMs = callStartMsRef.current;
    if (gn) {
      void useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      sendCallSignal(
        { type: 'call.end', groupName: gn },
        conversationIdRef.current
      );
    }
    let durSec: number | null = null;
    if (startMs != null) {
      durSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }
    teardownMedia();
    setUi((prev) => {
      if (prev.status === 'calling' || prev.status === 'connecting') {
        return { ...prev, status: 'ended', endedDurationSec: null, startTime: null };
      }
      if (prev.status === 'active') {
        return { ...prev, status: 'ended', endedDurationSec: durSec, startTime: null };
      }
      return prev;
    });
    scheduleTerminalReset();
  }, [scheduleTerminalReset, teardownMedia]);

  const toggleMute = useCallback(() => {
    const stream = mediaRef.current.localStream;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setUi((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const retryMic = useCallback(() => {
    if (roleRef.current === 'caller') {
      connectingRef.current = false;
      teardownMedia();
      setUi((prev) => ({ ...prev, status: 'connecting', micDenied: false }));
      void startCallerPipeline();
    } else if (roleRef.current === 'callee') {
      connectingRef.current = false;
      calleeReadyRef.current = false;
      teardownMedia();
      setUi((prev) => ({ ...prev, status: 'connecting', micDenied: false }));
      void startCalleeMedia();
    }
  }, [startCalleeMedia, startCallerPipeline, teardownMedia]);

  const closeUi = useCallback(() => {
    clearTerminalTimer();
    resetIdle();
  }, [clearTerminalTimer, resetIdle]);

  const showCallModal =
    ui.status !== 'idle' &&
    ui.status !== 'ringing';

  const showIncomingNotification = ui.status === 'ringing';

  return {
    callState: ui,
    initiateCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    retryMic,
    closeUi,
    showCallModal,
    showIncomingNotification,
  };
}
