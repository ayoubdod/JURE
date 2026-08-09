import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MessageItem from './MessageItem';
import MessageEditModal from './MessageEditModal';
import DeleteMessageModal from './DeleteMessageModal';
import ForwardConversationPicker from './ForwardConversationPicker';
import {
  Phone,
  Video,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  ImageIcon,
  Link2,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useUserStore from '@/stores/userStore';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import GroupChatIcon from './GroupChatIcon';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  /** True while a voice/video call session is active (outgoing, ringing, or connected). */
  callInProgress?: boolean;
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
  /** Mobile: back to conversation list */
  onBack?: () => void;
}
>(({ 
  conversation,
  onCallVoice,
  onCallVideo,
  callInProgress = false,
  onOpenSettings,
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
  onBack,
}, ref) => {
  const { t } = useAppTranslation();
  const toastMsgs = t.conversations.toasts;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const connectedConversationIdRef = useRef<number | null>(null);
  const loadingForConvRef = useRef<number | null>(null);
  const pinnedMessageIdsRef = useRef<Set<string>>(new Set());
  const [messages, setMessages] = useState<API.Message[]>([]);
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
    const id = setTimeout(() => {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 80);
    return () => clearTimeout(id);
  }, [messages, isTyping]);

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
    apiGetMessages(convId, { limit: 50 })
      .then((res) => {
        if (loadingForConvRef.current !== convId) return;
        const d = res.data as API.Message[] | { results?: API.Message[] };
        const list = Array.isArray(d) ? d : (d?.results ?? []);
        setMessages(mergePinFlagsOntoMessages(list));
      })
      .catch(() => {
        if (loadingForConvRef.current === convId) setMessages([]);
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
      const currConvId = connectedConversationIdRef.current;
      if (currConvId !== convId) return;

      devLog('[ws conversation]', convId, '←', data.type);

      if (typeof data.type === 'string' && data.type.startsWith('call.')) {
        emitConversationCallMessage(data);
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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/50 min-w-0">
        <div className="text-center px-6">
          <p className="text-[13px] text-slate-500 dark:text-slate-500">
            {t.conversations.emptyPane}
          </p>
          <button
            onClick={onStartNewChat}
            className="mt-3 text-[13px] font-medium text-primary hover:underline"
          >
            {t.conversations.newChat}
          </button>
        </div>
      </div>
    );
  }

  const getMemberPerson = (m: API.ConversationMembership) =>
    (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;
  const isDirect = conversation.type === 'direct';
  const linkedCase: API.LinkedCaseSummary | null =
    (conversation as API.Conversation).linkedCase ??
    (conversation as API.Conversation).linked_case ??
    null;
  const currentEmail = (useUserStore.getState().user?.email ?? '').toLowerCase();
  const peer = isDirect
    ? conversation.memberships.find((m) =>
        (getMemberPerson(m)?.email ?? '').toLowerCase() !== currentEmail
      )
    : undefined;
  const peerPerson = peer ? getMemberPerson(peer) : undefined;
  const otherParticipant = (conversation as any).other_participant;
  const peerForAvatar = peerPerson ?? otherParticipant;
  const peerImage = getPersonImage(peerForAvatar as Record<string, unknown>);
  const displayName =
    (conversation as any).display_name ||
    (isDirect
      ? (conversation as any).other_participant?.full_name ||
        `${peerPerson?.first_name ?? ''} ${peerPerson?.last_name ?? ''}`.trim()
      : conversation.title);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-2 sm:px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={t.conversations.backAria}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {isDirect ? (
            <UserAvatar
              image={peerImage}
              firstName={peerForAvatar?.first_name}
              lastName={peerForAvatar?.last_name}
              size="sm"
              className="h-8 w-8 shrink-0"
            />
          ) : (
            <GroupChatIcon
              iconUrl={(conversation as any).icon_url}
              iconPresetEmoji={(conversation as any).icon_preset_emoji}
              size="sm"
              className="h-8 w-8"
            />
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">
              {displayName || 'Chat'}
            </p>
            {isTyping && (
              <p className="text-[11px] text-slate-500 dark:text-slate-500 animate-pulse">
                {t.conversations.typing}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <button
                    type="button"
                    onClick={callInProgress ? undefined : onCallVoice}
                    disabled={callInProgress}
                    aria-disabled={callInProgress}
                    className={cn(
                      'p-1.5 rounded text-slate-500',
                      callInProgress
                        ? 'cursor-not-allowed opacity-45'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </span>
              </TooltipTrigger>
              {callInProgress && (
                <TooltipContent side="bottom">Call in progress</TooltipContent>
              )}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <button
                    type="button"
                    onClick={callInProgress ? undefined : onCallVideo}
                    disabled={callInProgress}
                    aria-disabled={callInProgress}
                    className={cn(
                      'p-1.5 rounded text-slate-500',
                      callInProgress
                        ? 'cursor-not-allowed opacity-45'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </span>
              </TooltipTrigger>
              {callInProgress && (
                <TooltipContent side="bottom">Call in progress</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hidden"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isDirect && onChangeIcon && (
                <DropdownMenuItem onClick={() => onChangeIcon?.(conversation)}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Change icon
                </DropdownMenuItem>
              )}
              {!isDirect && onOpenLinkCaseModal && onUnlinkConversationCase && (
                <>
                  {linkedCase ? (
                    <>
                      <div className="px-2 py-1.5 text-[11px] text-slate-500 cursor-default">
                        <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                          <Link2 className="h-3 w-3" />
                          Linked: {linkedCase.reference ?? `#${linkedCase.id}`}
                        </span>
                      </div>
                      <DropdownMenuItem onClick={() => onOpenLinkCaseModal()}>
                        <Link2 className="mr-2 h-4 w-4" /> Change Case
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm('Remove case link from this conversation?')) void onUnlinkConversationCase();
                        }}
                        className="text-slate-700 dark:text-slate-300"
                      >
                        Remove Link
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => onOpenLinkCaseModal()}>
                      <Link2 className="mr-2 h-4 w-4" /> Link Case
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteConversation?.(conversation)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - stable scroll area to prevent layout shift */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0 flex flex-col"
      >
        <div className="flex flex-col gap-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="w-full shrink-0"
              ref={(el) => {
                if (el) messageRefsMap.current.set(message.id, el);
              }}
              data-message-id={message.id}
            >
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
            />
            </div>
          ))}
        </div>
        {isTyping && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="px-2.5 py-1.5 rounded-[4px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-500 text-[13px]">
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
