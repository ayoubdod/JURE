import React, { memo } from 'react';
import {
  Brain,
  Building2,
  Calendar,
  FileText,
  Sparkles,
  User,
  X,
  AlertTriangle,
  Link2,
  Tags,
  ListChecks,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { riskStyles } from './knowledgeUtils';
import type { EnrichedDocument } from './types';

type Props = {
  document: EnrichedDocument | null;
  onClose?: () => void;
  onOpen?: (doc: EnrichedDocument) => void;
  className?: string;
  collapsible?: boolean;
};

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

const AICopilotPanel = memo(function AICopilotPanel({
  document: doc,
  onClose,
  onOpen,
  className,
}: Props) {
  if (!doc) {
    return (
      <aside
        aria-label="AI Copilot"
        className={cn(
          'flex h-full flex-col border-l border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70',
          className
        )}
      >
        <div className="flex items-center gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">AI Copilot</p>
            <p className="text-[10px] text-slate-400">Select knowledge to inspect</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-[#64499D]/30 bg-[#64499D]/05">
            <Sparkles className="h-5 w-5 text-[#64499D]/70" />
          </div>
          <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            Intelligence awaits selection
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Summaries, entities, risks, clauses, and related documents appear when you select an
            asset.
          </p>
        </div>
      </aside>
    );
  }

  const { insight } = doc;

  return (
    <aside
      aria-label="AI Copilot"
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">AI Copilot</p>
            <p className="truncate text-[10px] text-slate-400">{doc.title}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close AI panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="rounded-xl border border-[#64499D]/15 bg-gradient-to-br from-[#64499D]/08 to-transparent p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64499D] dark:text-[#CFC2FF]">
              Confidence {insight.confidence}%
            </span>
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize',
                riskStyles(insight.riskLevel)
              )}
            >
              {insight.riskLevel} risk
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
            {insight.summary}
          </p>
          {onOpen && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 w-full gap-1.5 border-slate-200 text-[12px] dark:border-slate-700"
              onClick={() => onOpen(doc)}
            >
              <FileText className="h-3 w-3" />
              Open preview
            </Button>
          )}
        </div>

        <Section title="Entities detected" icon={Building2}>
          <div className="space-y-2">
            {insight.entities.people.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                  <User className="h-3 w-3" /> People
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.entities.people.map((p) => (
                    <span
                      key={p}
                      className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {insight.entities.companies.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                  <Building2 className="h-3 w-3" /> Companies
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.entities.companies.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {insight.entities.dates.length > 0 && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                  <Calendar className="h-3 w-3" /> Dates
                </p>
                <div className="flex flex-wrap gap-1">
                  {insight.entities.dates.map((d) => (
                    <span
                      key={d}
                      className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!insight.entities.people.length &&
              !insight.entities.companies.length &&
              !insight.entities.dates.length && (
                <p className="text-[11px] text-slate-500">
                  Deeper entity extraction pending full AI index.
                </p>
              )}
          </div>
        </Section>

        <Section title="Risks & deadlines" icon={AlertTriangle}>
          <ul className="space-y-1.5 text-[12px] text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              Risk posture: {insight.riskLevel}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#64499D]" />
              Review recommended before next matter milestone
            </li>
          </ul>
        </Section>

        <Section title="Key clauses" icon={ListChecks}>
          <ul className="space-y-1">
            {insight.keyClauses.map((clause) => (
              <li
                key={clause}
                className="rounded-lg border border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-600 dark:border-slate-800 dark:text-slate-300"
              >
                {clause}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Smart tags" icon={Tags}>
          <div className="flex flex-wrap gap-1">
            {insight.smartTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-[#64499D]/15 bg-[#64499D]/06 px-1.5 py-0.5 text-[10px] font-medium text-[#64499D] dark:text-[#CFC2FF]"
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Suggested actions" icon={Sparkles}>
          <ul className="space-y-1">
            {insight.suggestedActions.map((action) => (
              <li key={action}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2.5 py-2 text-left text-[12px] text-slate-600 transition-colors hover:bg-[#64499D]/06 hover:text-[#64499D] dark:text-slate-300 dark:hover:bg-[#64499D]/15"
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Related & timeline" icon={GitBranch}>
          <p className="text-[12px] leading-relaxed text-slate-500">
            <Link2 className="mr-1 inline h-3 w-3" />
            {insight.relatedHint}. Generated timeline available after preview open.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {insight.references} citation references · Knowledge score {insight.knowledgeScore}
          </p>
        </Section>
      </div>
    </aside>
  );
});

export default AICopilotPanel;
