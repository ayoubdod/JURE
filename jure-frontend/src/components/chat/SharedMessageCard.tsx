'use client';

import React from 'react';
import { Calendar, CheckSquare, ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/utils/constants';
import { detectInitialLanguage } from '@/i18n/locale';
import { getMessages } from '@/i18n/messages';
import { formatDate, formatTime, interpolate, useAppTranslation } from '@/i18n';

export type SharedMessageKind = 'SHARED_CASE' | 'SHARED_TASK' | 'SHARED_APPOINTMENT';

function parseEntityId(id: string | number | undefined | null): number | null {
  if (id == null) return null;
  const n = typeof id === 'number' ? id : parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function formatDayMonth(iso: string | null | undefined, lang: Parameters<typeof formatDate>[1]): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDate(d, lang, { month: 'short' }) || '—';
}

function formatClock(iso: string | null | undefined, lang: Parameters<typeof formatTime>[1]): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatTime(d, lang);
}

function formatDurationMinutes(
  minutes: number | null | undefined,
  hoursTpl: string,
  minutesTpl: string
): string {
  if (minutes == null || minutes <= 0) return '';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = interpolate(hoursTpl, { count: h });
    return m ? `${hours} ${interpolate(minutesTpl, { n: m })}` : hours;
  }
  return interpolate(minutesTpl, { n: minutes });
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
  if (item.type === 'APPOINTMENT') return 'SHARED_APPOINTMENT';
  return 'SHARED_APPOINTMENT';
}

export interface SharedMessageCardProps {
  item: API.SharedItem;
  onOpenCase?: (caseId: number) => void;
  onOpenTask?: (taskId: number) => void;
  onOpenAppointment?: (appointmentId: number) => void;
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/15 dark:text-slate-300',
        className
      )}
    >
      {children}
    </span>
  );
}

function caseAccent(caseType: string | null | undefined): {
  icon: string;
  bar: string;
  soft: string;
} {
  const t = String(caseType || '').toUpperCase();
  if (t === 'LITIGATION') {
    return {
      icon: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      bar: 'from-rose-500/20 via-transparent to-transparent',
      soft: 'hover:border-rose-300/60 dark:hover:border-rose-700/50',
    };
  }
  if (t === 'CONSULTATION') {
    return {
      icon: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      bar: 'from-indigo-500/20 via-transparent to-transparent',
      soft: 'hover:border-indigo-300/60 dark:hover:border-indigo-700/50',
    };
  }
  return {
    icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    bar: 'from-amber-400/25 via-transparent to-transparent',
    soft: 'hover:border-amber-300/60 dark:hover:border-amber-700/50',
  };
}

export function SharedMessageCard({ item, onOpenCase, onOpenTask, onOpenAppointment }: SharedMessageCardProps) {
  const { t, tf, lang, enumPretty, enumLabel } = useAppTranslation();
  const nid = parseEntityId(item.id);

  const shell =
    'group relative max-w-[320px] w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-start shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition-all duration-150 dark:border-slate-700 dark:bg-slate-950';
  const interactive =
    'cursor-pointer hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 disabled:cursor-default disabled:opacity-70';

  if (item.type === 'CASE') {
    const ref = item.reference;
    const refDisplay = ref ? (ref.startsWith('#') ? ref : `#${ref}`) : nid != null ? `#${nid}` : '—';
    const typeLabel = enumLabel('caseType', item.caseType) || enumPretty(item.caseType) || t.sidebar.cases;
    const accent = caseAccent(item.caseType);
    return (
      <button
        type="button"
        className={cn(shell, interactive, accent.soft)}
        onClick={() => nid != null && onOpenCase?.(nid)}
        disabled={nid == null}
      >
        <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b', accent.bar)} aria-hidden />
        <div className="relative flex items-start gap-2.5 px-3 pb-3 pt-3">
          <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent.icon)}>
            <Folder className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.conversations.sharedCase}
              </span>
              {item.status ? <Chip>{enumPretty(String(item.status))}</Chip> : null}
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {refDisplay}
              <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
              <span className="font-sans font-medium text-slate-600 dark:text-slate-300">{typeLabel}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {item.title?.trim() ? item.title : '—'}
            </p>
            {(item.assignedTo?.name || item.priority) && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {item.assignedTo?.name ? (
                  <Chip>
                    {t.calendar.assignedTo}: {item.assignedTo.name}
                  </Chip>
                ) : null}
                {item.priority ? (
                  <Chip>{`${t.cases.workspaces.priority}: ${enumPretty(String(item.priority))}`}</Chip>
                ) : null}
              </div>
            )}
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#64499D] dark:text-slate-600 dark:group-hover:text-[#CFC2FF]" aria-hidden />
        </div>
      </button>
    );
  }

  if (item.type === 'TASK') {
    return (
      <button
        type="button"
        className={cn(shell, interactive, 'hover:border-indigo-300/60 dark:hover:border-indigo-700/50')}
        onClick={() => nid != null && onOpenTask?.(nid)}
        disabled={nid == null}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-indigo-500/15 via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-start gap-2.5 px-3 pb-3 pt-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <CheckSquare className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t.conversations.sharedTask}
              </span>
              {item.status ? <Chip>{enumPretty(String(item.status))}</Chip> : null}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
              {item.title?.trim() ? item.title : '—'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {item.dueDate ? (
                <Chip>{tf(t.conversations.dueLabel, { date: formatDayMonth(item.dueDate, lang) })}</Chip>
              ) : null}
              {priorityPill(item.priority) ? (
                <Chip className="bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:text-rose-400">
                  {enumPretty(String(item.priority))}
                </Chip>
              ) : null}
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" aria-hidden />
        </div>
      </button>
    );
  }

  const apptDate = item.date ?? item.dueDate;
  const dur = formatDurationMinutes(
    item.duration ?? null,
    t.cases.workspaces.consultation.detail.hours,
    t.calendar.minutesShort
  );
  return (
    <button
      type="button"
      className={cn(shell, interactive, 'hover:border-emerald-300/60 dark:hover:border-emerald-700/50')}
      onClick={() => nid != null && onOpenAppointment?.(nid)}
      disabled={nid == null}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-500/15 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative flex items-start gap-2.5 px-3 pb-3 pt-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <Calendar className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t.conversations.sharedAppointment}
            </span>
            {item.status ? <Chip>{enumPretty(String(item.status))}</Chip> : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-slate-900 dark:text-slate-50">
            {item.title?.trim() ? item.title : '—'}
          </p>
          {apptDate ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Chip>
                {formatDayMonth(apptDate, lang)}
                {formatClock(apptDate, lang) ? ` · ${formatClock(apptDate, lang)}` : ''}
              </Chip>
              {dur ? <Chip>{dur}</Chip> : null}
            </div>
          ) : null}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-slate-600" aria-hidden />
      </div>
    </button>
  );
}

