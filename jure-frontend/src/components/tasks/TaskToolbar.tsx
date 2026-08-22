import { List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

const sheetSelectClass =
  'h-9 w-full max-w-none text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';

export type TaskFiltersValue = {
  search: string;
  status: string;
  priority: string;
  assignedTo: string;
  caseId: string;
  clientId: string;
  due: string;
};

export type TaskViewMode = 'list' | 'board';

export default function TaskToolbar({
  value,
  onChange,
  viewMode,
  onViewModeChange,
}: {
  value: TaskFiltersValue;
  onChange: (next: TaskFiltersValue) => void;
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
}) {
  const { t, enumLabel } = useAppTranslation();
  const patch = (partial: Partial<TaskFiltersValue>) => onChange({ ...value, ...partial });
  const personLabel = (c: { first_name?: string; last_name?: string; email?: string }) =>
    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—';

  const extraCount = [
    value.status !== 'all',
    value.priority !== 'all',
    value.due !== 'all',
    value.assignedTo !== 'all',
    value.caseId !== 'all',
    value.clientId !== 'all',
  ].filter(Boolean).length;

  const filterControls = () => (
      <>
        <FilterField label={t.common.status}>
        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.status !== 'all' && activeSelect)}>
            <SelectValue placeholder={t.tasks.filterByStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.status}</SelectItem>
            <SelectItem value="todo">{enumLabel('taskStatus', 'todo')}</SelectItem>
            <SelectItem value="in_progress">{enumLabel('taskStatus', 'in_progress')}</SelectItem>
            <SelectItem value="done">{enumLabel('taskStatus', 'done')}</SelectItem>
            <SelectItem value="cancelled">{enumLabel('taskStatus', 'cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={t.tasks.filterPriority}>
        <Select value={value.priority} onValueChange={(v) => patch({ priority: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.priority !== 'all' && activeSelect)}>
            <SelectValue placeholder={t.tasks.filterPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.filterPriority}</SelectItem>
            <SelectItem value="low">{enumLabel('taskPriority', 'low')}</SelectItem>
            <SelectItem value="medium">{enumLabel('taskPriority', 'medium')}</SelectItem>
            <SelectItem value="high">{enumLabel('taskPriority', 'high')}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={t.tasks.filterDue}>
        <Select value={value.due} onValueChange={(v) => patch({ due: v })}>
          <SelectTrigger className={cn(sheetSelectClass, value.due !== 'all' && activeSelect)}>
            <SelectValue placeholder={t.tasks.filterDue} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.dueAll}</SelectItem>
            <SelectItem value="overdue">{t.tasks.dueOverdue}</SelectItem>
            <SelectItem value="today">{t.tasks.dueToday}</SelectItem>
            <SelectItem value="week">{t.tasks.dueWeek}</SelectItem>
            <SelectItem value="month">{t.tasks.dueMonth}</SelectItem>
            <SelectItem value="none">{t.tasks.dueNone}</SelectItem>
          </SelectContent>
        </Select>
        </FilterField>

        <FilterField label={t.tasks.filterAssignee}>
        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={t.tasks.filterCase}>
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.caseId !== 'all' && activeSelect)}
        />
        </FilterField>
        <FilterField label={t.tasks.filterClient}>
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(sheetSelectClass, value.clientId !== 'all' && activeSelect)}
        />
        </FilterField>
      </>
    );

  const viewToggle = (
    <div className="ms-auto inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-md', viewMode === 'list' && 'bg-white shadow-sm dark:bg-slate-800')}
        onClick={() => onViewModeChange('list')}
        aria-label={t.tasks.viewList}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-md', viewMode === 'board' && 'bg-white shadow-sm dark:bg-slate-800')}
        onClick={() => onViewModeChange('board')}
        aria-label={t.tasks.viewBoard}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="relative rounded-xl border border-slate-200/90 bg-white/90 px-2.5 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950/80 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CompactSearch
          value={value.search}
          onChange={(search) => patch({ search })}
          placeholder={t.tasks.searchPlaceholder}
        />
        <MobileFilterSheet
          title={t.tasks.filters}
          count={extraCount}
          footer={
            extraCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-full text-[12px]"
                onClick={() =>
                  patch({
                    status: 'all',
                    priority: 'all',
                    due: 'all',
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
        {viewToggle}
      </div>
    </div>
  );
}
