import { Search, X, List, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

const selectClass = 'h-9 w-[128px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';
const serverSelectClass =
  'h-9 min-w-[140px] max-w-[180px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';

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

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t.tasks.searchPlaceholder}
            value={value.search}
            onChange={(e) => patch({ search: e.target.value })}
            className={cn(
              'h-9 pl-9 pr-9 text-sm rounded-lg border-slate-200 dark:border-slate-700',
              value.search.trim() && 'ring-2 ring-primary/25 border-primary/35'
            )}
          />
          {value.search.trim() && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => patch({ search: '' })}
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(selectClass, value.status !== 'all' && activeSelect)}>
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

        <Select value={value.priority} onValueChange={(v) => patch({ priority: v })}>
          <SelectTrigger className={cn(selectClass, 'w-[118px]', value.priority !== 'all' && activeSelect)}>
            <SelectValue placeholder={t.tasks.filterPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.tasks.filterPriority}</SelectItem>
            <SelectItem value="low">{enumLabel('taskPriority', 'low')}</SelectItem>
            <SelectItem value="medium">{enumLabel('taskPriority', 'medium')}</SelectItem>
            <SelectItem value="high">{enumLabel('taskPriority', 'high')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.due} onValueChange={(v) => patch({ due: v })}>
          <SelectTrigger className={cn(selectClass, value.due !== 'all' && activeSelect)}>
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

        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.caseId !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={t.tasks.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.clientId !== 'all' && activeSelect)}
        />

        <div className="ms-auto inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-md', viewMode === 'list' && 'bg-white dark:bg-slate-800 shadow-sm')}
            onClick={() => onViewModeChange('list')}
            aria-label={t.tasks.viewList}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-md', viewMode === 'board' && 'bg-white dark:bg-slate-800 shadow-sm')}
            onClick={() => onViewModeChange('board')}
            aria-label={t.tasks.viewBoard}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
