import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MessageItem from './MessageItem';
import MessageEditModal from './MessageEditModal';
import DeleteMessageModal from './DeleteMessageModal';
import ForwardConversationPicker from './ForwardConversationPicker';
import ConversationHeader from './ConversationHeader';
import ConversationEmptyState from './ConversationEmptyState';
import AppointmentMeetingBanner from './AppointmentMeetingBanner';
import useUserStore from '@/stores/userStore';
import useChatStore from '@/stores/chatStore';
import {
  apiMarkConversationRead,
  apiEditMessage,
  apiDeleteMessage,
  apiForwardMessage,
  apiPinMessage,
  apiListPinnedMessages,
  apiGetMessages,
} from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { devLog } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

import { getConversationWsUrl } from '@/config/api';
import type { WebSocketMessage } from '@/stores/chatStore';
import {
  emitConversationCallMessage,
  registerConversationSignalingSocket,
  unregisterConversationSignalingSocket,
} from '@/stores/conversationCallBridge';
import { useConversationCallPresenceStore } from '@/stores/conversationCallPresenceStore';
import { useCallSessionStore } from '@/stores/callSessionStore';
import { isOnlineUserId, personPresenceId } from '@/lib/presence';
import {
  ActiveCallBanner,
} from '@/components/conversations/call/ConversationCallBanners';
import {
  collectConversationFiles,
  formatDateSeparator,
  getDirectPeer,
  getMemberPerson,
  getMessageLayoutMeta,
  messageSentAt,
} from './conversationUtils';

export type ChatWindowHandle = {
  scrollToMessage: (messageId: number) => void;
};

/** Stable key for message id (API may use number or string). */
function messageIdKey(id: unknown): string {
  if (id == null) return '';
  return String(id);
}

