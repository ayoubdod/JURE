import { ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardTeamOverdue } from '@/services/dashboard/api';
import { formatNumber, useAppTranslation } from '@/i18n';

type Props = {
  team: DashboardTeamOverdue | null | undefined;
  loading?: boolean;
};

export default function TeamOverdueSection({ team, loading }: Props) {
  const { t, tf, lang } = useAppTranslation();
  const copy = t.dashboard.team;
  const navigate = useNavigate();

  if (!loading && team == null) return null;

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      headerRight={
        team ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users size={12} aria-hidden />
            {tf(copy.totalOverdue, { count: formatNumber(team.total, lang) })}
          </span>
        ) : null
      }
      defaultOpen={Boolean(team && team.total > 0)}
    >
      {loading && !team ? (
        <div className="space-y-2" aria-busy="true" aria-label={copy.loading}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : !team || (team.by_assignee.length === 0 && team.unassigned === 0) ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {team.by_assignee.map((row) => (
            <li key={row.user_id}>
              <button
                type="button"
                onClick={() => navigate(row.href_hint || '/dashboard/tasks')}
                className="flex w-full min-h-[40px] items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
              >
                <span className="min-w-0 truncate text-xs font-medium text-slate-900 dark:text-white">
                  {row.name}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular-nums text-xs font-medium text-rose-700 dark:text-rose-400">
                    {formatNumber(row.count, lang)}
                  </span>
                  <ArrowRight size={12} className="text-muted-foreground rtl:rotate-180" aria-hidden />
                </span>
              </button>
            </li>
          ))}
          {team.unassigned > 0 ? (
            <li className="flex min-h-[40px] items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 px-2.5 py-2 dark:border-slate-700">
              <span className="text-xs text-muted-foreground">{copy.unassigned}</span>
              <span className="tabular-nums text-xs text-muted-foreground">
                {formatNumber(team.unassigned, lang)}
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </DashboardCollapsibleCard>
  );
}
