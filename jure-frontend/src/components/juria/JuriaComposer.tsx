import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { JURIA_MODE_META, PLACEHOLDER_BY_MODE } from '@/components/juria/juriaConstants';
import { CaseLinkDropdown } from '@/components/juria/CaseLinkDropdown';
import type { JuriaMode } from '@/types/juria';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
}: {
  mode: JuriaMode;
  /** Conversation mode is fixed server-side; hide mode switcher when true. */
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
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const file = attachment !== undefined ? attachment : localFile;
  const setFile = onAttachmentChange ?? setLocalFile;

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    const lines = Math.min(6, Math.max(1, el.value.split('\n').length));
    el.style.height = `${Math.min(lines * 22 + 20, 160)}px`;
  }, [value]);

  const pickFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        window.alert('Fichier trop volumineux (max 10 Mo).');
        return;
      }
      setFile(f);
    };
    input.click();
  };

  const modes: JuriaMode[] = ['CHAT', 'CONTRACT_ANALYSIS', 'LEGAL_RESEARCH', 'DOCUMENT_DRAFTING'];

  return (
    <div
      className={cn(
        'border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95',
        compact ? 'p-2' : 'p-4'
      )}
    >
      {file && (
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] dark:bg-slate-800">
            📎 {file.name}
            <button type="button" className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setFile(null)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="mt-2 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={pickFile}
          aria-label="Joindre un fichier"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={ta}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
          placeholder={PLACEHOLDER_BY_MODE[mode]}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <Button
          type="button"
          className="mt-2 shrink-0 bg-indigo-600 hover:bg-indigo-700"
          disabled={disabled || (!value.trim() && !file)}
          onClick={onSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {modeReadOnly ?
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <span>{JURIA_MODE_META[mode].icon}</span>
            <span className="font-medium">{JURIA_MODE_META[mode].shortLabel}</span>
          </span>
        : <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium transition',
                  mode === m
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                )}
                title={JURIA_MODE_META[m].label}
              >
                {JURIA_MODE_META[m].icon}
              </button>
            ))}
          </div>
        }
        {showCaseLink &&
          (linkedCase ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
              #{linkedCase.reference ?? '—'} — {linkedCase.title ?? ''}
              {onUnlinkCase && (
                <button type="button" className="ml-1 rounded p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900" onClick={onUnlinkCase}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ) : (
            <CaseLinkDropdown compact onSelect={onLinkCase} />
          ))}
      </div>
    </div>
  );
}
