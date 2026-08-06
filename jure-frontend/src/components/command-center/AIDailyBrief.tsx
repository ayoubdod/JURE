import React, { memo } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyBrief } from './types';

type Props = {
  brief: DailyBrief;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
};

const AIDailyBrief = memo(function AIDailyBrief({
  brief,
  loading,
  onRefresh,
  refreshing,
  className,
}: Props) {
  return (
    <section
      aria-label="AI Daily Brief"
      className={cn(
        'relative overflow-hidden rounded-xl border border-[#64499D]/15 bg-white/80 shadow-sm backdrop-blur-md',
        'dark:border-[#8B6FD1]/20 dark:bg-slate-950/70',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#64499D] to-[#8B6FD1]"
      />
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]">
              <Brain className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                AI Daily Brief
              </h2>
              <p className="text-[10px] text-slate-400">{brief.generatedAgo}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <>
              <p className="mb-3 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                {brief.body}
              </p>
              <ul className="space-y-1.5">
                {brief.bullets.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[12.5px] leading-snug text-slate-700 dark:text-slate-200"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#64499D]/70" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Workload</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{brief.workload}</p>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Confidence</p>
            <p className="text-sm font-semibold tabular-nums text-[#64499D] dark:text-[#CFC2FF]">
              {brief.confidence}%
            </p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-[#64499D] disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>
    </section>
  );
});

export default AIDailyBrief;
