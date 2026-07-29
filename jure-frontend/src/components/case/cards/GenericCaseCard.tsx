'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusColor, truncateText } from '@/utils/caseCardHelpers';
import CaseCardCountBadges from '../CaseCardCountBadges';

const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

export interface GenericCaseCardProps {
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

/**
 * Fallback card for legacy cases without caseType.
 */
const GenericCaseCard: React.FC<GenericCaseCardProps> = ({ caseItem, onClick }) => {
  const status = caseItem.status;
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
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset',
            getStatusColor(status)
          )}
        >
          {status?.replace(/_/g, ' ') ?? '—'}
        </span>
      </div>
      <div className="space-y-2 min-w-0 flex-1 min-h-0">
        {caseItem.reference && (
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{caseItem.reference}</p>
        )}
        <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
          {truncateText(caseItem.title, 60)}
        </p>
        <div className="space-y-1.5 pt-0.5">
          <CaseField label="Client">{getClientName(caseItem.client)}</CaseField>
        </div>
      </div>
      {hasCountBadges && (
        <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <CaseCardCountBadges caseItem={caseItem} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GenericCaseCard;
