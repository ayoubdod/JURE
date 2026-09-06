import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export type FinanceListView = 'table' | 'cards';

export function useFinanceListView(storageKey: string): [FinanceListView, (next: FinanceListView) => void] {
  const [view, setView] = useState<FinanceListView>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'table' || stored === 'cards') return stored;
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) return 'cards';
    return 'table';
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, view);
    } catch {
      /* ignore */
    }
  }, [storageKey, view]);

  return [view, setView];
}

export function FinanceViewToggle({
  value,
  onChange,
}: {
  value: FinanceListView;
  onChange: (next: FinanceListView) => void;
}) {
  const { t } = useAppTranslation();
  return (
    <div
      className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50"
      role="group"
      aria-label={t.finance.view.mode}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
          value === 'table'
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
            : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
        )}
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        aria-label={t.finance.view.table}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t.finance.view.table}</span>
      </button>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
          value === 'cards'
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
            : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
        )}
        onClick={() => onChange('cards')}
        aria-pressed={value === 'cards'}
        aria-label={t.finance.view.cards}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t.finance.view.cards}</span>
      </button>
    </div>
  );
}
