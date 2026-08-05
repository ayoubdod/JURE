import React from 'react';
import { LayoutGrid, Table2, GitBranch, Network, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeViewMode } from './types';

const TABS: { id: KnowledgeViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'timeline', label: 'Timeline', icon: GitBranch },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'ai', label: 'AI View', icon: Brain },
];

type Props = {
  value: KnowledgeViewMode;
  onChange: (mode: KnowledgeViewMode) => void;
  className?: string;
};

const ViewTabs: React.FC<Props> = ({ value, onChange, className }) => {
  return (
    <div
      role="tablist"
      aria-label="Workspace views"
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
              'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150',
              active
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewTabs;
