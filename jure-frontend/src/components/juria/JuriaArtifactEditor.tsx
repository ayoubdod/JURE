import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Download, FileText, History, List, Redo2, Trash2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useJuriaStore from '@/stores/juriaStore';
import {
  apiJuriaCompareArtifact,
  apiJuriaCreateArtifact,
  apiJuriaDeleteArtifact,
  apiJuriaDuplicateArtifact,
  apiJuriaExportArtifact,
  apiJuriaRestoreArtifact,
  apiJuriaUpdateArtifact,
} from '@/services/juria/api';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { getJuriaErrorMessage } from '@/utils/juriaErrors';
import { cn } from '@/lib/utils';

const EXPORT_FORMATS = ['docx', 'pdf', 'txt', 'md'] as const;

type DiffSegment = { op: 'equal' | 'insert' | 'delete'; text: string };
type DiffHunk = { kind: 'insert' | 'delete' | 'modify'; segments: DiffSegment[] };

type DiffState = {
  from: number;
  to: number;
  lines: string[];
  identical: boolean;
  oldText?: string;
  newText?: string;
  hunks?: DiffHunk[];
  scraps?: DiffSegment[];
};

type EditSnapshot = { title: string; html: string };

function normalizeHtml(value: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

/** Minimal line diff when the API returns empty unified_diff but texts differ. */
function buildClientLineDiff(oldText: string, newText: string): string[] {
  const a = (oldText || '').split('\n');
  const b = (newText || '').split('\n');
  const max = Math.max(a.length, b.length);
  const out: string[] = ['@@'];
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left !== undefined) out.push(` ${left}`);
      continue;
    }
    if (left !== undefined) out.push(`-${left}`);
    if (right !== undefined) out.push(`+${right}`);
  }
  return out.length > 1 ? out : [];
}

