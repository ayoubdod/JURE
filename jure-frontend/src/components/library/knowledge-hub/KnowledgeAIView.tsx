import React, { memo, useMemo } from 'react';
import {
  ScanSearch,
  FileSearch,
  ShieldAlert,
  Copy,
  Languages,
  Tags,
  GitCompare,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { EnrichedDocument } from './types';

const CAPABILITY_ICONS = {
  semanticSearch: ScanSearch,
  clauseExtraction: FileSearch,
  riskDetection: ShieldAlert,
  documentComparison: GitCompare,
  ocrTranslation: Copy,
  smartTags: Tags,
  citationGraph: Network,
  versionIntelligence: Languages,
} as const;

type CapabilityKey = keyof typeof CAPABILITY_ICONS;

type Props = {
  items: EnrichedDocument[];
  onSelect: (doc: EnrichedDocument) => void;
};

const KnowledgeAIView = memo(function KnowledgeAIView({ items, onSelect }: Props) {
  const { t, tf, enumLabel } = useAppTranslation();
  const kh = t.library.knowledgeHub;
  const capabilityKeys = Object.keys(CAPABILITY_ICONS) as CapabilityKey[];
  const clusters = useMemo(() => {
    const byCat = new Map<string, EnrichedDocument[]>();
    for (const doc of items) {
      const key = doc.category || 'other';
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key)!.push(doc);
    }
    return Array.from(byCat.entries())
      .map(([category, docs]) => ({
        category,
        label: enumLabel('documentCategory', category) || category,
        docs: docs.sort((a, b) => b.insight.knowledgeScore - a.insight.knowledgeScore).slice(0, 4),
        avgScore: Math.round(
          docs.reduce((s, d) => s + d.insight.knowledgeScore, 0) / Math.max(docs.length, 1)
        ),
        riskHigh: docs.filter((d) => d.insight.riskLevel === 'high').length,
      }))
      .sort((a, b) => b.docs.length - a.docs.length);
  }, [items, enumLabel]);

  const suggestions = useMemo(() => {
    const pending = items.filter((d) => d.insight.pendingClassification).slice(0, 3);
    const risky = items.filter((d) => d.insight.riskLevel === 'high').slice(0, 3);
    return { pending, risky };
  }, [items]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {kh.aiCapabilities}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {capabilityKeys.map((key) => {
            const Icon = CAPABILITY_ICONS[key];
            const copy = kh.capabilities[key];
            return (
            <div
              key={key}
              className="rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">{copy.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{copy.desc}</p>
            </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {kh.semanticClusters}
        </h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {clusters.map((cluster) => (
            <div
              key={cluster.category}
              className="rounded-xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                    {cluster.label}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {tf(kh.clusterMeta, { shown: cluster.docs.length, score: cluster.avgScore })}
                    {cluster.riskHigh > 0 ? tf(kh.clusterHighRisk, { n: cluster.riskHigh }) : ''}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {cluster.docs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(doc)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[12px]',
                        'hover:bg-[#64499D]/06 dark:hover:bg-[#64499D]/15'
                      )}
                    >
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                        {doc.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-[11px] text-[#64499D] dark:text-[#CFC2FF]">
                        {doc.insight.knowledgeScore}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
            {kh.suggestedClassifications}
          </p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.pending.length === 0 ? (
              <li className="text-[11px] text-slate-500">{kh.allClassified}</li>
            ) : (
              suggestions.pending.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(doc)}
                    className="text-left text-[12px] text-slate-700 hover:text-[#64499D] dark:text-slate-300"
                  >
                    {doc.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <p className="text-[12px] font-semibold text-rose-800 dark:text-rose-300">
            {kh.riskWatchlist}
          </p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.risky.length === 0 ? (
              <li className="text-[11px] text-slate-500">{kh.noElevatedRisks}</li>
            ) : (
              suggestions.risky.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(doc)}
                    className="text-left text-[12px] text-slate-700 hover:text-[#64499D] dark:text-slate-300"
                  >
                    {doc.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
});

export default KnowledgeAIView;
