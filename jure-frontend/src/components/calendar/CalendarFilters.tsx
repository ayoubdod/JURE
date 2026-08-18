import { Search, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import type { CalendarEventTypeFilter } from '@/lib/calendarEvents';

const selectClass = 'h-9 w-[132px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';
const serverSelectClass =
  'h-9 min-w-[140px] max-w-[180px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';

export type CalendarFiltersValue = {
  search: string;
  eventType: CalendarEventTypeFilter;
  status: string;
  priority: string;
  assignedTo: string;
  caseId: string;
  clientId: string;
};

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
  const patch = (partial: Partial<CalendarFiltersValue>) => onChange({ ...value, ...partial });
  const personLabel = (c: { first_name?: string; last_name?: string; email?: string }) =>
    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—';

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={cal.searchPlaceholder}
            value={value.search}
            onChange={(e) => patch({ search: e.target.value })}
            className={cn(
              'h-9 pl-9 pr-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950',
              value.search.trim() !== '' && 'ring-2 ring-primary/25 border-primary/35'
            )}
          />
          {value.search.trim() !== '' && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => patch({ search: '' })}
              aria-label={cal.clearSearch}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Select value={value.eventType} onValueChange={(v) => patch({ eventType: v as CalendarEventTypeFilter })}>
          <SelectTrigger className={cn(selectClass, value.eventType !== 'all' && activeSelect)}>
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

        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(selectClass, 'w-[118px]', value.status !== 'all' && activeSelect)}>
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

        <Select value={value.priority} onValueChange={(v) => patch({ priority: v })}>
          <SelectTrigger className={cn(selectClass, 'w-[108px]', value.priority !== 'all' && activeSelect)}>
            <SelectValue placeholder={cal.filterPriority} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{cal.filterPriority}</SelectItem>
            <SelectItem value="low">{enumLabel('taskPriority', 'low')}</SelectItem>
            <SelectItem value="medium">{enumLabel('taskPriority', 'medium')}</SelectItem>
            <SelectItem value="high">{enumLabel('taskPriority', 'high')}</SelectItem>
          </SelectContent>
        </Select>

        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={cal.filterAssignee}
          searchPlaceholder={cal.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={cal.filterCase}
          searchPlaceholder={cal.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.caseId !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={cal.filterClient}
          searchPlaceholder={cal.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.clientId !== 'all' && activeSelect)}
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg shrink-0"
          onClick={onRefresh}
          disabled={loading}
          aria-label={cal.refresh}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
