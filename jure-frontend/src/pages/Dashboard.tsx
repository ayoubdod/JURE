import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Users, Briefcase, CheckSquare, Megaphone, Eye, ArrowRight,
  CalendarPlus, FolderPlus, ClipboardList, UserPlus,
  ShieldAlert, BookOpenCheck, Flag, X, Scale, Sparkles, StickyNote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddClientDialog from '../components/client/AddClientDialog';
import useUserStore from '@/stores/userStore';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import { TaskDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { useNavigate } from 'react-router';
import { apiUpdateTask } from '@/services/task/api';
import { TaskStatus } from '@/utils/constants';
import { useShortcuts } from '@/context/ShortcutsContext';
import { HintKbd } from '@/components/shortcuts/Kbd';
import type { ShortcutActionId } from '@/shortcuts/types';
import { hasPermission } from '@/utils/permissions';
import { JURIA_ENABLED } from '@/config/features';

import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import AttentionSection from '@/components/dashboard/overview/AttentionSection';
import KpiOverview from '@/components/dashboard/overview/KpiOverview';
import MyDaySection from '@/components/dashboard/overview/MyDaySection';
import FinanceSnapshot from '@/components/dashboard/overview/FinanceSnapshot';
import PortfolioSection from '@/components/dashboard/overview/PortfolioSection';
import CrmHeuristicsSection from '@/components/dashboard/overview/CrmHeuristicsSection';
import TeamOverdueSection from '@/components/dashboard/overview/TeamOverdueSection';
import ConflictReviewQueue from '@/components/dashboard/overview/ConflictReviewQueue';
import JuriaAssistSection from '@/components/dashboard/overview/JuriaAssistSection';
import EvidenceManagerCard from '@/components/dashboard/EvidenceManagerCard';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceChrome';

import {
  apiDismissAnnouncement,
  apiGetCabinetStats,
  type DashboardAppointmentItem,
  type DashboardAttentionItem,
  type DashboardCaseItem,
  type DashboardDeadlineItem,
  type DashboardOverview,
  type DashboardTaskItem,
} from '@/services/dashboard/api';
import { devError } from '@/utils/devLog';
import { eventBus } from '@/utils/eventBus';
import {
  dismissAnnouncementLocally,
  isAnnouncementDismissed,
} from '@/utils/announcementDismiss';
import { useAuthenticatedObjectUrl } from '@/lib/authenticatedMedia';
import { BACKEND_BASE_URL } from '@/utils/constants';
import { formatDate, formatRelativeTime, useAppTranslation, type Lang } from '@/i18n';
import { AnnouncementLearnMoreLink } from '@/components/dashboard/AnnouncementLearnMoreLink';

function resolveAnnouncementMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = BACKEND_BASE_URL.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

const ANNOUNCEMENT_GLASS =
  'relative min-w-0 w-full overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 ' +
  'bg-gradient-to-br from-[#5B3F96] via-[#64499D] to-[#2F6F73] ' +
  'dark:from-[#4A3480] dark:via-[#3E2D71] dark:to-[#1F4F52] ' +
  'shadow-[0_12px_40px_-12px_rgba(100,73,157,0.55)] ' +
  'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_100%_0%,rgba(78,205,196,0.28),transparent_55%)]';

const ANNOUNCEMENT_TITLE = 'text-[15px] font-semibold tracking-tight text-white';
const ANNOUNCEMENT_BODY = 'mt-1.5 text-[13px] leading-relaxed text-white/80';

const ANNOUNCEMENT_STYLES: Record<
  string,
  { card: string; iconWrap: string; title: string; body: string }
> = {
  INFO: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  PRODUCT_UPDATE: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  FEATURE: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  MAINTENANCE: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/30 bg-amber-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  SUCCESS: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200/30 bg-emerald-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  WARNING: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200/30 bg-amber-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
  IMPORTANT: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200/35 bg-rose-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    title: ANNOUNCEMENT_TITLE,
    body: ANNOUNCEMENT_BODY,
  },
};

