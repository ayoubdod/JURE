import React from 'react';
import { FileText } from 'lucide-react';
import type { JuriaSourceHit } from '@/types/juria';

export function JuriaSourcePanel({
  sources,
  onOpen,
}: {
  sources: JuriaSourceHit[];
  onOpen?: (s: JuriaSourceHit) => void;
}) {
  if (!sources.length) {
    return (
      <div className="px-6 py-16 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-[#64499D]/40" />
        <p className="text-sm font-medium text-slate-800 dark:text-white">Connectez un dossier ou une bibliothèque pour enrichir le contexte juridique.</p>
      </div>
    );
  }
  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sources utilisées</p>
      <ol className="space-y-2">
        {sources.map((s, i) => (
          <li key={`${s.document_id}-${i}`}>
            <button
              type="button"
              className="w-full text-start text-[12px] text-slate-600 hover:text-[#64499D] dark:text-slate-300"
              onClick={() => onOpen?.(s)}
            >
              <span className="font-medium text-slate-800 dark:text-white">
                {i + 1}. {s.document}
              </span>
              {s.page ? <span className="ms-1 text-slate-400">Page {s.page}</span> : null}
              {typeof s.relevance === 'number' && (
                <span className="ms-1 text-[10px] text-slate-400">({Math.round(s.relevance * 100)}%)</span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
