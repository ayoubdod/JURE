import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  FolderX,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardKpiEntry, DashboardOverview } from '@/services/dashboard/api';
import { formatNumber, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type Props = {
  kpis: NonNullable<DashboardOverview['kpis']> | null | undefined;
  loading?: boolean;
};

type KpiKey =
  | 'active_cases'
  | 'cases_opened_mtd'
  | 'cases_closed_mtd'
  | 'tasks_due_today'
  | 'tasks_overdue'
  | 'upcoming_deadlines_7d'
  | 'active_clients'
  | 'wip_aging_gt_60';

type KpiDef = {
  key: KpiKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  iconAccent: string;
};

function changeTone(state: string | undefined) {
  if (state === 'down') return 'text-rose-600 dark:text-rose-400';
  if (state === 'up') return 'text-emerald-600 dark:text-emerald-400';
  return 'text-muted-foreground';
}

function asKpi(entry: unknown): DashboardKpiEntry | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  if (!('value' in entry)) return undefined;
  return entry as DashboardKpiEntry;
}

export default function KpiOverview({ kpis, loading }: Props) {
  const { t, tf, lang } = useAppTranslation();
  const d = t.dashboard;
  const labels = d.kpis;

  const defs: KpiDef[] = [
    {
      key: 'active_cases',
      label: labels.activeCases,
      hint: labels.activeCasesHint,
      icon: Briefcase,
      iconAccent: 'text-emerald-600',
    },
    {
      key: 'cases_opened_mtd',
      label: labels.casesOpenedMtd,
      hint: labels.casesOpenedMtdHint,
      icon: FolderOpen,
      iconAccent: 'text-[#64499D]',
    },
    {
      key: 'cases_closed_mtd',
      label: labels.casesClosedMtd,
      hint: labels.casesClosedMtdHint,
      icon: FolderX,
      iconAccent: 'text-slate-500',
    },
    {
      key: 'tasks_due_today',
      label: labels.tasksDueToday,
      hint: labels.tasksDueTodayHint,
      icon: CheckSquare,
      iconAccent: 'text-amber-500',
    },
    {
      key: 'tasks_overdue',
      label: labels.tasksOverdue,
      hint: labels.tasksOverdueHint,
      icon: AlertTriangle,
      iconAccent: 'text-rose-600',
    },
    {
      key: 'upcoming_deadlines_7d',
      label: labels.upcomingDeadlines7d,
      hint: labels.upcomingDeadlines7dHint,
      icon: CalendarDays,
      iconAccent: 'text-[#4D3680]',
    },
    {
      key: 'active_clients',
      label: labels.activeClients,
      hint: labels.activeClientsHint,
      icon: Users,
      iconAccent: 'text-slate-500',
    },
    {
      key: 'wip_aging_gt_60',
      label: labels.wipAgingGt60,
      hint: labels.wipAgingGt60Hint,
      icon: AlertTriangle,
      iconAccent: 'text-amber-600',
    },
  ];

  const renderChange = (entry: DashboardKpiEntry | undefined, key: KpiKey) => {
    if (loading || !entry) return '';
    if (key === 'wip_aging_gt_60') return labels.wipAgingGt60Hint;
    const state = entry.change_state;
    if (state === 'no_previous_data' || entry.change == null) {
      if (
        key === 'cases_opened_mtd' ||
        key === 'cases_closed_mtd' ||
        key === 'upcoming_deadlines_7d' ||
        key === 'tasks_overdue'
      ) {
        return '';
      }
      return d.noPreviousData;
    }
    const arrow = state === 'down' ? '↓ ' : state === 'up' ? '↑ ' : '';
    if (key === 'active_cases') {
      return tf(labels.activeCasesChange, { change: `${arrow}${entry.change}` });
    }
    if (key === 'tasks_due_today') {
      return tf(labels.tasksDueChange, { change: `${arrow}${entry.change}` });
    }
    return tf(d.fromLastMonth, { change: `${arrow}${entry.change}` });
  };

  return (
    <section
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8"
      role="region"
      aria-label={labels.regionAria}
    >
      {defs.map(({ key, label, hint, icon: Icon, iconAccent }) => {
        const kpi = asKpi(kpis?.[key]);
        const value =
          loading || !kpi ? '—' : formatNumber(Number(kpi.value), lang);
        const changeLabel = renderChange(kpi, key);

        return (
          <div
            key={key}
            className="min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950"
            title={hint}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900">
                <Icon className={cn('h-3.5 w-3.5', iconAccent)} aria-hidden />
              </span>
            </div>
            <p className="mt-2 text-[22px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white sm:text-[24px]">
              {value}
            </p>
            <p className={cn('mt-1.5 line-clamp-2 text-[11px] leading-snug', changeTone(kpi?.change_state))}>
              {loading ? '' : changeLabel || hint}
            </p>
          </div>
        );
      })}
    </section>
  );
}
