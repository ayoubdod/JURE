import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  apiJuriaAddSource,
  apiJuriaLookupCaseDocuments,
  apiJuriaLookupLibrary,
} from '@/services/juria/api';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';

export function JuriaAttachResourceDialog({
  open,
  onOpenChange,
  projectId,
  linkedCaseId,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  linkedCaseId?: number | null;
  kind: 'case' | 'library';
}) {
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [caseDocs, setCaseDocs] = useState<{ id: number; file_name: string }[]>([]);
  const [libDocs, setLibDocs] = useState<{ id: number; title: string; visibility_scope: string }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ('');
    if (kind === 'case' && linkedCaseId) {
      void apiJuriaLookupCaseDocuments(linkedCaseId).then(setCaseDocs).catch(() => setCaseDocs([]));
    }
  }, [open, kind, linkedCaseId]);

  useEffect(() => {
    if (!open || kind !== 'library') return;
    const t = window.setTimeout(() => {
      void apiJuriaLookupLibrary(q).then(setLibDocs).catch(() => setLibDocs([]));
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, kind, q]);

  const items =
    kind === 'case'
      ? caseDocs.map((d) => ({ id: d.id, label: d.file_name }))
      : libDocs.map((d) => ({ id: d.id, label: d.title }));

  const submit = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      if (kind === 'case') {
        await apiJuriaAddSource(projectId, { kind: 'CASE_DOCUMENT', case_document_ids: selected });
      } else {
        await apiJuriaAddSource(projectId, { kind: 'LIBRARY', library_document_ids: selected });
      }
      await load(projectId);
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Ajout impossible', description: getJuriaErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === 'case' ? 'Ajouter un document du dossier' : 'Ajouter depuis la bibliothèque'}
          </DialogTitle>
        </DialogHeader>
        {kind === 'case' && !linkedCaseId ? (
          <p className="py-6 text-center text-sm text-slate-500">Liez d’abord un dossier à ce projet.</p>
        ) : (
          <>
            {kind === 'library' && (
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-9 text-sm" />
            )}
            <div className="mt-2 max-h-64 overflow-y-auto text-sm">
              {items.length === 0 ? (
                <p className="py-8 text-center text-slate-400">Aucun document disponible.</p>
              ) : (
                items.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() =>
                        setSelected((prev) => (prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]))
                      }
                    />
                    <span className="truncate">{d.label}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button className="bg-[#64499D] hover:bg-[#4D3680]" disabled={!selected.length || saving} onClick={() => void submit()}>
                Ajouter au projet
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
