import React, { memo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutiveKpi } from './types';
import { AnimatedCounter } from './MissionControlHeader';

type Props = {
  kpis: ExecutiveKpi[];
  className?: string;
};

function MiniSparkline({ data, accent }: { data: number[]; accent?: ExecutiveKpi['accent'] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 56;
  const h = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  const stroke =
    accent === 'critical'
      ? '#e11d48'
      : accent === 'warning'
        ? '#d97706'
        : accent === 'positive'
          ? '#059669'
          : '#64499D';

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80" aria-hidden>
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

const TrendIcon = ({ trend }: { trend: ExecutiveKpi['trend'] }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-rose-600" aria-hidden />;
  return <Minus className="h-3 w-3 text-slate-400" aria-hidden />;
};

const ExecutiveKpiGrid = memo(function ExecutiveKpiGrid({ kpis, className }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section aria-label="Executive intelligence" className={cn('space-y-2', className)}>
      <h2 className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Executive Intelligence
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const open = openId === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onMouseEnter={() => setOpenId(kpi.id)}
              onMouseLeave={() => setOpenId(null)}
              onFocus={() => setOpenId(kpi.id)}
              onBlur={() => setOpenId(null)}
              className={cn(
                'group relative rounded-xl border border-slate-200/80 bg-white p-3 text-left transition',
                'hover:-translate-y-0.5 hover:border-[#64499D]/25 hover:shadow-md',
                'dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#8B6FD1]/30',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </span>
                <MiniSparkline data={kpi.sparkline} accent={kpi.accent} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    'text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50',
                    kpi.accent === 'critical' && 'text-rose-700 dark:text-rose-300',
                    kpi.accent === 'warning' && 'text-amber-700 dark:text-amber-300',
                    kpi.accent === 'positive' && 'text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  {typeof kpi.value === 'number' || (typeof kpi.value === 'string' && kpi.value !== '—') ? (
                    <AnimatedCounter value={kpi.value} suffix={kpi.suffix} />
                  ) : (
                    kpi.value
                  )}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                  <TrendIcon trend={kpi.trend} />
                  {kpi.change}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                <Sparkles className="h-2.5 w-2.5 text-[#64499D]/70" aria-hidden />
                {kpi.confidence}% confidence
              </div>

              <div
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute left-0 right-0 top-full z-20 mt-1.5 rounded-lg border border-slate-200 bg-white p-3 shadow-lg transition',
                  'dark:border-slate-700 dark:bg-slate-900',
                  open ? 'visible opacity-100' : 'invisible opacity-0'
                )}
              >
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {kpi.explanation}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                  AI: {kpi.recommendation}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});

export default ExecutiveKpiGrid;
