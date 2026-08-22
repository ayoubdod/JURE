// src/components/dashboard/EngagementBudgetCard.tsx
import { useMatterStore } from '@/stores/matterStore';
import { useAppTranslation } from '@/i18n';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';

export default function EngagementBudgetCard({ matterId }: { matterId?: string }) {
  const { t, tf } = useAppTranslation();
  const b = t.dashboard.budget;
  const { matters } = useMatterStore();
  const m = matters.find((x) => x.id === matterId) ?? matters[0];
  if (!m) return null;
  const budget = m.budget ?? 0;
  const actual = m.actual ?? 0;
  const pct = budget > 0 ? Math.min(100, Math.round((actual / budget) * 100)) : 0;

  return (
    <DashboardCollapsibleCard
      className="rounded-2xl"
      title={b.title}
      description={b.description}
      contentClassName="space-y-2"
    >
        <div className="flex justify-between text-sm text-slate-900 dark:text-white">
          <span>{b.budget}</span>
          <span className="font-medium">${budget.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-900 dark:text-white">
          <span>{b.actual}</span>
          <span className="font-medium">${actual.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-2 rounded-full bg-purple-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground text-end">{tf(b.used, { pct })}</div>
    </DashboardCollapsibleCard>
  );
}
