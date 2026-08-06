import React, { memo, useMemo } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PriorityItem, PriorityLevel } from './types';
import { priorityTone } from './commandCenterUtils';

type Props = {
  items: PriorityItem[];
  onOpen?: (item: PriorityItem) => void;
  onViewAll?: () => void;
  className?: string;
};

const GROUPS: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

const PriorityQueue = memo(function PriorityQueue({
  items,
  onOpen,
  onViewAll,
  className,
}: Props) {
  const grouped = useMemo(() => {
    const map: Record<PriorityLevel, PriorityItem[]> = {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
    };
    for (const item of items) map[item.priority].push(item);
    return map;
  }, [items]);

  return (
    <section
      aria-label="Priority Queue"
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
            Priority Queue
          </h2>
          <p className="text-[10px] text-slate-400">Ranked by urgency · risk · deadline</p>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
          >
            View all
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        {!items.length && (
          <p className="py-8 text-center text-[12px] text-slate-400">
            Queue clear — no urgent interventions.
          </p>
        )}
        {GROUPS.map((level) => {
          const list = grouped[level];
          if (!list.length) return null;
          return (
            <div key={level}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    priorityTone(level)
                  )}
                >
                  {level}
                </span>
                <span className="text-[10px] text-slate-400">{list.length}</span>
              </div>
              <ul className="space-y-2">
                {list.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpen?.(item)}
                      className="group w-full rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-left transition hover:border-[#64499D]/25 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-50">
                            {item.title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {item.client} · {item.matter}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                            Risk {item.riskScore}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock3 className="h-2.5 w-2.5" />
                            {item.deadline}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        <span>Effort {item.effort}</span>
                        <span className="text-[#64499D] dark:text-[#CFC2FF]">
                          → {item.nextAction}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400 opacity-0 transition group-hover:opacity-100">
                        {item.aiExplanation}
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100">
                        Open <ArrowRight className="h-3 w-3" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default PriorityQueue;
