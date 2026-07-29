import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Briefcase, CheckSquare, Megaphone, Eye, ArrowRight,
  CalendarPlus, FolderPlus, ClipboardList, UserPlus, Clock,
  ShieldAlert, BookOpenCheck, Flag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddClientDialog from '../components/AddClientDialog';
import CreateCaseDialog from '../components/CreateCaseDialog';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '../components/ScheduleAppointmentDialog';
import AddTaskDialog from '../components/task/TaskCreateModal';
import useUserStore from '@/stores/userStore';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import { useNavigate } from 'react-router';

// NEW imports (your existing dashboard tools)
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import MatterTimeline from '@/components/dashboard/MatterTimeline';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import ClauseLibraryModal from '@/components/dashboard/ClauseLibraryModal';
import EngagementBudgetCard from '@/components/dashboard/EngagementBudgetCard';
import EvidenceManagerCard from '@/components/dashboard/EvidenceManagerCard';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import RiskKpiCard from '@/components/dashboard/RiskKpiCard';
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';

// Service to fetch backend overview
import { apiGetCabinetStats } from '@/services/dashboard/api';
import { devError } from '@/utils/devLog';
import { TaskCreateModalRef } from '@/components/task/TaskCreateModal';

// Map API icon strings → lucide components
const ICONS: Record<string, React.ComponentType<any>> = {
  Users,
  Briefcase,
  CheckSquare,
  ClipboardList,
  // add more if backend returns other names
};

type ApiStat = {
  title: string;
  value: string;
  change: string;
  icon: string;   // "Users" | "Briefcase" | ...
  color: string;  // tailwind bg class (unused here, we preserve your styling)
};

type ApiCase = {
  id: number;
  title: string;
  client: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  date: string;
};

type ApiTask = {
  id: number;
  title: string;
  time: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
};

type ApiActivity = {
  icon: string;        // "CheckSquare" etc.
  message: string;
  ago: string;         // "2h ago"
};

type ApiKpis = {
  wip_aging_gt_60: number;
  open_high_risk_matters: number;
  realization_rate: number;
};

