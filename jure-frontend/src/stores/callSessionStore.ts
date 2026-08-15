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
import {
  clearIncomingCallNotification,
  showIncomingCallNotification,
} from '@/utils/incomingCallNotify';
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
  getScreenShareStream,
  applyOutboundVideoTrack,
  initPeerConnection,
  mediaErrorMessage,
  remoteStreamFromPeerConnection,
  replaceInputTrack,
  sampleConnectionQuality,
  setAudioOutputDevice,
  setRemoteAnswer,
  unlockRemoteAudioPlayback,
  type CallKind,
  type CallMediaRefs,
  type ConnectionQuality,
  type MediaErrorKind,
} from '@/utils/webrtc';
import {
  answerFromPeer,
  applyPeerAnswer,
  applyPeerIce,
  closeAllPeers,
  offerToPeer,
  peerListSnapshot,
  rememberPeerMeta,
  setPeerSpeaking,
  updatePeerVideoFlags,
  type ConferencePeer,
  type ConferencePeerSnapshot,
} from '@/utils/conferenceMesh';
import { useConversationCallPresenceStore } from '@/stores/conversationCallPresenceStore';

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
  /** Group / conversation title for conference header (not a single peer name). */
  displayTitle: string | null;
  /** Conference remote peers (mesh). Empty for classic 1:1. */
  peers: ConferencePeerSnapshot[];
  mode: 'direct' | 'conference';
  startTime: Date | null;
  endedDurationSec: number | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
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
  displayTitle: null,
  peers: [],
  mode: 'direct',
  startTime: null,
  endedDurationSec: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
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
const conferencePeers: Map<number, ConferencePeer> = new Map();
let callMode: 'direct' | 'conference' = 'direct';
let role: 'caller' | 'callee' | null = null;
let groupName: string | null = null;
let conversationId: number | null = null;
let pendingRemoteIce: RTCIceCandidateInit[] = [];
let offerPending: RTCSessionDescriptionInit | null = null;
let pendingConferenceOffers: { peerId: number; sdp: RTCSessionDescriptionInit }[] = [];
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
let knownRemoteUsers: Map<number, CallRemoteUser> = new Map();
let speakingTimer: ReturnType<typeof setInterval> | null = null;
/** Camera track kept while screen-sharing so we can restore it. */
let savedCameraTrack: MediaStreamTrack | null = null;
let screenShareTrack: MediaStreamTrack | null = null;

function isPlaceholderPeerName(name: string | undefined | null): boolean {
  if (!name) return true;
  const n = name.trim();
  return /^user\s*\d+$/i.test(n) || /^member\s*\d+$/i.test(n);
}

function rememberRemoteUser(user: CallRemoteUser) {
  if (!Number.isFinite(user.id)) return;
  const prev = knownRemoteUsers.get(user.id);
  const merged: CallRemoteUser = {
    id: user.id,
    name:
      user.name && !isPlaceholderPeerName(user.name)
        ? user.name
        : prev?.name && !isPlaceholderPeerName(prev.name)
          ? prev.name
          : user.name || prev?.name || `User ${user.id}`,
    avatar: user.avatar ?? prev?.avatar ?? null,
    firstName: user.firstName ?? prev?.firstName,
    lastName: user.lastName ?? prev?.lastName,
  };
  knownRemoteUsers.set(user.id, merged);
  const slot = conferencePeers.get(user.id);
  if (slot) {
    const better =
      merged.name &&
      !isPlaceholderPeerName(merged.name) &&
      (isPlaceholderPeerName(slot.name) || slot.name !== merged.name);
    if (better || (merged.avatar && merged.avatar !== slot.avatar)) {
      slot.name = merged.name;
      slot.avatar = merged.avatar;
      slot.firstName = merged.firstName;
      slot.lastName = merged.lastName;
      conferencePeers.set(user.id, slot);
      syncPeersUi();
    }
  }
}

function ingestParticipantProfiles(raw: unknown) {
  if (!Array.isArray(raw)) return;
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = Number(o.id ?? o.userId ?? o.user_id);
    if (!Number.isFinite(id)) continue;
    const name = String(o.name ?? o.full_name ?? o.fullName ?? '').trim();
    if (!name) continue;
    rememberRemoteUser({
      id,
      name,
      avatar: (o.avatar ?? o.image ?? null) as string | null,
      firstName:
        typeof o.firstName === 'string'
          ? o.firstName
          : typeof o.first_name === 'string'
            ? o.first_name
            : undefined,
      lastName:
        typeof o.lastName === 'string'
          ? o.lastName
          : typeof o.last_name === 'string'
            ? o.last_name
            : undefined,
    });
  }
}

