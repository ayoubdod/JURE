'use client';

import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CheckSquare, Clock, Edit, Loader2, MapPin, X } from 'lucide-react';
import { apiGetTask } from '@/services/task/api';
import { apiGetAppointment, Appointment } from '@/services/appointment/api';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { cn } from '@/lib/utils';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';
import { useAppTranslation } from '@/i18n';

export const SHEET_PANEL =
  'flex flex-col gap-0 !p-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-xl [&>button]:hidden !absolute !right-0 !top-0 !h-full !w-[min(100%,420px)] !max-w-[420px] !sm:max-w-[420px]';

export const EMBEDDED_OVERLAY = '!bg-transparent pointer-events-auto';

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

/** Backend often sends FK in `assigned_to` and the expanded user in `assigned_to_details`. */
function taskAssigneeUser(task: API.Task | null): API.User | null {
  if (!task) return null;
  const details = task.assigned_to_details;
  if (details && typeof details === 'object' && (details as API.User).email) return details;
  const raw = task.assigned_to as unknown;
  if (raw && typeof raw === 'object' && raw !== null && 'email' in raw) return raw as API.User;
  return null;
}

export function TaskDetailPanel({
  taskId,
  open,
  onOpenChange,
  onEdit,
  portalContainer,
  onOpenCase,
  /** When set (e.g. case drawer open), hide the related-case row if it is this case — avoids redundant navigation. */
  contextCaseId = null,
  onComplete,
}: {
  taskId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (task: API.Task) => void;
  portalContainer: HTMLElement | null;
  onOpenCase: (id: number) => void;
  contextCaseId?: number | null;
  /** Optional quick-complete handler (e.g. dashboard). Hidden when task is already done. */
  onComplete?: (task: API.Task) => void | Promise<void>;
}) {
  const { enumPretty } = useAppTranslation();
  const lookupCabinet = useCabinetMemberDirectory();
  const [task, setTask] = useState<API.Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      setLoading(true);
      apiGetTask(taskId)
        .then((r) => setTask(r.data as API.Task))
        .catch(() => setTask(null))
        .finally(() => setLoading(false));
    } else {
      setTask(null);
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const ext = task as API.Task & { case_id?: number; case?: number; case_title?: string; reference?: string };
  const relatedCaseId = ext?.case_id ?? ext?.case ?? null;
  const showRelatedCaseLink =
    relatedCaseId != null && (contextCaseId == null || relatedCaseId !== contextCaseId);

  const dueIso = task?.due_date || null;
  const days = dueIso ? getCountdownDays(dueIso) : null;
  const overdue = days != null && days < 0;
  const tone = countdownTone(days, overdue);
  const assignee = task ? taskAssigneeUser(task) : null;
  const rawAssigned = task?.assigned_to as unknown;
  const assigneeUserId =
    assignee?.id ??
    (typeof rawAssigned === 'number' ? rawAssigned : undefined) ??
    (task?.assigned_to_details as API.User | undefined)?.id;
  const cabinetRow = assigneeUserId != null ? lookupCabinet(assigneeUserId) : undefined;
  const assigneeAvatarUrl = getPersonImage(assignee as unknown as Record<string, unknown>) ?? cabinetRow?.image;
  const assigneeLabel =
    assignee && `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim()
      ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
      : cabinetRow
        ? `${cabinetRow.first_name} ${cabinetRow.last_name}`.trim() || cabinetRow.email
        : assigneeUserId != null
          ? '—'
          : 'Unassigned';

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" container={portalContainer} overlayClassName={EMBEDDED_OVERLAY} className={SHEET_PANEL}>
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/25">
                Task
              </span>
              {(task?.priority === TaskPriority.HIGH || String(task?.priority || '').toLowerCase() === 'urgent') && (
                <span className="inline-flex rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/25">
                  {enumPretty(task?.priority)}
                </span>
              )}
              {task?.status && (
                <span
                  className={cn(
                    'inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
                    taskStatusBadgeClass(task.status)
                  )}
                >
                  {enumPretty(task.status)}
                </span>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 dark:text-white pr-2">{task?.title || '—'}</h2>
          <div className="mt-3 h-px bg-slate-200 dark:border-slate-800 dark:bg-slate-800" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : task ? (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Details</p>
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap min-h-[3rem]">
                  {task.description || '—'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', taskPriorityBadgeClass(task.priority))}>
                    {enumPretty(task.priority) || '—'}
                  </span>
                  <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', taskStatusBadgeClass(task.status))}>
                    {enumPretty(task.status) || '—'}
                  </span>
                </div>
                {task.estimated_hours && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{task.estimated_hours} h estimated</span>
                  </p>
                )}
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Assignment &amp; timeline</p>
                <div className="flex items-center gap-2 text-sm">
                  <UserAvatar
                    size="sm"
                    image={assigneeAvatarUrl}
                    firstName={assignee?.first_name ?? cabinetRow?.first_name}
                    lastName={assignee?.last_name ?? cabinetRow?.last_name}
                    email={assignee?.email ?? cabinetRow?.email}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{assigneeLabel}</span>
                </div>
                {dueIso && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={cn(
                        tone === 'critical' && 'text-red-700 dark:text-red-400 font-semibold',
                        tone === 'warning' && 'text-amber-700 dark:text-amber-400',
                        tone === 'normal' && 'text-slate-600 dark:text-slate-400'
                      )}
                    >
                      Due {formatDayMonthYear(dueIso)}
                      {days != null && !overdue && ` · ${days === 0 ? 'Today' : `in ${days}d`}`}
                    </span>
                    {overdue && (
                      <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-400">Overdue</span>
                    )}
                  </div>
                )}
              </section>

              {(showRelatedCaseLink || (task.client && typeof task.client === 'object')) && (
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Related</p>
                  {showRelatedCaseLink && (
                    <button
                      type="button"
                      className="text-left w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                      onClick={() => onOpenCase(relatedCaseId!)}
                    >
                      <span className="font-mono text-xs text-slate-500">{ext.reference || `#${relatedCaseId}`}</span>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{ext.case_title || 'View case'}</p>
                    </button>
                  )}
                  {task.client && typeof task.client === 'object' && (
                    <p className={cn('text-sm text-slate-600 dark:text-slate-400', showRelatedCaseLink && 'mt-2')}>
                      Client:{' '}
                      {`${(task.client as { first_name?: string; last_name?: string; email?: string }).first_name || ''} ${(task.client as { first_name?: string; last_name?: string }).last_name || ''}`.trim() ||
                        (task.client as { email?: string }).email ||
                        '—'}
                    </p>
                  )}
                </section>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">Task not found</p>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {task?.due_date ? `Due: ${formatDayMonthYear(task.due_date)}` : ''}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {task && onComplete && task.status !== TaskStatus.DONE && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={completing}
                onClick={async () => {
                  setCompleting(true);
                  try {
                    await onComplete(task);
                    setTask({ ...task, status: TaskStatus.DONE });
                  } finally {
                    setCompleting(false);
                  }
                }}
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                )}
                Mark done
              </Button>
            )}
            {task && (
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(task);
                }}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Task
              </Button>
            )}
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

