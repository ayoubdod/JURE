import React, { useEffect, useRef, useState } from 'react';
import { Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaginationComponent from '@/components/common/Pagination';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet from '@/components/common/MobileFilterSheet';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import '@/pages/Cases.css';

export type WorkspaceKpiItem = {
  key: string;
  label: string;
  value: number;
  accent: string;
  onClick?: () => void;
  active?: boolean;
};

function AnimatedStatValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || value === prevRef.current) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    let frame = 0;
    const start = prevRef.current;
    const diff = value - start;
    const steps = 12;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setDisplay(Math.round(start + (diff * frame) / steps));
      if (frame < steps) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="cases-stat-value tabular-nums">{display}</span>;
}

export interface CaseWorkspaceChromeProps {
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCreate: () => void;
  canCreate: boolean;
  kpis: WorkspaceKpiItem[];
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  renderFilters: () => React.ReactNode;
  isLoading: boolean;
  loadError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyHint: string;
  emptyFiltered: boolean;
  children: React.ReactNode;
  mobileList: React.ReactNode;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  holderRef?: (el: HTMLDivElement | null) => void;
  banner?: React.ReactNode;
  filterFooter?: React.ReactNode;
  filterCount?: number;
  paginationItemLabel?: string;
}

export default function CaseWorkspaceChrome({
  title,
  subtitle,
  ctaLabel,
  onCreate,
  canCreate,
  kpis,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  hasActiveFilters,
  onResetFilters,
  renderFilters,
  isLoading,
  loadError,
  onRetry,
  emptyTitle,
  emptyHint,
  emptyFiltered,
  children,
  mobileList,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  holderRef,
  banner,
  filterFooter,
  filterCount,
  paginationItemLabel,
}: CaseWorkspaceChromeProps) {
  const { t, tf } = useAppTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ws = t.cases.workspaces;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if ((e.key === 'n' || e.key === 'N') && !inField && canCreate && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canCreate, onCreate]);

  const errorState = (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-3">
        <Scale className="w-6 h-6 text-rose-600 dark:text-rose-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.cases.errors.fetchFailed}</p>
      <Button variant="outline" size="sm" className="mt-4 h-8 rounded-md text-[12px]" onClick={onRetry}>
        {t.cases.errors.retry}
      </Button>
    </div>
  );

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-3">
        <Scale className="w-6 h-6 text-slate-500 dark:text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {emptyFiltered ? t.cases.empty.noMatch : emptyTitle}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">
        {emptyFiltered ? t.cases.empty.noMatchHint : emptyHint}
      </p>
      {emptyFiltered ? (
        <Button variant="outline" size="sm" className="mt-4 h-8 rounded-md text-[12px]" onClick={onResetFilters}>
          {t.cases.empty.resetFilters}
        </Button>
      ) : canCreate ? (
        <Button size="sm" className="mt-4 h-8 rounded-md text-[12px]" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div
      ref={holderRef}
      className="relative h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-0 pt-3 pb-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 max-w-2xl">{subtitle}</p>
            </div>
            {canCreate && (
              <Button
                size="sm"
                className="hidden md:inline-flex h-9 px-3 text-[12px] font-semibold shrink-0 rounded-md shadow-sm shadow-primary/15"
                onClick={onCreate}
              >
                <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                {ctaLabel}
              </Button>
            )}
          </div>
        </div>

        <div
          className="cases-kpi-strip flex gap-2 overflow-x-auto snap-x snap-mandatory px-1 sm:px-0 py-2"
          role="region"
          aria-label={t.cases.aria.matterStats}
        >
          {kpis.map((item) => {
            const chipClass = cn(
              'cases-kpi-chip snap-start shrink-0 flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
              'bg-white dark:bg-slate-950 border-l-[3px] px-2.5 py-1.5 min-w-[5.75rem] text-start',
              'sm:flex-1 sm:min-w-0',
              item.accent,
              item.active && 'ring-1 ring-[#64499D]/35 border-[#64499D]/40',
              item.onClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900'
            );
            const body = (
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none">
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white leading-none">
                  <AnimatedStatValue value={item.value} />
                </p>
              </div>
            );
            return item.onClick ? (
              <button key={item.key} type="button" className={chipClass} onClick={item.onClick}>
                {body}
              </button>
            ) : (
              <div key={item.key} className={chipClass}>
                {body}
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            'cases-toolbar-sticky sticky top-0 z-30',
            'bg-slate-50/95 dark:bg-slate-950/95 border-b border-slate-200/90 dark:border-slate-800',
            'px-0 pt-1 pb-0'
          )}
        >
          <div className="rounded-lg border border-slate-200/90 bg-white/95 px-2 py-2 dark:border-slate-800 dark:bg-slate-950/90 sm:px-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CompactSearch
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                ariaLabel={t.cases.searchAria}
                clearAriaLabel={t.cases.clearSearch}
                inputRef={searchInputRef}
              />

              <MobileFilterSheet
                title={ws.filters}
                count={filterCount ?? (hasActiveFilters ? 1 : 0)}
                footer={
                  filterFooter ??
                  (hasActiveFilters ? (
                    <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={onResetFilters}>
                      {t.cases.reset}
                    </Button>
                  ) : null)
                }
              >
                {renderFilters()}
              </MobileFilterSheet>
            </div>
          </div>
        </div>

        <div className="px-0 py-3 md:py-4">
          {loadError ? (
            errorState
          ) : (
            <>
              {banner}
              <div className="md:hidden">{isLoading || totalCount > 0 ? mobileList : emptyState}</div>
              <div className="hidden md:block">
                {isLoading || totalCount > 0 ? children : emptyState}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 px-0">
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={paginationItemLabel}
          pageSizeOptions={[
            { value: '25', label: '25' },
            { value: '20', label: '20 per page' },
            { value: '50', label: '50 per page' },
            { value: '100', label: '100 per page' },
          ]}
        />
      </div>

      {canCreate && (
        <Button
          type="button"
          size="icon"
          className="md:hidden fixed z-40 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] right-4 h-12 w-12 rounded-full shadow-lg shadow-primary/30"
          onClick={onCreate}
          aria-label={ctaLabel}
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </Button>
      )}

      <p className="sr-only" aria-live="polite">
        {isLoading ? t.cases.loadingMatters : tf(t.cases.aria.loadingSummary, { count: totalCount })}
      </p>
    </div>
  );
}