export function JuriaArtifactEditor({ projectId }: { projectId: string }) {
  const { t, tf } = useAppTranslation();
  const a = t.juria.workspace.artifacts;
  const ed = t.juria.editor;
  const artifacts = useJuriaStore((s) => s.artifacts);
  const load = useJuriaStore((s) => s.loadArtifacts);
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(artifacts[0]?.id ?? null);
  const active = artifacts.find((x) => x.id === activeId) ?? artifacts[0] ?? null;
  const [html, setHtml] = useState(active?.content_html || active?.content_markdown || '');
  const [title, setTitle] = useState(active?.title || '');
  const [diff, setDiff] = useState<DiffState | null>(null);
  const [comparing, setComparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [history, setHistory] = useState<EditSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const skipHistoryRef = useRef(false);
  const historyIndexRef = useRef(-1);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  React.useEffect(() => {
    if (!downloadOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!downloadMenuRef.current?.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDownloadOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [downloadOpen]);

  const baseline = useMemo<EditSnapshot>(() => {
    if (!active) return { title: '', html: '' };
    return {
      title: active.title || '',
      html: active.content_html || active.content_markdown || '',
    };
  }, [active?.id, active?.title, active?.content_html, active?.content_markdown, active?.current_version]);

  const isDirty =
    Boolean(active) &&
    (title.trim() !== baseline.title.trim() || normalizeHtml(html) !== normalizeHtml(baseline.html));

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  const resetEditorState = useCallback((next: EditSnapshot) => {
    skipHistoryRef.current = true;
    setTitle(next.title);
    setHtml(next.html);
    setHistory([next]);
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setDiff(null);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  }, []);

  React.useEffect(() => {
    if (!active) return;
    resetEditorState({
      title: active.title || '',
      html: active.content_html || active.content_markdown || '',
    });
    // Reset when switching document or after save/restore (version bump).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: content pulled at version change
  }, [active?.id, active?.current_version, resetEditorState]);

  React.useEffect(() => {
    if (!activeId && artifacts[0]) setActiveId(artifacts[0].id);
  }, [artifacts, activeId]);

  React.useEffect(() => {
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

  const pushHistory = useCallback((next: EditSnapshot) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      setHistory((prev) => {
        const idx = Math.max(historyIndexRef.current, 0);
        const truncated = prev.slice(0, idx + 1);
        const last = truncated[truncated.length - 1];
        if (
          last &&
          last.title === next.title &&
          normalizeHtml(last.html) === normalizeHtml(next.html)
        ) {
          return truncated.length === prev.length ? prev : truncated;
        }
        const merged = [...truncated, next].slice(-40);
        historyIndexRef.current = merged.length - 1;
        setHistoryIndex(merged.length - 1);
        return merged;
      });
    }, 280);
  }, []);

  const onTitleChange = (value: string) => {
    setTitle(value);
    pushHistory({ title: value, html });
  };

  const onHtmlChange = (value: string) => {
    setHtml(value);
    pushHistory({ title, html: value });
  };

  const undo = () => {
    if (!canUndo) return;
    const nextIndex = historyIndex - 1;
    const snap = history[nextIndex];
    if (!snap) return;
    skipHistoryRef.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setTitle(snap.title);
    setHtml(snap.html);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  };

  const redo = () => {
    if (!canRedo) return;
    const nextIndex = historyIndex + 1;
    const snap = history[nextIndex];
    if (!snap) return;
    skipHistoryRef.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setTitle(snap.title);
    setHtml(snap.html);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  };

  const download = async (fmt: string) => {
    if (!active) return;
    try {
      const blob = await apiJuriaExportArtifact(projectId, active.id, fmt);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safe =
        (active.title || 'document')
          .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80) || 'document';
      link.download = `${safe}.${fmt}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t.juria.toasts.downloadFailed,
        description: getJuriaErrorMessage(e),
      });
    }
  };

  const save = async () => {
    if (!active || !isDirty || saving) return;
    setSaving(true);
    try {
      await apiJuriaUpdateArtifact(projectId, active.id, {
        title,
        content_html: html,
        note: ed.editNote,
      });
      await load(projectId);
      toast({ title: a.saved });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t.common.save,
        description: getJuriaErrorMessage(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const runCompare = async () => {
    if (!active || active.current_version < 2) return;
    setComparing(true);
    try {
      const d = await apiJuriaCompareArtifact(
        projectId,
        active.id,
        active.current_version - 1,
        active.current_version
      );
      const oldText = d.old || '';
      const newText = d.new || '';
      const apiIdentical = Boolean(d.identical) && oldText === newText;
      let lines = Array.isArray(d.diff) ? d.diff : [];
      if (!apiIdentical && lines.length === 0 && oldText !== newText) {
        lines = buildClientLineDiff(oldText, newText);
      }
      setDiff({
        from: d.from,
        to: d.to,
        lines,
        identical: apiIdentical,
        oldText,
        newText,
        hunks: Array.isArray((d as { hunks?: DiffHunk[] }).hunks)
          ? (d as { hunks: DiffHunk[] }).hunks
          : undefined,
        scraps: Array.isArray((d as { scraps?: DiffSegment[] }).scraps)
          ? (d as { scraps: DiffSegment[] }).scraps
          : undefined,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: ed.compareFailed,
        description: getJuriaErrorMessage(e),
      });
    } finally {
      setComparing(false);
    }
  };

  const restorePreviousVersion = async () => {
    if (!active || active.current_version < 2 || restoring) return;
    const target = active.current_version - 1;
    const ok = window.confirm(tf(ed.restoreConfirm, { version: target }));
    if (!ok) return;
    setRestoring(true);
    try {
      await apiJuriaRestoreArtifact(projectId, active.id, target);
      await load(projectId);
      setDiff(null);
      toast({ title: tf(ed.restored, { version: target }) });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: ed.restoreFailed,
        description: getJuriaErrorMessage(e),
      });
    } finally {
      setRestoring(false);
    }
  };

  const removeArtifact = async () => {
    if (!active) return;
    const ok = window.confirm(tf(a.deleteConfirm, { title: active.title || a.newDocument }));
    if (!ok) return;
    try {
      await apiJuriaDeleteArtifact(projectId, active.id);
      toast({ title: a.deleted });
      setDiff(null);
      await load(projectId);
      const remaining = useJuriaStore.getState().artifacts;
      setActiveId(remaining[0]?.id ?? null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: a.deleteFailed,
        description: getJuriaErrorMessage(e),
      });
    }
  };

  if (!artifacts.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center sm:p-8">
        <p className="text-sm font-medium text-slate-800 dark:text-white">{a.empty}</p>
        <p className="mt-1 max-w-sm text-[12px] text-slate-500">{a.emptyHint}</p>
        <Button
          className="mt-4 bg-[#64499D] hover:bg-[#4D3680]"
          onClick={() =>
            void apiJuriaCreateArtifact(projectId, { title: a.newDocument, content_html: '<p></p>' }).then(() =>
              load(projectId)
            )
          }
        >
          {a.createDoc}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2 md:hidden dark:border-slate-800">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => setListOpen((v) => !v)}
        >
          <List className="h-4 w-4" />
          {a.documents}
        </Button>
        {active ? (
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
            {active.title}
            <span className="ms-1 text-[11px] font-normal text-slate-400">v{active.current_version}</span>
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          'shrink-0 overflow-y-auto border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950',
          'md:block md:w-52 md:border-e md:p-2',
          listOpen ? 'absolute inset-0 z-20 border-b p-3 md:static md:inset-auto' : 'hidden md:block'
        )}
      >
        <div className="mb-2 flex items-center justify-between md:hidden">
          <p className="text-sm font-medium">{a.documents}</p>
          <button type="button" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setListOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {artifacts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveId(item.id);
              setListOpen(false);
            }}
            className={cn(
              'mb-1 w-full rounded-lg px-2 py-2.5 text-start text-[12px] md:py-2',
              item.id === active?.id ? 'bg-[#64499D]/10 text-[#64499D]' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
            )}
          >
            <span className="line-clamp-1 font-medium">{item.title}</span>
            <span className="text-[10px] text-slate-400">v{item.current_version}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
          <div className="relative z-20 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="h-9 w-full text-sm md:max-w-xs"
            />
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Button
                size="sm"
                className="h-8 shrink-0 bg-[#64499D] hover:bg-[#4D3680] disabled:opacity-40"
                disabled={!isDirty || saving}
                onClick={() => void save()}
              >
                {saving ? ed.saving : t.common.save}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1"
                disabled={!canUndo}
                title={ed.undo}
                onClick={undo}
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{ed.undo}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1"
                disabled={!canRedo}
                title={ed.redo}
                onClick={redo}
              >
                <Redo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{ed.redo}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={() =>
                  void apiJuriaDuplicateArtifact(projectId, active.id)
                    .then(() => load(projectId))
                    .catch((e) =>
                      toast({
                        variant: 'destructive',
                        title: a.duplicate,
                        description: getJuriaErrorMessage(e),
                      })
                    )
                }
              >
                {a.duplicate}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => void removeArtifact()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {a.delete}
              </Button>
              {active.current_version > 1 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 gap-1"
                    disabled={restoring || comparing}
                    title={tf(ed.restorePrevious, { version: active.current_version - 1 })}
                    onClick={() => void restorePreviousVersion()}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {restoring
                        ? ed.restoring
                        : tf(ed.restorePrevious, { version: active.current_version - 1 })}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    disabled={comparing}
                    onClick={() => void runCompare()}
                  >
                    {comparing
                      ? ed.comparing
                      : tf(ed.compareVersions, {
                          from: active.current_version - 1,
                          to: active.current_version,
                        })}
                  </Button>
                </>
              )}
              </div>
              <div className="relative z-30 shrink-0" ref={downloadMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-2.5 text-xs"
                  aria-expanded={downloadOpen}
                  aria-haspopup="menu"
                  onClick={() => setDownloadOpen((o) => !o)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{ed.download}</span>
                  <ChevronDown className={cn('h-3 w-3 opacity-60 transition', downloadOpen && 'rotate-180')} />
                </Button>
                {downloadOpen ? (
                  <div
                    role="menu"
                    className="absolute end-0 top-[calc(100%+4px)] z-50 w-20 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    {EXPORT_FORMATS.map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        role="menuitem"
                        className="flex h-8 w-full items-center justify-center px-2 text-xs font-semibold uppercase tracking-wide text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                        onClick={() => {
                          setDownloadOpen(false);
                          void download(fmt);
                        }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {diff ? (
            <DiffPanel
              diff={diff}
              onClose={() => setDiff(null)}
              labels={{
                title: tf(ed.compareVersions, { from: diff.from, to: diff.to }),
                identical: ed.noDiff,
                close: ed.closeCompare,
                added: ed.added,
                removed: ed.removed,
                onlyTouched: ed.onlyTouched,
                modifiedLines: ed.modifiedLines,
              }}
            />
          ) : (
            <ArtifactCanvas html={html} onChange={onHtmlChange} labels={ed} />
          )}
        </div>
      )}
    </div>
  );
}

function DiffPanel({
  diff,
  onClose,
  labels,
}: {
  diff: DiffState;
  onClose: () => void;
  labels: {
    title: string;
    identical: string;
    close: string;
    added: string;
    removed: string;
    onlyTouched?: string;
    modifiedLines?: string;
  };
}) {
  const hunks = diff.hunks || [];
  const scraps = (diff.scraps || []).filter((s) => s.op === 'insert' || s.op === 'delete');

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/80 dark:bg-slate-900/40">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-[#64499D]" />
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{labels.title}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 shrink-0" onClick={onClose}>
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          {labels.close}
        </Button>
      </div>

      {diff.identical ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{labels.identical}</p>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            {labels.close}
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3 sm:p-4">
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" /> {labels.added}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" /> {labels.removed}
            </span>
          </div>

          {scraps.length > 0 ? (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {labels.onlyTouched}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scraps.map((s, i) => (
                  <span
                    key={`${i}-${s.op}-${s.text.slice(0, 24)}`}
                    className={cn(
                      'inline-flex max-w-full items-baseline rounded-md px-2 py-1 font-mono text-[12px] leading-snug',
                      s.op === 'insert' &&
                        'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800',
                      s.op === 'delete' &&
                        'bg-red-100 text-red-900 line-through ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-800'
                    )}
                  >
                    <span className="me-1 text-[10px] font-sans font-semibold opacity-70">
                      {s.op === 'insert' ? '+' : '−'}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{s.text}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {hunks.length > 0 ? (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {labels.modifiedLines}
              </p>
              <div className="space-y-2">
                {hunks.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg border bg-white px-3 py-2 text-[13px] leading-relaxed dark:bg-slate-950',
                      h.kind === 'insert' && 'border-emerald-200 dark:border-emerald-900',
                      h.kind === 'delete' && 'border-red-200 dark:border-red-900',
                      h.kind === 'modify' && 'border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {h.kind === 'insert' ? labels.added : h.kind === 'delete' ? labels.removed : '±'}
                    </p>
                    <p className="whitespace-pre-wrap break-words font-mono text-[12.5px]">
                      {h.segments.map((seg, j) => (
                        <span
                          key={j}
                          className={cn(
                            seg.op === 'insert' &&
                              'rounded-sm bg-emerald-200/80 px-0.5 text-emerald-950 dark:bg-emerald-800/60 dark:text-emerald-100',
                            seg.op === 'delete' &&
                              'rounded-sm bg-red-200/80 px-0.5 text-red-950 line-through dark:bg-red-900/60 dark:text-red-100',
                            seg.op === 'equal' && 'text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {seg.text || (seg.op === 'equal' ? '' : '·')}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-3 font-mono text-[12px] dark:border-slate-700 dark:bg-slate-950">
              <pre className="mb-2 whitespace-pre-wrap text-red-800 dark:text-red-200">{diff.oldText}</pre>
              <pre className="whitespace-pre-wrap text-emerald-800 dark:text-emerald-200">{diff.newText}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArtifactCanvas({
  html,
  onChange,
  labels,
}: {
  html: string;
  onChange: (v: string) => void;
  labels: {
    list: string;
    orderedList: string;
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    indent: string;
    outdent: string;
    clearFormat: string;
    heading1: string;
    heading2: string;
    heading3: string;
    paragraph: string;
  };
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html || '<p></p>';
  }, [html]);

  const run = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
    setTick((n) => n + 1);
  };

  const isActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const tools: {
    id: string;
    label: string;
    title: string;
    fn: () => void;
    active?: boolean;
    icon?: React.ReactNode;
  }[] = [
    {
      id: 'h1',
      label: 'H1',
      title: labels.heading1,
      fn: () => run('formatBlock', 'h1'),
      icon: <span className="text-[11px] font-bold tracking-tight">H1</span>,
    },
    {
      id: 'h2',
      label: 'H2',
      title: labels.heading2,
      fn: () => run('formatBlock', 'h2'),
      icon: <span className="text-[11px] font-bold tracking-tight">H2</span>,
    },
    {
      id: 'h3',
      label: 'H3',
      title: labels.heading3,
      fn: () => run('formatBlock', 'h3'),
      icon: <span className="text-[11px] font-bold tracking-tight">H3</span>,
    },
    {
      id: 'p',
      label: 'P',
      title: labels.paragraph,
      fn: () => run('formatBlock', 'p'),
      icon: <span className="text-[11px] font-semibold">P</span>,
    },
    {
      id: 'ul',
      label: labels.list,
      title: labels.list,
      fn: () => run('insertUnorderedList'),
      active: isActive('insertUnorderedList'),
      icon: <List className="h-3.5 w-3.5" />,
    },
    {
      id: 'ol',
      label: labels.orderedList,
      title: labels.orderedList,
      fn: () => run('insertOrderedList'),
      active: isActive('insertOrderedList'),
      icon: <span className="text-[11px] font-semibold tabular-nums">1.</span>,
    },
    {
      id: 'bold',
      label: labels.bold,
      title: labels.bold,
      fn: () => run('bold'),
      active: isActive('bold'),
      icon: <span className="text-[12px] font-bold">B</span>,
    },
    {
      id: 'italic',
      label: labels.italic,
      title: labels.italic,
      fn: () => run('italic'),
      active: isActive('italic'),
      icon: <span className="text-[12px] italic">I</span>,
    },
    {
      id: 'underline',
      label: labels.underline,
      title: labels.underline,
      fn: () => run('underline'),
      active: isActive('underline'),
      icon: <span className="text-[12px] underline">U</span>,
    },
    {
      id: 'strike',
      label: labels.strike,
      title: labels.strike,
      fn: () => run('strikeThrough'),
      active: isActive('strikeThrough'),
      icon: <span className="text-[12px] line-through">S</span>,
    },
    {
      id: 'left',
      label: labels.alignLeft,
      title: labels.alignLeft,
      fn: () => run('justifyLeft'),
      icon: <span className="text-[10px] leading-none">≡←</span>,
    },
    {
      id: 'center',
      label: labels.alignCenter,
      title: labels.alignCenter,
      fn: () => run('justifyCenter'),
      icon: <span className="text-[10px] leading-none">≡</span>,
    },
    {
      id: 'right',
      label: labels.alignRight,
      title: labels.alignRight,
      fn: () => run('justifyRight'),
      icon: <span className="text-[10px] leading-none">→≡</span>,
    },
    {
      id: 'indent',
      label: labels.indent,
      title: labels.indent,
      fn: () => run('indent'),
      icon: <span className="text-[11px]">⇥</span>,
    },
    {
      id: 'outdent',
      label: labels.outdent,
      title: labels.outdent,
      fn: () => run('outdent'),
      icon: <span className="text-[11px]">⇤</span>,
    },
    {
      id: 'clear',
      label: labels.clearFormat,
      title: labels.clearFormat,
      fn: () => run('removeFormat'),
      icon: <span className="text-[10px] font-medium">Tx</span>,
    },
  ];

  const groups = [
    ['h1', 'h2', 'h3', 'p'],
    ['ul', 'ol'],
    ['bold', 'italic', 'underline', 'strike'],
    ['left', 'center', 'right'],
    ['indent', 'outdent', 'clear'],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-slate-950">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 ? <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" /> : null}
            <div className="flex shrink-0 items-center gap-0.5">
              {group.map((id) => {
                const b = tools.find((t) => t.id === id)!;
                return (
                  <button
                    key={b.id}
                    type="button"
                    title={b.title}
                    aria-label={b.title}
                    aria-pressed={b.active}
                    className={cn(
                      'inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-slate-600 transition',
                      'hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                      b.active &&
                        'bg-slate-100 text-[#64499D] ring-1 ring-[#64499D]/25 dark:bg-slate-800 dark:text-[#b9a6e8]'
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      b.fn();
                    }}
                  >
                    {b.icon}
                  </button>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div
        ref={ref}
        className="prose prose-sm min-h-[50vh] max-w-none flex-1 overflow-auto bg-white px-4 py-4 text-[15px] leading-7 text-slate-900 outline-none dark:prose-invert dark:bg-slate-950 dark:text-slate-100 sm:min-h-0 sm:px-6 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyUp={() => setTick((n) => n + 1)}
        onMouseUp={() => setTick((n) => n + 1)}
      />
    </div>
  );
}
