import React from 'react';
import { Download, Eye, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { invoiceExonerationNote } from '@/components/finance/tva/TVAProgressBar';
import { useAppTranslation } from '@/i18n';

type Row = API.FinanceInvoiceListItem;

type Props = {
  rows: Row[];
  loading?: boolean;
  onRowClick: (row: Row) => void;
  onView: (row: Row) => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onDownloadPdf: (row: Row) => void;
  onPreviewPdf: (row: Row) => void;
};

const statusClass: Record<API.FinanceInvoiceStatus, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/25',
  SENT: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/25',
  PARTIALLY_PAID: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/25',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25',
  OVERDUE: 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/25',
  CANCELLED: 'bg-slate-500/10 text-slate-500 line-through ring-slate-400/20',
};

export const InvoiceTable: React.FC<Props> = ({
  rows,
  loading,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  onPreviewPdf,
}) => {
  const { t } = useAppTranslation();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-[13px]">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/50">
            <tr>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.invoiceNumber}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.case}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.client}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.amountHt}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.tva}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.ttc}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.status}</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.date}</th>
              <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-slate-800/50">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  {t.finance.emptyInvoices}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const exonerationNote = invoiceExonerationNote(row);
                return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className={cn(
                    'cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors',
                    idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/25',
                    'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/25'
                  )}
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">
                    {row.number}
                  </td>
                  <td className="px-4 py-3 text-jure-600 dark:text-jure-400 font-medium underline-offset-2 hover:underline">
                    {row.case_reference}
                  </td>
                  <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.client_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMAD(row.amount_ht)}</td>
                  <td className="px-4 py-3 text-right align-top">
                    <div className="tabular-nums">{formatMAD(row.tva)}</div>
                    {exonerationNote ? (
                      <p className="mt-1 max-w-[14rem] text-left text-[11px] italic leading-snug text-slate-400">
                        {exonerationNote}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatMAD(row.amount_ttc)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                        statusClass[row.status]
                      )}
                    >
                      {t.finance.invoiceStatuses[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{row.issue_date}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.finance.downloadPdf}
                        onClick={() => onDownloadPdf(row)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.finance.previewPdf}
                        onClick={() => onPreviewPdf(row)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {row.status === 'DRAFT' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
