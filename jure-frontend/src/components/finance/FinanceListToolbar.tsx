import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet from '@/components/common/MobileFilterSheet';
import { FinanceViewToggle, type FinanceListView } from '@/components/finance/FinanceViewToggle';
import { useAppTranslation } from '@/i18n';

type Props = {
  search: string;
  onSearchChange: (next: string) => void;
  filterCount: number;
  onReset: () => void;
  view: FinanceListView;
  onViewChange: (next: FinanceListView) => void;
  children: ReactNode;
};

/** Search + view stay visible; extra filters open from a button (sheet on mobile). */
export function FinanceListToolbar({
  search,
  onSearchChange,
  filterCount,
  onReset,
  view,
  onViewChange,
  children,
}: Props) {
  const { t } = useAppTranslation();

  return (
    <div className="w-full min-w-0 px-0 py-1 sm:py-1.5">
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
          <CompactSearch
            value={search}
            onChange={onSearchChange}
            placeholder={t.finance.filters.search}
            ariaLabel={t.finance.filters.search}
          />
          <MobileFilterSheet
            title={t.finance.filters.filter}
            count={filterCount}
            footer={
              filterCount > 0 ? (
                <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={onReset}>
                  {t.finance.filters.reset}
                </Button>
              ) : null
            }
          >
            {children}
          </MobileFilterSheet>
          <span className="ms-auto">
            <FinanceViewToggle value={view} onChange={onViewChange} />
          </span>
        </div>
    </div>
  );
}
