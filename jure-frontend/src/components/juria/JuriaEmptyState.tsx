import React, { useState } from 'react';
import { JURIA_MODE_VISUAL } from '@/components/juria/juriaConstants';
import { JuriaComposer } from '@/components/juria/JuriaComposer';
import type { JuriaMode } from '@/types/juria';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

const ACTION_ORDER: { mode: JuriaMode; action: 'research' | 'analyze' | 'draft' | 'ask' }[] = [
  { mode: 'LEGAL_RESEARCH', action: 'research' },
  { mode: 'CONTRACT_ANALYSIS', action: 'analyze' },
  { mode: 'DOCUMENT_DRAFTING', action: 'draft' },
  { mode: 'CHAT', action: 'ask' },
];

export function JuriaEmptyState({
  onPickMode,
  onPickStarter,
  onAsk,
}: {
  onPickMode: (mode: JuriaMode) => void;
  onPickStarter: (text: string, mode?: JuriaMode) => void;
  onAsk?: (
    text: string,
    file?: File | null,
    caseLink?: { id: number; reference?: string; title?: string },
    mode?: JuriaMode
  ) => void;
}) {
  const { t } = useAppTranslation();
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<JuriaMode>('CHAT');
  const [linkedCase, setLinkedCase] = useState<{ id: number; reference?: string; title?: string } | null>(null);

  const chips = [
    { text: t.juria.quickStarters.analyzeContract, mode: 'CONTRACT_ANALYSIS' as const },
    { text: t.juria.quickStarters.searchMoroccan, mode: 'LEGAL_RESEARCH' as const },
    { text: t.juria.quickStarters.summarizeDoc, mode: 'CHAT' as const },
    { text: t.juria.quickStarters.draftFormalNotice, mode: 'DOCUMENT_DRAFTING' as const },
    { text: t.juria.quickStarters.compareClauses, mode: 'CONTRACT_ANALYSIS' as const },
    { text: t.juria.quickStarters.analyzeCaseLaw, mode: 'LEGAL_RESEARCH' as const },
  ];

  const submit = () => {
    const text = draft.trim();
    if (!text && !file) return;
    onAsk?.(text, file, linkedCase ?? undefined, mode);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-5 sm:px-8 sm:py-10">
          <div className="mb-5 flex flex-col items-center text-center sm:mb-8">
            <img
              src="/images/juria-icon.png"
              alt=""
              className="mb-3 h-10 w-10 rounded-[12px] object-contain shadow-sm ring-1 ring-slate-200/80 sm:mb-4 sm:h-12 sm:w-12 dark:ring-slate-700"
            />
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-semibold tracking-[0.14em] text-slate-800 dark:text-white">JURIA</h1>
              <span className="rounded-full bg-[#64499D]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#64499D]">
                {t.juria.beta}
              </span>
            </div>
            <h2 className="mt-3 max-w-lg text-lg font-medium leading-snug tracking-tight text-slate-900 dark:text-white sm:mt-4 sm:text-[22px]">
              {t.juria.headline}
            </h2>
            <p className="mt-2 hidden max-w-xl text-[13px] leading-relaxed text-slate-500 sm:block dark:text-slate-400">
              {t.juria.subtitle}
            </p>
            <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-slate-500 sm:hidden dark:text-slate-400">
              {t.juria.howCanIHelp}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {ACTION_ORDER.map(({ mode: m, action }) => {
              const visual = JURIA_MODE_VISUAL[m];
              const Icon = visual.Icon;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onPickMode(m)}
                  className="group flex min-h-[72px] flex-col gap-2 rounded-xl border border-slate-200/90 bg-white/85 p-2.5 text-start backdrop-blur-sm transition hover:border-[#64499D]/35 hover:bg-[#FBF9FF] sm:min-h-0 sm:flex-row sm:gap-3 sm:p-3.5 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-[#64499D]/40 dark:hover:bg-[#64499D]/5"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9', visual.iconWrap)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                      {t.juria.actions[action]}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium text-slate-900 sm:text-[13px] dark:text-white">
                      {t.juria.modes[m].label}
                    </span>
                    <span className="mt-0.5 hidden text-[12px] leading-relaxed text-slate-500 sm:block dark:text-slate-400">
                      {t.juria.modes[m].desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mx-auto mt-6 hidden max-w-lg text-center text-[11px] leading-relaxed text-slate-400 sm:block dark:text-slate-500">
            {t.juria.disclaimer}
          </p>
        </div>
      </div>

      {onAsk ? (
        <div className="shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-4 [&::-webkit-scrollbar]:hidden">
              {chips.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  onClick={() => onPickStarter(chip.text, chip.mode)}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600 transition hover:border-[#64499D]/30 hover:text-[#64499D] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {chip.text}
                </button>
              ))}
            </div>
            <JuriaComposer
              variant="docked"
              mode={mode}
              onModeChange={setMode}
              value={draft}
              onChange={setDraft}
              onSend={submit}
              linkedCase={linkedCase ?? undefined}
              onLinkCase={(c) => setLinkedCase(c)}
              onUnlinkCase={() => setLinkedCase(null)}
              attachment={file}
              onAttachmentChange={setFile}
              showCaseLink
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
