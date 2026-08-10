import {
  addIceCandidate,
  createAnswer,
  createOffer,
  initPeerConnection,
  setRemoteAnswer,
  type CallKind,
} from '@/utils/webrtc';
import { devError, devWarn } from '@/utils/devLog';

export interface ConferencePeer {
  userId: number;
  name: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  pc: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  pendingIce: RTCIceCandidateInit[];
  hasVideo: boolean;
  cameraOff: boolean;
  isSpeaking: boolean;
}

type SignalFn = (obj: Record<string, unknown>) => boolean;

export function createPeerSlot(
  userId: number,
  meta?: Partial<Pick<ConferencePeer, 'name' | 'avatar' | 'firstName' | 'lastName'>>
): ConferencePeer {
  return {
    userId,
    name: meta?.name ?? `User ${userId}`,
    avatar: meta?.avatar ?? null,
    firstName: meta?.firstName,
    lastName: meta?.lastName,
    pc: null,
    remoteStream: null,
    pendingIce: [],
    hasVideo: false,
    cameraOff: false,
    isSpeaking: false,
  };
}

export async function ensurePeerConnection(
  peers: Map<number, ConferencePeer>,
  peerId: number,
  iceServers: RTCIceServer[],
  localStream: MediaStream,
  groupName: string,
  send: SignalFn,
  onTrack: (peerId: number, stream: MediaStream) => void,
  onState: (peerId: number, state: string) => void,
  meta?: Partial<Pick<ConferencePeer, 'name' | 'avatar' | 'firstName' | 'lastName'>>
): Promise<ConferencePeer> {
  let slot = peers.get(peerId);
  if (!slot) {
    slot = createPeerSlot(peerId, meta);
    peers.set(peerId, slot);
  } else if (meta) {
    slot = {
      ...slot,
      name: meta.name ?? slot.name,
      avatar: meta.avatar ?? slot.avatar,
      firstName: meta.firstName ?? slot.firstName,
      lastName: meta.lastName ?? slot.lastName,
    };
    peers.set(peerId, slot);
  }
  if (slot.pc) return slot;

  const pc = initPeerConnection(iceServers);
  slot.pc = pc;
  peers.set(peerId, slot);

  pc.onicecandidate = (ev) => {
    if (!ev.candidate) return;
    send({
      type: 'call.ice_candidate',
      candidate: ev.candidate.toJSON(),
      groupName,
      targetUserId: peerId,
    });
  };

  pc.ontrack = (ev) => {
    let stream = ev.streams[0];
    if (!stream) {
      if (!slot!.remoteStream) slot!.remoteStream = new MediaStream();
      slot!.remoteStream.addTrack(ev.track);
      stream = slot!.remoteStream;
    } else {
      slot!.remoteStream = stream;
    }
    peers.set(peerId, slot!);
    // Per-peer media is rendered in the conference UI — do not overwrite the global 1:1 remote element.
    onTrack(peerId, stream);
  };

  pc.onconnectionstatechange = () => {
    onState(peerId, pc.connectionState);
  };

  localStream.getTracks().forEach((t) => {
    // Avoid duplicate sender if reconnecting the same PC (shouldn't happen; guard anyway)
    const already = pc.getSenders().some((s) => s.track?.kind === t.kind && s.track?.id === t.id);
    if (!already) pc.addTrack(t, localStream);
  });
  return slot;
}

export async function offerToPeer(
  peers: Map<number, ConferencePeer>,
  peerId: number,
  iceServers: RTCIceServer[],
  localStream: MediaStream,
  groupName: string,
  send: SignalFn,
  onTrack: (peerId: number, stream: MediaStream) => void,
  onState: (peerId: number, state: string) => void,
  meta?: Partial<Pick<ConferencePeer, 'name' | 'avatar' | 'firstName' | 'lastName'>>
): Promise<void> {
  const slot = await ensurePeerConnection(
    peers,
    peerId,
    iceServers,
    localStream,
    groupName,
    send,
    onTrack,
    onState,
    meta
  );
  if (!slot.pc) return;
  if (slot.pc.signalingState !== 'stable') {
    devWarn('[conference] skip offer — signaling busy', peerId, slot.pc.signalingState);
    return;
  }
  try {
    const offer = await createOffer(slot.pc);
    send({ type: 'call.offer', sdp: offer, groupName, targetUserId: peerId });
  } catch (e) {
    devError('[conference] offer failed', peerId, e);
  }
}

