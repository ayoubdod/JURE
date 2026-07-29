// src/components/dashboard/ResearchNotebookCard.tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Note = { id: string; title: string; citation: string; summary: string };

export default function ResearchNotebookCard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tmp, setTmp] = useState<Note>({ id: '', title: '', citation: '', summary: '' });

  const add = () => {
    if (!tmp.title) return;
    setNotes((s) => [{ ...tmp, id: crypto.randomUUID() }, ...s]);
    setTmp({ id: '', title: '', citation: '', summary: '' });
  };

  return (
    <Card className="rounded-2xl border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Research Notebook</CardTitle>
        <CardDescription className="text-xs">Save authorities with citations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Case/Article Title" value={tmp.title} onChange={e=>setTmp({...tmp, title: e.target.value})} />
        <Input placeholder="Citation (e.g., 123 F.3d 456)" value={tmp.citation} onChange={e=>setTmp({...tmp, citation: e.target.value})} />
        <Textarea placeholder="Key holding / relevance…" value={tmp.summary} onChange={e=>setTmp({...tmp, summary: e.target.value})} />
        <Button className="w-full rounded-lg" onClick={add}>Save Note</Button>
        <div className="space-y-2 max-h-40 overflow-auto">
          {notes.map(n => (
            <div key={n.id} className="rounded-xl border border-gray-100 p-2">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.citation}</div>
              <p className="text-xs mt-1">{n.summary}</p>
            </div>
          ))}
          {notes.length===0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
