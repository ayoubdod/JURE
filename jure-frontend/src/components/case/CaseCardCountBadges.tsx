'use client';

import React from 'react';
import { Calendar, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

function getCounts(caseItem: API.Case): { tasks: number; appointments: number } | null {
  const raw = caseItem._counts;
  if (raw == null || typeof raw !== 'object') return null;
  return {
    tasks: typeof raw.tasks === 'number' ? raw.tasks : 0,
    appointments: typeof raw.appointments === 'number' ? raw.appointments : 0,
  };
}

export interface CaseCardCountBadgesProps {
  caseItem: API.Case;
  className?: string;
}

/**
 * Compact task / appointment counters for case cards. Hidden when `_counts` is absent.
 */
const CaseCardCountBadges: React.FC<CaseCardCountBadgesProps> = ({ caseItem, className }) => {
  const c = getCounts(caseItem);
  if (!c) return null;

  const taskMuted = c.tasks === 0;
  const apptMuted = c.appointments === 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          taskMuted
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
        )}
      >
        <CheckSquare className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        <span>{c.tasks}</span>
        <span className="font-medium">Tasks</span>
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          apptMuted
            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300'
        )}
      >
        <Calendar className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        <span>{c.appointments}</span>
        <span className="font-medium">Appt</span>
      </span>
    </div>
  );
};

export default CaseCardCountBadges;
