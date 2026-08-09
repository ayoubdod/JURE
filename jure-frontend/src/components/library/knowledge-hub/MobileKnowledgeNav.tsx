import React from 'react';
import { BookOpen, Brain, LayoutGrid, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

type Tab = 'browse' | 'search' | 'ai' | 'upload';

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  className?: string;
};

const MobileKnowledgeNav: React.FC<Props> = ({ active, onChange, className }) => {
  const { t } = useAppTranslation();
  const items: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'browse', label: t.library.mobile.browse, icon: LayoutGrid },
    { id: 'search', label: t.library.mobile.ask, icon: Search },
    { id: 'ai', label: t.library.mobile.copilot, icon: Brain },
    { id: 'upload', label: t.library.mobile.upload, icon: Plus },
  ];

  return (
    <nav
      aria-label={t.library.mobile.aria}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 md:hidden',
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
        {items.map(({ id, label, icon: Icon }) => {
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
              {id === 'browse' ? (
                <BookOpen className="h-4 w-4" aria-hidden />
              ) : (
                <Icon className="h-4 w-4" aria-hidden />
              )}
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileKnowledgeNav;
export type { Tab as MobileKnowledgeTab };
