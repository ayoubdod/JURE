import React, { type ReactNode } from 'react';
import { Check, Loader2, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { formatDate, useAppTranslation } from '@/i18n';

type T = API.FinanceTaxAdvance;

type Props = {
  tax: T;
  onMarkPaid?: () => void;
  busy?: boolean;
  /** When set, shown above the amount line (e.g. dashboard alerts). */
  heading?: string;
  footer?: ReactNode;
};

export const TaxAdvanceCard: React.FC<Props> = ({ tax, onMarkPaid, busy, heading, footer }) => {
  const { t, tf, lang } = useAppTranslation();
  const ct = t.finance.caseTab;
  const paid = tax.status === 'PAID';
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {heading ? (
        <p className="mb-2 text-[12px] font-semibold text-slate-600 dark:text-slate-400">{heading}</p>
      ) : null}
      <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
          <Scale className="h-4 w-4 text-orange-600" aria-hidden />
        </span>
        <span>{tf(ct.taxAdvanceAmount, { amount: formatMAD(tax.amount, lang) })}</span>
      </p>
      <div className="mt-3">
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
            paid
              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/15 text-red-600 dark:text-red-400'
          )}
        >
          {paid ? ct.taxPaid : ct.taxUnpaid}
        </span>
      </div>
      {paid && tax.paid_at ? (
        <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
          {tf(ct.paymentDate, {
            date: formatDate(tax.paid_at, lang, { month: 'short', day: 'numeric', year: 'numeric' }),
          })}
        </p>
      ) : null}
      {footer}
      {!paid && onMarkPaid ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-9 bg-jure-600 px-3 text-[13px] font-semibold text-white hover:bg-jure-700"
            onClick={onMarkPaid}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
            {ct.markPaid}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
