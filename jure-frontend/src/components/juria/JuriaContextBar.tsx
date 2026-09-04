import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JuriaContextSummary, JuriaProject } from '@/types/juria';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppTranslation } from '@/i18n';
import { JuriaLinkCaseControl } from '@/components/juria/JuriaLinkCaseControl';

export function JuriaContextBar({
  project,
  context,
}: {
  project: JuriaProject;
  context?: JuriaContextSummary | null;
}) {
  const { t, tf } = useAppTranslation();
  const c = t.juria.workspace.context;
  const [open, setOpen] = useState(false);
  const ctx = context ?? project.context;
  const chips: { label: string; ok: boolean }[] = [
    { label: c.case, ok: Boolean(ctx?.case) },
    {
      label: tf(c.documentsCount, { count: ctx?.documents_count ?? 0 }),
      ok: (ctx?.documents_count ?? 0) > 0,
    },
    { label: c.library, ok: (ctx?.library_count ?? 0) > 0 },
    { label: c.calendar, ok: Boolean(ctx?.calendar_connected) },
    { label: c.tasks, ok: Boolean(ctx?.tasks_connected) },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-wrap items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-[#64499D]/[0.04] to-transparent px-4 py-2 text-left dark:border-slate-800"
      >
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
          Juria · {project.name}
        </span>
        <span className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                chip.ok
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500'
              )}
            >
              {chip.ok && <Check className="h-2.5 w-2.5" />}
              {chip.label}
              {chip.ok ? ' ✓' : ''}
            </span>
          ))}
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <Block title={c.case}>
              {ctx?.case ? (
                `✓ ${ctx.case.reference} — ${ctx.case.title}`
              ) : (
                <span className="flex flex-col items-start gap-2">
                  <span>{c.notConnected}</span>
                  {!project.is_simple ? <JuriaLinkCaseControl project={project} compact /> : null}
                </span>
              )}
            </Block>
            <Block title={c.documents}>
              {(ctx?.documents_count ?? 0) > 0
                ? `✓ ${tf(c.documentsCount, { count: ctx?.documents_count ?? 0 })}`
                : c.notConnected}
            </Block>
            <Block title={c.library}>
              {(ctx?.library_count ?? 0) > 0
                ? `✓ ${tf(c.libraryCount, { count: ctx?.library_count ?? 0 })}`
                : c.notConnected}
            </Block>
            <Block title={c.calendar}>
              {ctx?.calendar_connected ? `✓ ${c.connected}` : c.notConnected}
            </Block>
            <Block title={c.tasks}>{ctx?.tasks_connected ? `✓ ${c.connected}` : c.notConnected}</Block>
            <Block title={c.client}>
              {ctx?.clients?.length
                ? ctx.clients.map((cl) => `✓ ${cl.first_name} ${cl.last_name}`).join(', ')
                : c.notConnected}
            </Block>
            <Block title={c.team}>
              {(ctx?.team_count ?? 0) > 0
                ? `✓ ${tf(c.teamCount, { count: ctx?.team_count ?? 0 })}`
                : c.notConnected}
            </Block>
            <p className="text-[11px] text-slate-400">{c.privacyNote}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="mt-0.5 text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  );
}
