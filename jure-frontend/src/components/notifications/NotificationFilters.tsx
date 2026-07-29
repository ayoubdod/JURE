import React from 'react';
import { cn } from '@/lib/utils';
import type { NotificationFilterId } from '@/types/notification';

const DROPDOWN_FILTERS: { id: NotificationFilterId; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'unread', label: 'Non lus' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'cases', label: 'Dossiers' },
  { id: 'tasks', label: 'Tâches' },
  { id: 'appointments', label: 'Rendez-vous' },
  { id: 'finance', label: 'Finance' },
  { id: 'team', label: 'Équipe' },
];

const PAGE_FILTERS: { id: NotificationFilterId; label: string }[] = [
  ...DROPDOWN_FILTERS,
  { id: 'messages', label: 'Messages' },
];

export interface NotificationFiltersProps {
  value: NotificationFilterId;
  onChange: (f: NotificationFilterId) => void;
  variant: 'dropdown' | 'page';
  className?: string;
}

export function NotificationFilters({ value, onChange, variant, className }: NotificationFiltersProps) {
  const items = variant === 'page' ? PAGE_FILTERS : DROPDOWN_FILTERS;
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 scrollbar-thin',
        variant === 'dropdown' ? 'px-3 pt-2' : 'flex-wrap',
        className
      )}
    >
      {items.map((pill) => {
        const active = value === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => onChange(pill.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
            )}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
