import React from 'react';
import { JURIA_MODE_META, QUICK_STARTERS } from '@/components/juria/juriaConstants';
import type { JuriaMode } from '@/types/juria';

export function JuriaEmptyState({
  onPickMode,
  onPickStarter,
}: {
  onPickMode: (mode: JuriaMode) => void;
  onPickStarter: (text: string) => void;
}) {
  const modes: JuriaMode[] = ['CONTRACT_ANALYSIS', 'LEGAL_RESEARCH', 'DOCUMENT_DRAFTING', 'CHAT'];
  const blurbs: Record<JuriaMode, { title: string; desc: string }> = {
    CONTRACT_ANALYSIS: {
      title: 'Analyse de contrat',
      desc: 'Soumettez un PDF ou DOCX pour identifier clauses et risques',
    },
    LEGAL_RESEARCH: {
      title: 'Recherche juridique',
      desc: 'Explorez le droit marocain, la jurisprudence et la doctrine',
    },
    DOCUMENT_DRAFTING: {
      title: 'Rédaction de document',
      desc: 'Générez des actes et contrats conformes CGI Maroc',
    },
    CHAT: {
      title: 'Chat juridique',
      desc: 'Posez vos questions juridiques en français ou darija',
    },
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 animate-[logo-breathe_2.8s_ease-in-out_infinite]">
          <span className="text-3xl font-bold text-white">J</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Juria</h2>
        <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-300">
          Votre assistant juridique marocain intelligent
        </p>
        <span className="mt-3 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-800">
          Beta
        </span>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((mode) => {
          const meta = JURIA_MODE_META[mode];
          const b = blurbs[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onPickMode(mode)}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-indigo-700"
            >
              <span className="text-2xl">{meta.icon}</span>
              <span className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{b.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{b.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex w-full max-w-2xl flex-wrap justify-center gap-2">
        {QUICK_STARTERS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPickStarter(q)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-600"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
