'use client';

import React, { useState, memo } from 'react';
import { ChevronDown, Calendar, Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  getCaseData,
  getCaseDateForFilter,
  formatDate,
  getCountdownDays,
  getCountdownStyle,
  getStatusColor,
  truncateText,
} from '@/utils/caseCardHelpers';
import { CaseCategory } from '@/utils/constants';

export interface MatterWorkspaceCardProps {
  caseItem: API.Case;
  onOpen: () => void;
  onEdit?: () => void;
}

const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

const getAssignedName = (c: API.Case): string => {
  const u = c.assigned_to as API.User | undefined;
  if (u?.first_name || u?.last_name) {
    return `${u.first_name || ''} ${u.last_name || ''}`.trim();
  }
  return '—';
};

const getCaseTitle = (caseItem: API.Case) =>
  (caseItem as API.Case & { title?: string }).title ||
  caseItem.reference ||
  CaseCategory.getLabel(caseItem.category) ||
  'Untitled case';

const getTypeLabel = (c: API.Case): string => {
  const t = c.caseType ?? c.case_type;
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return 'ADMIN';
  if (t === 'LITIGATION') return 'LITIGATION';
  if (t === 'CONSULTATION') return 'CONSULTATION';
  return '—';
};

/**
 * Dense, touch-first matter card for mobile / tablet list density.
 * Collapsed by default; tap expands secondary fields and quick actions.
 */
const MatterWorkspaceCard = memo(function MatterWorkspaceCard({
  caseItem,
  onOpen,
  onEdit,
}: MatterWorkspaceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const dateStr = getCaseDateForFilter(caseItem);
  const days = dateStr ? getCountdownDays(dateStr) : null;
  const style = days != null ? (days < 0 ? 'critical' : getCountdownStyle(days)) : null;
  const showPriority = priority === 'HIGH' || priority === 'URGENT' || priority === 'MEDIUM';

  const toggleExpand = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <article
      className={cn(
        'rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-150',
        'active:border-slate-300 dark:active:border-slate-700',
        expanded && 'ring-1 ring-slate-300/80 dark:ring-slate-700'
      )}
    >
      <button
        type="button"
        className="w-full text-left px-3 py-2.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset rounded-lg"
        onClick={onOpen}
        aria-label={`Open matter ${getCaseTitle(caseItem)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
              {truncateText(getCaseTitle(caseItem), 72)}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
              {caseItem.reference || '—'}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
              getStatusColor(caseItem.status)
            )}
          >
            {String(caseItem.status || '').replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600 dark:text-slate-400">
          <span className="truncate max-w-[46%]">{getClientName(caseItem.client)}</span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
            ·
          </span>
          <span className="truncate max-w-[40%]">{getAssignedName(caseItem)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {getTypeLabel(caseItem)}
          </span>
          {showPriority && (
            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                priority === 'URGENT' || priority === 'HIGH'
                  ? 'bg-amber-500/12 text-amber-800 dark:text-amber-400 ring-amber-500/25'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20'
              )}
            >
              {priority}
            </span>
          )}
          {dateStr && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] tabular-nums',
                style === 'critical' && 'text-red-700 dark:text-red-400 font-semibold',
                style === 'warning' && 'text-amber-700 dark:text-amber-400',
                style === 'normal' && 'text-slate-500 dark:text-slate-400'
              )}
            >
              <Calendar className="w-3 h-3 shrink-0" aria-hidden />
              {formatDate(dateStr)}
              {days != null && (
                <span className="opacity-80">
                  {days < 0 ? `(${Math.abs(days)}d overdue)` : days === 0 ? '(Today)' : `(in ${days}d)`}
                </span>
              )}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center border-t border-slate-100 dark:border-slate-800/80 px-1">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 min-h-[40px] text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          onClick={toggleExpand}
          aria-expanded={expanded}
        >
          {expanded ? 'Less' : 'More'}
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in-0 slide-in-from-top-1 duration-150 motion-reduce:animate-none">
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1.5 text-[12px]">
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Client</dt>
            <dd className="text-slate-700 dark:text-slate-300 truncate">{getClientName(caseItem.client)}</dd>
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Lawyer</dt>
            <dd className="text-slate-700 dark:text-slate-300 truncate">{getAssignedName(caseItem)}</dd>
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">Hearing</dt>
            <dd className="text-slate-700 dark:text-slate-300">{dateStr ? formatDate(dateStr) : '—'}</dd>
          </dl>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 text-[12px]"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              Open
            </Button>
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 flex-1 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
});

export default MatterWorkspaceCard;