const ICONS: Record<string, LucideIcon> = {
  Users,
  Briefcase,
  CheckSquare,
  ClipboardList,
};

type ApiActivity = DashboardOverview['recent_activity'][number];

function caseClientLabel(client: string | null | undefined, noClient: string): string {
  const name = (client ?? '').trim();
  if (!name || name === 'No Client') return noClient;
  return name;
}

function activityLabel(
  a: ApiActivity,
  copy: {
    taskCompleted: string;
    clientAdded: string;
    documentUploaded: string;
    clientFallback: string;
  },
  tf: (template: string, vars: Record<string, string | number>) => string,
): string {
  if (a.kind === 'notification') {
    return (a.title ?? '').trim() || a.message;
  }
  const title = (a.title ?? '').trim() || copy.clientFallback;
  if (a.kind === 'task_completed') return tf(copy.taskCompleted, { title });
  if (a.kind === 'client_added') return tf(copy.clientAdded, { title });
  if (a.kind === 'document_uploaded') return tf(copy.documentUploaded, { title });
  return a.message;
}

function activityWhen(a: ApiActivity, lang: Lang, todayLabel: string): string {
  if (a.at) {
    const formatted = formatRelativeTime(a.at, lang);
    if (formatted) return formatted;
  }
  if (a.ago === 'today') return todayLabel;
  return a.ago;
}

