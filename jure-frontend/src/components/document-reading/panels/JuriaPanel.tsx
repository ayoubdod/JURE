import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  FolderPlus,
  Loader2,
  ScanText,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { JURIA_ENABLED } from '@/config/features';
import { libraryFileExtension } from '@/lib/libraryMedia';
import type { DocumentReadingMessages } from '@/i18n/messages/documentReading';
import type { ReadingContext, ReadingDocument } from '../types';
import {
  askJuriaAboutDocument,
  type ReadingJuriaSession,
} from '../juriaReadingAsk';
import { extractPdfPages } from '../extractReadingText';
import { ocrLangsForUi, ocrPdfPages } from '../ocrReadingPage';

type Props = {
  doc: ReadingDocument;
  page: number;
  pageCount: number;
  selectionText?: string;
  context?: ReadingContext;
  onAddToNote: (text: string) => void;
  onAddToCase: (text: string) => void;
  onSend: (text: string) => void;
  onCopy: (text: string) => void;
  labels: DocumentReadingMessages;
};

type JuriaAnswer = {
  id: string;
  prompt: string;
  body: string;
  sources: Array<{ label: string; page?: number }>;
  supported: boolean;
  needsReview: boolean;
  kind: 'analysis' | 'draft' | 'summary';
  error?: boolean;
};

const QUICK_KEYS = [
  'summarizePage',
  'summarizeDoc',
  'explainClause',
  'findProvisions',
  'identifyRisks',
  'prepareResponse',
  'draftArgument',
  'createCaseNote',
] as const;

