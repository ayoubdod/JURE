import React from 'react';
import { AlertTriangle, Pencil, Trash2, FileDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { getCountdownDays, getCountdownStyle } from '@/utils/caseCardHelpers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { invoiceExonerationNote } from '@/components/finance/tva/TVAProgressBar';

type Inv = API.FinanceCaseInvoice;

const statusClass: Record<API.FinanceInvoiceStatus, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-700',
  SENT: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  PARTIALLY_PAID: 'bg-amber-500/15 text-amber-800',
  PAID: 'bg-emerald-500/15 text-emerald-700',
  OVERDUE: 'bg-red-500/15 text-red-700',
  CANCELLED: 'bg-slate-500/10 text-slate-500 line-through',
};

type Props = {
  invoice: Inv;
  onPdf?: (inv: Inv) => void;
  onEdit?: (inv: Inv) => void;
  onDelete?: (inv: Inv) => void;
};

export const InvoiceCard: React.FC<Props> = ({ invoice, onPdf, onPreviewPdf, onEdit, onDelete }) => {
  const tvaExempt = invoice.tva_applicable === false;
  const exonerationLine = invoiceExonerationNote(invoice);
  const due = invoice.due_date;
  const days = due ? getCountdownDays(due) : null;
  const style = days != null ? (days < 0 ? 'critical' : getCountdownStyle(days)) : 'normal';

  const dueLine = () => {
    if (!due) return '—';
    const label = format(new Date(due), 'd MMM yyyy', { locale: fr });
    if (days == null) return label;
    if (days < 0) return <span className="text-red-600 dark:text-red-400 font-semibold">En retard · {label}</span>;
    if (days <= 3)
      return (
        <span className="text-red-600 dark:text-red-400 font-semibold">
          {label} · {days}j
        </span>
      );
    if (days <= 14)
      return (
        <span className="text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {label} · {days}j
        </span>
      );
    return `${label} · dans ${days}j`;
  };

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[13px] text-slate-600 dark:text-slate-400">{invoice.number}</span>
          <span
            className={cn(
              'ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
              statusClass[invoice.status]
            )}
          >
            {invoice.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex gap-1">
          {onPdf ? (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onPdf(invoice)}>
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
          ) : null}
          {onPreviewPdf ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              title="Aperçu"
              onClick={() => onPreviewPdf(invoice)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(invoice)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(invoice)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-1 text-[13px] text-slate-700 dark:text-slate-300">
        <p>Montant HT: {formatMAD(invoice.amount_ht)}</p>
        <p>
          {tvaExempt ? 'TVA' : 'TVA (20%)'}: {formatMAD(invoice.tva)}
        </p>
        {exonerationLine ? (
          <p className="text-[11px] italic leading-snug text-[#94a3b8]">{exonerationLine}</p>
        ) : null}
        <p className="font-semibold text-slate-900 dark:text-white">TTC: {formatMAD(invoice.amount_ttc)}</p>
        <p
          className={cn(
            'text-[12px]',
            style === 'critical' && 'text-red-600',
            style === 'warning' && 'text-amber-600'
          )}
        >
          Échéance: {dueLine()}
        </p>
      </div>
    </div>
  );
};
