/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import FullCalendar from '@fullcalendar/react';
import { CalendarClock, Calendar, AlertTriangle, CalendarDays } from 'lucide-react';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '@/components/appointments/ScheduleAppointmentDialog';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/appointments/AppointmentUpdateModal';
import { TaskDetailPanel, AppointmentDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import CaseDateDetailPanel from '@/components/calendar/CaseDateDetailPanel';
import CalendarFilters, { type CalendarFiltersValue } from '@/components/calendar/CalendarFilters';
import CalendarView from '@/components/calendar/CalendarView';
import {
  WorkspaceKpiStrip,
  WorkspacePageHeader,
  WorkspaceErrorState,
} from '@/components/workspace/WorkspaceChrome';
import { apiGetCalendarEvents, apiGetCalendarCaseDateEvents } from '@/services/calendar/api';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';
import { useShortcutAction } from '@/context/ShortcutsContext';
import { useAppTranslation } from '@/i18n';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { navigateToCaseById } from '@/lib/caseRoutes';
import '@/styles/workspace-list.css';
import {
  type CalendarEvent,
  calendarTypesParam,
  endOfLocalWeek,
  isTaskAppointmentOverdue,
  matchesEventTypeFilter,
  normalizeCaseDateRaw,
  parseEntityId,
  startOfLocalDay,
  startOfLocalWeek,
} from '@/lib/calendarEvents';

type DetailKind = 'task' | 'appointment' | 'case_date' | null;

const DEFAULT_FILTERS: CalendarFiltersValue = {
  search: '',
  eventType: 'all',
  status: 'all',
  priority: 'all',
  assignedTo: 'all',
  caseId: 'all',
  clientId: 'all',
};

const CalendarPage: React.FC = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cal = t.calendar;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [caseDateItems, setCaseDateItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<CalendarFiltersValue>(DEFAULT_FILTERS);
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null);
  const [detailKind, setDetailKind] = useState<DetailKind>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [caseDateDetail, setCaseDateDetail] = useState<CalendarEvent | null>(null);
  const [calendarHolderEl, setCalendarHolderEl] = useState<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);
  const calendarRef = useRef<FullCalendar | null>(null);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);
  const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);

  const openCreateTask = useCallback(() => taskCreateRef.current?.show(), []);
  const openCreateAppointment = useCallback(() => appointmentCreateRef.current?.show(), []);

  useShortcutAction('create-task', openCreateTask);
  useShortcutAction('create-appointment', openCreateAppointment);

  useEffect(() => {
    const taskId = parseInt(searchParams.get('task') || '', 10);
    const appointmentId = parseInt(searchParams.get('appointment') || '', 10);
    if (!Number.isFinite(taskId) && !Number.isFinite(appointmentId)) return;
    if (Number.isFinite(taskId)) {
      setDetailKind('task');
      setDetailId(taskId);
    } else {
      setDetailKind('appointment');
      setDetailId(appointmentId);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('task');
    next.delete('appointment');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateTask();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCreateTask]);

  const loadEvents = useCallback(
    async (start: Date, end: Date) => {
      setLoading(true);
      setLoadError(false);
      try {
        const typesParam = calendarTypesParam(filters.eventType);
        const params: Record<string, any> = {
          start: start.toISOString(),
          end: end.toISOString(),
        };
        if (typesParam) params.types = typesParam;
        if (filters.status !== 'all') params.status = filters.status;
        if (filters.priority !== 'all') params.priority = filters.priority;
        if (filters.assignedTo !== 'all') params.assigned_to = filters.assignedTo;
        if (filters.caseId !== 'all') params.case = filters.caseId;
        if (filters.clientId !== 'all') params.client = filters.clientId;
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const wantsCaseDates =
          filters.eventType === 'all' ||
          filters.eventType === 'hearings' ||
          filters.eventType === 'deadlines' ||
          filters.eventType === 'consultations';

        const [res, caseRes] = await Promise.all([
          typesParam
            ? apiGetCalendarEvents(params)
            : Promise.resolve({ data: [] as CalendarEvent[] }),
          wantsCaseDates
            ? apiGetCalendarCaseDateEvents(start.toISOString(), end.toISOString())
            : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        ]);
        setEvents(res.data as CalendarEvent[]);
        const normalized: CalendarEvent[] = [];
        (caseRes.data as Record<string, unknown>[]).forEach((raw, i) => {
          const n = normalizeCaseDateRaw(raw, i);
          if (n) normalized.push(n);
        });
        setCaseDateItems(normalized);
      } catch {
        setEvents([]);
        setCaseDateItems([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [
      filters.eventType,
      filters.status,
      filters.priority,
      filters.assignedTo,
      filters.caseId,
      filters.clientId,
      debouncedSearch,
    ]
  );

  const refreshEvents = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) loadEvents(api.view.currentStart, api.view.currentEnd);
    else if (viewRange) loadEvents(viewRange.start, viewRange.end);
    else {
      const now = new Date();
      loadEvents(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 2, 0));
    }
  }, [loadEvents, viewRange]);

  useWorkspaceSync(refreshEvents);

  const handleDatesSet = (arg: { start: Date; end: Date }) => {
    setViewRange({ start: arg.start, end: arg.end });
  };

  useEffect(() => {
    if (!viewRange) return;
    void loadEvents(viewRange.start, viewRange.end);
  }, [viewRange, loadEvents]);

  const openTaskDetail = (taskId: number) => {
    setDetailKind('task');
    setDetailId(taskId);
    setCaseDateDetail(null);
  };
  const openAppointmentDetail = (appointmentId: number) => {
    setDetailKind('appointment');
    setDetailId(appointmentId);
    setCaseDateDetail(null);
  };
  const openCaseDateDetail = (ce: CalendarEvent) => {
    setDetailKind('case_date');
    setDetailId(null);
    setCaseDateDetail(ce);
  };
  const closeDetailPanels = () => {
    setDetailKind(null);
    setDetailId(null);
    setCaseDateDetail(null);
  };
  const openCaseWorkspace = (id: number) => {
    void navigateToCaseById(navigate, id);
  };

  const onEventClick = (info: any) => {
    const evt = info.event;
    const ext = evt.extendedProps as CalendarEvent;
    if (ext?.type === 'case_date') {
      openCaseDateDetail(ext);
      return;
    }
    if (ext?.type === 'task') {
      const id = parseEntityId(String(evt.id), 'task-');
      if (id != null) openTaskDetail(id);
    } else if (ext?.type === 'appointment') {
      const id = parseEntityId(String(evt.id), 'appt-');
      if (id != null) openAppointmentDetail(id);
    }
  };

  const mergedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const e of events) map.set(e.id, e);
    for (const c of caseDateItems) map.set(c.id, c);
    return [...map.values()];
  }, [events, caseDateItems]);

  const visibleEvents = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return mergedEvents.filter((event) => {
      if (!matchesEventTypeFilter(event, filters.eventType)) return false;
      if (q && !event.title.toLowerCase().includes(q)) return false;
      if (filters.caseId !== 'all' && event.case_id?.toString() !== filters.caseId) return false;
      return true;
    });
  }, [mergedEvents, filters.eventType, filters.caseId, debouncedSearch]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = startOfLocalWeek(now);
    const weekEnd = endOfLocalWeek(now);
    let today = 0;
    let upcoming = 0;
    let overdue = 0;
    let thisWeek = 0;
    for (const e of visibleEvents) {
      const start = new Date(e.start);
      if (Number.isNaN(start.getTime())) continue;
      if (start >= todayStart && start < tomorrow) today += 1;
      if (start >= now) upcoming += 1;
      if (start >= weekStart && start < weekEnd) thisWeek += 1;
      if (e.type === 'case_date') {
        const s = new Date(e.start);
        s.setHours(0, 0, 0, 0);
        if (s.getTime() < todayStart.getTime()) overdue += 1;
      } else if (isTaskAppointmentOverdue(e)) {
        overdue += 1;
      }
    }
    return { today, upcoming, overdue, thisWeek };
  }, [visibleEvents]);

  const eventsInView = useMemo(() => {
    if (!viewRange) return visibleEvents;
    return visibleEvents.filter((e) => {
      const t0 = new Date(e.start).getTime();
      return t0 >= viewRange.start.getTime() && t0 < viewRange.end.getTime();
    });
  }, [visibleEvents, viewRange]);

  const hasActiveFilters =
    filters.eventType !== 'all' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assignedTo !== 'all' ||
    filters.caseId !== 'all' ||
    filters.clientId !== 'all' ||
    !!debouncedSearch.trim();

  const kpiItems = [
    { key: 'upcoming', label: cal.stats.upcoming, value: loading ? null : stats.upcoming, accent: 'text-emerald-600', icon: CalendarClock },
    { key: 'today', label: cal.stats.today, value: loading ? null : stats.today, accent: 'text-indigo-500', icon: Calendar },
    { key: 'overdue', label: cal.stats.overdue, value: loading ? null : stats.overdue, accent: 'text-rose-500', icon: AlertTriangle },
    { key: 'week', label: cal.stats.thisWeek, value: loading ? null : stats.thisWeek, accent: 'text-slate-500', icon: CalendarDays },
  ];

  return (
    <div ref={setCalendarHolderEl} className="relative h-full flex flex-col min-h-0 overflow-hidden bg-transparent px-4 pt-2 pb-2 sm:px-5 lg:px-6">
      <WorkspacePageHeader
        title={cal.title}
        subtitle={cal.subtitle}
      />

      <WorkspaceKpiStrip items={kpiItems} loading={loading} ariaLabel={cal.title} />

      <div className="shrink-0 py-1.5 sm:py-2">
        <CalendarFilters
          value={filters}
          onChange={setFilters}
          loading={loading}
          onRefresh={refreshEvents}
          onAddTask={openCreateTask}
          onAddAppointment={openCreateAppointment}
        />
      </div>

      <div className={cn('flex-1 min-h-0 overflow-hidden', loadError && 'flex items-center justify-center')}>
        {loadError ? (
          <WorkspaceErrorState
            title={cal.loadError}
            description={t.common.retry}
            retryLabel={t.common.retry}
            onRetry={refreshEvents}
          />
        ) : (
          <CalendarView
            calendarRef={calendarRef}
            events={visibleEvents}
            loading={loading}
            emptyPeriod={!loading && eventsInView.length === 0 && !hasActiveFilters}
            emptyFiltered={!loading && eventsInView.length === 0 && hasActiveFilters}
            onEventClick={onEventClick}
            onDatesSet={handleDatesSet}
          />
        )}
      </div>

      <TaskDetailPanel
        taskId={detailKind === 'task' ? detailId : null}
        open={detailKind === 'task'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        onEdit={(task) => taskUpdateRef.current?.show(task)}
        portalContainer={calendarHolderEl}
        onOpenCase={openCaseWorkspace}
      />
      <AppointmentDetailPanel
        appointmentId={detailKind === 'appointment' ? detailId : null}
        open={detailKind === 'appointment'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        onEdit={(a) => appointmentUpdateRef.current?.show(a)}
        portalContainer={calendarHolderEl}
        onOpenCase={openCaseWorkspace}
      />
      <CaseDateDetailPanel
        event={caseDateDetail}
        open={detailKind === 'case_date'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        portalContainer={calendarHolderEl}
        onViewCase={openCaseWorkspace}
      />

      <TaskCreateModal ref={taskCreateRef} onSuccess={refreshEvents} />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={refreshEvents} />
      <ScheduleAppointmentDialog ref={appointmentCreateRef} onSuccess={refreshEvents} />
      <AppointmentUpdateModal ref={appointmentUpdateRef} onSuccess={refreshEvents} />
    </div>
  );
};

export default CalendarPage;
