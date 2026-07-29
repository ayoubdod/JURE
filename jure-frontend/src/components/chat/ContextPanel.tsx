'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Mail, Users, Copy, Phone, Link2, Pin, ExternalLink, Shield } from 'lucide-react';
import GroupChatIcon from '@/components/chat/GroupChatIcon';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
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
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { isAxiosError } from 'axios';
import { getMessageType } from '@/components/chat/SharedMessageCard';

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
  /** Pinned messages for this conversation (direct + group; synced from chat) */
  panelPinnedMessages?: API.Message[];
  onPanelPinnedMessageClick?: (messageId: number) => void;
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

function formatDayMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dueTone(
  dueIso: string | null | undefined,
  status?: string
): { cls: string; label: string } {
  if (!dueIso) return { cls: 'text-slate-500 dark:text-slate-400', label: '' };
  const days = getCountdownDays(dueIso);
  const overdue = days != null && days < 0 && status !== TaskStatus.DONE;
  if (overdue) return { cls: 'text-red-700 dark:text-red-400 font-semibold', label: 'Due: ' + formatDayMonthYear(dueIso) };
  if (days == null) return { cls: 'text-slate-500 dark:text-slate-400', label: 'Due: ' + formatDayMonthYear(dueIso) };
  const style = getCountdownStyle(days);
  const base =
    style === 'critical'
      ? 'text-red-700 dark:text-red-400 font-semibold'
      : style === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  return { cls: base, label: 'Due: ' + formatDayMonthYear(dueIso) };
}

