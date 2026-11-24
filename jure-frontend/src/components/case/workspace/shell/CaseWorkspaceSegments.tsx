'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export type CaseWorkspaceSegmentOption<T extends string = string> = {
  id: T;
  label: string;
};

export default function CaseWorkspaceSegments<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: CaseWorkspaceSegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAt = useCallback((index: number) => {
    const el = refs.current[index];
    el?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (options.length === 0) return;
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = options.length - 1;
    } else {
      return;
    }
    onChange(options[next].id);
    focusAt(next);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      {options.map((opt, index) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'min-h-11 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40',
              selected
                ? 'bg-white text-[#64499D] shadow-sm ring-1 ring-[#64499D]/15 dark:bg-zinc-950 dark:text-[#CFC2FF]'
                : 'text-slate-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-950/60'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
