import { ArrowRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardPortfolio } from '@/services/dashboard/api';
import { formatNumber, useAppTranslation } from '@/i18n';

type Props = {
  portfolio: DashboardPortfolio | null | undefined;
  loading?: boolean;
};

function BucketList({
  title,
  rows,
  onOpen,
  empty,
}: {
  title: string;
  rows: { key: string; count: number; href_hint?: string; label?: string }[];
  onOpen: (href?: string) => void;
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onOpen(row.href_hint)}
                className="flex w-full min-h-[40px] items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/50 px-2.5 py-2 text-start transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
              >
                <span className="min-w-0 truncate text-xs font-medium text-slate-900 dark:text-white">
                  {row.label || row.key}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="tabular-nums text-xs text-muted-foreground">{row.count}</span>
                  <ArrowRight size={12} className="text-muted-foreground rtl:rotate-180" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PortfolioSection({ portfolio, loading }: Props) {
  const { t, lang, enumLabel, enumPretty } = useAppTranslation();
  const copy = t.dashboard.portfolio;
  const navigate = useNavigate();

  const onOpen = (href?: string) => {
    navigate(href || '/dashboard/cases');
  };

  const byStatus =
    portfolio?.by_status?.map((b) => ({
      ...b,
      label: enumLabel('caseStatus', b.key) || enumPretty(b.key) || b.key,
    })) ?? [];
  const byType =
    portfolio?.by_type?.map((b) => ({
      ...b,
      label: enumLabel('caseType', b.key) || enumPretty(b.key) || b.key,
    })) ?? [];
  const byLawyer =
    portfolio?.by_lawyer?.map((b) => ({
      key: String(b.user_id),
      count: b.count,
      href_hint: b.href_hint,
      label: b.name,
    })) ?? [];

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      headerRight={
        portfolio ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase size={12} aria-hidden />
            {loading
              ? '—'
              : `${formatNumber(portfolio.active_total, lang)} / ${formatNumber(portfolio.total, lang)}`}
          </span>
        ) : null
      }
    >
      {loading && !portfolio ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-busy="true" aria-label={copy.loading}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : !portfolio ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BucketList title={copy.byStatus} rows={byStatus} onOpen={onOpen} empty={copy.emptyBucket} />
          <BucketList title={copy.byType} rows={byType} onOpen={onOpen} empty={copy.emptyBucket} />
          <BucketList title={copy.byLawyer} rows={byLawyer} onOpen={onOpen} empty={copy.emptyBucket} />
        </div>
      )}
    </DashboardCollapsibleCard>
  );
}
