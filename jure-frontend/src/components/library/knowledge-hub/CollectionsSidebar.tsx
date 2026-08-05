import React, { useMemo } from 'react';
import {
  BookOpen,
  Briefcase,
  FileSignature,
  Scale,
  Users,
  Landmark,
  ShieldCheck,
  Building2,
  Sparkles,
  Share2,
  Star,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLLECTIONS, type CollectionDef } from './knowledgeUtils';
import type { CollectionId, EnrichedDocument } from './types';

const ICONS: Record<CollectionId, React.ElementType> = {
  all: BookOpen,
  law: Building2,
  templates: ShieldCheck,
  contracts: FileSignature,
  research: Landmark,
  legal_forms: Users,
  training: Briefcase,
  evidence: Scale,
  recent: Clock,
  favorites: Star,
  ai_generated: Sparkles,
  shared: Share2,
};

type Props = {
  selected: CollectionId;
  onSelect: (id: CollectionId) => void;
  documents: EnrichedDocument[];
  favorites: number[];
  counts: Record<string, number>;
  className?: string;
};

const CollectionsSidebar: React.FC<Props> = ({
  selected,
  onSelect,
  counts,
  className,
}) => {
  const groups = useMemo(() => {
    const core = COLLECTIONS.filter((c) => c.group === 'core');
    const smart = COLLECTIONS.filter((c) => c.group === 'smart');
    return { core, smart };
  }, []);

  const renderItem = (item: CollectionDef) => {
    const Icon = ICONS[item.id];
    const isSelected = selected === item.id;
    const count = counts[item.id] ?? 0;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isSelected ? 'page' : undefined}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-all duration-150',
          isSelected
            ? 'bg-[#64499D]/10 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
        )}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
        <span
          className={cn(
            'tabular-nums text-[11px]',
            isSelected ? 'text-[#64499D]/70 dark:text-[#CFC2FF]/70' : 'text-slate-400'
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <nav aria-label="Knowledge collections" className={cn('flex flex-col gap-5', className)}>
      <div>
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Collections
        </p>
        <div className="flex flex-col gap-0.5">{groups.core.map(renderItem)}</div>
      </div>
      <div>
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Intelligence
        </p>
        <div className="flex flex-col gap-0.5">{groups.smart.map(renderItem)}</div>
      </div>
    </nav>
  );
};

export default CollectionsSidebar;
