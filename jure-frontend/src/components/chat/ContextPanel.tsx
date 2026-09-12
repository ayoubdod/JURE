'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Mail, Users, Copy, Phone, Pin, FileText, ImageIcon, Play, Settings2, Shield, UserPlus, Mic, Briefcase, CalendarDays, ListTodo, Ban } from 'lucide-react';
import GroupChatIcon from '@/components/chat/GroupChatIcon';
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import { apiGetUserWorkspace } from '@/services/userWorkspace/api';
import {
  getCachedUserWorkspace,
  invalidateUserWorkspaceCache,
  setCachedUserWorkspace,
} from '@/utils/userWorkspaceCache';
import { normalizeUserWorkspace } from '@/utils/normalizeUserWorkspace';
import { TaskPriority, TaskStatus, BACKEND_BASE_URL, MessageAttachmentKind } from '@/utils/constants';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { isAxiosError } from 'axios';
import {
  getMessageType,
  getSharedMessagePreviewText,
} from '@/components/chat/SharedMessageCard';
import LinkedMatterCard, { type LinkedMatterTab } from '@/components/chat/LinkedMatterCard';
import { attachmentFileName, attachmentHref, getMemberPerson, isDocumentAttachment, isImageOrVideoAttachment, activeMemberships } from '@/components/chat/conversationUtils';
import { useAppTranslation, intlLocale, formatTime } from '@/i18n';
import { isOnlineUserId, personPresenceId, formatPresenceLastSeen, resolveLastSeenAt } from '@/lib/presence';
import { isAwayLike, publicPresenceMode } from '@/lib/presenceMode';
import { ModeDot } from '@/components/header/ModeMenu';
import useChatStore from '@/stores/chatStore';
import { useOnlineIds, useLastSeenById } from '@/hooks/useOnlinePresence';

interface ContextPanelProps {
  conversation?: API.Conversation;
  isOpen: boolean;
  onToggle: () => void;
  peerUserId?: number | null;
  workspaceRefreshKey?: number;
  onOpenTask?: (taskId: number) => void;
  onWorkspaceTaskMutated?: () => void;
  /** Group chat: full linked case for preview + actions */
  linkedCaseSummary?: API.LinkedCaseSummary | null;
  canManageGroupCase?: boolean;
  onOpenLinkCaseModal?: () => void;
  onUnlinkConversationCase?: () => void | Promise<void>;
  onOpenLinkedCase?: (caseId: number) => void;
  onOpenLinkedCaseTab?: (caseId: number, tab: LinkedMatterTab) => void;
  /** Pinned messages for this conversation (direct + group; synced from chat) */
  panelPinnedMessages?: API.Message[];
  onPanelPinnedMessageClick?: (messageId: number) => void;
  conversationFiles?: API.MessageAttachment[];
  variant?: 'inline' | 'overlay';
  hideToggle?: boolean;
  onOpenGroupSettings?: (conversation: API.Conversation) => void;
}

type MainTab = 'contact' | 'tasks' | 'availability';
type TaskSubTab = 'active' | 'all';

function taskStatusPill(s?: string): string {
  if (s === TaskStatus.DONE) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === TaskStatus.IN_PROGRESS) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  if (s === TaskStatus.CANCELLED) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

