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
  await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function setRemoteAnswer(pc: RTCPeerConnection, answerSdp: RTCSessionDescriptionInit) {
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
  refs.pc = null;
  refs.localStream = null;
}
