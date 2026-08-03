/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Calendar.tsx - Workspace: zero-scroll 100vh layout
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Plus,
  RefreshCw,
  Calendar as CalendarIcon,
  List,
  LayoutDashboard,
  Clock,
  CheckSquare,
  AlertCircle,
  ChevronDown,
  Search,
  Loader2,
  Edit,
  X,
  ChevronRight,
  CalendarDays,
  ListChecks,
  MapPin,
  Info,
  GanttChartSquare,
} from 'lucide-react';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '@/components/ScheduleAppointmentDialog';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/AppointmentUpdateModal';
import CaseDetailDrawer, { CaseDetailDrawerRef } from '@/components/case/CaseDetailDrawer';
import {
  TaskDetailPanel,
  AppointmentDetailPanel,
  SHEET_PANEL,
  EMBEDDED_OVERLAY,
} from '@/components/calendar/EmbeddedDetailPanels';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { apiGetCalendarEvents, apiGetCalendarCaseDateEvents } from '@/services/calendar/api';
import { eventBus } from '../utils/eventBus';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { cn } from '@/lib/utils';
import './Cases.css';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';

type CaseDateSourceType = 'CASE_DEADLINE' | 'CASE_DUE_DATE' | 'CONSULTATION_DATE';

type RelatedCaseRef = {
  id: number;
  reference?: string;
  title?: string;
};

export type CalendarEvent = {
  id: string;
  instance?: any;
  type: 'task' | 'appointment' | 'case_date';
  sourceType?: CaseDateSourceType;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string;
  priority?: string;
  assigned_to?: { id: number; email: string; first_name: string; last_name: string } | null;
  /** Expanded assignee when API returns FK in `assigned_to` */
  assigned_to_details?: { id: number; email: string; first_name: string; last_name: string; image?: string } | null;
  /** Appointment: organizer / cabinet member */
  created_by_details?: { id: number; email: string; first_name: string; last_name: string; image?: string } | null;
  /** Appointment: creator user id when details omitted */
  created_by?: number;
  case_id?: number | null;
  case_title?: string;
  relatedCase?: RelatedCaseRef;
  client?: string | { id: number; email: string; first_name: string; last_name: string };
  /** Raw payload for case-date detail panel */
  raw?: Record<string, unknown>;
};

function normalizeSourceType(s: string): CaseDateSourceType | null {
  const u = s.toUpperCase().replace(/-/g, '_');
  if (u.includes('DEADLINE') || u === 'CASE_DEADLINE') return 'CASE_DEADLINE';
  if (u.includes('CONSULTATION')) return 'CONSULTATION_DATE';
  if (u.includes('DUE') || u === 'CASE_DUE' || u === 'CASE_DUE_DATE') return 'CASE_DUE_DATE';
  return null;
}

function normalizeCaseDateRaw(raw: Record<string, unknown>, index: number): CalendarEvent | null {
  const stRaw = String(raw.sourceType ?? raw.source_type ?? raw.type ?? '');
  const st = normalizeSourceType(stRaw);
  if (!st) return null;
  const start = (raw.start ?? raw.start_at ?? raw.date ?? raw.datetime) as string | undefined;
  if (!start) return null;
  const rc = (raw.relatedCase ?? raw.related_case) as Record<string, unknown> | undefined;
  const caseId = (raw.case_id ?? raw.caseId ?? rc?.id) as number | undefined;
  const idBase = raw.id != null ? String(raw.id) : `idx-${index}`;
  return {
    id: `case-date-${idBase}-${start}`,
    type: 'case_date',
    sourceType: st,
    title: String(raw.title ?? raw.label ?? 'Case date'),
    start,
    end: (raw.end ?? raw.end_at) as string | undefined,
    status: undefined,
    priority: undefined,
    case_id: caseId ?? null,
    relatedCase:
      rc && rc.id != null
        ? {
            id: Number(rc.id),
            reference: rc.reference as string | undefined,
            title: rc.title as string | undefined,
          }
        : caseId
          ? { id: caseId }
          : undefined,
    raw,
  };
}

function calendarListMember(
  event: CalendarEvent
): { id?: number; first_name?: string; last_name?: string; email?: string } | null {
  const e = event as CalendarEvent & { created_by?: number };
  if (e.type === 'appointment' && e.created_by_details) return { ...e.created_by_details, id: e.created_by_details.id };
  if (e.type === 'appointment' && typeof e.created_by === 'number') return { id: e.created_by };
  const d = e.assigned_to_details;
  if (d && typeof d === 'object') return d;
  const a = e.assigned_to;
  if (a && typeof a === 'object' && 'email' in a)
    return a as { id?: number; first_name?: string; last_name?: string; email?: string };
  if (typeof a === 'number') return { id: a };
  return null;
}

