import React, { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
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
import { FilterField } from '@/components/common/MobileFilterSheet';
import { FinanceListToolbar } from '@/components/finance/FinanceListToolbar';
import { useFinanceListView } from '@/components/finance/FinanceViewToggle';
import { PaymentDetailPanel } from '@/components/finance/panel/PaymentDetailPanel';
import { deletePayment, getPayments, parseFinanceListResponse } from '@/services/finance/api';
import { navigateToCaseById } from '@/lib/caseRoutes';
import { useToast } from '@/hooks/use-toast';
import { localizeAxiosPayload, useAppTranslation } from '@/i18n';
import { useDebounce } from '@/hooks/use-debounce';
import { isAxiosError } from 'axios';

const METHOD_OPTS: API.FinancePaymentMethod[] = [
  'CASH',
  'VIREMENT_BANCAIRE',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER',
];

export const FinancePaymentsTab: React.FC<{
  onToolbarChange?: (node: ReactNode | null) => void;
}> = ({ onToolbarChange }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, tf, lang } = useAppTranslation();
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
  const debouncedSearch = useDebounce(search, 350);
  const [view, setView] = useFinanceListView('jure.finance.payments.view');
  const [viewRow, setViewRow] = useState<API.FinancePaymentListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        method: method || undefined,
        client: client || undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        page_size: pageSize,
      });
      const { results, count, lastPage } = parseFinanceListResponse<API.FinancePaymentListItem>(res.data);
      setRows(results);
      setTotalCount(count);
      setTotalPages(lastPage);
    } catch {
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, method, client, from, to, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const extraFilterCount = [method, client.trim(), from, to].filter(Boolean).length;

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  useLayoutEffect(() => {
    if (!onToolbarChange) return;
    onToolbarChange(
      <FinanceListToolbar
        search={search}
        onSearchChange={setSearch}
        filterCount={extraFilterCount}
        onReset={() => {
          setMethod('');
          setClient('');
          setFrom('');
          setTo('');
          setSearch('');
          setPage(1);
        }}
        view={view}
        onViewChange={setView}
      >
        <FilterField label={t.finance.filters.method}>
          <Select
            value={method || 'all'}
            onValueChange={(v) => {
              setMethod(v === 'all' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={t.finance.filters.method} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.finance.filters.allMethods}</SelectItem>
              {METHOD_OPTS.map((m) => (
                <SelectItem key={m} value={m}>
                  {t.finance.paymentMethods[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label={t.finance.filters.client}>
          <Input
            className="h-9 w-full"
            placeholder={t.finance.filters.client}
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField label={t.finance.filters.from}>
          <Input
            className="h-9 w-full"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField label={t.finance.filters.to}>
          <Input
            className="h-9 w-full"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </FilterField>
      </FinanceListToolbar>
    );
    return () => onToolbarChange(null);
  }, [onToolbarChange, search, extraFilterCount, view, method, client, from, to, lang]);

  const handleDelete = async (row: API.FinancePaymentListItem) => {
    if (!window.confirm(t.finance.toasts.deletePaymentConfirm)) return;
    try {
      await deletePayment(row.case_id, row.id);
      toast({ title: t.finance.toasts.paymentDeleted });
      if (viewRow?.id === row.id) setViewRow(null);
      load();
    } catch (err) {
      let msg = t.finance.toasts.deleteFailed;
      if (isAxiosError(err)) {
        msg = localizeAxiosPayload(err.response?.data, t.finance.toasts.deleteFailed);
      }
      toast({ title: t.finance.toasts.errorTitle, description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <PaymentTable
        rows={rows}
        loading={loading}
        view={view}
        onView={(row) => setViewRow(row)}
        onDelete={handleDelete}
      />

      {!loading && totalCount > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
          <p className="tabular-nums">
            {tf(t.finance.pagination.range, { start, end, total: totalCount })}
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
              {t.finance.pagination.previous}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t.finance.pagination.next}
            </Button>
          </div>
        </div>
      ) : null}
      <PaymentDetailPanel
        paymentId={viewRow?.id ?? null}
        preview={viewRow}
        open={viewRow != null}
        onOpenChange={(o) => {
          if (!o) setViewRow(null);
        }}
        onNavigateCase={(caseId) => {
          void navigateToCaseById(navigate, caseId);
        }}
        onDeleted={() => {
          setViewRow(null);
          load();
        }}
      />
    </div>
  );
};
