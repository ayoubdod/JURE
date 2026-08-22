import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { CalendarEventTypeFilter } from '@/lib/calendarEvents';

const sheetSelectClass =
  'h-9 w-full max-w-none text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';

export type CalendarFiltersValue = {
  search: string;
  eventType: CalendarEventTypeFilter;
  status: string;
  priority: string;
  assignedTo: string;
  caseId: string;
  clientId: string;
};

function extraFilterCount(value: CalendarFiltersValue) {
  return [
    value.eventType !== 'all',
    value.status !== 'all',
    value.priority !== 'all',
    value.assignedTo !== 'all',
    value.caseId !== 'all',
    value.clientId !== 'all',
  ].filter(Boolean).length;
}

export default function CalendarFilters({
  value,
  onChange,
  loading,
  onRefresh,
}: {
  value: CalendarFiltersValue;
  onChange: (next: CalendarFiltersValue) => void;
  loading?: boolean;
  onRefresh: () => void;
}) {
  const { t, enumLabel } = useAppTranslation();
  const cal = t.calendar;
  const extraCount = extraFilterCount(value);
  const patch = (partial: Partial<CalendarFiltersValue>) => onChange({ ...value, ...partial });
  const personLabel = (c: { first_name?: string; last_name?: string; email?: string }) =>
    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—';

  const filterControls = () => (
      <>
        <FilterField label={cal.filterEventType}>
        <Select value={value.eventType} onValueChange={(v) => patch({ eventType: v as CalendarEventTypeFilter })}>
          <SelectTrigger className={cn(sheetSelectClass, value.eventType !== 'all' && activeSelect)}>
            <SelectValue placeholder={cal.filterEventType} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{cal.filterAll}</SelectItem>
            <SelectItem value="tasks">{cal.filterTasks}</SelectItem>
            <SelectItem value="appointments">{cal.filterAppointments}</SelectItem>
            <SelectItem value="hearings">{cal.filterHearings}</SelectItem>
            <SelectItem value="deadlines">{cal.filterDeadlines}</SelectItem>
            <SelectItem value="consultations">{cal.filterConsultations}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={cal.filterStatus}>
        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.status !== 'all' && activeSelect)}>
            <SelectValue placeholder={cal.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{cal.filterStatus}</SelectItem>
            <SelectItem value="todo">{enumLabel('taskStatus', 'todo')}</SelectItem>
            <SelectItem value="in_progress">{enumLabel('taskStatus', 'in_progress')}</SelectItem>
            <SelectItem value="done">{enumLabel('taskStatus', 'done')}</SelectItem>
            <SelectItem value="cancelled">{enumLabel('taskStatus', 'cancelled')}</SelectItem>
            <SelectItem value="scheduled">{cal.statusScheduled}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={cal.filterPriority}>
        <Select value={value.priority} onValueChange={(v) => patch({ priority: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.priority !== 'all' && activeSelect)}>
            <SelectValue placeholder={cal.filterPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{cal.filterPriority}</SelectItem>
            <SelectItem value="low">{enumLabel('taskPriority', 'low')}</SelectItem>
            <SelectItem value="medium">{enumLabel('taskPriority', 'medium')}</SelectItem>
            <SelectItem value="high">{enumLabel('taskPriority', 'high')}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={cal.filterAssignee}>
        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={cal.filterAssignee}
          searchPlaceholder={cal.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={cal.filterCase}>
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={cal.filterCase}
          searchPlaceholder={cal.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.caseId !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={cal.filterClient}>
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={cal.filterClient}
          searchPlaceholder={cal.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.clientId !== 'all' && activeSelect)}
        />
        </FilterField>
      </>
    );

  const refreshButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-lg"
      onClick={onRefresh}
      disabled={loading}
      aria-label={cal.refresh}
    >
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
    </Button>
  );

  return (
    <div className="relative rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CompactSearch
          value={value.search}
          onChange={(search) => patch({ search })}
          placeholder={cal.searchPlaceholder}
          clearAriaLabel={cal.clearSearch}
        />
        <MobileFilterSheet
          title={t.common.filter}
          count={extraCount}
          footer={
            extraCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full text-[12px]"
                onClick={() =>
                  onChange({
                    ...value,
                    eventType: 'all',
                    status: 'all',
                    priority: 'all',
                    assignedTo: 'all',
                    caseId: 'all',
                    clientId: 'all',
                  })
                }
              >
                {t.common.clearFilters}
              </Button>
            ) : null
          }
        >
          {filterControls()}
        </MobileFilterSheet>
        {refreshButton}
      </div>
    </div>
  );
}
