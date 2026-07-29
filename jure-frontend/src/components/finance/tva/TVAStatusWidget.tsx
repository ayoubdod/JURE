import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, Scale } from 'lucide-react';
import { isCabinetTvaExonerated, type TVAStatus } from '@/services/financeService';
import { TVAProgressBar, TVA_LEGAL_THRESHOLD_MAD } from './TVAProgressBar';
import { formatMAD } from '@/utils/formatMAD';
import { cn } from '@/lib/utils';

type Props = {
  status: TVAStatus;
};

function firmDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'd MMM yyyy', { locale: fr });
}

export const TVAStatusWidget: React.FC<Props> = ({ status }) => {
  const threshold = status.threshold_mad > 0 ? status.threshold_mad : TVA_LEGAL_THRESHOLD_MAD;
  const cumul = status.cumulative_ca_mad;
  const pct = useMemo(() => {
    if (status.threshold_percentage != null && !Number.isNaN(status.threshold_percentage)) {
      return Math.min(100, Math.max(0, status.threshold_percentage));
    }
    return Math.min(100, threshold > 0 ? (cumul / threshold) * 100 : 0);
  }, [cumul, threshold, status.threshold_percentage]);

  const assujetti = !isCabinetTvaExonerated(status);
  const remaining =
    status.remaining_mad != null && !Number.isNaN(status.remaining_mad)
      ? Math.max(0, status.remaining_mad)
      : !assujetti
        ? Math.max(0, threshold - cumul)
        : 0;

  const regimePill = assujetti ? (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
      {status.regime_label?.trim() || 'ASSUJETTI À LA TVA'}
    </span>
  ) : (
    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
      {status.regime_label?.trim() || 'EXONÉRÉ'}
    </span>
  );

  const cumulDisplay = status.lifetime_ca_display?.trim() || formatMAD(cumul);
  const thresholdDisplay = status.threshold_display?.trim() || formatMAD(threshold);
  const remainingDisplay =
    assujetti
      ? '—'
      : status.ca_remaining_display?.trim() || (remaining != null ? formatMAD(remaining) : '—');

  const disclaimer = status.note?.trim();

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Scale className="h-4 w-4 text-slate-500" aria-hidden />
        Suivi du seuil TVA — CA cumulé depuis l&apos;ouverture
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-slate-600 dark:text-slate-400">Régime actuel :</span>
        {regimePill}
      </div>
      <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-1">
        <div className="flex justify-between gap-4 border-b border-slate-100 py-1 dark:border-slate-800/80">
          <dt className="text-slate-600 dark:text-slate-400">CA cumulé total</dt>
          <dd className="tabular-nums font-medium text-slate-900 dark:text-white">{cumulDisplay}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-slate-100 py-1 dark:border-slate-800/80">
          <dt className="text-slate-600 dark:text-slate-400">Seuil légal</dt>
          <dd className="tabular-nums font-medium text-slate-900 dark:text-white">{thresholdDisplay}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-slate-600 dark:text-slate-400">Restant</dt>
          <dd
            className={cn(
              'tabular-nums font-medium',
              assujetti ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'
            )}
          >
            {remainingDisplay}
          </dd>
        </div>
      </dl>
      <div className="mt-4 space-y-2">
        <TVAProgressBar percent={pct} aria-label="Progression seuil TVA cumulatif" />
        <p className="text-right text-[12px] tabular-nums text-slate-600 dark:text-slate-400">
          {Math.round(pct)}%
        </p>
      </div>
      {status.firm_created_at ? (
        <p className="mt-4 text-[12px] text-slate-600 dark:text-slate-400">
          Cabinet créé sur la plateforme :{' '}
          <span className="font-medium text-slate-800 dark:text-slate-200">{firmDate(status.firm_created_at)}</span>
        </p>
      ) : null}
      <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Référence légale : Art. 89, CGI Maroc</p>
      <div className="mt-4 flex gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 p-3 text-[12px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <p>
          {disclaimer ||
            "Ce seuil est cumulatif sur toute la durée d'activité du cabinet. Il ne se réinitialise pas."}
        </p>
      </div>
    </div>
  );
};
