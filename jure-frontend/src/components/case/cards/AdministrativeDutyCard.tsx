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

const DUTY_TYPE_LABELS: Record<string, string> = {
  CORPORATE_FILING: 'Corporate Filing',
  PROPERTY_REGISTRATION: 'Property Registration',
  NOTARIAL_ACT: 'Notarial Act',
  PERMIT: 'Permit',
  COMPLIANCE: 'Compliance',
  INHERITANCE: 'Inheritance',
  OTHER: 'Other',
};

export interface AdministrativeDutyCardProps {
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

const AdministrativeDutyCard: React.FC<AdministrativeDutyCardProps> = ({ caseItem, onClick }) => {
  const status = (getCaseData(caseItem, 'status') as string) ?? caseItem.status;
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const institution = (getCaseData(caseItem, 'institution') as string) ?? (getCaseData(caseItem, 'institution_authority') as string);
  const dutyType = getCaseData(caseItem, 'duty_type') as string | undefined;
  const dueDate = getCaseData(caseItem, 'due_date') as string | undefined;
  const rawDocs = getCaseData(caseItem, 'required_documents');
  const requiredDocuments = Array.isArray(rawDocs) ? rawDocs : undefined;

  const assignedTo = caseItem.assigned_to as API.User | undefined;

  const dueDays = dueDate ? getCountdownDays(dueDate) : null;
  const dueStyle = dueDays != null ? getCountdownStyle(dueDays) : null;

  const totalDocs = requiredDocuments?.length ?? 0;
  const completedDocs = (requiredDocuments?.filter((d) => d?.completed) ?? []).length;
  const progressPct = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

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
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] bg-amber-500/12 text-amber-900 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
          ADMINISTRATIVE
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
          <CaseField label="Client">{getClientName(caseItem.client)}</CaseField>
          {assignedTo && (
            <CaseField label="Assigned">
              {assignedTo.first_name} {assignedTo.last_name}
            </CaseField>
          )}
          {institution && <CaseField label="Institution">{institution}</CaseField>}
          {dutyType && <CaseField label="Type">{DUTY_TYPE_LABELS[dutyType] ?? dutyType}</CaseField>}
        </div>
      </div>

      <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-2">
        {hasCountBadges && (
          <div className="flex flex-wrap items-center gap-2">
            <CaseCardCountBadges caseItem={caseItem} />
          </div>
        )}
        {dueDate && dueDays != null && (
          <p
            className={cn(
              'text-[12px] flex items-start gap-2',
              (dueStyle === 'critical' || dueDays < 0) && 'text-red-700 dark:text-red-400 font-semibold',
              dueStyle === 'warning' && dueDays >= 0 && 'text-amber-700 dark:text-amber-400',
              dueStyle === 'normal' && dueDays >= 0 && 'text-slate-600 dark:text-slate-400'
            )}
          >
            {dueStyle === 'normal' && dueDays >= 0 && (
              <Calendar className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
            )}
            {dueStyle === 'warning' && dueDays >= 0 && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />}
            {(dueStyle === 'critical' || dueDays < 0) && (
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600 dark:bg-red-500"
                aria-hidden
              />
            )}
            <span>
              {dueDays < 0 ? (
                <>Due: {formatDate(dueDate)} (overdue by {Math.abs(dueDays)} days)</>
              ) : (
                <>Due: {formatDate(dueDate)} (in {dueDays} days)</>
              )}
            </span>
          </p>
        )}
        {totalDocs > 0 && (
          <div>
            <p className="text-[12px] text-slate-600 dark:text-slate-400">
              Documents: {completedDocs} / {totalDocs} completed
            </p>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-600/85 dark:bg-emerald-500/80 transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default AdministrativeDutyCard;
