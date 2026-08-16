import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

const selectClass = 'h-9 w-[132px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';
const activeSelect = 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]';
const serverSelectClass =
  'h-9 min-w-[140px] max-w-[180px] text-xs sm:text-[13px] rounded-lg border-slate-200 dark:border-slate-700';

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
}: {
  value: AppointmentFiltersValue;
  onChange: (next: AppointmentFiltersValue) => void;
}) {
  const { t } = useAppTranslation();
  const a = t.appointments;
  const patch = (partial: Partial<AppointmentFiltersValue>) => onChange({ ...value, ...partial });
  const personLabel = (c: { first_name?: string; last_name?: string; email?: string }) =>
    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || '—';

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={a.searchPlaceholder}
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

        <Select value={value.period} onValueChange={(v) => patch({ period: v })}>
          <SelectTrigger className={cn(selectClass, value.period !== 'all' && activeSelect)}>
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

        <Select value={value.status} onValueChange={(v) => patch({ status: v })}>
          <SelectTrigger className={cn(selectClass, 'w-[118px]', value.status !== 'all' && activeSelect)}>
            <SelectValue placeholder={a.filterStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{a.filterStatus}</SelectItem>
            <SelectItem value="scheduled">{t.calendar.statusScheduled}</SelectItem>
            <SelectItem value="done">{t.calendar.appointmentModal.statusDone}</SelectItem>
            <SelectItem value="cancelled">{t.calendar.appointmentModal.statusCancelled}</SelectItem>
          </SelectContent>
        </Select>

        <ServerSelect
          link="/cabinets/members/all/"
          value={value.assignedTo || undefined}
          onChange={(v) => patch({ assignedTo: v != null ? String(v) : 'all' })}
          placeholder={a.filterAssignee}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.assignedTo !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/clients/clients/?page_size=100"
          value={value.clientId || undefined}
          onChange={(v) => patch({ clientId: v != null ? String(v) : 'all' })}
          placeholder={a.filterClient}
          labelKey={personLabel}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.clientId !== 'all' && activeSelect)}
        />
        <ServerSelect
          link="/cases/?page_size=100"
          value={value.caseId || undefined}
          onChange={(v) => patch({ caseId: v != null ? String(v) : 'all' })}
          placeholder={a.filterCase}
          labelKey={(c: { title?: string; reference?: string }) => c.reference || c.title || '—'}
          valueKey="id"
          cleanable
          className={cn(serverSelectClass, value.caseId !== 'all' && activeSelect)}
        />
      </div>
    </div>
  );
}
