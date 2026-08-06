import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelligenceBullet } from './types';
import { getGreeting } from './commandCenterUtils';

type Props = {
  firstName?: string;
  bullets: IntelligenceBullet[];
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
};

const toneDot: Record<IntelligenceBullet['tone'], string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  positive: 'bg-emerald-500',
};

const MissionControlHeader = memo(function MissionControlHeader({
  firstName,
  bullets,
  loading,
  onRefresh,
  refreshing,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const greeting = getGreeting();

  return (
    <header
      className={cn(
        'relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80',
        'bg-gradient-to-br from-white via-[#F8F6FC] to-[#F4F1FF]/50',
        'dark:from-slate-950 dark:via-[#14101f] dark:to-slate-950',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 90% -10%, rgba(100,73,157,0.16), transparent 55%), radial-gradient(ellipse 40% 35% at 0% 100%, rgba(100,73,157,0.06), transparent 50%)',
        }}
      />
      <div className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="min-w-0"
          >
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[#64499D]/15 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#64499D] backdrop-blur-sm dark:border-[#8B6FD1]/25 dark:bg-white/5 dark:text-[#CFC2FF]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Mission Control
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[28px]">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              AI analyzed your practice overnight.
            </p>
          </motion.div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200/90 bg-white/80 px-3 text-[12px] font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-[#64499D]/30 hover:text-[#64499D] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh Analysis
            </button>
          )}
        </div>

        <section aria-label="Today's Intelligence Summary" className="mt-5">
          <h2 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Today&apos;s Intelligence Summary
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {(loading ? Array.from({ length: 4 }) : bullets).map((b, i) =>
              loading || !b ? (
                <li
                  key={i}
                  className="h-9 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800"
                />
              ) : (
                <motion.li
                  key={b.id}
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-[12.5px] leading-snug text-slate-700 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                >
                  <span
                    className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', toneDot[b.tone])}
                    aria-hidden
                  />
                  <span>{b.text}</span>
                </motion.li>
              )
            )}
          </ul>
        </section>
      </div>
    </header>
  );
});

export function AnimatedCounter({
  value,
  suffix = '',
}: {
  value: number | string;
  suffix?: string;
}) {
  const numeric = typeof value === 'number' ? value : Number(value);
  const isNum = Number.isFinite(numeric);
  const [display, setDisplay] = useState(isNum ? 0 : value);
  const prev = useRef(0);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isNum) {
      setDisplay(value);
      return;
    }
    if (reduced) {
      setDisplay(numeric);
      prev.current = numeric;
      return;
    }
    const from = prev.current;
    const to = numeric;
    const start = performance.now();
    const duration = 650;
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
  }, [value, numeric, isNum, reduced]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export default MissionControlHeader;
