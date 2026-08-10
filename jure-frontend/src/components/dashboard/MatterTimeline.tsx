// src/components/dashboard/MatterTimeline.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useMatterStore } from '@/stores/matterStore';
import { Calendar, AlertTriangle } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

export default function MatterTimeline({ matterId }: { matterId?: string }) {
  const { t } = useAppTranslation();
  const tl = t.dashboard.timeline;
  const { matters } = useMatterStore();
  const m = matters.find((x) => x.id === matterId) ?? matters[0];
  if (!m) return null;

  const sorted = [...m.events].sort((a, b) => a.date.localeCompare(b.date));

  const badge = (type?: string) =>
    type === 'deadline'
      ? 'bg-rose-100 text-rose-700'
      : type === 'hearing'
        ? 'bg-blue-100 text-blue-700'
        : type === 'filing'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-gray-100 text-gray-700';

  const typeLabel = (type?: string) => {
    if (type === 'deadline') return tl.types.deadline;
    if (type === 'hearing') return tl.types.hearing;
    if (type === 'filing') return tl.types.filing;
    return tl.types.note;
  };

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{tl.title}</CardTitle>
        <CardDescription className="text-xs">{tl.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((evt) => (
          <div
            key={evt.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-gray-900">{evt.label}</div>
                <div className="text-xs text-muted-foreground">{evt.date}</div>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full ${badge(evt.type)}`}>
              {typeLabel(evt.type)}
            </span>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> {tl.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
