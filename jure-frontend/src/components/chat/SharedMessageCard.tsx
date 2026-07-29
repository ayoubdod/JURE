'use client';

import React from 'react';
import { Calendar, CheckSquare, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/utils/constants';

export type SharedMessageKind = 'SHARED_CASE' | 'SHARED_TASK' | 'SHARED_APPOINTMENT';

function parseEntityId(id: string | number | undefined | null): number | null {
  if (id == null) return null;
  const n = typeof id === 'number' ? id : parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function caseBorderClass(caseType: string | null | undefined): string {
  const t = String(caseType || '').toUpperCase();
  if (t === 'LITIGATION') return 'border-l-rose-500';
  if (t === 'CONSULTATION') return 'border-l-indigo-500';
  return 'border-l-amber-400';
}

function caseTypeBadgeLabel(caseType: string | null | undefined): string {
  return String(caseType || '').replace(/_/g, ' ') || 'CASE';
}

function statusPill(): string {
  return 'text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/20';
}

function formatDayMonth(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDurationMinutes(minutes?: number | null): string {
  if (minutes == null || minutes <= 0) return '';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function priorityPill(p?: string | null): boolean {
  if (p == null) return false;
  const u = String(p).toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function isCanonicalSharedItem(x: unknown): x is API.SharedItem {
  if (!x || typeof x !== 'object') return false;
  const t = (x as API.SharedItem).type;
  return t === 'CASE' || t === 'TASK' || t === 'APPOINTMENT';
}

/** Legacy embed shapes from older frontend / partial payloads */
function legacyToSharedItem(raw: Record<string, unknown>, mt: API.MessageType): API.SharedItem | null {
  if (mt === 'SHARED_CASE') {
    const id = raw.id != null ? String(raw.id) : '';
    if (!id) return null;
    return {
      type: 'CASE',
      id,
      title: String(raw.title ?? ''),
      status: String(raw.status ?? ''),
      priority: (raw.priority as string) ?? null,
      reference: (raw.reference as string) ?? null,
      dueDate: null,
      caseType: String(raw.caseType ?? raw.case_type ?? '') || null,
      assignedTo: raw.assigned_to_name
        ? { id: 0, name: String(raw.assigned_to_name) }
        : raw.assignedTo && typeof raw.assignedTo === 'object'
          ? (raw.assignedTo as { id: number; name: string })
          : null,
    };
  }
  if (mt === 'SHARED_TASK') {
    const id = raw.id != null ? String(raw.id) : '';
    if (!id) return null;
    return {
      type: 'TASK',
      id,
      title: String(raw.title ?? ''),
      status: String(raw.status ?? ''),
      priority: (raw.priority as string) ?? null,
      reference: null,
      dueDate: (raw.dueDate as string) ?? (raw.due_date as string) ?? null,
      caseType: null,
      assignedTo: null,
    };
  }
  if (mt === 'SHARED_APPOINTMENT') {
    const id = raw.id != null ? String(raw.id) : '';
    if (!id) return null;
    const date = (raw.date as string) ?? (raw.start_at as string) ?? null;
    return {
      type: 'APPOINTMENT',
      id,
      title: String(raw.title ?? ''),
      status: String(raw.status ?? ''),
      priority: null,
      reference: null,
      dueDate: null,
      caseType: null,
      assignedTo: null,
      date,
      duration: (raw.duration as number) ?? (raw.duration_minutes as number) ?? null,
    };
  }
  return null;
}

function syntheticSharedItem(
  mt: API.MessageType,
  ids: { caseId: number | null; taskId: number | null; appointmentId: number | null }
): API.SharedItem | null {
  if (mt === 'SHARED_CASE' && ids.caseId != null) {
    return {
      type: 'CASE',
      id: String(ids.caseId),
      title: '',
      status: '',
      priority: null,
      reference: null,
      dueDate: null,
      caseType: null,
      assignedTo: null,
    };
  }
  if (mt === 'SHARED_TASK' && ids.taskId != null) {
    return {
      type: 'TASK',
      id: String(ids.taskId),
      title: '',
      status: '',
      priority: null,
      reference: null,
      dueDate: null,
      caseType: null,
      assignedTo: null,
    };
  }
  if (mt === 'SHARED_APPOINTMENT' && ids.appointmentId != null) {
    return {
      type: 'APPOINTMENT',
      id: String(ids.appointmentId),
      title: '',
      status: '',
      priority: null,
      reference: null,
      dueDate: null,
      caseType: null,
      assignedTo: null,
    };
  }
  return null;
}

export function coerceMessageSharedItem(
  msg: API.Message,
  mt: API.MessageType,
  ids: { caseId: number | null; taskId: number | null; appointmentId: number | null }
): API.SharedItem | null | 'deleted' {
  if (mt === 'TEXT') return null;
  const m = msg as API.Message;
  if (m.sharedItem === null || m.shared_item === null) return 'deleted';
  const raw = m.sharedItem ?? m.shared_item;
  if (raw == null || raw === undefined) {
    const syn = syntheticSharedItem(mt, ids);
    return syn;
  }
  if (isCanonicalSharedItem(raw)) return raw;
  if (typeof raw === 'object') {
    const leg = legacyToSharedItem(raw as Record<string, unknown>, mt);
    if (leg) return leg;
  }
  return syntheticSharedItem(mt, ids);
}

export function sharedItemToMessageKind(item: API.SharedItem): SharedMessageKind {
  if (item.type === 'CASE') return 'SHARED_CASE';
  if (item.type === 'TASK') return 'SHARED_TASK';
  return 'SHARED_APPOINTMENT';
}

export interface SharedMessageCardProps {
  item: API.SharedItem;
  onOpenCase?: (caseId: number) => void;
  onOpenTask?: (taskId: number) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

export function SharedMessageCard({ item, onOpenCase, onOpenTask, onOpenAppointment }: SharedMessageCardProps) {
  const baseCard =
    'max-w-[320px] w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm px-3 py-2.5 transition-colors cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 border-l-[3px]';

  const nid = parseEntityId(item.id);

  if (item.type === 'CASE') {
    const ref = item.reference;
    const refDisplay = ref ? (ref.startsWith('#') ? ref : `#${ref}`) : nid != null ? `#${nid}` : '—';
    return (
      <button
        type="button"
        className={cn(baseCard, caseBorderClass(item.caseType))}
        onClick={() => nid != null && onOpenCase?.(nid)}
        disabled={nid == null}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Folder className="h-3 w-3" />
            Case
          </span>
          {item.status ? <span className={statusPill()}>{String(item.status).replace(/_/g, ' ')}</span> : null}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
          {refDisplay} · <span className="font-sans text-[10px] font-medium">{caseTypeBadgeLabel(item.caseType)}</span>
        </p>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5">
          {item.title?.trim() ? item.title : '—'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {item.assignedTo?.name && <span>Assigned: {item.assignedTo.name}</span>}
          {item.assignedTo?.name && item.priority && <span> · </span>}
          {item.priority && <span>Priority: {String(item.priority).toUpperCase()}</span>}
        </p>
      </button>
    );
  }

  if (item.type === 'TASK') {
    return (
      <button
        type="button"
        className={cn(baseCard, 'border-l-indigo-500')}
        onClick={() => nid != null && onOpenTask?.(nid)}
        disabled={nid == null}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            Task
          </span>
          {item.status ? <span className={statusPill()}>{String(item.status).replace(/_/g, ' ')}</span> : null}
        </div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
          {item.title?.trim() ? item.title : '—'}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {item.dueDate && <span>Due: {formatDayMonth(item.dueDate)}</span>}
          {item.dueDate && priorityPill(item.priority) && <span>·</span>}
          {priorityPill(item.priority) && (
            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
              {String(item.priority).toUpperCase()}
            </span>
          )}
        </div>
      </button>
    );
  }

  const apptDate = item.date ?? item.dueDate;
  const dur = formatDurationMinutes(item.duration ?? null);
  return (
    <button
      type="button"
      className={cn(baseCard, 'border-l-emerald-500')}
      onClick={() => nid != null && onOpenAppointment?.(nid)}
      disabled={nid == null}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Appointment
        </span>
        {item.status ? <span className={statusPill()}>{String(item.status).replace(/_/g, ' ')}</span> : null}
      </div>
      <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
        {item.title?.trim() ? item.title : '—'}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        {apptDate && (
          <>
            {formatDayMonth(apptDate)} · {formatTime(apptDate)}
            {dur ? ` · ${dur}` : ''}
          </>
        )}
      </p>
    </button>
  );
}

export function getMessageType(msg: API.Message): API.MessageType {
  const t = (msg as API.Message).message_type ?? (msg as API.Message).messageType;
  if (t === 'SHARED_CASE' || t === 'SHARED_TASK' || t === 'SHARED_APPOINTMENT') return t;
  return 'TEXT';
}

/** @deprecated use coerceMessageSharedItem */
export function getSharedItem(
  msg: API.Message
): API.SharedItem | null | undefined {
  const m = msg as API.Message;
  if (m.sharedItem === null || m.shared_item === null) return null;
  const raw = m.sharedItem ?? m.shared_item;
  if (raw == null) return undefined;
  return raw as API.SharedItem;
}

export function getSharedIds(msg: API.Message): {
  caseId: number | null;
  taskId: number | null;
  appointmentId: number | null;
} {
  const m = msg as API.Message;
  const caseId = m.shared_case_id ?? m.sharedCaseId ?? null;
  const taskId = m.shared_task_id ?? m.sharedTaskId ?? null;
  const appointmentId = m.shared_appointment_id ?? m.sharedAppointmentId ?? null;
  return {
    caseId: caseId != null ? Number(caseId) : null,
    taskId: taskId != null ? Number(taskId) : null,
    appointmentId: appointmentId != null ? Number(appointmentId) : null,
  };
}

/** Conversation list / latest_message preview line */
export function getSharedMessagePreviewText(msg: API.Message | undefined): string | null {
  if (!msg) return null;
  const mt = getMessageType(msg);
  if (mt === 'TEXT') return null;
  const ids = getSharedIds(msg);
  const coerced = coerceMessageSharedItem(msg, mt, ids);
  if (coerced === 'deleted') {
    if (mt === 'SHARED_CASE') return 'Shared case';
    if (mt === 'SHARED_TASK') return 'Shared task';
    if (mt === 'SHARED_APPOINTMENT') return 'Shared appointment';
    return null;
  }
  if (coerced?.title?.trim()) return coerced.title.trim();
  if (mt === 'SHARED_CASE') return 'Shared case';
  if (mt === 'SHARED_TASK') return 'Shared task';
  if (mt === 'SHARED_APPOINTMENT') return 'Shared appointment';
  return null;
}
