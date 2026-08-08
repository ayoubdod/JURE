import { create } from 'zustand';
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
import { playCallSoundForStatus, stopCallSounds } from '@/utils/callSounds';
import { devError, devLog, devWarn } from '@/utils/devLog';
import {
  addIceCandidate,
  attachLocalVideo,
  attachRemoteMedia,
  classifyMediaError,
  cleanupCall,
  clearIceServersCache,
  clearRemoteMediaElements,
  createAnswer,
  createOffer,
  fetchIceServers,
  getCallUserMedia,
  initPeerConnection,
  mediaErrorMessage,
  replaceInputTrack,
  sampleConnectionQuality,
  setAudioOutputDevice,
  setRemoteAnswer,
  type CallKind,
  type CallMediaRefs,
  type ConnectionQuality,
  type MediaErrorKind,
} from '@/utils/webrtc';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'reconnecting'
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
  isCameraOff: boolean;
  remoteCameraOff: boolean;
  hasRemoteVideo: boolean;
  micDenied: boolean;
  mediaErrorKind: MediaErrorKind | null;
  mediaErrorMessage: string | null;
  callingProgress: number;
  kind: CallKind;
  conversationId: number | null;
  connectionQuality: ConnectionQuality;
  selectedAudioInputId: string | null;
  selectedVideoInputId: string | null;
  selectedAudioOutputId: string | null;
}

const CALLING_TIMEOUT_MS = 30_000;
const TERMINAL_RESET_MS = 3000;
const INCOMING_CALL_DEDUPE_MS = 2500;
const STATS_POLL_MS = 4000;

const initialUi = (): CallUiState => ({
  status: 'idle',
  groupName: null,
  remoteUser: null,
  startTime: null,
  endedDurationSec: null,
  isMuted: false,
  isCameraOff: false,
  remoteCameraOff: false,
  hasRemoteVideo: false,
  micDenied: false,
  mediaErrorKind: null,
  mediaErrorMessage: null,
  callingProgress: 0,
  kind: 'voice',
  conversationId: null,
  connectionQuality: 'unknown',
  selectedAudioInputId: null,
  selectedVideoInputId: null,
  selectedAudioOutputId: null,
});

function mergeCallPayload(data: WebSocketMessage | CallsWsMessage): Record<string, unknown> {
  const base = data as Record<string, unknown>;
  const p = base.payload;
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    return { ...base, ...(p as Record<string, unknown>) };
  }
  return { ...base };
}

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
  if (conversationId != null && sendConversationCallSignal(conversationId, obj)) {
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

function pairCallGroup(uidA: number, uidB: number): string {
  const [a, b] = [uidA, uidB].sort((x, y) => x - y);
  return `call_${a}_${b}`;
}

function normalizeKind(raw: unknown): CallKind {
  return String(raw ?? 'voice').toLowerCase() === 'video' ? 'video' : 'voice';
}

/** Module-level media/session refs — survive React route remounts. */
const mediaRef: CallMediaRefs = { pc: null, localStream: null, remoteStream: null };
let role: 'caller' | 'callee' | null = null;
let groupName: string | null = null;
let conversationId: number | null = null;
let pendingRemoteIce: RTCIceCandidateInit[] = [];
let offerPending: RTCSessionDescriptionInit | null = null;
let calleeReady = false;
let callStartMs: number | null = null;
let callingDeadline: number | null = null;
let terminalTimer: ReturnType<typeof setTimeout> | null = null;
let callingAnim: number | null = null;
let connecting = false;
let lastIncomingDedupe: { key: string; t: number } | null = null;
let statsTimer: ReturnType<typeof setInterval> | null = null;
let soundStatus: CallStatus | null = null;
let bootstrapped = false;
let unsubChat: (() => void) | null = null;
let unsubCalls: (() => void) | null = null;
let unsubConv: (() => void) | null = null;

interface CallSessionStore {
  ui: CallUiState;
  setUi: (patch: Partial<CallUiState> | ((prev: CallUiState) => CallUiState)) => void;
  bootstrap: () => void;
  initiateCall: (opts: {
    conversationId: number;
    targetUserId: number;
    remoteUser: CallRemoteUser;
    kind?: CallKind;
  }) => boolean;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  retryMedia: () => void;
  closeUi: () => void;
  switchAudioInput: (deviceId: string) => Promise<void>;
  switchVideoInput: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => Promise<void>;
  getLocalStream: () => MediaStream | null;
  getRemoteStream: () => MediaStream | null;
}

function getStatus(): CallStatus {
  return useCallSessionStore.getState().ui.status;
}

function setUiState(patch: Partial<CallUiState> | ((prev: CallUiState) => CallUiState)) {
  useCallSessionStore.getState().setUi(patch);
}

function clearTerminalTimer() {
  if (terminalTimer) {
    clearTimeout(terminalTimer);
    terminalTimer = null;
  }
}

function stopStatsPoll() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
}

