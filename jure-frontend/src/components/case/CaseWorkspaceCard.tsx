'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDate,
  getCaseData,
  getCountdownDays,
  getStatusColor,
  truncateText,
} from '@/utils/caseCardHelpers';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppTranslation } from '@/i18n';

export interface CaseWorkspaceCardProps {
  caseItem: API.Case;
  onClick?: () => void;
  onEdit?: () => void;
}

const TYPE_BADGE: Record<string, string> = {
  LITIGATION: 'bg-rose-500/12 text-rose-800 ring-rose-500/25 dark:text-rose-400',
  CONSULTATION: 'bg-blue-500/12 text-blue-700 ring-blue-500/25 dark:text-blue-400',
  ADMINISTRATIVE: 'bg-amber-500/12 text-amber-900 ring-amber-500/25 dark:text-amber-400',
  ADMINISTRATIVE_DUTY: 'bg-amber-500/12 text-amber-900 ring-amber-500/25 dark:text-amber-400',
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-rose-600',
  HIGH: 'bg-rose-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-slate-400',
};

const personName = (u?: API.User | null) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : '';

const CaseWorkspaceCard: React.FC<CaseWorkspaceCardProps> = ({ caseItem, onClick, onEdit }) => {
  const { t, tf, enumLabel, enumPretty } = useAppTranslation();
  const c = t.cases.card;
  const rawType = String(caseItem.caseType ?? caseItem.case_type ?? '');
  const isAdmin = rawType === 'ADMINISTRATIVE' || rawType === 'ADMINISTRATIVE_DUTY';
  const isLitigation = rawType === 'LITIGATION';
  const isConsultation = rawType === 'CONSULTATION';

  const typeLabel = isAdmin
    ? t.cases.typeLabels.admin
    : isConsultation
      ? t.cases.typeLabels.consultation
      : isLitigation
        ? t.cases.typeLabels.litigation
        : rawType || '—';

  const status = String(
    (getCaseData(caseItem, 'status') as string) ||
      (isConsultation ? (getCaseData(caseItem, 'outcome') as string) : '') ||
      caseItem.status ||
      ''
  );
  const statusLabel = enumPretty(status) || '—';

  const title =
    caseItem.title || caseItem.reference || CaseCategory.getLabel(caseItem.category) || t.cases.untitledCase;
  const reference = caseItem.reference ? `#${String(caseItem.reference).replace(/^#/, '')}` : '';

  const clientName = personName(caseItem.client as API.User | undefined) || t.cases.unnamed;
  const clientRole = enumPretty(getCaseData(caseItem, 'client_role') as string | undefined);
  const leadName = personName(caseItem.assigned_to as API.User | undefined);
  const courtName =
    (getCaseData(caseItem, 'court_name') as string) ||
    (getCaseData(caseItem, 'institution') as string) ||
    (getCaseData(caseItem, 'institution_authority') as string) ||
    caseItem.court ||
    '';

  const subtype = isLitigation
    ? enumPretty(String(getCaseData(caseItem, 'litigation_type') || '')) ||
      enumLabel('caseCategory', caseItem.category)
    : isConsultation
      ? enumPretty(String(getCaseData(caseItem, 'legal_domain') || '')) ||
        enumLabel('caseCategory', caseItem.category)
      : isAdmin
        ? enumPretty(String(getCaseData(caseItem, 'duty_type') || '')) ||
          enumLabel('caseCategory', caseItem.category)
        : enumLabel('caseCategory', caseItem.category) || enumPretty(caseItem.category);

  const priority = String(getCaseData(caseItem, 'priority') || '');
  const opened = caseItem.created;
  const nextDate = isConsultation
    ? (getCaseData(caseItem, 'consultation_date') as string | undefined)
    : isAdmin
      ? (getCaseData(caseItem, 'due_date') as string | undefined)
      : (getCaseData(caseItem, 'next_hearing_date') as string | undefined);
  const closedDate =
    status === CaseStatus.CLOSED
      ? ((getCaseData(caseItem, 'completion_date') as string | undefined) || null)
      : null;
  const dateLabel = closedDate
    ? c.closedOn
    : isConsultation
      ? c.consultationDate
      : isAdmin
        ? c.due
        : c.nextHearing;
  const dateValue = closedDate || nextDate;
  const days = dateValue && !closedDate ? getCountdownDays(dateValue) : null;

  const counts = caseItem._counts;
  const taskCount = typeof counts?.tasks === 'number' ? counts.tasks : null;
  const apptCount = typeof counts?.appointments === 'number' ? counts.appointments : null;
  const rawDocs = getCaseData(caseItem, 'required_documents');
  const docs = Array.isArray(rawDocs) ? rawDocs : null;
  const docCount = docs ? docs.length : null;

  const open = () => onClick?.();

  return (
    <article
      className={cn(
        'group relative flex aspect-square w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-slate-200/90 bg-white',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow,background-color,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-[#64499D]/45 hover:bg-[#F7F4FF] hover:shadow-[0_8px_24px_rgba(100,73,157,0.16)]',
        'dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#8B6FD1]/50 dark:hover:bg-[#24183F]/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30'
      )}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      aria-label={tf(t.cases.aria.openMatter, { title })}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(135deg, rgba(100,73,157,0.10) 0%, rgba(100,73,157,0.04) 55%, transparent 100%)',
        }}
        aria-hidden
      />
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset',
                TYPE_BADGE[rawType] || 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
              )}
            >
              {typeLabel}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset',
                getStatusColor(status)
              )}
            >
              {statusLabel}
            </span>
          </div>
          {onEdit ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700"
                  aria-label={c.moreActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="me-2 h-3.5 w-3.5" />
                  {t.common.edit}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="mt-2 min-w-0">
          {reference ? (
            <p className="text-[11px] tabular-nums text-slate-400">{reference}</p>
          ) : null}
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
            {truncateText(title, 72)}
          </h3>
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          {caseItem.client ? (
            <EntityPill
              icon={User}
              label={`${clientName}${clientRole ? ` (${clientRole})` : ''}`}
            />
          ) : null}
          {leadName ? <EntityPill icon={User} label={`${c.lead}: ${leadName}`} /> : null}
          {courtName ? <EntityPill icon={Building2} label={courtName} /> : null}
        </div>

        <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
          <MetaCell label={c.caseType} value={subtype || '—'} />
          <MetaCell
            label={c.priority}
            value={priority ? enumPretty(priority) : '—'}
            dot={priority ? PRIORITY_DOT[priority] : undefined}
          />
          <MetaCell
            label={c.opened}
            value={opened ? formatDate(opened) : '—'}
            icon={Calendar}
          />
          <MetaCell
            label={dateLabel}
            value={dateValue ? formatDate(dateValue) : '—'}
            icon={Calendar}
            hint={
              days != null && days < 0
                ? tf(c.overdueBy, { days: Math.abs(days) })
                : days === 0
                  ? t.cases.deadline.today
                  : undefined
            }
            hintTone={days != null && days < 0 ? 'danger' : undefined}
          />
        </div>

        {(taskCount != null || apptCount != null || docCount != null) && (
          <div className="mt-auto flex min-w-0 gap-1.5 pt-2">
            {taskCount != null ? (
              <StatBox icon={CheckSquare} tone="purple" label={c.tasks} value={taskCount} />
            ) : null}
            {apptCount != null ? (
              <StatBox icon={Calendar} tone="green" label={c.appointments} value={apptCount} />
            ) : null}
            {docCount != null ? (
              <StatBox icon={FileText} tone="blue" label={c.documents} value={docCount} />
            ) : null}
          </div>
        )}
      </div>

      <div className="relative z-[1] shrink-0 border-t border-slate-100 px-3.5 py-2 group-hover:border-[#64499D]/20 dark:border-slate-800">
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 group-hover:text-[#64499D]">
          {c.viewCase}
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </span>
      </div>
    </article>
  );
};

function EntityPill({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[11.5px] text-slate-600 ring-1 ring-slate-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800">
      <Icon className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

function MetaCell({
  label,
  value,
  icon: Icon,
  dot,
  hint,
  hintTone,
}: {
  label: string;
  value: string;
  icon?: typeof Calendar;
  dot?: string;
  hint?: string;
  hintTone?: 'danger';
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p
        className={cn(
          'mt-1 flex min-w-0 items-center gap-1 text-[12.5px] font-medium text-slate-800 dark:text-zinc-200',
          hintTone === 'danger' && 'text-rose-700 dark:text-rose-400'
        )}
      >
        {dot ? <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden /> : null}
        {Icon ? <Icon className="h-3 w-3 shrink-0 text-slate-400" aria-hidden /> : null}
        <span className="truncate">{value}</span>
      </p>
      {hint ? (
        <p className={cn('mt-0.5 text-[11px]', hintTone === 'danger' ? 'text-rose-600' : 'text-slate-400')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckSquare;
  label: string;
  value: number;
  tone: 'purple' | 'green' | 'blue';
}) {
  const tones = {
    purple: 'bg-[#F7F4FF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  };
  return (
    <div className={cn('min-w-0 flex-1 rounded-lg px-2.5 py-2', tones[tone])}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <p className="mt-1 text-[15px] font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

export default CaseWorkspaceCard;
