import React, { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceTable } from '@/components/finance/tables/InvoiceTable';
import { FilterField } from '@/components/common/MobileFilterSheet';
import { FinanceListToolbar } from '@/components/finance/FinanceListToolbar';
import { useFinanceListView } from '@/components/finance/FinanceViewToggle';
import {
  deleteInvoiceFinance,
  downloadInvoicePdfFile,
  getInvoices,
  parseFinanceListResponse,
  previewInvoicePdfInNewTab,
} from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { useAppTranslation, localizeAxiosPayload } from '@/i18n';
import { useDebounce } from '@/hooks/use-debounce';

const STATUS_OPTS: API.FinanceInvoiceStatus[] = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
];

type Props = {
  onOpenInvoice: (id: number) => void;
  onEditInvoice?: (id: number) => void;
  /** Increment from parent to refetch after mutation elsewhere */
  listEpoch?: number;
  onToolbarChange?: (node: ReactNode | null) => void;
};

export const FinanceInvoicesTab: React.FC<Props> = ({
  onOpenInvoice,
  onEditInvoice,
  listEpoch = 0,
  onToolbarChange,
}) => {
  const { toast } = useToast();
  const { t, tf, lang } = useAppTranslation();
  const [rows, setRows] = useState<API.FinanceInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [client, setClient] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [view, setView] = useFinanceListView('jure.finance.invoices.view');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvoices({
        status: status || undefined,
        client: client || undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        page_size: pageSize,
      });
      const { results, count, lastPage } = parseFinanceListResponse<API.FinanceInvoiceListItem>(res.data);
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
  }, [page, pageSize, status, client, from, to, debouncedSearch, listEpoch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (row: API.FinanceInvoiceListItem) => {
    if (row.status !== 'DRAFT') return;
    if (!window.confirm(t.finance.toasts.deleteConfirm)) return;
    try {
      await deleteInvoiceFinance(row.id);
      toast({ title: t.finance.toasts.deleted });
      load();
    } catch (err) {
      let msg = t.finance.toasts.deleteFailed;
      if (isAxiosError(err)) {
        msg = localizeAxiosPayload(err.response?.data, t.finance.toasts.deleteFailed);
      }
      toast({ title: t.finance.toasts.errorTitle, description: msg, variant: 'destructive' });
    }
  };

  const handleDownloadPdf = async (row: API.FinanceInvoiceListItem) => {
    try {
      await downloadInvoicePdfFile(row.id, row.case_id);
    } catch (err) {
      let msg = t.finance.toasts.pdfDownloadFailed;
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = t.finance.toasts.accessDenied;
        else if (st === 404) msg = t.finance.toasts.invoiceNotFound;
      }
      toast({ title: t.finance.toasts.errorTitle, description: msg, variant: 'destructive' });
    }
  };

  const handlePreviewPdf = async (row: API.FinanceInvoiceListItem) => {
    try {
      await previewInvoicePdfInNewTab(row.id, row.case_id);
    } catch (err) {
      let msg = t.finance.toasts.pdfPreviewFailed;
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = t.finance.toasts.accessDenied;
        else if (st === 404) msg = t.finance.toasts.invoiceNotFound;
      }
      toast({ title: t.finance.toasts.errorTitle, description: msg, variant: 'destructive' });
    }
  };

  const handleEdit = (row: API.FinanceInvoiceListItem) => {
    if (onEditInvoice) onEditInvoice(row.id);
    else onOpenInvoice(row.id);
  };

  const extraFilterCount = [status, client.trim(), from, to].filter(Boolean).length;

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
          setStatus('');
          setClient('');
          setFrom('');
          setTo('');
          setSearch('');
          setPage(1);
        }}
        view={view}
        onViewChange={setView}
      >
        <FilterField label={t.finance.filters.status}>
          <Select
            value={status || 'all'}
            onValueChange={(v) => {
              setStatus(v === 'all' ? '' : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={t.finance.filters.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.finance.filters.allStatuses}</SelectItem>
              {STATUS_OPTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t.finance.invoiceStatuses[s]}
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
  }, [onToolbarChange, search, extraFilterCount, view, status, client, from, to, lang]);

  return (
    <div className="space-y-4">
      <InvoiceTable
        rows={rows}
        loading={loading}
        view={view}
        onRowClick={(row) => onOpenInvoice(row.id)}
        onView={(row) => onOpenInvoice(row.id)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDownloadPdf={handleDownloadPdf}
        onPreviewPdf={handlePreviewPdf}
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
    </div>
  );
};