export default function JuriaPanel({
  doc,
  page,
  pageCount,
  selectionText,
  context,
  onAddToNote,
  onAddToCase,
  onSend,
  onCopy,
  labels,
}: Props) {
  const { lang } = useAppTranslation();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [needsOcrHint, setNeedsOcrHint] = useState(false);
  const [answers, setAnswers] = useState<JuriaAnswer[]>([]);
  const sessionRef = useRef<ReadingJuriaSession>({});
  const abortRef = useRef<AbortController | null>(null);

  const isPdf = libraryFileExtension(doc.file || doc.title || '') === 'pdf' || !libraryFileExtension(doc.file || doc.title || '');

  useEffect(() => {
    sessionRef.current = {};
    setAnswers([]);
    setOcrStatus(null);
    setNeedsOcrHint(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [doc.id, doc.file, doc.title]);

  useEffect(() => {
    let cancelled = false;
    setNeedsOcrHint(false);
    if (!doc.file || !isPdf) return;
    void (async () => {
      try {
        const { pages } = await extractPdfPages(doc.file!, [Math.max(1, page)]);
        if (!cancelled) setNeedsOcrHint(!pages.length);
      } catch {
        if (!cancelled) setNeedsOcrHint(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.file, page, isPdf]);

  const formatOcrProgress = (info: {
    page: number;
    index: number;
    total: number;
    progress: number;
  }) =>
    labels.ocrProgress
      .replace('{page}', String(info.page))
      .replace('{current}', String(info.index + 1))
      .replace('{total}', String(info.total))
      .replace('{pct}', String(Math.round(info.progress * 100)));

  const runOcrPage = async () => {
    if (!doc.file || ocrBusy || loading) return;
    setOcrBusy(true);
    setOcrStatus(labels.ocrRunning);
    try {
      const result = await ocrPdfPages({
        fileUrl: doc.file,
        pages: [Math.max(1, page)],
        langs: ocrLangsForUi(lang),
        onProgress: (info) => setOcrStatus(formatOcrProgress(info)),
      });
      if (result.pages.length && result.pages[0].text.trim()) {
        setNeedsOcrHint(false);
        setOcrStatus(labels.ocrDone);
        window.setTimeout(() => {
          setOcrStatus((cur) => (cur === labels.ocrDone ? null : cur));
        }, 2500);
      } else {
        setOcrStatus(labels.ocrFailed);
      }
    } catch {
      setOcrStatus(labels.ocrFailed);
    } finally {
      setOcrBusy(false);
    }
  };

  const run = async (rawPrompt: string) => {
    const q = rawPrompt.trim();
    if (!q || loading) return;
    setLoading(true);
    setPrompt('');
    setOcrStatus(null);
    setOcrBusy(false);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const { result, session } = await askJuriaAboutDocument({
        question: q,
        doc,
        page,
        pageCount,
        selectionText,
        context,
        language: lang,
        session: sessionRef.current,
        signal: ac.signal,
        allowOcr: true,
        onOcrProgress: (info) => {
          setOcrBusy(true);
          setOcrStatus(formatOcrProgress(info));
        },
      });
      sessionRef.current = session;
      setNeedsOcrHint(false);
      setOcrBusy(false);
      setOcrStatus(null);
      setAnswers((prev) => [
        {
          id: `j-${Date.now()}`,
          prompt: q,
          body: result.body,
          sources: result.sources,
          supported: result.supported,
          needsReview: result.needsReview,
          kind: result.kind,
        },
        ...prev,
      ]);
    } catch (e) {
      if ((e as Error)?.name === 'CanceledError' || (e as Error)?.message === 'canceled') {
        return;
      }
      const msg = String((e as Error)?.message || '');
      const body =
        msg === 'JURIA_DISABLED' || !JURIA_ENABLED
          ? labels.juriaDisabled
          : msg === 'OCR_FAILED'
            ? labels.ocrFailed
            : msg && msg !== 'JURIA_ASK_FAILED'
              ? msg
              : labels.juriaAskFailed;
      if (msg === 'OCR_FAILED') setNeedsOcrHint(true);
      setOcrStatus(null);
      setAnswers((prev) => [
        {
          id: `j-err-${Date.now()}`,
          prompt: q,
          body,
          sources: [{ label: doc.title, page }],
          supported: false,
          needsReview: true,
          kind: 'analysis',
          error: true,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setOcrBusy(false);
    }
  };

  const busy = loading || ocrBusy;
  const showSpinner = busy;
  const statusLabel = ocrStatus || (loading ? labels.juriaThinking : null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200/90 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{labels.juriaTitle}</p>
            <p className="text-[11px] text-slate-500">{labels.juriaSubtitle}</p>
          </div>
        </div>
        {!JURIA_ENABLED ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11.5px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {labels.juriaDisabled}
          </p>
        ) : (
          <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="font-semibold text-slate-500 dark:text-slate-400">{labels.context}</p>
            <p className="mt-0.5 truncate">📄 {doc.title}</p>
            <p>
              📍 {labels.pageOf.replace('{current}', String(page)).replace('{total}', String(pageCount || '—'))}
            </p>
            {context?.caseRef ? (
              <p>
                📁 {context.caseRef}
                {context.caseTitle ? ` — ${context.caseTitle}` : ''}
              </p>
            ) : null}
            {context?.clientName ? <p>👤 {context.clientName}</p> : null}
            {selectionText ? (
              <p className="mt-1 line-clamp-2 italic text-slate-500">“{selectionText}”</p>
            ) : null}
            {needsOcrHint ? (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-200/80 pt-2 dark:border-slate-700">
                <p className="text-[11px] text-amber-700 dark:text-amber-400">{labels.ocrHint}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !doc.file}
                  className="h-7 w-full text-[11px]"
                  onClick={() => void runOcrPage()}
                >
                  {ocrBusy ? (
                    <Loader2 className="me-1 h-3 w-3 animate-spin" />
                  ) : (
                    <ScanText className="me-1 h-3 w-3" />
                  )}
                  {labels.ocrThisPage}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={busy || !JURIA_ENABLED}
              onClick={() => void run(labels[key])}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-[#64499D]/40 hover:text-[#64499D] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {labels[key]}
            </button>
          ))}
        </div>

        {statusLabel ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-4 text-[12.5px]',
              showSpinner
                ? 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
            )}
          >
            {showSpinner ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#64499D]" />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0" />
            )}
            {statusLabel}
          </div>
        ) : null}

        {answers.map((a) => (
          <article
            key={a.id}
            className={cn(
              'rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950',
              a.error ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64499D]">{labels.juriaTitle}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{a.prompt}</p>
            {a.kind === 'draft' && !a.error ? (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {labels.draftResponse}
              </p>
            ) : null}
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
              {a.body}
            </p>
            {!a.error ? (
              <>
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{labels.sources}</p>
                  {a.sources.map((s, i) => (
                    <p key={`${a.id}-s-${i}`} className="text-[11.5px] text-slate-600 dark:text-slate-300">
                      📄 {s.label}
                      {s.page != null ? ` · ${labels.pageShort.replace('{page}', String(s.page))}` : ''}
                    </p>
                  ))}
                </div>
                <div className="mt-2 space-y-1">
                  {a.supported ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      {labels.supportedBySources}
                    </p>
                  ) : null}
                  {a.needsReview ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {labels.verifyBeforeRelying}
                    </p>
                  ) : null}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onAddToNote(a.body)}>
                    {labels.addToNote}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onAddToCase(a.body)}>
                    <FolderPlus className="me-1 h-3 w-3" />
                    {labels.addToCase}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onSend(a.body)}>
                    <Send className="me-1 h-3 w-3" />
                    {labels.send}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onCopy(a.body)}>
                    <Copy className="me-1 h-3 w-3" />
                    {labels.copy}
                  </Button>
                </div>
              </>
            ) : null}
          </article>
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-200/90 p-3 dark:border-slate-800">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={labels.askJuria}
          disabled={!JURIA_ENABLED || busy}
          className="min-h-[72px] resize-none text-[12.5px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void run(prompt);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={busy || !prompt.trim() || !JURIA_ENABLED}
          className={cn('mt-2 h-8 w-full bg-[#64499D] text-white hover:bg-[#543d86]')}
          onClick={() => void run(prompt)}
        >
          {busy ? (
            <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="me-1.5 h-3.5 w-3.5" />
          )}
          {labels.ask}
        </Button>
      </div>
    </div>
  );
}