function startStatsPoll() {
  stopStatsPoll();
  statsTimer = setInterval(() => {
    const pc = mediaRef.pc;
    if (!pc) return;
    void sampleConnectionQuality(pc).then((q) => {
      if (getStatus() === 'active' || getStatus() === 'reconnecting') {
        setUiState({ connectionQuality: q });
      }
    });
  }, STATS_POLL_MS);
}

function scheduleTerminalReset() {
  clearTerminalTimer();
  terminalTimer = setTimeout(() => {
    setUiState(initialUi());
    terminalTimer = null;
  }, TERMINAL_RESET_MS);
}

function teardownMedia() {
  if (callingAnim) {
    cancelAnimationFrame(callingAnim);
    callingAnim = null;
  }
  stopStatsPoll();
  cleanupCall(mediaRef);
  pendingRemoteIce = [];
  offerPending = null;
  calleeReady = false;
  connecting = false;
  clearRemoteMediaElements();
}

function resetIdle() {
  clearTerminalTimer();
  teardownMedia();
  role = null;
  groupName = null;
  conversationId = null;
  callStartMs = null;
  callingDeadline = null;
  void stopCallSounds();
  soundStatus = null;
  setUiState(initialUi());
}

async function flushRemoteIce(pc: RTCPeerConnection) {
  const q = pendingRemoteIce;
  pendingRemoteIce = [];
  for (const c of q) {
    try {
      await addIceCandidate(pc, c);
    } catch (e) {
      devWarn('[call] drop bad remote ICE candidate', e);
    }
  }
}

function markCallActive() {
  connecting = false;
  const start = callStartMs != null ? new Date(callStartMs) : new Date();
  if (callStartMs == null) callStartMs = start.getTime();
  setUiState((prev) =>
    prev.status === 'active'
      ? prev
      : {
          ...prev,
          status: 'active',
          startTime: prev.startTime ?? start,
        }
  );
  startStatsPoll();
}

function updateRemoteVideoFlags(stream: MediaStream) {
  const vtracks = stream.getVideoTracks();
  const hasVideo = vtracks.length > 0;
  const remoteCameraOff = hasVideo ? vtracks.every((t) => !t.enabled || t.muted || t.readyState === 'ended') : !hasVideo;
  setUiState({
    hasRemoteVideo: hasVideo && !remoteCameraOff,
    remoteCameraOff: useCallSessionStore.getState().ui.kind === 'video' ? remoteCameraOff || !hasVideo : false,
  });
  vtracks.forEach((t) => {
    t.onmute = () => updateRemoteVideoFlags(stream);
    t.onunmute = () => updateRemoteVideoFlags(stream);
    t.onended = () => updateRemoteVideoFlags(stream);
  });
}

