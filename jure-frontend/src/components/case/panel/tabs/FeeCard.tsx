import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';

type Fee = API.FinanceCaseFee;

const typeLabel: Record<API.FinanceFeeType, { label: string; className: string }> = {
  FIXED: { label: 'Forfait', className: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300' },
  HOURLY: { label: 'Horaire', className: 'bg-blue-500/15 text-blue-800 dark:text-blue-300' },
  SUCCESS_FEE: { label: 'Résultat', className: 'bg-purple-500/15 text-purple-800 dark:text-purple-300' },
};

const statusLabel: Record<string, string> = {
  PENDING: 'En attente',
  INVOICED: 'Facturé',
  PAID: 'Payé',
  PARTIAL: 'Partiel',
  PARTIALLY_PAID: 'Partiel',
  CANCELLED: 'Annulé',
};

type Props = {
  fee: Fee;
  onEdit?: (fee: Fee) => void;
  onDelete?: (fee: Fee) => void;
};

export const FeeCard: React.FC<Props> = ({ fee, onEdit, onDelete }) => {
  const planned = fee.planned_amount || 1;
  const pct = Math.min(100, Math.round(((fee.paid_amount || 0) / planned) * 100));
  const barClass =
    pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  const tl = typeLabel[fee.fee_type];

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', tl.className)}>
            {tl.label}
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {statusLabel[fee.status] ?? fee.status}
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
        Lawyer: <span className="font-medium text-slate-900 dark:text-white">{fee.lawyer_name}</span>
      </p>
      <p className="mt-1 text-[13px]">Prévu: {formatMAD(fee.planned_amount)}</p>
      <p className="text-[13px] text-slate-700 dark:text-slate-300">
        Facturé: {formatMAD(fee.invoiced_amount)} · Payé: {formatMAD(fee.paid_amount)}
      </p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>{pct}% payé</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};
