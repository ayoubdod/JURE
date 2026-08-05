import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { riskStyles } from './knowledgeUtils';
import type { EnrichedDocument } from './types';

type Props = {
  items: EnrichedDocument[];
  selectedId?: number | null;
  onSelect: (doc: EnrichedDocument) => void;
};

const KnowledgeTimelineView = memo(function KnowledgeTimelineView({
  items,
  selectedId,
  onSelect,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, EnrichedDocument[]>();
    const sorted = [...items].sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );
    for (const doc of sorted) {
      const d = new Date(doc.modified);
      const key = d.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div className="space-y-8 px-1 py-2 sm:px-2">
      {groups.map(([label, docs]) => (
        <section key={label} aria-label={label}>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </h3>
          <ol className="relative space-y-0 border-l border-slate-200 pl-6 dark:border-slate-800">
            {docs.map((doc) => (
              <li key={doc.id} className="relative pb-6 last:pb-0">
                <span
                  className={cn(
                    'absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950',
                    selectedId === doc.id ? 'bg-[#64499D]' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => onSelect(doc)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-all duration-200',
                    selectedId === doc.id
                      ? 'border-[#64499D]/35 bg-[#64499D]/05 shadow-sm'
                      : 'border-transparent hover:border-slate-200 hover:bg-white dark:hover:border-slate-800 dark:hover:bg-slate-900/50'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <time className="text-[11px] tabular-nums text-slate-400">
                      {new Date(doc.modified).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <span
                      className={cn(
                        'rounded-md border px-1.5 py-0.5 text-[10px] capitalize',
                        riskStyles(doc.insight.riskLevel)
                      )}
                    >
                      {doc.insight.riskLevel}
                    </span>
                    {doc.insight.aiIndexed && (
                      <span className="text-[10px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                        Indexed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] font-medium text-slate-900 dark:text-slate-50">
                    {doc.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                    {doc.insight.summary}
                  </p>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
});

export default KnowledgeTimelineView;