function setupPcCommon(pc: RTCPeerConnection) {
  pc.onicecandidate = (ev) => {
    if (!groupName) return;
    if (ev.candidate) {
      sendCallSignal(
        {
          type: 'call.ice_candidate',
          candidate: ev.candidate.toJSON(),
          groupName,
        },
        conversationId
      );
    }
  };
  pc.ontrack = (ev) => {
    let stream = ev.streams[0];
    if (!stream) {
      if (!mediaRef.remoteStream) mediaRef.remoteStream = new MediaStream();
      mediaRef.remoteStream.addTrack(ev.track);
      stream = mediaRef.remoteStream;
    } else {
      mediaRef.remoteStream = stream;
    }
    attachRemoteMedia(stream);
    updateRemoteVideoFlags(stream);
    if (getStatus() === 'connecting') markCallActive();
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected' || pc.connectionState === 'completed') {
      if (getStatus() === 'connecting' || getStatus() === 'reconnecting') {
        markCallActive();
      }
    }
    if (pc.connectionState === 'disconnected') {
      if (getStatus() === 'active') {
        setUiState({ status: 'reconnecting' });
      }
    }
    if (pc.connectionState === 'failed') {
      setUiState((prev) =>
        prev.status === 'idle'
          ? prev
          : {
              ...prev,
              status: 'error',
              micDenied: false,
              mediaErrorKind: 'unknown',
              mediaErrorMessage: 'Unable to establish the connection.',
            }
      );
      scheduleTerminalReset();
    }
  };
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'disconnected' && getStatus() === 'active') {
      setUiState({ status: 'reconnecting' });
    }
    if (
      (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') &&
      getStatus() === 'reconnecting'
    ) {
      markCallActive();
    }
  };
}

async function processCalleeOffer(offerSdp: RTCSessionDescriptionInit) {
  const pc = mediaRef.pc;
  if (!pc || !groupName) return;
  try {
    const answer = await createAnswer(pc, offerSdp);
    sendCallSignal({ type: 'call.answer', sdp: answer, groupName }, conversationId);
    markCallActive();
    void flushRemoteIce(pc);
  } catch (e) {
    devError('[call] answer failed', e);
    sendCallSignal({ type: 'call.end', groupName }, conversationId);
    teardownMedia();
    setUiState((prev) => ({
      ...prev,
      status: 'error',
      micDenied: false,
      mediaErrorKind: 'unknown',
      mediaErrorMessage: 'Unable to establish the video connection.',
    }));
    scheduleTerminalReset();
  }
}

async function ensureCalleeOfferProcessed() {
  const pending = offerPending;
  if (!pending || !calleeReady) return;
  offerPending = null;
  await processCalleeOffer(pending);
}

function applyLocalStream(stream: MediaStream) {
  mediaRef.localStream = stream;
  attachLocalVideo(stream);
  const audioTrack = stream.getAudioTracks()[0];
  const videoTrack = stream.getVideoTracks()[0];
  setUiState({
    selectedAudioInputId: audioTrack?.getSettings().deviceId ?? null,
    selectedVideoInputId: videoTrack?.getSettings().deviceId ?? null,
    isCameraOff: false,
  });
}

async function startCalleeMedia() {
  if (connecting) return;
  connecting = true;
  if (!groupName || conversationId == null) {
    connecting = false;
    return;
  }
  const kind = useCallSessionStore.getState().ui.kind;
  try {
    clearIceServersCache();
    const ice = await fetchIceServers();
    const pc = initPeerConnection(ice);
    mediaRef.pc = pc;
    setupPcCommon(pc);
    const stream = await getCallUserMedia(kind, {
      audioId: useCallSessionStore.getState().ui.selectedAudioInputId ?? undefined,
      videoId: useCallSessionStore.getState().ui.selectedVideoInputId ?? undefined,
    });
    applyLocalStream(stream);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    calleeReady = true;
    setUiState({ micDenied: false, mediaErrorKind: null, mediaErrorMessage: null });
    await ensureCalleeOfferProcessed();
    connecting = false;
  } catch (e) {
    devError('[call] callee media', e);
    connecting = false;
    calleeReady = false;
    teardownMedia();
    const errKind = classifyMediaError(e);
    setUiState({
      status: 'error',
      micDenied: errKind === 'permission',
      mediaErrorKind: errKind,
      mediaErrorMessage: mediaErrorMessage(errKind, kind),
    });
    sendCallSignal({ type: 'call.end', groupName }, conversationId);
    scheduleTerminalReset();
  }
}

