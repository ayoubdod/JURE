import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Briefcase, CheckSquare, Megaphone, Eye, ArrowRight,
  CalendarPlus, FolderPlus, ClipboardList, UserPlus, Clock,
  ShieldAlert, BookOpenCheck, Flag, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddClientDialog from '../components/AddClientDialog';
import useUserStore from '@/stores/userStore';
import CaseDetailDrawer, { CaseDetailDrawerRef } from '@/components/case/CaseDetailDrawer';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import { TaskDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import { useNavigate } from 'react-router';
import { apiUpdateTask } from '@/services/task/api';
import { TaskStatus } from '@/utils/constants';
import { useShortcuts } from '@/context/ShortcutsContext';
import { HintKbd } from '@/components/shortcuts/Kbd';
import type { ShortcutActionId } from '@/shortcuts/types';

// NEW imports (your existing dashboard tools)
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import MatterTimeline from '@/components/dashboard/MatterTimeline';
import EngagementBudgetCard from '@/components/dashboard/EngagementBudgetCard';
import EvidenceManagerCard from '@/components/dashboard/EvidenceManagerCard';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import { useMatterStore } from '@/stores/matterStore';

// Service to fetch backend overview
import {
  apiDismissAnnouncement,
  apiGetCabinetStats,
  type DashboardAnnouncement,
  type DashboardOverview,
} from '@/services/dashboard/api';
import { devError } from '@/utils/devLog';
import { eventBus } from '@/utils/eventBus';
import {
  dismissAnnouncementLocally,
  isAnnouncementDismissed,
} from '@/utils/announcementDismiss';
import { BACKEND_BASE_URL } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';

function resolveAnnouncementMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = BACKEND_BASE_URL.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}
const ANNOUNCEMENT_GLASS =
  'relative overflow-hidden rounded-2xl border border-white/25 dark:border-white/15 ' +
  'bg-gradient-to-br from-[#7B5CB8]/80 via-[#64499D]/70 to-[#4ECDC4]/40 ' +
  'dark:from-[#7B5CB8]/60 dark:via-[#64499D]/55 dark:to-[#4ECDC4]/30 ' +
  'backdrop-blur-xl shadow-[0_8px_32px_rgba(100,73,157,0.28)] ' +
  'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br ' +
  'before:from-white/30 before:via-white/5 before:to-transparent';

const ANNOUNCEMENT_STYLES: Record<
  DashboardAnnouncement['type'],
  { card: string; iconWrap: string; title: string; body: string }
> = {
  INFO: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'w-8 h-8 rounded-lg bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-white drop-shadow-sm',
    body: 'text-sm text-white/85 leading-relaxed mt-1',
  },
  SUCCESS: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'w-8 h-8 rounded-lg bg-emerald-400/25 border border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-white drop-shadow-sm',
    body: 'text-sm text-white/85 leading-relaxed mt-1',
  },
  WARNING: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'w-8 h-8 rounded-lg bg-amber-400/25 border border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-white drop-shadow-sm',
    body: 'text-sm text-white/85 leading-relaxed mt-1',
  },
  IMPORTANT: {
    card: ANNOUNCEMENT_GLASS,
    iconWrap:
      'w-8 h-8 rounded-lg bg-rose-400/30 border border-white/30 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-white drop-shadow-sm',
    body: 'text-sm text-white/85 leading-relaxed mt-1',
  },
};

// Map API icon strings → lucide components
const ICONS: Record<string, React.ComponentType<any>> = {
  Users,
  Briefcase,
  CheckSquare,
  ClipboardList,
  // add more if backend returns other names
};

type ApiCase = DashboardOverview['recent_cases'][number];
type ApiTask = DashboardOverview['today_tasks'][number];
type ApiActivity = DashboardOverview['recent_activity'][number];

