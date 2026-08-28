import React from 'react';
import { Calendar, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { useAppTranslation } from '@/i18n';

type P = API.FinanceCasePayment;

const methodClass: Record<API.FinancePaymentMethod, string> = {
  CASH: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  VIREMENT_BANCAIRE: 'bg-blue-500/15 text-blue-800 dark:text-blue-300',
  CHEQUE: 'bg-amber-500/15 text-amber-900 dark:text-amber-300',
};

const methodLabel: Record<API.FinancePaymentMethod, string> = {
  CASH: 'Cash',
  VIREMENT_BANCAIRE: 'Virement',
  CHEQUE: 'Chèque',
};

type Props = {
  payment: P;
  onDelete?: (p: P) => void;
};

export const PaymentRow: React.FC<Props> = ({ payment, onDelete }) => {
  const { t } = useAppTranslation();
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                methodClass[payment.method]
              )}
            >
              {t.finance.paymentMethods[payment.method] ?? methodLabel[payment.method]}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatMAD(payment.amount)}
            </span>
          </div>
          <p className="font-mono text-[12px] text-slate-600">
            {t.finance.columns.reference}: {payment.reference || '—'}
          </p>
          <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {payment.date}
          </p>
          <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t.finance.columns.invoiceNumber}: {payment.invoice_number || '—'}
          </p>
        </div>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-red-600"
            onClick={() => onDelete(payment)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};
