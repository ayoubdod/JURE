'use client';

import React from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCaseData,
  getStatusColor,
  truncateText,
  formatDateTime,
  formatDate,
  getCountdownDays,
  getCountdownStyle,
} from '@/utils/caseCardHelpers';
import CaseCardCountBadges from '../CaseCardCountBadges';

const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

const FORMAT_LABELS: Record<string, string> = {
  IN_PERSON: 'In Person',
  PHONE: 'Phone',
  VIDEO: 'Video',
};

const LEGAL_DOMAIN_LABELS: Record<string, string> = {
  FAMILY: 'Family',
  CRIMINAL: 'Criminal',
  CORPORATE: 'Corporate',
  LABOR: 'Labor',
  REAL_ESTATE: 'Real Estate',
  OTHER: 'Other',
};

export interface ConsultationCardProps {
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

const ConsultationCard: React.FC<ConsultationCardProps> = ({ caseItem, onClick }) => {
  const status = (getCaseData(caseItem, 'outcome') as string) ?? (getCaseData(caseItem, 'status') as string) ?? caseItem.status;
  const consultationDate = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const duration = getCaseData(caseItem, 'duration') as string | undefined;
  const format = getCaseData(caseItem, 'format') as string | undefined;
  const legalDomain = getCaseData(caseItem, 'legal_domain') as string | undefined;
  const followUpRequired = getCaseData(caseItem, 'follow_up_required') as boolean | undefined;
  const followUpDate = getCaseData(caseItem, 'follow_up_date') as string | undefined;

  const assignedTo = caseItem.assigned_to as API.User | undefined;

  const followDays = followUpDate ? getCountdownDays(followUpDate) : null;
  const followStyle =
    followDays != null ? (followDays < 0 ? 'critical' : getCountdownStyle(followDays)) : 'normal';

  const hasCountBadges = (caseItem as API.Case & { _counts?: unknown })._counts != null;
  const showFooter = hasCountBadges || (followUpRequired && !!followUpDate);

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
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] bg-blue-500/12 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-500/25">
          CONSULTATION
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset',
            getStatusColor(status)
          )}
        >
          {status?.replace(/_/g, ' ') ?? '—'}
        </span>
      </div>

      <div className="space-y-2 min-w-0 flex-1">
        {caseItem.reference && (
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{caseItem.reference}</p>
        )}
        <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
          {truncateText(caseItem.title, 60)}
        </p>
        <div className="space-y-1.5 pt-0.5">
          <CaseField label="Client">{getClientName(caseItem.client)}</CaseField>
          {assignedTo && (
            <CaseField label="Attorney">
              {assignedTo.first_name} {assignedTo.last_name}
            </CaseField>
          )}
          {consultationDate && <CaseField label="When">{formatDateTime(consultationDate)}</CaseField>}
          {duration && <CaseField label="Duration">{duration}</CaseField>}
          {format && <CaseField label="Format">{FORMAT_LABELS[format] ?? format}</CaseField>}
          {legalDomain && <CaseField label="Domain">{LEGAL_DOMAIN_LABELS[legalDomain] ?? legalDomain}</CaseField>}
        </div>
      </div>

      {showFooter && (
        <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-2">
          {hasCountBadges && (
            <div className="flex flex-wrap items-center gap-2">
              <CaseCardCountBadges caseItem={caseItem} />
            </div>
          )}
          {followUpRequired && followUpDate && (
            <div
              className={cn(
                'flex items-start gap-2 text-[12px]',
                followStyle === 'normal' && 'text-slate-600 dark:text-slate-400',
                followStyle === 'warning' && 'text-amber-700 dark:text-amber-400',
                followStyle === 'critical' && 'text-red-700 dark:text-red-400 font-semibold'
              )}
            >
              {followStyle === 'normal' && (
                <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
              )}
              {followStyle === 'warning' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />}
              {followStyle === 'critical' && (
                <span
                  className="mt-1.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600 dark:bg-red-500"
                  aria-hidden
                />
              )}
              <span className="leading-snug">
                Follow-up: {formatDate(followUpDate)}
                {followDays != null && followDays >= 0 && ` (in ${followDays} days)`}
                {followDays != null && followDays < 0 && ` (${Math.abs(followDays)} days overdue)`}
              </span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default ConsultationCard;