async function startCallerPipeline() {
  if (connecting) return;
  connecting = true;
  if (!groupName) {
    connecting = false;
    return;
  }
  const kind = useCallSessionStore.getState().ui.kind;
  try {
    setUiState({ status: 'connecting' });
    clearIceServersCache();
    const ice = await fetchIceServers();
    const pc = initPeerConnection(ice);
    mediaRef.pc = pc;
    setupPcCommon(pc);
    const stream = await getCallUserMedia(kind, {
      audioId: useCallSessionStore.getState().ui.selectedAudioInputId ?? undefined,
      videoId: useCallSessionStore.getState().ui.selectedVideoInputId ?? undefined,
    });
    applyLocalStream(stream);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await createOffer(pc);
    sendCallSignal({ type: 'call.offer', sdp: offer, groupName }, conversationId);
    await flushRemoteIce(pc);
    setUiState({ micDenied: false, mediaErrorKind: null, mediaErrorMessage: null });
  } catch (e) {
    devError('[call] caller pipeline', e);
    connecting = false;
    teardownMedia();
    const errKind = classifyMediaError(e);
    setUiState({
      status: 'error',
      micDenied: errKind === 'permission',
      mediaErrorKind: errKind,
      mediaErrorMessage: mediaErrorMessage(errKind, kind),
    });
    sendCallSignal({ type: 'call.end', groupName }, conversationId);
    scheduleTerminalReset();
  }
}

async function handleRemoteIce(candidate: RTCIceCandidateInit) {
  const pc = mediaRef.pc;
  if (!pc || !pc.remoteDescription) {
    pendingRemoteIce.push(candidate);
    return;
  }
  try {
    await addIceCandidate(pc, candidate);
  } catch (e) {
    devWarn('[call] addIceCandidate failed', e);
  }
}

