import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { NotificationFilterId } from '@/types/notification';

const PRIMARY: { id: NotificationFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'cases', label: 'Cases' },
  { id: 'messages', label: 'Messages' },
];

const MORE: { id: NotificationFilterId; label: string }[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'appointments', label: 'Calendar' },
  { id: 'finance', label: 'Finance' },
  { id: 'team', label: 'Team' },
  { id: 'urgent', label: 'Urgent' },
];

const PAGE_EXTRA: { id: NotificationFilterId; label: string }[] = [
  ...PRIMARY,
  ...MORE,
];

export interface NotificationFiltersProps {
  value: NotificationFilterId;
  onChange: (f: NotificationFilterId) => void;
  variant: 'dropdown' | 'page';
  className?: string;
}

export function NotificationFilters({ value, onChange, variant, className }: NotificationFiltersProps) {
  const items = useMemo(() => (variant === 'page' ? PAGE_EXTRA : [...PRIMARY, ...MORE]), [variant]);
  const primary = variant === 'dropdown' ? PRIMARY : items.slice(0, 5);
  const overflow = variant === 'dropdown' ? MORE : items.slice(5);
  const overflowActive = overflow.some((i) => i.id === value);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="tablist"
        aria-label="Notification filters"
        className={cn(
          'flex gap-1 rounded-lg bg-slate-100/90 p-1 dark:bg-slate-800/80',
          'overflow-x-auto scrollbar-none'
        )}
      >
        {primary.map((pill) => {
          const active = value === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(pill.id)}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                active
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
      {overflow.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-0.5">
          {overflow.map((pill) => {
            const active = value === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onChange(pill.id)}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  active || (overflowActive && active)
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800'
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
