import { cn } from '@/lib/utils';

export const signupInputClass = (invalid?: boolean) =>
  cn(
    'h-10 rounded-xl border-0 bg-slate-100 px-3 text-[14px] text-slate-900 shadow-none',
    'placeholder:text-slate-400',
    'focus-visible:ring-2 focus-visible:ring-[#64499D]/35 focus-visible:ring-offset-0',
    'dark:bg-zinc-800 dark:text-slate-100 dark:placeholder:text-slate-500',
    invalid && 'ring-2 ring-red-400 focus-visible:ring-red-400'
  );

export const signupTextareaClass = (invalid?: boolean) =>
  cn(
    'min-h-[104px] rounded-2xl border-0 bg-slate-100 px-4 py-3 text-[15px] text-slate-900 shadow-none resize-none',
    'placeholder:text-slate-400',
    'focus-visible:ring-2 focus-visible:ring-[#64499D]/35 focus-visible:ring-offset-0',
    'dark:bg-zinc-800 dark:text-slate-100 dark:placeholder:text-slate-500',
    invalid && 'ring-2 ring-red-400 focus-visible:ring-red-400'
  );

export const signupLabelClass =
  'text-[12px] font-medium text-slate-500 dark:text-slate-400';

export const signupInlineLabelClass =
  'text-[12px] font-medium leading-tight text-slate-500 dark:text-slate-400';

export const signupPrimaryBtnClass =
  'h-12 rounded-2xl bg-[#64499D] px-8 text-[15px] font-semibold text-white shadow-none hover:bg-[#4D3680]';

export const signupBackBtnClass =
  'h-12 rounded-2xl border-slate-200 bg-transparent px-6 text-[15px] text-slate-600 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-zinc-700 dark:text-slate-300 dark:hover:bg-zinc-800';

export const signupChoiceClass = (active: boolean) =>
  cn(
    'rounded-2xl border p-5 text-start transition-all',
    active
      ? 'border-[#64499D] bg-[#F7F4FF] ring-2 ring-[#64499D]/25 dark:bg-[#64499D]/20'
      : 'border-slate-200 bg-slate-50 hover:border-[#64499D]/40 dark:border-zinc-700 dark:bg-zinc-800/60'
  );
