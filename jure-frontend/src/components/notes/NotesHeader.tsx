import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppTranslation } from '@/i18n';

type Props = {
  title: string;
  subtitle?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

export default function NotesHeader({
  title,
  subtitle,
  search,
  onSearchChange,
  onCreate,
}: Props) {
  const { t } = useAppTranslation();
  const n = t.notes;

  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
        <div className="relative min-w-0 w-full sm:max-w-sm lg:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={n.searchPlaceholder}
            aria-label={n.searchPlaceholder}
            className="h-10 w-full rounded-xl border-[#E8EAF0] bg-white ps-8 text-[13px] dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <Button
          type="button"
          className="h-10 shrink-0 rounded-xl bg-[#64499D] px-4 text-white hover:bg-[#543d86]"
          onClick={onCreate}
        >
          <Plus className="me-1.5 h-4 w-4" />
          {n.newNote}
        </Button>
      </div>
    </header>
  );
}
