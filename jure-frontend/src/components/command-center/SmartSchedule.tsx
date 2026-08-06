import React, { memo } from 'react';
import { Clock, FileText, MapPin, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleItem } from './types';

type Props = {
  items: ScheduleItem[];
  className?: string;
};

const typeTone: Record<ScheduleItem['type'], string> = {
  Meeting: 'text-sky-700 bg-sky-500/10',
  Court: 'text-rose-700 bg-rose-500/10',
  Call: 'text-emerald-700 bg-emerald-500/10',
  Deadline: 'text-amber-800 bg-amber-500/10',
  Reminder: 'text-slate-600 bg-slate-500/10',
};

const SmartSchedule = memo(function SmartSchedule({ items, className }: Props) {
  return (
    <section
      aria-label="Today's Schedule"
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
          Today&apos;s Schedule
        </h2>
        <p className="text-[10px] text-slate-400">Meetings · court · calls · deadlines</p>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <time className="font-mono text-[11px] tabular-nums text-slate-500">{item.time}</time>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      typeTone[item.type]
                    )}
                  >
                    {item.type}
                  </span>
                </div>
                <p className="text-[12.5px] font-medium text-slate-900 dark:text-slate-50">
                  {item.title}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
              {item.prepMinutes != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Prep {item.prepMinutes}m
                </span>
              )}
              {item.travelMinutes != null && item.travelMinutes > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" /> Travel {item.travelMinutes}m
                </span>
              )}
              {item.suggestedDoc && (
                <span className="inline-flex items-center gap-1 text-[#64499D] dark:text-[#CFC2FF]">
                  <FileText className="h-2.5 w-2.5" /> {item.suggestedDoc}
                </span>
              )}
              {item.aiDelay && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <Plane className="h-2.5 w-2.5" /> {item.aiDelay}
                </span>
              )}
            </div>
          </li>
        ))}
        {!items.length && (
          <li className="py-8 text-center text-[12px] text-slate-400">Schedule clear for today.</li>
        )}
      </ul>
    </section>
  );
});

export default SmartSchedule;
