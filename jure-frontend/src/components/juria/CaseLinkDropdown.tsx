import React, { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { apiGetCases } from '@/services/case/api';
import { cn } from '@/lib/utils';

export function CaseLinkDropdown({
  onSelect,
  compact,
  align = 'start',
}: {
  onSelect: (c: { id: number; reference?: string; title?: string }) => void;
  compact?: boolean;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<API.Case[]>([]);

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-1.5 text-slate-600', compact && 'h-8 px-2 text-xs')}
        >
          <Link2 className="h-3.5 w-3.5" />
          Lier au dossier
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-2">
        <Input
          placeholder="Rechercher un dossier..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9"
        />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Aucun dossier</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  onSelect({
                    id: c.id,
                    reference: c.reference ?? undefined,
                    title: c.title ?? undefined,
                  });
                  setOpen(false);
                }}
              >
                <span className="font-mono text-[11px] text-slate-500">{c.reference ?? `#${c.id}`}</span>
                <span className="line-clamp-1 block text-slate-900 dark:text-slate-100">{c.title ?? '—'}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
