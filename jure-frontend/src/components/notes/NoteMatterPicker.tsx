import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { apiGetCases } from '@/services/case/api';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export type MatterOption = {
  id: number;
  reference?: string;
  title?: string;
};

type Props = {
  value: MatterOption | null;
  onChange: (next: MatterOption | null) => void;
  disabled?: boolean;
};

export default function NoteMatterPicker({ value, onChange, disabled }: Props) {
  const { t } = useAppTranslation();
  const n = t.notes;
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 250);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<API.Case[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    apiGetCases({ search: debounced || undefined, page_size: 20 })
      .then((res) => {
        if (!cancelled) setResults(res.data?.results ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const label = value
    ? [value.reference, value.title].filter(Boolean).join(' — ')
    : n.editor.matterNone;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
          {n.editor.matter}{' '}
          <span className="font-normal text-slate-400">({t.common.optional})</span>
        </p>
        {value ? (
          <button
            type="button"
            className="text-[12px] font-medium text-[#64499D] hover:underline disabled:opacity-50"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            {n.removeMatter}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center rounded-lg border border-input bg-background px-3 text-start text-[13px]',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400'
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      {open ? (
        <div className="rounded-xl border border-[#E8EAF0] bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={n.editor.matterSearch}
            className="h-9"
            autoFocus
          />
          <div className="mt-2 max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-[#64499D]" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">{t.common.noResults}</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full rounded-lg px-2 py-2 text-start hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => {
                    onChange({
                      id: c.id,
                      reference: c.reference ?? undefined,
                      title: c.title ?? undefined,
                    });
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <span className="block font-mono text-[11px] text-slate-400">
                    {c.reference ?? `#${c.id}`}
                  </span>
                  <span className="line-clamp-1 block text-[13px] text-slate-900 dark:text-slate-100">
                    {c.title ?? '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