function peerMetaFromKnown(peerId: number): Partial<Pick<ConferencePeer, 'name' | 'avatar' | 'firstName' | 'lastName'>> | undefined {
  const known = knownRemoteUsers.get(peerId);
  if (!known) return undefined;
  return {
    name: known.name,
    avatar: known.avatar,
    firstName: known.firstName,
    lastName: known.lastName,
  };
}

function collectOutboundPcs(): RTCPeerConnection[] {
  const pcs: RTCPeerConnection[] = [];
  if (mediaRef.pc) pcs.push(mediaRef.pc);
  for (const peer of conferencePeers.values()) {
    if (peer.pc) pcs.push(peer.pc);
  }
  return pcs;
}

async function renegotiateAfterTrackChange() {
  if (callMode !== 'conference' || !groupName || !mediaRef.localStream) return;
  for (const [peerId, slot] of conferencePeers) {
    if (!slot.pc || slot.pc.signalingState !== 'stable') continue;
    try {
      const offer = await createOffer(slot.pc);
      conferenceSend({ type: 'call.offer', sdp: offer, groupName, targetUserId: peerId });
    } catch (e) {
      devWarn('[call] renegotiate after screen share', peerId, e);
    }
  }
}

async function stopScreenShareInternal(restoreCamera: boolean) {
  const stream = mediaRef.localStream;
  const pcs = collectOutboundPcs();
  if (screenShareTrack) {
    try {
      screenShareTrack.onended = null;
    } catch {
      /* ignore */
    }
    screenShareTrack.stop();
    screenShareTrack = null;
  }
  if (!stream) {
    savedCameraTrack = null;
    setUiState({ isScreenSharing: false });
    return;
  }

  let nextTrack: MediaStreamTrack | null = null;
  const kind = useCallSessionStore.getState().ui.kind;
  if (restoreCamera && kind === 'video') {
    if (savedCameraTrack && savedCameraTrack.readyState === 'live') {
      nextTrack = savedCameraTrack;
    } else {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: useCallSessionStore.getState().ui.selectedVideoInputId
            ? { deviceId: { exact: useCallSessionStore.getState().ui.selectedVideoInputId! } }
            : true,
        });
        nextTrack = cam.getVideoTracks()[0] ?? null;
        cam.getTracks().forEach((t) => {
          if (t !== nextTrack) t.stop();
        });
      } catch (e) {
        devWarn('[call] restore camera after screen share', e);
      }
    }
  } else if (savedCameraTrack) {
    savedCameraTrack.stop();
  }
  savedCameraTrack = null;

  const hadVideoSender = pcs.some((pc) => pc.getSenders().some((s) => s.track?.kind === 'video'));
  await applyOutboundVideoTrack(pcs, stream, nextTrack, { stopRemoved: true });
  if (nextTrack && useCallSessionStore.getState().ui.isCameraOff) {
    nextTrack.enabled = false;
  }
  if (!hadVideoSender || (callMode === 'conference' && !nextTrack && kind === 'voice')) {
    await renegotiateAfterTrackChange();
  }
  if (!hadVideoSender && nextTrack && callMode === 'direct' && mediaRef.pc && groupName) {
    try {
      const offer = await createOffer(mediaRef.pc);
      sendCallSignal({ type: 'call.offer', sdp: offer, groupName }, conversationId);
    } catch (e) {
      devWarn('[call] renegotiate 1:1 after screen share', e);
    }
  }
  setUiState({ isScreenSharing: false });
  attachLocalVideo(stream);
}

function syncPeersUi() {
  const peers = peerListSnapshot(conferencePeers);
  const patch: Partial<CallUiState> = {
    peers,
    hasRemoteVideo: peers.some((p) => p.hasVideo),
    remoteCameraOff: peers.length > 0 ? peers.every((p) => p.cameraOff) : false,
  };
  // Keep conference header on the group title — don't replace remoteUser with peers[0].
  if (callMode !== 'conference') {
    const primary = peers[0];
    patch.remoteUser = primary
      ? {
          id: primary.id,
          name: primary.name,
          avatar: primary.avatar,
          firstName: primary.firstName,
          lastName: primary.lastName,
        }
      : useCallSessionStore.getState().ui.remoteUser;
  }
  setUiState(patch);
}

