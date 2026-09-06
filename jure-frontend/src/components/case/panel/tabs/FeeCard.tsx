import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { useAppTranslation } from '@/i18n';

type Fee = API.FinanceCaseFee;

const typeClass: Record<API.FinanceFeeType, string> = {
  FIXED: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300',
  HOURLY: 'bg-blue-500/15 text-blue-800 dark:text-blue-300',
  SUCCESS_FEE: 'bg-purple-500/15 text-purple-800 dark:text-purple-300',
};

type Props = {
  fee: Fee;
  onEdit?: (fee: Fee) => void;
  onDelete?: (fee: Fee) => void;
};

export const FeeCard: React.FC<Props> = ({ fee, onEdit, onDelete }) => {
  const { t, tf, lang } = useAppTranslation();
  const ct = t.finance.caseTab;
  const planned = fee.planned_amount || 1;
  const pct = Math.min(100, Math.round(((fee.paid_amount || 0) / planned) * 100));
  const barClass =
    pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', typeClass[fee.fee_type])}>
            {t.finance.feeTypes[fee.fee_type]}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t.finance.feeStatuses[fee.status]}
          </span>
        </div>
        <div className="flex gap-1">
          {onEdit ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(fee)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => onDelete(fee)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
        {ct.lawyer}: <span className="font-medium text-slate-900 dark:text-white">{fee.lawyer_name}</span>
      </p>
      <p className="mt-1 text-[13px]">{ct.planned}: {formatMAD(fee.planned_amount, lang)}</p>
      <p className="text-[13px] text-slate-700 dark:text-slate-300">
        {ct.invoiced}: {formatMAD(fee.invoiced_amount, lang)} · {ct.paid}: {formatMAD(fee.paid_amount, lang)}
      </p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>{tf(ct.paidPct, { pct })}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};
