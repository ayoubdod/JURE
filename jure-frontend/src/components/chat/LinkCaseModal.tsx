'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiSearchShareable, type ShareableSearchCaseHit } from '@/services/search/api';
import { normalizeShareableResults } from './sharePickerTypes';
import { cn } from '@/lib/utils';

function caseDotClass(row: ShareableSearchCaseHit): string {
  const t = row.caseType;
  if (t === 'LITIGATION') return 'bg-rose-500';
  if (t === 'CONSULTATION') return 'bg-indigo-500';
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'bg-amber-400';
  return 'bg-slate-400';
}

function CaseRow({
  row,
  selected,
  onSelect,
}: {
  row: ShareableSearchCaseHit;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = row.reference?.startsWith('#') ? row.reference : row.reference ? `#${row.reference}` : `#${row.id}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-2 py-2 rounded-md border transition-colors',
        selected
          ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', caseDotClass(row))} aria-hidden />
        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 shrink-0">{ref}</span>
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{row.title ?? '—'}</span>
      </div>
    </button>
  );
}

export function LinkCaseModal({
  open,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (caseId: number, row: ShareableSearchCaseHit) => void;
  confirming?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ShareableSearchCaseHit[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback((q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    apiSearchShareable(q.trim(), 'case', ac.signal)
      .then((res) => {
        setRows(normalizeShareableResults(res.data, 'case') as ShareableSearchCaseHit[]);
      })
      .catch(() => {
        if (!ac.signal.aborted) setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setRows([]);
      setSelectedId(null);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [open, query, runSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Link a Case to this conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            className="h-9 pl-8 text-[13px]"
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-md p-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse h-10 bg-slate-100 dark:bg-slate-800 rounded" />
              ))}
            </div>
          ) : query.trim().length < 2 ? (
            <p className="text-[12px] text-slate-500 text-center py-6">Type at least 2 characters</p>
          ) : rows.length === 0 ? (
            <p className="text-[12px] text-slate-500 text-center py-6">No cases found</p>
          ) : (
            rows.map((row) => (
              <CaseRow
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                onSelect={() => setSelectedId(row.id)}
              />
            ))
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={!!confirming}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedId == null || !!confirming}
            onClick={() => {
              if (selectedId == null) return;
              const row = rows.find((r) => r.id === selectedId);
              if (row) onConfirm(selectedId, row);
            }}
          >
            {confirming ? 'Linking…' : 'Link Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
