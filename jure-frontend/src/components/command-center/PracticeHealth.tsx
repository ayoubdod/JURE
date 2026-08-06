import React, { memo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PracticeHealthScore } from './types';
import { AnimatedCounter } from './MissionControlHeader';

type Props = {
  health: PracticeHealthScore;
  className?: string;
};

const PracticeHealth = memo(function PracticeHealth({ health, className }: Props) {
  const ring = Math.min(100, Math.max(0, health.overall));

  return (
    <section
      aria-label="Practice Health"
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
            Practice Health
          </h2>
          <p className="text-[10px] text-slate-400">Overall practice score</p>
        </div>
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={`${ring} 100`}
              strokeLinecap="round"
              className="text-[#64499D] dark:text-[#8B6FD1]"
            />
          </svg>
          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            <AnimatedCounter value={health.overall} />
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {health.subscores.map((s) => (
          <li
            key={s.id}
            className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              {s.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden />
              ) : s.trend === 'down' ? (
                <TrendingDown className="h-3 w-3 text-rose-600" aria-hidden />
              ) : (
                <Minus className="h-3 w-3 text-slate-400" aria-hidden />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                <AnimatedCounter value={s.value} />
              </span>
              <span className="text-[10px] text-slate-400">/100</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#64499D]/80 transition-all duration-700 dark:bg-[#8B6FD1]"
                style={{ width: `${s.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
});

export default PracticeHealth;
