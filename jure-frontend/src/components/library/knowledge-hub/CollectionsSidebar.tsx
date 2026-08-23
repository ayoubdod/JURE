import React, { useMemo } from 'react';
import {
  BookOpen,
  Briefcase,
  FileSignature,
  Scale,
  Landmark,
  ShieldCheck,
  Building2,
  Sparkles,
  Globe,
  Star,
  Clock,
  FileText,
  Copy,
  Search,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { COLLECTIONS, type CollectionDef } from './knowledgeUtils';
import type { CollectionId } from './types';
import {
  DOCUMENT_CATEGORY_IDS,
  LEGAL_AREA_IDS,
  type DocumentCategoryId,
  type LegalAreaId,
} from '@/lib/libraryTaxonomy';
import { useAppTranslation } from '@/i18n';
import useUserStore from '@/stores/userStore';

const COLLECTION_ICONS: Record<CollectionId, React.ElementType> = {
  all: BookOpen,
  recent: Clock,
  favorites: Star,
  ai_generated: Sparkles,
  public: Globe,
};

const CATEGORY_ICONS: Record<DocumentCategoryId, React.ElementType> = {
  legislation_regulations: Scale,
  case_law_jurisprudence: Landmark,
  contracts_agreements: FileSignature,
  pleadings_proceedings: FileText,
  forms_templates: Copy,
  legal_research_opinions: Search,
  corporate_governance: Building2,
  compliance_policies: ShieldCheck,
  evidence_case_materials: Paperclip,
  training_knowledge: BookOpen,
};

type Props = {
  selectedCollection: CollectionId;
  selectedCategory: DocumentCategoryId | null;
  selectedArea: LegalAreaId | null;
  onSelectCollection: (id: CollectionId) => void;
  onSelectCategory: (id: DocumentCategoryId | null) => void;
  onSelectArea: (id: LegalAreaId | null) => void;
  collectionCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  areaCounts: Record<string, number>;
  collapsed?: boolean;
  className?: string;
};

const CollectionsSidebar: React.FC<Props> = ({
  selectedCollection,
  selectedCategory,
  selectedArea,
  onSelectCollection,
  onSelectCategory,
  onSelectArea,
  collectionCounts,
  categoryCounts,
  areaCounts,
  collapsed = false,
  className,
}) => {
  const { t, dir, enumLabel, tf } = useAppTranslation();
  const jurisdictionName = useUserStore((s) => s.user?.jurisdiction?.name);
  const groups = useMemo(() => {
    const core = COLLECTIONS.filter((c) => c.group === 'core');
    const smart = COLLECTIONS.filter((c) => c.group === 'smart');
    return { core, smart };
  }, []);

  const wrapCollapsed = (button: React.ReactNode, key: string, label: string, count: number) => {
    if (!collapsed) return <React.Fragment key={key}>{button}</React.Fragment>;
    return (
      <Tooltip key={key}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={dir === 'rtl' ? 'left' : 'right'} sideOffset={8}>
          {label}
          <span className="ms-1.5 tabular-nums text-slate-400">{count}</span>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderCollection = (item: CollectionDef) => {
    const Icon = COLLECTION_ICONS[item.id];
    const isSelected = selectedCollection === item.id;
    const count = collectionCounts[item.id] ?? 0;
    const publicLabel = jurisdictionName
      ? `${t.library.publicLibrary} · ${jurisdictionName}`
      : t.library.publicLibrary;
    const label = item.id === 'public' ? publicLabel : item.id === 'all' ? t.library.title : item.label;
    const button = (
      <button
        type="button"
        onClick={() => onSelectCollection(item.id)}
        aria-current={isSelected ? 'page' : undefined}
        aria-label={collapsed ? `${label} (${count})` : undefined}
        className={cn(
          'group flex w-full items-center rounded-lg text-left text-[13px] transition-all duration-150',
          collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-2',
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
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            <span
              className={cn(
                'tabular-nums text-[11px]',
                isSelected ? 'text-[#64499D]/70 dark:text-[#CFC2FF]/70' : 'text-slate-400'
              )}
            >
              {count}
            </span>
          </>
        ) : null}
      </button>
    );
    return wrapCollapsed(button, item.id, label, count);
  };

  const renderCategory = (id: DocumentCategoryId) => {
    const Icon = CATEGORY_ICONS[id];
    const isSelected = selectedCategory === id;
    const count = categoryCounts[id] ?? 0;
    const label = enumLabel('documentCategory', id);
    const description = t.enums.documentCategoryDescription[id];
    const empty = count === 0;
    const button = (
      <button
        type="button"
        onClick={() => onSelectCategory(isSelected ? null : id)}
        aria-pressed={isSelected}
        aria-label={collapsed ? `${label} (${count})` : undefined}
        className={cn(
          'group flex w-full rounded-lg text-left transition-all duration-150',
          collapsed ? 'justify-center px-0 py-2' : 'flex-col gap-0.5 px-2.5 py-2',
          isSelected
            ? 'bg-[#64499D]/10 text-[#64499D] ring-1 ring-[#64499D]/20 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100',
          empty && !isSelected && 'opacity-70'
        )}
      >
        <span className={cn('flex w-full items-center', collapsed ? 'justify-center' : 'gap-2.5')}>
          <Icon
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
            )}
            aria-hidden
          />
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
              <span
                className={cn(
                  'tabular-nums text-[11px]',
                  isSelected ? 'text-[#64499D]/70 dark:text-[#CFC2FF]/70' : 'text-slate-400'
                )}
              >
                {count}
              </span>
            </>
          ) : null}
        </span>
        {!collapsed && isSelected && description ? (
          <span className="ps-6 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            {description}
          </span>
        ) : null}
      </button>
    );

    if (!collapsed) {
      return (
        <Tooltip key={id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={dir === 'rtl' ? 'left' : 'right'} sideOffset={8} className="max-w-56">
            <p className="font-medium">{label}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {tf(t.library.documentsCount, { count })}
            </p>
            {description ? <p className="mt-1 text-[11px] leading-snug">{description}</p> : null}
          </TooltipContent>
        </Tooltip>
      );
    }

    return wrapCollapsed(button, id, label, count);
  };

  const renderArea = (id: LegalAreaId) => {
    const isSelected = selectedArea === id;
    const count = areaCounts[id] ?? 0;
    const label = enumLabel('documentLegalArea', id);
    const button = (
      <button
        type="button"
        onClick={() => onSelectArea(isSelected ? null : id)}
        aria-pressed={isSelected}
        aria-label={collapsed ? `${label} (${count})` : undefined}
        className={cn(
          'group flex w-full items-center rounded-md text-left text-[12.5px] transition-all duration-150',
          collapsed ? 'justify-center px-0 py-1.5' : 'gap-2 px-2.5 py-1.5',
          isSelected
            ? 'bg-slate-800/5 text-slate-900 ring-1 ring-slate-300 dark:bg-white/10 dark:text-slate-100 dark:ring-slate-600'
            : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
        )}
      >
        <Briefcase
          className={cn('h-3 w-3 shrink-0', isSelected ? 'opacity-90' : 'opacity-50')}
          aria-hidden
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
            <span className="tabular-nums text-[11px] text-slate-400">{count}</span>
          </>
        ) : null}
      </button>
    );
    return wrapCollapsed(button, id, label, count);
  };

  const body = (
    <nav aria-label={t.library.collections} className={cn('flex flex-col gap-5', className)}>
      <div>
        {!collapsed ? (
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {t.library.collections}
          </p>
        ) : null}
        <div className="flex flex-col gap-0.5">{groups.core.map(renderCollection)}</div>
      </div>

      <div>
        {!collapsed ? (
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {t.library.categories}
          </p>
        ) : (
          <div className="mx-auto mb-1 h-px w-6 bg-slate-200 dark:bg-slate-800" />
        )}
        <div className="flex flex-col gap-0.5">{DOCUMENT_CATEGORY_IDS.map(renderCategory)}</div>
      </div>

      <div>
        {!collapsed ? (
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {t.library.legalAreas}
          </p>
        ) : (
          <div className="mx-auto mb-1 h-px w-6 bg-slate-200 dark:bg-slate-800" />
        )}
        <div className="flex flex-col gap-px">{LEGAL_AREA_IDS.map(renderArea)}</div>
      </div>

      <div>
        {!collapsed ? (
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Intelligence
          </p>
        ) : (
          <div className="mx-auto mb-1 h-px w-6 bg-slate-200 dark:bg-slate-800" />
        )}
        <div className="flex flex-col gap-0.5">{groups.smart.map(renderCollection)}</div>
      </div>
    </nav>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {body}
    </TooltipProvider>
  );
};

export default CollectionsSidebar;
