import React from 'react';
import type { JuriaContractAnalysis } from '@/types/juria';

export function JuriaContractIntelligence({
  analysis,
  onClausePrompt,
}: {
  analysis: JuriaContractAnalysis;
  onClausePrompt?: (prompt: string) => void;
}) {
  const score = analysis.risk_score ?? 0;
  const high = analysis.risks?.high?.length ?? 0;
  const med = analysis.risks?.medium?.length ?? 0;
  const low = analysis.risks?.low?.length ?? 0;
  const extracted = analysis.extracted || {};

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64499D]">Contract Intelligence</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-[10px] text-slate-400">Risk Score</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{score} <span className="text-sm text-slate-400">/ 100</span></p>
        </div>
        <div className="flex gap-2 text-[11px]">
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">🔴 {high} élevés</span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">🟠 {med} moyens</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">🟢 {low} faibles</span>
        </div>
      </div>
      {(analysis.missing_clauses?.length || 0) > 0 && (
        <p className="text-[12px] text-slate-600">Clauses manquantes: {analysis.missing_clauses!.length}</p>
      )}
      {(analysis.unusual_clauses?.length || 0) > 0 && (
        <p className="text-[12px] text-slate-600">Clauses inhabituelles: {analysis.unusual_clauses!.length}</p>
      )}
      {analysis.analysis && <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">{analysis.analysis}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(extracted).map(([key, values]) => {
          const list = Array.isArray(values) ? values : [];
          if (!list.length) return null;
          return (
            <div key={key} className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
              <p className="text-[10px] font-semibold uppercase text-slate-400">{key.replace(/_/g, ' ')}</p>
              <ul className="mt-1 space-y-0.5 text-[12px] text-slate-700 dark:text-slate-300">
                {list.slice(0, 6).map((v) => (
                  <li key={String(v)} className="flex items-start justify-between gap-2">
                    <span>{String(v)}</span>
                    {onClausePrompt && (
                      <span className="flex shrink-0 gap-1 text-[10px] text-[#64499D]">
                        {['Expliquer', 'Réécrire', 'Alternative'].map((act) => (
                          <button
                            key={act}
                            type="button"
                            className="hover:underline"
                            onClick={() => onClausePrompt(`${act} cette clause : « ${String(v)} »`)}
                          >
                            {act}
                          </button>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
