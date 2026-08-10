import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';

type Item = { id: string; name: string; tag: 'privileged' | 'public' | 'internal' };

export default function EvidenceManagerCard() {
  const { t } = useAppTranslation();
  const e = t.dashboard.evidence;
  const [items, setItems] = useState<Item[]>([]);

  const onUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setItems((s) => [{ id: crypto.randomUUID(), name: file.name, tag: 'internal' }, ...s]);
    ev.currentTarget.value = '';
  };

  const tagLabel = (tag: Item['tag']) => e.tags[tag];

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{e.title}</CardTitle>
        <CardDescription className="text-xs">{e.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <input type="file" onChange={onUpload} className="text-xs" />
        </div>
        <div className="space-y-2 max-h-48 overflow-auto">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-2"
            >
              <div className="text-sm">{it.name}</div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-1 rounded-full ${
                    it.tag === 'privileged'
                      ? 'bg-rose-100 text-rose-700'
                      : it.tag === 'public'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tagLabel(it.tag)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const order: Item['tag'][] = ['internal', 'privileged', 'public'];
                    setItems((s) =>
                      s.map((x) =>
                        x.id === it.id
                          ? { ...x, tag: order[(order.indexOf(x.tag) + 1) % order.length] }
                          : x
                      )
                    );
                  }}
                >
                  {e.toggleTag}
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground">{e.empty}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
