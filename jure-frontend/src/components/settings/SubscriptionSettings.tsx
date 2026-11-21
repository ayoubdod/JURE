import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import {
  cancelSubscription,
  changeSubscriptionPlan,
  fetchCurrentSubscription,
  fetchPublicPlans,
  type CurrentSubscription,
  type PublicPlan,
} from '@/services/billing/api';

const formatBytes = (value: number | null) => {
  if (value == null) return '—';
  if (value <= 0) return '0 MB';
  const gb = value / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(value / (1024 ** 2)))} MB`;
};

const formatWhen = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const SubscriptionSettings: React.FC = () => {
  const { t, tf } = useAppTranslation();
  const b = t.settings.billing;
  const { toast } = useToast();
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    return Promise.all([fetchCurrentSubscription(), fetchPublicPlans()])
      .then(([subscriptionResponse, catalogue]) => {
        const body = subscriptionResponse.data;
        if (body && 'plan' in body) {
          setCurrent(body);
          setCycle(body.billing_cycle);
        } else {
          setCurrent(null);
        }
        setPlans(catalogue.plans.filter((plan) => plan.is_self_serve));
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  const onChange = async (planCode: string) => {
    setBusy(true);
    try {
      const response = await changeSubscriptionPlan(planCode, cycle);
      const paymentRequired = Boolean((response.data as { payment_required?: boolean }).payment_required);
      toast({
        title: paymentRequired ? b.paymentPending : b.change,
        description: paymentRequired ? b.paymentPendingBody : b.manageHint,
      });
      await load();
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      toast({
        title: b.loadError,
        description: typeof detail === 'string' ? detail : b.loadError,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    setBusy(true);
    try {
      await cancelSubscription();
      await load();
    } catch {
      toast({ title: b.loadError, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-[#64499D]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error || !current) {
    return <p className="text-sm text-slate-500">{b.loadError}</p>;
  }

  const statusLabel = b.statuses[current.status] || current.status;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{b.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{b.subtitle}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          [b.status, statusLabel],
          [current.plan.name, current.list_price ? `${current.list_price} ${current.currency} ${b.exclVat}` : '—'],
          [b.cycle, current.billing_cycle === 'annual' ? b.annual : b.monthly],
          [b.renewal, formatWhen(current.renews_or_expires_at)],
          [b.users, `${current.seats_used} / ${current.seat_limit ?? '—'}`],
          [b.storage, `${formatBytes(current.storage_used_bytes)} / ${formatBytes(current.storage_limit_bytes)}`],
          [b.allowance, current.monthly_juria_credits == null ? '—' : String(current.monthly_juria_credits)],
          [b.remaining, String(current.credits_remaining)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-zinc-800">
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {current.trial_days_left != null && (
        <p className="text-sm text-[#64499D]">
          {b.trial} · {tf(b.trialDays, { count: current.trial_days_left })}
        </p>
      )}
      {current.cancel_at_period_end && (
        <p className="text-sm text-slate-600">{tf(b.cancelScheduled, { date: formatWhen(current.cancellation_date) })}</p>
      )}
      {current.payment_required && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{b.paymentPending}</p>
          <p className="mt-1">{b.paymentPendingBody}</p>
        </div>
      )}

      {current.can_manage ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{b.manageHint}</p>
          <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-zinc-800">
            {(['monthly', 'annual'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCycle(value)}
                className={
                  cycle === value
                    ? 'rounded-full bg-[#64499D] px-3 py-1 text-xs font-medium text-white'
                    : 'rounded-full px-3 py-1 text-xs font-medium text-slate-600'
                }
              >
                {value === 'monthly' ? b.monthly : b.annual}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {plans.map((plan) => (
              <Button
                key={plan.code}
                type="button"
                variant="outline"
                disabled={busy || plan.code === current.plan.code}
                onClick={() => void onChange(plan.code)}
                className="h-9"
              >
                {plan.name}
              </Button>
            ))}
            <Button type="button" variant="outline" disabled={busy || current.cancel_at_period_end} onClick={() => void onCancel()} className="h-9">
              {b.cancel}
            </Button>
            <Link to="/contact" className="inline-flex h-9 items-center px-2 text-sm font-medium text-[#64499D]">
              {b.contact}
            </Link>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{b.history}</h3>
            {(current.invoices || []).length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">{b.historyEmpty}</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-zinc-800">
                {current.invoices?.map((invoice) => (
                  <li key={invoice.number} className="flex items-center justify-between py-2">
                    <span>{invoice.number}</span>
                    <span>
                      {invoice.total} {invoice.currency} · {invoice.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">{b.readOnly}</p>
      )}
    </div>
  );
};

export default SubscriptionSettings;
