// src/components/dashboard/DeadlinesCard.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMatterStore } from '@/stores/matterStore';
import { CalendarPlus } from 'lucide-react';

function addDays(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function DeadlinesCard({ matterId = 'm1' }: { matterId?: string }) {
  const { addEvent } = useMatterStore();
  const [base, setBase] = useState<string>(new Date().toISOString().slice(0, 10));
  const [offset, setOffset] = useState<number>(30);
  const [label, setLabel] = useState<string>('Filing deadline');

  const due = addDays(base, offset);

  const save = () => {
    addEvent(matterId, {
      id: crypto.randomUUID(),
      label,
      date: due,
      type: 'deadline',
      priority: 'High',
    });
  };

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Deadline Calculator</CardTitle>
        <CardDescription className="text-xs">Compute statutory dates & add to timeline</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Base date</Label>
            <Input type="date" value={base} onChange={e => setBase(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Offset (days)</Label>
            <Input type="number" value={offset} onChange={e => setOffset(Number(e.target.value || 0))} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Appeal deadline" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span className="text-sm text-muted-foreground">Computed due date</span>
          <span className="text-sm font-medium text-gray-900">{due}</span>
        </div>
        <Button onClick={save} className="w-full rounded-lg">
          <CalendarPlus className="mr-2 h-4 w-4" /> Add to Matter Timeline
        </Button>
      </CardContent>
    </Card>
  );
}
