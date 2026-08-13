import React, { forwardRef, useId, useImperativeHandle, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export type KnowledgeSearchHandle = {
  focus: () => void;
  select: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  compact?: boolean;
};

const KnowledgeSearch = forwardRef<KnowledgeSearchHandle, Props>(function KnowledgeSearch(
  { value, onChange, onSubmit, className, compact = false },
  ref
) {
  const { t } = useAppTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const showExamples = focused && !value && !compact;

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    select: () => inputRef.current?.select(),
  }));

  return (
    <div className={cn('relative', className)} id="knowledge-search-anchor">
      <label htmlFor={inputId} className="sr-only">
        {t.library.searchLabel}
      </label>
      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-md border transition-all duration-150',
          'bg-white dark:bg-slate-950',
          focused
            ? 'border-[#64499D]/40 ring-2 ring-[#64499D]/20'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          compact ? 'h-9 px-2.5' : 'h-10 px-3'
        )}
      >
        <Search
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            focused ? 'text-[#64499D] dark:text-[#CFC2FF]' : 'text-slate-400'
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="searchbox"
          aria-label={t.library.searchAria}
          placeholder={compact ? t.library.searchPlaceholderCompact : t.library.searchPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) onSubmit(value);
            if (e.key === 'Escape') {
              onChange('');
              inputRef.current?.blur();
            }
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[13px] text-slate-900 dark:text-white outline-none',
            'placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500',
            '[&::-webkit-search-cancel-button]:hidden'
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 min-h-[28px] min-w-[28px] flex items-center justify-center"
            aria-label={t.library.clearSearch}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex dark:border-slate-700 dark:bg-slate-800">
            <CornerDownLeft className="h-2.5 w-2.5" />
            /
          </kbd>
        )}
      </div>

      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-lg border border-slate-200/90 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            role="listbox"
            aria-label={t.library.exampleQueries}
          >
            <p className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {t.library.tryAsking}
            </p>
            <div className="grid gap-0.5 sm:grid-cols-2">
              {(
                [
                  t.library.examples.nda,
                  t.library.examples.expiring,
                  t.library.examples.litigation,
                  t.library.examples.arbitration,
                  t.library.examples.whoSigned,
                  t.library.examples.gdpr,
                ] as const
              ).map((example) => (
                <button
                  key={example}
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(example);
                    onSubmit?.(example);
                  }}
                  className="rounded-md px-2 py-1.5 text-left text-[12px] text-slate-600 transition-colors hover:bg-[#64499D]/06 hover:text-[#64499D] dark:text-slate-300 dark:hover:bg-[#64499D]/15 dark:hover:text-[#CFC2FF]"
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default KnowledgeSearch;
