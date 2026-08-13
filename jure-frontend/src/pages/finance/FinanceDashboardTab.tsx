import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { MonthlyRevenueChart } from '@/components/finance/charts/MonthlyRevenueChart';
import { RevenueByLawyerChart } from '@/components/finance/charts/RevenueByLawyerChart';
import { FinanceAlerts } from '@/components/finance/alerts/FinanceAlerts';
import { TVAStatusWidget } from '@/components/finance/tva/TVAStatusWidget';
import { formatMAD } from '@/utils/formatMAD';
import { cn } from '@/lib/utils';
import type { TVAStatus } from '@/services/financeService';
import { getReceivables } from '@/services/finance/api';
import { useAppTranslation } from '@/i18n';

type Props = {
  dashboard: API.FinanceDashboard | null;
  year: number;
  showEmpty: boolean;
  onViewAllPayments?: () => void;
  onOpenCase?: (caseId: number) => void;
  tvaStatus?: TVAStatus | null;
};

export const FinanceDashboardTab: React.FC<Props> = ({
  dashboard,
  year,
  showEmpty,
  onViewAllPayments,
  onOpenCase,
  tvaStatus,
}) => {
  const { t } = useAppTranslation();
  const [receivables, setReceivables] = useState<API.FinanceReceivables | null>(null);

  useEffect(() => {
    if (showEmpty) {
      setReceivables(null);
      return;
    }
    getReceivables()
      .then((res) => setReceivables(res.data))
      .catch(() => setReceivables(null));
  }, [showEmpty, dashboard]);

  if (showEmpty || !dashboard) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-jure-500/20 to-indigo-500/10 text-3xl">
          📊
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t.finance.empty.title}</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {t.finance.empty.description}
        </p>
        <Link
          to="/dashboard/cases"
          className="mt-6 inline-flex items-center rounded-lg bg-jure-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-jure-700"
        >
          {t.finance.empty.goToCases}
        </Link>
      </div>
    );
  }

  const tx = dashboard.recent_transactions?.slice(0, 10) ?? [];
  const aging = receivables?.aging;

  return (
    <div className="space-y-6">
      {receivables ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Créances (receivables)</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[13px]">
            <div>
              <p className="text-slate-500">Facturé</p>
              <p className="font-semibold tabular-nums">{formatMAD(receivables.total_invoiced)}</p>
            </div>
            <div>
              <p className="text-slate-500">Encaissé</p>
              <p className="font-semibold tabular-nums">{formatMAD(receivables.total_collected)}</p>
            </div>
            <div>
              <p className="text-slate-500">Outstanding</p>
              <p className="font-semibold tabular-nums">{formatMAD(receivables.total_outstanding)}</p>
            </div>
            <div>
              <p className="text-slate-500">En retard</p>
              <p className="font-semibold tabular-nums text-red-600">{formatMAD(receivables.total_overdue)}</p>
            </div>
          </div>
          {aging ? (
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span>Current: {formatMAD(aging.CURRENT)}</span>
              <span>1–30: {formatMAD(aging['1_30'])}</span>
              <span>31–60: {formatMAD(aging['31_60'])}</span>
              <span>61–90: {formatMAD(aging['61_90'])}</span>
              <span>90+: {formatMAD(aging['90_PLUS'])}</span>
            </div>
          ) : null}
          {receivables.total_outstanding === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500">No outstanding receivables.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3 min-w-0">
          <MonthlyRevenueChart data={dashboard.monthly} year={year} />
        </div>
        <div className="xl:col-span-2 min-w-0">
          <RevenueByLawyerChart data={dashboard.revenue_by_lawyer} />
        </div>
      </div>

      {tvaStatus ? <TVAStatusWidget status={tvaStatus} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FinanceAlerts alerts={dashboard.alerts} onOpenCase={onOpenCase} />
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{t.finance.recentMovements}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-2">{t.finance.columns.case}</th>
                  <th className="py-2 pr-2">{t.finance.columns.client}</th>
                  <th className="py-2 pr-2 text-right">{t.finance.columns.amount}</th>
                  <th className="py-2 pr-2">{t.finance.columns.type}</th>
                  <th className="py-2">{t.finance.columns.date}</th>
                </tr>
              </thead>
              <tbody>
                {tx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      {t.finance.noMovements}
                    </td>
                  </tr>
                ) : (
                  tx.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-2 font-mono text-[11px]">{row.case_reference}</td>
                      <td className="py-2 pr-2">{row.client_name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatMAD(row.amount)}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            row.kind === 'PAIEMENT'
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                          )}
                        >
                          {row.kind === 'PAIEMENT'
                            ? t.finance.txKinds.PAIEMENT
                            : row.kind === 'HONORAIRE'
                              ? t.finance.txKinds.HONORAIRE
                              : row.kind}
                        </span>
                      </td>
                      <td className="py-2 tabular-nums text-slate-600">{row.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <button
              type="button"
              className="text-[13px] font-medium text-jure-600 hover:underline dark:text-jure-400"
              onClick={() => onViewAllPayments?.()}
            >
              {t.finance.viewAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