export function AppointmentDetailPanel({
  appointmentId,
  open,
  onOpenChange,
  onEdit,
  portalContainer,
  onOpenCase,
  contextCaseId = null,
}: {
  appointmentId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (a: Appointment) => void;
  portalContainer: HTMLElement | null;
  onOpenCase: (id: number) => void;
  contextCaseId?: number | null;
}) {
  const { enumPretty } = useAppTranslation();
  const lookupCabinet = useCabinetMemberDirectory();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && appointmentId) {
      setLoading(true);
      apiGetAppointment(appointmentId)
        .then((r) => setAppointment(r.data))
        .catch(() => setAppointment(null))
        .finally(() => setLoading(false));
    } else {
      setAppointment(null);
    }
  }, [open, appointmentId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const durationMin =
    appointment && appointment.start_at && appointment.end_at
      ? Math.max(0, Math.round((new Date(appointment.end_at).getTime() - new Date(appointment.start_at).getTime()) / 60000))
      : null;

  const clientName = appointment?.client_details
    ? `${appointment.client_details.first_name || ''} ${appointment.client_details.last_name || ''}`.trim() || appointment.client_details.email
    : null;

  const showAppointmentCaseLink =
    appointment != null &&
    appointment.case != null &&
    (contextCaseId == null || appointment.case !== contextCaseId);

  const creatorUserId =
    appointment?.created_by_details?.id ?? (typeof appointment?.created_by === 'number' ? appointment.created_by : undefined);
  const cabinetCreator = creatorUserId != null ? lookupCabinet(creatorUserId) : undefined;
  const clientUserId = appointment?.client_details?.id;
  const cabinetClient = clientUserId != null ? lookupCabinet(clientUserId) : undefined;

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" container={portalContainer} overlayClassName={EMBEDDED_OVERLAY} className={SHEET_PANEL}>
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/25">
                Appointment
              </span>
              {appointment?.status && (
                <span
                  className={cn(
                    'inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
                    appointmentStatusBadgeClass(appointment.status)
                  )}
                >
                  {enumPretty(appointment.status)}
                </span>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 dark:text-white pr-2">{appointment?.title || '—'}</h2>
          <div className="mt-3 h-px bg-slate-200 dark:bg-slate-800" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : appointment ? (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Schedule</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDayMonthYear(appointment.start_at)}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {new Date(appointment.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {new Date(appointment.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {durationMin != null && (
                  <span className="mt-2 inline-flex rounded-md bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {durationMin} min
                  </span>
                )}
                {appointment.location ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    {appointment.location}
                  </p>
                ) : null}
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">People</p>
                {appointment.created_by_details && (
                  <div className="flex items-center gap-2 mb-3">
                    <UserAvatar
                      size="sm"
                      image={
                        getPersonImage(appointment.created_by_details as unknown as Record<string, unknown>) ??
                        cabinetCreator?.image
                      }
                      firstName={appointment.created_by_details.first_name}
                      lastName={appointment.created_by_details.last_name}
                      email={appointment.created_by_details.email}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Scheduled by</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {`${appointment.created_by_details.first_name || ''} ${appointment.created_by_details.last_name || ''}`.trim() ||
                          appointment.created_by_details.email}
                      </p>
                    </div>
                  </div>
                )}
                {clientName && (
                  <div className="flex items-center gap-2 mb-2">
                    {appointment.client_details && (
                      <UserAvatar
                        size="sm"
                        image={
                          getPersonImage(appointment.client_details as unknown as Record<string, unknown>) ??
                          cabinetClient?.image
                        }
                        firstName={appointment.client_details.first_name}
                        lastName={appointment.client_details.last_name}
                        email={appointment.client_details.email}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Client</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200">{clientName}</p>
                    </div>
                  </div>
                )}
                {showAppointmentCaseLink && (
                  <button
                    type="button"
                    className="mt-2 w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    onClick={() => onOpenCase(appointment.case!)}
                  >
                    <span className="font-mono text-xs text-slate-500">Case</span>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{appointment.case_title || `Case #${appointment.case}`}</p>
                  </button>
                )}
              </section>

              {appointment.description ? (
                <section>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">Notes</p>
                  <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {appointment.description}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">Appointment not found</p>
          )}
        </div>

        <footer className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {appointment ? new Date(appointment.start_at).toLocaleString() : ''}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {appointment && (
              <Button
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(appointment);
                }}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit Appointment
              </Button>
            )}
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
