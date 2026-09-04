import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiJuriaAddSource, apiJuriaLookupCaseDocuments } from '@/services/juria/api';
import { apiGetLibrary, parseLibraryList, type LibraryTab } from '@/services/library/api';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type LibraryScope = 'PERSONAL' | 'LOCAL' | 'INTERNATIONAL';
type LibDoc = { id: number; title: string };

const SCOPE_TO_TAB: Record<LibraryScope, LibraryTab> = {
  PERSONAL: 'my',
  LOCAL: 'local',
  INTERNATIONAL: 'international',
};

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
  const project = useJuriaStore(
    (s) => s.projects.find((p) => p.id === projectId) || s.archivedProjects.find((p) => p.id === projectId)
  );
  const { t } = useAppTranslation();
  const src = t.juria.workspace.sources;
  const hub = t.library.hub;
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [libraryScope, setLibraryScope] = useState<LibraryScope>('PERSONAL');
  const [caseDocs, setCaseDocs] = useState<{ id: number; file_name: string }[]>([]);
  const [libDocs, setLibDocs] = useState<LibDoc[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ('');
    setLibraryScope('PERSONAL');
    if (kind === 'case' && linkedCaseId) {
      void apiJuriaLookupCaseDocuments(linkedCaseId).then(setCaseDocs).catch(() => setCaseDocs([]));
    }
  }, [open, kind, linkedCaseId]);

  useEffect(() => {
    if (!open || kind !== 'library') return;
    let cancelled = false;
    setLoadingList(true);
    const timer = window.setTimeout(() => {
      void apiGetLibrary(SCOPE_TO_TAB[libraryScope], {
        search: q.trim() || undefined,
        all: true,
      })
        .then((res) => {
          if (cancelled) return;
          setLibDocs(
            parseLibraryList(res.data).map((d) => ({ id: d.id, title: d.title || `#${d.id}` }))
          );
        })
        .catch((e) => {
          if (cancelled) return;
          setLibDocs([]);
          toast({ title: src.addFailed, description: getJuriaErrorMessage(e), variant: 'destructive' });
        })
        .finally(() => {
          if (!cancelled) setLoadingList(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, kind, q, libraryScope, src.addFailed, toast]);

  const items =
    kind === 'case'
      ? caseDocs.map((d) => ({ id: d.id, label: d.file_name }))
      : libDocs.map((d) => ({ id: d.id, label: d.title }));

  const allVisibleSelected = items.length > 0 && items.every((d) => selected.includes(d.id));

  const finish = async () => {
    await load(projectId);
    onOpenChange(false);
  };

  const fail = (e: unknown) => {
    toast({ title: src.addFailed, description: getJuriaErrorMessage(e), variant: 'destructive' });
  };

  const submitSelected = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      if (kind === 'case') {
        await apiJuriaAddSource(projectId, { kind: 'CASE_DOCUMENT', case_document_ids: selected });
      } else {
        await apiJuriaAddSource(projectId, { kind: 'LIBRARY', library_document_ids: selected });
      }
      await finish();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const submitLibraryScope = async (scopes: LibraryScope[] | 'ALL') => {
    setSaving(true);
    try {
      await apiJuriaAddSource(projectId, {
        kind: 'LIBRARY',
        ...(scopes === 'ALL' ? { link_all_libraries: true } : { library_scopes: scopes }),
      });
      await finish();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };

  const scopeTabs = useMemo(
    () =>
      [
        { id: 'PERSONAL' as const, label: hub.tabMy },
        { id: 'LOCAL' as const, label: hub.tabLocal },
        { id: 'INTERNATIONAL' as const, label: hub.tabInternational },
      ],
    [hub.tabInternational, hub.tabLocal, hub.tabMy]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', kind === 'library' && 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle>{kind === 'case' ? src.addFromCase : src.addFromLibrary}</DialogTitle>
        </DialogHeader>
        {kind === 'case' && !linkedCaseId ? (
          <div className="space-y-3 py-2">
            <p className="text-center text-sm text-slate-500">{t.juria.workspace.overview.noCase}</p>
            {project ? <JuriaLinkCaseControl project={project} /> : null}
          </div>
        ) : (
          <>
            {kind === 'library' && (
              <>
                <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {scopeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setLibraryScope(tab.id);
                        setSelected([]);
                      }}
                      className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
                        libraryScope === tab.id
                          ? 'bg-white text-[#64499D] shadow-sm dark:bg-slate-950'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={hub.searchPlaceholder}
                  className="h-9 text-sm"
                />
              </>
            )}
            <div className="mt-2 max-h-64 overflow-y-auto text-sm">
              {loadingList ? (
                <p className="flex items-center justify-center gap-2 py-8 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </p>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-slate-400">{src.noDocuments}</p>
              ) : (
                items.map((d) => (
                  <label
                    key={d.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                        )
                      }
                    />
                    <span className="truncate">{d.label}</span>
                  </label>
                ))
              )}
            </div>
            {kind === 'library' && items.length > 0 ? (
              <button
                type="button"
                className="text-start text-[11px] text-[#64499D] hover:underline"
                onClick={() =>
                  setSelected(allVisibleSelected ? [] : items.map((d) => d.id))
                }
              >
                {src.selectAllVisible}
              </button>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {kind === 'library' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void submitLibraryScope([libraryScope])}
                  >
                    {src.linkThisLibrary}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void submitLibraryScope('ALL')}
                  >
                    {src.linkAllLibraries}
                  </Button>
                </>
              ) : null}
              <Button
                className="bg-[#64499D] hover:bg-[#4D3680]"
                disabled={!selected.length || saving}
                onClick={() => void submitSelected()}
              >
                {src.addSelected}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
