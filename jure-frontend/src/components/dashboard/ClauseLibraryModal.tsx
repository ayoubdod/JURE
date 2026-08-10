// src/components/dashboard/ClauseLibraryModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMatterStore } from '@/stores/matterStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useAppTranslation } from '@/i18n';

export default function ClauseLibraryModal({open, onOpenChange}:{open:boolean; onOpenChange:(v:boolean)=>void}) {
  const { t } = useAppTranslation();
  const m = t.dashboard.clauseLibrary;
  const { clauses } = useMatterStore();
  const [q, setQ] = useState('');
  const list = clauses.filter(c =>
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    c.tags?.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
  );

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={m.searchPlaceholder} value={q} onChange={e=>setQ(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-auto">
            {list.map(c => (
              <div key={c.id} className="rounded-xl border border-gray-100 p-3">
                <div className="text-sm font-medium">{c.title}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-4">{c.text}</p>
                <div className="mt-2 flex justify-end">
                  <Button variant="outline" size="sm" onClick={()=>copy(c.text)}>{m.copy}</Button>
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="text-xs text-muted-foreground">{m.empty}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
