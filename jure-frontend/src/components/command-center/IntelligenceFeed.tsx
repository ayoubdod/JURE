import React, { memo } from 'react';
import { AlertTriangle, Briefcase, Calendar, FileStack, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedItem } from './types';

type Props = {
  items: FeedItem[];
  className?: string;
};

const kindIcon: Record<FeedItem['kind'], React.ElementType> = {
  ai: AlertTriangle,
  matter: Briefcase,
  client: User,
  deadline: Calendar,
  knowledge: FileStack,
};

const kindTone: Record<FeedItem['kind'], string> = {
  ai: 'bg-[#64499D]/10 text-[#64499D]',
  matter: 'bg-sky-500/10 text-sky-700',
  client: 'bg-emerald-500/10 text-emerald-700',
  deadline: 'bg-amber-500/10 text-amber-800',
  knowledge: 'bg-slate-500/10 text-slate-600',
};

const IntelligenceFeed = memo(function IntelligenceFeed({ items, className }: Props) {
  return (
    <section
      aria-label="Legal Intelligence Feed"
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950',
        className
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
          Legal Intelligence Feed
        </h2>
        <p className="text-[10px] text-slate-400">Contextual practice signals</p>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => {
          const Icon = kindIcon[item.kind];
          return (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  kindTone[item.kind]
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-snug text-slate-800 dark:text-slate-100">
                  {item.message}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">{item.ago}</p>
              </div>
            </li>
          );
        })}
        {!items.length && (
          <li className="p-6 text-center text-[12px] text-slate-400">Feed quiet.</li>
        )}
      </ul>
    </section>
  );
});

export default IntelligenceFeed;
