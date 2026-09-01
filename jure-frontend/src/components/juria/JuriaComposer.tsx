import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { JURIA_MODE_VISUAL } from '@/components/juria/juriaConstants';
import { CaseLinkDropdown } from '@/components/juria/CaseLinkDropdown';
import type { JuriaMode } from '@/types/juria';
import { useAppTranslation } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ASK_LANG_KEY = 'jure.juria.askLang';
type AskLang = 'fr' | 'en' | 'ar' | 'darija';

function readAskLang(): AskLang {
  try {
    const v = localStorage.getItem(ASK_LANG_KEY);
    if (v === 'ar' || v === 'darija' || v === 'fr' || v === 'en') return v;
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function JuriaComposer({
  mode,
  modeReadOnly = false,
  onModeChange,
  value,
  onChange,
  onSend,
  disabled,
  linkedCase,
  onLinkCase,
  onUnlinkCase,
  compact,
  showCaseLink = true,
  attachment,
  onAttachmentChange,
  variant = 'docked',
  askLang: askLangProp,
  onAskLangChange,
  onAddFromCase,
  onAddFromLibrary,
  canAddFromCase,
}: {
  mode: JuriaMode;
  modeReadOnly?: boolean;
  onModeChange: (m: JuriaMode) => void;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  linkedCase?: { reference?: string; title?: string };
  onLinkCase: (c: { id: number; reference?: string; title?: string }) => void;
  onUnlinkCase?: () => void;
  compact?: boolean;
  showCaseLink?: boolean;
  attachment?: File | null;
  onAttachmentChange?: (f: File | null) => void;
  variant?: 'docked' | 'hero';
  askLang?: AskLang;
  onAskLangChange?: (lang: AskLang) => void;
  onAddFromCase?: () => void;
  onAddFromLibrary?: () => void;
  canAddFromCase?: boolean;
}) {
  const { t } = useAppTranslation();
  const ta = useRef<HTMLTextAreaElement>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localLang, setLocalLang] = useState<AskLang>(readAskLang);
  const file = attachment !== undefined ? attachment : localFile;
  const setFile = onAttachmentChange ?? setLocalFile;
  const askLang = askLangProp ?? localLang;
  const setAskLang = (lang: AskLang) => {
    onAskLangChange?.(lang);
    setLocalLang(lang);
    try {
      localStorage.setItem(ASK_LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 32), 120)}px`;
  }, [value]);

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        window.alert(t.juria.fileTooLarge);
        return;
      }
      setFile(f);
    };
    input.click();
  };

  const modes: JuriaMode[] = ['LEGAL_RESEARCH', 'CONTRACT_ANALYSIS', 'DOCUMENT_DRAFTING', 'CHAT'];
  const langs: AskLang[] = ['fr', 'en', 'ar', 'darija'];
  const hero = variant === 'hero';
  const rtlPrompt = askLang === 'ar';

  return (
    <div
      className={cn(
        hero
          ? 'rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950'
          : cn(
              'bg-transparent',
              compact ? 'p-2' : 'px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-3'
            )
      )}
    >
      {file && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] dark:bg-slate-800">
            <span className="truncate">{file.name}</span>
            <button type="button" className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setFile(null)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      <div
        dir={rtlPrompt ? 'rtl' : 'ltr'}
        className="flex items-end gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:gap-1.5 sm:px-2"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mb-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Ajouter"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={pickFile}>Importer un document</DropdownMenuItem>
            {onAddFromCase && (
              <DropdownMenuItem disabled={!canAddFromCase} onClick={onAddFromCase}>
                Ajouter un document du dossier
              </DropdownMenuItem>
            )}
            {onAddFromLibrary && (
              <DropdownMenuItem onClick={onAddFromLibrary}>Ajouter depuis la bibliothèque</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          className="mb-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={pickFile}
          aria-label={t.juria.attachFile}
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={ta}
          rows={1}
          dir={rtlPrompt ? 'rtl' : 'ltr'}
          lang={askLang === 'ar' ? 'ar' : askLang === 'en' ? 'en' : 'fr'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
          enterKeyHint="send"
          placeholder={hero ? t.juria.askPlaceholder : t.juria.modes[mode].placeholder}
          className="max-h-[120px] min-h-[32px] flex-1 resize-none bg-transparent py-1.5 font-sans text-[15px] leading-5 text-slate-900 focus:outline-none sm:text-[13px] dark:text-slate-100"
        />
        <Button
          type="button"
          size="icon"
          className="mb-px h-8 w-8 shrink-0 rounded-full bg-[#64499D] hover:bg-[#4D3680]"
          disabled={disabled || (!value.trim() && !file)}
          onClick={onSend}
          aria-label={t.juria.send}
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {modeReadOnly ?
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {(() => {
              const Icon = JURIA_MODE_VISUAL[mode].Icon;
              return <Icon className="h-3.5 w-3.5 text-[#64499D]" />;
            })()}
            <span className="font-medium">{t.juria.modes[mode].shortLabel}</span>
          </span>
        : <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {modes.map((m) => {
              const Icon = JURIA_MODE_VISUAL[m].Icon;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onModeChange(m)}
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium transition',
                    mode === m
                      ? 'bg-white text-[#64499D] shadow-sm dark:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  )}
                  title={t.juria.modes[m].label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t.juria.modes[m].shortLabel}</span>
                </button>
              );
            })}
          </div>
        }

        <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5 text-[11px] dark:border-slate-700">
          {langs.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setAskLang(lang)}
              className={cn(
                'h-8 min-w-8 rounded-md px-2 font-medium transition',
                askLang === lang ? 'bg-[#64499D]/10 text-[#64499D]' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {t.juria.askLang[lang]}
            </button>
          ))}
        </div>

        {showCaseLink &&
          (linkedCase ? (
            <span className="inline-flex max-w-[min(100%,16rem)] shrink-0 items-center gap-1 truncate rounded-full bg-[#64499D]/10 px-2 py-1.5 text-[11px] text-[#4D3680] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]">
              {t.juria.context.label}: #{linkedCase.reference ?? '—'}
              {linkedCase.title ? ` — ${linkedCase.title}` : ''}
              {onUnlinkCase && (
                <button type="button" className="ms-0.5 rounded p-0.5 hover:bg-[#64499D]/15" onClick={onUnlinkCase}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ) : (
            <div className="shrink-0">
              <CaseLinkDropdown compact onSelect={onLinkCase} />
            </div>
          ))}

        <p className="ms-auto hidden shrink-0 text-[10px] text-slate-400 lg:block">{t.juria.keyboardHint}</p>
      </div>
    </div>
  );
}
