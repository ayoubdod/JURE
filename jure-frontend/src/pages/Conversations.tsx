'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import ConversationList from '@/components/chat/ConversationList';
import ChatWindow, { type ChatWindowHandle } from '@/components/chat/ChatWindow';
import { LinkCaseModal } from '@/components/chat/LinkCaseModal';
import ContextPanel from '@/components/chat/ContextPanel';
import NewChatModal, { NewChatModalRef } from '@/components/chat/NewChatModal';
import Composer from '@/components/chat/Composer';
import CaseDetailDrawer, { CaseDetailDrawerRef } from '@/components/case/CaseDetailDrawer';
import {
  TaskDetailPanel,
  AppointmentDetailPanel,
} from '@/components/calendar/EmbeddedDetailPanels';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/AppointmentUpdateModal';
import type { Appointment } from '@/services/appointment/api';
import { invalidateUserWorkspaceCache } from '@/utils/userWorkspaceCache';
import {
  apiListConversations,
  apiSendMessage,
  apiArchiveConversation,
  apiUnarchiveConversation,
  apiPinConversation,
  apiUnpinConversation,
  apiCreateConversation,
  apiLinkConversationCase,
  apiUnlinkConversationCase,
} from '@/services/conversations/api';
import type { ShareableSearchCaseHit } from '@/services/search/api';
import { isAxiosError } from 'axios';
import DeleteChatModal, { DeleteChatModalRef } from '@/components/chat/DeleteChatModal';
import RenameGroupModal, { RenameGroupModalRef } from '@/components/chat/RenameGroupModal';
import ChangeGroupIconModal, { ChangeGroupIconModalRef } from '@/components/chat/ChangeGroupIconModal';
import useChatStore from '@/stores/chatStore';
import useCallsWsStore from '@/stores/callsWsStore';
import useUserStore from '@/stores/userStore';
import { useWebRtcCall } from '@/hooks/useWebRtcCall';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<API.Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | undefined>(undefined);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const newChatModalRef = useRef<NewChatModalRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const deleteChatModalRef = useRef<DeleteChatModalRef>(null);
  const renameGroupModalRef = useRef<RenameGroupModalRef>(null);
  const changeGroupIconModalRef = useRef<ChangeGroupIconModalRef>(null);
  const { toast } = useToast();

  // Call UI lives in DashboardLayout <CallShell />; this page only initiates calls.
  const { callState, initiateCall } = useWebRtcCall();

  const user = useUserStore((s) => s.user);

  const [showArchived, setShowArchived] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<API.Conversation[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const loadConversations = useCallback((includeArchived?: 0 | 1, silent = false) => {
    if (!silent) setIsLoading(true);
    apiListConversations(includeArchived !== undefined ? { include_archived: includeArchived } : undefined)
      .then((res) => {
        const data = res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        if (includeArchived === 1) {
          const active = list.filter((c) => !(c as any).archived);
          const archived = list.filter((c) => (c as any).archived);
          setConversations(active);
          setArchivedConversations(archived);
        } else {
          setConversations(list);
        }
      })
      .catch((err) => {
        setConversations([]);
        if (isAxiosError(err) && err.response?.status === 403) {
          toast({ title: 'Access denied', description: 'You do not have access to these conversations.', variant: 'destructive' });
        }
      })
      .finally(() => { if (!silent) setIsLoading(false); });
  }, [toast]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefetchRef = useRef<number>(0);
  const REFETCH_DEBOUNCE_MS = 1500;
  const REFETCH_MIN_INTERVAL_MS = 3000;
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const now = Date.now();
      if (now - lastRefetchRef.current < REFETCH_MIN_INTERVAL_MS) return;
      lastRefetchRef.current = now;
      loadConversations(undefined, true);
    }, REFETCH_DEBOUNCE_MS);
  }, [loadConversations]);

  const [searchParams, setSearchParams] = useSearchParams();

  const [lastLocallySentMessage, setLastLocallySentMessage] = useState<{
    key: number;
    message?: API.Message;
    replaceTempId?: number;
    removeOnlyId?: number;
  } | null>(null);

  const caseDetailDrawerRef = useRef<CaseDetailDrawerRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);
  const [panelTaskId, setPanelTaskId] = useState<number | null>(null);
  const [panelAppointmentId, setPanelAppointmentId] = useState<number | null>(null);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const [linkCaseModalOpen, setLinkCaseModalOpen] = useState(false);
  const [linkCaseSubmitting, setLinkCaseSubmitting] = useState(false);
  const [pinnedForContext, setPinnedForContext] = useState<API.Message[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!useUserStore.getState().isLoggedIn) return;
    const chat = useChatStore.getState();
    const calls = useCallsWsStore.getState();
    if (!chat.isConnected && !chat.isConnecting) {
      void chat.connect();
    }
    if (!calls.isConnected && !calls.isConnecting) {
      void calls.connect().catch(() => {});
    }
  }, []);

  const loadArchived = useCallback(() => {
    if (archivedConversations.length > 0) return;
    setArchivedLoading(true);
    apiListConversations({ include_archived: 1 })
      .then((res) => {
        const data = res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const active = list.filter((c) => !(c as any).archived);
        const archived = list.filter((c) => (c as any).archived);
        setConversations(active);
        setArchivedConversations(archived);
      })
      .catch(() => setArchivedConversations([]))
      .finally(() => setArchivedLoading(false));
  }, [archivedConversations.length]);

  const clearSelectedSearchParam = useCallback(() => {
    if (!searchParams.get('selected')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('selected');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  /** Prefer this over setActiveId when the user picks a thread — avoids ?selected= fighting manual choice. */
  const selectConversation = useCallback(
    (id: number) => {
      setActiveId(id);
      clearSelectedSearchParam();
    },
    [clearSelectedSearchParam]
  );

  // Deep link: ?selected=<id> (e.g. notification). Strip param after apply so list refetches don't reset activeId.
  useEffect(() => {
    const selected = searchParams.get('selected');
    if (!selected) return;
    const id = parseInt(selected, 10);
    if (isNaN(id)) return;
    const inActive = conversations.some((c) => c.id === id);
    const inArchived = archivedConversations.some((c) => c.id === id);
    const consume = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('selected');
      setSearchParams(next, { replace: true });
    };
    if (inActive) {
      setActiveId(id);
      consume();
      return;
    }
    if (inArchived) {
      setActiveId(id);
      setShowArchived(true);
      consume();
      return;
    }
    if (!isLoading) {
      setActiveId(id);
      setShowArchived(true);
      loadArchived();
      consume();
    }
  }, [
    searchParams,
    conversations,
    archivedConversations,
    isLoading,
    loadArchived,
    setSearchParams,
  ]);

  const handleApiError = (err: unknown, action: string) => {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 403) toast({ title: 'Access denied', description: 'You are not a member of this conversation.', variant: 'destructive' });
      else if (status === 404) toast({ title: 'Not found', description: 'Conversation not found.', variant: 'destructive' });
      else toast({ title: 'Error', description: `Could not ${action}. Please try again.`, variant: 'destructive' });
    }
    loadConversations(undefined, true);
  };

  const handleArchive = (conv: API.Conversation) => {
    apiArchiveConversation(conv.id)
      .then(() => {
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
        setArchivedConversations((prev) => [...prev, { ...conv, archived: true }]);
        if (activeId === conv.id) setActiveId(undefined);
      })
      .catch((err) => handleApiError(err, 'archive'));
  };

  const handleUnarchive = (conv: API.Conversation) => {
    apiUnarchiveConversation(conv.id)
      .then(() => {
        setArchivedConversations((prev) => prev.filter((c) => c.id !== conv.id));
        loadConversations(undefined, true);
      })
      .catch((err) => handleApiError(err, 'unarchive'));
  };

  const handlePin = (conv: API.Conversation) => {
    apiPinConversation(conv.id).then(() => loadConversations(undefined, true)).catch((err) => handleApiError(err, 'pin'));
  };

  const handleUnpin = (conv: API.Conversation) => {
    apiUnpinConversation(conv.id).then(() => loadConversations(undefined, true)).catch((err) => handleApiError(err, 'unpin'));
  };

  const getMemberPerson = (m: API.ConversationMembership) =>
    (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;

  const handleSelectMember = useCallback(
    (memberId: number) => {
      const allConvs = [...conversations, ...archivedConversations];
      const existing = allConvs.find((c) => {
        if (c.type !== 'direct') return false;
        const other = c.memberships?.find((m) => {
          const p = getMemberPerson(m);
          const uid = p?.id ?? (p as any)?.pk;
          return uid != null && (uid === memberId || String(uid) === String(memberId));
        });
        return !!other;
      });
      if (existing) {
        selectConversation(existing.id);
        if ((existing as any).archived) {
          apiUnarchiveConversation(existing.id)
            .then(() => loadConversations(undefined, true))
            .catch((err) => handleApiError(err, 'unarchive'));
        }
        return;
      }
      apiCreateConversation({
        participants: [memberId],
        title: '',
        type: 'direct',
      })
        .then((res) => {
          const conv = res.data;
          setConversations((prev) => [conv, ...prev]);
          selectConversation(conv.id);
        })
        .catch((err) => handleApiError(err, 'start chat'));
    },
    [conversations, archivedConversations, loadConversations, selectConversation]
  );

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => c.id === activeId) ??
      archivedConversations.find((c) => c.id === activeId),
    [conversations, archivedConversations, activeId]
  );

  const remoteUserForActiveDirect = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'direct') return null;
    const myEmail = (user?.email ?? '').toLowerCase();
    const peer = activeConversation.memberships?.find(
      (m) => (m.user?.email ?? '').toLowerCase() !== myEmail
    );
    const u = peer?.user;
    if (!u?.id) return null;
    const name =
      `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || 'Contact';
    return {
      id: u.id,
      name,
      avatar: (u as { image?: string }).image ?? null,
      firstName: u.first_name ?? undefined,
      lastName: u.last_name ?? undefined,
    };
  }, [activeConversation, user?.email]);

  const handleStartVoiceCall = () => {
    if (!activeId || !activeConversation) return;
    if (activeConversation.type !== 'direct') {
      toast({
        title: 'Voice calls unavailable',
        description: 'Voice calls are only available in direct messages.',
        variant: 'destructive',
      });
      return;
    }
    if (!remoteUserForActiveDirect) {
      toast({
        title: 'Cannot start call',
        description: 'Could not resolve the other participant.',
        variant: 'destructive',
      });
      return;
    }
    initiateCall({
      conversationId: activeId,
      targetUserId: remoteUserForActiveDirect.id,
      remoteUser: remoteUserForActiveDirect,
      kind: 'voice',
    });
  };

  const handleStartVideoCall = () => {
    if (!activeId || !activeConversation) return;
    if (activeConversation.type !== 'direct') {
      toast({
        title: 'Video calls unavailable',
        description: 'Video calls are only available in direct messages.',
        variant: 'destructive',
      });
      return;
    }
    if (!remoteUserForActiveDirect) {
      toast({
        title: 'Cannot start call',
        description: 'Could not resolve the other participant.',
        variant: 'destructive',
      });
      return;
    }
    initiateCall({
      conversationId: activeId,
      targetUserId: remoteUserForActiveDirect.id,
      remoteUser: remoteUserForActiveDirect,
      kind: 'video',
    });
  };

  const callInProgress = callState.status !== 'idle';

  const chatStore = useChatStore();
  const recentMessages = useMemo(
    () => chatStore.notifications.filter((m: any) => m.is_message),
    [chatStore.notifications]
  );

  useEffect(() => {
    if (recentMessages.length === 0) return;
    const t = setTimeout(() => loadConversations(undefined, true), 600);
    return () => clearTimeout(t);
  }, [recentMessages.length, loadConversations]);

  const lastConversationUpdated = chatStore.lastConversationUpdated;
  useEffect(() => {
    if (!lastConversationUpdated) return;
    const updated = lastConversationUpdated as any;
    const title = updated.display_name ?? updated.title ?? '';
    const merge = (c: API.Conversation) =>
      c.id === updated.id
        ? { ...c, ...updated, title, display_name: title }
        : c;
    setConversations((prev) => prev.map(merge));
    setArchivedConversations((prev) => prev.map(merge));
    chatStore.clearConversationUpdate();
  }, [lastConversationUpdated]);

  const handleConversationPatch = useCallback((conversationId: number, patch: Partial<API.Conversation>) => {
    const merge = (c: API.Conversation) => (c.id === conversationId ? ({ ...c, ...patch } as API.Conversation) : c);
    setConversations((prev) => prev.map(merge));
    setArchivedConversations((prev) => prev.map(merge));
  }, []);

  const handleConfirmLinkCase = useCallback(
    async (caseId: number, row: ShareableSearchCaseHit) => {
      if (!activeConversation || activeConversation.type !== 'group') return;
      const convId = activeConversation.id;
      const prev = activeConversation.linkedCase ?? activeConversation.linked_case ?? null;
      const optimistic: API.LinkedCaseSummary = {
        id: caseId,
        reference: row.reference ?? null,
        title: row.title ?? '',
        status: row.status,
        caseType: row.caseType ?? null,
      };
      handleConversationPatch(convId, { linkedCase: optimistic, linked_case: optimistic });
      setLinkCaseSubmitting(true);
      try {
        const res = await apiLinkConversationCase(convId, caseId);
        const updated = res.data as API.Conversation;
        const lc = updated.linkedCase ?? updated.linked_case ?? null;
        handleConversationPatch(convId, { linkedCase: lc, linked_case: lc } as Partial<API.Conversation>);
        setLinkCaseModalOpen(false);
        const refLabel = lc?.reference ?? String(caseId);
        toast({ title: `Case ${refLabel} linked to this conversation` });
      } catch (err) {
        handleConversationPatch(convId, { linkedCase: prev, linked_case: prev } as Partial<API.Conversation>);
        const st = isAxiosError(err) ? err.response?.status : undefined;
        toast({
          title: st === 400 ? 'Cannot link case' : st === 403 ? 'Access denied' : 'Could not link case',
          description:
            st === 400
              ? 'Only group chats can link a case, and the case must be in your cabinet.'
              : 'Try again or check your permissions.',
          variant: 'destructive',
        });
      } finally {
        setLinkCaseSubmitting(false);
      }
    },
    [activeConversation, handleConversationPatch, toast]
  );

  const handleUnlinkConversationCase = useCallback(async () => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    const convId = activeConversation.id;
    const prev = activeConversation.linkedCase ?? activeConversation.linked_case ?? null;
    handleConversationPatch(convId, { linkedCase: null, linked_case: null } as Partial<API.Conversation>);
    try {
      await apiUnlinkConversationCase(convId);
    } catch (err) {
      handleConversationPatch(convId, { linkedCase: prev, linked_case: prev } as Partial<API.Conversation>);
      const st = isAxiosError(err) ? err.response?.status : undefined;
      toast({
        title: st === 403 ? 'Access denied' : 'Could not remove link',
        variant: 'destructive',
      });
    }
  }, [activeConversation, handleConversationPatch, toast]);

  const activeLinkedCaseForPanel = useMemo(() => {
    const c = activeConversation;
    if (!c || c.type !== 'group') return null;
    return c.linkedCase ?? c.linked_case ?? null;
  }, [activeConversation]);

  useEffect(() => {
    setPinnedForContext([]);
  }, [activeId]);

  const bumpWorkspaceCache = useCallback(() => {
    if (remoteUserForActiveDirect?.id) {
      invalidateUserWorkspaceCache(remoteUserForActiveDirect.id);
    }
    setWorkspaceRefreshKey((k) => k + 1);
  }, [remoteUserForActiveDirect?.id]);

  const openCaseById = useCallback((caseId: number) => {
    caseDetailDrawerRef.current?.open({ id: caseId } as API.Case);
  }, []);

  const handleSendShared = useCallback(
    async (args: {
      messageType: API.MessageType;
      sharedCaseId?: number;
      sharedTaskId?: number;
      sharedAppointmentId?: number;
      sharedItem: API.SharedItem;
    }) => {
      if (!activeId || !user?.id) return;
      const tempId = -Math.abs(Date.now());
      const optimistic: API.Message = {
        id: tempId,
        conversation: activeId,
        sender: user.id,
        body: '',
        sent_at: new Date().toISOString(),
        is_own: true,
        messageType: args.messageType,
        sharedItem: args.sharedItem,
        ...(args.sharedCaseId != null ? { sharedCaseId: args.sharedCaseId } : {}),
        ...(args.sharedTaskId != null ? { sharedTaskId: args.sharedTaskId } : {}),
        ...(args.sharedAppointmentId != null ? { sharedAppointmentId: args.sharedAppointmentId } : {}),
      };
      setLastLocallySentMessage({ key: Date.now(), message: optimistic });
      try {
        const res = await apiSendMessage({
          conversation: activeId,
          body: '',
          messageType: args.messageType,
          sharedCaseId: args.sharedCaseId,
          sharedTaskId: args.sharedTaskId,
          sharedAppointmentId: args.sharedAppointmentId,
        });
        if (res.data) {
          setLastLocallySentMessage({
            key: Date.now(),
            message: res.data,
            replaceTempId: tempId,
          });
        }
      } catch (err) {
        if (isAxiosError(err)) {
          const st = err.response?.status;
          if (st === 400) {
            const data = err.response?.data as Record<string, unknown> | undefined;
            const detail =
              data && typeof data === 'object'
                ? Object.entries(data)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                    .join(' ')
                : '';
            toast({
              title: 'Invalid share',
              description: detail || 'Check message type and selected item.',
              variant: 'destructive',
            });
          } else if (st === 403) {
            toast({ title: 'Access denied', description: 'You cannot send this share.', variant: 'destructive' });
          } else {
            toast({
              title: 'Share not sent',
              description: 'Check your connection and try again.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Share not sent',
            description: 'Check your connection and try again.',
            variant: 'destructive',
          });
        }
        setLastLocallySentMessage({ key: Date.now(), removeOnlyId: tempId });
      }
    },
    [activeId, user?.id, toast]
  );

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-950 min-h-0 text-[13px] font-sans overflow-hidden">
      {/* Chat list — full width on mobile when no active chat */}
      <ConversationList
        className={cn(
          activeId != null ? 'hidden md:flex' : 'flex'
        )}
        isLoading={isLoading}
        conversations={conversations}
        archivedConversations={archivedConversations}
        showArchived={showArchived}
        archivedLoading={archivedLoading}
        onToggleArchived={() => {
          setShowArchived((s) => !s);
          if (!showArchived) loadArchived();
        }}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onPin={handlePin}
        onUnpin={handleUnpin}
        onDelete={(conv) => deleteChatModalRef.current?.show(conv)}
        onRename={(conv) => renameGroupModalRef.current?.show(conv)}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onNewChat={() => newChatModalRef.current?.show()}
        onSelectMember={handleSelectMember}
      />

      {/* Main Chat Pane — full screen on mobile when a chat is open */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800',
          activeId == null ? 'hidden md:flex' : 'flex'
        )}
      >
        <ChatWindow
          ref={chatWindowRef}
          conversation={activeConversation}
          onBack={() => {
            setActiveId(undefined);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('selected');
              return next;
            });
          }}
          onCallVoice={handleStartVoiceCall}
          onCallVideo={handleStartVideoCall}
          callInProgress={callInProgress}
          onOpenSettings={() => {}}
          onStartNewChat={() => newChatModalRef.current?.show()}
          onDeleteConversation={(conv) => deleteChatModalRef.current?.show(conv)}
          onChangeIcon={(conv) => changeGroupIconModalRef.current?.show(conv)}
          onConversationOpen={debouncedRefetch}
          onNavigateToConversation={(id) => setActiveId(id)}
          isTyping={isTyping}
          lastLocallySentMessage={lastLocallySentMessage}
          onOpenSharedCase={openCaseById}
          onOpenSharedTask={(id) => setPanelTaskId(id)}
          onOpenSharedAppointment={(id) => setPanelAppointmentId(id)}
          onPinnedMessagesChange={setPinnedForContext}
          onOpenLinkCaseModal={() => setLinkCaseModalOpen(true)}
          onUnlinkConversationCase={handleUnlinkConversationCase}
        />

        {activeId && (
          <Composer
            disabled={!activeId}
            conversationId={activeId}
            onSendShared={handleSendShared}
            onSend={(text, attachments) => {
              if (!activeId) return;
              const trimmed = text.trim();
              if (trimmed || (attachments && attachments.length > 0)) {
                apiSendMessage({
                  conversation: activeId,
                  body: trimmed,
                  attachments: attachments ?? [],
                })
                  .then((res) => {
                    if (res.data) {
                      setLastLocallySentMessage({ key: Date.now(), message: res.data });
                    }
                  })
                  .catch(() => {
                    toast({
                      title: 'Message not sent',
                      description: 'Check your connection and try again.',
                      variant: 'destructive',
                    });
                  });
              }
            }}
            onAttachFiles={(files) => {
              if (!activeId) return;
              apiSendMessage({
                conversation: activeId,
                body: '',
                attachments: files,
              })
                .then((res) => {
                  if (res.data) {
                    setLastLocallySentMessage({ key: Date.now(), message: res.data });
                  }
                })
                .catch(() => {
                  toast({
                    title: 'Message not sent',
                    description: 'Check your connection and try again.',
                    variant: 'destructive',
                  });
                });
            }}
            onRecordVoice={async (blob) => {
              if (!activeId) return;
              apiSendMessage({
                conversation: activeId,
                body: '',
                attachments: [
                  new File([blob], 'voice.webm', { type: 'audio/webm' }),
                ],
              })
                .then((res) => {
                  if (res.data) {
                    setLastLocallySentMessage({ key: Date.now(), message: res.data });
                  }
                })
                .catch(() => {
                  toast({
                    title: 'Message not sent',
                    description: 'Check your connection and try again.',
                    variant: 'destructive',
                  });
                });
            }}
          />
        )}
      </div>

      {/* Context Panel — desktop only */}
      <div className="hidden lg:contents">
      <ContextPanel
        conversation={activeConversation}
        isOpen={contextPanelOpen}
        onToggle={() => setContextPanelOpen((o) => !o)}
        peerUserId={remoteUserForActiveDirect?.id ?? null}
        workspaceRefreshKey={workspaceRefreshKey}
        onOpenTask={(id) => setPanelTaskId(id)}
        onWorkspaceTaskMutated={bumpWorkspaceCache}
        linkedCaseSummary={activeLinkedCaseForPanel}
        canManageGroupCase={activeConversation?.type === 'group'}
        onOpenLinkCaseModal={() => setLinkCaseModalOpen(true)}
        onUnlinkConversationCase={handleUnlinkConversationCase}
        onOpenLinkedCase={openCaseById}
        panelPinnedMessages={pinnedForContext}
        onPanelPinnedMessageClick={(id) => chatWindowRef.current?.scrollToMessage(id)}
      />
      </div>

      {activeConversation?.type === 'group' && (
        <LinkCaseModal
          open={linkCaseModalOpen}
          onOpenChange={setLinkCaseModalOpen}
          onConfirm={handleConfirmLinkCase}
          confirming={linkCaseSubmitting}
        />
      )}

      <CaseDetailDrawer ref={caseDetailDrawerRef} />
      <TaskDetailPanel
        taskId={panelTaskId}
        open={panelTaskId != null}
        onOpenChange={(v) => {
          if (!v) setPanelTaskId(null);
        }}
        onEdit={(t) => taskUpdateRef.current?.show(t)}
        portalContainer={null}
        onOpenCase={openCaseById}
      />
      <AppointmentDetailPanel
        appointmentId={panelAppointmentId}
        open={panelAppointmentId != null}
        onOpenChange={(v) => {
          if (!v) setPanelAppointmentId(null);
        }}
        onEdit={(a: Appointment) => appointmentUpdateRef.current?.show(a)}
        portalContainer={null}
        onOpenCase={openCaseById}
      />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={bumpWorkspaceCache} />
      <AppointmentUpdateModal ref={appointmentUpdateRef} onSuccess={bumpWorkspaceCache} />

      <NewChatModal
        ref={newChatModalRef}
        onCreateConversation={(conversation) => {
          selectConversation(conversation.id);
          loadConversations(undefined, true);
        }}
      />

      <DeleteChatModal
        ref={deleteChatModalRef}
        onSuccess={(conversation) => {
          setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
          setArchivedConversations((prev) => prev.filter((c) => c.id !== conversation.id));
          if (activeId === conversation.id) setActiveId(undefined);
          loadConversations(undefined, true);
        }}
      />

      <RenameGroupModal
        ref={renameGroupModalRef}
        onSuccess={(updated) => {
          const merge = (c: API.Conversation) =>
            c.id === updated.id ? { ...c, ...updated, title: updated.title, display_name: (updated as any).display_name ?? updated.title } : c;
          setConversations((prev) => prev.map(merge));
          setArchivedConversations((prev) => prev.map(merge));
        }}
      />

      <ChangeGroupIconModal
        ref={changeGroupIconModalRef}
        onSuccess={(updated) => {
          const merge = (c: API.Conversation) =>
            c.id === updated.id
              ? { ...c, ...updated, icon_url: (updated as any).icon_url, icon_preset_emoji: (updated as any).icon_preset_emoji }
              : c;
          setConversations((prev) => prev.map(merge));
          setArchivedConversations((prev) => prev.map(merge));
        }}
      />
    </div>
  );
};

export default ConversationsPage;
