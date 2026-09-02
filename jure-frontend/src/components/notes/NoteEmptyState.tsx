import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';

type Props = {
  variant?: 'empty' | 'search' | 'filter';
  onCreate?: () => void;
  onClear?: () => void;
};

export default function NoteEmptyState({ variant = 'empty', onCreate, onClear }: Props) {
  const { t } = useAppTranslation();
  const n = t.notes;

  if (variant === 'search') {
    return (
      <div className="rounded-[16px] border border-dashed border-[#E8EAF0] bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{n.empty.searchTitle}</p>
        <Button type="button" variant="outline" className="mt-4 rounded-lg" onClick={onClear}>
          {n.empty.searchCta}
        </Button>
      </div>
    );
  }

  if (variant === 'filter') {
    return (
      <div className="rounded-[16px] border border-dashed border-[#E8EAF0] bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{n.empty.filterEmpty}</p>
        {onCreate ? (
          <Button
            type="button"
            className="mt-4 rounded-lg bg-[#64499D] text-white hover:bg-[#543d86]"
            onClick={onCreate}
          >
            <Plus className="me-1.5 h-4 w-4" />
            {n.newNote}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[#E8EAF0] bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0EBFA] text-[#64499D] dark:bg-[#64499D]/20">
        <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" aria-hidden>
          <rect x="10" y="6" width="24" height="32" rx="3" stroke="currentColor" strokeWidth="1.75" />
          <path d="M16 14h12M16 20h12M16 26h7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="32" cy="34" r="8" fill="#F0EBFA" stroke="currentColor" strokeWidth="1.75" />
          <path d="M32 30.5v7M28.5 34h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
        {n.empty.headline}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        {n.empty.body}
      </p>
      {onCreate ? (
        <Button
          type="button"
          className="mt-5 rounded-lg bg-[#64499D] text-white hover:bg-[#543d86]"
          onClick={onCreate}
        >
          <Plus className="me-1.5 h-4 w-4" />
          {n.empty.cta}
        </Button>
      ) : null}
      <p className="sr-only">{n.pageTitle}</p>
    </div>
  );
}
