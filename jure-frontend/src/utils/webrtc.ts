import axiosInstance from '@/utils/axiosInstance';
import { devLog, devWarn } from '@/utils/devLog';

const FALLBACK_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302'] }];

let cachedIceServers: RTCIceServer[] | null = null;

/**
 * GET `{API_BASE}/calls/ice-servers/` (e.g. `/api/v1/calls/ice-servers/`). Same JWT as other API calls.
 * Response `{ iceServers: [...] }` — pass to `new RTCPeerConnection({ iceServers })`.
 * Cached for the session; falls back to Google STUN if the request fails or returns empty.
 */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers) return cachedIceServers;
  try {
    const res = await axiosInstance.get<{
      iceServers?: RTCIceServer[];
      ice_servers?: RTCIceServer[];
    }>('/calls/ice-servers/');
    const raw = res.data?.iceServers ?? res.data?.ice_servers;
    if (Array.isArray(raw) && raw.length > 0) {
      cachedIceServers = raw;
      return cachedIceServers;
    }
    devWarn('[webrtc] ICE API returned empty iceServers; using fallback STUN');
  } catch (e) {
    devWarn('[webrtc] Failed to fetch ICE servers; using fallback STUN', e);
  }
  cachedIceServers = FALLBACK_ICE;
  return cachedIceServers;
}

/** Clear ICE cache so the next call can pick up fresh ephemeral TURN credentials. */
export function clearIceServersCache(): void {
  cachedIceServers = null;
}