function showPriorityPill(p?: string): boolean {
  const u = String(p || '').toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function formatDayMonthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function dueTone(
  dueIso: string | null | undefined,
  status: string | undefined,
  dueLabel: string,
  interpolate: (tpl: string, vars: Record<string, string | number>) => string,
  locale: string
): { cls: string; label: string } {
  if (!dueIso) return { cls: 'text-slate-500 dark:text-slate-400', label: '' };
  const days = getCountdownDays(dueIso);
  const overdue = days != null && days < 0 && status !== TaskStatus.DONE;
  const date = formatDayMonthYear(dueIso, locale);
  const label = interpolate(dueLabel, { date });
  if (overdue) return { cls: 'text-red-700 dark:text-red-400 font-semibold', label };
  if (days == null) return { cls: 'text-slate-500 dark:text-slate-400', label };
  const style = getCountdownStyle(days);
  const base =
    style === 'critical'
      ? 'text-red-700 dark:text-red-400 font-semibold'
      : style === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  return { cls: base, label };
}

function workloadBarClass(total: number): string {
  if (total <= 3) return 'bg-emerald-500';
  if (total <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function workloadFillPct(total: number): number {
  return Math.min(100, (total / 10) * 100);
}

function workloadLevelBadge(
  level: string | undefined,
  assigned: number | undefined,
  labels: { low: string; medium: string; high: string }
): { label: string; cls: string } {
  const L = String(level || '').toUpperCase();
  if (L === 'LOW') return { label: labels.low, cls: 'text-emerald-700 dark:text-emerald-400' };
  if (L === 'MEDIUM') return { label: labels.medium, cls: 'text-amber-700 dark:text-amber-400' };
  if (L === 'HIGH') return { label: labels.high, cls: 'text-red-700 dark:text-red-400' };
  const a = assigned ?? 0;
  if (a <= 3) return { label: labels.low, cls: 'text-emerald-700 dark:text-emerald-400' };
  if (a <= 6) return { label: labels.medium, cls: 'text-amber-700 dark:text-amber-400' };
  return { label: labels.high, cls: 'text-red-700 dark:text-red-400' };
}

function eventDotClass(t: string): string {
  const u = t.toUpperCase();
  if (u === 'HEARING') return 'bg-rose-500';
  if (u === 'DEADLINE') return 'bg-rose-400';
  if (u === 'CONSULTATION') return 'bg-blue-500';
  if (u === 'TASK_DUE') return 'bg-indigo-500';
  if (u === 'APPOINTMENT') return 'bg-emerald-500';
  return 'bg-slate-400';
}

function eventDateTone(iso?: string): string {
  if (!iso) return 'text-slate-500 dark:text-slate-400';
  const days = getCountdownDays(iso);
  const overdue = days != null && days < 0;
  if (overdue) return 'text-red-700 dark:text-red-400 font-semibold';
  if (days != null && days <= 3) return 'text-red-700 dark:text-red-400 font-semibold';
  if (days != null && days <= 14) return 'text-amber-700 dark:text-amber-400';
  return 'text-slate-500 dark:text-slate-400';
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  conversation,
  isOpen,
  onToggle,
  peerUserId = null,
  workspaceRefreshKey = 0,
  onOpenTask,
  onWorkspaceTaskMutated,
  linkedCaseSummary = null,
  canManageGroupCase = false,
  onOpenLinkCaseModal,
  onUnlinkConversationCase,
  onOpenLinkedCase,
  panelPinnedMessages = [],
  onPanelPinnedMessageClick,
  onOpenLinkedCaseTab,
  conversationFiles = [],
  variant = 'inline',
  hideToggle = false,
  onOpenGroupSettings,
}) => {
  const { t, tf, lang, enumLabel } = useAppTranslation();
  const currentUser = useUserStore?.getState?.()?.user;
  const { toast } = useToast();
  const onlineIds = useOnlineIds();
  const lastSeenById = useLastSeenById();
  const statusById = useChatStore((s) => s.statusById ?? {});
  const [mainTab, setMainTab] = useState<MainTab>('contact');
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>('active');
  const [workspace, setWorkspace] = useState<API.UserWorkspace | null>(null);
  const [wsLoading, setWsLoading] = useState(false);

  const peer = conversation?.type === 'direct'
    ? conversation.memberships.find((m) =>
        (getMemberPerson(m)?.email ?? '').toLowerCase() !== (currentUser?.email ?? '').toLowerCase()
      )
    : undefined;
  const user = peer ? getMemberPerson(peer) : conversation?.other_participant;
  const peerImage =
    getPersonImage(conversation?.other_participant) ?? getPersonImage(user);
  const displayName =
    conversation?.display_name ||
    (conversation?.type === 'direct'
      ? conversation?.other_participant?.full_name ||
        `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
        t.conversations.unknownContact
      : conversation?.title);

  const isDirect = conversation?.type === 'direct';
  const showTabs = isDirect && !!peerUserId;
  const peerPresenceId = peerUserId ?? personPresenceId(user);
  const peerOnline = isOnlineUserId(peerPresenceId, onlineIds);
  const peerMode = publicPresenceMode(
    statusById[peerPresenceId ?? -1] ?? (user as { mode?: string } | undefined)?.mode,
    null
  );
  const peerAway = peerOnline && isAwayLike(peerMode);
  const peerLastSeenAt = resolveLastSeenAt(
    peerPresenceId,
    lastSeenById,
    (user as { last_seen_at?: string | null } | undefined)?.last_seen_at ??
      conversation?.other_participant?.last_seen_at
  );
  const peerLastSeenLabel =
    !peerOnline && isDirect
      ? formatPresenceLastSeen(peerLastSeenAt, lang, t.conversations.presenceLastSeen)
      : null;
  const roleKey = String(user?.role ?? '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  const roleLabel =
    roleKey && roleKey in t.team.roles
      ? t.team.roles[roleKey as keyof typeof t.team.roles]
      : user?.role
        ? String(user.role).replace(/_/g, ' ')
        : '';
  const peerPhone = (user as { phone?: string } | undefined)?.phone?.trim() || '';

  const pinnedSnippet = (msg: API.Message) => {
    const body = msg.body ?? (msg as { content?: string }).content ?? '';
    const isDeleted = (msg as { is_deleted?: boolean }).is_deleted;
    const mt = getMessageType(msg);
    if (isDeleted) return t.conversations.messageDeletedPreview;

    const sharedPreview = getSharedMessagePreviewText(msg, {
      missedVideo: t.conversations.call.missedVideoCallTitle,
      missedVoice: t.conversations.call.missedCallTitle,
      videoCall: t.conversations.call.historyVideoCall,
      voiceCall: t.conversations.call.historyVoiceCall,
      sharedCase: t.conversations.sharedCase,
      sharedTask: t.conversations.sharedTask,
      sharedAppointment: t.conversations.sharedAppointment,
    });
    if (sharedPreview) return sharedPreview;

    if (body?.trim()) return body.length > 90 ? `${body.slice(0, 90)}…` : body;

    const atts = msg.attachments ?? [];
    if (atts.some((a) => a.kind === MessageAttachmentKind.IMAGE)) return t.conversations.photoPreview;
    if (atts.some((a) => a.kind === MessageAttachmentKind.VIDEO)) return t.conversations.videoPreview;
    if (atts.some((a) => a.kind === MessageAttachmentKind.AUDIO)) return t.conversations.voicePreview;
    if (atts.some((a) => a.kind === MessageAttachmentKind.FILE)) {
      const file = atts.find((a) => a.kind === MessageAttachmentKind.FILE);
      return file ? attachmentFileName(file.file) : t.conversations.documentPreview;
    }
    return t.conversations.attachmentPreview;
  };

  const pinnedThumb = (msg: API.Message): { src: string; isVideo: boolean } | null => {
    const atts = msg.attachments ?? [];
    const media = atts.find(
      (a) => a.kind === MessageAttachmentKind.IMAGE || a.kind === MessageAttachmentKind.VIDEO
    );
    if (!media) return null;
    const src = media.thumbnail
      ? attachmentHref(media.thumbnail, BACKEND_BASE_URL)
      : attachmentHref(media.file, BACKEND_BASE_URL);
    return { src, isVideo: media.kind === MessageAttachmentKind.VIDEO };
  };

  const pinnedKindMeta = (msg: API.Message) => {
    const mt = getMessageType(msg);
    if ((msg as { is_deleted?: boolean }).is_deleted) {
      return { Icon: Ban, label: t.conversations.messageDeletedPreview };
    }
    if (mt === 'SHARED_CASE') return { Icon: Briefcase, label: t.conversations.sharedCase };
    if (mt === 'SHARED_TASK') return { Icon: ListTodo, label: t.conversations.sharedTask };
    if (mt === 'SHARED_APPOINTMENT') return { Icon: CalendarDays, label: t.conversations.sharedAppointment };
    const atts = msg.attachments ?? [];
    if (atts.some((a) => a.kind === MessageAttachmentKind.IMAGE)) {
      return { Icon: ImageIcon, label: t.conversations.photoPreview };
    }
    if (atts.some((a) => a.kind === MessageAttachmentKind.VIDEO)) {
      return { Icon: Play, label: t.conversations.videoPreview };
    }
    if (atts.some((a) => a.kind === MessageAttachmentKind.AUDIO)) {
      return { Icon: Mic, label: t.conversations.voicePreview };
    }
    if (atts.some((a) => a.kind === MessageAttachmentKind.FILE)) {
      return { Icon: FileText, label: t.conversations.documentPreview };
    }
    return null;
  };

  const pinnedSenderName = (msg: API.Message) => {
    const s = msg.sender;
    if (!s || typeof s === 'number') return '';
    return (
      s.full_name ||
      `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() ||
      s.email ||
      ''
    );
  };

  const loadWorkspace = useCallback(
    (force: boolean) => {
      if (!peerUserId) return;
      if (!force) {
        const hit = getCachedUserWorkspace(peerUserId);
        if (hit) {
          setWorkspace(hit);
          return;
        }
      }
      setWsLoading(true);
      apiGetUserWorkspace(peerUserId)
        .then((res) => {
          const norm = normalizeUserWorkspace(res.data);
          setCachedUserWorkspace(peerUserId, norm);
          setWorkspace(norm);
        })
        .catch((err) => {
          setWorkspace(null);
          if (isAxiosError(err)) {
            const st = err.response?.status;
            if (st === 404) {
              toast({ title: t.conversations.workspaceUnavailable, description: t.conversations.workspaceUnavailableHint, variant: 'destructive' });
            } else if (st === 403) {
              toast({ title: t.conversations.toasts.accessDenied, variant: 'destructive' });
            }
          }
        })
        .finally(() => setWsLoading(false));
    },
    [peerUserId]
  );

  useEffect(() => {
    if (!showTabs || !peerUserId) return;
    if (mainTab === 'tasks' || mainTab === 'availability') {
      loadWorkspace(false);
    }
  }, [mainTab, showTabs, peerUserId, loadWorkspace]);

  useEffect(() => {
    if (!peerUserId || workspaceRefreshKey === 0) return;
    invalidateUserWorkspaceCache(peerUserId);
    if (mainTab === 'tasks' || mainTab === 'availability') {
      loadWorkspace(true);
    }
  }, [workspaceRefreshKey, peerUserId, mainTab, loadWorkspace]);

  useEffect(() => {
    // reset workspace tab when switching conversations
    setMainTab('contact');
  }, [conversation?.id]);

  const copyText = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: tf(t.conversations.copied, { label }) });
    } catch {
      toast({ title: t.conversations.couldNotCopy, variant: 'destructive' });
    }
  };

  const tasks = workspace?.tasks ?? [];
  const filteredTasks =
    taskSubTab === 'active' ? tasks.filter((t) => t.status !== TaskStatus.DONE) : tasks;

  const availability = workspace?.availability;
  const assignedN = availability?.totalAssigned ?? 0;
  const inProgressN = availability?.inProgress ?? 0;
  const urgentN = availability?.urgent ?? 0;
  const levelInfo = workloadLevelBadge(availability?.workloadLevel, assignedN, t.team.workloadLegend);

  const upcoming = availability?.upcomingEvents ?? [];

  const pinnedMessagesSection =
    panelPinnedMessages.length > 0 ? (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Pin className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          {t.conversations.pinned}
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 tabular-nums text-[9px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            {panelPinnedMessages.length}
          </span>
        </p>
        <ul className="space-y-2">
          {panelPinnedMessages.map((msg) => {
            const thumb = pinnedThumb(msg);
            const kind = pinnedKindMeta(msg);
            const snippet = pinnedSnippet(msg);
            const sender = pinnedSenderName(msg);
            const when = msg.sent_at || msg.created;
            const timeLabel = when ? formatTime(when, lang) : '';
            const body = (msg.body ?? (msg as { content?: string }).content ?? '').trim();
            const showKindChip = Boolean(kind && (!body || thumb));

            return (
              <li key={msg.id}>
                <button
                  type="button"
                  className="group flex w-full gap-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-2 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-amber-300 hover:from-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-slate-900/60 dark:hover:border-amber-800/60"
                  onClick={() => onPanelPinnedMessageClick?.(msg.id)}
                >
                  {thumb ? (
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-amber-200/60 dark:bg-slate-800 dark:ring-amber-900/40">
                      <img src={thumb.src} alt="" className="h-full w-full object-cover" />
                      {thumb.isVideo ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-3.5 w-3.5 fill-white text-white" />
                        </span>
                      ) : null}
                    </span>
                  ) : kind ? (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40">
                      <kind.Icon className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100/80 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/40">
                      <Pin className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 py-0.5">
                    {(sender || timeLabel) && (
                      <span className="mb-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        {sender ? (
                          <span className="truncate font-medium text-slate-600 dark:text-slate-300">
                            {sender}
                          </span>
                        ) : null}
                        {sender && timeLabel ? <span aria-hidden>·</span> : null}
                        {timeLabel ? <span className="shrink-0 tabular-nums">{timeLabel}</span> : null}
                      </span>
                    )}
                    {showKindChip && kind && body ? (
                      <span className="mb-0.5 inline-flex items-center gap-1 rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50">
                        <kind.Icon className="h-2.5 w-2.5" />
                        {kind.label}
                      </span>
                    ) : null}
                    <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-slate-800 dark:text-slate-100">
                      {snippet}
                    </span>
                  </span>
                  <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600 rtl:rotate-180" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  const mediaItems = conversationFiles.filter(isImageOrVideoAttachment);
  const documentItems = conversationFiles.filter(isDocumentAttachment);

  const mediaSection =
    mediaItems.length > 0 ? (
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <ImageIcon className="h-3 w-3" />
          {t.conversations.media}
        </p>
        <ul className="grid grid-cols-3 gap-1.5">
          {mediaItems.slice(0, 9).map((file) => {
            const href = attachmentHref(file.file, BACKEND_BASE_URL);
            const thumb = file.thumbnail
              ? attachmentHref(file.thumbnail, BACKEND_BASE_URL)
              : href;
            return (
              <li key={file.id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-md border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:border-slate-800 dark:bg-slate-800"
                  title={attachmentFileName(file.file)}
                >
                  {file.kind === 'image' ? (
                    <img src={thumb} alt="" className="h-16 w-full object-cover" />
                  ) : (
                    <span className="relative block h-16 w-full bg-slate-200 dark:bg-slate-800">
                      {file.thumbnail ? (
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </span>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  const filesSection =
    documentItems.length > 0 ? (
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <FileText className="h-3 w-3" />
          {t.conversations.files}
        </p>
        <ul className="space-y-1">
          {documentItems.slice(0, 12).map((file) => {
            const href = attachmentHref(file.file, BACKEND_BASE_URL);
            return (
              <li key={file.id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#64499D] dark:text-slate-300 dark:hover:bg-slate-800/60"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{attachmentFileName(file.file)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  const contactBlock = (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-[#F7F4FF] via-white to-white p-5 dark:border-slate-800 dark:from-[#24183F]/60 dark:via-slate-900/80 dark:to-slate-900/80">
        <div
          className="pointer-events-none absolute -top-10 start-1/2 h-28 w-40 -translate-x-1/2 rounded-full bg-[#64499D]/10 blur-2xl dark:bg-[#64499D]/20"
          aria-hidden
        />
        <div className="relative flex flex-col items-center text-center">
          {conversation?.type === 'direct' && user ? (
            <div className="relative mb-3 shrink-0">
              <UserAvatar
                image={peerImage}
                firstName={user.first_name}
                lastName={user.last_name}
                size="lg"
                className="h-[4.5rem] w-[4.5rem] text-base shadow-md ring-4 ring-white dark:ring-slate-900"
              />
              <PresenceDot
                online={peerOnline && !peerAway}
                className="h-3.5 w-3.5 border-2 border-white dark:border-slate-900"
              />
              {peerAway ? (
                <span className="absolute -bottom-0.5 -end-0.5">
                  <ModeDot mode="AWAY" />
                </span>
              ) : null}
            </div>
          ) : conversation?.type === 'group' ? (
            <GroupChatIcon
              iconUrl={(conversation as API.Conversation).icon_url}
              iconPresetEmoji={(conversation as API.Conversation).icon_preset_emoji}
              size="lg"
              className="mb-3 h-[4.5rem] w-[4.5rem] shrink-0"
            />
          ) : (
            <div className="mb-3 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <Users className="h-7 w-7 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <p className="max-w-full truncate text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {displayName}
          </p>
          {isDirect ? (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium',
                peerOnline && !peerAway
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : peerAway
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  peerOnline && !peerAway
                    ? 'bg-emerald-500'
                    : peerAway
                      ? 'bg-amber-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                )}
                aria-hidden
              />
              {peerOnline
                ? peerAway
                  ? t.mode.options.AWAY.label
                  : t.conversations.presenceOnline
                : peerLastSeenLabel || t.conversations.presenceOffline}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">{t.conversations.typeGroup}</p>
          )}
          {roleLabel ? (
            <span className="mt-2.5 inline-flex rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64499D] shadow-sm ring-1 ring-[#64499D]/18 dark:bg-[#64499D]/25 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/35">
              {roleLabel}
            </span>
          ) : null}
        </div>
      </div>

      {user && (user.email || peerPhone) ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
          {user.email ? (
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-b-0 dark:border-slate-800">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#64499D]/8 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t.auth.emailLabel}
                </p>
                <a
                  href={`mailto:${user.email}`}
                  className="block truncate text-[12.5px] font-medium text-slate-800 hover:text-[#64499D] dark:text-slate-200"
                >
                  {user.email}
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700"
                aria-label={t.auth.emailLabel}
                onClick={() => copyText(t.auth.emailLabel, user.email)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
          {peerPhone ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#64499D]/8 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]">
                <Phone className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t.support.phoneLabel}
                </p>
                <a
                  href={`tel:${peerPhone}`}
                  className="block truncate text-[12.5px] font-medium text-slate-800 hover:text-[#64499D] dark:text-slate-200"
                >
                  {peerPhone}
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700"
                aria-label={t.support.phoneLabel}
                onClick={() => copyText(t.support.phoneLabel, peerPhone)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isDirect && conversation && (
        <>
          {pinnedMessagesSection}
          {mediaSection}
          {filesSection}
          {!pinnedMessagesSection && !mediaSection && !filesSection ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <Pin className="h-3.5 w-3.5" />
              </span>
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                {t.conversations.noPinned}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {t.conversations.pinHint}
              </p>
            </div>
          ) : null}
        </>
      )}

      {!isDirect && conversation && (
        <>
          <LinkedMatterCard
            linkedCase={linkedCaseSummary ?? null}
            canManage={canManageGroupCase}
            onOpenLinkedCase={onOpenLinkedCase}
            onOpenLinkedCaseTab={onOpenLinkedCaseTab}
            onOpenLinkCaseModal={onOpenLinkCaseModal}
            onUnlinkConversationCase={onUnlinkConversationCase}
          />

          {pinnedMessagesSection}
          {mediaSection}
          {filesSection}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Users className="h-3 w-3" />
                {t.conversations.participants}
              </p>
              {onOpenGroupSettings ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#64499D] hover:bg-[#64499D]/10"
                    onClick={() => onOpenGroupSettings(conversation)}
                  >
                    <UserPlus className="h-3 w-3" />
                    {t.conversations.addMembersMenu}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label={t.conversations.groupSettingsMenu}
                    onClick={() => onOpenGroupSettings(conversation)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
            <ul className="space-y-2">
              {activeMemberships(conversation).map((m) => {
                const p = getMemberPerson(m) as API.User | undefined;
                if (!p) return null;
                const img = getPersonImage(p as Record<string, unknown>);
                return (
                  <li
                    key={m.id}
                    className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        firstName={p.first_name}
                        lastName={p.last_name}
                        image={img}
                        size="sm"
                        className="h-8 w-8 shrink-0"
                      />
                      <PresenceDot online={isOnlineUserId(personPresenceId(p), onlineIds)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-slate-800 dark:text-slate-200">
                        {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
                          p.email ||
                          t.team.drawer.memberTypeActive}
                      </p>
                      {p.email ? (
                        <p className="truncate text-[10px] text-slate-500">{p.email}</p>
                      ) : null}
                    </div>
                    {m.is_admin ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-semibold uppercase text-amber-800 dark:text-amber-400">
                        <Shield className="h-3 w-3" />
                        {t.cases.typeLabels.admin}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const tasksSkeleton = (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  const tasksTabContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{t.conversations.tasksTab}</span>
          <span className="text-[10px] font-medium rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 tabular-nums text-slate-700 dark:text-slate-300">
            {filteredTasks.length}
          </span>
        </div>
      </div>
      <div className="flex rounded-md border border-slate-200 dark:border-slate-800 p-0.5">
        {(['active', 'all'] as const).map((sub) => (
          <button
            key={sub}
            type="button"
            onClick={() => setTaskSubTab(sub)}
            className={cn(
              'flex-1 text-[11px] font-medium py-1 rounded',
              taskSubTab === sub
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {sub === 'active' ? t.conversations.tasksActive : t.conversations.tasksAll}
          </button>
        ))}
      </div>
      {wsLoading && !workspace ? (
        tasksSkeleton
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center dark:border-slate-800">
          <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
            {tf(
              taskSubTab === 'active' ? t.conversations.noActiveTasksFor : t.conversations.noTasksFor,
              { name: displayName?.split(' ')[0] ?? t.conversations.contact }
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTasks.map((task) => {
            const caseRef = task.relatedCase?.reference;
            const caseTitle = task.relatedCase?.title;
            const due = dueTone(task.dueDate ?? undefined, task.status, t.conversations.dueLabel, tf, intlLocale(lang));
            const caseDetail = `${caseRef ? `#${String(caseRef).replace(/^#/, '')}` : ''}${caseRef && caseTitle ? ' — ' : ''}${caseTitle ?? ''}`;
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask?.(task.id)}
                  className="w-full text-start rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {showPriorityPill(task.priority ?? undefined) && (
                        <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400">
                          {enumLabel('taskPriority', String(task.priority)) || String(task.priority).toUpperCase()}
                        </span>
                      )}
                      {task.status && (
                        <span className={cn('text-[9px] font-medium rounded-full px-1.5 py-0.5 ring-1', taskStatusPill(task.status))}>
                          {enumLabel('taskStatus', String(task.status)) || String(task.status).replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-1">{task.title ?? '—'}</p>
                  {due.label && <p className={cn('text-[11px] mt-1', due.cls)}>{due.label}</p>}
                  {task.estimatedHours != null && task.estimatedHours > 0 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {tf(t.conversations.estimatedHoursShort, { hours: task.estimatedHours })}
                    </p>
                  )}
                  {(caseRef || caseTitle) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {tf(t.conversations.linkedCaseLabel, { detail: caseDetail })}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const availabilitySkeleton = (
    <div className="space-y-3">
      <div className="animate-pulse h-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="animate-pulse h-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
    </div>
  );

  const availabilityTabContent = (
    <div className="space-y-4">
      {wsLoading && !workspace ? (
        availabilitySkeleton
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {t.conversations.workload}
              </p>
              <p className={cn('text-[11px] font-bold', levelInfo.cls)}>{levelInfo.label}</p>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full transition-all', workloadBarClass(assignedN))}
                style={{ width: `${workloadFillPct(assignedN)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t.conversations.tasksTab}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {assignedN}
                </p>
                <p className="text-[10px] text-slate-500">{tf(t.conversations.assignedCount, { count: assignedN })}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t.conversations.tasksActive}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {inProgressN}
                </p>
                <p className="text-[10px] text-slate-500">{tf(t.conversations.inProgressCount, { count: inProgressN })}</p>
              </div>
            </div>
            {urgentN > 0 ? (
              <p className="mt-2.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {tf(t.conversations.urgentCount, { count: urgentN })}
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.conversations.upcoming}
            </p>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center dark:border-slate-800">
                <p className="text-[12px] text-slate-500">{t.conversations.noUpcomingEvents}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((ev, idx) => {
                  const iso = ev.date ?? '';
                  return (
                    <li
                      key={`${ev.type}-${idx}`}
                      className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', eventDotClass(ev.type))} aria-hidden />
                        <span className="truncate text-[10px] font-medium uppercase text-slate-500">
                          {ev.label ?? ev.type}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                        {ev.title}
                      </p>
                      {iso ? (
                        <p className={cn('mt-0.5 text-[11px]', eventDateTone(iso))}>
                          {formatDayMonthYear(iso, intlLocale(lang))}
                        </p>
                      ) : null}
                      {ev.caseReference ? (
                        <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {ev.caseReference.startsWith('#') ? ev.caseReference : `#${ev.caseReference}`}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex shrink-0 transition-all duration-200',
        variant === 'overlay' ? 'h-full min-h-0 w-full' : isOpen ? 'w-[320px]' : 'w-10'
      )}
    >
      {variant === 'inline' && !isOpen && !hideToggle ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 self-center rounded-s-md border border-e-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onClick={onToggle}
          aria-label={t.conversations.openContextAria}
        >
          <ChevronRight className="h-4 w-4 text-slate-500 rtl:rotate-180" />
        </Button>
      ) : null}

      <aside
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col border-s border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70',
          variant === 'overlay' && 'border-s-0',
          isOpen || variant === 'overlay' ? 'opacity-100' : 'hidden'
        )}
      >
        {(isOpen || variant === 'overlay') && (
          <>
            <div
              className={cn(
                'flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800',
                variant === 'overlay' && 'pe-12'
              )}
            >
              {showTabs ? (
                <div className="flex min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900/80">
                  {(['contact', 'tasks', 'availability'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMainTab(tab)}
                      className={cn(
                        'min-w-0 flex-1 truncate rounded-md px-1.5 py-1.5 text-[10px] font-semibold tracking-wide transition-colors',
                        mainTab === tab
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {tab === 'contact'
                        ? t.conversations.contact
                        : tab === 'tasks'
                          ? t.conversations.tasksTab
                          : t.conversations.availabilityTab}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.conversations.contextTitle}
                </span>
              )}
              {variant === 'inline' && !hideToggle ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onToggle}
                  aria-label={t.conversations.closeContextAria}
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-180 text-slate-500 rtl:rotate-0" />
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-[13px]">
              {!conversation ? (
                <p className="text-[12px] text-slate-500">{t.conversations.emptyTitle}</p>
              ) : showTabs ? (
                <>
                  {mainTab === 'contact' && contactBlock}
                  {mainTab === 'tasks' && tasksTabContent}
                  {mainTab === 'availability' && availabilityTabContent}
                </>
              ) : (
                contactBlock
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default ContextPanel;
