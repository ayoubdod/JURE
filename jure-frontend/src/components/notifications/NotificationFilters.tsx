import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { NotificationFilterId } from '@/types/notification';
import { useAppTranslation } from '@/i18n';

export interface NotificationFiltersProps {
  value: NotificationFilterId;
  onChange: (f: NotificationFilterId) => void;
  variant: 'dropdown' | 'page';
  className?: string;
}

export function NotificationFilters({
  value,
  onChange,
  variant,
  className,
}: NotificationFiltersProps) {
  const { t } = useAppTranslation();
  const f = t.notifications.filters;

  const primary = useMemo(
    () =>
      [
        { id: 'all' as const, label: f.all },
        { id: 'unread' as const, label: f.unread },
        { id: 'cases' as const, label: f.cases },
        { id: 'messages' as const, label: f.messages },
      ],
    [f.all, f.unread, f.cases, f.messages]
  );

  const more = useMemo(
    () =>
      [
        { id: 'tasks' as const, label: f.tasks },
        { id: 'appointments' as const, label: f.appointments },
        { id: 'finance' as const, label: f.finance },
        { id: 'team' as const, label: f.team },
        { id: 'urgent' as const, label: f.urgent },
      ],
    [f.tasks, f.appointments, f.finance, f.team, f.urgent]
  );

  const items = useMemo(
    () => (variant === 'page' ? [...primary, ...more] : [...primary, ...more]),
    [variant, primary, more]
  );
  const primaryPills = variant === 'dropdown' ? primary : items.slice(0, 5);
  const overflow = variant === 'dropdown' ? more : items.slice(5);
  const overflowActive = overflow.some((i) => i.id === value);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="tablist"
        aria-label={t.notifications.filtersAria}
        className={cn(
          'flex gap-1 rounded-lg bg-slate-100/90 p-1 dark:bg-slate-800/80',
          'overflow-x-auto scrollbar-none [direction:inherit]',
        )}
      >
        {primaryPills.map((pill) => {
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
