import { ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardConflictReviewItem } from '@/services/dashboard/api';
import { formatRelativeTime, useAppTranslation } from '@/i18n';

type Props = {
  items: DashboardConflictReviewItem[] | null | undefined;
  loading?: boolean;
};

export default function ConflictReviewQueue({ items, loading }: Props) {
  const { t, tf, lang } = useAppTranslation();
  const copy = t.dashboard.conflictReview;
  const navigate = useNavigate();

  if (!loading && items == null) return null;

  const rows = items ?? [];

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      headerRight={
        rows.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <ShieldAlert size={12} aria-hidden />
            {tf(copy.pendingCount, { count: rows.length })}
          </span>
        ) : null
      }
      defaultOpen={rows.length > 0}
    >
      {loading && items == null ? (
        <div className="space-y-2" aria-busy="true" aria-label={copy.loading}>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => {
                  if (row.matter_id) {
                    navigate(`/dashboard/cases/${row.matter_id}`);
                    return;
                  }
                  navigate(row.href_hint || '/dashboard/cases');
                }}
                className="flex w-full min-h-[44px] items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
                    {row.search_query}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {row.matter_reference
                      ? tf(copy.matterRef, { reference: row.matter_reference })
                      : copy.noMatter}
                    {row.created ? ` · ${formatRelativeTime(row.created, lang) || ''}` : ''}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular-nums text-[11px] text-muted-foreground">
                    {tf(copy.matches, { count: row.result_count })}
                  </span>
                  <ArrowRight size={12} className="text-muted-foreground rtl:rotate-180" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardCollapsibleCard>
  );
}
