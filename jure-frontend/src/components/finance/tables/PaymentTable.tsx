import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { useAppTranslation } from '@/i18n';
import type { FinanceListView } from '@/components/finance/FinanceViewToggle';

type Row = API.FinancePaymentListItem;

type Props = {
  rows: Row[];
  loading?: boolean;
  view?: FinanceListView;
  onView: (row: Row) => void;
  onDelete: (row: Row) => void;
};

const methodClass: Record<API.FinancePaymentMethod, string> = {
  CASH: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/25',
  VIREMENT_BANCAIRE: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-blue-500/25',
  BANK_TRANSFER: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-blue-500/25',
  CHEQUE: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-500/25',
  OTHER: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/25',
};

function MethodBadge({ method, label }: { method: API.FinancePaymentMethod; label: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', methodClass[method])}>
      {label}
    </span>
  );
}

export const PaymentTable: React.FC<Props> = ({ rows, loading, view = 'table', onView, onDelete }) => {
  const { t, lang } = useAppTranslation();

  if (view === 'cards') {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
          ))}
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {t.finance.emptyPayments}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-white">{formatMAD(row.amount, lang)}</p>
              <MethodBadge method={row.method} label={t.finance.paymentMethods[row.method]} />
            </div>
            <p className="mt-2 text-[14px] font-medium text-slate-900 dark:text-white">{row.client_name}</p>
            <p className="mt-0.5 font-mono text-[12px] text-[#64499D]">{row.case_reference}</p>
            <p className="mt-2 text-[12px] text-slate-500">
              {row.date}
              {row.linked_invoice_number ? ` · ${row.linked_invoice_number}` : ''}
            </p>
            {row.reference ? <p className="mt-1 font-mono text-[11px] text-slate-400">{row.reference}</p> : null}
            <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={t.finance.paymentDetail.viewAria}
                onClick={() => onView(row)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-[13px] md:min-w-[900px]">
          <thead className="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.case}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 sm:table-cell">{t.finance.columns.client}</th>
              <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.amount}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.method}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 lg:table-cell">{t.finance.columns.reference}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 md:table-cell">{t.finance.columns.linkedInvoice}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 md:table-cell">{t.finance.columns.date}</th>
              <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800/50">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  {t.finance.emptyPayments}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/60',
                    idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/25',
                    'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
                  )}
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-700 dark:text-slate-300">{row.case_reference}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">{row.client_name}</td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums">{formatMAD(row.amount, lang)}</td>
                  <td className="px-4 py-3">
                    <MethodBadge method={row.method} label={t.finance.paymentMethods[row.method]} />
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-[12px] text-slate-600 lg:table-cell">{row.reference || '—'}</td>
                  <td className="hidden px-4 py-3 font-mono text-[12px] md:table-cell">{row.linked_invoice_number || '—'}</td>
                  <td className="hidden px-4 py-3 tabular-nums text-slate-600 md:table-cell">{row.date}</td>
                  <td className="px-4 py-3 text-end">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={t.finance.paymentDetail.viewAria}
                        onClick={() => onView(row)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
