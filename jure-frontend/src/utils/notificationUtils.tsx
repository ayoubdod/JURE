import React, { type ReactNode } from 'react';
import {
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  Coins,
  FileText,
  MessageCircle,
  PhoneMissed,
  Scale,
  Shield,
  User,
  Users,
} from 'lucide-react';
import type {
  AppNotification,
  NotificationFilterId,
  NotificationPriority,
  RelatedAppointment,
  RelatedCase,
  RelatedTask,
  RelatedUser,
} from '@/types/notification';

const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

export function formatTimeAgo(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "À l'instant";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `Il y a ${m} minute${m > 1 ? 's' : ''}`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `Il y a ${h} heure${h > 1 ? 's' : ''}`;
  }
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `Il y a ${d} jour${d > 1 ? 's' : ''}`;
  }
  const dd = date.getDate();
  const mon = MONTHS_FR[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dd} ${mon} ${yyyy}`;
}

export function getNotificationIcon(type: string): ReactNode {
  const t = (type || '').toUpperCase();
  if (t.startsWith('TASK_')) return <CheckSquare className="h-4 w-4 text-indigo-600" aria-hidden />;
  if (t.startsWith('APPOINTMENT_')) return <Calendar className="h-4 w-4 text-emerald-600" aria-hidden />;
  if (t.startsWith('CASE_')) return <Briefcase className="h-4 w-4 text-blue-600" aria-hidden />;
  if (t === 'PROFILE_UPDATED') return <User className="h-4 w-4 text-slate-600" aria-hidden />;
  if (t === 'ROLE_CHANGED') return <Shield className="h-4 w-4 text-red-600" aria-hidden />;
  if (t === 'MEMBER_ADDED') return <Users className="h-4 w-4 text-teal-600" aria-hidden />;
  if (t.startsWith('TVA_') || t === 'TVA_THRESHOLD_CROSSED') {
    return <Scale className="h-4 w-4 text-amber-600" aria-hidden />;
  }
  if (t.startsWith('INVOICE_') || t === 'INVOICE_OVERDUE') {
    return <FileText className="h-4 w-4 text-red-600" aria-hidden />;
  }
  if (t.startsWith('PAYMENT_') || t === 'PAYMENT_RECEIVED') {
    return <Coins className="h-4 w-4 text-emerald-600" aria-hidden />;
  }
  if (t === 'NEW_MESSAGE') return <MessageCircle className="h-4 w-4 text-purple-600" aria-hidden />;
  if (t === 'CALL_MISSED') return <PhoneMissed className="h-4 w-4 text-red-600" aria-hidden />;
  return <Bell className="h-4 w-4 text-slate-500" aria-hidden />;
}

export function getPriorityBorderClass(priority?: string): string {
  const p = (priority || '').toUpperCase();
  if (p === 'URGENT') return 'border-l-[3px] border-l-red-500';
  if (p === 'HIGH') return 'border-l-[3px] border-l-amber-500';
  return '';
}

export function getToastBorderColor(priority?: string): string {
  const p = (priority || '').toUpperCase();
  if (p === 'URGENT') return '#ef4444';
  if (p === 'HIGH') return '#f59e0b';
  if (p === 'LOW') return '#94a3b8';
  return '#6366f1';
}

export function titleColorClass(priority?: string): string {
  const p = (priority || '').toUpperCase();
  if (p === 'URGENT') return 'text-red-600';
  return 'text-slate-900 dark:text-slate-100';
}

export function itemOpacityClass(priority?: string): string {
  const p = (priority || '').toUpperCase();
  if (p === 'LOW') return 'opacity-80';
  return '';
}

function matchesFilter(n: AppNotification, filter: NotificationFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !n.is_read;
  if (filter === 'urgent') return String(n.priority || '').toUpperCase() === 'URGENT';
  const t = (n.type || '').toUpperCase();
  if (filter === 'cases') return t.startsWith('CASE_');
  if (filter === 'tasks') return t.startsWith('TASK_');
  if (filter === 'appointments') return t.startsWith('APPOINTMENT_');
  if (filter === 'finance') {
    return (
      t.startsWith('TVA_') ||
      t === 'TVA_THRESHOLD_CROSSED' ||
      t.startsWith('INVOICE_') ||
      t === 'INVOICE_OVERDUE' ||
      t.startsWith('PAYMENT_') ||
      t === 'PAYMENT_RECEIVED'
    );
  }
  if (filter === 'team') {
    return t === 'PROFILE_UPDATED' || t === 'ROLE_CHANGED' || t === 'MEMBER_ADDED';
  }
  if (filter === 'messages') {
    return t === 'NEW_MESSAGE' || t === 'CALL_MISSED';
  }
  return true;
}

export function filterNotifications(list: AppNotification[], filter: NotificationFilterId): AppNotification[] {
  return list.filter((n) => matchesFilter(n, filter));
}

export type DateGroupKey = 'today' | 'yesterday' | 'week' | 'older';

export function getDateGroupKey(iso: string): DateGroupKey {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'week';
  return 'older';
}

const GROUP_LABELS: Record<DateGroupKey, string> = {
  today: "AUJOURD'HUI",
  yesterday: 'HIER',
  week: 'CETTE SEMAINE',
  older: 'PLUS ANCIEN',
};

export function groupNotificationsByDate(
  notifications: AppNotification[]
): { key: DateGroupKey; label: string; items: AppNotification[] }[] {
  const order: DateGroupKey[] = ['today', 'yesterday', 'week', 'older'];
  const buckets: Record<DateGroupKey, AppNotification[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  for (const n of notifications) {
    buckets[getDateGroupKey(n.created_at)].push(n);
  }
  return order
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ key: k, label: GROUP_LABELS[k], items: buckets[k] }));
}

function parseRelatedCase(raw: Record<string, unknown>): RelatedCase | null {
  const v = raw.related_case ?? raw.relatedCase;
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  return {
    id: Number(id),
    reference: (o.reference as string | null | undefined) ?? null,
    title: (o.title as string | null | undefined) ?? null,
  };
}

function parseRelatedTask(raw: Record<string, unknown>): RelatedTask | null {
  const v = raw.related_task ?? raw.relatedTask;
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  return {
    id: Number(id),
    title: (o.title as string | null | undefined) ?? null,
  };
}

function parseRelatedAppointment(raw: Record<string, unknown>): RelatedAppointment | null {
  const v = raw.related_appointment ?? raw.relatedAppointment;
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  return {
    id: Number(id),
    title: (o.title as string | null | undefined) ?? null,
  };
}

function parseRelatedUser(raw: Record<string, unknown>): RelatedUser | null {
  const v = raw.related_user ?? raw.relatedUser;
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number' && typeof id !== 'string') return null;
  return {
    id: Number(id),
    firstName: (o.firstName as string | undefined) ?? (o.first_name as string | undefined) ?? null,
    lastName: (o.lastName as string | undefined) ?? (o.last_name as string | undefined) ?? null,
    first_name: (o.first_name as string | undefined) ?? null,
    last_name: (o.last_name as string | undefined) ?? null,
  };
}

function buildContextLabel(
  related_case: RelatedCase | null,
  related_task: RelatedTask | null,
  related_appointment: RelatedAppointment | null,
  related_user: RelatedUser | null,
  case_reference: string | null,
  case_title: string | null,
  task_title: string | null
): string | null {
  if (related_case) {
    const ref = related_case.reference?.trim();
    const ti = related_case.title?.trim();
    const parts = [ref ? `#${ref}` : null, ti].filter(Boolean);
    if (parts.length) return `Dossier : ${parts.join(' · ')}`;
  }
  if (related_task?.title?.trim()) return `Tâche : ${related_task.title.trim()}`;
  if (related_appointment?.title?.trim()) {
    return `Rendez-vous : ${related_appointment.title.trim()}`;
  }
  if (related_user) {
    const fn = related_user.firstName ?? related_user.first_name ?? '';
    const ln = related_user.lastName ?? related_user.last_name ?? '';
    const name = `${fn} ${ln}`.trim();
    if (name) return name;
  }
  if (case_reference || case_title) {
    return [case_reference ? `#${case_reference}` : null, case_title].filter(Boolean).join(' · ');
  }
  if (task_title?.trim()) return task_title.trim();
  return null;
}

