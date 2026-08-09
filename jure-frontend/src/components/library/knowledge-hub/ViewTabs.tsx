import React from 'react';
import { LayoutGrid, Table2, GitBranch, Network, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeViewMode } from './types';
import { useAppTranslation } from '@/i18n';

type Props = {
  value: KnowledgeViewMode;
  onChange: (mode: KnowledgeViewMode) => void;
  className?: string;
};

const ViewTabs: React.FC<Props> = ({ value, onChange, className }) => {
  const { t } = useAppTranslation();
  const TABS: { id: KnowledgeViewMode; label: string; icon: React.ElementType }[] = [
    { id: 'grid', label: t.library.views.grid, icon: LayoutGrid },
    { id: 'table', label: t.library.views.table, icon: Table2 },
    { id: 'timeline', label: t.library.views.timeline, icon: GitBranch },
    { id: 'graph', label: t.library.views.graph, icon: Network },
    { id: 'ai', label: t.library.views.ai, icon: Brain },
  ];
  return (
    <div
      role="tablist"
      aria-label={t.library.views.aria}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-900/60',
        className
      )}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors duration-100',
              active
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden lg:inline">{label}</span>
            <span className="lg:hidden">{label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewTabs;
