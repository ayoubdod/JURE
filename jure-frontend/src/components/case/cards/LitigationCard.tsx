'use client';

import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCaseData,
  getStatusColor,
  truncateText,
  getCountdownDays,
  getCountdownStyle,
  formatDate,
} from '@/utils/caseCardHelpers';
import CaseCardCountBadges from '../CaseCardCountBadges';

const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

const LITIGATION_TYPE_LABELS: Record<string, string> = {
  CIVIL: 'Civil',
  CRIMINAL: 'Criminal',
  COMMERCIAL: 'Commercial',
  ADMINISTRATIVE: 'Administrative',
  LABOR: 'Labor',
  FAMILY: 'Family',
};

export interface LitigationCardProps {
  caseItem: API.Case;
  onClick?: () => void;
}

const CaseField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 items-baseline">
    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {label}
    </span>
    <span className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug">{children}</span>
  </div>
);

const LitigationCard: React.FC<LitigationCardProps> = ({ caseItem, onClick }) => {
  const status = (getCaseData(caseItem, 'status') as string) ?? caseItem.status;
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const courtName = (getCaseData(caseItem, 'court_name') as string) ?? caseItem.court;
  const litigationType = getCaseData(caseItem, 'litigation_type') as string | undefined;
  const courtCaseNumber = getCaseData(caseItem, 'court_case_number') as string | undefined;
  const nextHearingDate = getCaseData(caseItem, 'next_hearing_date') as string | undefined;
  const rawDeadlines = getCaseData(caseItem, 'key_deadlines');
  const keyDeadlines = Array.isArray(rawDeadlines) ? rawDeadlines : [];

  const assignedTo = caseItem.assigned_to as API.User | undefined;
  const leadAttorney = assignedTo;

  const nextHearingDays = nextHearingDate ? getCountdownDays(nextHearingDate) : null;
  const nextHearingStyle = nextHearingDays != null ? getCountdownStyle(nextHearingDays) : null;

  const futureDeadlines = keyDeadlines
    .filter((d) => d?.date && getCountdownDays(d.date) != null && getCountdownDays(d.date)! >= 0)
    .sort((a, b) => (getCountdownDays(a.date) ?? 999) - (getCountdownDays(b.date) ?? 999));
  const nearestDeadline = futureDeadlines[0];
  const nearestDeadlineDays = nearestDeadline ? getCountdownDays(nearestDeadline.date) : null;
  const nearestDeadlineStyle = nearestDeadlineDays != null ? getCountdownStyle(nearestDeadlineDays) : null;

  const showPriorityBadge = priority === 'HIGH' || priority === 'URGENT';
  const hasCountBadges = (caseItem as API.Case & { _counts?: unknown })._counts != null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={cn(
        'group relative h-full overflow-hidden rounded-[12px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950',
        'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
        'cursor-pointer transition-[transform,box-shadow,border-color,opacity] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-purple-200/80 dark:hover:border-purple-800/55 hover:shadow-lg hover:shadow-purple-500/15'
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-purple-500/[0.16] via-violet-500/[0.09] to-indigo-600/[0.2] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative z-[1] flex flex-col gap-3 p-4 text-left">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] bg-rose-500/12 text-rose-800 dark:text-rose-400 ring-1 ring-inset ring-rose-500/25">
          LITIGATION
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset',
            getStatusColor(status)
          )}
        >
          {status?.replace(/_/g, ' ') ?? '—'}
        </span>
        {showPriorityBadge && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] bg-amber-500/12 text-amber-800 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
            {priority}
          </span>
        )}
      </div>

      <div className="space-y-2 min-w-0 flex-1">
        {caseItem.reference && (
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{caseItem.reference}</p>
        )}
        <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
          {truncateText(caseItem.title, 60)}
        </p>
        <div className="space-y-1.5 pt-0.5">
          <CaseField label="Client">
            {getClientName(caseItem.client)}
            {clientRole ? ` (${clientRole})` : ''}
          </CaseField>
          {leadAttorney && (
            <CaseField label="Lead">
              {leadAttorney.first_name} {leadAttorney.last_name}
            </CaseField>
          )}
          {courtName && <CaseField label="Court">{courtName}</CaseField>}
          {litigationType && <CaseField label="Type">{LITIGATION_TYPE_LABELS[litigationType] ?? litigationType}</CaseField>}
          {courtCaseNumber && <CaseField label="Case #">{courtCaseNumber}</CaseField>}
        </div>
      </div>

      <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-2">
        {hasCountBadges && (
          <div className="flex flex-wrap items-center gap-2">
            <CaseCardCountBadges caseItem={caseItem} />
          </div>
        )}
        {nextHearingDate && nextHearingDays != null && (
          <p
            className={cn(
              'text-[12px] flex items-start gap-2',
              (nextHearingStyle === 'critical' || nextHearingDays < 0) && 'text-red-700 dark:text-red-400 font-semibold',
              nextHearingStyle === 'warning' && nextHearingDays >= 0 && 'text-amber-700 dark:text-amber-400',
              nextHearingStyle === 'normal' && nextHearingDays >= 0 && 'text-slate-600 dark:text-slate-400'
            )}
          >
            {nextHearingStyle === 'normal' && nextHearingDays >= 0 && (
              <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
            )}
            {nextHearingStyle === 'warning' && nextHearingDays >= 0 && (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
            )}
            {(nextHearingStyle === 'critical' || nextHearingDays < 0) && (
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600 dark:bg-red-500"
                aria-hidden
              />
            )}
            <span>
              {nextHearingDays < 0 ? (
                <>Next hearing: {formatDate(nextHearingDate)} (overdue by {Math.abs(nextHearingDays)} days)</>
              ) : (
                <>Next hearing: {formatDate(nextHearingDate)} (in {nextHearingDays} days)</>
              )}
            </span>
          </p>
        )}
        {nearestDeadline && nearestDeadlineDays != null && (
          <p
            className={cn(
              'text-[12px] flex items-start gap-2',
              (nearestDeadlineStyle === 'critical' || nearestDeadlineDays < 0) && 'text-red-700 dark:text-red-400 font-semibold',
              nearestDeadlineStyle === 'warning' && nearestDeadlineDays >= 0 && 'text-amber-700 dark:text-amber-400',
              nearestDeadlineStyle === 'normal' && nearestDeadlineDays >= 0 && 'text-slate-600 dark:text-slate-400'
            )}
          >
            {nearestDeadlineStyle === 'normal' && nearestDeadlineDays >= 0 && (
              <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
            )}
            {nearestDeadlineStyle === 'warning' && nearestDeadlineDays >= 0 && (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
            )}
            {(nearestDeadlineStyle === 'critical' || nearestDeadlineDays < 0) && (
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600 dark:bg-red-500"
                aria-hidden
              />
            )}
            <span>
              {nearestDeadlineDays < 0 ? (
                <>
                  {nearestDeadline.label}: {formatDate(nearestDeadline.date)} (overdue by {Math.abs(nearestDeadlineDays)}{' '}
                  days)
                </>
              ) : (
                <>
                  {nearestDeadline.label}: {formatDate(nearestDeadline.date)} (in {nearestDeadlineDays} days)
                </>
              )}
            </span>
          </p>
        )}
      </div>
      </div>
    </div>
  );
};

export default LitigationCard;
