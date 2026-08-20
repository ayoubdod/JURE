import React from 'react';
import { cn } from '@/lib/utils';
import { formatCaseRef, humanizeToken, linkedCaseDotClass } from './conversationUtils';

export const LinkedMatterChip: React.FC<{
  linkedCase: API.LinkedCaseSummary;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
  className?: string;
}> = ({ linkedCase, onClick, compact, className }) => {
  const ref = formatCaseRef(linkedCase);
  const typeLabel = humanizeToken(linkedCase.caseType ?? linkedCase.case_type);
  const Comp = onClick ? 'button' : 'span';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200/90 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
        onClick &&
          'cursor-pointer transition-colors hover:border-[#64499D]/35 hover:bg-[#F7F4FF] hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
        compact && 'max-w-[140px]',
        className
      )}
      title={[ref, linkedCase.title, typeLabel].filter(Boolean).join(' · ')}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', linkedCaseDotClass(linkedCase))} aria-hidden />
      <span className="truncate font-mono tracking-tight">{ref}</span>
      {!compact && typeLabel ? (
        <>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
            ·
          </span>
          <span className="truncate">{typeLabel}</span>
        </>
      ) : null}
    </Comp>
  );
};

export default LinkedMatterChip;