type DashboardOverview = {
  stats: ApiStat[];
  announcement: { title: string; body: string };
  recent_cases: ApiCase[];
  today_tasks: ApiTask[];
  recent_activity: ApiActivity[];
  kpis: ApiKpis;
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openDialogs, setOpenDialogs] = useState({
    client: false,
    case: false,
  });
  const [openConflict, setOpenConflict] = useState(false);
  const [openClauseLib, setOpenClauseLib] = useState(false);
  const [openMatterClose, setOpenMatterClose] = useState(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const { toast } = useToast();
  const { user } = useUserStore();

  // --- FALLBACKS (used only when API fails) ---
  const fallbackStats = [
    { title: 'Total Clients', value: '0', change: '+0%', icon: Users, iconBg: 'bg-blue-500', changeTone: 'text-emerald-600' },
    { title: 'Active Cases', value: '0', change: '+0%', icon: Briefcase, iconBg: 'bg-emerald-500', changeTone: 'text-emerald-600' },
    { title: 'Tasks Due', value: '0', change: '+0%', icon: CheckSquare, iconBg: 'bg-amber-500', changeTone: 'text-emerald-600' },
  ];

  const fallbackCases = [
    { id: 1, title: 'Johnson vs. State', client: 'Michael Johnson', status: 'Active', priority: 'High' as const, date: '2024-01-15' },
    { id: 2, title: 'Corporate Merger', client: 'Tech Corp Ltd.', status: 'Review', priority: 'Medium' as const, date: '2024-01-12' },
  ];

  const fallbackTasks = [
    { id: 1, title: 'Client Meeting — Johnson Case', time: '10:00 AM', priority: 'High' as const },
    { id: 2, title: 'Court Filing Deadline', time: '2:00 PM', priority: 'Critical' as const },
  ];

  const caseModalRef = useRef<CaseModalRef>(null);
  const clientCreateModalRef = useRef<ClientCreateModalRef>(null);
  const taskCreateModalRef = useRef<TaskCreateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);

  const navigate = useNavigate();

  // Fetch backend overview on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const response = await apiGetCabinetStats();
        if (!mounted) return;
        setOverview(response.data);
      } catch (err: any) {
        devError('Dashboard API error:', err);
        toast({
          title: 'Dashboard',
          description: 'Unable to load dashboard data. Showing fallback information.',
          variant: 'destructive',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [toast]);

  // Build display stats: prefer API, fallback to local
  const displayStats = useMemo(() => {
    if (!overview?.stats?.length) {
      return fallbackStats.map(s => ({
        title: s.title,
        value: s.value,
        change: s.change,
        Icon: s.icon,
        iconBg: s.iconBg,
        changeTone: s.changeTone,
      }));
    }
    return overview.stats.map(s => {
      const Icon = ICONS[s.icon] ?? CheckSquare;
      // derive tones (simple): positive if not starting with '-', otherwise red
      const changeTone = s.change?.trim().startsWith('-') ? 'text-rose-600' : 'text-emerald-600';
      // API had "color" but we stick to your design’s iconBg
      const iconBg = s.icon === 'Users' ? 'bg-blue-500' : s.icon === 'Briefcase' ? 'bg-emerald-500' : 'bg-amber-500';
      return { title: s.title, value: s.value, change: s.change, Icon, iconBg, changeTone };
    });
  }, [overview]);

  const displayAnnouncement = useMemo(() => {
    if (!overview?.announcement) {
      return {
        title: 'Jure Announcement',
        body: 'Welcome to Jure! New features: enhanced case management, better client comms, and streamlined document flows.'
      };
    }
    return overview.announcement;
  }, [overview]);

  const displayCases: ApiCase[] = useMemo(
    () => overview?.recent_cases?.length ? overview.recent_cases : fallbackCases,
    [overview]
  );

  const displayTasks: ApiTask[] = useMemo(
    () => overview?.today_tasks?.length ? overview.today_tasks : fallbackTasks,
    [overview]
  );

  const displayActivity: ApiActivity[] = useMemo(() => {
    if (overview?.recent_activity?.length) return overview.recent_activity;
    // fallback to your static three lines
    return [
      { icon: 'CheckSquare', message: 'Task completed: Document review for Johnson case', ago: '2 hours ago' },
      { icon: 'Users', message: 'New client added: Sarah Williams', ago: '4 hours ago' },
      { icon: 'ClipboardList', message: 'Document uploaded to Tech Corp case', ago: '6 hours ago' },
    ];
  }, [overview]);

  const kpis: ApiKpis | null = overview?.kpis ?? null; // If later you want to pass to RiskKpiCard as props

  const quickActions = [
    { title: 'Add New Client', icon: UserPlus, description: 'Register a new client', action: 'client', modalRef: clientCreateModalRef },
    { title: 'Create New Case', icon: FolderPlus, description: 'Open a new matter', action: 'case', modalRef: caseModalRef },
    { title: 'Schedule Appointment', icon: CalendarPlus, description: 'Book a meeting', action: 'appointment', modalRef: appointmentCreateRef },
    { title: 'Add Task', icon: ClipboardList, description: 'Create a reminder', action: 'task', modalRef: taskCreateModalRef },
    { title: 'Conflict Check', icon: ShieldAlert, description: 'Search parties & conflicts', action: 'conflict', modalRef: undefined },
    { title: 'Clause Library', icon: BookOpenCheck, description: 'Insert vetted clauses', action: 'clauseLib', modalRef: undefined },
    { title: 'Close Matter', icon: Flag, description: 'Capture outcome & lessons', action: 'closeMatter', modalRef: undefined }
  ];
  

  const handleQuickAction = (qa: typeof quickActions[number]) => {
    if (qa.modalRef?.current?.show) return qa.modalRef.current.show();
    if (qa.action === 'conflict') return setOpenConflict(true);
    if (qa.action === 'clauseLib') return setOpenClauseLib(true);
    if (qa.action === 'closeMatter') return setOpenMatterClose(true);
  };

  const handleCloseDialog = (dialogType: keyof typeof openDialogs) => {
    setOpenDialogs((s) => ({ ...s, [dialogType]: false }));
  };

  const handleViewCase = (caseItem: ApiCase | any) => {
    // you can navigate to /cases/:id when routes exist
    // navigate(`/cases/${caseItem.id}`);
    // For now, keep your toast:
    toast({ title: 'Case Details', description: `Opening details for ${caseItem.title}` });
  };

  const handleViewAllCases = () => {
    navigate('/dashboard/cases');
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Good morning, {user?.first_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here’s what’s happening with your practice today.
            </p>
          </div>
        </div>

        {/* Announcement */}
        <Card className="border border-purple-100/80 rounded-2xl shadow-sm bg-gradient-to-r from-purple-50 to-sky-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <Megaphone size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-purple-900">
                  {displayAnnouncement.title}
                </h3>
                <p className="text-sm text-purple-900/80 leading-relaxed mt-1">
                  {displayAnnouncement.body}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayStats.map(({ title, value, change, Icon, iconBg, changeTone }, i) => (
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
                    <p className={`text-xs ${change?.trim().startsWith('-') ? 'text-rose-600' : changeTone}`}>
                      {loading ? '' : `${change} from last month`}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription className="text-xs">Create fast without leaving the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(qa)}
                    className="group rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-purple-200 hover:bg-purple-50/60 transition-colors"
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

        {/* Professional Tools Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Deadlines & Timeline (two wide, stacked) */}
          <div className="lg:col-span-2 space-y-4">
            <DeadlinesCard matterId="m1" />
            <MatterTimeline matterId="m1" />
          </div>

          {/* Budget / KPIs */}
          <div className="space-y-4">
            <EngagementBudgetCard matterId="m1" />
            {/* If later you want live KPIs, you can create <RiskKpiCard kpis={kpis} /> and read props inside */}
            <RiskKpiCard />
          </div>
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
                <CardTitle className="text-base">Recent Cases</CardTitle>
                <CardDescription className="text-xs">Your most recent active matters</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={handleViewAllCases}>
                <Eye size={12} className="mr-1.5" />
                View All
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {displayCases.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-3 hover:bg-white transition-colors"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-medium text-gray-900">{c.title}</h4>
                      <p className="text-xs text-muted-foreground">{c.client}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                        {c.priority}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleViewCase(c)}
                        aria-label={`Open ${c.title}`}
                      >
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                {!displayCases.length && (
                  <div className="text-xs text-muted-foreground">No recent cases.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card className="rounded-2xl border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today’s Tasks</CardTitle>
              <CardDescription className="text-xs">Tasks scheduled for today</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {displayTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                    <div
                      className={[
                        'w-2 h-2 rounded-full',
                        t.priority === 'Critical' ? 'bg-rose-600' : t.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500',
                      ].join(' ')}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium text-gray-900">{t.title}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {t.time}
                      </p>
                    </div>
                    <span
                      className={[
                        'px-2 py-1 rounded-full text-[10px] font-medium',
                        t.priority === 'Critical'
                          ? 'bg-rose-100 text-rose-700'
                          : t.priority === 'High'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700',
                      ].join(' ')}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
                {!displayTasks.length && (
                  <div className="text-xs text-muted-foreground">No tasks today.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-2xl border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs">Latest updates from your practice</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {displayActivity.map((a, idx) => {
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
              })}
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
      <ClientCreateModal ref={clientCreateModalRef} />
      <ScheduleAppointmentDialog
        ref={appointmentCreateRef}
      />
      <AddTaskDialog ref={taskCreateModalRef} />
      <ConflictCheckDialog open={openConflict} onOpenChange={setOpenConflict} />
      <ClauseLibraryModal open={openClauseLib} onOpenChange={setOpenClauseLib} />
      <MatterCloseModal open={openMatterClose} onOpenChange={setOpenMatterClose} />
    </>
  );
};

export default Dashboard;