function eventMemberFilterId(event: CalendarEvent): number | undefined {
  const e = event as CalendarEvent & { created_by?: number };
  if (e.assigned_to_details?.id != null) return e.assigned_to_details.id;
  if (typeof e.assigned_to === 'object' && e.assigned_to?.id != null) return e.assigned_to.id;
  if (typeof e.assigned_to === 'number') return e.assigned_to;
  if (e.type === 'appointment' && e.created_by_details?.id != null) return e.created_by_details.id;
  if (e.type === 'appointment' && typeof e.created_by === 'number') return e.created_by;
  return undefined;
}

function formatListDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const mon = d.toLocaleString('en-GB', { month: 'short' });
  const y = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${String(day).padStart(2, '0')} ${mon} ${y} · ${time}`;
}

function formatDayMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCountdownDays(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const e = new Date(d);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - t.getTime()) / 86400000);
}

function countdownTone(days: number | null, overdue: boolean): 'critical' | 'warning' | 'normal' {
  if (overdue || (days != null && days < 0)) return 'critical';
  if (days != null && days <= 3) return 'critical';
  if (days != null && days <= 14) return 'warning';
  return 'normal';
}

function isTaskAppointmentOverdue(e: CalendarEvent): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(e.start);
  s.setHours(0, 0, 0, 0);
  if (s.getTime() >= t.getTime()) return false;
  if (e.type === 'task') return e.status !== TaskStatus.DONE;
  if (e.type === 'appointment') return e.status !== 'done' && e.status !== 'cancelled';
  return false;
}

function sourceTypeLabel(st?: CaseDateSourceType): string {
  if (st === 'CASE_DEADLINE') return 'Next Hearing';
  if (st === 'CASE_DUE_DATE') return 'Due Date';
  if (st === 'CONSULTATION_DATE') return 'Consultation';
  return 'Case date';
}

function caseDateTypeBadgeClass(st?: CaseDateSourceType): string {
  if (st === 'CASE_DEADLINE') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/25';
  if (st === 'CASE_DUE_DATE') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/25';
  if (st === 'CONSULTATION_DATE') return 'bg-blue-500/15 text-blue-800 dark:text-blue-400 ring-blue-500/25';
  return 'bg-slate-500/15 text-slate-700 dark:text-slate-400';
}

function pillColorForCalendarEvent(e: CalendarEvent): { bg: string; fg: string } {
  if (e.type === 'case_date') {
    if (e.sourceType === 'CASE_DEADLINE') return { bg: '#e11d48', fg: '#fff' };
    if (e.sourceType === 'CASE_DUE_DATE') return { bg: '#d97706', fg: '#fff' };
    if (e.sourceType === 'CONSULTATION_DATE') return { bg: '#2563eb', fg: '#fff' };
  }
  if (e.type === 'appointment') return { bg: '#059669', fg: '#fff' };
  return { bg: '#4f46e5', fg: '#fff' };
}

function taskPriorityBadgeClass(p?: string): string {
  if (p === TaskPriority.HIGH) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  if (p === TaskPriority.MEDIUM) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

function taskStatusBadgeClass(s?: string): string {
  if (s === TaskStatus.DONE) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === TaskStatus.IN_PROGRESS) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

function appointmentStatusBadgeClass(s?: string): string {
  if (s === 'scheduled') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-blue-500/30';
  if (s === 'done') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === 'cancelled') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30';
}

type DetailKind = 'task' | 'appointment' | 'case_date' | null;

function CaseDateDetailPanel({
  event: ev,
  open,
  onOpenChange,
  portalContainer,
  onViewCase,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portalContainer: HTMLElement | null;
  onViewCase: (caseId: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const caseId = ev?.case_id ?? ev?.relatedCase?.id;
  const days = ev?.start ? getCountdownDays(ev.start) : null;
  const overdue = days != null && days < 0;
  const tone = countdownTone(days, overdue);
  const raw = ev?.raw as Record<string, unknown> | undefined;
  const caseType =
    (raw?.case_type as string) ||
    (raw?.caseType as string) ||
    (raw?.category as string) ||
    '—';
  const caseStatus = (raw?.case_status ?? raw?.status) as string | undefined;
  const assignedName = (raw?.assigned_attorney_name ?? raw?.assigned_to_name ?? raw?.lead_attorney_name) as string | undefined;
  const clientName = (raw?.client_name ?? raw?.client) as string | undefined;

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" container={portalContainer} overlayClassName={EMBEDDED_OVERLAY} className={SHEET_PANEL}>
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4 border-l-[3px] border-l-primary">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {ev?.sourceType && (
                <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset', caseDateTypeBadgeClass(ev.sourceType))}>
                  {sourceTypeLabel(ev.sourceType)}
                </span>
              )}
              <span className="inline-flex rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20">
                {String(caseType).replace(/_/g, ' ')}
              </span>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 dark:text-white pr-2">{ev?.title || '—'}</h2>
          <div className="mt-3 h-px bg-slate-200 dark:bg-slate-800" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {ev && (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Date</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDayMonthYear(ev.start)}</p>
                <p className="text-xs text-slate-500 mt-1">{sourceTypeLabel(ev.sourceType)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      tone === 'critical' && 'text-red-700 dark:text-red-400 font-semibold',
                      tone === 'warning' && 'text-amber-700 dark:text-amber-400',
                      tone === 'normal' && 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {days != null && (overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`)}
                  </span>
                  {overdue && <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">Overdue</span>}
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Case</p>
                {ev.relatedCase?.reference && <p className="font-mono text-xs text-slate-600 dark:text-slate-400">{ev.relatedCase.reference}</p>}
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{ev.relatedCase?.title || '—'}</p>
                {caseStatus && (
                  <span className="mt-2 inline-flex rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20">
                    {String(caseStatus).replace(/_/g, ' ')}
                  </span>
                )}
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">People</p>
                {assignedName && <p className="text-sm text-slate-700 dark:text-slate-300">{assignedName}</p>}
                {clientName && typeof clientName === 'string' && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Client: {clientName}</p>}
              </section>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex shrink-0 justify-end border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3">
          {caseId != null && (
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => {
                onOpenChange(false);
                onViewCase(caseId);
              }}
            >
              View Case
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </footer>
      </SheetContent>
    </Sheet>
  );
}

