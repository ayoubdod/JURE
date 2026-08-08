import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SmartMetrics } from './types';
import '@/styles/workspace-list.css';

type MetricDef = {
  key: keyof SmartMetrics;
  label: string;
  suffix?: string;
  accent: string;
};

const METRICS: MetricDef[] = [
  { key: 'totalDocuments', label: 'Total', accent: 'border-l-slate-400' },
  {
    key: 'aiIndexed',
    label: 'AI Indexed',
    accent: 'border-l-[#64499D]',
  },
  { key: 'folders', label: 'Folders', accent: 'border-l-indigo-500' },
  {
    key: 'pendingClassification',
    label: 'Pending',
    accent: 'border-l-amber-500',
  },
  { key: 'recentlyUpdated', label: 'Updated', accent: 'border-l-emerald-500' },
  {
    key: 'knowledgeScore',
    label: 'Score',
    suffix: '%',
    accent: 'border-l-[#64499D]',
  },
];

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced || value === prev.current) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    let frame = 0;
    const start = prev.current;
    const diff = value - start;
    const steps = 12;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setDisplay(Math.round(start + (diff * frame) / steps));
      if (frame < steps) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return (
    <span className="tabular-nums ws-stat-value">
      {display}
      {suffix}
    </span>
  );
}

type Props = {
  metrics: SmartMetrics;
  className?: string;
};

/** Compact single-row KPI strip — scrolls away; never sticky. */
const SmartMetricsBar: React.FC<Props> = ({ metrics, className }) => {
  return (
    <section
      aria-label="Smart metrics"
      className={cn(
        'ws-kpi-strip flex gap-2 overflow-x-auto snap-x snap-mandatory py-2',
        className
      )}
    >
      {METRICS.map(({ key, label, suffix, accent }) => (
        <div
          key={key}
          className={cn(
            'snap-start shrink-0 flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
            'bg-white dark:bg-slate-950 border-l-[3px] px-2.5 py-1.5 min-w-[5.5rem]',
            'sm:flex-1 sm:min-w-0',
            accent
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none truncate">
              {label}
            </p>
            <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={metrics[key]} suffix={suffix} />
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default SmartMetricsBar;
