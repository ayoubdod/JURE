import React, { useMemo } from 'react';
import { Coins, CheckCircle2, Receipt, Scale } from 'lucide-react';
import { formatMAD } from '@/utils/formatMAD';
import { isCabinetTvaExonerated, type TVARegime, type TVAStatus } from '@/services/financeService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TVAProgressBar, TVA_LEGAL_THRESHOLD_MAD } from '@/components/finance/tva/TVAProgressBar';
import { WorkspaceKpiStrip, type WorkspaceKpiItem } from '@/components/workspace/WorkspaceChrome';
import { useAppTranslation } from '@/i18n';

type Props = {
  loading?: boolean;
  /** Keep KPI labels visible; only pulse the amounts. */
  pending?: boolean;
  totalCaTtc: number;
  totalCollected: number;
  tvaUnpaid: number;
  taxAdvancesDueMad: number;
  tvaRegime?: TVARegime | null;
  tvaStatus?: TVAStatus | null;
  caTotalHint?: string | null;
  collectedHint?: string | null;
};

export const FinanceStatsStrip: React.FC<Props> = ({
  loading = false,
  pending = false,
  totalCaTtc,
  totalCollected,
  tvaUnpaid,
  taxAdvancesDueMad,
  tvaRegime,
  tvaStatus,
  caTotalHint,
  collectedHint,
}) => {
  const { t, tf, lang } = useAppTranslation();
  const regime = tvaStatus?.regime ?? tvaRegime ?? null;
  const tvaExonere = tvaStatus != null ? isCabinetTvaExonerated(tvaStatus) : regime === 'EXONÉRÉ';
  const tvaAssujetti = tvaStatus != null ? !isCabinetTvaExonerated(tvaStatus) : regime === 'ASSUJETTI';

  const thresholdMad =
    tvaStatus?.threshold_mad && tvaStatus.threshold_mad > 0 ? tvaStatus.threshold_mad : TVA_LEGAL_THRESHOLD_MAD;
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

  const tvaExtra = (
    <div className="space-y-1.5">
      {tvaExonere ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
              {t.finance.stats.exempt}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-[12px] leading-snug">
            {t.finance.stats.exemptTooltip}
          </TooltipContent>
        </Tooltip>
      ) : null}
      {tvaExonere && tvaStatus ? (
        <>
          <TVAProgressBar
            compact
            percent={progressPct}
            aria-label={tf(t.finance.stats.tvaProgressAria, { percent: Math.round(progressPct) })}
          />
          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
            <span className="tabular-nums">{Math.round(progressPct)} %</span>
            {remainingBefore != null ? (
              <span className="text-end font-medium text-slate-600 dark:text-slate-300">
                {tf(t.finance.stats.beforeLiability, { amount: formatMAD(remainingBefore, lang) })}
              </span>
            ) : null}
          </div>
        </>
      ) : null}
      {tvaAssujetti && tvaStatus ? (
        <p className="text-[10px] leading-tight text-slate-500">{t.finance.stats.thresholdCrossed}</p>
      ) : null}
    </div>
  );

  const items: WorkspaceKpiItem[] = [
    {
      key: 'ca',
      label: t.finance.stats.totalRevenue,
      value: pending ? null : formatMAD(totalCaTtc, lang),
      hint: caTotalHint ?? undefined,
      icon: Coins,
      accent: 'text-amber-600',
    },
    {
      key: 'collected',
      label: t.finance.stats.collected,
      value: pending ? null : formatMAD(totalCollected, lang),
      hint: collectedHint ?? undefined,
      icon: CheckCircle2,
      accent: 'text-emerald-600',
    },
    {
      key: 'tva',
      label: t.finance.stats.tvaDue,
      value: pending ? null : formatMAD(tvaExonere ? 0 : tvaUnpaid, lang),
      icon: Receipt,
      accent: tvaExonere ? 'text-emerald-600' : 'text-red-600',
      extra: tvaExtra,
    },
    {
      key: 'tax',
      label: t.finance.stats.taxAdvancesDue,
      value: pending ? null : formatMAD(taxAdvancesDueMad, lang),
      icon: Scale,
      accent: 'text-orange-600',
    },
  ];

  return <WorkspaceKpiStrip items={items} loading={loading} ariaLabel={t.finance.title} />;
};
