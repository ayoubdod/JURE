// src/components/dashboard/EngagementBudgetCard.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMatterStore } from '@/stores/matterStore';
import { useAppTranslation } from '@/i18n';

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
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{b.title}</CardTitle>
        <CardDescription className="text-xs">{b.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{b.budget}</span>
          <span className="font-medium">${budget.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{b.actual}</span>
          <span className="font-medium">${actual.toLocaleString()}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-purple-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground text-end">{tf(b.used, { pct })}</div>
      </CardContent>
    </Card>
  );
}
