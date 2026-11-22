import { AlertCircle, ArrowRight, Banknote, CircleDollarSign, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import type { DashboardFinanceSnapshot } from '@/services/dashboard/api';
import { useAppTranslation } from '@/i18n';
import { formatMAD, parseFormattedMADString } from '@/utils/formatMAD';

type Props = {
  finance: DashboardFinanceSnapshot;
  onOpenFinance: () => void;
};

function toAmount(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return parseFormattedMADString(value) ?? 0;
}

export default function FinanceSnapshot({ finance, onOpenFinance }: Props) {
  const { t, lang } = useAppTranslation();
  const copy = t.dashboard.financeSnapshot;

  const items = [
    {
      key: 'invoiced',
      label: copy.invoiced,
      value: toAmount(finance.invoiced),
      icon: CircleDollarSign,
      accent: 'text-[#64499D]',
    },
    {
      key: 'collected',
      label: copy.collected,
      value: toAmount(finance.collected),
      icon: Wallet,
      accent: 'text-emerald-600',
    },
    {
      key: 'outstanding',
      label: copy.outstanding,
      value: toAmount(finance.outstanding),
      icon: Banknote,
      accent: 'text-amber-600',
    },
    {
      key: 'overdue',
      label: copy.overdue,
      value: toAmount(finance.overdue),
      icon: AlertCircle,
      accent: 'text-rose-600',
    },
  ] as const;

  return (
    <DashboardCollapsibleCard
      title={copy.title}
      description={copy.description}
      defaultOpen
      headerRight={
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onOpenFinance}>
          {copy.openFinance}
          <ArrowRight size={12} className="ms-1.5 rtl:rotate-180" />
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {items.map(({ key, label, value, icon: Icon, accent }) => (
          <div
            key={key}
            className="min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 shrink-0 ${accent}`} aria-hidden />
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                {label}
              </p>
            </div>
            <p className="mt-2 truncate text-base font-semibold tabular-nums text-slate-900 dark:text-white sm:text-lg">
              {formatMAD(value, lang)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{copy.periodNote}</p>
    </DashboardCollapsibleCard>
  );
}
