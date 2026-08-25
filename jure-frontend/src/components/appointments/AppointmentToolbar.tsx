import { List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { AppointmentViewMode } from '@/components/appointments/AppointmentList';

const sheetSelectClass =
  'h-9 w-full max-w-none text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';

export type AppointmentFiltersValue = {
  search: string;
  status: string;
  period: string;
  assignedTo: string;
  caseId: string;
  clientId: string;
};

export default function AppointmentToolbar({
  value,
  onChange,
  viewMode,
  onViewModeChange,
}: {
  value: AppointmentFiltersValue;
  onChange: (next: AppointmentFiltersValue) => void;
  viewMode: AppointmentViewMode;
  onViewModeChange: (mode: AppointmentViewMode) => void;
}) {
  const { t } = useAppTranslation();
  const a = t.appointments;
  const patch = (partial: Partial<AppointmentFiltersValue>) => onChange({ ...value, ...partial });
  const personLabel = (c: { first_name?: string; last_name?: string; email?: string }) =>
    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—';

  const extraCount = [
    value.period !== 'upcoming',
    value.status !== 'all',
    value.assignedTo !== 'all',
    value.clientId !== 'all',
    value.caseId !== 'all',
  ].filter(Boolean).length;

  const clearExtra = () =>
    patch({
      status: 'all',
      period: 'upcoming',
      assignedTo: 'all',
      caseId: 'all',
      clientId: 'all',
    });

  const filterControls = () => (
      <>
        <FilterField label={a.filterPeriod}>
        <Select value={value.period} onValueChange={(v) => patch({ period: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.period !== 'all' && value.period !== 'upcoming' && activeSelect)}>
            <SelectValue placeholder={a.filterPeriod} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{a.periodAll}</SelectItem>
            <SelectItem value="today">{a.periodToday}</SelectItem>
            <SelectItem value="week">{a.periodWeek}</SelectItem>
            <SelectItem value="month">{a.periodMonth}</SelectItem>
            <SelectItem value="upcoming">{a.periodUpcoming}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={a.filterStatus}>
        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.status !== 'all' && activeSelect)}>
            <SelectValue placeholder={a.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{a.filterStatus}</SelectItem>
            <SelectItem value="scheduled">{t.calendar.statusScheduled}</SelectItem>
            <SelectItem value="done">{t.calendar.appointmentModal.statusDone}</SelectItem>
            <SelectItem value="cancelled">{t.calendar.appointmentModal.statusCancelled}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={a.filterAssignee}>
        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={a.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={a.filterClient}>
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={a.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.clientId !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={a.filterCase}>
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={a.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.caseId !== 'all' && activeSelect)}
        />
        </FilterField>
      </>
    );

  return (
    <div className="relative rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CompactSearch
          value={value.search}
          onChange={(search) => patch({ search })}
          placeholder={a.searchPlaceholder}
        />

        <MobileFilterSheet
          title={a.filters}
          count={extraCount}
          footer={
            extraCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={clearExtra}>
                {a.clearFilters}
              </Button>
            ) : null
          }
        >
          {filterControls()}
        </MobileFilterSheet>

        <div
          className="ms-auto hidden items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50 sm:inline-flex"
          role="group"
          aria-label={a.aria.viewMode}
        >
          {(['list', 'grid'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                  : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
              )}
              aria-pressed={viewMode === mode}
              aria-label={mode === 'list' ? a.aria.listView : a.aria.gridView}
            >
              {mode === 'list' ? (
                <List className="h-3.5 w-3.5" />
              ) : (
                <LayoutGrid className="h-3.5 w-3.5" />
              )}
              <span className="hidden lg:inline">{mode === 'list' ? a.viewList : a.viewGrid}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
