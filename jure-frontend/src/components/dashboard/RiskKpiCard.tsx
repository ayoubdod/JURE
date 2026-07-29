// src/components/dashboard/RiskKpiCard.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function RiskKpiCard() {
  const metrics = [
    { label: 'WIP Aging > 60d', value: 5 },
    { label: 'Open High-Risk Matters', value: 3 },
    { label: 'Realization Rate', value: 82 }, // %
  ];

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Partner KPIs</CardTitle>
        <CardDescription className="text-xs">Risk & financial snapshots</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((m, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{m.label}</span>
              <span className="font-medium">{m.label.includes('%') ? `${m.value}%` : m.value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, m.value)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
