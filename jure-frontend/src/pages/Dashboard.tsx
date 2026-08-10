import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Briefcase, CheckSquare, Megaphone, Eye, ArrowRight,
  CalendarPlus, FolderPlus, ClipboardList, UserPlus, Clock,
  ShieldAlert, BookOpenCheck, Flag, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddClientDialog from '../components/AddClientDialog';
import CreateCaseDialog from '../components/CreateCaseDialog';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '../components/ScheduleAppointmentDialog';
import AddTaskDialog from '../components/task/TaskCreateModal';
import useUserStore from '@/stores/userStore';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseDetailDrawer, { CaseDetailDrawerRef } from '@/components/case/CaseDetailDrawer';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import { TaskDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import { useNavigate } from 'react-router';
import { apiUpdateTask } from '@/services/task/api';
import { TaskStatus } from '@/utils/constants';

// NEW imports (your existing dashboard tools)
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import MatterTimeline from '@/components/dashboard/MatterTimeline';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import ClauseLibraryModal from '@/components/dashboard/ClauseLibraryModal';
import EngagementBudgetCard from '@/components/dashboard/EngagementBudgetCard';
import EvidenceManagerCard from '@/components/dashboard/EvidenceManagerCard';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';
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
import { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import { useAppTranslation } from '@/i18n';

function resolveAnnouncementMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = BACKEND_BASE_URL.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}
const ANNOUNCEMENT_STYLES: Record<
  DashboardAnnouncement['type'],
  { card: string; iconWrap: string; title: string; body: string }
> = {
  INFO: {
    card: 'border border-sky-100/80 rounded-2xl shadow-sm bg-gradient-to-r from-sky-50 to-slate-50',
    iconWrap: 'w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-sky-950',
    body: 'text-sm text-sky-950/80 leading-relaxed mt-1',
  },
  SUCCESS: {
    card: 'border border-emerald-100/80 rounded-2xl shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50/60',
    iconWrap: 'w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-emerald-950',
    body: 'text-sm text-emerald-950/80 leading-relaxed mt-1',
  },
  WARNING: {
    card: 'border border-amber-100/80 rounded-2xl shadow-sm bg-gradient-to-r from-amber-50 to-orange-50/50',
    iconWrap: 'w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-amber-950',
    body: 'text-sm text-amber-950/80 leading-relaxed mt-1',
  },
  IMPORTANT: {
    card: 'border border-rose-100/80 rounded-2xl shadow-sm bg-gradient-to-r from-rose-50 to-orange-50/40',
    iconWrap: 'w-10 h-10 rounded-xl bg-rose-700 flex items-center justify-center shrink-0 shadow-sm',
    title: 'text-sm font-semibold text-rose-950',
    body: 'text-sm text-rose-950/80 leading-relaxed mt-1',
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openDialogs, setOpenDialogs] = useState({
    client: false,
    case: false,
  });
  const [openConflict, setOpenConflict] = useState(false);
  const [openClauseLib, setOpenClauseLib] = useState(false);
  const [openMatterClose, setOpenMatterClose] = useState(false);

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

  const caseModalRef = useRef<CaseModalRef>(null);
  const caseDetailDrawerRef = useRef<CaseDetailDrawerRef>(null);
  const clientCreateModalRef = useRef<ClientCreateModalRef>(null);
  const taskCreateModalRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateModalRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);

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
        changeState === 'down' ? 'text-rose-600'
          : changeState === 'up' ? 'text-emerald-600'
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

  const quickActions = [
    { title: d.quickActions.addClientTitle, icon: UserPlus, description: d.quickActions.addClientDescription, action: 'client', modalRef: clientCreateModalRef },
    { title: d.quickActions.createCaseTitle, icon: FolderPlus, description: d.quickActions.createCaseDescription, action: 'case', modalRef: caseModalRef },
    { title: d.quickActions.scheduleAppointmentTitle, icon: CalendarPlus, description: d.quickActions.scheduleAppointmentDescription, action: 'appointment', modalRef: appointmentCreateRef },
    { title: d.quickActions.addTaskTitle, icon: ClipboardList, description: d.quickActions.addTaskDescription, action: 'task', modalRef: taskCreateModalRef },
    { title: d.quickActions.conflictCheckTitle, icon: ShieldAlert, description: d.quickActions.conflictCheckDescription, action: 'conflict', modalRef: undefined },
    { title: d.quickActions.clauseLibraryTitle, icon: BookOpenCheck, description: d.quickActions.clauseLibraryDescription, action: 'clauseLib', modalRef: undefined },
    { title: d.quickActions.closeMatterTitle, icon: Flag, description: d.quickActions.closeMatterDescription, action: 'closeMatter', modalRef: undefined },
  ];

  const priorityLabel = (priority: string) => {
    const key = priority.toLowerCase();
    if (key === 'critical') return d.priorityCritical;
    return enumLabel('taskPriority', key) || priority;
  };

  const handleQuickAction = (qa: typeof quickActions[number]) => {
    if (qa.modalRef?.current?.show) return qa.modalRef.current.show();
    if (qa.action === 'conflict') return setOpenConflict(true);
    if (qa.action === 'clauseLib') return setOpenClauseLib(true);
    if (qa.action === 'closeMatter') return setOpenMatterClose(true);
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
    caseModalRef.current?.show();
  };

  const handleViewTask = (taskItem: ApiTask) => {
    if (!taskItem?.id) return;
    setDetailTaskId(taskItem.id);
  };

  const handleViewAllTasks = () => {
    navigate('/dashboard/tasks');
  };

  const handleCreateFirstTask = () => {
    taskCreateModalRef.current?.show();
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
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              {tf(d.greeting, { name: user?.first_name ?? '' })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
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
            <Card className={style.card}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className={style.iconWrap}>
                    <Megaphone size={18} className="text-white" />
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
                        className="shrink-0 overflow-hidden rounded-md border border-black/5 bg-white/60"
                        title={displayAnnouncement.title}
                      >
                        <img
                          src={mediaUrl}
                          alt=""
                          className="h-28 w-44 object-cover sm:h-32 sm:w-52"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {hasMedia && mediaUrl && displayAnnouncement.media_kind === 'VIDEO' && (
                      <div className="shrink-0 overflow-hidden rounded-md border border-black/5 bg-black/5">
                        <video
                          src={mediaUrl}
                          controls
                          preload="metadata"
                          className="h-28 w-48 object-cover sm:h-32 sm:w-56"
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
                    className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleHideAnnouncement}
                    aria-label={d.hideAnnouncement}
                    title={d.hideAnnouncement}
                  >
                    <X size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="rounded-2xl border border-gray-100 hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{title}</p>
                      <div className="text-2xl font-semibold text-gray-900">
                        {loading ? '—' : value}
                      </div>
                      <p className={`text-xs ${changeTone}`}>
                        {loading ? '' : changeLabel}
                      </p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                      <Icon size={18} className="text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{d.quickActions.title}</CardTitle>
            <CardDescription className="text-xs">{d.quickActions.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(qa)}
                    className="group rounded-xl border border-gray-100 bg-white p-3 text-start hover:border-purple-200 hover:bg-purple-50/60 transition-colors"
                    aria-label={qa.title}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                        <Icon size={16} />
                      </span>
                      <span className="text-[13px] font-medium text-gray-900">{qa.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{qa.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legal Deadline Calculator — always available; binds to real cases via API */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ResearchNotebookCard />
          <EvidenceManagerCard />
        </div>

        {/* Recent Cases + Today’s Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Cases */}
          <Card className="lg:col-span-2 rounded-2xl border border-gray-100">
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
                        className="h-[52px] animate-pulse rounded-xl border border-gray-100 bg-gray-50/80"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center">
                    <p className="text-sm text-rose-700">{d.recentCases.loadError}</p>
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
                      className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-start hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                      aria-label={tf(d.recentCases.openAria, { title: c.title })}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-gray-900">{c.title}</h4>
                        <p className="truncate text-xs text-muted-foreground">{c.client}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={[
                            'px-2 py-1 rounded-full text-[10px] font-medium',
                            c.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-700'
                              : c.priority === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : c.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700',
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
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-gray-900">{d.recentCases.empty}</p>
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
          <Card className="rounded-2xl border border-gray-100">
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
                        className="h-[52px] animate-pulse rounded-xl border border-gray-100 bg-gray-50/80"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center">
                    <p className="text-sm text-rose-700">{d.todayTasks.loadError}</p>
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
                        className="flex w-full min-h-[44px] items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 text-start hover:bg-gray-50/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
                        aria-label={tf(d.todayTasks.openAria, { title: taskItem.title })}
                      >
                        <div
                          className={[
                            'w-2 h-2 shrink-0 rounded-full',
                            pKey === 'critical' ? 'bg-rose-600' : isHigh ? 'bg-amber-500' : 'bg-blue-500',
                          ].join(' ')}
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-medium text-gray-900">{taskItem.title}</h4>
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
                              ? 'bg-rose-100 text-rose-700'
                              : isHigh
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700',
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
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center">
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
        <Card className="rounded-2xl border border-gray-100">
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
                      <div className="h-7 w-7 animate-pulse rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-48 max-w-full animate-pulse rounded bg-gray-100" />
                        <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-6 text-center">
                  <p className="text-sm text-rose-700">{d.recentActivity.loadError}</p>
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
                      ? 'bg-emerald-100'
                      : a.icon === 'Users'
                      ? 'bg-blue-100'
                      : 'bg-purple-100';
                  const iconClass =
                    a.icon === 'CheckSquare'
                      ? 'text-emerald-600'
                      : a.icon === 'Users'
                      ? 'text-blue-600'
                      : 'text-purple-600';

                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-7 h-7 ${badgeClass} rounded-full flex items-center justify-center`}>
                        <AIcon size={12} className={iconClass} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{a.message}</p>
                        <p className="text-xs text-muted-foreground">{a.ago}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-6 text-center">
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
      <CaseModal ref={caseModalRef} />
      <CaseDetailDrawer ref={caseDetailDrawerRef} />
      <ClientCreateModal ref={clientCreateModalRef} />
      <ScheduleAppointmentDialog
        ref={appointmentCreateRef}
      />
      <AddTaskDialog ref={taskCreateModalRef} onSuccess={refreshOverview} />
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
      <ConflictCheckDialog open={openConflict} onOpenChange={setOpenConflict} />
      <ClauseLibraryModal open={openClauseLib} onOpenChange={setOpenClauseLib} />
      <MatterCloseModal
        open={openMatterClose}
        onOpenChange={setOpenMatterClose}
        onSuccess={() => {
          void refreshOverview();
        }}
      />
    </>
  );
};

export default Dashboard;