function stopSpeakingMonitor() {
  if (speakingTimer) {
    clearInterval(speakingTimer);
    speakingTimer = null;
  }
}

function ensureSpeakingMonitor() {
  if (speakingTimer) return;
  speakingTimer = setInterval(() => {
    if (callMode !== 'conference' || conferencePeers.size === 0) return;
    void (async () => {
      let changed = false;
      for (const [peerId, peer] of conferencePeers) {
        const pc = peer.pc;
        if (!pc) {
          if (setPeerSpeaking(conferencePeers, peerId, false)) changed = true;
          continue;
        }
        try {
          const stats = await pc.getStats();
          let level = 0;
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && (report as { kind?: string }).kind === 'audio') {
              const n = Number((report as { audioLevel?: number }).audioLevel ?? 0);
              if (n > level) level = n;
            }
          });
          if (setPeerSpeaking(conferencePeers, peerId, level > 0.02)) changed = true;
        } catch {
          /* ignore */
        }
      }
      if (changed) syncPeersUi();
    })();
  }, 300);
}

function bindPeerTrackListeners(peerId: number, stream: MediaStream) {
  const kind = useCallSessionStore.getState().ui.kind;
  const refresh = () => {
    updatePeerVideoFlags(conferencePeers, peerId, kind);
    syncPeersUi();
  };
  stream.getTracks().forEach((track) => {
    track.onunmute = refresh;
    track.onmute = refresh;
    track.onended = refresh;
  });
}

function onConferenceTrack(peerId: number, stream: MediaStream) {
  // Prefer keeping a dedicated remoteStream per peer; only use global for 1:1 fallbacks.
  if (callMode !== 'conference') {
    mediaRef.remoteStream = stream;
  }
  bindPeerTrackListeners(peerId, stream);
  updatePeerVideoFlags(conferencePeers, peerId, useCallSessionStore.getState().ui.kind);
  syncPeersUi();
  ensureSpeakingMonitor();
  if (getStatus() === 'connecting' || getStatus() === 'calling') markCallActive();
}

function conferenceSend(obj: Record<string, unknown>): boolean {
  return sendCallSignal(obj, conversationId);
}

function onConferencePcState(peerId: number, state: string) {
  if (state === 'connected' || state === 'completed') {
    if (getStatus() === 'connecting' || getStatus() === 'reconnecting' || getStatus() === 'calling') {
      markCallActive();
    }
  }
  if (state === 'failed') {
    devWarn('[conference] peer connection failed', peerId);
  }
}

interface CallSessionStore {
  ui: CallUiState;
  setUi: (patch: Partial<CallUiState> | ((prev: CallUiState) => CallUiState)) => void;
  bootstrap: () => void;
  initiateCall: (opts: {
    conversationId: number;
    targetUserId?: number;
    targetUserIds?: number[];
    remoteUser: CallRemoteUser;
    remoteUsers?: CallRemoteUser[];
    kind?: CallKind;
    mode?: 'direct' | 'conference';
    displayTitle?: string | null;
  }) => boolean;
  joinActiveCall: (opts: {
    conversationId: number;
    groupName: string;
    kind?: CallKind;
    mode?: 'direct' | 'conference';
    remoteUser?: CallRemoteUser | null;
    remoteUsers?: CallRemoteUser[];
    displayTitle?: string | null;
  }) => boolean;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  retryMedia: () => void;
  closeUi: () => void;
  switchAudioInput: (deviceId: string) => Promise<void>;
  switchVideoInput: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => Promise<void>;
  getLocalStream: () => MediaStream | null;
  getRemoteStream: () => MediaStream | null;
  getPeerStream: (peerId: number) => MediaStream | null;
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
  stopSpeakingMonitor();
  if (screenShareTrack) {
    try {
      screenShareTrack.onended = null;
    } catch {
      /* ignore */
    }
    screenShareTrack.stop();
    screenShareTrack = null;
  }
  if (savedCameraTrack) {
    savedCameraTrack.stop();
    savedCameraTrack = null;
  }
  closeAllPeers(conferencePeers);
  cleanupCall(mediaRef);
  pendingRemoteIce = [];
  offerPending = null;
  pendingConferenceOffers = [];
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
  callMode = 'direct';
  knownRemoteUsers.clear();
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
  if (mediaRef.pc) {
    const fromPc = remoteStreamFromPeerConnection(mediaRef.pc);
    if (fromPc.getAudioTracks().length > 0 || fromPc.getTracks().length > 0) {
      mediaRef.remoteStream = fromPc;
    }
  }
  if (mediaRef.remoteStream) {
    attachRemoteMedia(mediaRef.remoteStream);
    window.setTimeout(() => {
      if (mediaRef.remoteStream) attachRemoteMedia(mediaRef.remoteStream);
    }, 200);
  }
}

