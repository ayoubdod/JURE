import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus, CalendarClock, Calendar, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '@/components/ScheduleAppointmentDialog';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/AppointmentUpdateModal';
import { AppointmentDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import AppointmentToolbar, { type AppointmentFiltersValue } from '@/components/appointments/AppointmentToolbar';
import AppointmentList, { type AppointmentViewMode } from '@/components/appointments/AppointmentList';
import PaginationComponent from '@/components/common/Pagination';
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceKpiStrip,
  WorkspacePageHeader,
} from '@/components/workspace/WorkspaceChrome';
import {
  apiGetAppointments,
  apiGetAppointmentStats,
  type Appointment,
  type AppointmentStats,
} from '@/services/appointment/api';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';
import { useShortcutAction } from '@/context/ShortcutsContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useAppTranslation } from '@/i18n';
import { navigateToCaseById } from '@/lib/caseRoutes';
import '@/styles/workspace-list.css';

const PAGE_SIZE_KEY = 'jure.appointments.pageSize';
const VIEW_STORAGE_KEY = 'jure.appointments.viewMode';

const DEFAULT_FILTERS: AppointmentFiltersValue = {
  search: '',
  status: 'all',
  period: 'all',
  assignedTo: 'all',
  caseId: 'all',
  clientId: 'all',
};

function readPageSize(): number {
  try {
    const n = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10);
    return n === 20 || n === 50 || n === 100 ? n : 20;
  } catch {
    return 20;
  }
}