export async function answerFromPeer(
  peers: Map<number, ConferencePeer>,
  peerId: number,
  offer: RTCSessionDescriptionInit,
  iceServers: RTCIceServer[],
  localStream: MediaStream,
  groupName: string,
  send: SignalFn,
  onTrack: (peerId: number, stream: MediaStream) => void,
  onState: (peerId: number, state: string) => void
): Promise<void> {
  const slot = await ensurePeerConnection(
    peers,
    peerId,
    iceServers,
    localStream,
    groupName,
    send,
    onTrack,
    onState
  );
  if (!slot.pc) return;
  try {
    if (slot.pc.signalingState !== 'stable' && slot.pc.remoteDescription) {
      devWarn('[conference] skip duplicate answer', peerId, slot.pc.signalingState);
      return;
    }
    const answer = await createAnswer(slot.pc, offer);
    send({ type: 'call.answer', sdp: answer, groupName, targetUserId: peerId });
    await flushPeerIce(slot);
  } catch (e) {
    devError('[conference] answer failed', peerId, e);
  }
}

export async function applyPeerAnswer(
  peers: Map<number, ConferencePeer>,
  peerId: number,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  const slot = peers.get(peerId);
  if (!slot?.pc) return;
  try {
    await setRemoteAnswer(slot.pc, answer);
    await flushPeerIce(slot);
  } catch (e) {
    devError('[conference] setRemoteAnswer failed', peerId, e);
  }
}

export async function applyPeerIce(
  peers: Map<number, ConferencePeer>,
  peerId: number,
  candidate: RTCIceCandidateInit
): Promise<void> {
  const slot = peers.get(peerId);
  if (!slot) return;
  if (!slot.pc || !slot.pc.remoteDescription) {
    slot.pendingIce.push(candidate);
    return;
  }
  try {
    await addIceCandidate(slot.pc, candidate);
  } catch (e) {
    devWarn('[conference] ICE failed', peerId, e);
  }
}

async function flushPeerIce(slot: ConferencePeer) {
  if (!slot.pc) return;
  const q = slot.pendingIce;
  slot.pendingIce = [];
  for (const c of q) {
    try {
      await addIceCandidate(slot.pc, c);
    } catch {
      /* ignore */
    }
  }
}

export function closeAllPeers(peers: Map<number, ConferencePeer>) {
  for (const slot of peers.values()) {
    try {
      slot.pc?.close();
    } catch {
      /* ignore */
    }
  }
  peers.clear();
}

export function peerListSnapshot(peers: Map<number, ConferencePeer>) {
  return Array.from(peers.values()).map((p) => ({
    id: p.userId,
    name: p.name,
    avatar: p.avatar,
    firstName: p.firstName,
    lastName: p.lastName,
    hasVideo: p.hasVideo,
    cameraOff: p.cameraOff,
    isSpeaking: p.isSpeaking,
    stream: p.remoteStream,
  }));
}

export type ConferencePeerSnapshot = ReturnType<typeof peerListSnapshot>[number];

/**
 * Camera-off must not use track.muted — remote tracks often start muted until the first frame.
 */
export function updatePeerVideoFlags(peers: Map<number, ConferencePeer>, peerId: number, kind: CallKind) {
  const slot = peers.get(peerId);
  if (!slot?.remoteStream) return;
  const vtracks = slot.remoteStream.getVideoTracks();
  const hasVideo = vtracks.length > 0;
  const cameraOff = hasVideo
    ? vtracks.every((t) => !t.enabled || t.readyState === 'ended')
    : kind === 'video';
  slot.hasVideo = hasVideo && !cameraOff;
  slot.cameraOff = kind === 'video' ? cameraOff || !hasVideo : false;
  peers.set(peerId, slot);
}

export function setPeerSpeaking(peers: Map<number, ConferencePeer>, peerId: number, speaking: boolean) {
  const slot = peers.get(peerId);
  if (!slot || slot.isSpeaking === speaking) return false;
  slot.isSpeaking = speaking;
  peers.set(peerId, slot);
  return true;
}
