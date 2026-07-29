// src/components/dashboard/ConflictCheckDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useMatterStore } from '@/stores/matterStore';
import { Search } from 'lucide-react';

export default function ConflictCheckDialog({open, onOpenChange}:{open:boolean; onOpenChange:(v:boolean)=>void}) {
  const { matters } = useMatterStore();
  const [q, setQ] = useState('');
  const parties = matters.flatMap(m => m.parties.map(p => ({...p, matter: m.title})));
  const results = q.trim()
    ? parties.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conflict & Party Check</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Type a person or company name…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-auto space-y-2">
            {results.map(r => (
              <div key={r.id} className="rounded-lg border border-gray-100 p-2">
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.role} in “{r.matter}”</div>
              </div>
            ))}
            {q && results.length === 0 && (
              <div className="text-xs text-muted-foreground">No conflicts found.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
