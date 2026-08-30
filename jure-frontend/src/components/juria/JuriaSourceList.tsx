import React, { useState } from 'react';
import { Library, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JuriaProject } from '@/types/juria';
import { apiJuriaRemoveSource } from '@/services/juria/api';
import useJuriaStore from '@/stores/juriaStore';
import { JuriaAttachResourceDialog } from '@/components/juria/JuriaAttachResourceDialog';
import { useAppTranslation } from '@/i18n';

export function JuriaSourceList({ project }: { project: JuriaProject }) {
  const { t } = useAppTranslation();
  const src = t.juria.workspace.sources;
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const sources = project.sources ?? [];
  const [attach, setAttach] = useState<'case' | 'library' | null>(null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAttach('case')} disabled={!project.linked_case_id}>
            <Plus className="me-1 h-3.5 w-3.5" />
            {src.caseBtn}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAttach('library')}>
            <Plus className="me-1 h-3.5 w-3.5" />
            {src.libraryBtn}
          </Button>
        </div>
        {sources.length === 0 ? (
          <div className="py-16 text-center">
            <Library className="mx-auto mb-3 h-8 w-8 text-[#64499D]/40" />
            <p className="text-sm font-medium text-slate-800 dark:text-white">{src.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.kind}</p>
                  <p className="text-sm font-medium">{s.title || s.kind}</p>
                </div>
                <button
                  type="button"
                  className="text-[11px] text-red-600"
                  onClick={() => void apiJuriaRemoveSource(project.id, s.id).then(() => load(project.id))}
                >
                  {src.remove}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <JuriaAttachResourceDialog
        open={attach !== null}
        onOpenChange={(v) => { if (!v) setAttach(null); }}
        projectId={project.id}
        linkedCaseId={project.linked_case_id}
        kind={attach || 'library'}
      />
    </div>
  );
}
