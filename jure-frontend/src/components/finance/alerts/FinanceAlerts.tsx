import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { formatDate, useAppTranslation } from '@/i18n';
import { updateTaxAdvance } from '@/services/finance/api';
import { TaxAdvanceCard } from '@/components/case/panel/tabs/TaxAdvanceCard';
import { useToast } from '@/hooks/use-toast';

type Alert = API.FinanceAlert;

type Props = {
  alerts: Alert[];
  onOpenCase?: (caseId: number) => void;
  onMutated?: () => void;
};

const typeClass: Record<API.FinanceAlertType, string> = {
  OVERDUE_INVOICE: 'bg-red-500/10 border-red-200/80 dark:border-red-900/50',
  UNPAID_TAX_ADVANCE: 'bg-amber-500/10 border-amber-200/80 dark:border-amber-900/50',
  TVA_DUE: 'bg-orange-500/10 border-orange-200/80 dark:border-orange-900/50',
};

function useAlertCopy() {
  const { t, tf, lang } = useAppTranslation();

  return (a: Alert): string => {
    if (a.type === 'UNPAID_TAX_ADVANCE') {
      return tf(t.finance.caseTab.taxAdvanceAmount, { amount: formatMAD(a.amount ?? 0, lang) });
    }
    if (a.type === 'TVA_DUE') {
      return a.amount != null
        ? tf(t.finance.alerts.tvaDueAmount, { amount: formatMAD(a.amount, lang) })
        : t.finance.alerts.tvaDue;
    }
    if (a.invoice_number) {
      return tf(t.finance.alerts.overdueInvoice, { number: a.invoice_number });
    }
    return t.finance.alerts.overdueInvoiceFallback;
  };
}

export const FinanceAlerts: React.FC<Props> = ({ alerts, onOpenCase, onMutated }) => {
  const { t, lang } = useAppTranslation();
  const { toast } = useToast();
  const copy = useAlertCopy();
  const [payingId, setPayingId] = useState<string | null>(null);
  const count = alerts.length;
  const ct = t.finance.caseTab;

  const markPaid = async (a: Alert) => {
    if (a.case_id == null) return;
    setPayingId(a.id);
    try {
      await updateTaxAdvance(a.case_id, { status: 'PAID' });
      toast({ title: t.finance.toasts.taxAdvancePaid });
      onMutated?.();
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
          <AlertTriangle className="h-4 w-4 text-orange-600" aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.finance.alerts.title}</h3>
        <span
          className={cn(
            'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold',
            count > 0
              ? 'bg-jure-600/10 text-jure-700 dark:text-jure-300'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          )}
        >
          {count}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t.finance.alerts.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) =>
            a.type === 'UNPAID_TAX_ADVANCE' ? (
              <li key={a.id}>
                <TaxAdvanceCard
                  tax={{ amount: a.amount ?? 0, status: 'UNPAID' }}
                  heading={ct.taxAdvanceTitle}
                  busy={payingId === a.id}
                  onMarkPaid={a.case_id != null ? () => void markPaid(a) : undefined}
                  footer={
                    a.case_reference || typeof a.case_id === 'number' ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                        {a.case_reference ? (
                          <span>
                            {t.finance.columns.case}: {a.case_reference}
                          </span>
                        ) : null}
                        {typeof a.case_id === 'number' ? (
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-jure-300 bg-white px-2 py-1 text-[12px] font-medium text-jure-700 hover:bg-jure-50 dark:border-jure-700 dark:bg-slate-900 dark:text-jure-300 dark:hover:bg-slate-800"
                            onClick={() => onOpenCase?.(a.case_id as number)}
                          >
                            {t.finance.alerts.openCase}
                          </button>
                        ) : null}
                      </div>
                    ) : null
                  }
                />
              </li>
            ) : (
              <li
                key={a.id}
                className={cn('rounded-lg border px-3 py-2.5 text-[13px] leading-snug', typeClass[a.type])}
              >
                <div className="flex gap-2">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
                    {a.type === 'TVA_DUE' ? (
                      <Receipt className="h-4 w-4 text-orange-600" aria-hidden />
                    ) : (
                      <FileText className="h-4 w-4 text-red-600" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{copy(a)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-slate-600 dark:text-slate-400">
                      {a.case_reference ? (
                        <span>
                          {t.finance.columns.case}: {a.case_reference}
                        </span>
                      ) : null}
                      {a.amount != null && a.type !== 'TVA_DUE' ? (
                        <span>{formatMAD(a.amount, lang)}</span>
                      ) : null}
                      {a.due_date ? (
                        <span>
                          {formatDate(a.due_date, lang, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : null}
                    </div>
                    {typeof a.case_id === 'number' ? (
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center rounded-md border border-jure-300 bg-white px-2 py-1 text-[12px] font-medium text-jure-700 hover:bg-jure-50 dark:border-jure-700 dark:bg-slate-900 dark:text-jure-300 dark:hover:bg-slate-800"
                        onClick={() => onOpenCase?.(a.case_id as number)}
                      >
                        {t.finance.alerts.openCase}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
};
