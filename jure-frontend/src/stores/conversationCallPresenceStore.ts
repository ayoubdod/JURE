import { create } from 'zustand';
import axiosInstance from '@/utils/axiosInstance';
import type { CallKind } from '@/utils/webrtc';
import useUserStore from '@/stores/userStore';

export interface ConversationActiveCall {
  conversationId: number;
  groupName: string;
  kind: CallKind;
  mode: 'direct' | 'conference';
  callId?: number | null;
  callerId?: number | null;
  callerName?: string | null;
  joinedIds: number[];
  participantIds: number[];
  status?: string | null;
}

export interface ConversationMissedCall {
  conversationId: number;
  kind: CallKind;
  callerId?: number | null;
  callerName?: string | null;
  at: number;
}

interface ConversationCallPresenceState {
  activeByConversation: Record<number, ConversationActiveCall>;
  missedByConversation: Record<number, ConversationMissedCall>;
  setActive: (call: ConversationActiveCall) => void;
  clearActive: (conversationId: number, groupName?: string) => void;
  setMissed: (missed: ConversationMissedCall) => void;
  clearMissed: (conversationId: number) => void;
  fetchActive: (conversationId: number) => Promise<ConversationActiveCall | null>;
  ingestWs: (raw: Record<string, unknown>) => void;
}

function normalizeKind(raw: unknown): CallKind {
  return String(raw ?? 'voice').toLowerCase() === 'video' ? 'video' : 'voice';
}

function asIntList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

function isLiveRoom(call: Pick<ConversationActiveCall, 'joinedIds' | 'status'> & { ringingIds?: number[] }): boolean {
  const joined = call.joinedIds ?? [];
  if (joined.length > 0) return true;
  // Ringing with empty joined shouldn't happen, but keep banner only while someone is in.
  return false;
}

export const useConversationCallPresenceStore = create<ConversationCallPresenceState>((set, get) => ({
  activeByConversation: {},
  missedByConversation: {},

  setActive: (call) => {
    if (!isLiveRoom(call)) {
      get().clearActive(call.conversationId, call.groupName);
      return;
    }
    set((s) => ({
      activeByConversation: { ...s.activeByConversation, [call.conversationId]: call },
      // Clear missed when a live call is present
      missedByConversation: Object.fromEntries(
        Object.entries(s.missedByConversation).filter(([id]) => Number(id) !== call.conversationId)
      ),
    }));
  },

  clearActive: (conversationId, groupName) =>
    set((s) => {
      const cur = s.activeByConversation[conversationId];
      if (!cur) return s;
      if (groupName && cur.groupName !== groupName) return s;
      const next = { ...s.activeByConversation };
      delete next[conversationId];
      return { activeByConversation: next };
    }),

  setMissed: (missed) =>
    set((s) => ({
      missedByConversation: { ...s.missedByConversation, [missed.conversationId]: missed },
    })),

  clearMissed: (conversationId) =>
    set((s) => {
      const next = { ...s.missedByConversation };
      delete next[conversationId];
      return { missedByConversation: next };
    }),

  fetchActive: async (conversationId) => {
    try {
      const res = await axiosInstance.get<{
        active?: boolean;
        conversationId?: number;
        groupName?: string;
        kind?: string;
        mode?: string;
        callId?: number;
        callerId?: number;
        joinedIds?: number[];
        participantIds?: number[];
        status?: string;
      }>('/calls/active/', { params: { conversation_id: conversationId } });
      if (!res.data?.active || !res.data.groupName) {
        get().clearActive(conversationId);
        return null;
      }
      const call: ConversationActiveCall = {
        conversationId,
        groupName: res.data.groupName,
        kind: normalizeKind(res.data.kind),
        mode: res.data.mode === 'conference' ? 'conference' : 'direct',
        callId: res.data.callId ?? null,
        callerId: res.data.callerId ?? null,
        joinedIds: asIntList(res.data.joinedIds),
        participantIds: asIntList(res.data.participantIds),
        status: res.data.status ?? null,
      };
      if (!isLiveRoom(call)) {
        get().clearActive(conversationId);
        return null;
      }
      get().setActive(call);
      return call;
    } catch {
      return null;
    }
  },

  ingestWs: (raw) => {
    const type = String(raw.type ?? '');
    if (type === 'call.room_active') {
      const conversationId = Number(raw.conversationId ?? raw.conversation_id);
      const groupName = String(raw.groupName ?? raw.group_name ?? '');
      if (!Number.isFinite(conversationId) || !groupName) return;
      get().setActive({
        conversationId,
        groupName,
        kind: normalizeKind(raw.kind),
        mode: String(raw.mode ?? '').toLowerCase() === 'conference' ? 'conference' : 'direct',
        callId: raw.callId != null ? Number(raw.callId) : null,
        callerId: raw.callerId != null ? Number(raw.callerId) : null,
        callerName: typeof raw.callerName === 'string' ? raw.callerName : null,
        joinedIds: asIntList(raw.joinedIds ?? raw.joined_ids),
        participantIds: asIntList(raw.participantIds ?? raw.participant_ids),
        status: typeof raw.status === 'string' ? raw.status : null,
      });
      return;
    }

    if (type === 'call.ended') {
      const groupName = String(raw.groupName ?? raw.group_name ?? '');
      const conversationId = Number(raw.conversationId ?? raw.conversation_id);
      if (Number.isFinite(conversationId)) {
        get().clearActive(conversationId, groupName || undefined);
        return;
      }
      if (groupName) {
        const match = Object.values(get().activeByConversation).find((c) => c.groupName === groupName);
        if (match) get().clearActive(match.conversationId, groupName);
      }
      return;
    }

    if (type === 'call.room_ended') {
      const conversationId = Number(raw.conversationId ?? raw.conversation_id);
      const groupName = String(raw.groupName ?? raw.group_name ?? '');
      if (!Number.isFinite(conversationId)) return;
      get().clearActive(conversationId, groupName || undefined);
      const reason = String(raw.reason ?? 'ended');
      if (reason === 'missed' || reason === 'declined') {
        const callerId = raw.callerId != null ? Number(raw.callerId) : null;
        const myId = useUserStore.getState().user?.id;
        // Don't flag the caller as having a missed call to call back.
        if (callerId != null && myId != null && callerId === myId) return;
        get().setMissed({
          conversationId,
          kind: normalizeKind(raw.kind),
          callerId,
          callerName: typeof raw.callerName === 'string' ? raw.callerName : null,
          at: Date.now(),
        });
      }
      return;
    }

    if (type === 'call.missed' || type === 'call.incoming') {
      // Incoming alone doesn't set missed; call.missed does when ring times out for callee.
      if (type !== 'call.missed') return;
      let conversationId = Number(raw.conversationId ?? raw.conversation_id);
      const groupName = String(raw.groupName ?? raw.group_name ?? '');
      // Signaling frames often only include groupName — resolve via active room map.
      if (!Number.isFinite(conversationId) && groupName) {
        const match = Object.values(get().activeByConversation).find((c) => c.groupName === groupName);
        if (match) conversationId = match.conversationId;
      }
      if (!Number.isFinite(conversationId)) return;
      get().clearActive(conversationId);
      get().setMissed({
        conversationId,
        kind: normalizeKind(raw.kind),
        callerId: raw.callerId != null ? Number(raw.callerId) : null,
        callerName: typeof raw.callerName === 'string' ? raw.callerName : null,
        at: Date.now(),
      });
    }
  },
}));
