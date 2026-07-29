import React, { useMemo } from 'react';
import { Coins, CheckCircle2, Receipt, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { isCabinetTvaExonerated, type TVARegime, type TVAStatus } from '@/services/financeService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TVAProgressBar, TVA_LEGAL_THRESHOLD_MAD } from '@/components/finance/tva/TVAProgressBar';

type Props = {
  totalCaTtc: number;
  totalCollected: number;
  tvaUnpaid: number;
  taxAdvancesDueMad: number;
  /** When set from TVA status API: exoneration vs VAT-liable display for the TVA card. */
  tvaRegime?: TVARegime | null;
  /** Full TVA status for progress bar and remaining before threshold. */
  tvaStatus?: TVAStatus | null;
  /** Shown under CA Total when value comes from cumulative lifetime CA fallback. */
  caTotalHint?: string | null;
  /** Shown under Encaissé when value comes from monthly sum fallback. */
  collectedHint?: string | null;
};

const cardBase =
  'cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-0.5';

export const FinanceStatsStrip: React.FC<Props> = ({
  totalCaTtc,
  totalCollected,
  tvaUnpaid,
  taxAdvancesDueMad,
  tvaRegime,
  tvaStatus,
  caTotalHint,
  collectedHint,
}) => {
  const regime = tvaStatus?.regime ?? tvaRegime ?? null;
  const tvaExonere =
    tvaStatus != null ? isCabinetTvaExonerated(tvaStatus) : regime === 'EXONÉRÉ';
  const tvaAssujetti =
    tvaStatus != null ? !isCabinetTvaExonerated(tvaStatus) : regime === 'ASSUJETTI';

  const thresholdMad = tvaStatus?.threshold_mad && tvaStatus.threshold_mad > 0 ? tvaStatus.threshold_mad : TVA_LEGAL_THRESHOLD_MAD;
  const cumul = tvaStatus?.cumulative_ca_mad ?? 0;
  const remainingBefore =
    tvaStatus?.remaining_mad != null && !Number.isNaN(tvaStatus.remaining_mad)
      ? Math.max(0, tvaStatus.remaining_mad)
      : tvaExonere
        ? Math.max(0, thresholdMad - cumul)
        : null;

  const progressPct = useMemo(() => {
    if (!tvaExonere || thresholdMad <= 0) return 0;
    if (tvaStatus?.threshold_percentage != null && !Number.isNaN(tvaStatus.threshold_percentage)) {
      return Math.min(100, Math.max(0, tvaStatus.threshold_percentage));
    }
    return Math.min(100, (cumul / thresholdMad) * 100);
  }, [tvaExonere, cumul, thresholdMad, tvaStatus?.threshold_percentage]);

  const tvaCard = (
    <div
      className={cn(
        cardBase,
        tvaExonere ? 'border-l-[3px] border-l-emerald-500' : 'border-l-[3px] border-l-red-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            TVA à payer
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMAD(tvaExonere ? 0 : tvaUnpaid)}
          </p>
          {tvaExonere ? (
            <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
              Exonéré
            </span>
          ) : null}

          {tvaExonere && tvaStatus ? (
            <div className="mt-2 space-y-1">
              <TVAProgressBar
                compact
                percent={progressPct}
                aria-label={`Progression vers le seuil TVA : ${Math.round(progressPct)} pour cent`}
              />
              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                <span className="tabular-nums">{Math.round(progressPct)} %</span>
                {remainingBefore != null ? (
                  <span className="text-right font-medium text-slate-700 dark:text-slate-300">
                    {formatMAD(remainingBefore)} avant assujettissement
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {tvaAssujetti && tvaStatus ? (
            <p className="mt-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
              Seuil cumulé franchi — TVA obligatoire sur les nouvelles factures.
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'shrink-0 rounded-md border p-1.5',
            tvaExonere
              ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:border-emerald-700/50 dark:text-emerald-400'
              : 'border-red-300/50 bg-red-500/10 text-red-700 dark:border-red-700/50 dark:text-red-400'
          )}
        >
          <Receipt className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </div>
      </div>
    </div>
  );

  return (
    <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 sm:px-4 py-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={cn(cardBase, 'border-l-[3px] border-l-amber-500')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                CA Total
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(totalCaTtc)}
              </p>
              {caTotalHint ? (
                <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">{caTotalHint}</p>
              ) : null}
            </div>
            <div className="rounded-md border border-amber-300/50 bg-amber-500/10 p-1.5 text-amber-700 dark:border-amber-700/50 dark:text-amber-400">
              <Coins className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            </div>
          </div>
        </div>
        <div className={cn(cardBase, 'border-l-[3px] border-l-emerald-500')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                Encaissé
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(totalCollected)}
              </p>
              {collectedHint ? (
                <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">{collectedHint}</p>
              ) : null}
            </div>
            <div className="rounded-md border border-emerald-300/50 bg-emerald-500/10 p-1.5 text-emerald-700 dark:border-emerald-700/50 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            </div>
          </div>
        </div>
        {tvaExonere ? (
          <Tooltip>
            <TooltipTrigger asChild>{tvaCard}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-[12px] leading-snug">
              Exonéré de TVA — CA cumulé {'<'} 500 000 MAD (Art. 89 CGI Maroc). Définitif une fois le seuil franchi.
            </TooltipContent>
          </Tooltip>
        ) : (
          tvaCard
        )}
        <div className={cn(cardBase, 'border-l-[3px] border-l-orange-500')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                Acomptes dus
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(taxAdvancesDueMad)}
              </p>
            </div>
            <div className="rounded-md border border-orange-300/50 bg-orange-500/10 p-1.5 text-orange-700 dark:border-orange-700/50 dark:text-orange-400">
              <Scale className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
