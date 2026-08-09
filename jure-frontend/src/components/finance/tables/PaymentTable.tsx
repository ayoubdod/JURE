import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { useAppTranslation } from '@/i18n';

type Row = API.FinancePaymentListItem;

type Props = {
  rows: Row[];
  loading?: boolean;
  onView: (row: Row) => void;
  onDelete: (row: Row) => void;
};

const methodClass: Record<API.FinancePaymentMethod, string> = {
  CASH: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/25',
  VIREMENT_BANCAIRE: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 ring-blue-500/25',
  CHEQUE: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-500/25',
};

export const PaymentTable: React.FC<Props> = ({ rows, loading, onView, onDelete }) => {
  const { t } = useAppTranslation();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/50">
            <tr>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.case}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.client}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.amount}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.method}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.reference}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.linkedInvoice}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.date}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.actions}</th>
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
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-700 dark:text-slate-300">
                    {row.case_reference}
                  </td>
                  <td className="px-4 py-3">{row.client_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMAD(row.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                        methodClass[row.method]
                      )}
                    >
                      {t.finance.paymentMethods[row.method]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{row.reference || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{row.linked_invoice_number || '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{row.date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        onClick={() => onDelete(row)}
                      >
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