function onWsMessage(data: WebSocketMessage | CallsWsMessage) {
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
    setUiState((prev) =>
      prev.status === 'idle'
        ? prev
        : {
            ...prev,
            status: 'error',
            micDenied: false,
            mediaErrorMessage: 'Unable to establish the connection.',
          }
    );
    scheduleTerminalReset();
    return;
  }

  if (type === 'call.incoming') {
    const st = getStatus();
    if (st !== 'idle' && st !== 'ringing') return;
    const targetCallee = Number(m.target_user_id ?? m.targetUserId);
    if (Number.isFinite(targetCallee) && myId != null && targetCallee !== myId) return;
    const callerId = Number(m.callerId ?? m.caller_id);
    const convId = Number(m.conversationId ?? m.conversation_id);
    const gn = String(m.groupName ?? m.group_name ?? `conversation-${convId}`);
    const name =
      (m.callerName as string) ||
      (m.caller_name as string) ||
      (m.name as string) ||
      (m.display_name as string) ||
      'Unknown';
    const avatar = (m.caller_avatar ?? m.avatar ?? null) as string | null;
    const firstName = (m.caller_first_name ?? m.first_name) as string | undefined;
    const lastName = (m.caller_last_name ?? m.last_name) as string | undefined;
    if (!Number.isFinite(callerId) || !Number.isFinite(convId)) return;
    conversationId = convId;
    groupName = gn;
    role = 'callee';
    setUiState({
      ...initialUi(),
      status: 'ringing',
      groupName: gn,
      conversationId: convId,
      kind: normalizeKind(m.kind),
      remoteUser: { id: callerId, name, avatar, firstName, lastName },
    });
    return;
  }

  if (type === 'call.accepted') {
    if (role !== 'caller') return;
    let gn = String(m.groupName ?? m.group_name ?? groupName ?? '');
    if (!gn) {
      const peerId = Number(m.receiverId ?? m.receiver_id);
      if (myId != null && Number.isFinite(peerId)) gn = pairCallGroup(myId, peerId);
      else {
        devWarn('[call] call.accepted missing groupName');
        return;
      }
    }
    groupName = gn;
    setUiState((prev) => ({ ...prev, groupName: gn }));
    const receiverName = typeof m.receiverName === 'string' ? m.receiverName : undefined;
    if (receiverName) {
      setUiState((prev) =>
        prev.remoteUser ? { ...prev, remoteUser: { ...prev.remoteUser, name: receiverName } } : prev
      );
    }
    void startCallerPipeline();
    return;
  }

  if (type === 'call.initiated') {
    if (role !== 'caller') return;
    const gn = String(m.groupName ?? m.group_name ?? '');
    if (gn) {
      groupName = gn;
      setUiState((prev) => ({
        ...prev,
        groupName: gn,
        kind: m.kind != null ? normalizeKind(m.kind) : prev.kind,
      }));
    }
    return;
  }

  if (type === 'call.offer') {
    const offerSid = Number(m.senderId ?? m.sender_id);
    if (Number.isFinite(offerSid) && myId != null && offerSid === myId) return;
    const sdp = parseSdp(m.sdp ?? m.offer, 'offer');
    if (!sdp || role !== 'callee') return;
    const gn = String(m.groupName ?? m.group_name ?? '');
    if (gn) groupName = gn;
    if (!calleeReady || !mediaRef.pc) {
      offerPending = sdp;
      return;
    }
    void processCalleeOffer(sdp);
    return;
  }

  if (type === 'call.answer') {
    if (role !== 'caller') return;
    const answerSid = Number(m.senderId ?? m.sender_id);
    if (Number.isFinite(answerSid) && myId != null && answerSid === myId) return;
    const sdp = parseSdp(m.sdp ?? m.answer, 'answer');
    const pc = mediaRef.pc;
    if (!sdp || !pc) return;
    void (async () => {
      try {
        await setRemoteAnswer(pc, sdp);
        markCallActive();
        void flushRemoteIce(pc);
      } catch (e) {
        devError('[call] setRemote answer', e);
      }
    })();
    return;
  }

  if (type === 'call.ice_candidate') {
    const senderId = Number(m.senderId ?? m.sender_id);
    if (Number.isFinite(senderId) && myId != null && senderId === myId) return;
    const c = m.candidate as RTCIceCandidateInit | undefined;
    if (!c || typeof c !== 'object' || !('candidate' in c)) return;
    void handleRemoteIce(c);
    return;
  }

  if (type === 'call.rejected') {
    if (role !== 'caller') return;
    teardownMedia();
    setUiState((prev) => ({ ...prev, status: 'declined', startTime: null }));
    scheduleTerminalReset();
    return;
  }

  if (type === 'call.ended') {
    let durSec: number | null = null;
    if (callStartMs != null) {
      durSec = Math.max(0, Math.floor((Date.now() - callStartMs) / 1000));
    }
    teardownMedia();
    setUiState((prev) => ({
      ...prev,
      status: 'ended',
      endedDurationSec: durSec,
      startTime: null,
    }));
    scheduleTerminalReset();
    return;
  }

  if (type === 'call.missed') {
    if (role !== 'caller') return;
    teardownMedia();
    setUiState((prev) => ({ ...prev, status: 'missed', startTime: null }));
    scheduleTerminalReset();
  }
}

function ingestCallMessage(raw: WebSocketMessage | CallsWsMessage) {
  const m = mergeCallPayload(raw);
  if (typeof m.type === 'string' && (m.type.startsWith('call.') || m.type === 'error')) {
    devLog('[call signaling] ←', m.type);
  }
  if (m.type === 'call.incoming') {
    const gn = String(m.groupName ?? m.group_name ?? '');
    const callerId = Number(m.callerId ?? m.caller_id);
    const convId = Number(m.conversationId ?? m.conversation_id);
    const dedupeKey =
      gn ||
      (Number.isFinite(callerId) && Number.isFinite(convId) ? `c${callerId}:v${convId}` : '');
    if (dedupeKey) {
      const now = Date.now();
      const prev = lastIncomingDedupe;
      if (prev && prev.key === dedupeKey && now - prev.t < INCOMING_CALL_DEDUPE_MS) return;
      lastIncomingDedupe = { key: dedupeKey, t: now };
    }
  }
  onWsMessage(raw);
}

