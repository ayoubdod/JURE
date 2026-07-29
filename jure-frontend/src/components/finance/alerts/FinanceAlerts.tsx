import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';

type Alert = API.FinanceAlert;

type Props = {
  alerts: Alert[];
  onOpenCase?: (caseId: number) => void;
};

const typeClass: Record<API.FinanceAlertType, string> = {
  OVERDUE_INVOICE: 'bg-red-500/10 border-red-200/80 dark:border-red-900/50',
  UNPAID_TAX_ADVANCE: 'bg-amber-500/10 border-amber-200/80 dark:border-amber-900/50',
  TVA_DUE: 'bg-orange-500/10 border-orange-200/80 dark:border-orange-900/50',
};

export const FinanceAlerts: React.FC<Props> = ({ alerts, onOpenCase }) => {
  const count = alerts.length;
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">⚠️ Alertes</h3>
        <span
          className={cn(
            'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold',
            count > 0
              ? 'bg-red-600 text-white'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          )}
        >
          {count}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="rounded-lg border border-emerald-200/60 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-300">
          ✅ Aucune alerte
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-[13px] leading-snug',
                typeClass[a.type]
              )}
            >
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{a.message}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-slate-600 dark:text-slate-400">
                    {a.case_reference ? <span>Dossier: {a.case_reference}</span> : null}
                    {a.amount != null ? <span>{formatMAD(a.amount)}</span> : null}
                    {a.due_date ? <span>Échéance: {a.due_date}</span> : null}
                  </div>
                  {typeof a.case_id === 'number' ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center rounded-md border border-jure-300 bg-white px-2 py-1 text-[12px] font-medium text-jure-700 hover:bg-jure-50 dark:border-jure-700 dark:bg-slate-900 dark:text-jure-300 dark:hover:bg-slate-800"
                      onClick={() => onOpenCase?.(a.case_id)}
                    >
                      Ouvrir dossier
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
