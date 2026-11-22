import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import { JuriaMarkdown } from '@/components/juria/JuriaMarkdown';
import {
  apiAskDashboard,
  apiGetDashboardBriefing,
  type DashboardAssistResponse,
} from '@/services/dashboard/api';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type Props = {
  enabled: boolean;
};

export default function JuriaAssistSection({ enabled }: Props) {
  const { t, lang } = useAppTranslation();
  const copy = t.dashboard.juriaAssist;
  const [briefing, setBriefing] = useState<DashboardAssistResponse | null>(null);
  const [answer, setAnswer] = useState<DashboardAssistResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const errMessage = (err: unknown, fallback: string) => {
    if (isAxiosError(err)) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.trim()) return detail;
      if (err.response?.status === 503) return copy.disabled;
      if (err.response?.status === 402) return copy.creditsExhausted;
    }
    return fallback;
  };

  const loadBriefing = async () => {
    setLoadingBriefing(true);
    setError(null);
    try {
      const res = await apiGetDashboardBriefing(lang);
      setBriefing(res.data);
    } catch (err) {
      setError(errMessage(err, copy.errors.briefing));
    } finally {
      setLoadingBriefing(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (q.length < 2) return;
    setLoadingAsk(true);
    setError(null);
    try {
      const res = await apiAskDashboard(q, lang);
      setAnswer(res.data);
    } catch (err) {
      setError(errMessage(err, copy.errors.ask));
    } finally {
      setLoadingAsk(false);
    }
  };

  const renderAssist = (payload: DashboardAssistResponse) => (
    <div className="space-y-3">
      <JuriaMarkdown
        content={payload.text || ''}
        className="text-sm leading-relaxed text-slate-900 dark:text-white [&_h3]:text-base [&_h4]:text-[15px]"
      />
      {payload.sources?.length ? (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
            {copy.sources}
          </p>
          <ul className="space-y-1">
            {payload.sources.slice(0, 8).map((s, i) => (
              <li
                key={`${s.kind}-${s.id ?? i}`}
                className="truncate text-xs text-muted-foreground"
              >
                [{i + 1}] {s.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">{copy.caveatsTitle}</p>
        <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[11px] text-amber-900/80 dark:text-amber-200/80">
          {(payload.caveats || []).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {payload.retrieval?.description ? (
          <p className="mt-2 text-[11px] text-muted-foreground">{payload.retrieval.description}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      headerRight={
        <span className="inline-flex items-center gap-1.5 text-xs text-[#64499D] dark:text-[#8B6FD1]">
          <Sparkles size={12} aria-hidden />
          JURIA
        </span>
      }
      defaultOpen={false}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            disabled={loadingBriefing}
            onClick={() => void loadBriefing()}
          >
            {loadingBriefing ? copy.loadingBriefing : copy.generateBriefing}
          </Button>
          <p className="text-xs text-muted-foreground">{copy.briefingHint}</p>
        </div>

        {briefing ? renderAssist(briefing) : null}

        <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
            {copy.askTitle}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void ask();
                }
              }}
              placeholder={copy.askPlaceholder}
              className={cn(
                'min-h-[40px] w-full flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm',
                'outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40',
                'dark:border-slate-700 dark:bg-slate-950'
              )}
              aria-label={copy.askPlaceholder}
            />
            <Button
              type="button"
              size="sm"
              className="rounded-lg shrink-0"
              disabled={loadingAsk || question.trim().length < 2}
              onClick={() => void ask()}
            >
              {loadingAsk ? copy.asking : copy.askCta}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{copy.askHint}</p>
        </div>

        {answer ? renderAssist(answer) : null}

        {error ? (
          <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </DashboardCollapsibleCard>
  );
}