const Dashboard = () => {
  const { t, tf, enumLabel, enumPretty, lang } = useAppTranslation();
  const d = t.dashboard;
  const { runAction } = useShortcuts();
  const [openDialogs, setOpenDialogs] = useState({
    client: false,
    case: false,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [announcementHidden, setAnnouncementHidden] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);

  const { toast } = useToast();
  const { user } = useUserStore();
  const userRole = user?.role;

  const taskUpdateModalRef = useRef<TaskUpdateModalRef>(null);
  const navigate = useNavigate();

  const loadOverview = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setLoadError(false);
      const response = await apiGetCabinetStats();
      setOverview(response.data);
    } catch (err) {
      devError('Dashboard API error:', err);
      setLoadError(true);
      setOverview(null);
      toast({
        title: d.loadErrorTitle,
        description: d.loadErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshOverview = async () => {
    await loadOverview({ silent: true });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await apiGetCabinetStats();
        if (!mounted) return;
        setOverview(response.data);
      } catch (err) {
        if (!mounted) return;
        devError('Dashboard API error:', err);
        setLoadError(true);
        setOverview(null);
        toast({
          title: d.loadErrorTitle,
          description: d.loadErrorDescription,
          variant: 'destructive',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast, d.loadErrorTitle, d.loadErrorDescription]);

  useEffect(() => {
    const onCaseUpdated = () => {
      void loadOverview({ silent: true });
    };
    eventBus.on('case-updated', onCaseUpdated);
    return () => eventBus.off('case-updated', onCaseUpdated);
  }, []);

  const metaRole = overview?.meta?.role;
  const metaScope = overview?.meta?.scope;
  const effectiveRole = metaRole || userRole;

  const roleLabel = useMemo(() => {
    const role = (effectiveRole || '').toUpperCase();
    if (!role) return '';
    const labels = t.team.roles as Record<string, string>;
    return labels[role] || role;
  }, [effectiveRole, t.team.roles]);

  const scopeLabel = metaScope === 'personal' ? d.subtitlePersonal : d.subtitleCabinet;

  const headerSubtitle = useMemo(() => {
    const dateLine = tf(d.todayDate, { date: formatDate(new Date(), lang) });
    if (roleLabel && metaScope) {
      return `${dateLine} · ${tf(d.roleContext, {
        role: roleLabel,
        scope: metaScope === 'personal' ? d.subtitlePersonal : d.subtitleCabinet,
      })}`;
    }
    return `${dateLine} · ${scopeLabel || d.subtitle}`;
  }, [d, lang, metaScope, roleLabel, scopeLabel, tf]);

  const displayAnnouncement = useMemo(() => {
    const ann = overview?.announcement ?? null;
    if (!ann) return null;
    if (announcementHidden || isAnnouncementDismissed(ann.id)) return null;
    return ann;
  }, [overview, announcementHidden]);

  const handleHideAnnouncement = async () => {
    const ann = overview?.announcement;
    if (!ann) return;
    dismissAnnouncementLocally(ann.id);
    setAnnouncementHidden(true);
    try {
      await apiDismissAnnouncement(ann.id);
    } catch (err) {
      devError('Announcement dismiss API error:', err);
    }
  };

  const displayCases: DashboardCaseItem[] = useMemo(
    () => (overview?.recent_cases ?? []).slice(0, 3),
    [overview]
  );

  const displayActivity: ApiActivity[] = useMemo(
    () => overview?.recent_activity ?? [],
    [overview]
  );

  const attentionItems = overview?.attention ?? [];
  const finance = overview?.finance ?? null;

  type QuickAction = {
    title: string;
    icon: typeof UserPlus;
    description: string;
    action: ShortcutActionId;
    keys: string[];
    permission?: API.Permission;
  };

  const quickActions = useMemo(() => {
    const all: QuickAction[] = [
      { title: d.quickActions.addClientTitle, icon: UserPlus, description: d.quickActions.addClientDescription, action: 'create-client', keys: ['C', 'C'], permission: 'clients.create' },
      { title: d.quickActions.createCaseTitle, icon: FolderPlus, description: d.quickActions.createCaseDescription, action: 'create-case', keys: ['C', 'M'], permission: 'cases.create' },
      { title: d.quickActions.scheduleAppointmentTitle, icon: CalendarPlus, description: d.quickActions.scheduleAppointmentDescription, action: 'create-appointment', keys: ['C', 'A'], permission: 'tasks.create' },
      { title: d.quickActions.addTaskTitle, icon: ClipboardList, description: d.quickActions.addTaskDescription, action: 'create-task', keys: ['C', 'T'], permission: 'tasks.create' },
      { title: d.quickActions.conflictCheckTitle, icon: ShieldAlert, description: d.quickActions.conflictCheckDescription, action: 'conflict-check', keys: ['C', 'F'], permission: 'cases.view' },
      { title: d.quickActions.clauseLibraryTitle, icon: BookOpenCheck, description: d.quickActions.clauseLibraryDescription, action: 'clause-library', keys: ['C', 'L'], permission: 'cases.view' },
      { title: d.quickActions.closeMatterTitle, icon: Flag, description: d.quickActions.closeMatterDescription, action: 'close-matter', keys: ['C', 'X'], permission: 'cases.edit' },
    ];
    // Unresolved role: keep actions visible so OWNER is not prematurely stripped.
    if (!effectiveRole) return all;
    return all.filter((qa) => !qa.permission || hasPermission(qa.permission, effectiveRole));
  }, [d.quickActions, effectiveRole]);

  const headerActions = useMemo(
    () =>
      quickActions.filter((qa) =>
        ['create-client', 'create-case', 'create-task', 'create-appointment'].includes(qa.action)
      ),
    [quickActions]
  );

  const showJuria =
    Boolean(overview?.tools?.juria_enabled) || JURIA_ENABLED;
  const showJuriaAssist =
    showJuria &&
    (Boolean(overview?.tools?.juria_briefing) ||
      Boolean(overview?.tools?.juria_ask) ||
      JURIA_ENABLED);

  const toolsActions = useMemo(() => {
    type ToolAction = {
      title: string;
      icon: LucideIcon;
      description: string;
      keys?: string[];
      onClick: () => void;
      id: string;
      permission?: API.Permission;
    };

    const tools: ToolAction[] = [
      {
        id: 'deadline-calculator',
        title: d.tools.deadlineCalculatorTitle,
        icon: Scale,
        description: d.tools.deadlineCalculatorDescription,
        keys: ['C', 'Y'],
        permission: 'cases.view',
        onClick: () => runAction('deadline-calculator'),
      },
      {
        id: 'conflict-check',
        title: d.tools.conflictCheckTitle,
        icon: ShieldAlert,
        description: d.tools.conflictCheckDescription,
        keys: ['C', 'F'],
        permission: 'cases.view',
        onClick: () => runAction('conflict-check'),
      },
      {
        id: 'research-notes',
        title: d.tools.researchNotesTitle,
        icon: StickyNote,
        description: d.tools.researchNotesDescription,
        onClick: () => navigate(overview?.tools?.research_notes_path || '/dashboard/notes'),
      },
    ];

    if (showJuria) {
      tools.unshift({
        id: 'juria',
        title: d.tools.juriaTitle,
        icon: Sparkles,
        description: d.tools.juriaDescription,
        keys: ['G', 'J'],
        onClick: () => navigate(overview?.tools?.juria_path || '/dashboard/juria'),
      });
    }

    if (!effectiveRole) return tools;
    return tools.filter((qa) => !qa.permission || hasPermission(qa.permission, effectiveRole));
  }, [d.tools, effectiveRole, navigate, overview?.tools, runAction, showJuria]);

  const caseStatusLabel = (status: string) =>
    enumLabel('caseStatus', status) || enumPretty(status) || status;

  const caseStatusTone = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'CLOSED' || s === 'ARCHIVED' || s === 'CANCELLED') {
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-400';
    }
    if (s === 'IN_PROGRESS') {
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    }
    if (s === 'PENDING') {
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    }
    return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
  };

  const handleQuickAction = (qa: QuickAction) => {
    runAction(qa.action);
  };

  const handleCloseDialog = (dialogType: keyof typeof openDialogs) => {
    setOpenDialogs((s) => ({ ...s, [dialogType]: false }));
  };

  const handleViewCase = (caseItem: DashboardCaseItem) => {
    if (!caseItem?.id) return;
    void navigateToCaseById(navigate, caseItem.id);
  };

  const handleViewAllCases = () => {
    navigate('/dashboard/cases');
  };

  const canCreateCase = !effectiveRole || hasPermission('cases.create', effectiveRole);

  const handleCreateFirstCase = () => {
    if (!canCreateCase) return;
    runAction('create-case');
  };

  const handleOpenCaseFromTask = (caseId: number) => {
    setDetailTaskId(null);
    void navigateToCaseById(navigate, caseId);
  };

  const handleOpenAttention = (item: DashboardAttentionItem) => {
    const type = item.entity?.type;
    const id = item.entity?.id;
    if (type === 'task' && id != null) {
      setDetailTaskId(Number(id));
      return;
    }
    if (type === 'appointment') {
      navigate('/dashboard/appointments');
      return;
    }
    if (type === 'deadline') {
      navigate(item.href_hint || '/dashboard/calendar');
      return;
    }
    navigate(item.href_hint || '/dashboard/tasks');
  };

  const handleOpenDeadline = (deadline: DashboardDeadlineItem) => {
    if (deadline.case_id) {
      void navigateToCaseById(navigate, deadline.case_id);
      return;
    }
    navigate('/dashboard/calendar');
  };

  const handleOpenAppointment = (_appt: DashboardAppointmentItem) => {
    navigate('/dashboard/appointments');
  };

  const handleCompleteTask = async (task: API.Task) => {
    try {
      const assignedId =
        typeof task.assigned_to === 'object' && task.assigned_to
          ? task.assigned_to.id
          : typeof task.assigned_to === 'number'
            ? task.assigned_to
            : task.assigned_to_details?.id ?? null;
      const clientId =
        typeof task.client === 'object' && task.client
          ? task.client.id
          : typeof task.client === 'number'
            ? task.client
            : null;

      await apiUpdateTask({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: TaskStatus.DONE,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        assigned_to: assignedId,
        assignee_ids:
          Array.isArray(task.assignees) && task.assignees.length
            ? task.assignees.map((u) => u.id).filter(Boolean)
            : Array.isArray(task.assignee_ids) && task.assignee_ids.length
              ? task.assignee_ids
              : assignedId != null
                ? [assignedId]
                : [],
        client: clientId,
      });

      toast({
        title: t.tasks.toasts.completedTitle,
        description: tf(t.tasks.toasts.completedDescription, { title: task.title }),
      });
      await refreshOverview();
      setDetailTaskId(null);
    } catch (error) {
      devError('Failed to mark task as done', error);
      toast({
        title: t.common.error,
        description: t.tasks.toasts.updateFailed,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const announcementMediaUrl = useAuthenticatedObjectUrl(
    resolveAnnouncementMediaUrl(displayAnnouncement?.media_url)
  );

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="space-y-4 px-4 pb-8 pt-2 sm:px-5 lg:px-6">
            <WorkspacePageHeader
              title={tf(d.greeting, { name: user?.first_name ?? '' })}
              subtitle={headerSubtitle}
              actions={
                headerActions.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {headerActions.slice(0, 3).map((qa) => {
                      const Icon = qa.icon;
                      return (
                        <Button
                          key={qa.action}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => handleQuickAction(qa)}
                        >
                          <Icon size={14} className="me-1.5" />
                          <span className="hidden sm:inline">{qa.title}</span>
                          <span className="sm:hidden">{qa.title.split(' ').slice(-1)[0]}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : undefined
              }
            />

            {displayAnnouncement && (() => {
              const style = ANNOUNCEMENT_STYLES[displayAnnouncement.type] ?? ANNOUNCEMENT_STYLES.INFO;
              const mediaUrl = announcementMediaUrl;
              const hasMedia = Boolean(mediaUrl && displayAnnouncement.media_kind);
              const isImage = hasMedia && displayAnnouncement.media_kind === 'IMAGE';
              const isVideo = hasMedia && displayAnnouncement.media_kind === 'VIDEO';
              return (
                <div className={style.card}>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:22px_22px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-2 top-2 z-20 h-8 w-8 rounded-full border border-white/20 bg-black/25 text-white/85 backdrop-blur-md hover:bg-black/40 hover:text-white"
                    onClick={handleHideAnnouncement}
                    aria-label={d.hideAnnouncement}
                    title={d.hideAnnouncement}
                  >
                    <X size={14} />
                  </Button>
                  <div className="relative z-10 flex min-w-0 flex-col sm:flex-row sm:items-stretch">
                    {isImage && mediaUrl ? (
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-[16/9] max-w-full overflow-hidden border-b border-white/15 sm:order-2 sm:aspect-auto sm:w-[min(220px,34%)] sm:shrink-0 sm:border-b-0 sm:border-s"
                        title={displayAnnouncement.title}
                      >
                        <img
                          src={mediaUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3E2D71]/50 to-transparent sm:from-[#3E2D71]/20" />
                      </a>
                    ) : null}
                    {isVideo && mediaUrl ? (
                      <div className="relative aspect-[16/9] max-w-full overflow-hidden border-b border-white/15 bg-black/30 sm:order-2 sm:aspect-auto sm:w-[min(220px,34%)] sm:shrink-0 sm:border-b-0 sm:border-s">
                        <video
                          src={mediaUrl}
                          controls
                          preload="metadata"
                          className="h-full w-full object-cover"
                        >
                          <track kind="captions" />
                        </video>
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1 px-3.5 pb-3.5 pt-3 sm:order-1 sm:px-4 sm:py-4">
                      <div className="flex items-center gap-2.5 pe-8">
                        <div className={style.iconWrap}>
                          <Megaphone size={15} className="text-white" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                          {enumLabel('announcementType', displayAnnouncement.type) || d.announcementKicker}
                        </span>
                      </div>
                      <h3 className={`${style.title} mt-2.5`}>{displayAnnouncement.title}</h3>
                      {displayAnnouncement.message ? (
                        <p className={style.body}>{displayAnnouncement.message}</p>
                      ) : null}
                      <div className="mt-3">
                        <AnnouncementLearnMoreLink
                          url={displayAnnouncement.link_url}
                          label={displayAnnouncement.link_label}
                          fallbackLabel={d.learnMore}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {loadError && !overview ? (
              <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center dark:border-rose-800/60 dark:bg-rose-950/30">
                <p className="text-sm text-rose-700 dark:text-rose-300">{d.loadErrorDescription}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => void loadOverview()}
                >
                  {t.common.retry}
                </Button>
              </div>
            ) : null}

            <AttentionSection
              items={attentionItems}
              loading={loading && !overview}
              onOpenItem={handleOpenAttention}
            />

            <KpiOverview kpis={overview?.kpis} loading={loading && !overview} />

            <MyDaySection
              myDay={overview?.my_day}
              loading={loading && !overview}
              onOpenTask={(task: DashboardTaskItem) => setDetailTaskId(task.id)}
              onOpenAppointment={handleOpenAppointment}
              onOpenDeadline={handleOpenDeadline}
              onViewCalendar={() => navigate('/dashboard/calendar')}
            />

            <PortfolioSection
              portfolio={overview?.portfolio}
              loading={loading && !overview}
            />

            <CrmHeuristicsSection
              crm={overview?.crm}
              loading={loading && !overview}
            />

            <TeamOverdueSection
              team={overview?.team}
              loading={loading && !overview}
            />

            <ConflictReviewQueue
              items={overview?.conflict_review_queue}
              loading={loading && !overview}
            />

            <JuriaAssistSection enabled={showJuriaAssist} />

            {finance ? (
              <FinanceSnapshot
                finance={finance}
                onOpenFinance={() => navigate('/dashboard/finance')}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <DashboardCollapsibleCard
                className="min-w-0 lg:col-span-2"
                title={d.recentCases.title}
                description={d.recentCases.description}
                headerRight={
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={handleViewAllCases}>
                    <Eye size={12} className="me-1.5" />
                    {t.common.viewAll}
                  </Button>
                }
              >
                <div className="space-y-2.5">
                  {loading && !overview ? (
                    <div className="space-y-2.5" aria-busy="true" aria-label={d.recentCases.loading}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-[52px] animate-pulse rounded-xl border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
                        />
                      ))}
                    </div>
                  ) : loadError ? (
                    <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center dark:border-rose-800/60 dark:bg-rose-950/30">
                      <p className="text-sm text-rose-700 dark:text-rose-300">{d.recentCases.loadError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-lg"
                        onClick={() => void loadOverview()}
                      >
                        {t.common.retry}
                      </Button>
                    </div>
                  ) : displayCases.length > 0 ? (
                    displayCases.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleViewCase(c)}
                        className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                        aria-label={tf(d.recentCases.openAria, { title: c.title })}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</h4>
                          <p className="truncate text-xs text-muted-foreground">
                            {caseClientLabel(c.client, d.recentCases.noClient)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={[
                              'rounded-full px-2 py-1 text-[10px] font-medium',
                              caseStatusTone(c.status),
                            ].join(' ')}
                          >
                            {caseStatusLabel(c.status)}
                          </span>
                          <span className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground" aria-hidden>
                            <ArrowRight size={14} className="rtl:rotate-180" />
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{d.recentCases.empty}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{d.recentCases.emptyHint}</p>
                      {canCreateCase ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 rounded-lg"
                          onClick={handleCreateFirstCase}
                        >
                          <FolderPlus size={12} className="me-1.5" />
                          {d.recentCases.createCta}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </DashboardCollapsibleCard>

              <DashboardCollapsibleCard
                className="min-w-0"
                title={d.recentActivity.title}
                description={d.recentActivity.description}
              >
                <div className="space-y-3">
                  {loading && !overview ? (
                    <div className="space-y-3" aria-busy="true" aria-label={d.recentActivity.loading}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-48 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                            <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : loadError ? (
                    <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center dark:border-rose-800/60 dark:bg-rose-950/30">
                      <p className="text-sm text-rose-700 dark:text-rose-300">{d.recentActivity.loadError}</p>
                    </div>
                  ) : displayActivity.length > 0 ? (
                    displayActivity.map((a, idx) => {
                      const AIcon = ICONS[a.icon] ?? ClipboardList;
                      const iconClass =
                        a.icon === 'CheckSquare'
                          ? 'text-emerald-600'
                          : a.icon === 'Users'
                            ? 'text-slate-500'
                            : 'text-[#64499D]';
                      const body = (
                        <>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
                            <AIcon className={`h-4 w-4 ${iconClass}`} aria-hidden />
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-slate-900 dark:text-white">
                              {activityLabel(a, d.recentActivity, tf)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activityWhen(a, lang, d.recentActivity.today)}
                            </p>
                          </div>
                        </>
                      );
                      if (a.kind === 'notification' && a.action_url) {
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => navigate(a.action_url!)}
                            className="flex w-full items-start gap-3 rounded-lg text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:hover:bg-slate-900/50"
                          >
                            {body}
                          </button>
                        );
                      }
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          {body}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">{d.recentActivity.empty}</p>
                  )}
                </div>
              </DashboardCollapsibleCard>
            </div>

            {quickActions.length > 0 ? (
              <DashboardCollapsibleCard
                title={d.quickActions.title}
                description={d.quickActions.description}
              >
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map((qa, i) => {
                    const Icon = qa.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleQuickAction(qa)}
                        className="group min-w-0 w-full rounded-lg border border-slate-200/90 bg-white p-2.5 text-start transition-colors hover:border-[#64499D]/40 hover:bg-[#64499D]/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#8B6FD1]/40 dark:hover:bg-[#3E2D71]/30"
                        aria-label={qa.title}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
                            <Icon className="h-4 w-4 text-slate-500" aria-hidden />
                          </span>
                          <span className="min-w-0 truncate text-xs font-medium text-slate-900 dark:text-white">
                            {qa.title}
                          </span>
                          <HintKbd keys={qa.keys} className="ms-auto hidden shrink-0 opacity-70 group-hover:opacity-100 lg:inline-flex" />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{qa.description}</p>
                      </button>
                    );
                  })}
                </div>
              </DashboardCollapsibleCard>
            ) : null}

            {toolsActions.length > 0 ? (
              <DashboardCollapsibleCard
                title={d.tools.title}
                description={d.tools.description}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {toolsActions.map((qa) => {
                    const Icon = qa.icon;
                    return (
                      <button
                        key={qa.id}
                        type="button"
                        onClick={qa.onClick}
                        className="group min-w-0 w-full rounded-lg border border-slate-200/90 bg-white p-2.5 text-start transition-colors hover:border-[#64499D]/40 hover:bg-[#64499D]/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#8B6FD1]/40 dark:hover:bg-[#3E2D71]/30"
                        aria-label={qa.title}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
                            <Icon className="h-4 w-4 text-slate-500" aria-hidden />
                          </span>
                          <span className="min-w-0 truncate text-xs font-medium text-slate-900 dark:text-white">
                            {qa.title}
                          </span>
                          {qa.keys ? (
                            <HintKbd keys={qa.keys} className="ms-auto hidden shrink-0 opacity-70 group-hover:opacity-100 lg:inline-flex" />
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{qa.description}</p>
                      </button>
                    );
                  })}
                </div>
              </DashboardCollapsibleCard>
            ) : null}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ResearchNotebookCard />
              <EvidenceManagerCard />
            </div>
          </div>
        </div>
      </div>

      <AddClientDialog
        open={openDialogs.client}
        onOpenChange={() => handleCloseDialog('client')}
      />
      <TaskUpdateModal ref={taskUpdateModalRef} onSuccess={refreshOverview} />
      <TaskDetailPanel
        taskId={detailTaskId}
        open={detailTaskId != null}
        onOpenChange={(v) => {
          if (!v) setDetailTaskId(null);
        }}
        onEdit={(task) => taskUpdateModalRef.current?.show(task)}
        portalContainer={null}
        onOpenCase={handleOpenCaseFromTask}
        onComplete={handleCompleteTask}
      />
    </>
  );
};

export default Dashboard;
