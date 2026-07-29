import React from 'react';
import { Link } from 'react-router';
import { MonthlyRevenueChart } from '@/components/finance/charts/MonthlyRevenueChart';
import { RevenueByLawyerChart } from '@/components/finance/charts/RevenueByLawyerChart';
import { FinanceAlerts } from '@/components/finance/alerts/FinanceAlerts';
import { TVAStatusWidget } from '@/components/finance/tva/TVAStatusWidget';
import { formatMAD } from '@/utils/formatMAD';
import { cn } from '@/lib/utils';
import type { TVAStatus } from '@/services/financeService';

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
  if (showEmpty || !dashboard) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-jure-500/20 to-indigo-500/10 text-3xl">
          📊
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Aucune donnée financière</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          Commencez par ajouter un honoraire à un dossier
        </p>
        <Link
          to="/dashboard/cases"
          className="mt-6 inline-flex items-center rounded-lg bg-jure-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-jure-700"
        >
          Aller aux dossiers →
        </Link>
      </div>
    );
  }

  const tx = dashboard.recent_transactions?.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
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
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Derniers mouvements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-2">Dossier</th>
                  <th className="py-2 pr-2">Client</th>
                  <th className="py-2 pr-2 text-right">Montant</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {tx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Aucun mouvement
                    </td>
                  </tr>
                ) : (
                  tx.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-2 font-mono text-[11px]">{t.case_reference}</td>
                      <td className="py-2 pr-2">{t.client_name}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatMAD(t.amount)}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            t.kind === 'PAIEMENT'
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                          )}
                        >
                          {t.kind}
                        </span>
                      </td>
                      <td className="py-2 tabular-nums text-slate-600">{t.date}</td>
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
              Voir tout →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
