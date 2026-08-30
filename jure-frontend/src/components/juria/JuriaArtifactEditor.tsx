import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useJuriaStore from '@/stores/juriaStore';
import {
  apiJuriaCompareArtifact,
  apiJuriaCreateArtifact,
  apiJuriaDuplicateArtifact,
  apiJuriaExportArtifact,
  apiJuriaUpdateArtifact,
} from '@/services/juria/api';
import { useAppTranslation } from '@/i18n';

export function JuriaArtifactEditor({ projectId }: { projectId: string }) {
  const { t } = useAppTranslation();
  const a = t.juria.workspace.artifacts;
  const actions = t.juria.workspace.actions;
  const artifacts = useJuriaStore((s) => s.artifacts);
  const load = useJuriaStore((s) => s.loadArtifacts);
  const [activeId, setActiveId] = useState<string | null>(artifacts[0]?.id ?? null);
  const active = artifacts.find((a) => a.id === activeId) ?? artifacts[0] ?? null;
  const [html, setHtml] = useState(active?.content_html || active?.content_markdown || '');
  const [title, setTitle] = useState(active?.title || '');
  const [diff, setDiff] = useState<string[] | null>(null);

  React.useEffect(() => {
    if (active) {
      setHtml(active.content_html || active.content_markdown || '');
      setTitle(active.title);
      setDiff(null);
    }
  }, [active?.id]);

  const download = async (fmt: string) => {
    if (!active) return;
    const blob = await apiJuriaExportArtifact(projectId, active.id, fmt);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.title}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!artifacts.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
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
    <div className="flex min-h-0 flex-1">
      <div className="w-52 shrink-0 overflow-y-auto border-e border-slate-100 p-2 dark:border-slate-800">
        {artifacts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActiveId(a.id)}
            className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-[12px] ${a.id === active?.id ? 'bg-[#64499D]/10' : 'hover:bg-slate-50'}`}
          >
            <span className="line-clamp-1 font-medium">{a.title}</span>
            <span className="text-[10px] text-slate-400">v{a.current_version}</span>
          </button>
        ))}
      </div>
      {active && (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 max-w-xs text-sm" />
            <Button
              size="sm"
              className="h-8 bg-[#64499D] hover:bg-[#4D3680]"
              onClick={() =>
                void apiJuriaUpdateArtifact(projectId, active.id, { title, content_html: html, note: 'Édition' }).then(() =>
                  load(projectId)
                )
              }
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => void apiJuriaDuplicateArtifact(projectId, active.id).then(() => load(projectId))}>
              Dupliquer
            </Button>
            {['docx', 'pdf', 'txt', 'md', 'rtf', 'odt'].map((fmt) => (
              <Button key={fmt} size="sm" variant="ghost" className="h-8 text-[11px] uppercase" onClick={() => void download(fmt)}>
                {fmt}
              </Button>
            ))}
            {active.current_version > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() =>
                  void apiJuriaCompareArtifact(projectId, active.id, active.current_version - 1, active.current_version).then((d) =>
                    setDiff(d.diff)
                  )
                }
              >
                Comparer v{active.current_version - 1} / v{active.current_version}
              </Button>
            )}
          </div>
          {diff ? (
            <pre className="min-h-0 flex-1 overflow-auto p-4 text-[12px] leading-relaxed">
              {diff.map((line, i) => (
                <div
                  key={`${i}-${line.slice(0, 24)}`}
                  className={
                    line.startsWith('+') ? 'bg-emerald-50 text-emerald-800' : line.startsWith('-') ? 'bg-red-50 text-red-800' : ''
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          ) : (
            <ArtifactCanvas html={html} onChange={setHtml} />
          )}
        </div>
      )}
    </div>
  );
}

function ArtifactCanvas({ html, onChange }: { html: string; onChange: (v: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html || '<p></p>';
  }, [html]);
  const cmd = (command: string) => {
    document.execCommand(command);
    if (ref.current) onChange(ref.current.innerHTML);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-slate-100 px-3 py-1.5 text-[11px]">
        {[
          { label: 'H1', fn: () => document.execCommand('formatBlock', false, 'h1') },
          { label: 'H2', fn: () => document.execCommand('formatBlock', false, 'h2') },
          { label: 'P', fn: () => document.execCommand('formatBlock', false, 'p') },
          { label: 'Liste', fn: () => cmd('insertUnorderedList') },
          { label: 'Gras', fn: () => cmd('bold') },
          { label: 'Italique', fn: () => cmd('italic') },
          { label: 'Souligné', fn: () => cmd('underline') },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            onMouseDown={(e) => {
              e.preventDefault();
              b.fn();
              if (ref.current) onChange(ref.current.innerHTML);
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="min-h-0 flex-1 overflow-auto px-6 py-4 text-[15px] leading-7 outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}