function updateRemoteVideoFlags(stream: MediaStream) {
  const vtracks = stream.getVideoTracks();
  const hasVideo = vtracks.length > 0;
  // Do not use track.muted — remotes (esp. screen share) often start muted until the first frame.
  const remoteCameraOff = hasVideo
    ? vtracks.every((t) => !t.enabled || t.readyState === 'ended')
    : !hasVideo;
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
    ev.track.enabled = true;
    if (!mediaRef.remoteStream) mediaRef.remoteStream = new MediaStream();
    if (!mediaRef.remoteStream.getTracks().some((t) => t.id === ev.track.id)) {
      mediaRef.remoteStream.addTrack(ev.track);
    }
    const bundled = ev.streams[0];
    if (bundled) {
      bundled.getTracks().forEach((t) => {
        if (!mediaRef.remoteStream!.getTracks().some((x) => x.id === t.id)) {
          mediaRef.remoteStream!.addTrack(t);
        }
      });
    }
    const stream = mediaRef.remoteStream;
    attachRemoteMedia(stream);
    updateRemoteVideoFlags(stream);
    stream.onaddtrack = () => {
      updateRemoteVideoFlags(stream);
      attachRemoteMedia(stream);
    };
    stream.onremovetrack = () => updateRemoteVideoFlags(stream);
    ev.track.onunmute = () => attachRemoteMedia(stream);
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
  const live =
    getStatus() === 'active' ||
    getStatus() === 'connecting' ||
    getStatus() === 'reconnecting';
  try {
    if (pc.signalingState === 'have-local-offer') {
      try {
        await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
      } catch {
        devWarn('[call] renegotiation rollback failed', pc.signalingState);
        return;
      }
    } else if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
      devWarn('[call] skip answer — signaling busy', pc.signalingState);
      return;
    }
    const answer = await createAnswer(pc, offerSdp);
    sendCallSignal({ type: 'call.answer', sdp: answer, groupName }, conversationId);
    markCallActive();
    void flushRemoteIce(pc);
  } catch (e) {
    devError('[call] answer failed', e);
    // Renegotiation failures (screen share) must not tear down an active call.
    if (live) return;
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

async function ensureConferenceLocalMedia(): Promise<MediaStream | null> {
  if (mediaRef.localStream) return mediaRef.localStream;
  const kind = useCallSessionStore.getState().ui.kind;
  try {
    clearIceServersCache();
    const stream = await getCallUserMedia(kind, {
      audioId: useCallSessionStore.getState().ui.selectedAudioInputId ?? undefined,
      videoId: useCallSessionStore.getState().ui.selectedVideoInputId ?? undefined,
    });
    applyLocalStream(stream);
    setUiState({ micDenied: false, mediaErrorKind: null, mediaErrorMessage: null });
    return stream;
  } catch (e) {
    devError('[conference] local media', e);
    const errKind = classifyMediaError(e);
    setUiState({
      status: 'error',
      micDenied: errKind === 'permission',
      mediaErrorKind: errKind,
      mediaErrorMessage: mediaErrorMessage(errKind, kind),
    });
    scheduleTerminalReset();
    return null;
  }
}

async function conferenceOfferTo(peerId: number, meta?: CallRemoteUser) {
  if (!groupName) return;
  const local = await ensureConferenceLocalMedia();
  if (!local) return;
  const ice = await fetchIceServers();
  const known = meta ?? knownRemoteUsers.get(peerId);
  await offerToPeer(
    conferencePeers,
    peerId,
    ice,
    local,
    groupName,
    conferenceSend,
    onConferenceTrack,
    onConferencePcState,
    known
      ? {
          name: known.name,
          avatar: known.avatar,
          firstName: known.firstName,
          lastName: known.lastName,
        }
      : undefined
  );
  syncPeersUi();
}

async function flushPendingConferenceOffers() {
  if (!mediaRef.localStream || !groupName) return;
  const queue = pendingConferenceOffers;
  pendingConferenceOffers = [];
  const ice = await fetchIceServers();
  for (const item of queue) {
    await answerFromPeer(
      conferencePeers,
      item.peerId,
      item.sdp,
      ice,
      mediaRef.localStream,
      groupName,
      conferenceSend,
      onConferenceTrack,
      onConferencePcState,
      peerMetaFromKnown(item.peerId)
    );
  }
  syncPeersUi();
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
    callMode = String(m.mode ?? '').toLowerCase() === 'conference' ? 'conference' : 'direct';
    knownRemoteUsers.set(callerId, { id: callerId, name, avatar, firstName, lastName });
    rememberRemoteUser({ id: callerId, name, avatar, firstName, lastName });
    setUiState({
      ...initialUi(),
      status: 'ringing',
      groupName: gn,
      conversationId: convId,
      kind: normalizeKind(m.kind),
      mode: callMode,
      remoteUser: { id: callerId, name, avatar, firstName, lastName },
      displayTitle: callMode === 'conference' ? 'Group call' : null,
    });
    return;
  }

  if (type === 'call.accepted') {
    const receiverId = Number(m.receiverId ?? m.receiver_id);
    const receiverName =
      typeof m.receiverName === 'string'
        ? m.receiverName
        : typeof m.receiver_name === 'string'
          ? m.receiver_name
          : undefined;
    let gn = String(m.groupName ?? m.group_name ?? groupName ?? '');
    if (!gn) {
      if (myId != null && Number.isFinite(receiverId)) gn = pairCallGroup(myId, receiverId);
      else {
        devWarn('[call] call.accepted missing groupName');
        return;
      }
    }
    groupName = gn;
    setUiState((prev) => ({ ...prev, groupName: gn }));
    ingestParticipantProfiles(m.participants ?? m.participantProfiles);

    if (callMode === 'conference') {
      if (Number.isFinite(receiverId) && receiverId !== myId) {
        if (receiverName) {
          rememberRemoteUser({
            id: receiverId,
            name: receiverName,
            avatar: knownRemoteUsers.get(receiverId)?.avatar ?? null,
          });
        }
        // Existing participants offer to the newly joined peer
        if (getStatus() === 'calling' || getStatus() === 'connecting' || getStatus() === 'active') {
          void conferenceOfferTo(receiverId, knownRemoteUsers.get(receiverId));
        }
      }
      return;
    }

    if (role !== 'caller') return;
    if (receiverName) {
      rememberRemoteUser({
        id: receiverId,
        name: receiverName,
        avatar: knownRemoteUsers.get(receiverId)?.avatar ?? null,
      });
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
      if (String(m.mode ?? '').toLowerCase() === 'conference') callMode = 'conference';
      setUiState((prev) => ({
        ...prev,
        groupName: gn,
        mode: callMode,
        kind: m.kind != null ? normalizeKind(m.kind) : prev.kind,
      }));
    }
    return;
  }

  if (type === 'call.offer') {
    const offerSid = Number(m.senderId ?? m.sender_id);
    if (Number.isFinite(offerSid) && myId != null && offerSid === myId) return;
    const sdp = parseSdp(m.sdp ?? m.offer, 'offer');
    if (!sdp) return;
    const gn = String(m.groupName ?? m.group_name ?? '');
    if (gn) groupName = gn;

    if (callMode === 'conference') {
      if (!Number.isFinite(offerSid)) return;
      const senderName =
        typeof m.senderName === 'string'
          ? m.senderName
          : typeof m.sender_name === 'string'
            ? m.sender_name
            : undefined;
      if (senderName) {
        rememberRemoteUser({ id: offerSid, name: senderName });
      }
      if (!mediaRef.localStream) {
        pendingConferenceOffers.push({ peerId: offerSid, sdp });
        void (async () => {
          await ensureConferenceLocalMedia();
          await flushPendingConferenceOffers();
          markCallActive();
        })();
        return;
      }
      void (async () => {
        const ice = await fetchIceServers();
        await answerFromPeer(
          conferencePeers,
          offerSid,
          sdp,
          ice,
          mediaRef.localStream!,
          groupName!,
          conferenceSend,
          onConferenceTrack,
          onConferencePcState,
          peerMetaFromKnown(offerSid) ?? (senderName ? { name: senderName } : undefined)
        );
        syncPeersUi();
        markCallActive();
      })();
      return;
    }

    // Accept initial callee offers and mid-call renegotiation (screen share) from either side.
    const live =
      getStatus() === 'active' ||
      getStatus() === 'connecting' ||
      getStatus() === 'reconnecting';
    if (role !== 'callee' && !live) return;
    if (!mediaRef.pc) {
      if (role === 'callee') offerPending = sdp;
      return;
    }
    if (role === 'callee' && !calleeReady) {
      offerPending = sdp;
      return;
    }
    void processCalleeOffer(sdp);
    return;
  }

  if (type === 'call.answer') {
    const answerSid = Number(m.senderId ?? m.sender_id);
    if (Number.isFinite(answerSid) && myId != null && answerSid === myId) return;
    const sdp = parseSdp(m.sdp ?? m.answer, 'answer');
    if (!sdp) return;

    if (callMode === 'conference') {
      if (!Number.isFinite(answerSid)) return;
      const senderName =
        typeof m.senderName === 'string'
          ? m.senderName
          : typeof m.sender_name === 'string'
            ? m.sender_name
            : undefined;
      if (senderName) {
        rememberRemoteUser({ id: answerSid, name: senderName });
      }
      void applyPeerAnswer(conferencePeers, answerSid, sdp).then(() => {
        markCallActive();
        syncPeersUi();
      });
      return;
    }

    const live =
      getStatus() === 'active' ||
      getStatus() === 'connecting' ||
      getStatus() === 'reconnecting';
    // Caller takes the initial answer; either side may take renegotiation answers (screen share).
    if (role !== 'caller' && !live) return;
    const pc = mediaRef.pc;
    if (!pc) return;
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
    if (callMode === 'conference') {
      if (!Number.isFinite(senderId)) return;
      void applyPeerIce(conferencePeers, senderId, c);
      return;
    }
    void handleRemoteIce(c);
    return;
  }

  if (type === 'call.participant_left') {
    const leftId = Number(m.userId ?? m.user_id);
    if (!Number.isFinite(leftId)) return;
    const slot = conferencePeers.get(leftId);
    try {
      slot?.pc?.close();
    } catch {
      /* ignore */
    }
    conferencePeers.delete(leftId);
    syncPeersUi();
    return;
  }

  if (type === 'call.rejected') {
    if (callMode === 'conference') {
      // One invitee declined — keep ringing/active for others
      return;
    }
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
    const convId = conversationId ?? Number(m.conversationId ?? m.conversation_id);
    const gn = String(m.groupName ?? m.group_name ?? groupName ?? '');
    // Callee: persist in-conversation missed banner (Call back).
    if (role === 'callee' && Number.isFinite(convId) && convId > 0) {
      const ui = useCallSessionStore.getState().ui;
      const store = useConversationCallPresenceStore.getState();
      store.clearActive(convId, gn || undefined);
      store.setMissed({
        conversationId: convId,
        kind: ui.kind === 'video' ? 'video' : 'voice',
        callerId: ui.remoteUser?.id ?? null,
        callerName: ui.remoteUser?.name ?? null,
        at: Date.now(),
      });
    }
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
      // System / PWA ringing notification (WhatsApp-style when tab is backgrounded)
      if (next.status === 'ringing' && state.ui.status !== 'ringing') {
        const remote = next.remoteUser;
        queueMicrotask(() => {
          void showIncomingCallNotification({
            callerName: remote?.name || 'Incoming call',
            kind: next.kind,
            groupName: next.groupName,
            conversationId: next.conversationId,
            avatarUrl: remote?.avatar ?? null,
          });
        });
      } else if (state.ui.status === 'ringing' && next.status !== 'ringing') {
        queueMicrotask(() => {
          void clearIncomingCallNotification();
        });
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

  initiateCall: ({
    conversationId: convId,
    targetUserId,
    targetUserIds,
    remoteUser,
    remoteUsers,
    kind = 'voice',
    mode,
    displayTitle = null,
  }) => {
    if (get().ui.status !== 'idle') return false;
    const myId = useUserStore.getState().user?.id;
    const targets =
      targetUserIds && targetUserIds.length > 0
        ? [...new Set(targetUserIds.filter((id) => id !== myId))]
        : targetUserId != null
          ? [targetUserId]
          : [];
    if (targets.length === 0) return false;

    // Gesture-scoped unlock so we can hear the callee after answer/ICE (async).
    void unlockRemoteAudioPlayback();

    const resolvedMode: 'direct' | 'conference' =
      mode === 'conference' || targets.length > 1 ? 'conference' : 'direct';
    callMode = resolvedMode;
    role = 'caller';
    conversationId = convId;
    groupName =
      resolvedMode === 'direct' && myId != null ? pairCallGroup(myId, targets[0]) : null;
    callingDeadline = Date.now() + CALLING_TIMEOUT_MS;
    knownRemoteUsers.clear();
    rememberRemoteUser(remoteUser);
    (remoteUsers ?? []).forEach((u) => rememberRemoteUser(u));

    setUiState({
      ...initialUi(),
      status: 'calling',
      conversationId: convId,
      groupName,
      kind,
      mode: resolvedMode,
      remoteUser,
      displayTitle:
        resolvedMode === 'conference'
          ? displayTitle?.trim() || 'Group call'
          : null,
      peers: [],
      callingProgress: 0,
    });
    void (async () => {
      await useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      const payload: Record<string, unknown> = {
        type: 'call.initiate',
        conversationId: convId,
        kind,
        mode: resolvedMode,
      };
      if (resolvedMode === 'conference') {
        payload.targetUserIds = targets;
      } else {
        payload.targetUserId = targets[0];
      }
      const ok = sendCallSignal(payload, convId);
      if (!ok) {
        devError('[call] call.initiate not sent');
        setUiState(initialUi());
      }
    })();
    return true;
  },

  joinActiveCall: ({
    conversationId: convId,
    groupName: gn,
    kind = 'voice',
    mode = 'conference',
    remoteUser = null,
    remoteUsers,
    displayTitle = null,
  }) => {
    if (get().ui.status !== 'idle') return false;
    if (!gn) return false;
    void unlockRemoteAudioPlayback();
    callMode = mode;
    role = 'callee';
    conversationId = convId;
    groupName = gn;
    knownRemoteUsers.clear();
    if (remoteUser) rememberRemoteUser(remoteUser);
    (remoteUsers ?? []).forEach((u) => rememberRemoteUser(u));
    setUiState({
      ...initialUi(),
      status: 'connecting',
      conversationId: convId,
      groupName: gn,
      kind,
      mode,
      remoteUser,
      displayTitle:
        mode === 'conference' ? displayTitle?.trim() || 'Group call' : null,
      peers: [],
    });
    void (async () => {
      await useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      const ok = sendCallSignal({ type: 'call.join', groupName: gn }, convId);
      if (!ok) {
        devError('[call] call.join not sent');
        setUiState(initialUi());
        return;
      }
      if (callMode === 'conference') {
        await ensureConferenceLocalMedia();
        await flushPendingConferenceOffers();
        return;
      }
      void startCalleeMedia();
    })();
    return true;
  },

  acceptIncoming: () => {
    if (get().ui.status !== 'ringing' || !groupName) return;
    // Gesture-scoped unlock — remote play() after ICE must stay allowed.
    void unlockRemoteAudioPlayback();
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
      if (callMode === 'conference') {
        await ensureConferenceLocalMedia();
        await flushPendingConferenceOffers();
        return;
      }
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
    const mode = callMode;
    const convId = conversationId;
    const myId = useUserStore.getState().user?.id;
    if (gn) {
      void useCallsWsStore.getState().connect().catch(() => {});
      useChatStore.getState().connect().catch(() => {});
      // Conference: leave without ending for others; direct: end for both
      sendCallSignal(
        { type: mode === 'conference' ? 'call.leave' : 'call.end', groupName: gn },
        conversationId
      );
    }
    // Drop sticky "call in progress" when this client leaves / ends.
    if (convId != null) {
      const presence = useConversationCallPresenceStore.getState();
      if (mode !== 'conference') {
        presence.clearActive(convId, gn || undefined);
      } else {
        const cur = presence.activeByConversation[convId];
        if (cur) {
          const remaining = cur.joinedIds.filter((id) => id !== myId);
          if (remaining.length === 0) {
            presence.clearActive(convId, gn || undefined);
          } else {
            presence.setActive({ ...cur, joinedIds: remaining });
          }
        }
      }
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
    if (get().ui.isScreenSharing) return;
    const stream = mediaRef.localStream;
    if (!stream || get().ui.kind !== 'video') return;
    const nextOff = !get().ui.isCameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setUiState({ isCameraOff: nextOff });
    attachLocalVideo(stream);
  },

  toggleScreenShare: async () => {
    const status = get().ui.status;
    if (status !== 'active' && status !== 'connecting' && status !== 'reconnecting') return;
    if (get().ui.isScreenSharing) {
      await stopScreenShareInternal(true);
      return;
    }
    let stream = mediaRef.localStream;
    if (!stream) {
      // Voice call may not have media until connected — ensure local stream
      if (callMode === 'conference') {
        stream = (await ensureConferenceLocalMedia()) ?? null;
      }
      if (!stream) return;
    }
    try {
      const display = await getScreenShareStream();
      const track = display.getVideoTracks()[0];
      if (!track) {
        display.getTracks().forEach((t) => t.stop());
        return;
      }
      display.getTracks().forEach((t) => {
        if (t !== track) t.stop();
      });

      const existingVideo = stream.getVideoTracks();
      if (!savedCameraTrack && existingVideo[0] && existingVideo[0] !== track) {
        savedCameraTrack = existingVideo[0];
      }
      existingVideo.forEach((t) => {
        stream!.removeTrack(t);
        // Keep saved camera alive; stop others
        if (t !== savedCameraTrack) t.stop();
      });

      screenShareTrack = track;
      try {
        (track as MediaStreamTrack & { contentHint?: string }).contentHint = 'detail';
      } catch {
        /* ignore */
      }
      track.onended = () => {
        void stopScreenShareInternal(true);
      };

      const pcs = collectOutboundPcs();
      const hadVideoSender = pcs.some((pc) => pc.getSenders().some((s) => s.track?.kind === 'video'));
      stream.addTrack(track);
      for (const pc of pcs) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
      // Always renegotiate so remotes pick up screen share (resolution / new m-line).
      await renegotiateAfterTrackChange();
      if (callMode === 'direct' && mediaRef.pc && groupName) {
        try {
          const offer = await createOffer(mediaRef.pc);
          sendCallSignal({ type: 'call.offer', sdp: offer, groupName }, conversationId);
        } catch (e) {
          devWarn('[call] renegotiate 1:1 screen share', e);
        }
      }
      void hadVideoSender;
      setUiState({ isScreenSharing: true, isCameraOff: false, hasRemoteVideo: get().ui.hasRemoteVideo });
      attachLocalVideo(stream);
    } catch (e) {
      // User cancelled the picker — not an error state for the call
      const name = e instanceof DOMException ? e.name : '';
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        devError('[call] screen share failed', e);
      }
    }
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
    if (!deviceId || get().ui.isScreenSharing) return;
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
  getPeerStream: (peerId: number) => conferencePeers.get(peerId)?.remoteStream ?? null,
}));

export function useWebRtcCall() {
  const ui = useCallSessionStore((s) => s.ui);
  const initiateCall = useCallSessionStore((s) => s.initiateCall);
  const joinActiveCall = useCallSessionStore((s) => s.joinActiveCall);
  const acceptIncoming = useCallSessionStore((s) => s.acceptIncoming);
  const rejectIncoming = useCallSessionStore((s) => s.rejectIncoming);
  const endCall = useCallSessionStore((s) => s.endCall);
  const toggleMute = useCallSessionStore((s) => s.toggleMute);
  const toggleCamera = useCallSessionStore((s) => s.toggleCamera);
  const toggleScreenShare = useCallSessionStore((s) => s.toggleScreenShare);
  const retryMedia = useCallSessionStore((s) => s.retryMedia);
  const closeUi = useCallSessionStore((s) => s.closeUi);
  const switchAudioInput = useCallSessionStore((s) => s.switchAudioInput);
  const switchVideoInput = useCallSessionStore((s) => s.switchVideoInput);
  const switchAudioOutput = useCallSessionStore((s) => s.switchAudioOutput);

  return {
    callState: ui,
    initiateCall,
    joinActiveCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
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
