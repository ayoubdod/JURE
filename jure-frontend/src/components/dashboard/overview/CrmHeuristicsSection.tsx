import { ArrowRight, Clock3, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardCrm } from '@/services/dashboard/api';
import { formatNumber, useAppTranslation } from '@/i18n';

type Props = {
  crm: DashboardCrm | null | undefined;
  loading?: boolean;
};

export default function CrmHeuristicsSection({ crm, loading }: Props) {
  const { t, tf, lang } = useAppTranslation();
  const copy = t.dashboard.crm;
  const navigate = useNavigate();

  const rules = crm?.rules;
  const staleDays = rules?.stale_matter_days ?? 30;
  const followDays = rules?.client_follow_up_days ?? 45;

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={tf(copy.description, { staleDays, followDays })}
      defaultOpen={Boolean(crm && (crm.stale_matters_count > 0 || crm.client_follow_ups_count > 0))}
    >
      {loading && !crm ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-busy="true" aria-label={copy.loading}>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : !crm ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                <Clock3 size={12} aria-hidden />
                {tf(copy.staleMatters, { days: staleDays })}
              </p>
              <span className="tabular-nums text-xs text-muted-foreground">
                {formatNumber(crm.stale_matters_count, lang)}
              </span>
            </div>
            {crm.stale_matters.length === 0 ? (
              <p className="text-xs text-muted-foreground">{copy.emptyStale}</p>
            ) : (
              <ul className="space-y-1.5">
                {crm.stale_matters.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => navigate(m.href_hint || `/dashboard/cases/${m.id}`)}
                      className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{m.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {m.days_idle != null
                            ? tf(copy.daysIdle, { days: m.days_idle })
                            : m.client || '—'}
                        </p>
                      </div>
                      <ArrowRight size={12} className="shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                <UserRound size={12} aria-hidden />
                {tf(copy.clientFollowUps, { days: followDays })}
              </p>
              <span className="tabular-nums text-xs text-muted-foreground">
                {formatNumber(crm.client_follow_ups_count, lang)}
              </span>
            </div>
            {crm.client_follow_ups.length === 0 ? (
              <p className="text-xs text-muted-foreground">{copy.emptyFollowUps}</p>
            ) : (
              <ul className="space-y-1.5">
                {crm.client_follow_ups.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate(c.href_hint || '/dashboard/clients')}
                      className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-900 dark:text-white">{c.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {tf(copy.daysIdle, { days: c.days_idle })}
                        </p>
                      </div>
                      <ArrowRight size={12} className="shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DashboardCollapsibleCard>
  );
}
