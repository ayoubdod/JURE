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

const SubscriptionSettings: React.FC<{ showHeading?: boolean }> = ({ showHeading = true }) => {
  const { t, tf } = useAppTranslation();
  const b = t.settings.billing;
  const { toast } = useToast();
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    code: string;
    name: string;
    mode: 'trial' | 'downgrade' | 'upgrade';
    overLimit: boolean;
    price: string;
    users: string;
    storage: string;
    credits: string;
  } | null>(null);
  const [instructions, setInstructions] = useState<{ reference: string; amount: string; currency: string } | null>(null);
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
        setPlans(catalogue.plans);
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
      const payment = (response.data as { payment_instructions?: { reference?: string; amount_excl_vat?: string; currency?: string } | null }).payment_instructions;
      if (payment?.reference) {
        setInstructions({
          reference: payment.reference,
          amount: payment.amount_excl_vat || '',
          currency: payment.currency || 'MAD',
        });
      } else {
        setInstructions(null);
      }
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
      setConfirm(null);
    }
  };

  const askChange = (plan: PublicPlan) => {
    if (!current) return;
    const trialing = current.status === 'TRIALING' || current.status === 'PENDING_VERIFICATION';
    const downgrade = !trialing && plan.display_order < current.plan.display_order;
    const amount = cycle === 'annual' ? plan.annual_price : plan.monthly_price;
    const gb = 1024 ** 3;
    let overLimit = false;
    if (downgrade && plan.maximum_users != null && current.seats_used > plan.maximum_users) overLimit = true;
    if (downgrade && plan.storage_gb != null) {
      const currentIncluded = current.plan.storage_gb == null ? 0 : current.plan.storage_gb * gb;
      const extra = current.storage_limit_bytes == null ? 0 : Math.max(current.storage_limit_bytes - currentIncluded, 0);
      if (current.storage_used_bytes > plan.storage_gb * gb + extra) overLimit = true;
    }
    setConfirm({
      code: plan.code,
      name: plan.name,
      mode: trialing ? 'trial' : downgrade ? 'downgrade' : 'upgrade',
      overLimit,
      price: amount ? `${Number(amount).toLocaleString()} ${plan.currency}` : '—',
      users: plan.maximum_users == null ? '—' : String(plan.maximum_users),
      storage: plan.storage_gb == null ? '—' : `${plan.storage_gb} GB`,
      credits: plan.monthly_juria_credits == null ? '—' : String(plan.monthly_juria_credits),
    });
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
      {showHeading ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{b.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{b.subtitle}</p>
        </div>
      ) : null}

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
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((plan) => {
              const amount = cycle === 'annual' ? plan.annual_price : plan.monthly_price;
              const monthly = Number(plan.monthly_price || 0);
              const annual = Number(plan.annual_price || 0);
              const save = monthly > 0 && annual > 0 ? Math.round((1 - annual / (monthly * 12)) * 100) : 0;
              const isCurrent = plan.code === current.plan.code;
              const cycleChanged = isCurrent && cycle !== current.billing_cycle;
              const featureLabels = t.auth.signup.subscription.features as Record<string, string>;
              return (
                <div
                  key={plan.code}
                  className={
                    isCurrent
                      ? 'rounded-2xl border border-[#64499D] bg-[#F7F4FF] p-4 dark:bg-[#64499D]/15'
                      : 'rounded-2xl border border-slate-200 p-4 dark:border-zinc-800'
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                    {plan.is_recommended ? (
                      <span className="rounded-full bg-[#64499D] px-2 py-0.5 text-[10px] font-semibold text-white">{b.center.recommended}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                  <p className="mt-2 text-2xl font-bold text-[#3E2D71] dark:text-[#CFC2FF]">
                    {amount ? Number(amount).toLocaleString() : '—'}
                    <span className="ms-1 text-xs font-medium text-slate-500">{amount ? `${plan.currency} ${b.exclVat}` : ''}</span>
                  </p>
                  {cycle === 'annual' && save > 0 ? (
                    <p className="text-xs text-[#64499D]">{tf(b.center.annualSave, { percent: save })}</p>
                  ) : null}
                  <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <li>{b.center.usersLabel}: {plan.maximum_users ?? '—'}</li>
                    <li>{b.center.storageLabel}: {plan.storage_gb == null ? '—' : `${plan.storage_gb} GB`}</li>
                    <li>{b.center.creditsLabel}: {plan.monthly_juria_credits ?? '—'}</li>
                    {plan.features.map((feature) => (
                      <li key={feature}>{featureLabels[feature] || feature}</li>
                    ))}
                  </ul>
                  {isCurrent && !cycleChanged ? (
                    <p className="mt-3 text-sm font-medium text-[#64499D]">{b.center.currentPlan}</p>
                  ) : plan.is_self_serve ? (
                    <Button type="button" disabled={busy} onClick={() => askChange(plan)} className="mt-3 h-9 bg-[#64499D] text-white hover:bg-[#4D3680]">
                      {cycleChanged ? (cycle === 'annual' ? b.annual : b.monthly) : plan.name}
                    </Button>
                  ) : (
                    <Link to="/contact" className="mt-3 inline-flex text-sm font-medium text-[#64499D]">{b.center.enterprise}</Link>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy || current.cancel_at_period_end} onClick={() => void onCancel()} className="h-9">
              {b.cancel}
            </Button>
            <Link to="/contact" className="inline-flex h-9 items-center px-2 text-sm font-medium text-[#64499D]">
              {b.contact}
            </Link>
          </div>
          {showHeading ? (
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
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{b.readOnly}</p>
      )}
      {instructions ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p>{b.center.payByTransfer}</p>
          <p className="mt-1 font-medium">{b.center.reference}: {instructions.reference}</p>
          <p>{b.center.amountExcl}: {instructions.amount} {instructions.currency}</p>
          <p className="mt-1 text-amber-800">{b.center.taxNote}</p>
        </div>
      ) : null}
      {confirm ? (
        <div className="rounded-xl border border-[#64499D]/20 bg-[#F7F4FF] p-3 text-sm text-[#3E2D71]">
          <p className="font-semibold">{confirm.name}</p>
          <p className="mt-1">{confirm.price} {b.exclVat}</p>
          <p className="mt-1">{b.center.newLimits}: {confirm.users} {b.center.usersLabel} · {confirm.storage} · {confirm.credits} {b.center.creditsLabel}</p>
          <p className="mt-1">
            {confirm.mode === 'trial' ? b.center.trialChange : confirm.mode === 'downgrade' ? b.center.downgradeBody : b.center.upgradeBody}
          </p>
          {confirm.overLimit ? <p className="mt-1">{b.center.overLimit}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void onChange(confirm.code)} className="h-9 bg-[#64499D] text-white hover:bg-[#4D3680]">
              {confirm.mode === 'downgrade' ? b.center.confirmDowngrade : b.center.confirmUpgrade}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)} className="h-9">
              {b.center.close}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SubscriptionSettings;
