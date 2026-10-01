import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DocumentReadingMessages } from '@/i18n/messages/documentReading';
import type { ReadingDocument } from '../types';

export type ColleagueOption = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

type Props = {
  doc: ReadingDocument;
  page: number;
  selectionText?: string;
  initialMessage?: string;
  colleagues: ColleagueOption[];
  loadingMembers?: boolean;
  onSend: (payload: {
    memberId: number;
    message: string;
    includeDocument: boolean;
    includeHighlight: boolean;
  }) => Promise<void>;
  labels: DocumentReadingMessages;
};

export default function SharePanel({
  doc,
  page,
  selectionText,
  initialMessage = '',
  colleagues,
  loadingMembers,
  onSend,
  labels,
}: Props) {
  const [query, setQuery] = useState('');
  const [memberId, setMemberId] = useState<number | null>(null);
  const [message, setMessage] = useState(initialMessage);
  const [includeDocument, setIncludeDocument] = useState(true);
  const [includeHighlight, setIncludeHighlight] = useState(Boolean(selectionText));
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (initialMessage) setMessage(initialMessage);
  }, [initialMessage]);

  useEffect(() => {
    if (selectionText) setIncludeHighlight(true);
  }, [selectionText]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colleagues.slice(0, 12);
    return colleagues
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [colleagues, query]);

  const selected = colleagues.find((m) => m.id === memberId) || null;

  const submit = async () => {
    if (!memberId || !message.trim()) return;
    setSending(true);
    try {
      await onSend({
        memberId,
        message: message.trim(),
        includeDocument,
        includeHighlight,
      });
      setSentTo(selected?.name || labels.colleague);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200/90 px-3 py-3 dark:border-slate-800">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{labels.sendTo}</p>
        <p className="mt-0.5 text-[11.5px] text-slate-500">{labels.sendHint}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {sentTo ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11.5px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            {labels.sentTo.replace('{name}', sentTo)}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchColleague}
            className="h-8 border-slate-200 bg-slate-50 ps-8 text-[12px] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {loadingMembers ? (
            <div className="flex items-center gap-2 px-3 py-4 text-[12px] text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {labels.loading}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-[12px] text-slate-400">{labels.noColleagues}</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMemberId(m.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-start transition-colors',
                  memberId === m.id
                    ? 'bg-[#64499D]/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {(m.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-slate-900 dark:text-slate-50">
                    {m.name}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {[m.role, m.email].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">{labels.message}</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
            className="min-h-[110px] text-[12.5px]"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11.5px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold text-slate-500">{labels.attachment}</p>
          <label className="mt-1.5 flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeDocument}
              onChange={(e) => setIncludeDocument(e.target.checked)}
            />
            📄 {doc.title}
          </label>
          <p className="ms-5 text-[10.5px] text-slate-400">
            {labels.pageShort.replace('{page}', String(page))}
          </p>
          {selectionText ? (
            <label className="mt-1.5 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={includeHighlight}
                onChange={(e) => setIncludeHighlight(e.target.checked)}
              />
              <span>
                📝 {labels.highlightedPassage}
                <span className="mt-0.5 block line-clamp-2 italic text-slate-400">“{selectionText}”</span>
              </span>
            </label>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200/90 p-3 dark:border-slate-800">
        <Button
          type="button"
          size="sm"
          disabled={sending || !memberId || !message.trim()}
          className="h-8 w-full bg-[#64499D] text-white hover:bg-[#543d86]"
          onClick={() => void submit()}
        >
          {sending ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="me-1.5 h-3.5 w-3.5" />}
          {labels.send}
        </Button>
      </div>
    </div>
  );
}