function syncCallSounds(status: CallStatus) {
  if (soundStatus === status) return;
  soundStatus = status;
  void playCallSoundForStatus(status);
}

function startCallingProgress() {
  if (callingAnim) {
    cancelAnimationFrame(callingAnim);
    callingAnim = null;
  }
  const start = Date.now();
  const deadline = callingDeadline ?? start + CALLING_TIMEOUT_MS;
  const tick = () => {
    if (getStatus() !== 'calling') return;
    const now = Date.now();
    const p = Math.min(1, (now - start) / CALLING_TIMEOUT_MS);
    setUiState((prev) => (prev.status === 'calling' ? { ...prev, callingProgress: p } : prev));
    if (now >= deadline) {
      teardownMedia();
      setUiState((prev) =>
        prev.status === 'calling'
          ? { ...prev, status: 'missed', startTime: null, callingProgress: 1 }
          : prev
      );
      scheduleTerminalReset();
      return;
    }
    callingAnim = requestAnimationFrame(tick);
  };
  callingAnim = requestAnimationFrame(tick);
}

export const useCallSessionStore = create<CallSessionStore>((set, get) => ({
  ui: initialUi(),

  setUi: (patch) => {
    set((state) => {
      const next = typeof patch === 'function' ? patch(state.ui) : { ...state.ui, ...patch };
      syncCallSounds(next.status);
      if (next.status === 'calling' && state.ui.status !== 'calling') {
        queueMicrotask(() => startCallingProgress());
      }
      return { ui: next };
    });
  },

  bootstrap: () => {
    if (bootstrapped) return;
    bootstrapped = true;
    unsubChat = subscribeCallMessages(ingestCallMessage);
    unsubCalls = subscribeCallsMessages(ingestCallMessage);
    unsubConv = subscribeConversationCallMessages(ingestCallMessage);
    if (useUserStore.getState().isLoggedIn) {
      void useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
    }
  },

  initiateCall: ({ conversationId: convId, targetUserId, remoteUser, kind = 'voice' }) => {
    if (get().ui.status !== 'idle') return false;
    const myId = useUserStore.getState().user?.id;
    role = 'caller';
    conversationId = convId;
    groupName = myId != null ? pairCallGroup(myId, targetUserId) : null;
    callingDeadline = Date.now() + CALLING_TIMEOUT_MS;
    setUiState({
      ...initialUi(),
      status: 'calling',
      conversationId: convId,
      groupName,
      kind,
      remoteUser,
      callingProgress: 0,
    });
    void (async () => {
      await useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      const ok = sendCallSignal(
        { type: 'call.initiate', targetUserId, conversationId: convId, kind },
        convId
      );
      if (!ok) {
        devError('[call] call.initiate not sent');
        setUiState(initialUi());
      }
    })();
    return true;
  },

  acceptIncoming: () => {
    if (get().ui.status !== 'ringing' || !groupName) return;
    void (async () => {
      await useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      const ok = sendCallSignal({ type: 'call.accept', groupName }, conversationId);
      if (!ok) {
        devError('[call] call.accept not sent');
        resetIdle();
        return;
      }
      setUiState({ status: 'connecting' });
      void startCalleeMedia();
    })();
  },

  rejectIncoming: () => {
    if (get().ui.status !== 'ringing') return;
    const gn = groupName;
    void (async () => {
      try {
        if (gn) {
          await useCallsWsStore.getState().connect().catch(() => {});
          useChatStore.getState().connect().catch(() => {});
          sendCallSignal({ type: 'call.reject', groupName: gn }, conversationId);
        }
      } finally {
        resetIdle();
      }
    })();
  },

  endCall: () => {
    const gn = groupName;
    const startMs = callStartMs;
    if (gn) {
      void useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      sendCallSignal({ type: 'call.end', groupName: gn }, conversationId);
    }
    let durSec: number | null = null;
    if (startMs != null) {
      durSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }
    teardownMedia();
    setUiState((prev) => {
      if (prev.status === 'calling' || prev.status === 'connecting' || prev.status === 'reconnecting') {
        return { ...prev, status: 'ended', endedDurationSec: null, startTime: null };
      }
      if (prev.status === 'active') {
        return { ...prev, status: 'ended', endedDurationSec: durSec, startTime: null };
      }
      return prev;
    });
    scheduleTerminalReset();
  },

  toggleMute: () => {
    const stream = mediaRef.localStream;
    if (!stream) return;
    const nextMuted = !get().ui.isMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setUiState({ isMuted: nextMuted });
  },

  toggleCamera: () => {
    const stream = mediaRef.localStream;
    if (!stream || get().ui.kind !== 'video') return;
    const nextOff = !get().ui.isCameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setUiState({ isCameraOff: nextOff });
    attachLocalVideo(stream);
  },

  retryMedia: () => {
    if (role === 'caller') {
      connecting = false;
      teardownMedia();
      setUiState({ status: 'connecting', micDenied: false, mediaErrorKind: null, mediaErrorMessage: null });
      void startCallerPipeline();
    } else if (role === 'callee') {
      connecting = false;
      calleeReady = false;
      teardownMedia();
      setUiState({ status: 'connecting', micDenied: false, mediaErrorKind: null, mediaErrorMessage: null });
      void startCalleeMedia();
    }
  },

  closeUi: () => {
    clearTerminalTimer();
    resetIdle();
  },

  switchAudioInput: async (deviceId: string) => {
    if (!deviceId) return;
    const pc = mediaRef.pc;
    const stream = mediaRef.localStream;
    if (!pc || !stream) return;
    try {
      await replaceInputTrack(pc, stream, 'audio', deviceId);
      if (get().ui.isMuted) {
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setUiState({ selectedAudioInputId: deviceId });
    } catch (e) {
      devError('[call] switch audio input', e);
    }
  },

  switchVideoInput: async (deviceId: string) => {
    if (!deviceId) return;
    const pc = mediaRef.pc;
    const stream = mediaRef.localStream;
    if (!pc || !stream || get().ui.kind !== 'video') return;
    try {
      await replaceInputTrack(pc, stream, 'video', deviceId);
      if (get().ui.isCameraOff) {
        stream.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      attachLocalVideo(stream);
      setUiState({ selectedVideoInputId: deviceId });
    } catch (e) {
      devError('[call] switch video input', e);
    }
  },

  switchAudioOutput: async (deviceId: string) => {
    if (!deviceId) return;
    const ok = await setAudioOutputDevice(deviceId);
    if (ok) setUiState({ selectedAudioOutputId: deviceId });
  },

  getLocalStream: () => mediaRef.localStream,
  getRemoteStream: () => mediaRef.remoteStream,
}));

export function useWebRtcCall() {
  const ui = useCallSessionStore((s) => s.ui);
  const initiateCall = useCallSessionStore((s) => s.initiateCall);
  const acceptIncoming = useCallSessionStore((s) => s.acceptIncoming);
  const rejectIncoming = useCallSessionStore((s) => s.rejectIncoming);
  const endCall = useCallSessionStore((s) => s.endCall);
  const toggleMute = useCallSessionStore((s) => s.toggleMute);
  const toggleCamera = useCallSessionStore((s) => s.toggleCamera);
  const retryMedia = useCallSessionStore((s) => s.retryMedia);
  const closeUi = useCallSessionStore((s) => s.closeUi);
  const switchAudioInput = useCallSessionStore((s) => s.switchAudioInput);
  const switchVideoInput = useCallSessionStore((s) => s.switchVideoInput);
  const switchAudioOutput = useCallSessionStore((s) => s.switchAudioOutput);

  return {
    callState: ui,
    initiateCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    toggleCamera,
    retryMic: retryMedia,
    retryMedia,
    closeUi,
    switchAudioInput,
    switchVideoInput,
    switchAudioOutput,
    showCallModal: ui.status !== 'idle' && ui.status !== 'ringing',
    showIncomingNotification: ui.status === 'ringing',
  };
}
