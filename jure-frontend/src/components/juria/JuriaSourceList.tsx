import React, { useState } from 'react';
import { Library, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JuriaProject, JuriaProjectSource } from '@/types/juria';
import { apiJuriaRemoveSource } from '@/services/juria/api';
import useJuriaStore from '@/stores/juriaStore';
import { JuriaAttachResourceDialog } from '@/components/juria/JuriaAttachResourceDialog';
import { useAppTranslation } from '@/i18n';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';
import {
  groupLibrarySources,
  isLibrarySource,
  libraryScopeFromSource,
  type LibraryScopeId,
} from '@/components/juria/librarySourceRows';

export function JuriaSourceList({ project }: { project: JuriaProject }) {
  const { t, tf } = useAppTranslation();
  const src = t.juria.workspace.sources;
  const hub = t.library.hub;
  const load = useJuriaStore((s) => s.loadProjectDetail);
  const sources = project.sources ?? [];
  const [attach, setAttach] = useState<'case' | 'library' | null>(null);

  const libraryLabel = (scope: LibraryScopeId) => {
    if (scope === 'LOCAL') return hub.tabLocal;
    if (scope === 'INTERNATIONAL') return hub.tabInternational;
    return hub.tabMy;
  };

  const kindLabel = (kind: string) => {
    if (kind === 'CASE') return t.juria.workspace.context.case;
    if (kind === 'CASE_DOCUMENT') return t.juria.workspace.documents.fromCase;
    if (kind === 'CALENDAR') return t.juria.workspace.context.calendar;
    if (kind === 'TASKS') return t.juria.workspace.context.tasks;
    if (kind === 'CLIENT') return t.juria.workspace.context.client;
    if (kind === 'TEAM') return t.juria.workspace.context.team;
    if (kind === 'UPLOAD') return t.juria.workspace.documents.import;
    return kind;
  };

  const removeSources = async (items: JuriaProjectSource[]) => {
    await Promise.all(items.map((item) => apiJuriaRemoveSource(project.id, item.id)));
    await load(project.id);
  };

  const libraryRows = groupLibrarySources(sources);
  const otherSources = sources.filter((s) => !isLibrarySource(s));
  const isEmpty = libraryRows.length === 0 && otherSources.length === 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {!project.linked_case_id && !project.is_simple ? (
            <JuriaLinkCaseControl project={project} compact />
          ) : null}
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAttach('case')} disabled={project.is_simple}>
            <Plus className="me-1 h-3.5 w-3.5" />
            {src.caseBtn}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAttach('library')}>
            <Plus className="me-1 h-3.5 w-3.5" />
            {src.libraryBtn}
          </Button>
        </div>
        {isEmpty ? (
          <div className="py-16 text-center">
            <Library className="mx-auto mb-3 h-8 w-8 text-[#64499D]/40" />
            <p className="text-sm font-medium text-slate-800 dark:text-white">{src.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {libraryRows.map((row) =>
              row.type === 'header' ? (
                <div key={row.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{src.libraryBtn}</p>
                    <p className="text-sm font-medium">{libraryLabel(row.scope)}</p>
                    <p className="text-[11px] text-slate-400">
                      {tf(t.juria.workspace.context.libraryCount, { count: row.sources.length })}
                    </p>
                  </div>
                  <button type="button" className="text-[11px] text-red-600" onClick={() => void removeSources(row.sources)}>
                    {src.remove}
                  </button>
                </div>
              ) : (
                <div key={row.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 ps-5 dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{libraryLabel(libraryScopeFromSource(row.source))}</p>
                    <p className="text-sm font-medium">{row.source.title || row.source.kind}</p>
                  </div>
                  <button type="button" className="text-[11px] text-red-600" onClick={() => void removeSources([row.source])}>
                    {src.remove}
                  </button>
                </div>
              )
            )}
            {otherSources.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{kindLabel(s.kind)}</p>
                  <p className="text-sm font-medium">{s.title || s.kind}</p>
                </div>
                <button type="button" className="text-[11px] text-red-600" onClick={() => void removeSources([s])}>
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
