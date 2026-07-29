import React from 'react';
import { cn } from '@/lib/utils';

export const TVA_LEGAL_THRESHOLD_MAD = 500_000;

/** Shown under invoice TVA lines when API marks invoice as non-VAT (exoneration). */
export const TVA_EXONERATION_INVOICE_NOTE =
  "Exonéré de TVA — CA cumulé < 500 000 MAD (Art. 89 CGI Maroc)";

/** Prefer backend `tva_exoneration_note` when invoice is exonerated; fallback to default copy. */
export function invoiceExonerationNote(inv: {
  tva_applicable?: boolean;
  tva_exoneration_note?: string | null;
}): string | null {
  if (inv.tva_applicable !== false) return null;
  const n = inv.tva_exoneration_note?.trim();
  return n || TVA_EXONERATION_INVOICE_NOTE;
}

type Props = {
  /** 0–100 */
  percent: number;
  className?: string;
  /** Thinner bar for dense layouts (e.g. stats strip). */
  compact?: boolean;
  'aria-label'?: string;
};

function barColor(p: number): string {
  if (p <= 60) return '#22c55e';
  if (p <= 80) return '#f59e0b';
  return '#ef4444';
}

export const TVAProgressBar: React.FC<Props> = ({
  percent,
  className,
  compact,
  'aria-label': ariaLabel,
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const pulse = clamped >= 81 && clamped < 100;
  const bg = barColor(clamped);

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          compact ? 'h-1.5' : 'h-2.5',
          'w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800',
          pulse && 'ring-2 ring-red-400/40'
        )}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', pulse && 'animate-pulse')}
          style={{ width: `${clamped}%`, backgroundColor: bg }}
        />
      </div>
    </div>
  );
};
