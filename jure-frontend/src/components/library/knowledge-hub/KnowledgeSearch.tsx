import React, { useId, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, Sparkles, X, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEARCH_EXAMPLES } from './types';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  compact?: boolean;
};

const KnowledgeSearch: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
  className,
  compact = false,
}) => {
  const inputId = useId();
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const showExamples = focused && !value;

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        Ask your knowledge
      </label>
      <div
        className={cn(
          'group relative flex items-center gap-3 rounded-2xl border transition-all duration-300',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl',
          focused
            ? 'border-[#64499D]/40 shadow-[0_0_0_3px_rgba(100,73,157,0.12),0_8px_30px_-8px_rgba(100,73,157,0.25)]'
            : 'border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-600',
          compact ? 'px-3 py-2.5' : 'px-4 py-3.5 sm:px-5 sm:py-4'
        )}
      >
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors',
            focused
              ? 'bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          )}
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <input
          id={inputId}
          type="search"
          role="searchbox"
          aria-label="Ask anything about your firm's knowledge"
          placeholder="Ask anything about your firm's knowledge…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) onSubmit(value);
          }}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[14px] text-slate-900 outline-none',
            'placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500',
            '[&::-webkit-search-cancel-button]:hidden'
          )}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex dark:border-slate-700 dark:bg-slate-800">
            <CornerDownLeft className="h-2.5 w-2.5" />
            Ask
          </kbd>
        )}
        <Search className="hidden h-4 w-4 text-slate-300 sm:block" aria-hidden />
      </div>

      <AnimatePresence>
        {showExamples && !compact && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-lg backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
            role="listbox"
            aria-label="Example queries"
          >
            <p className="px-2 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Try asking
            </p>
            <div className="grid gap-0.5 sm:grid-cols-2">
              {SEARCH_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(example);
                    onSubmit?.(example);
                  }}
                  className="rounded-lg px-2.5 py-2 text-left text-[12px] text-slate-600 transition-colors hover:bg-[#64499D]/06 hover:text-[#64499D] dark:text-slate-300 dark:hover:bg-[#64499D]/15 dark:hover:text-[#CFC2FF]"
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
};

export default KnowledgeSearch;
