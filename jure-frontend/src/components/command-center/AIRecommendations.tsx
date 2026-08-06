import React, { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIRecommendation } from './types';

type Props = {
  items: AIRecommendation[];
  onPrimary?: (item: AIRecommendation) => void;
  onSecondary?: (item: AIRecommendation) => void;
  className?: string;
};

const statusTone: Record<AIRecommendation['status'], string> = {
  'High Risk': 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  Ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Action Required': 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
};

const AIRecommendations = memo(function AIRecommendations({
  items,
  onPrimary,
  onSecondary,
  className,
}: Props) {
  return (
    <section
      aria-label="Today's AI Recommendations"
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <Sparkles className="h-3.5 w-3.5 text-[#64499D]" aria-hidden />
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
            Today&apos;s AI Recommendations
          </h2>
          <p className="text-[10px] text-slate-400">Accept, review, or dismiss</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-[13px] font-medium text-slate-900 dark:text-slate-50">
                  {item.title}
                </h3>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                    statusTone[item.status]
                  )}
                >
                  {item.status}
                </span>
                <span className="text-[10px] tabular-nums text-slate-400">
                  AI {item.confidence}%
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-slate-500">{item.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.secondaryLabel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={() => onSecondary?.(item)}
                >
                  {item.secondaryLabel}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg bg-[#64499D] text-[12px] text-white hover:bg-[#4D3680]"
                onClick={() => onPrimary?.(item)}
              >
                {item.primaryLabel}
              </Button>
            </div>
          </li>
        ))}
        {!items.length && (
          <li className="p-6 text-center text-[12px] text-slate-400">No recommendations right now.</li>
        )}
      </ul>
    </section>
  );
});

export default AIRecommendations;
