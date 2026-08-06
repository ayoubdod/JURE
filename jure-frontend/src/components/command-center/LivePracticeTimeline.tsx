import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, Briefcase, Building2, Gavel, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from './types';

type Props = {
  events: TimelineEvent[];
  className?: string;
};

const kindMeta: Record<
  TimelineEvent['kind'],
  { icon: React.ElementType; ring: string; label: string }
> = {
  ai: { icon: Brain, ring: 'bg-[#64499D]/10 text-[#64499D] ring-[#64499D]/25', label: 'AI' },
  matter: { icon: Briefcase, ring: 'bg-sky-500/10 text-sky-700 ring-sky-500/20', label: 'Matter' },
  client: { icon: User, ring: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20', label: 'Client' },
  court: { icon: Gavel, ring: 'bg-rose-500/10 text-rose-700 ring-rose-500/20', label: 'Court' },
  system: { icon: Building2, ring: 'bg-slate-500/10 text-slate-600 ring-slate-500/20', label: 'System' },
};

const LivePracticeTimeline = memo(function LivePracticeTimeline({ events, className }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Live Practice Timeline"
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
            Live Practice Timeline
          </h2>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400">Chronological · interactive</p>
      </div>

      <ol className="relative flex-1 space-y-0 overflow-y-auto px-4 py-3">
        <div
          aria-hidden
          className="absolute bottom-4 left-[27px] top-4 w-px bg-gradient-to-b from-[#64499D]/40 via-slate-200 to-transparent dark:via-slate-800"
        />
        {!events.length && (
          <li className="py-8 text-center text-[12px] text-slate-400">No timeline events yet.</li>
        )}
        {events.map((ev, i) => {
          const meta = kindMeta[ev.kind];
          const Icon = meta.icon;
          return (
            <motion.li
              key={ev.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
              className="relative grid grid-cols-[52px_28px_1fr] gap-2 py-2.5"
            >
              <time className="pt-1 text-right font-mono text-[11px] tabular-nums text-slate-400">
                {ev.time}
              </time>
              <div className="relative z-[1] flex justify-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full ring-1',
                    meta.ring
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
              </div>
              <button
                type="button"
                className="rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/60"
              >
                <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50">
                  {ev.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                  {ev.detail}
                </p>
                <span className="mt-1 inline-block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {meta.label}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
});

export default LivePracticeTimeline;
