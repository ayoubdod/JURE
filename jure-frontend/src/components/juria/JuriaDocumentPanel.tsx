import React, { useMemo, useState } from 'react';
import { FileText, Library, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useJuriaStore from '@/stores/juriaStore';
import { apiJuriaRemoveFile, apiJuriaRemoveSource, apiJuriaUploadFile } from '@/services/juria/api';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { JuriaAttachResourceDialog } from '@/components/juria/JuriaAttachResourceDialog';
import { useAppTranslation } from '@/i18n';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';
import {
  groupLibrarySources,
  libraryScopeFromSource,
  type LibraryScopeId,
} from '@/components/juria/librarySourceRows';
import type { JuriaFile, JuriaProjectSource } from '@/types/juria';

type DocRow =
  | { key: string; title: string; subtitle: string; icon: 'file' | 'library'; remove: () => Promise<void> };

export function JuriaDocumentPanel({ projectId }: { projectId: string }) {
  const { t, tf } = useAppTranslation();
  const d = t.juria.workspace.documents;
  const src = t.juria.workspace.sources;
  const hub = t.library.hub;
  const files = useJuriaStore((s) => s.files);
  const loadFiles = useJuriaStore((s) => s.loadFiles);
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const project = useJuriaStore(
    (s) => s.projects.find((p) => p.id === projectId) || s.archivedProjects.find((p) => p.id === projectId)
  );
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [attach, setAttach] = useState<'case' | 'library' | null>(null);

  const libraryLabel = (scope: LibraryScopeId) => {
    if (scope === 'LOCAL') return hub.tabLocal;
    if (scope === 'INTERNATIONAL') return hub.tabInternational;
    return hub.tabMy;
  };

  const removeSources = async (items: JuriaProjectSource[]) => {
    await Promise.all(items.map((item) => apiJuriaRemoveSource(projectId, item.id)));
    await load(projectId);
  };

  const rows = useMemo<DocRow[]>(() => {
    const next: DocRow[] = files.map((f: JuriaFile) => ({
      key: `file-${f.id}`,
      title: f.original_name,
      subtitle: [
        f.file_kind?.toUpperCase(),
        f.page_count ? `${f.page_count} p.` : '',
        f.ocr_status === 'REQUIRED' ? d.ocrRequired : f.ocr_status === 'FAILED' ? d.extractFailed : '',
      ]
        .filter(Boolean)
        .join(' · '),
      icon: 'file',
      remove: () => apiJuriaRemoveFile(projectId, f.id).then(() => loadFiles(projectId)),
    }));

    const sources = project?.sources ?? [];
    for (const s of sources) {
      if (s.kind !== 'CASE_DOCUMENT') continue;
      next.push({
        key: `case-${s.id}`,
        title: s.title || s.kind,
        subtitle: d.fromCase,
        icon: 'file',
        remove: () => removeSources([s]),
      });
    }

    for (const row of groupLibrarySources(sources)) {
      if (row.type === 'header') {
        next.push({
          key: row.key,
          title: libraryLabel(row.scope),
          subtitle: tf(t.juria.workspace.context.libraryCount, { count: row.sources.length }),
          icon: 'library',
          remove: () => removeSources(row.sources),
        });
      } else {
        next.push({
          key: row.key,
          title: row.source.title || libraryLabel(libraryScopeFromSource(row.source)),
          subtitle: libraryLabel(libraryScopeFromSource(row.source)),
          icon: 'file',
          remove: () => removeSources([row.source]),
        });
      }
    }
    return next;
  }, [d.extractFailed, d.fromCase, d.ocrRequired, files, hub.tabInternational, hub.tabLocal, hub.tabMy, load, loadFiles, project?.sources, projectId, t.juria.workspace.context.libraryCount, tf]);

  const filtered = rows.filter((row) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${row.title} ${row.subtitle}`.toLowerCase().includes(needle);
  });

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
          <div className="flex flex-wrap gap-2">
            {project && !project.linked_case_id && !project.is_simple ? (
              <JuriaLinkCaseControl project={project} compact />
            ) : null}
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setAttach('case')} disabled={!project || project.is_simple}>
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
            {filtered.map((row) => (
              <div key={row.key} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                {row.icon === 'library' ? (
                  <Library className="h-4 w-4 shrink-0 text-[#64499D]" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-[#64499D]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  {row.subtitle ? <p className="text-[11px] text-slate-400">{row.subtitle}</p> : null}
                </div>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => {
                    void row.remove().catch((e) =>
                      toast({ title: src.addFailed, description: getJuriaErrorMessage(e), variant: 'destructive' })
                    );
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

