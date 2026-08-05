import React, { useEffect, useRef, useState } from 'react';
import { FileStack, Brain, FolderTree, Clock3, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmartMetrics } from './types';

type MetricDef = {
  key: keyof SmartMetrics;
  label: string;
  icon: React.ElementType;
  suffix?: string;
  accent?: string;
};

const METRICS: MetricDef[] = [
  { key: 'totalDocuments', label: 'Total Documents', icon: FileStack },
  { key: 'aiIndexed', label: 'AI Indexed', icon: Brain, accent: 'text-[#64499D] dark:text-[#CFC2FF]' },
  { key: 'folders', label: 'Folders', icon: FolderTree },
  {
    key: 'pendingClassification',
    label: 'Pending Classification',
    icon: AlertCircle,
    accent: 'text-amber-600 dark:text-amber-400',
  },
  { key: 'recentlyUpdated', label: 'Recently Updated', icon: Clock3 },
  {
    key: 'knowledgeScore',
    label: 'Knowledge Score',
    icon: Sparkles,
    suffix: '%',
    accent: 'text-[#64499D] dark:text-[#CFC2FF]',
  },
];

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

type Props = {
  metrics: SmartMetrics;
  className?: string;
};

const SmartMetricsBar: React.FC<Props> = ({ metrics, className }) => {
  return (
    <section
      aria-label="Smart metrics"
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200/60',
        'dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3 lg:grid-cols-6',
        className
      )}
    >
      {METRICS.map(({ key, label, icon: Icon, suffix, accent }) => (
        <div
          key={key}
          className="flex flex-col gap-1 bg-white px-3 py-3 dark:bg-slate-950 sm:px-4 sm:py-3.5"
        >
          <div className="flex items-center gap-1.5 text-slate-400">
            <Icon className="h-3 w-3" aria-hidden />
            <span className="truncate text-[10px] font-medium uppercase tracking-wider">
              {label}
            </span>
          </div>
          <p
            className={cn(
              'text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl',
              accent
            )}
          >
            <AnimatedCounter value={metrics[key]} suffix={suffix} />
          </p>
        </div>
      ))}
    </section>
  );
};

export default SmartMetricsBar;
