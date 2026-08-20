'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Mail, Users, Copy, Phone, Pin, FileText, ImageIcon, Play, Shield } from 'lucide-react';
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
import { TaskPriority, TaskStatus, BACKEND_BASE_URL } from '@/utils/constants';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { isAxiosError } from 'axios';
import { getMessageType } from '@/components/chat/SharedMessageCard';
import LinkedMatterCard, { type LinkedMatterTab } from '@/components/chat/LinkedMatterCard';
import { attachmentFileName, attachmentHref, getMemberPerson, isDocumentAttachment, isImageOrVideoAttachment } from '@/components/chat/conversationUtils';
import { useAppTranslation, intlLocale } from '@/i18n';
import { isOnlineUserId, personPresenceId } from '@/lib/presence';
import { useOnlineIds } from '@/hooks/useOnlinePresence';

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
}) => {
  const { t, tf, lang, enumLabel } = useAppTranslation();
  const currentUser = useUserStore?.getState?.()?.user;
  const { toast } = useToast();
  const onlineIds = useOnlineIds();
  const [mainTab, setMainTab] = useState<MainTab>('contact');
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>('active');
  const [workspace, setWorkspace] = useState<API.UserWorkspace | null>(null);
  const [wsLoading, setWsLoading] = useState(false);

  const peer = conversation?.type === 'direct'
    ? conversation.memberships.find((m) =>
        (getMemberPerson(m)?.email ?? '').toLowerCase() !== (currentUser?.email ?? '').toLowerCase()
      )
    : undefined;
  const user = peer ? getMemberPerson(peer) : (conversation as any)?.other_participant;
  const peerImage =
    getPersonImage((conversation as any)?.other_participant) ?? getPersonImage(user as Record<string, unknown>);
  const displayName =
    (conversation as any)?.display_name ||
    (conversation?.type === 'direct'
      ? (conversation as any)?.other_participant?.full_name ||
        `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
        t.conversations.unknownContact
      : conversation?.title);

  const isDirect = conversation?.type === 'direct';
  const showTabs = isDirect && !!peerUserId;

  const pinnedSnippet = (msg: API.Message) => {
    const body = msg.body ?? (msg as { content?: string }).content ?? '';
    const isDeleted = (msg as { is_deleted?: boolean }).is_deleted;
    const mt = getMessageType(msg);
    if (isDeleted) return t.conversations.messageDeletedPreview;
    if (mt === 'SHARED_CASE') return t.conversations.attachmentPreview;
    if (mt === 'SHARED_TASK') return t.conversations.attachmentPreview;
    if (mt === 'SHARED_APPOINTMENT') return t.conversations.attachmentPreview;
    if (body?.trim()) return body.length > 72 ? `${body.slice(0, 72)}…` : body;
    return t.conversations.attachmentPreview;
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

  const pinnedMessagesSection = (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Pin className="h-3 w-3" />
        {t.conversations.pinned}
      </p>
      {panelPinnedMessages.length > 0 ? (
        <ul className="space-y-1.5">
          {panelPinnedMessages.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left text-[12px] text-slate-700 transition-colors line-clamp-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
                onClick={() => onPanelPinnedMessageClick?.(msg.id)}
              >
                {pinnedSnippet(msg)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-slate-500">{t.conversations.noPinned}</p>
      )}
    </div>
  );

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
    <>
      <div className="flex items-center gap-3">
        {conversation?.type === 'direct' && user ? (
          <div className="relative shrink-0">
            <UserAvatar
              image={peerImage}
              firstName={user.first_name}
              lastName={user.last_name}
              size="md"
              className="shrink-0"
            />
            <PresenceDot online={isOnlineUserId(peerUserId ?? personPresenceId(user), onlineIds)} />
          </div>
        ) : conversation?.type === 'group' ? (
          <GroupChatIcon
            iconUrl={(conversation as API.Conversation).icon_url}
            iconPresetEmoji={(conversation as API.Conversation).icon_preset_emoji}
            size="lg"
            className="shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{displayName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate">
            {conversation?.type === 'direct' ? t.conversations.typeDirect : t.conversations.typeGroup}
          </p>
        </div>
      </div>

      {user && (
        <>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              {t.conversations.jobTitle}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              {(user as any).role ? String((user as any).role).replace(/_/g, ' ') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              {t.auth.emailLabel}
            </p>
            <div className="flex items-center gap-1 min-w-0">
              <a
                href={`mailto:${user.email}`}
                className="text-slate-700 dark:text-slate-300 hover:text-primary truncate flex-1 min-w-0 text-[13px]"
              >
                {user.email || '—'}
              </a>
              {user.email && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-slate-500"
                  aria-label={t.auth.emailLabel}
                  onClick={() => copyText(t.auth.emailLabel, user.email)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          {(user as { phone?: string }).phone && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Phone
              </p>
              <p className="text-slate-700 dark:text-slate-300">{(user as { phone?: string }).phone}</p>
            </div>
          )}
        </>
      )}

      {isDirect && conversation && (
        <>
          {pinnedMessagesSection}
          {mediaSection}
          {filesSection}
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
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Users className="h-3 w-3" />
              {t.conversations.participants}
            </p>
            <ul className="space-y-2">
              {(conversation.memberships ?? [])
                .filter((m) => !m.archived)
                .map((m) => {
                  const p = getMemberPerson(m) as API.User | undefined;
                  if (!p) return null;
                  const img = getPersonImage(p as Record<string, unknown>);
                  return (
                    <li key={m.id} className="flex min-w-0 items-center gap-2">
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
                          {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || t.team.drawer.memberTypeActive}
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
    </>
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
        <p className="text-[12px] text-slate-500 dark:text-slate-500 py-2">
          {tf(
            taskSubTab === 'active' ? t.conversations.noActiveTasksFor : t.conversations.noTasksFor,
            { name: displayName?.split(' ')[0] ?? t.conversations.contact }
          )}
        </p>
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
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
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
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.conversations.workload}</p>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
              <div
                className={cn('h-full rounded-full transition-all', workloadBarClass(assignedN))}
                style={{ width: `${workloadFillPct(assignedN)}%` }}
              />
            </div>
            <p className={cn('text-[11px] font-bold mb-2', levelInfo.cls)}>{levelInfo.label}</p>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <p>
                <span className="inline-flex items-center gap-1">📁 {tf(t.conversations.assignedCount, { count: assignedN })}</span>
                <span className="mx-1.5">·</span>
                <span className="inline-flex items-center gap-1">⚡ {tf(t.conversations.inProgressCount, { count: inProgressN })}</span>
              </p>
              {urgentN > 0 && (
                <p className="text-rose-700 dark:text-rose-400 font-medium">🔴 {tf(t.conversations.urgentCount, { count: urgentN })}</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {t.conversations.upcoming}
            </p>
            {upcoming.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-500">{t.conversations.noUpcomingEvents}</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((ev, idx) => {
                  const iso = ev.date ?? '';
                  return (
                    <li
                      key={`${ev.type}-${idx}`}
                      className="rounded-md border border-slate-200/80 dark:border-slate-800 px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', eventDotClass(ev.type))} aria-hidden />
                        <span className="text-[10px] font-medium text-slate-500 uppercase truncate">{ev.label ?? ev.type}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5">{ev.title}</p>
                      {iso && (
                        <p className={cn('text-[11px] mt-0.5', eventDateTone(iso))}>
                          {formatDayMonthYear(iso, intlLocale(lang))}
                        </p>
                      )}
                      {ev.caseReference && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {ev.caseReference.startsWith('#') ? ev.caseReference : `#${ev.caseReference}`}
                        </p>
                      )}
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
          className="h-8 w-8 self-center rounded-l-md border border-r-0 border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onClick={onToggle}
          aria-label={t.conversations.openContextAria}
        >
          <ChevronRight className="h-4 w-4 text-slate-500" />
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
            <div className={cn(
              'flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2.5 dark:border-slate-800',
              variant === 'overlay' && 'pe-12'
            )}>
              {showTabs ? (
                <div className="flex min-w-0 gap-3">
                  {(['contact', 'tasks', 'availability'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMainTab(tab)}
                      className={cn(
                        '-mb-[11px] border-b-2 pb-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                        mainTab === tab
                          ? 'border-[#64499D] font-bold text-slate-900 dark:text-slate-100'
                          : 'border-transparent font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      )}
                    >
                      {tab === 'contact' ? t.conversations.contact : tab === 'tasks' ? t.conversations.tasksTab : t.conversations.availabilityTab}
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
                  <ChevronRight className="h-3.5 w-3.5 rotate-180 text-slate-500" />
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 text-[13px]">
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