function workloadBarClass(total: number): string {
  if (total <= 3) return 'bg-emerald-500';
  if (total <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function workloadFillPct(total: number): number {
  return Math.min(100, (total / 10) * 100);
}

function workloadLevelBadge(level?: string, assigned?: number): { label: string; cls: string } {
  const L = String(level || '').toUpperCase();
  if (L === 'LOW') return { label: 'LOW', cls: 'text-emerald-700 dark:text-emerald-400' };
  if (L === 'MEDIUM') return { label: 'MEDIUM', cls: 'text-amber-700 dark:text-amber-400' };
  if (L === 'HIGH') return { label: 'HIGH', cls: 'text-red-700 dark:text-red-400' };
  const a = assigned ?? 0;
  if (a <= 3) return { label: 'LOW', cls: 'text-emerald-700 dark:text-emerald-400' };
  if (a <= 6) return { label: 'MEDIUM', cls: 'text-amber-700 dark:text-amber-400' };
  return { label: 'HIGH', cls: 'text-red-700 dark:text-red-400' };
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
}) => {
  const currentUser = useUserStore?.getState?.()?.user;
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>('contact');
  const [taskSubTab, setTaskSubTab] = useState<TaskSubTab>('active');
  const [workspace, setWorkspace] = useState<API.UserWorkspace | null>(null);
  const [wsLoading, setWsLoading] = useState(false);

  const getMemberPerson = (m: API.ConversationMembership) =>
    (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;
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
        'Unknown'
      : conversation?.title);

  const isDirect = conversation?.type === 'direct';
  const showTabs = isDirect && !!peerUserId;
  const [unlinkCaseConfirm, setUnlinkCaseConfirm] = useState(false);

  const pinnedSnippet = (msg: API.Message) => {
    const body = msg.body ?? (msg as { content?: string }).content ?? '';
    const isDeleted = (msg as { is_deleted?: boolean }).is_deleted;
    const mt = getMessageType(msg);
    if (isDeleted) return '[Message deleted]';
    if (mt === 'SHARED_CASE') return '[Shared case]';
    if (mt === 'SHARED_TASK') return '[Shared task]';
    if (mt === 'SHARED_APPOINTMENT') return '[Shared appointment]';
    if (body?.trim()) return body.length > 72 ? `${body.slice(0, 72)}…` : body;
    return '[Attachment]';
  };

  const linkedCaseDotClass = (lc: API.LinkedCaseSummary) => {
    const t = lc.caseType ?? lc.case_type ?? '';
    if (t === 'LITIGATION') return 'bg-rose-500';
    if (t === 'CONSULTATION') return 'bg-indigo-500';
    if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'bg-amber-400';
    return 'bg-slate-400';
  };

  const parseLinkedCaseId = (lc: API.LinkedCaseSummary): number | null => {
    const n = typeof lc.id === 'number' ? lc.id : parseInt(String(lc.id), 10);
    return Number.isFinite(n) ? n : null;
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
              toast({ title: 'Workspace unavailable', description: 'User not found or not in your cabinet.', variant: 'destructive' });
            } else if (st === 403) {
              toast({ title: 'Access denied', variant: 'destructive' });
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
    setUnlinkCaseConfirm(false);
  }, [conversation?.id]);

  const copyText = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const tasks = workspace?.tasks ?? [];
  const filteredTasks =
    taskSubTab === 'active' ? tasks.filter((t) => t.status !== TaskStatus.DONE) : tasks;

  const availability = workspace?.availability;
  const assignedN = availability?.totalAssigned ?? 0;
  const inProgressN = availability?.inProgress ?? 0;
  const urgentN = availability?.urgent ?? 0;
  const levelInfo = workloadLevelBadge(availability?.workloadLevel, assignedN);

  const upcoming = availability?.upcomingEvents ?? [];

  const pinnedMessagesSection = (
    <div>
      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Pin className="w-3 h-3" />
        Pinned messages
      </p>
      {panelPinnedMessages.length > 0 ? (
        <ul className="space-y-1.5">
          {panelPinnedMessages.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                className="w-full text-left rounded-md border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors line-clamp-3"
                onClick={() => onPanelPinnedMessageClick?.(msg.id)}
              >
                {pinnedSnippet(msg)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-slate-500 dark:text-slate-500">No pinned messages</p>
      )}
    </div>
  );

  const contactBlock = (
    <>
      <div className="flex items-center gap-3">
        {conversation?.type === 'direct' && user ? (
          <UserAvatar
            image={peerImage}
            firstName={user.first_name}
            lastName={user.last_name}
            size="md"
            className="shrink-0"
          />
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
            {conversation?.type === 'direct' ? 'Direct chat' : 'Group chat'}
          </p>
        </div>
      </div>

      {user && (
        <>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Job title
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              {(user as any).role ? String((user as any).role).replace(/_/g, ' ') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              Email
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
                  aria-label="Copy email"
                  onClick={() => copyText('Email', user.email)}
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

      {isDirect && conversation && pinnedMessagesSection}

      {!isDirect && conversation && (
        <>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" />
              Linked matter
            </p>
            {linkedCaseSummary ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/50 p-2.5 space-y-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={cn('h-2 w-2 shrink-0 rounded-full mt-1.5', linkedCaseDotClass(linkedCaseSummary))}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {linkedCaseSummary.reference
                        ? linkedCaseSummary.reference.startsWith('#')
                          ? linkedCaseSummary.reference
                          : `#${linkedCaseSummary.reference}`
                        : `#${linkedCaseSummary.id}`}
                    </p>
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 line-clamp-3 mt-0.5">
                      {linkedCaseSummary.title ?? '—'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {linkedCaseSummary.status && (
                        <span className="text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">
                          {String(linkedCaseSummary.status).replace(/_/g, ' ')}
                        </span>
                      )}
                      {(linkedCaseSummary.caseType || linkedCaseSummary.case_type) && (
                        <span className="text-[9px] font-medium rounded-full px-1.5 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">
                          {String(linkedCaseSummary.caseType ?? linkedCaseSummary.case_type ?? '').replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parseLinkedCaseId(linkedCaseSummary) != null && onOpenLinkedCase && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => onOpenLinkedCase(parseLinkedCaseId(linkedCaseSummary)!)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open case
                    </Button>
                  )}
                  {canManageGroupCase && onOpenLinkCaseModal && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => onOpenLinkCaseModal()}
                    >
                      Change
                    </Button>
                  )}
                  {canManageGroupCase && onUnlinkConversationCase && (
                    unlinkCaseConfirm ? (
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500">Remove?</span>
                        <button
                          type="button"
                          className="font-medium text-red-600 hover:underline"
                          onClick={() => {
                            void onUnlinkConversationCase();
                            setUnlinkCaseConfirm(false);
                          }}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className="text-slate-500 hover:underline"
                          onClick={() => setUnlinkCaseConfirm(false)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-red-600 hover:text-red-700 dark:hover:text-red-400"
                        onClick={() => setUnlinkCaseConfirm(true)}
                      >
                        Remove link
                      </Button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-3 text-center">
                <p className="text-[12px] text-slate-500 dark:text-slate-500 mb-2">No case linked to this chat</p>
                {canManageGroupCase && onOpenLinkCaseModal && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] gap-1"
                    onClick={() => onOpenLinkCaseModal()}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link case
                  </Button>
                )}
              </div>
            )}
          </div>

          {pinnedMessagesSection}

          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Members
            </p>
            <ul className="space-y-2">
              {(conversation.memberships ?? [])
                .filter((m) => !m.archived)
                .map((m) => {
                  const p = getMemberPerson(m) as API.User | undefined;
                  if (!p) return null;
                  const img = getPersonImage(p as Record<string, unknown>);
                  return (
                    <li key={m.id} className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        firstName={p.first_name}
                        lastName={p.last_name}
                        image={img}
                        size="sm"
                        className="h-8 w-8 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">
                          {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || 'Member'}
                        </p>
                        {p.email ? (
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">{p.email}</p>
                        ) : null}
                      </div>
                      {m.is_admin ? (
                        <span className="text-[9px] font-semibold uppercase text-amber-800 dark:text-amber-400 shrink-0 inline-flex items-center gap-0.5">
                          <Shield className="h-3 w-3" />
                          Admin
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
          <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">Tasks</span>
          <span className="text-[10px] font-medium rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 tabular-nums text-slate-700 dark:text-slate-300">
            {filteredTasks.length}
          </span>
        </div>
      </div>
      <div className="flex rounded-md border border-slate-200 dark:border-slate-800 p-0.5">
        {(['active', 'all'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTaskSubTab(t)}
            className={cn(
              'flex-1 text-[11px] font-medium py-1 rounded',
              taskSubTab === t
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t === 'active' ? 'Active' : 'All'}
          </button>
        ))}
      </div>
      {wsLoading && !workspace ? (
        tasksSkeleton
      ) : filteredTasks.length === 0 ? (
        <p className="text-[12px] text-slate-500 dark:text-slate-500 py-2">
          No {taskSubTab === 'active' ? 'active ' : ''}tasks for {displayName?.split(' ')[0] ?? 'this contact'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredTasks.map((t) => {
            const caseRef = t.relatedCase?.reference;
            const caseTitle = t.relatedCase?.title;
            const due = dueTone(t.dueDate ?? undefined, t.status);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask?.(t.id)}
                  className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {showPriorityPill(t.priority ?? undefined) && (
                        <span className="text-[9px] font-semibold rounded-full px-1.5 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-400">
                          {String(t.priority).toUpperCase()}
                        </span>
                      )}
                      {t.status && (
                        <span className={cn('text-[9px] font-medium rounded-full px-1.5 py-0.5 ring-1', taskStatusPill(t.status))}>
                          {String(t.status).replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-1">{t.title ?? '—'}</p>
                  {due.label && <p className={cn('text-[11px] mt-1', due.cls)}>{due.label}</p>}
                  {t.estimatedHours != null && t.estimatedHours > 0 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Est. {t.estimatedHours}h</p>
                  )}
                  {(caseRef || caseTitle) && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      Case: {caseRef ? `#${String(caseRef).replace(/^#/, '')}` : ''}
                      {caseRef && caseTitle ? ' — ' : ''}
                      {caseTitle}
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
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2">Workload</p>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-2">
              <div
                className={cn('h-full rounded-full transition-all', workloadBarClass(assignedN))}
                style={{ width: `${workloadFillPct(assignedN)}%` }}
              />
            </div>
            <p className={cn('text-[11px] font-bold mb-2', levelInfo.cls)}>{levelInfo.label}</p>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <p>
                <span className="inline-flex items-center gap-1">📁 {assignedN} assigned</span>
                <span className="mx-1.5">·</span>
                <span className="inline-flex items-center gap-1">⚡ {inProgressN} in progress</span>
              </p>
              {urgentN > 0 && (
                <p className="text-rose-700 dark:text-rose-400 font-medium">🔴 {urgentN} urgent</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Upcoming
            </p>
            {upcoming.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-500">No upcoming events</p>
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
                          {formatDayMonthYear(iso)}
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
    <div className={cn('shrink-0 flex transition-all duration-200', isOpen ? 'w-[250px]' : 'w-10')}>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-l-md border border-r-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm self-center"
          onClick={onToggle}
          aria-label="Show context panel"
        >
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </Button>
      )}

      <aside
        className={cn(
          'flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex-1 min-w-0',
          isOpen ? 'opacity-100' : 'hidden'
        )}
      >
        {isOpen && (
          <>
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
              {showTabs ? (
                <div className="flex gap-3 min-w-0">
                  {(['contact', 'tasks', 'availability'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMainTab(t)}
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider pb-0.5 border-b-2 -mb-[9px] transition-colors',
                        mainTab === t
                          ? 'border-primary text-slate-900 dark:text-slate-100 font-bold'
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                      )}
                    >
                      {t === 'contact' ? 'Contact' : t === 'tasks' ? 'Tasks' : 'Availability'}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {conversation?.type === 'group' ? 'Group' : 'Contact'}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onToggle}
                aria-label="Hide context panel"
              >
                <ChevronRight className="h-3.5 w-3.5 rotate-180 text-slate-500" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[13px]">
              {!conversation ? (
                <p className="text-slate-500 dark:text-slate-500 text-[12px]">Select a conversation to view contact details</p>
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
