import React, { memo } from 'react';
import { Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeInsight } from './types';

type Props = {
  insights: KnowledgeInsight[];
  onOpenHub?: () => void;
  className?: string;
};

const KnowledgeInsights = memo(function KnowledgeInsights({
  insights,
  onOpenHub,
  className,
}: Props) {
  return (
    <section
      aria-label="Knowledge Insights"
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Library className="h-3.5 w-3.5 text-[#64499D]" aria-hidden />
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
              Knowledge Insights
            </h2>
            <p className="text-[10px] text-slate-400">From your Knowledge Hub</p>
          </div>
        </div>
        {onOpenHub && (
          <button
            type="button"
            onClick={onOpenHub}
            className="text-[11px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
          >
            Open Hub
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.id} className="bg-white p-4 dark:bg-slate-950">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {insight.label}
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-slate-900 dark:text-slate-50">
              {insight.value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{insight.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

export default KnowledgeInsights;