export function initPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers });
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  // Do not pass offerToReceiveAudio/Video after addTrack — that extra recvonly
  // transceiver is a common cause of connected-but-silent calls.
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(
  pc: RTCPeerConnection,
  offerSdp: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  if (pc.signalingState !== 'have-remote-offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
  }
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function setRemoteAnswer(pc: RTCPeerConnection, answerSdp: RTCSessionDescriptionInit) {
  if (pc.signalingState !== 'have-local-offer') {
    // Already applied or not expecting an answer (duplicate / late renegotiation).
    return;
  }
  await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
}

export async function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit | null
): Promise<void> {
  if (!candidate?.candidate) return;
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export interface CallMediaRefs {
  pc: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function cleanupCall(refs: CallMediaRefs): void {
  try {
    refs.pc?.close();
  } catch {
    /* ignore */
  }
  refs.localStream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
  // Never stop remote receiver tracks — that tears down inbound audio/video.
  refs.pc = null;
  refs.localStream = null;
  refs.remoteStream = null;
}

export type CallKind = 'voice' | 'video';

export type MediaErrorKind =
  | 'permission'
  | 'not_found'
  | 'in_use'
  | 'insecure'
  | 'unknown';

export function classifyMediaError(e: unknown): MediaErrorKind {
  if (!(e instanceof DOMException)) return 'unknown';
  switch (e.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'permission';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'not_found';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in_use';
    case 'SecurityError':
      return 'insecure';
    default:
      return 'unknown';
  }
}

export function mediaErrorMessage(kind: MediaErrorKind, callKind: CallKind): string {
  const wantsVideo = callKind === 'video';
  switch (kind) {
    case 'permission':
      return wantsVideo
        ? 'Camera access is blocked. Allow camera and microphone access in your browser settings to use video calls.'
        : 'Microphone access is blocked. Allow microphone access in your browser settings to use voice calls.';
    case 'not_found':
      return wantsVideo
        ? 'No camera or microphone was detected on this device.'
        : 'No microphone was detected on this device.';
    case 'in_use':
      return wantsVideo
        ? 'Camera or microphone is already in use by another application.'
        : 'Microphone is already in use by another application.';
    case 'insecure':
      return 'Media devices require a secure (HTTPS) connection.';
    default:
      return wantsVideo
        ? 'Unable to access camera or microphone.'
        : 'Unable to access microphone.';
  }
}

export async function getCallUserMedia(
  kind: CallKind,
  deviceIds?: { audioId?: string; videoId?: string }
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: deviceIds?.audioId
      ? {
          deviceId: { exact: deviceIds.audioId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
    video:
      kind === 'video'
        ? deviceIds?.videoId
          ? { deviceId: { exact: deviceIds.videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

/** Persistent sink — parked inside the call UI so a modal dialog cannot mute it. */
let managedRemoteAudio: HTMLAudioElement | null = null;
let attachedAudioTrackIds = '';
let remoteAudioUnlocked = false;
let remotePlayBlocked = false;
let remoteAudioCtx: AudioContext | null = null;
let remoteAudioSource: MediaStreamAudioSourceNode | null = null;
let remoteAudioGain: GainNode | null = null;
const remotePlayListeners = new Set<(blocked: boolean) => void>();

export function onRemoteAudioPlayBlocked(cb: (blocked: boolean) => void): () => void {
  remotePlayListeners.add(cb);
  cb(remotePlayBlocked);
  return () => remotePlayListeners.delete(cb);
}

function setRemotePlayBlocked(blocked: boolean) {
  if (remotePlayBlocked === blocked) return;
  remotePlayBlocked = blocked;
  remotePlayListeners.forEach((cb) => cb(blocked));
}

export function isRemoteAudioPlayBlocked(): boolean {
  return remotePlayBlocked;
}

function ensureManagedRemoteAudio(): HTMLAudioElement {
  if (managedRemoteAudio && managedRemoteAudio.isConnected) return managedRemoteAudio;
  const el = document.createElement('audio');
  el.id = 'jure-remote-audio';
  el.autoplay = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.setAttribute('autoplay', '');
  // Keep a real laid-out box. display:none / 1px / z-index:-1 can silence WebKit.
  el.style.cssText = 'width:8px;height:8px;opacity:0.02;pointer-events:none;border:0;';
  el.volume = 1;
  el.muted = false;
  document.body.appendChild(el);
  managedRemoteAudio = el;
  return el;
}

/** Move the sink into the live call UI (dialog/sheet) so it is not aria-hidden/inert. */
export function parkRemoteAudioIn(host: HTMLElement | null) {
  if (!host) return;
  const el = ensureManagedRemoteAudio();
  if (el.parentElement !== host) {
    host.appendChild(el);
    if (el.srcObject) void el.play().catch(() => {});
  }
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function wireWebAudio(audioStream: MediaStream) {
  if (!remoteAudioCtx || remoteAudioCtx.state === 'closed') return;
  if (audioStream.getAudioTracks().length === 0) return;
  try {
    if (remoteAudioCtx.state === 'suspended') void remoteAudioCtx.resume();
    remoteAudioSource?.disconnect();
    if (!remoteAudioGain) {
      remoteAudioGain = remoteAudioCtx.createGain();
      remoteAudioGain.gain.value = 1;
      remoteAudioGain.connect(remoteAudioCtx.destination);
    }
    remoteAudioSource = remoteAudioCtx.createMediaStreamSource(audioStream);
    remoteAudioSource.connect(remoteAudioGain);
  } catch (e) {
    devWarn('[webrtc] WebAudio remote bind failed', e);
  }
}

/**
 * Must start from a user gesture (Accept / Start call). Call resume() without awaiting
 * first so the gesture token is not lost.
 */
export async function unlockRemoteAudioPlayback(): Promise<void> {
  const el = ensureManagedRemoteAudio();
  el.muted = false;
  el.volume = 1;
  const AC = getAudioContextCtor();
  try {
    if (AC) {
      if (!remoteAudioCtx || remoteAudioCtx.state === 'closed') {
        remoteAudioCtx = new AC();
      }
      void remoteAudioCtx.resume();
    }
  } catch (e) {
    devWarn('[webrtc] AudioContext unlock failed', e);
  }
  try {
    if (!el.srcObject) el.srcObject = new MediaStream();
    await el.play();
    remoteAudioUnlocked = true;
    setRemotePlayBlocked(false);
  } catch (e) {
    remoteAudioUnlocked = false;
    setRemotePlayBlocked(true);
    devWarn('[webrtc] remote audio unlock play failed', e);
  }
}

export function attachRemoteMedia(stream: MediaStream | null | undefined) {
  if (!stream) return;

  const audioTracks = stream.getAudioTracks().filter((t) => t.readyState !== 'ended');
  audioTracks.forEach((t) => {
    t.enabled = true;
  });
  const audioStream = new MediaStream(audioTracks);
  const ids = audioTracks.map((t) => t.id).sort().join(',');

  devLog('[webrtc] attachRemoteMedia', {
    audioTracks: audioTracks.length,
    videoTracks: stream.getVideoTracks().length,
    unlocked: remoteAudioUnlocked,
    trackStates: audioTracks.map((t) => ({
      id: t.id,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState,
    })),
  });

  if (audioTracks.length === 0) {
    devWarn('[webrtc] attachRemoteMedia: stream has no audio tracks yet');
  }

  const el = ensureManagedRemoteAudio();
  const tracksChanged = attachedAudioTrackIds !== ids;
  if (tracksChanged) {
    attachedAudioTrackIds = ids;
    el.srcObject = audioTracks.length ? audioStream : null;
  }
  el.autoplay = true;
  el.volume = 1;
  el.muted = false;
  void el
    .play()
    .then(() => setRemotePlayBlocked(false))
    .catch((err) => {
      devWarn('[webrtc] remote audio play blocked', err);
      // Second chance: muted element primes decode; Web Audio goes to speakers.
      el.muted = true;
      void el.play().catch(() => {});
      wireWebAudio(audioStream);
      setRemotePlayBlocked(!(remoteAudioCtx && remoteAudioCtx.state === 'running'));
    });

  const video = document.getElementById('remote-video') as HTMLVideoElement | null;
  if (video) {
    video.muted = true;
    const vtracks = stream.getVideoTracks().filter((t) => t.readyState !== 'ended');
    if (vtracks.length) {
      video.srcObject = new MediaStream(vtracks);
      void video.play().catch(() => {});
    }
  }
}

/** Re-bind whatever remote stream we already have (after UI mounts / Accept gesture). */
export function ensureRemoteAudioPlaying(stream?: MediaStream | null) {
  const s =
    stream ??
    (managedRemoteAudio?.srcObject instanceof MediaStream ? managedRemoteAudio.srcObject : null);
  if (s) attachRemoteMedia(s);
}

/** Build a MediaStream from all live PC receivers (most reliable for 1:1). */
export function remoteStreamFromPeerConnection(pc: RTCPeerConnection): MediaStream {
  const stream = new MediaStream();
  pc.getReceivers().forEach((r) => {
    const t = r.track;
    if (t && t.readyState !== 'ended' && !stream.getTracks().some((x) => x.id === t.id)) {
      stream.addTrack(t);
    }
  });
  return stream;
}

export function attachLocalVideo(stream: MediaStream | null) {
  const video = document.getElementById('local-video') as HTMLVideoElement | null;
  if (video) {
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  }
}

export function clearRemoteMediaElements() {
  attachedAudioTrackIds = '';
  try {
    remoteAudioSource?.disconnect();
  } catch {
    /* ignore */
  }
  remoteAudioSource = null;
  if (managedRemoteAudio) managedRemoteAudio.srcObject = null;
  const remote = document.getElementById('remote-video') as HTMLVideoElement | null;
  if (remote) remote.srcObject = null;
  const local = document.getElementById('local-video') as HTMLVideoElement | null;
  if (local) local.srcObject = null;
  setRemotePlayBlocked(false);
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown';

export async function sampleConnectionQuality(pc: RTCPeerConnection): Promise<ConnectionQuality> {
  try {
    const stats = await pc.getStats();
    let rttMs: number | null = null;
    let packetLoss = 0;
    let packetsReceived = 0;
    let packetsLost = 0;
    let jitter = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && (report as RTCIceCandidatePairStats).state === 'succeeded') {
        const pair = report as RTCIceCandidatePairStats;
        if (typeof pair.currentRoundTripTime === 'number') {
          rttMs = pair.currentRoundTripTime * 1000;
        }
      }
      if (report.type === 'inbound-rtp') {
        const inbound = report as RTCInboundRtpStreamStats;
        if (typeof inbound.packetsLost === 'number') packetsLost += inbound.packetsLost;
        if (typeof inbound.packetsReceived === 'number') packetsReceived += inbound.packetsReceived;
        if (typeof inbound.jitter === 'number') jitter = Math.max(jitter, inbound.jitter);
      }
    });

    if (packetsReceived + packetsLost > 0) {
      packetLoss = packetsLost / (packetsReceived + packetsLost);
    }

    if (rttMs == null && packetLoss === 0 && jitter === 0) return 'unknown';

    if ((rttMs != null && rttMs > 400) || packetLoss > 0.08 || jitter > 0.05) return 'poor';
    if ((rttMs != null && rttMs > 200) || packetLoss > 0.03 || jitter > 0.03) return 'good';
    return 'excellent';
  } catch {
    return 'unknown';
  }
}

export async function replaceInputTrack(
  pc: RTCPeerConnection,
  localStream: MediaStream,
  kind: 'audio' | 'video',
  deviceId: string
): Promise<MediaStreamTrack | null> {
  const constraints: MediaStreamConstraints =
    kind === 'audio'
      ? { audio: { deviceId: { exact: deviceId } }, video: false }
      : { audio: false, video: { deviceId: { exact: deviceId } } };
  const fresh = await navigator.mediaDevices.getUserMedia(constraints);
  const newTrack = kind === 'audio' ? fresh.getAudioTracks()[0] : fresh.getVideoTracks()[0];
  if (!newTrack) {
    fresh.getTracks().forEach((t) => t.stop());
    return null;
  }
  const sender = pc.getSenders().find((s) => s.track?.kind === kind);
  if (sender) {
    await sender.replaceTrack(newTrack);
  }
  const oldTracks = kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks();
  oldTracks.forEach((t) => {
    localStream.removeTrack(t);
    t.stop();
  });
  localStream.addTrack(newTrack);
  // Stop unused tracks from the temporary stream (opposite kind none)
  fresh.getTracks().forEach((t) => {
    if (t !== newTrack) t.stop();
  });
  return newTrack;
}

/** Capture the JURE tab / a window / the full screen for collaboration. */
export async function getScreenShareStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'monitor',
      frameRate: { ideal: 15, max: 30 },
    } as MediaTrackConstraints,
    audio: false,
  });
}

/** Replace or add the outbound video track on every peer connection. */
export async function applyOutboundVideoTrack(
  pcs: RTCPeerConnection[],
  localStream: MediaStream,
  track: MediaStreamTrack | null,
  opts?: { stopRemoved?: boolean }
): Promise<void> {
  const stopRemoved = opts?.stopRemoved !== false;
  const oldVideo = localStream.getVideoTracks();
  oldVideo.forEach((t) => {
    localStream.removeTrack(t);
    if (stopRemoved && t !== track) t.stop();
  });
  if (track) localStream.addTrack(track);

  for (const pc of pcs) {
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(track);
    } else if (track) {
      pc.addTrack(track, localStream);
    }
  }
  attachLocalVideo(localStream);
}

export async function setAudioOutputDevice(deviceId: string): Promise<boolean> {
  const el = (document.getElementById('jure-remote-audio') ?? managedRemoteAudio) as
    | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
    | null;
  if (el && typeof el.setSinkId === 'function') {
    try {
      await el.setSinkId(deviceId);
      return true;
    } catch (e) {
      devWarn('[webrtc] setSinkId failed', e);
    }
  }
  return false;
}
