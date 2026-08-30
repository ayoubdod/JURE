import React from 'react';
import dayjs from 'dayjs';
import { ArchiveRestore, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useJuriaStore from '@/stores/juriaStore';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { useAppTranslation } from '@/i18n';

export function JuriaArchiveView({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const { t, tf } = useAppTranslation();
  const w = t.juria.workspace;
  const items = useJuriaStore((s) => s.archivedProjects);
  const restore = useJuriaStore((s) => s.restoreProject);
  const del = useJuriaStore((s) => s.deleteProject);
  const setActive = useJuriaStore((s) => s.setActiveProject);
  const openProject = onOpenProject ?? setActive;
  const { toast } = useToast();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{w.archiveView.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{w.archiveView.subtitle}</p>
        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <ArchiveRestore className="mx-auto mb-3 h-10 w-10 text-[#64499D]/40" />
            <p className="text-sm text-slate-500">{w.archiveView.empty}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {items.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-[12px] text-slate-500">
                    {p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : '—'}
                    {p.linked_case_title ? ` · ${p.linked_case_title}` : ''}
                    {p.archived_at
                      ? ` · ${tf(w.archiveView.archivedOn, { date: dayjs(p.archived_at).format('DD MMM YYYY') })}`
                      : ''}
                    {` · ${tf(w.archiveView.lastActivity, { date: dayjs(p.updated_at).format('DD MMM YYYY') })}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => openProject(p.id)}>
                    <FolderOpen className="h-3.5 w-3.5" />
                    {w.actions.open}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() =>
                      void restore(p.id).catch((e) =>
                        toast({
                          title: w.archiveView.restoreFailed,
                          description: getJuriaErrorMessage(e),
                          variant: 'destructive',
                        })
                      )
                    }
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" />
                    {w.actions.restore}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs text-red-600"
                    onClick={() => {
                      if (!window.confirm(tf(w.archiveView.deleteConfirm, { name: p.name }))) return;
                      void del(p.id).catch((e) =>
                        toast({
                          title: w.archiveView.deleteFailed,
                          description: getJuriaErrorMessage(e),
                          variant: 'destructive',
                        })
                      );
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {w.actions.delete}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
