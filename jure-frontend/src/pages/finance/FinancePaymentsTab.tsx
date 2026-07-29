import React, { useCallback, useEffect, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentTable } from '@/components/finance/tables/PaymentTable';
import { getPayments } from '@/services/finance/api';
const METHOD_OPTS: API.FinancePaymentMethod[] = ['CASH', 'VIREMENT_BANCAIRE', 'CHEQUE'];

export const FinancePaymentsTab: React.FC = () => {
  const [rows, setRows] = useState<API.FinancePaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [method, setMethod] = useState<string>('');
  const [client, setClient] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        method: method || undefined,
        client: client || undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      const d = res.data;
      setRows(d.results ?? []);
      setTotalCount(d.count ?? 0);
      setTotalPages(Math.max(1, d.last_page ?? 1));
    } catch {
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, method, client, from, to, search]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = !!(method || client.trim() || from || to || search.trim());

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/90 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-[140px]">
          <Select value={method || 'all'} onValueChange={(v) => setMethod(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Méthode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {METHOD_OPTS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m === 'VIREMENT_BANCAIRE' ? 'Virement' : m === 'CHEQUE' ? 'Chèque' : 'Cash'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          className="h-10 max-w-[160px]"
          placeholder="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />
        <Input className="h-10 max-w-[150px]" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input className="h-10 max-w-[150px]" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-10 pl-9"
            placeholder="Recherche"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="button" className="h-10 bg-jure-600 hover:bg-jure-700" onClick={() => load()}>
          Filtrer
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setMethod('');
              setClient('');
              setFrom('');
              setTo('');
              setSearch('');
              setPage(1);
            }}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        ) : null}
      </div>

      <PaymentTable rows={rows} loading={loading} onView={() => {}} onDelete={() => {}} />

      {!loading && totalCount > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
          <p className="tabular-nums">
            {start}–{end} sur {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