function readStoredView(): AppointmentViewMode {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

const AppointmentsPage: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const a = t.appointments;

  const [filters, setFilters] = useState<AppointmentFiltersValue>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<AppointmentViewMode>(readStoredView);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readPageSize);
  const [items, setItems] = useState<Appointment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [holderEl, setHolderEl] = useState<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);
  const createRef = useRef<ScheduleAppointmentDialogRef>(null);
  const updateRef = useRef<AppointmentUpdateModalRef>(null);

  const openCreate = useCallback(() => {
    createRef.current?.show();
  }, []);

  useShortcutAction('create-appointment', openCreate);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  useEffect(() => {
    const raw = searchParams.get('appointment');
    if (!raw) return;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) return;
    setDetailId(id);
    const next = new URLSearchParams(searchParams);
    next.delete('appointment');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (inField || e.metaKey || e.ctrlKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiGetAppointmentStats();
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiGetAppointments({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        period: filters.period !== 'all' ? filters.period : undefined,
        assigned_to: filters.assignedTo !== 'all' ? filters.assignedTo : undefined,
        case: filters.caseId !== 'all' ? filters.caseId : undefined,
        client: filters.clientId !== 'all' ? filters.clientId : undefined,
        ordering: 'start_at',
      });
      setItems(res.data.results || []);
      setTotalCount(res.data.count ?? 0);
      setLastPage(res.data.last_page ?? 1);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    filters.status,
    filters.period,
    filters.assignedTo,
    filters.caseId,
    filters.clientId,
  ]);

  const refreshAll = useCallback(() => {
    void fetchList();
    void fetchStats();
  }, [fetchList, fetchStats]);

  useWorkspaceSync(refreshAll);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.period, filters.assignedTo, filters.caseId, filters.clientId, pageSize]);

  const handlePageSize = (size: number) => {
    setPageSize(size);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  };

  const hasFilters =
    !!debouncedSearch.trim() ||
    filters.status !== 'all' ||
    filters.period !== 'all' ||
    filters.assignedTo !== 'all' ||
    filters.caseId !== 'all' ||
    filters.clientId !== 'all';

  const emptyState = (
    <WorkspaceEmptyState
      icon={CalendarClock}
      title={hasFilters ? a.empty.filteredTitle : a.empty.title}
      hint={hasFilters ? a.empty.filteredHint : a.empty.hint}
      action={
        hasFilters ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            {a.clearFilters}
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-[12px]" onClick={openCreate}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            {a.newAppointment}
          </Button>
        )
      }
    />
  );

  const errorState = (
    <WorkspaceErrorState
      title={a.loadError}
      description={a.loadErrorHint}
      retryLabel={t.common.retry}
      onRetry={refreshAll}
    />
  );

  const setPeriod = (period: string) => {
    setFilters((prev) => ({
      ...prev,
      period: prev.period === period ? 'all' : period,
      status: 'all',
    }));
  };

  const setStatus = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? 'all' : status,
      period: 'all',
    }));
  };

  const kpiItems = [
    {
      key: 'total',
      label: a.stats.total,
      value: stats?.total ?? null,
      accent: 'text-slate-500',
      icon: Calendar,
      onClick: () => setFilters({ ...filters, period: 'all', status: 'all' }),
    },
    {
      key: 'today',
      label: a.stats.today,
      value: stats?.today ?? null,
      accent: 'text-indigo-500',
      icon: CalendarClock,
      active: filters.period === 'today',
      onClick: () => setPeriod('today'),
    },
    {
      key: 'upcoming',
      label: a.stats.upcoming,
      value: stats?.upcoming ?? null,
      accent: 'text-emerald-600',
      icon: CalendarDays,
      active: filters.period === 'upcoming',
      onClick: () => setPeriod('upcoming'),
    },
    {
      key: 'done',
      label: a.stats.completed,
      value: stats?.completed ?? null,
      accent: 'text-slate-500',
      icon: CheckCircle2,
      active: filters.status === 'done',
      onClick: () => setStatus('done'),
    },
    {
      key: 'cancelled',
      label: a.stats.cancelled,
      value: stats?.cancelled ?? null,
      accent: 'text-rose-500',
      icon: XCircle,
      active: filters.status === 'cancelled',
      onClick: () => setStatus('cancelled'),
    },
  ];

  return (
    <div ref={setHolderEl} className="relative h-full min-h-0 flex flex-col overflow-hidden bg-transparent">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-2 sm:px-5 lg:px-6">
        <WorkspacePageHeader
          title={a.title}
          subtitle={a.subtitle}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-9 text-[12px]" onClick={() => navigate('/dashboard/calendar')}>
                {a.goToCalendar}
              </Button>
              <Button size="sm" className="h-9 px-3 text-[12px] font-semibold rounded-md shadow-sm shadow-primary/15" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                {a.newAppointment}
              </Button>
            </div>
          }
        />
        <WorkspaceKpiStrip items={kpiItems} loading={statsLoading} ariaLabel={a.title} />
        <div className="py-2">
          <AppointmentToolbar
            value={filters}
            onChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        <div className="pb-3">
          <AppointmentList
            appointments={items}
            loading={loading}
            empty={emptyState}
            error={loadError ? errorState : null}
            onOpen={(item) => setDetailId(item.id)}
            viewMode={viewMode}
          />
        </div>
      </div>

      {!loadError && (
        <PaginationComponent
          currentPage={page}
          totalPages={Math.max(1, lastPage)}
          totalCount={totalCount}
          pageSize={pageSize}
          isLoading={loading}
          onPageChange={setPage}
          onPageSizeChange={handlePageSize}
          itemLabel={t.sidebar.appointment.toLowerCase()}
        />
      )}

      <AppointmentDetailPanel
        appointmentId={detailId}
        open={detailId != null}
        onOpenChange={(v) => !v && setDetailId(null)}
        onEdit={(item) => updateRef.current?.show(item)}
        portalContainer={holderEl}
        onOpenCase={(id) => {
          setDetailId(null);
          void navigateToCaseById(navigate, id);
        }}
      />
      <ScheduleAppointmentDialog ref={createRef} onSuccess={refreshAll} />
      <AppointmentUpdateModal ref={updateRef} onSuccess={refreshAll} />
    </div>
  );
};

export default AppointmentsPage;