const Dashboard = () => {
  const { t, tf, enumLabel } = useAppTranslation();
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
  const matters = useMatterStore((s) => s.matters);
  const demoMatterId = matters[0]?.id;

  // --- FALLBACKS (used only when API fails — never invent KPI %) ---
  const fallbackStats = [
    { title: d.stats.totalClients, value: '—', change: null as string | null, changeState: 'unavailable' as const, icon: Users, iconBg: 'bg-blue-500', changeTone: 'text-muted-foreground' },
    { title: d.stats.activeCases, value: '—', change: null as string | null, changeState: 'unavailable' as const, icon: Briefcase, iconBg: 'bg-emerald-500', changeTone: 'text-muted-foreground' },
    { title: d.stats.tasksDue, value: '—', change: null as string | null, changeState: 'unavailable' as const, icon: CheckSquare, iconBg: 'bg-amber-500', changeTone: 'text-muted-foreground' },
  ];

  const caseDetailDrawerRef = useRef<CaseDetailDrawerRef>(null);
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

  // Fetch backend overview on mount
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
    return () => { mounted = false; };
  }, [toast, d.loadErrorTitle, d.loadErrorDescription]);

  // Refresh KPIs / recent cases when a matter is closed (or otherwise updated)
  useEffect(() => {
    const onCaseUpdated = () => {
      void loadOverview({ silent: true });
    };
    eventBus.on('case-updated', onCaseUpdated);
    return () => eventBus.off('case-updated', onCaseUpdated);
  }, []);
  // Build display stats: prefer API, fallback to local (never invent %)
  const displayStats = useMemo(() => {
    if (!overview?.stats?.length) {
      return fallbackStats.map(s => ({
        title: s.title,
        value: s.value,
        change: s.change,
        changeState: s.changeState,
        Icon: s.icon,
        iconBg: s.iconBg,
        changeTone: s.changeTone,
      }));
    }
    return overview.stats.map(s => {
      const Icon = ICONS[s.icon] ?? CheckSquare;
      const changeState = s.change_state ?? (
        s.change == null ? 'no_previous_data'
          : s.change.trim().startsWith('-') ? 'down'
            : s.change.trim().startsWith('0') ? 'flat'
              : 'up'
      );
      const changeTone =
        changeState === 'down' ? 'text-rose-600 dark:text-rose-400'
          : changeState === 'up' ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground';
      const iconBg = s.icon === 'Users' ? 'bg-blue-500' : s.icon === 'Briefcase' ? 'bg-emerald-500' : 'bg-amber-500';
      const localizedTitle =
        s.icon === 'Users'
          ? d.stats.totalClients
          : s.icon === 'Briefcase'
            ? d.stats.activeCases
            : s.icon === 'CheckSquare' || s.icon === 'ClipboardList'
              ? d.stats.tasksDue
              : s.title;
      return {
        title: localizedTitle,
        value: s.value,
        change: s.change,
        changeState,
        Icon,
        iconBg,
        changeTone,
      };
    });
  }, [overview, d.stats.totalClients, d.stats.activeCases, d.stats.tasksDue]);

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
      // Local session hide already applied; backend dismiss is best-effort.
      devError('Announcement dismiss API error:', err);
    }
  };

  /** Real API cases only — never invent demo matters when empty or on load failure. */
  const displayCases: ApiCase[] = useMemo(
    () => (overview?.recent_cases ?? []).slice(0, 3),
    [overview]
  );

  /** Real API tasks only — never invent demo tasks when empty or on load failure. */
  const displayTasks: ApiTask[] = useMemo(
    () => (overview?.today_tasks ?? []).slice(0, 6),
    [overview]
  );

  /** Real API activity only — never invent demo Johnson / Tech Corp lines. */
  const displayActivity: ApiActivity[] = useMemo(
    () => overview?.recent_activity ?? [],
    [overview]
  );

  const quickActions: {
    title: string;
    icon: typeof UserPlus;
    description: string;
    action: ShortcutActionId;
    keys: string[];
  }[] = [
    { title: d.quickActions.addClientTitle, icon: UserPlus, description: d.quickActions.addClientDescription, action: 'create-client', keys: ['C', 'C'] },
    { title: d.quickActions.createCaseTitle, icon: FolderPlus, description: d.quickActions.createCaseDescription, action: 'create-case', keys: ['C', 'M'] },
    { title: d.quickActions.scheduleAppointmentTitle, icon: CalendarPlus, description: d.quickActions.scheduleAppointmentDescription, action: 'create-appointment', keys: ['C', 'A'] },
    { title: d.quickActions.addTaskTitle, icon: ClipboardList, description: d.quickActions.addTaskDescription, action: 'create-task', keys: ['C', 'T'] },
    { title: d.quickActions.conflictCheckTitle, icon: ShieldAlert, description: d.quickActions.conflictCheckDescription, action: 'conflict-check', keys: ['C', 'F'] },
    { title: d.quickActions.clauseLibraryTitle, icon: BookOpenCheck, description: d.quickActions.clauseLibraryDescription, action: 'clause-library', keys: ['C', 'L'] },
    { title: d.quickActions.closeMatterTitle, icon: Flag, description: d.quickActions.closeMatterDescription, action: 'close-matter', keys: ['C', 'X'] },
  ];

  const priorityLabel = (priority: string) => {
    const key = priority.toLowerCase();
    if (key === 'critical') return d.priorityCritical;
    return enumLabel('taskPriority', key) || priority;
  };

  const handleQuickAction = (qa: typeof quickActions[number]) => {
    runAction(qa.action);
  };

  const handleCloseDialog = (dialogType: keyof typeof openDialogs) => {
    setOpenDialogs((s) => ({ ...s, [dialogType]: false }));
  };

  const handleViewCase = (caseItem: ApiCase) => {
    if (!caseItem?.id) return;
    caseDetailDrawerRef.current?.open({ id: caseItem.id } as API.Case);
  };

  const handleViewAllCases = () => {
    navigate('/dashboard/cases');
  };

  const handleCreateFirstCase = () => {
    runAction('create-case');
  };

  const handleViewTask = (taskItem: ApiTask) => {
    if (!taskItem?.id) return;
    setDetailTaskId(taskItem.id);
  };

  const handleViewAllTasks = () => {
    navigate('/dashboard/calendar');
  };

  const handleCreateFirstTask = () => {
    runAction('create-task');
  };

  const handleOpenCaseFromTask = (caseId: number) => {
    setDetailTaskId(null);
    caseDetailDrawerRef.current?.open({ id: caseId } as API.Case);
  };

  const handleCompleteTask = async (task: API.Task) => {
    try {
      const assignedId =
        typeof task.assigned_to === 'object' && task.assigned_to
          ? task.assigned_to.id
          : (task.assigned_to as unknown as number | null) ?? task.assigned_to_details?.id ?? null;
      const clientId =
        typeof task.client === 'object' && task.client
          ? task.client.id
          : (task.client as unknown as number | null) ?? null;

      await apiUpdateTask({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: TaskStatus.DONE,
        due_date: task.due_date,
        estimated_hours: task.estimated_hours,
        assigned_to: assignedId,
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

  const taskPriorityKey = (priority: string) => priority.trim().toLowerCase();

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {tf(d.greeting, { name: user?.first_name ?? '' })}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {d.subtitle}
            </p>
          </div>
        </div>

        {/* Announcement — only when backend returns an active, targeted one */}
        {displayAnnouncement && (() => {
          const style = ANNOUNCEMENT_STYLES[displayAnnouncement.type] ?? ANNOUNCEMENT_STYLES.INFO;
          const mediaUrl = resolveAnnouncementMediaUrl(displayAnnouncement.media_url);
          const hasMedia = Boolean(mediaUrl && displayAnnouncement.media_kind);
          return (
            <div className={style.card}>
              <div className="relative z-10 p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className={style.iconWrap}>
                    <Megaphone size={16} className="text-white" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className={style.title}>
                        {displayAnnouncement.title}
                      </h3>
                      {displayAnnouncement.message ? (
                        <p className={style.body}>
                          {displayAnnouncement.message}
                        </p>
                      ) : null}
                    </div>
                    {hasMedia && mediaUrl && displayAnnouncement.media_kind === 'IMAGE' && (
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 overflow-hidden rounded-md border border-white/25 bg-white/15 backdrop-blur-sm shadow-sm"
                        title={displayAnnouncement.title}
                      >
                        <img
                          src={mediaUrl}
                          alt=""
                          className="h-24 w-40 object-cover sm:h-28 sm:w-48"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {hasMedia && mediaUrl && displayAnnouncement.media_kind === 'VIDEO' && (
                      <div className="shrink-0 overflow-hidden rounded-md border border-white/25 bg-black/20 backdrop-blur-sm">
                        <video
                          src={mediaUrl}
                          controls
                          preload="metadata"
                          className="h-24 w-44 object-cover sm:h-28 sm:w-52"
                        >
                          <track kind="captions" />
                        </video>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 text-white/70 hover:text-white hover:bg-white/15"
                    onClick={handleHideAnnouncement}
                    aria-label={d.hideAnnouncement}
                    title={d.hideAnnouncement}
                  >
                    <X size={15} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {displayStats.map(({ title, value, change, changeState, Icon, iconBg, changeTone }, i) => {
            let changeLabel = '';
            if (!loading) {
              if (changeState === 'unavailable') {
                changeLabel = d.kpiUnavailable;
              } else if (changeState === 'no_previous_data' || change == null) {
                changeLabel = d.noPreviousData;
              } else {
                const arrow = changeState === 'down' ? '↓ ' : changeState === 'up' ? '↑ ' : '';
                changeLabel = tf(d.fromLastMonth, { change: `${arrow}${change}` });
              }
            }
            return (
              <Card
                key={i}
                className="rounded-xl border border-slate-200/90 dark:border-slate-800 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{title}</p>
                      <div className="text-xl font-semibold text-slate-900 dark:text-white">
                        {loading ? '—' : value}
                      </div>
                      <p className={`text-xs ${changeTone}`}>
                        {loading ? '' : changeLabel}
                      </p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shadow-sm`}>
                      <Icon size={16} className="text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{d.quickActions.title}</CardTitle>
            <CardDescription className="text-xs">{d.quickActions.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(qa)}
                    className="group rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-start hover:border-purple-200 dark:hover:border-purple-700/60 hover:bg-purple-50/60 dark:hover:bg-purple-950/40 transition-colors"
                    aria-label={qa.title}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-7 h-7 items-center justify-center rounded-md bg-purple-600 text-white shadow-sm">
                        <Icon size={14} />
                      </span>
                      <span className="text-xs font-medium text-slate-900 dark:text-white">{qa.title}</span>
                      <HintKbd keys={qa.keys} className="ms-auto hidden sm:inline-flex opacity-70 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{qa.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legal Deadline Calculator — always available; binds to real cases via API */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-4">
            <DeadlinesCard />
            {demoMatterId ? <MatterTimeline matterId={demoMatterId} /> : null}
          </div>
          {demoMatterId ? (
            <div className="space-y-4">
              <EngagementBudgetCard matterId={demoMatterId} />
            </div>
          ) : null}
        </div>

        {/* Knowledge & Evidence Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ResearchNotebookCard />
          <EvidenceManagerCard />
        </div>

        {/* Recent Cases + Today’s Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Recent Cases */}
          <Card className="lg:col-span-2 rounded-xl border border-slate-200/90 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">{d.recentCases.title}</CardTitle>
                <CardDescription className="text-xs">{d.recentCases.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={handleViewAllCases}>
                <Eye size={12} className="me-1.5" />
                {t.common.viewAll}
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {loading && !overview ? (
                  <div className="space-y-2.5" aria-busy="true" aria-label={d.recentCases.loading}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-[52px] animate-pulse rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="rounded-xl border border-dashed border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 px-4 py-6 text-center">
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
                      className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 text-start hover:bg-white dark:hover:bg-slate-900/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                      aria-label={tf(d.recentCases.openAria, { title: c.title })}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.title}</h4>
                        <p className="truncate text-xs text-muted-foreground">{c.client}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={[
                            'px-2 py-1 rounded-full text-[10px] font-medium',
                            c.priority === 'Critical'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : c.priority === 'High'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : c.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                          ].join(' ')}
                        >
                          {priorityLabel(c.priority)}
                        </span>
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground"
                          aria-hidden
                        >
                          <ArrowRight size={14} className="rtl:rotate-180" />
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{d.recentCases.empty}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{d.recentCases.emptyHint}</p>
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">{d.todayTasks.title}</CardTitle>
                <CardDescription className="text-xs">{d.todayTasks.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={handleViewAllTasks}>
                <Eye size={12} className="me-1.5" />
                {t.common.viewAll}
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {loading && !overview ? (
                  <div className="space-y-2.5" aria-busy="true" aria-label={d.todayTasks.loading}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-[52px] animate-pulse rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="rounded-xl border border-dashed border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 px-4 py-6 text-center">
                    <p className="text-sm text-rose-700 dark:text-rose-300">{d.todayTasks.loadError}</p>
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
                ) : displayTasks.length > 0 ? (
                  displayTasks.map((taskItem) => {
                    const pKey = taskPriorityKey(taskItem.priority);
                    const isHigh = pKey === 'high' || pKey === 'critical';
                    return (
                      <button
                        key={taskItem.id}
                        type="button"
                        onClick={() => handleViewTask(taskItem)}
                        className="flex w-full min-h-[44px] items-center gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-start hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                        aria-label={tf(d.todayTasks.openAria, { title: taskItem.title })}
                      >
                        <div
                          className={[
                            'w-2 h-2 shrink-0 rounded-full',
                            pKey === 'critical' ? 'bg-rose-600' : isHigh ? 'bg-amber-500' : 'bg-blue-500',
                          ].join(' ')}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium text-slate-900 dark:text-white">{taskItem.title}</h4>
                          {taskItem.time ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} />
                              {taskItem.time}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={[
                            'shrink-0 px-2 py-1 rounded-full text-[10px] font-medium',
                            pKey === 'critical'
                              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                              : isHigh
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
                          ].join(' ')}
                        >
                          {priorityLabel(taskItem.priority)}
                        </span>
                        <span
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground"
                          aria-hidden
                        >
                          <ArrowRight size={14} className="rtl:rotate-180" />
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">{d.todayTasks.empty}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 rounded-lg"
                      onClick={handleCreateFirstTask}
                    >
                      <ClipboardList size={12} className="me-1.5" />
                      {d.todayTasks.createCta}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{d.recentActivity.title}</CardTitle>
            <CardDescription className="text-xs">{d.recentActivity.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {loading && !overview ? (
                <div className="space-y-3" aria-busy="true" aria-label={d.recentActivity.loading}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-7 w-7 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-48 max-w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-xl border border-dashed border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/30 px-4 py-6 text-center">
                  <p className="text-sm text-rose-700 dark:text-rose-300">{d.recentActivity.loadError}</p>
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
              ) : displayActivity.length > 0 ? (
                displayActivity.map((a, idx) => {
                  const AIcon = ICONS[a.icon] ?? ClipboardList;
                  const badgeClass =
                    a.icon === 'CheckSquare'
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                      : a.icon === 'Users'
                      ? 'bg-blue-500/15 dark:bg-blue-500/20'
                      : 'bg-purple-500/15 dark:bg-purple-500/20';
                  const iconClass =
                    a.icon === 'CheckSquare'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : a.icon === 'Users'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-purple-600 dark:text-purple-400';

                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-7 h-7 ${badgeClass} rounded-full flex items-center justify-center`}>
                        <AIcon size={12} className={iconClass} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 dark:text-white">{a.message}</p>
                        <p className="text-xs text-muted-foreground">{a.ago}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">{d.recentActivity.empty}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddClientDialog
        open={openDialogs.client}
        onOpenChange={() => handleCloseDialog('client')}
      />
      <CaseDetailDrawer ref={caseDetailDrawerRef} />
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
