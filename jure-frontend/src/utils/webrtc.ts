import axiosInstance from '@/utils/axiosInstance';
import { devWarn } from '@/utils/devLog';

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
  refs.remoteStream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
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
    audio: deviceIds?.audioId ? { deviceId: { exact: deviceIds.audioId } } : true,
    video:
      kind === 'video'
        ? deviceIds?.videoId
          ? { deviceId: { exact: deviceIds.videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export function attachRemoteMedia(stream: MediaStream | null | undefined) {
  if (!stream) return;
  const audio = document.getElementById('remote-audio') as HTMLAudioElement | null;
  if (audio) {
    audio.muted = false;
    audio.volume = 1;
    // Ensure element can play without a second gesture when Accept already unlocked audio.
    audio.setAttribute('autoplay', '');
    audio.setAttribute('playsinline', '');
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }
    const play = () => {
      void audio.play().catch((err) => {
        devWarn('[webrtc] remote audio play blocked', err);
      });
    };
    play();
    // Retry shortly — element may have just mounted after Accept.
    window.setTimeout(play, 50);
    window.setTimeout(play, 250);
  } else {
    devWarn('[webrtc] #remote-audio missing — remote voice will be silent until remount');
  }
  const video = document.getElementById('remote-video') as HTMLVideoElement | null;
  if (video) {
    // Keep video element from double-playing audio; remote-audio owns playback.
    video.muted = true;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    void video.play().catch(() => {});
  }
}

/** Re-bind whatever remote stream we already have (after UI mounts / Accept gesture). */
export function ensureRemoteAudioPlaying(stream?: MediaStream | null) {
  const s =
    stream ??
    (document.getElementById('remote-audio') as HTMLAudioElement | null)?.srcObject;
  if (s instanceof MediaStream) {
    attachRemoteMedia(s);
    return;
  }
}

export function attachLocalVideo(stream: MediaStream | null) {
  const video = document.getElementById('local-video') as HTMLVideoElement | null;
  if (video) {
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  }
}

export function clearRemoteMediaElements() {
  const audio = document.getElementById('remote-audio') as HTMLAudioElement | null;
  if (audio) audio.srcObject = null;
  const remote = document.getElementById('remote-video') as HTMLVideoElement | null;
  if (remote) remote.srcObject = null;
  const local = document.getElementById('local-video') as HTMLVideoElement | null;
  if (local) local.srcObject = null;
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
  const audio = document.getElementById('remote-audio') as HTMLAudioElement & {
    setSinkId?: (id: string) => Promise<void>;
  } | null;
  const video = document.getElementById('remote-video') as HTMLVideoElement & {
    setSinkId?: (id: string) => Promise<void>;
  } | null;
  let ok = false;
  for (const el of [audio, video]) {
    if (el && typeof el.setSinkId === 'function') {
      try {
        await el.setSinkId(deviceId);
        ok = true;
      } catch (e) {
        devWarn('[webrtc] setSinkId failed', e);
      }
    }
  }
  return ok;
}