export function normalizeNotification(raw: Record<string, unknown>): AppNotification {
  const id = raw.id as number | string;
  const type = String(raw.type ?? 'NOTIFICATION');
  const title = String(raw.title ?? '');
  const message = String(raw.message ?? raw.body ?? '');
  const is_read = Boolean(raw.is_read ?? raw.read ?? false);
  const priority = (raw.priority as NotificationPriority | undefined) ?? undefined;
  const read_at = (raw.read_at as string | null | undefined) ?? null;
  const created_at = String(raw.created_at ?? raw.created ?? raw.timestamp ?? new Date().toISOString());
  const expires_at = (raw.expires_at as string | null | undefined) ?? null;
  const email_sent =
    typeof raw.email_sent === 'boolean' ? raw.email_sent : raw.email_sent != null ? Boolean(raw.email_sent) : undefined;
  const push_sent =
    typeof raw.push_sent === 'boolean' ? raw.push_sent : raw.push_sent != null ? Boolean(raw.push_sent) : undefined;
  const action_url = (raw.action_url as string | null | undefined) ?? null;

  const related_case = parseRelatedCase(raw);
  const related_task = parseRelatedTask(raw);
  const related_appointment = parseRelatedAppointment(raw);
  const related_user = parseRelatedUser(raw);

  const case_reference = (raw.case_reference as string | null | undefined) ?? null;
  const case_title = (raw.case_title as string | null | undefined) ?? null;
  const task_title = (raw.task_title as string | null | undefined) ?? null;

  let context_label = (raw.context_label as string | null | undefined) ?? null;
  if (!context_label?.trim()) {
    context_label = buildContextLabel(
      related_case,
      related_task,
      related_appointment,
      related_user,
      case_reference,
      case_title,
      task_title
    );
  }

  return {
    id,
    type,
    title,
    message,
    is_read,
    priority,
    read_at,
    created_at,
    expires_at,
    email_sent,
    push_sent,
    action_url,
    related_case,
    related_task,
    related_appointment,
    related_user,
    context_label,
    case_reference,
    case_title,
    task_title,
  };
}
