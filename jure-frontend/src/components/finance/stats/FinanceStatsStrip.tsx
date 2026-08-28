import React, { useMemo } from 'react';
import { Coins, CheckCircle2, Receipt, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { isCabinetTvaExonerated, type TVARegime, type TVAStatus } from '@/services/financeService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TVAProgressBar, TVA_LEGAL_THRESHOLD_MAD } from '@/components/finance/tva/TVAProgressBar';
import { useAppTranslation } from '@/i18n';

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
  const { t, tf } = useAppTranslation();
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
            {t.finance.stats.tvaDue}
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatMAD(tvaExonere ? 0 : tvaUnpaid)}
          </p>
          {tvaExonere ? (
            <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
              {t.finance.stats.exempt}
            </span>
          ) : null}

          {tvaExonere && tvaStatus ? (
            <div className="mt-2 space-y-1">
              <TVAProgressBar
                compact
                percent={progressPct}
                aria-label={tf(t.finance.stats.tvaProgressAria, { percent: Math.round(progressPct) })}
              />
              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                <span className="tabular-nums">{Math.round(progressPct)} %</span>
                {remainingBefore != null ? (
                  <span className="text-right font-medium text-slate-700 dark:text-slate-300">
                    {tf(t.finance.stats.beforeLiability, { amount: formatMAD(remainingBefore) })}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {tvaAssujetti && tvaStatus ? (
            <p className="mt-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
              {t.finance.stats.thresholdCrossed}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm',
            tvaExonere ? 'bg-emerald-500' : 'bg-red-500'
          )}
        >
          <Receipt size={16} className="text-white" aria-hidden />
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
                {t.finance.stats.totalRevenue}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(totalCaTtc)}
              </p>
              {caTotalHint ? (
                <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">{caTotalHint}</p>
              ) : null}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
              <Coins size={16} className="text-white" aria-hidden />
            </div>
          </div>
        </div>
        <div className={cn(cardBase, 'border-l-[3px] border-l-emerald-500')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                {t.finance.stats.collected}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(totalCollected)}
              </p>
              {collectedHint ? (
                <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">{collectedHint}</p>
              ) : null}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
              <CheckCircle2 size={16} className="text-white" aria-hidden />
            </div>
          </div>
        </div>
        {tvaExonere ? (
          <Tooltip>
            <TooltipTrigger asChild>{tvaCard}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-[12px] leading-snug">
              {t.finance.stats.exemptTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          tvaCard
        )}
        <div className={cn(cardBase, 'border-l-[3px] border-l-orange-500')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                {t.finance.stats.taxAdvancesDue}
              </p>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {formatMAD(taxAdvancesDueMad)}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 shadow-sm">
              <Scale size={16} className="text-white" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