const ChatWindow = forwardRef<
  ChatWindowHandle,
  {
  conversation?: API.Conversation;
  onCallVoice?: () => void;
  onCallVideo?: () => void;
  /** Join a scheduled appointment conference (may join an active call or start one). */
  onJoinMeeting?: () => void;
  /** True while a voice/video call session is active (outgoing, ringing, or connected). */
  callInProgress?: boolean;
  onJoinActiveCall?: () => void;
  onRecallMissedCall?: (kind?: 'voice' | 'video') => void;
  onOpenSettings?: () => void;
  onStartNewChat?: () => void;
  onDeleteConversation?: (conversation: API.Conversation) => void;
  onChangeIcon?: (conversation: API.Conversation) => void;
  onConversationOpen?: () => void;
  onNavigateToConversation?: (conversationId: number) => void;
  isTyping?: boolean;
  /** Append message from REST response immediately (Composer lives outside this component). */
  lastLocallySentMessage?: {
    key: number;
    message?: API.Message;
    replaceTempId?: number;
    removeOnlyId?: number;
  } | null;
  onOpenSharedCase?: (caseId: number) => void;
  onOpenSharedTask?: (taskId: number) => void;
  onOpenSharedAppointment?: (appointmentId: number) => void;
  onPinnedMessagesChange?: (messages: API.Message[]) => void;
  onOpenLinkCaseModal?: () => void;
  onUnlinkConversationCase?: () => void | Promise<void>;
  onOpenLinkedCase?: (caseId: number) => void;
  /** Mobile: back to conversation list */
  onBack?: () => void;
  onOpenContext?: () => void;
  onConversationFilesChange?: (files: API.MessageAttachment[]) => void;
}
>(({ 
  conversation,
  onCallVoice,
  onCallVideo,
  onJoinMeeting,
  callInProgress = false,
  onJoinActiveCall,
  onRecallMissedCall,
  onOpenSettings: _onOpenSettings,
  onStartNewChat,
  onDeleteConversation,
  onChangeIcon,
  onConversationOpen,
  onNavigateToConversation,
  isTyping = false,
  lastLocallySentMessage = null,
  onOpenSharedCase,
  onOpenSharedTask,
  onOpenSharedAppointment,
  onPinnedMessagesChange,
  onOpenLinkCaseModal,
  onUnlinkConversationCase,
  onOpenLinkedCase,
  onBack,
  onOpenContext,
  onConversationFilesChange,
}, ref) => {
  const { t } = useAppTranslation();
  const toastMsgs = t.conversations.toasts;
  const callCopy = t.conversations.call;
  const onlineIds = useChatStore((s) => s.onlineIds ?? []);
  const callSessionStatus = useCallSessionStore((s) => s.ui.status);
  const callSessionConvId = useCallSessionStore((s) => s.ui.conversationId);
  const activeCall = useConversationCallPresenceStore((s) =>
    conversation?.id != null ? s.activeByConversation[conversation.id] : undefined
  );
  const fetchActive = useConversationCallPresenceStore((s) => s.fetchActive);

  useEffect(() => {
    if (!conversation?.id) return;
    void fetchActive(conversation.id);
  }, [conversation?.id, fetchActive]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const isNearBottomRef = useRef(true);
  const pendingInstantScrollRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const connectedConversationIdRef = useRef<number | null>(null);
  const loadingForConvRef = useRef<number | null>(null);
  const pinnedMessageIdsRef = useRef<Set<string>>(new Set());
  const [messages, setMessages] = useState<API.Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<API.Message | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<API.Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<API.Message | null>(null);
  const { toast } = useToast();

  const updateMessageInList = (updated: API.Message) => {
    const uKey = messageIdKey(updated.id);
    setMessages((prev) =>
      prev.map((m) => (messageIdKey(m.id) === uKey ? updated : m))
    );
  };

  const mergePinFlagsOntoMessages = (list: API.Message[]): API.Message[] => {
    const keys = pinnedMessageIdsRef.current;
    return list.map((m) => ({
      ...m,
      is_pinned: keys.has(messageIdKey(m.id)),
    }));
  };

  const loadPinnedMessages = () => {
    if (!conversation) return;
    apiListPinnedMessages(conversation.id)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const pinnedKeys = new Set(list.map((m) => messageIdKey(m.id)));
        pinnedMessageIdsRef.current = pinnedKeys;
        onPinnedMessagesChange?.(list);
        // Sync pin state to messages so all participants see pins (even without WebSocket broadcast)
        setMessages((prev) =>
          prev.map((m) => ({ ...m, is_pinned: pinnedKeys.has(messageIdKey(m.id)) }))
        );
      })
      .catch(() => {
        pinnedMessageIdsRef.current = new Set();
        onPinnedMessagesChange?.([]);
      });
  };

  useEffect(() => {
    isNearBottomRef.current = true;
    pendingInstantScrollRef.current = true;
  }, [conversation?.id]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const jump = pendingInstantScrollRef.current;
    if (!jump && !isNearBottomRef.current) return;

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const node = messagesContainerRef.current;
        if (!node) return;
        if (jump) {
          node.scrollTop = node.scrollHeight;
          if (messages.length > 0) pendingInstantScrollRef.current = false;
        } else {
          const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
          // Don't animate through a long history (e.g. opening a conversation).
          if (distance > node.clientHeight) {
            node.scrollTop = node.scrollHeight;
          } else {
            node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
          }
        }
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [messages, isTyping]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  };

  useEffect(() => {
    if (!lastLocallySentMessage || !conversation) return;
    const { message: msg, replaceTempId, removeOnlyId } = lastLocallySentMessage;
    if (removeOnlyId != null) {
      setMessages((prev) => prev.filter((m) => m.id !== removeOnlyId));
      return;
    }
    if (!msg) return;
    const msgConv =
      typeof msg.conversation === 'number'
        ? msg.conversation
        : (msg.conversation as { id?: number } | undefined)?.id;
    if (msgConv == null || msgConv !== conversation.id) return;
    setMessages((prev) => {
      const base = replaceTempId != null ? prev.filter((m) => m.id !== replaceTempId) : prev;
      if (base.some((m) => m.id === msg.id)) return base;
      return [...base, msg];
    });
  }, [lastLocallySentMessage?.key, conversation?.id, lastLocallySentMessage]);

  useEffect(() => {
    if (!conversation) {
      useChatStore.getState().setViewingConversationId(null);
      return;
    }
    const convId = conversation.id;
    useChatStore.getState().setViewingConversationId(convId);
    useChatStore.getState().markConversationInboxRead(convId);
    return () => {
      if (useChatStore.getState().viewingConversationId === convId) {
        useChatStore.getState().setViewingConversationId(null);
      }
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation) return;

    const convId = conversation.id;
    loadingForConvRef.current = convId;
    pinnedMessageIdsRef.current = new Set();
    setMessages((prev) => (prev.length ? [] : prev));

    apiMarkConversationRead(convId)
      .then(() => onConversationOpen?.())
      .catch(() => {});

    loadPinnedMessages();

    // Load messages via REST – avoid clearing first to prevent flash; replace only when data arrives
    setMessagesLoading(true);
    apiGetMessages(convId, { limit: 50 })
      .then((res) => {
        if (loadingForConvRef.current !== convId) return;
        const d = res.data as API.Message[] | { results?: API.Message[] };
        const list = Array.isArray(d) ? d : (d?.results ?? []);
        setMessages(mergePinFlagsOntoMessages(list));
      })
      .catch(() => {
        if (loadingForConvRef.current === convId) setMessages([]);
      })
      .finally(() => {
        if (loadingForConvRef.current === convId) setMessagesLoading(false);
      });

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      connectedConversationIdRef.current === conversation.id
    ) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      connectedConversationIdRef.current = null;
    }

    const token = useUserStore.getState().accessToken;
    const ws = new WebSocket(getConversationWsUrl(conversation.id, token));
    wsRef.current = ws;
    connectedConversationIdRef.current = conversation.id;

    ws.onopen = () => {
      if (wsRef.current === ws && connectedConversationIdRef.current === convId) {
        registerConversationSignalingSocket(convId, ws);
      }
    };
    ws.onmessage = (event) => {
      let data: WebSocketMessage & { payload?: API.Message | API.Message[] };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'session.replaced') {
        import('@/utils/sessionReplaced').then(({ handleSessionReplaced }) => {
          handleSessionReplaced();
        });
        return;
      }
      const currConvId = connectedConversationIdRef.current;
      if (currConvId !== convId) return;

      devLog('[ws conversation]', convId, '←', data.type);

      if (typeof data.type === 'string' && data.type.startsWith('call.')) {
        emitConversationCallMessage(data);
        useConversationCallPresenceStore.getState().ingestWs(data as Record<string, unknown>);
        return;
      }

      if (data.type === 'message.history' && Array.isArray(data.payload)) {
        setMessages(mergePinFlagsOntoMessages(data.payload as API.Message[]));
      } else if (data.type === 'message.new' && !Array.isArray(data.payload)) {
        const incoming = data.payload;
        setMessages((prev) => {
          if (prev.some((m) => messageIdKey(m.id) === messageIdKey(incoming.id))) return prev;
          return [
            ...prev,
            {
              ...incoming,
              is_pinned: pinnedMessageIdsRef.current.has(messageIdKey(incoming.id)),
            },
          ];
        });
        onConversationOpen?.();
      } else if (data.type === 'message.updated' && !Array.isArray(data.payload)) {
        const raw = data.payload as API.Message & { isPinned?: boolean };
        const merged: API.Message = {
          ...raw,
          is_pinned:
            raw.is_pinned === true || raw.isPinned === true
              ? true
              : raw.is_pinned === false || raw.isPinned === false
                ? false
                : raw.is_pinned,
        };
        updateMessageInList(merged);
        loadPinnedMessages();
      }
    };

    return () => {
      unregisterConversationSignalingSocket(convId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        connectedConversationIdRef.current = null;
      }
    };
  }, [conversation?.id, onConversationOpen]);

  // Poll pinned messages so other participants see pins (backend may not broadcast message.updated)
  useEffect(() => {
    if (!conversation) return;
    const interval = setInterval(loadPinnedMessages, 15000);
    return () => clearInterval(interval);
  }, [conversation?.id]);

  // Refetch pinned when user returns to tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && conversation) loadPinnedMessages();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversation?.id]);

  const handleEditMessage = async (body: string) => {
    if (!editMessage) return;
    const res = await apiEditMessage(editMessage.id, body);
    if (res.data) updateMessageInList(res.data);
    setEditMessage(null);
    toast({ title: toastMsgs.messageUpdated });
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessage) return;
    await apiDeleteMessage(deleteMessage.id);
    updateMessageInList({ ...deleteMessage, body: '', is_deleted: true });
    setDeleteMessage(null);
    loadPinnedMessages();
    toast({ title: toastMsgs.messageDeleted });
  };

  const handleForwardMessage = async (targetConversationId: number) => {
    if (!forwardMessage) return;
    try {
      const res = await apiForwardMessage(forwardMessage.id, targetConversationId);
      setForwardMessage(null);
      toast({ title: toastMsgs.messageForwarded });
      if (onNavigateToConversation) {
        onNavigateToConversation(targetConversationId);
      } else if (res.data && targetConversationId === conversation?.id) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast({
          title: toastMsgs.accessDenied,
          description: toastMsgs.cannotForward,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.common.error,
          description: toastMsgs.couldNotForward,
          variant: 'destructive',
        });
      }
    }
  };

  const handlePinMessage = async (msg: API.Message, pinned: boolean) => {
    const key = messageIdKey(msg.id);
    const numericId =
      typeof msg.id === 'number' && Number.isFinite(msg.id)
        ? msg.id
        : parseInt(String(msg.id), 10);
    if (!Number.isFinite(numericId)) {
      toast({
        title: t.common.error,
        description: toastMsgs.couldNotUpdatePin,
        variant: 'destructive',
      });
      return;
    }
    try {
      await apiPinMessage(numericId, pinned);
      if (pinned) {
        pinnedMessageIdsRef.current.add(key);
      } else {
        pinnedMessageIdsRef.current.delete(key);
      }
      updateMessageInList({ ...msg, is_pinned: pinned });
      loadPinnedMessages();
      toast({ title: pinned ? toastMsgs.messagePinned : toastMsgs.messageUnpinned });
    } catch (err) {
      if (!pinned) {
        pinnedMessageIdsRef.current.add(key);
      }
      loadPinnedMessages();
      toast({
        title: t.common.error,
        description: toastMsgs.couldNotUpdatePin,
        variant: 'destructive',
      });
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToMessage: (messageId: number) => {
      const el = messageRefsMap.current.get(messageId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  }));

  useEffect(() => {
    onConversationFilesChange?.(collectConversationFiles(messages));
  }, [messages, onConversationFilesChange]);

  if (!conversation) {
    return <ConversationEmptyState onNewChat={onStartNewChat} />;
  }

  const currentEmail = (useUserStore.getState().user?.email ?? '').toLowerCase();
  const peer = getDirectPeer(conversation, currentEmail);
  const peerPerson = peer ? getMemberPerson(peer) : conversation.other_participant;
  const isPeerOnline =
    conversation.type === 'direct' && isOnlineUserId(personPresenceId(peerPerson), onlineIds);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-slate-950/40">
      <ConversationHeader
        conversation={conversation}
        isTyping={isTyping}
        isOnline={isPeerOnline}
        callInProgress={callInProgress}
        onBack={onBack}
        onCallVoice={onCallVoice}
        onCallVideo={onCallVideo}
        onOpenContext={onOpenContext}
        onDeleteConversation={onDeleteConversation}
        onChangeIcon={onChangeIcon}
        onOpenLinkCaseModal={onOpenLinkCaseModal}
        onUnlinkConversationCase={onUnlinkConversationCase}
        onOpenLinkedCase={onOpenLinkedCase}
      />

      {conversation.active_or_upcoming_appointment || conversation.is_temporary ? (
        <AppointmentMeetingBanner
          appointment={conversation.active_or_upcoming_appointment}
          isTemporaryChat={conversation.is_temporary}
          callInProgress={callInProgress}
          onJoin={onJoinMeeting}
          onOpenAppointment={onOpenSharedAppointment}
        />
      ) : null}

      {activeCall &&
      conversation?.id === activeCall.conversationId &&
      activeCall.joinedIds.length > 0 ? (
        <ActiveCallBanner
          call={activeCall}
          amInCall={
            callSessionStatus !== 'idle' &&
            callSessionConvId === conversation.id &&
            (callSessionStatus === 'active' ||
              callSessionStatus === 'connecting' ||
              callSessionStatus === 'calling' ||
              callSessionStatus === 'reconnecting')
          }
          title={
            activeCall.mode === 'conference'
              ? callCopy.activeGroupCallTitle
              : callCopy.activeCallTitle
          }
          joinLabel={callCopy.activeCallJoin}
          inCallLabel={callCopy.activeCallInCall}
          groupSubtitle={callCopy.activeGroupCallSubtitle}
          ongoingSubtitle={callCopy.activeCallOngoingSubtitle}
          inCallCountLabel={callCopy.activeCallCount}
          onJoin={() => onJoinActiveCall?.()}
        />
      ) : null}

      {/* Messages - stable scroll area to prevent layout shift */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4"
      >
        {messagesLoading && messages.length === 0 ? (
          <div className="space-y-4 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn('flex animate-pulse gap-2', i % 2 === 0 ? '' : 'justify-end')}>
                {i % 2 === 0 ? <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800" /> : null}
                <div className="h-10 w-[45%] rounded-2xl bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[180px] items-center justify-center">
            <div className="text-center">
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {t.conversations.emptyMessages}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">{t.conversations.emptyMessagesHint}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((message, index) => {
              const layout = getMessageLayoutMeta(messages, index);
              const sent = messageSentAt(message);
              return (
                <div
                  key={message.id}
                  className="w-full shrink-0"
                  ref={(el) => {
                    if (el) messageRefsMap.current.set(message.id, el);
                  }}
                  data-message-id={message.id}
                >
                  {layout.showDateSeparator && sent ? (
                    <div className="my-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatDateSeparator(sent, {
                          today: t.conversations.today,
                          yesterday: t.conversations.yesterday,
                        })}
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                  ) : null}
                  <MessageItem
                    msg={message}
                    conversation={conversation}
                    onEdit={(m) => setEditMessage(m)}
                    onDelete={(m) => setDeleteMessage(m)}
                    onForward={(m) => setForwardMessage(m)}
                    onPin={handlePinMessage}
                    onOpenSharedCase={onOpenSharedCase}
                    onOpenSharedTask={onOpenSharedTask}
                    onOpenSharedAppointment={onOpenSharedAppointment}
                    onRecallCall={(kind) => onRecallMissedCall?.(kind)}
                    isFirstInGroup={layout.isFirstInGroup}
                    isLastInGroup={layout.isLastInGroup}
                  />
                </div>
              );
            })}
          </div>
        )}
        {isTyping && (
          <div className="mt-3 flex items-end gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {t.conversations.typing}
            </div>
          </div>
        )}
      </div>

      <MessageEditModal
        open={!!editMessage}
        onOpenChange={(open) => !open && setEditMessage(null)}
        message={editMessage}
        onSave={handleEditMessage}
      />

      <DeleteMessageModal
        open={!!deleteMessage}
        onOpenChange={(open) => !open && setDeleteMessage(null)}
        message={deleteMessage}
        onConfirm={handleDeleteMessage}
      />

      <ForwardConversationPicker
        open={!!forwardMessage}
        onOpenChange={(open) => !open && setForwardMessage(null)}
        currentConversationId={conversation.id}
        onSelect={handleForwardMessage}
      />

    </div>
  );
});

ChatWindow.displayName = 'ChatWindow';

export default ChatWindow;
