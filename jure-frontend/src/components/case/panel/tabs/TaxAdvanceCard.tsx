import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { formatDate, useAppTranslation } from '@/i18n';

type T = API.FinanceTaxAdvance;

type Props = {
  tax: T;
  onMarkPaid?: () => void;
};

export const TaxAdvanceCard: React.FC<Props> = ({ tax, onMarkPaid }) => {
  const { t, tf, lang } = useAppTranslation();
  const ct = t.finance.caseTab;
  const paid = tax.status === 'PAID';
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
        ⚖️ {tf(ct.taxAdvanceAmount, { amount: formatMAD(tax.amount) })}
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
      {!paid && onMarkPaid ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={onMarkPaid}>
            ✓ {ct.markPaid}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