const CalendarPage: React.FC = () => {
  const lookupCabinet = useCabinetMemberDirectory();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [caseDateItems, setCaseDateItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeLayout, setActiveLayout] = useState<'dashboard' | 'calendar' | 'tasks'>('dashboard');
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const [types, setTypes] = useState<'both' | 'tasks' | 'appointments'>('both');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [assignedTo, setAssignedTo] = useState<string>('all');
  const [caseId, setCaseId] = useState<string>('all');
  const [client, setClient] = useState<string>('');

  const [detailKind, setDetailKind] = useState<DetailKind>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [caseDateDetail, setCaseDateDetail] = useState<CalendarEvent | null>(null);

  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null);

  const [calendarHolderEl, setCalendarHolderEl] = useState<HTMLDivElement | null>(null);
  const caseDetailDrawerRef = useRef<CaseDetailDrawerRef>(null);

  const calendarRef = useRef<FullCalendar | null>(null);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);
  const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);

  const mergedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const e of events) map.set(e.id, e);
    for (const c of caseDateItems) map.set(c.id, c);
    return [...map.values()];
  }, [events, caseDateItems]);

  const loadEvents = useCallback(
    async (start: Date, end: Date) => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          start: start.toISOString(),
          end: end.toISOString(),
          types: types === 'both' ? 'tasks,appointments' : types,
        };
        if (status !== 'all') params.status = status;
        if (priority !== 'all') params.priority = priority;
        if (assignedTo !== 'all') params.assigned_to = assignedTo;
        if (caseId !== 'all') params.case = caseId;
        if (client) params.client = client;
        const [res, caseRes] = await Promise.all([
          apiGetCalendarEvents(params),
          apiGetCalendarCaseDateEvents(start.toISOString(), end.toISOString()),
        ]);
        setEvents(res.data as CalendarEvent[]);
        const normalized: CalendarEvent[] = [];
        const rawArr = caseRes.data as Record<string, unknown>[];
        rawArr.forEach((raw, i) => {
          const n = normalizeCaseDateRaw(raw, i);
          if (n) normalized.push(n);
        });
        setCaseDateItems(normalized);
      } catch {
        setEvents([]);
        setCaseDateItems([]);
      } finally {
        setLoading(false);
      }
    },
    [types, status, priority, assignedTo, caseId, client]
  );

  const refreshEvents = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) loadEvents(api.view.currentStart, api.view.currentEnd);
    else {
      const now = new Date();
      loadEvents(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 2, 0));
    }
  }, [loadEvents]);

  useEffect(() => {
    const onCreated = () => refreshEvents();
    eventBus.on('appointment-created', onCreated);
    eventBus.on('task-created', onCreated);
    return () => {
      eventBus.off('appointment-created', onCreated);
      eventBus.off('task-created', onCreated);
    };
  }, [refreshEvents]);

  useEffect(() => {
    const now = new Date();
    loadEvents(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 2, 0));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAddDropdown && !(e.target as Element).closest('.add-dropdown-root')) setShowAddDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddDropdown]);

  const handleDatesSet = (arg: { start: Date; end: Date }) => {
    setViewRange({ start: arg.start, end: arg.end });
    loadEvents(arg.start, arg.end);
  };

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

  const openCaseDrawer = (id: number) => {
    caseDetailDrawerRef.current?.open({ id } as API.Case);
  };

  const onEventClick = (info: any) => {
    const evt = info.event;
    const ext = evt.extendedProps as CalendarEvent;
    if (ext?.type === 'case_date') {
      openCaseDateDetail(ext);
      return;
    }
    if (ext?.type === 'task') {
      openTaskDetail(parseInt(String(evt.id).replace('task-', ''), 10));
    } else if (ext?.type === 'appointment') {
      openAppointmentDetail(parseInt(String(evt.id).replace('appt-', ''), 10));
    }
  };

  const stats = useMemo(() => {
    const tasks = events.filter((e) => e.type === 'task');
    const appointments = events.filter((e) => e.type === 'appointment');
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter((e) => e.start.startsWith(today));
    const overdueTasks = tasks.filter((t) => t.start < today && t.status !== TaskStatus.DONE);
    return {
      totalTasks: tasks.length,
      totalAppointments: appointments.length,
      todayEvents: todayEvents.length,
      overdueTasks: overdueTasks.length,
      completedTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      inProgressTasks: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      upcomingAppointments: appointments.filter((a) => a.start >= new Date().toISOString()).length,
    };
  }, [events]);

  const todoCount = stats.totalTasks - stats.completedTasks - stats.inProgressTasks;

  const filteredEvents = useMemo(() => {
    return mergedEvents.filter((event) => {
      if (event.type === 'case_date') {
        if (types === 'tasks' || types === 'appointments') return false;
      } else {
        if (types === 'tasks' && event.type !== 'task') return false;
        if (types === 'appointments' && event.type !== 'appointment') return false;
      }
      if (status !== 'all' && event.status !== status) return false;
      if (priority !== 'all' && event.priority !== priority) return false;
      if (assignedTo !== 'all' && eventMemberFilterId(event)?.toString() !== assignedTo) return false;
      if (caseId !== 'all' && event.case_id?.toString() !== caseId) return false;
      if (client && event.client) {
        const clientName =
          typeof event.client === 'string'
            ? event.client
            : event.client && typeof event.client === 'object'
              ? `${event.client.first_name || ''} ${event.client.last_name || ''}`.trim() || event.client.email || ''
              : '';
        if (!clientName.toLowerCase().includes(client.toLowerCase())) return false;
      }
      return true;
    });
  }, [mergedEvents, types, status, priority, assignedTo, caseId, client]);

  const eventsInView = useMemo(() => {
    if (!viewRange) return mergedEvents;
    return mergedEvents.filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= viewRange.start.getTime() && t < viewRange.end.getTime();
    });
  }, [mergedEvents, viewRange]);

  const fcEvents = useMemo(() => {
    return mergedEvents.map((e) => {
      const overdue = (e.type === 'task' || e.type === 'appointment') && isTaskAppointmentOverdue(e);
      const colors = pillColorForCalendarEvent(e);
      const base: any = {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end || e.start,
        allDay: e.allDay,
        extendedProps: { ...e, overdue },
        backgroundColor: overdue ? '#94a3b8' : colors.bg,
        borderColor: 'transparent',
        textColor: overdue ? '#1e293b' : colors.fg,
      };
      if (overdue) {
        base.classNames = ['fc-event-overdue-strike'];
      }
      return base;
    });
  }, [mergedEvents]);

  const upcomingApptList = useMemo(() => {
    const nowIso = new Date().toISOString();
    return events.filter((e) => e.type === 'appointment' && e.start >= nowIso).slice(0, 8);
  }, [events]);

  return (
    <div ref={setCalendarHolderEl} className="relative h-full flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Stats */}
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 sm:px-4 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-slate-500">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Tasks</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalTasks}</p>
                </div>
                <div className="rounded-lg bg-slate-500/12 p-2 text-slate-700 dark:text-slate-300">
                  <ListChecks className="w-4 h-4" aria-hidden />
                </div>
              </div>
            </div>
            <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-emerald-500">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Appointments</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalAppointments}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/12 p-2 text-emerald-700 dark:text-emerald-400">
                  <CalendarIcon className="w-4 h-4" aria-hidden />
                </div>
              </div>
            </div>
            <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-indigo-500">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Today</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.todayEvents}</p>
                </div>
                <div className="rounded-lg bg-indigo-500/12 p-2 text-indigo-700 dark:text-indigo-400">
                  <Clock className="w-4 h-4" aria-hidden />
                </div>
              </div>
            </div>
            <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-red-500">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Overdue</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.overdueTasks}</p>
                </div>
                <div className="rounded-lg bg-red-500/12 p-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" aria-hidden />
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* View tabs + Add (single row) */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950">
        <div className="flex flex-nowrap items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:thin]">
            <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/50 shadow-sm">
              {[
                { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
                { id: 'calendar' as const, label: 'Calendar', icon: CalendarIcon },
                { id: 'tasks' as const, label: 'Tasks & Appointments', icon: List },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveLayout(id)}
                  className={cn(
                    'shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 transition-all',
                    activeLayout === id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{id === 'tasks' ? 'List' : label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="add-dropdown-root relative shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="h-10 px-4 rounded-xl font-semibold shadow-md shadow-primary/15 bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" strokeWidth={2.5} />
              Add
              <ChevronDown className="h-4 w-4 ml-1.5 opacity-80" />
            </Button>
            {showAddDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-50 py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDropdown(false);
                    taskCreateRef.current?.show();
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDropdown(false);
                    appointmentCreateRef.current?.show();
                  }}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4 text-emerald-600" />
                  Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar — stacked above content on mobile, side rail on lg+ */}
        <div className="hidden sm:flex w-full sm:w-[320px] lg:w-[350px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/50 max-h-[40vh] lg:max-h-none">
          <div className="shrink-0 p-3">
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-3">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Task status</p>
              <div className="space-y-3">
                {[
                  { label: 'Completed', count: stats.completedTasks, bar: 'bg-emerald-500', track: 'bg-emerald-500/15' },
                  { label: 'In progress', count: stats.inProgressTasks, bar: 'bg-amber-500', track: 'bg-amber-500/15' },
                  { label: 'To do', count: todoCount, bar: 'bg-slate-400', track: 'bg-slate-200 dark:bg-slate-700' },
                ].map(({ label, count, bar, track }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
                      <span className="text-[10px] font-semibold tabular-nums rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0 text-slate-700 dark:text-slate-300">
                        {count}
                      </span>
                    </div>
                    <div className={cn('h-1.5 rounded-full overflow-hidden', track)}>
                      <div className={cn('h-full rounded-full transition-all', bar)} style={{ width: `${stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 pb-3">
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col min-h-0 flex-1">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
                Activity
              </p>
              <div className="flex-1 overflow-y-auto">
                {events.slice(0, 20).map((event, idx, arr) => (
                  <div
                    key={event.id}
                    className={cn('border-b border-slate-100 dark:border-slate-800/80 last:border-0', idx === 0 && 'rounded-t-none')}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (event.type === 'task') openTaskDetail(parseInt(String(event.id).replace('task-', ''), 10));
                        else openAppointmentDetail(parseInt(String(event.id).replace('appt-', ''), 10));
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', event.type === 'task' ? 'bg-indigo-500' : 'bg-emerald-500')} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{event.title}</span>
                            <span
                              className={cn(
                                'text-[9px] font-semibold uppercase px-1.5 py-0 rounded-full shrink-0',
                                event.type === 'task' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              )}
                            >
                              {event.type === 'task' ? 'Task' : 'Appt'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {event.type === 'task' ? 'Task' : 'Appointment'} · {new Date(event.start).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
                {events.length === 0 && <p className="text-xs text-slate-500 py-6 text-center px-3">No activity</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 px-3 sm:px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-[140px] max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className={cn(
                      'h-10 pl-9 pr-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950',
                      client.trim() !== '' && 'ring-2 ring-primary/25 border-primary/35'
                    )}
                  />
                  {client.trim() !== '' && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setClient('')}
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Select value={types} onValueChange={(v: any) => setTypes(v)}>
                  <SelectTrigger
                    className={cn(
                      'h-10 w-[130px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700',
                      types !== 'both' && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">All</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="appointments">Appointments</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger
                    className={cn(
                      'h-10 w-[118px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700',
                      status !== 'all' && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger
                    className={cn(
                      'h-10 w-[108px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700',
                      priority !== 'all' && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg shrink-0" onClick={refreshEvents} disabled={loading} aria-label="Refresh">
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
            {activeLayout === 'dashboard' && (
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-[0_4px_14px_rgba(15,23,42,0.06)] p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming appointments</p>
                      <span className="text-[11px] font-semibold tabular-nums rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 px-2 py-0.5">
                        {upcomingApptList.length}
                      </span>
                    </div>
                    <div className="space-y-0">
                      {upcomingApptList.map((a) => {
                        const pending = a.status === 'pending' || a.status === 'todo';
                        const border = pending ? 'border-l-amber-500' : 'border-l-emerald-500';
                        const start = new Date(a.start);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => openAppointmentDetail(parseInt(String(a.id).replace('appt-', ''), 10))}
                            className={cn(
                              'w-full text-left border rounded-lg border-slate-200 dark:border-slate-800 border-l-[3px] pl-3 pr-3 py-2.5 mb-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                              border
                            )}
                          >
                            <p className="text-[11px] font-medium text-slate-500 tabular-nums">
                              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.title}</p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                              {typeof a.client === 'object' && a.client && (
                                <span>
                                  {`${(a.client as any).first_name || ''} ${(a.client as any).last_name || ''}`.trim()}
                                </span>
                              )}
                              {a.end && a.start && (
                                <span>
                                  {Math.max(1, Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000))} min
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {upcomingApptList.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No upcoming appointments</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Nothing scheduled from today onward in the current calendar range.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-[0_4px_14px_rgba(15,23,42,0.06)] p-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Recent</p>
                    <div className="space-y-0">
                      {events.slice(0, 8).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() =>
                            e.type === 'task'
                              ? openTaskDetail(parseInt(String(e.id).replace('task-', ''), 10))
                              : openAppointmentDetail(parseInt(String(e.id).replace('appt-', ''), 10))
                          }
                          className="w-full flex items-start gap-2 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                        >
                          <span className={cn('mt-1 w-2 h-2 rounded-full shrink-0', e.type === 'task' ? 'bg-indigo-500' : 'bg-emerald-500')} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title}</span>
                              <span
                                className={cn(
                                  'text-[9px] uppercase font-bold px-1.5 py-0 rounded-full',
                                  e.type === 'task' ? 'bg-indigo-500/15 text-indigo-700' : 'bg-emerald-500/15 text-emerald-700'
                                )}
                              >
                                {e.type === 'task' ? 'Task' : 'Appt'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{new Date(e.start).toLocaleString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {events.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No events</p>}
                  </div>
                </div>
              </div>
            )}

            {activeLayout === 'calendar' && (
              <div className="h-full flex flex-col min-h-0 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-[0_4px_14px_rgba(15,23,42,0.06)] overflow-hidden">
                <div className="flex-1 min-h-0 relative fc-calendar-card">
                  <FullCalendar
                    ref={calendarRef as any}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={typeof window !== 'undefined' && window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'}
                    headerToolbar={
                      typeof window !== 'undefined' && window.innerWidth < 768
                        ? { start: 'prev,next', center: 'title', end: 'today listWeek dayGridMonth' }
                        : {
                            start: 'prev,next today',
                            center: 'title',
                            end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                          }
                    }
                    buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day', list: 'Agenda' }}
                    titleFormat={{ year: 'numeric', month: 'long' }}
                    height="100%"
                    events={fcEvents}
                    eventClick={onEventClick}
                    datesSet={handleDatesSet}
                    nowIndicator
                    selectable={false}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                    eventClassNames={(arg) => {
                      const ext = (arg.event.extendedProps || {}) as CalendarEvent & { overdue?: boolean };
                      const list: string[] = [];
                      if (ext?.type === 'task') list.push('task-event', `task-${ext.priority || 'low'}`);
                      if (ext?.type === 'appointment') list.push('appointment-event');
                      if (ext?.type === 'case_date') list.push('case-date-event', `case-date-${ext.sourceType || ''}`);
                      return list;
                    }}
                    dayMaxEvents={3}
                    moreLinkClick="popover"
                    eventDisplay="block"
                    windowResize={() => {
                      const api = calendarRef.current?.getApi();
                      if (!api) return;
                      const mobile = window.innerWidth < 768;
                      api.setOption(
                        'headerToolbar',
                        mobile
                          ? { start: 'prev,next', center: 'title', end: 'today listWeek dayGridMonth' }
                          : {
                              start: 'prev,next today',
                              center: 'title',
                              end: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
                            }
                      );
                      if (mobile) {
                        if (api.view.type !== 'listWeek') api.changeView('listWeek');
                      } else if (api.view.type === 'listWeek') {
                        api.changeView('dayGridMonth');
                      }
                    }}
                    viewDidMount={() => {
                      const api = calendarRef.current?.getApi();
                      if (api && window.innerWidth < 768 && api.view.type !== 'listWeek') {
                        api.changeView('listWeek');
                      }
                    }}
                    dayHeaderContent={(arg) => <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{arg.text}</span>}
                    dayCellClassNames={(arg) => {
                      const cls: string[] = [];
                      if (arg.isToday) cls.push('fc-day-today-jure');
                      const d = arg.date.getDay();
                      if (d === 0 || d === 6) cls.push('fc-day-weekend-jure');
                      return cls;
                    }}
                    eventContent={(arg) => {
                      const event = arg.event;
                      const ext = event.extendedProps as any;
                      const time = event.start
                        ? new Date(event.start as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '';
                      const strike = ext?.overdue ? 'line-through opacity-80' : '';
                      return {
                        html: `<div class="fc-event-main-frame"><div class="fc-event-title-container"><div class="fc-event-title fc-sticky ${strike}">${event.title}</div></div>${time ? `<div class="fc-event-time">${time}</div>` : ''}</div>`,
                      };
                    }}
                  />
                  {viewRange && eventsInView.length === 0 && !loading && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/60 backdrop-blur-[1px] z-[5]">
                      <CalendarDays className="h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No events scheduled for this period</p>
                      <div className="pointer-events-auto mt-4 flex flex-wrap gap-2 justify-center">
                        <Button size="sm" className="rounded-lg" onClick={() => taskCreateRef.current?.show()}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => appointmentCreateRef.current?.show()}>
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Schedule Appointment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
                  {[
                    { k: 'Task', class: 'bg-indigo-600' },
                    { k: 'Appointment', class: 'bg-emerald-600' },
                    { k: 'Case deadline', class: 'bg-rose-600' },
                    { k: 'Admin due', class: 'bg-amber-600' },
                    { k: 'Consultation', class: 'bg-blue-600' },
                  ].map(({ k, class: c }) => (
                    <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                      <span className={cn('w-2 h-2 rounded-full', c)} />
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeLayout === 'tasks' && (
              <div className="h-full overflow-y-auto rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <GanttChartSquare className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No items match your filters</p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Button size="sm" className="rounded-lg" onClick={() => taskCreateRef.current?.show()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => appointmentCreateRef.current?.show()}>
                        Schedule Appointment
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="hidden sm:grid grid-cols-[100px_1fr_150px_140px_100px_90px_32px] gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                      <span>Type</span>
                      <span>Title</span>
                      <span>Date</span>
                      <span>Assigned</span>
                      <span>Status</span>
                      <span className="text-right">Priority</span>
                      <span />
                    </div>
                    {filteredEvents.map((event, i) => {
                      const isCaseDate = event.type === 'case_date';
                      const typeLabel =
                        event.type === 'task'
                          ? 'Task'
                          : event.type === 'appointment'
                            ? 'Appointment'
                            : event.sourceType === 'CASE_DEADLINE'
                              ? 'Hearing'
                              : event.sourceType === 'CASE_DUE_DATE'
                                ? 'Due Date'
                                : 'Consultation';
                      const typePill =
                        event.type === 'task'
                          ? 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-400 ring-indigo-500/25'
                          : event.type === 'appointment'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 ring-emerald-500/25'
                            : event.sourceType === 'CASE_DEADLINE'
                              ? 'bg-rose-500/15 text-rose-800 dark:text-rose-400 ring-rose-500/25'
                              : event.sourceType === 'CASE_DUE_DATE'
                                ? 'bg-amber-500/15 text-amber-900 dark:text-amber-400 ring-amber-500/25'
                                : 'bg-blue-500/15 text-blue-800 dark:text-blue-400 ring-blue-500/25';

                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => {
                            if (isCaseDate) {
                              const cid = event.case_id ?? event.relatedCase?.id;
                              if (cid != null) {
                                openCaseDrawer(cid);
                                return;
                              }
                              openCaseDateDetail(event);
                              return;
                            }
                            if (event.type === 'task') openTaskDetail(parseInt(String(event.id).replace('task-', ''), 10));
                            else if (event.type === 'appointment') openAppointmentDetail(parseInt(String(event.id).replace('appt-', ''), 10));
                          }}
                          className={cn(
                            'w-full grid sm:grid-cols-[100px_1fr_150px_140px_100px_90px_32px] gap-2 px-4 py-3 text-left border-b border-slate-100 dark:border-slate-800/80 items-center transition-colors hover:bg-indigo-500/[0.06]',
                            i % 2 === 0 ? 'bg-white dark:bg-slate-950/20' : 'bg-slate-50/80 dark:bg-slate-900/30'
                          )}
                        >
                          <span className={cn('inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset w-fit', typePill)}>
                            {typeLabel}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</span>
                            {isCaseDate && event.relatedCase?.reference && (
                              <span className="ml-2 font-mono text-[11px] text-slate-500">{event.relatedCase.reference}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{formatListDate(event.start)}</span>
                          <div className="flex items-center gap-2 min-w-0">
                            {(() => {
                              const m = calendarListMember(event);
                              const uid = m?.id ?? eventMemberFilterId(event);
                              const cab = uid != null ? lookupCabinet(uid) : undefined;
                              const imageUrl =
                                (m && getPersonImage(m as unknown as Record<string, unknown>)) ?? cab?.image;
                              const first = m?.first_name ?? cab?.first_name;
                              const last = m?.last_name ?? cab?.last_name;
                              const email = m?.email ?? cab?.email;
                              const label = `${first || ''} ${last || ''}`.trim() || email;
                              return m || cab ? (
                                <>
                                  <UserAvatar
                                    size="xs"
                                    image={imageUrl}
                                    firstName={first}
                                    lastName={last}
                                    email={email}
                                  />
                                  <span className="text-xs text-slate-500 truncate">{label || '—'}</span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              );
                            })()}
                          </div>
                          <span className="text-[11px] font-medium uppercase text-slate-600 dark:text-slate-400">
                            {isCaseDate ? sourceTypeLabel(event.sourceType) : event.status?.replace(/_/g, ' ') || '—'}
                          </span>
                          <span className="text-right text-[11px]">
                            {event.priority === TaskPriority.HIGH || String(event.priority || '').toLowerCase() === 'urgent' ? (
                              <span className="inline-flex rounded-full bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-700 dark:text-rose-400">
                                {String(event.priority || '').toLowerCase() === 'urgent' ? 'URGENT' : 'HIGH'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 justify-self-end hidden sm:block" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDetailPanel
        taskId={detailKind === 'task' ? detailId : null}
        open={detailKind === 'task'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        onEdit={(t) => taskUpdateRef.current?.show(t)}
        portalContainer={calendarHolderEl}
        onOpenCase={openCaseDrawer}
      />
      <AppointmentDetailPanel
        appointmentId={detailKind === 'appointment' ? detailId : null}
        open={detailKind === 'appointment'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        onEdit={(a) => appointmentUpdateRef.current?.show(a)}
        portalContainer={calendarHolderEl}
        onOpenCase={openCaseDrawer}
      />
      <CaseDateDetailPanel
        event={caseDateDetail}
        open={detailKind === 'case_date'}
        onOpenChange={(v) => !v && closeDetailPanels()}
        portalContainer={calendarHolderEl}
        onViewCase={openCaseDrawer}
      />

      <CaseDetailDrawer ref={caseDetailDrawerRef} portalContainer={calendarHolderEl} />

      <TaskCreateModal ref={taskCreateRef} onSuccess={refreshEvents} />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={refreshEvents} />
      <ScheduleAppointmentDialog ref={appointmentCreateRef} onSuccess={refreshEvents} />
      <AppointmentUpdateModal ref={appointmentUpdateRef} onSuccess={refreshEvents} />
    </div>
  );
};

export default CalendarPage;
