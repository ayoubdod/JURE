import React from 'react';
import { Download, Eye, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { invoiceExonerationNote } from '@/components/finance/tva/TVAProgressBar';
import { useAppTranslation } from '@/i18n';
import type { FinanceListView } from '@/components/finance/FinanceViewToggle';

type Row = API.FinanceInvoiceListItem;

type Props = {
  rows: Row[];
  loading?: boolean;
  view?: FinanceListView;
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

function StatusBadge({ status, label }: { status: API.FinanceInvoiceStatus; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        statusClass[status]
      )}
    >
      {label}
    </span>
  );
}

function ActionButtons({
  row,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  onPreviewPdf,
  downloadLabel,
  previewLabel,
}: {
  row: Row;
  onView: (row: Row) => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  onDownloadPdf: (row: Row) => void;
  onPreviewPdf: (row: Row) => void;
  downloadLabel: string;
  previewLabel: string;
}) {
  return (
    <div className="inline-flex flex-wrap justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={downloadLabel} onClick={() => onDownloadPdf(row)}>
        <Download className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={previewLabel} onClick={() => onPreviewPdf(row)}>
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(row)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(row)}>
        <Pencil className="h-4 w-4" />
      </Button>
      {row.status === 'DRAFT' ? (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(row)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export const InvoiceTable: React.FC<Props> = ({
  rows,
  loading,
  view = 'table',
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  onPreviewPdf,
}) => {
  const { t, lang } = useAppTranslation();

  if (view === 'cards') {
    if (loading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
          ))}
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {t.finance.emptyInvoices}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const exonerationNote = invoiceExonerationNote(row, t.finance.caseTab.tvaExemptNote);
          return (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-4 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-[12px] text-slate-500">{row.number}</p>
                <StatusBadge status={row.status} label={t.finance.invoiceStatuses[row.status]} />
              </div>
              <p className="mt-2 text-[15px] font-semibold text-slate-900 dark:text-white">{row.client_name}</p>
              <p className="mt-0.5 text-[12px] font-medium text-[#64499D]">{row.case_reference}</p>
              <p className="mt-3 text-[18px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(row.amount_ttc, lang)}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {t.finance.columns.date}: {row.issue_date}
              </p>
              {exonerationNote ? (
                <p className="mt-1 text-[11px] italic text-slate-400">{exonerationNote}</p>
              ) : null}
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                <ActionButtons
                  row={row}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDownloadPdf={onDownloadPdf}
                  onPreviewPdf={onPreviewPdf}
                  downloadLabel={t.finance.downloadPdf}
                  previewLabel={t.finance.previewPdf}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-start text-[13px] md:min-w-[960px]">
          <thead className="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.invoiceNumber}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.case}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 sm:table-cell">{t.finance.columns.client}</th>
              <th className="hidden px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400 lg:table-cell">{t.finance.columns.amountHt}</th>
              <th className="hidden px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400 lg:table-cell">{t.finance.columns.tva}</th>
              <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.ttc}</th>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.status}</th>
              <th className="hidden px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 md:table-cell">{t.finance.columns.date}</th>
              <th className="px-4 py-3 text-end font-semibold text-slate-600 dark:text-slate-400">{t.finance.columns.actions}</th>
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
                const exonerationNote = invoiceExonerationNote(row, t.finance.caseTab.tvaExemptNote);
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
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-500 dark:text-slate-400">{row.number}</td>
                    <td className="px-4 py-3 font-medium text-[#64499D] underline-offset-2 hover:underline">{row.case_reference}</td>
                    <td className="hidden px-4 py-3 text-slate-800 dark:text-slate-200 sm:table-cell">{row.client_name}</td>
                    <td className="hidden px-4 py-3 text-end tabular-nums lg:table-cell">{formatMAD(row.amount_ht, lang)}</td>
                    <td className="hidden px-4 py-3 text-end align-top lg:table-cell">
                      <div className="tabular-nums">{formatMAD(row.tva, lang)}</div>
                      {exonerationNote ? (
                        <p className="mt-1 max-w-[14rem] text-start text-[11px] italic leading-snug text-slate-400">
                          {exonerationNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-end font-medium tabular-nums">{formatMAD(row.amount_ttc, lang)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} label={t.finance.invoiceStatuses[row.status]} />
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400 md:table-cell">{row.issue_date}</td>
                    <td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                      <ActionButtons
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDownloadPdf={onDownloadPdf}
                        onPreviewPdf={onPreviewPdf}
                        downloadLabel={t.finance.downloadPdf}
                        previewLabel={t.finance.previewPdf}
                      />
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
