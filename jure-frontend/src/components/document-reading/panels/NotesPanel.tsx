import { useMemo, useState } from 'react';
import { Check, Copy, FolderPlus, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DocumentReadingMessages } from '@/i18n/messages/documentReading';
import type { ReadingNoteDraft } from '../types';

type CaseOption = { id: number; reference?: string; title?: string };

type Props = {
  notes: ReadingNoteDraft[];
  page: number;
  selectionText?: string;
  cases: CaseOption[];
  casesLoading?: boolean;
  onCreate: (note: Omit<ReadingNoteDraft, 'id' | 'createdAt' | 'savedRemoteId'>) => void;
  onDelete: (id: string) => void;
  onSaveRemote: (id: string) => Promise<void>;
  onAddToCase: (noteId: string, caseId: number) => Promise<void>;
  onSend: (noteId: string) => void;
  onCopy: (text: string) => void;
  labels: DocumentReadingMessages;
};

export default function NotesPanel({
  notes,
  page,
  selectionText,
  cases,
  casesLoading,
  onCreate,
  onDelete,
  onSaveRemote,
  onAddToCase,
  onSend,
  onCopy,
  labels,
}: Props) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [attachSelection, setAttachSelection] = useState(Boolean(selectionText));
  const [casePickerFor, setCasePickerFor] = useState<string | null>(null);
  const [caseQuery, setCaseQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCases = useMemo(() => {
    const q = caseQuery.trim().toLowerCase();
    if (!q) return cases.slice(0, 8);
    return cases
      .filter(
        (c) =>
          (c.reference || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [cases, caseQuery]);

  const resetComposer = () => {
    setTitle('');
    setContent('');
    setTags('');
    setAttachSelection(Boolean(selectionText));
    setComposing(false);
  };

  const submit = () => {
    if (!title.trim() && !content.trim()) return;
    onCreate({
      title: title.trim() || labels.untitledNote,
      content: content.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      page,
      highlightText: attachSelection ? selectionText : undefined,
    });
    resetComposer();
    setStatus(labels.noteSaved);
    window.setTimeout(() => setStatus(null), 2500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200/90 px-3 py-2.5 dark:border-slate-800">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full bg-[#64499D] text-white hover:bg-[#543d86]"
          onClick={() => setComposing(true)}
        >
          <Plus className="me-1.5 h-3.5 w-3.5" />
          {labels.newNote}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {status ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11.5px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            {status}
          </div>
        ) : null}

        {composing ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.noteTitle}
              className="mb-2 h-8 text-[13px] font-semibold"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={labels.noteContent}
              className="min-h-[110px] resize-y text-[12.5px]"
            />
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={labels.noteTags}
              className="mt-2 h-8 text-[12px]"
            />
            {selectionText ? (
              <label className="mt-2 flex items-start gap-2 text-[11.5px] text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={attachSelection}
                  onChange={(e) => setAttachSelection(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  {labels.attachSelection}
                  <span className="mt-0.5 block line-clamp-2 text-slate-400">“{selectionText}”</span>
                </span>
              </label>
            ) : null}
            <p className="mt-2 text-[10.5px] text-slate-400">
              {labels.pageRef.replace('{page}', String(page))}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={resetComposer}>
                {labels.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1 bg-[#64499D] text-white hover:bg-[#543d86]"
                onClick={submit}
              >
                {labels.save}
              </Button>
            </div>
          </div>
        ) : null}

        {notes.length === 0 && !composing ? (
          <p className="px-1 py-8 text-center text-[12.5px] text-slate-400">{labels.emptyNotes}</p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{note.title}</h3>
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-500"
                  onClick={() => onDelete(note.id)}
                  aria-label={labels.delete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {note.content ? (
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {note.content}
                </p>
              ) : null}
              {note.highlightText ? (
                <blockquote className="mt-2 border-s-2 border-[#64499D]/40 ps-2 text-[11.5px] italic text-slate-500">
                  “{note.highlightText}”
                </blockquote>
              ) : null}
              <p className="mt-2 text-[10.5px] text-slate-400">
                {note.page != null ? labels.pageRef.replace('{page}', String(note.page)) : null}
                {note.tags.length ? ` · ${note.tags.join(', ')}` : ''}
              </p>

              {casePickerFor === note.id ? (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
                  <p className="mb-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {labels.addToCaseTitle}
                  </p>
                  <Input
                    value={caseQuery}
                    onChange={(e) => setCaseQuery(e.target.value)}
                    placeholder={labels.searchCases}
                    className="mb-2 h-8 text-[12px]"
                  />
                  {casesLoading ? (
                    <p className="text-[11px] text-slate-400">{labels.loading}</p>
                  ) : filteredCases.length === 0 ? (
                    <p className="text-[11px] text-slate-400">{labels.noCases}</p>
                  ) : (
                    <ul className="max-h-36 space-y-1 overflow-y-auto">
                      {filteredCases.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            disabled={saving}
                            className="w-full rounded-md px-2 py-1.5 text-start text-[12px] hover:bg-white dark:hover:bg-slate-950"
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await onAddToCase(note.id, c.id);
                                setStatus(
                                  labels.addedToCase
                                    .replace('{ref}', c.reference || String(c.id))
                                    .replace('{page}', String(note.page ?? page))
                                );
                                setCasePickerFor(null);
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            <span className="font-semibold text-[#64499D]">
                              {c.reference || `#${c.id}`}
                            </span>
                            {c.title ? (
                              <span className="ms-1 text-slate-600 dark:text-slate-300">— {c.title}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 w-full text-[11px]"
                    onClick={() => setCasePickerFor(null)}
                  >
                    {labels.cancel}
                  </Button>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setCasePickerFor(note.id)}
                  >
                    <FolderPlus className="me-1 h-3 w-3" />
                    {labels.addToCase}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => onSend(note.id)}
                  >
                    <Send className="me-1 h-3 w-3" />
                    {labels.send}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => onCopy(`${note.title}\n\n${note.content}`)}
                  >
                    <Copy className="me-1 h-3 w-3" />
                    {labels.copy}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await onSaveRemote(note.id);
                        setStatus(labels.noteSaved);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {labels.save}
                  </Button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
