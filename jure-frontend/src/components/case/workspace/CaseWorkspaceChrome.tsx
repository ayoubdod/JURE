import React, { useEffect, useRef } from 'react';
import { Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaginationComponent from '@/components/common/Pagination';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet from '@/components/common/MobileFilterSheet';
import { useAppTranslation } from '@/i18n';
import {
  WorkspaceKpiStrip,
  WorkspacePageHeader,
  type WorkspaceKpiItem,
} from '@/components/workspace/WorkspaceChrome';

const JURE_PURPLE = '#64499D';

export type { WorkspaceKpiItem };

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
        <Button
          size="sm"
          className="mt-4 h-8 text-[12px] text-white hover:opacity-90"
          style={{ backgroundColor: JURE_PURPLE }}
          onClick={onCreate}
        >
          <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div
      ref={holderRef}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader
            title={title}
            subtitle={subtitle}
            actions={
              canCreate ? (
                <Button
                  size="sm"
                  className="hidden h-9 shrink-0 px-3 text-[13px] font-semibold text-white hover:opacity-90 md:inline-flex"
                  style={{ backgroundColor: JURE_PURPLE }}
                  onClick={onCreate}
                >
                  <Plus className="me-1.5 h-4 w-4" strokeWidth={2.5} />
                  {ctaLabel}
                </Button>
              ) : undefined
            }
          />

          <WorkspaceKpiStrip items={kpis} ariaLabel={t.cases.aria.matterStats} />

          <div className="sticky top-0 z-30 mt-5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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

          <div className="mt-4 pb-4">
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
      </div>

      <div className="shrink-0 px-4 sm:px-5 lg:px-6">
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
          className="fixed z-40 h-12 w-12 rounded-full text-white shadow-lg md:hidden bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] end-4"
          style={{ backgroundColor: JURE_PURPLE }}
          onClick={onCreate}
          aria-label={ctaLabel}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      )}

      <p className="sr-only" aria-live="polite">
        {isLoading ? t.cases.loadingMatters : tf(t.cases.aria.loadingSummary, { count: totalCount })}
      </p>
    </div>
  );
}
