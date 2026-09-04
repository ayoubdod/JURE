'use client';

import React from 'react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Plus,
  User,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import type { Appointment } from '@/services/appointment/api';
import { useAppTranslation } from '@/i18n';
import { clientDisplayName } from '@/services/case/caseType';

function formatDayMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function taskStatusPill(s?: string): string {
  if (s === TaskStatus.DONE) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === TaskStatus.IN_PROGRESS) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  if (s === TaskStatus.CANCELLED) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

function appointmentStatusPill(s?: string): string {
  if (s === 'scheduled') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-blue-500/30';
  if (s === 'done') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === 'cancelled') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

function dueTone(
  dueIso: string | null | undefined,
  status?: string
): { cls: string; overdue: boolean; label: string } {
  if (!dueIso) return { cls: 'text-slate-500 dark:text-slate-400', overdue: false, label: '' };
  const days = getCountdownDays(dueIso);
  const overdue = days != null && days < 0 && status !== TaskStatus.DONE;
  if (overdue) return { cls: 'text-red-700 dark:text-red-400 font-semibold', overdue: true, label: 'Due: ' + formatDayMonthYear(dueIso) };
  if (days == null) return { cls: 'text-slate-500 dark:text-slate-400', overdue: false, label: 'Due: ' + formatDayMonthYear(dueIso) };
  const style = getCountdownStyle(days);
  const base =
    style === 'critical'
      ? 'text-red-700 dark:text-red-400 font-semibold'
      : style === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';
  return { cls: base, overdue: false, label: 'Due: ' + formatDayMonthYear(dueIso) };
}

function showPriorityPill(p?: string): boolean {
  const u = String(p || '').toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

export interface RelatedTasksAppointmentsSectionProps {
  caseItem: API.Case;
  onAddTask: () => void;
  onScheduleAppointment: () => void;
  onOpenTask: (taskId: number) => void;
  onOpenAppointment: (appointmentId: number) => void;
  showTasks?: boolean;
  showAppointments?: boolean;
  bare?: boolean;
}

export function RelatedTasksAppointmentsSection({
  caseItem,
  onAddTask,
  onScheduleAppointment,
  onOpenTask,
  onOpenAppointment,
  showTasks = true,
  showAppointments = true,
  bare = false,
}: RelatedTasksAppointmentsSectionProps) {
  const { enumPretty, t } = useAppTranslation();
  const rel = caseItem._related;
  const tasks = showTasks ? (rel?.tasks ?? []) : [];
  const appointments = showAppointments ? ((rel?.appointments ?? []) as Appointment[]) : [];

  const tc = caseItem._counts;
  const taskCount = typeof tc?.tasks === 'number' ? tc.tasks : tasks.length;
  const apptCount = typeof tc?.appointments === 'number' ? tc.appointments : appointments.length;

  const bothEmpty = tasks.length === 0 && appointments.length === 0;
  const showCombinedEmpty = bothEmpty && showTasks && showAppointments;

  return (
    <section
      className={bare ? undefined : 'mt-8 border-t border-slate-200/90 dark:border-slate-800 pt-6'}
    >
      <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          {showTasks && showAppointments
            ? `${t.cases.pageWorkspace.tabs.tasks} & ${t.cases.pageWorkspace.tabs.appointments}`
            : showTasks
              ? t.cases.pageWorkspace.tabs.tasks
              : t.cases.pageWorkspace.tabs.appointments}
        </h3>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
          Tasks ({taskCount}) · Appointments ({apptCount})
        </span>
      </div>

      {showCombinedEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-8 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" aria-hidden />
          <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">
            No tasks or appointments linked to this case yet
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" size="sm" variant="default" className="h-8 gap-1" onClick={onAddTask}>
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={onScheduleAppointment}>
              <Plus className="h-3.5 w-3.5" />
              Schedule Appointment
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {showTasks ? (
            <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">Tasks</span>
                <span className="text-[10px] font-medium rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 tabular-nums text-slate-700 dark:text-slate-300">
                  {tasks.length}
                </span>
              </div>
              <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={onAddTask}>
                <Plus className="h-3 w-3" />
                Add Task
              </Button>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 px-3 py-4 text-center">
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">No tasks linked to this case</p>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px] gap-1" onClick={onAddTask}>
                  <Plus className="h-3 w-3" />
                  Add Task
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => {
                  const due = dueTone(t.due_date, t.status);
                  const assignee = t.assigned_to
                    ? `${t.assigned_to.first_name || ''} ${t.assigned_to.last_name || ''}`.trim() || t.assigned_to.email
                    : '—';
                  return (
                    <li
                      key={t.id}
                      className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/35 p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start gap-1.5 mb-1.5">
                        {showPriorityPill(t.priority) && (
                          <span className="inline-flex rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/25">
                            {enumPretty(t.priority)}
                          </span>
                        )}
                        {t.status && (
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
                              taskStatusPill(t.status)
                            )}
                          >
                            {enumPretty(t.status)}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white pr-8">{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                          {assignee}
                        </span>
                        {t.due_date && (
                          <span className={cn('inline-flex items-center gap-1', due.cls)}>
                            <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                            {due.label}
                            {due.overdue && (
                              <span className="ml-1 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:text-red-400">
                                Overdue
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {t.estimated_hours ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" aria-hidden />
                            Estimated: {t.estimated_hours}h
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          aria-label="Open task"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTask(t.id);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          ) : null}

          {showAppointments ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">Appointments</span>
                <span className="text-[10px] font-medium rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 tabular-nums text-slate-700 dark:text-slate-300">
                  {appointments.length}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={onScheduleAppointment}
              >
                <Plus className="h-3 w-3" />
                Schedule
              </Button>
            </div>
            {appointments.length === 0 ? (
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 px-3 py-4 text-center">
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">No appointments linked to this case</p>
                <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px] gap-1" onClick={onScheduleAppointment}>
                  <Plus className="h-3 w-3" />
                  Schedule
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {appointments.map((a) => {
                  const clientName = a.client_details
                    ? `${clientDisplayName(a.client_details) || a.client_details.email}`
                    : null;
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white/70 dark:bg-slate-900/35 p-3 shadow-sm"
                    >
                      {a.status && (
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset mb-2',
                            appointmentStatusPill(a.status)
                          )}
                        >
                          {enumPretty(a.status)}
                        </span>
                      )}
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white pr-8">{a.title}</p>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <Calendar className="inline h-3 w-3 mr-1 opacity-70 align-text-bottom" aria-hidden />
                        {formatDayMonthYear(a.start_at)} ·{' '}
                        {new Date(a.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
                        {new Date(a.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="min-w-0 space-y-0.5">
                          {a.meeting_type === 'video' || (!a.location && a.conversation) ? (
                            <span className="flex items-center gap-1">
                              <Video className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              <span>{t.calendar.jureConference}</span>
                            </span>
                          ) : a.location ? (
                            <span className="flex items-start gap-1">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5 opacity-70" aria-hidden />
                              <span className="break-words">{a.location}</span>
                            </span>
                          ) : null}
                          {clientName ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              {clientName}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          aria-label="Open appointment"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAppointment(a.id);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
