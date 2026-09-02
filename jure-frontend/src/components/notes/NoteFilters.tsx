import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { NotesFilter } from '@/components/notes/noteUtils';

type Props = {
  value: NotesFilter;
  onChange: (next: NotesFilter) => void;
  hideScope?: boolean;
};

export default function NoteFilters({ value, onChange, hideScope }: Props) {
  const { t } = useAppTranslation();
  const tabs = hideScope
    ? ([
        ['all', t.notes.tabs.all],
        ['recent', t.notes.tabs.recent],
      ] as const)
    : ([
        ['all', t.notes.tabs.all],
        ['recent', t.notes.tabs.recent],
        ['unscoped', t.notes.tabs.unscoped],
        ['matter', t.notes.tabs.matter],
      ] as const);

  return (
    <div
      role="tablist"
      aria-label={t.notes.gridTitle}
      className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[#E8EAF0] bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
    >
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
            value === id
              ? 'bg-[#64499D] text-white'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
