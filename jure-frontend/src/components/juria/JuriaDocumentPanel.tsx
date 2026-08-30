import React, { useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useJuriaStore from '@/stores/juriaStore';
import { apiJuriaRemoveFile, apiJuriaUploadFile } from '@/services/juria/api';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { JuriaAttachResourceDialog } from '@/components/juria/JuriaAttachResourceDialog';
import { useAppTranslation } from '@/i18n';

export function JuriaDocumentPanel({ projectId }: { projectId: string }) {
  const { t } = useAppTranslation();
  const d = t.juria.workspace.documents;
  const files = useJuriaStore((s) => s.files);
  const loadFiles = useJuriaStore((s) => s.loadFiles);
  const project = useJuriaStore((s) => s.projects.find((p) => p.id === projectId) || s.archivedProjects.find((p) => p.id === projectId));
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [attach, setAttach] = useState<'case' | 'library' | null>(null);
  const filtered = files.filter((f) => f.original_name.toLowerCase().includes(q.toLowerCase()));

  const upload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.doc';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      void apiJuriaUploadFile(projectId, f)
        .then(() => loadFiles(projectId))
        .catch((e) => toast({ title: d.importFailed, description: getJuriaErrorMessage(e), variant: 'destructive' }));
    };
    input.click();
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.searchPlaceholder} className="h-9 max-w-xs text-sm" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setAttach('case')} disabled={!project?.linked_case_id}>
              {d.fromCase}
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setAttach('library')}>
              {d.library}
            </Button>
            <Button size="sm" className="gap-1 bg-[#64499D] hover:bg-[#4D3680]" onClick={upload}>
              <Upload className="h-3.5 w-3.5" />
              {d.import}
            </Button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-[#64499D]/40" />
            <p className="text-sm font-medium text-slate-800 dark:text-white">{d.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                <FileText className="h-4 w-4 text-[#64499D]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.original_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {f.file_kind?.toUpperCase()} {f.page_count ? `· ${f.page_count} p.` : ''}
                    {f.ocr_status === 'REQUIRED' ? ' · OCR requis (PDF scanné)' : f.ocr_status === 'FAILED' ? ' · extraction échouée' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    void apiJuriaRemoveFile(projectId, f.id).then(() => loadFiles(projectId));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <JuriaAttachResourceDialog
        open={attach !== null}
        onOpenChange={(v) => { if (!v) setAttach(null); }}
        projectId={projectId}
        linkedCaseId={project?.linked_case_id}
        kind={attach || 'library'}
      />
    </div>
  );
}
