import React from 'react';
import { LayoutDashboard, ListOrdered, Activity, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MobileCommandTab } from './types';

type Props = {
  active: MobileCommandTab;
  onChange: (tab: MobileCommandTab) => void;
  className?: string;
};

const ITEMS: { id: MobileCommandTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'priorities', label: 'Priorities', icon: ListOrdered },
  { id: 'timeline', label: 'Timeline', icon: Activity },
  { id: 'ai', label: 'JURIA', icon: Brain },
];

const MobileCommandNav: React.FC<Props> = ({ active, onChange, className }) => {
  return (
    <nav
      aria-label="Mission Control mobile"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden',
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex min-h-11 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'bg-[#64499D]/10 text-[#64499D] dark:text-[#CFC2FF]'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileCommandNav;