export function getMessageType(msg: API.Message): API.MessageType {
  const t = (msg as API.Message).message_type ?? (msg as API.Message).messageType;
  if (
    t === 'SHARED_CASE' ||
    t === 'SHARED_TASK' ||
    t === 'SHARED_APPOINTMENT' ||
    t === 'CALL_VOICE' ||
    t === 'CALL_VIDEO' ||
    t === 'CALL_MISSED_VOICE' ||
    t === 'CALL_MISSED_VIDEO'
  ) {
    return t;
  }
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

function defaultSharedPreviewLabels() {
  const t = getMessages(detectInitialLanguage()).conversations;
  return {
    missedVideo: t.call.missedVideoCallTitle,
    missedVoice: t.call.missedCallTitle,
    videoCall: t.call.historyVideoCall,
    voiceCall: t.call.historyVoiceCall,
    sharedCase: t.sharedCase,
    sharedTask: t.sharedTask,
    sharedAppointment: t.sharedAppointment,
  };
}

/** Conversation list / latest_message preview line */
export function getSharedMessagePreviewText(
  msg: API.Message | undefined,
  labels?: {
    missedVideo: string;
    missedVoice: string;
    videoCall: string;
    voiceCall: string;
    sharedCase: string;
    sharedTask: string;
    sharedAppointment: string;
  }
): string | null {
  if (!msg) return null;
  const mt = getMessageType(msg);
  if (mt === 'TEXT') return null;
  const L = labels ?? defaultSharedPreviewLabels();
  if (
    mt === 'CALL_VOICE' ||
    mt === 'CALL_VIDEO' ||
    mt === 'CALL_MISSED_VOICE' ||
    mt === 'CALL_MISSED_VIDEO'
  ) {
    const body = (msg.body ?? '').trim();
    if (body) return body;
    if (mt === 'CALL_MISSED_VIDEO') return L.missedVideo;
    if (mt === 'CALL_MISSED_VOICE') return L.missedVoice;
    if (mt === 'CALL_VIDEO') return L.videoCall;
    return L.voiceCall;
  }
  const ids = getSharedIds(msg);
  const coerced = coerceMessageSharedItem(msg, mt, ids);
  if (coerced === 'deleted') {
    if (mt === 'SHARED_CASE') return L.sharedCase;
    if (mt === 'SHARED_TASK') return L.sharedTask;
    if (mt === 'SHARED_APPOINTMENT') return L.sharedAppointment;
    return null;
  }
  if (coerced?.title?.trim()) return coerced.title.trim();
  if (mt === 'SHARED_CASE') return L.sharedCase;
  if (mt === 'SHARED_TASK') return L.sharedTask;
  if (mt === 'SHARED_APPOINTMENT') return L.sharedAppointment;
  return null;
}
