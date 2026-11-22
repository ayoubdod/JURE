import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import SubscriptionSettings from '@/components/settings/SubscriptionSettings';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceChrome';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import {
  fetchBillingHistory,
  fetchCreditSummary,
  cancelAddonPurchase,
  fetchCurrentSubscription,
  fetchStorageSummary,
  requestCreditPurchase,
  requestStoragePurchase,
  type AddonPurchaseRow,
  type BillingHistory,
  type CreditSummary,
  type CurrentSubscription,
  type StorageSummary,
} from '@/services/billing/api';

const formatBytes = (value: number | null | undefined) => {
  if (value == null) return '—';
  if (value <= 0) return '0 MB';
  const gb = value / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(value / (1024 ** 2)))} MB`;
};

const formatWhen = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

const purchaseStatus = (status: string, labels: { pending: string; paid: string; failed: string; cancelled: string }) => {
  if (status === 'PAID') return labels.paid;
  if (status === 'FAILED') return labels.failed;
  if (status === 'CANCELLED') return labels.cancelled;
  return labels.pending;
};

const SubscriptionCenter = () => {
  const { t, tf } = useAppTranslation();
  const b = t.settings.billing;
  const c = b.center;
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [history, setHistory] = useState<BillingHistory | null>(null);
  const [receipt, setReceipt] = useState<AddonPurchaseRow | null>(null);
  const [review, setReview] = useState<{ kind: 'storage' | 'credits'; code: string; name: string; detail: string; price: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = (quiet = false) => {
    if (!quiet) setLoading(true);
    return Promise.all([fetchCurrentSubscription(), fetchStorageSummary(), fetchCreditSummary()])
      .then(([subscriptionResponse, storageResponse, creditResponse]) => {
        const body = subscriptionResponse.data;
        setCurrent(body && 'plan' in body ? body : null);
        setStorage(storageResponse.data);
        setCredits(creditResponse.data);
      })
      .catch(() => toast({ title: b.loadError, variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (tab !== 'billing' || history) return;
    fetchBillingHistory()
      .then((response) => setHistory(response.data))
      .catch(() => setHistory({ invoices: [], purchases: [], tax_confirmed: false }));
  }, [tab, history]);

  const buyStorage = async (code: string) => {
    setBusy(true);
    try {
      const response = await requestStoragePurchase(code);
      setReceipt(response.data);
      setReview(null);
      setHistory(null);
      toast({ title: c.requestSent });
      await load(true);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      toast({ title: b.loadError, description: typeof detail === 'string' ? detail : b.loadError, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const buyCredits = async (code: string) => {
    setBusy(true);
    try {
      const response = await requestCreditPurchase(code);
      setReceipt(response.data);
      setReview(null);
      setHistory(null);
      toast({ title: c.requestSent });
      await load(true);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      toast({ title: b.loadError, description: typeof detail === 'string' ? detail : b.loadError, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const dropPurchase = async (id: number) => {
    setBusy(true);
    try {
      await cancelAddonPurchase(id);
      setHistory(null);
      if (receipt?.id === id) setReceipt(null);
      await load(true);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      toast({ title: b.loadError, description: typeof detail === 'string' ? detail : b.loadError, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const levelNote =
    storage?.level === 'full' ? c.levelFull : storage?.level === 'critical' ? c.levelCritical : storage?.level === 'warning' ? c.levelWarning : '';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader title={b.title} subtitle={b.subtitle} />
          {loading ? (
            <div className="flex justify-center py-16 text-[#64499D]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="mt-6">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                {[
                  ['overview', c.overview],
                  ['plans', c.plans],
                  ['storage', c.storage],
                  ['credits', c.credits],
                  ['billing', c.billing],
                ].map(([id, label]) => (
                  <TabsTrigger key={id} value={id} className="rounded-full px-3 py-1.5 text-sm data-[state=active]:bg-[#64499D] data-[state=active]:text-white">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                {current ? (
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      [b.status, b.statuses[current.status] || current.status],
                      [c.currentPlan, current.plan.name],
                      [b.cycle, current.billing_cycle === 'annual' ? b.annual : b.monthly],
                      [c.start, formatWhen(current.current_period_start || current.trial_start)],
                      [c.periodEnd, formatWhen(current.renews_or_expires_at)],
                      [b.users, `${current.seats_used} / ${current.seat_limit ?? '—'}`],
                      [c.includedStorage, formatBytes(storage?.included_bytes)],
                      [c.extraStorage, formatBytes(storage?.purchased_bytes ?? 0)],
                      [c.totalCredits, String(credits?.total_available ?? current.credits_remaining)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-zinc-800">
                        <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">{b.loadError}</p>
                )}
                {current?.pending_plan ? (
                  <p className="mt-3 text-sm text-[#64499D]">{c.pendingPlan}: {current.pending_plan.name}</p>
                ) : null}
                {current?.trial_days_left != null ? (
                  <p className="mt-2 text-sm text-[#64499D]">{b.trial} · {tf(b.trialDays, { count: current.trial_days_left })}</p>
                ) : null}
              </TabsContent>

              <TabsContent value="plans" className="mt-4">
                <SubscriptionSettings showHeading={false} />
              </TabsContent>

              <TabsContent value="storage" className="mt-4 space-y-4">
                {storage ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        [c.includedStorage, formatBytes(storage.included_bytes)],
                        [c.extraStorage, formatBytes(storage.purchased_bytes)],
                        [c.totalStorage, formatBytes(storage.total_bytes)],
                        [c.used, formatBytes(storage.used_bytes)],
                        [c.available, formatBytes(storage.remaining_bytes)],
                        [c.usage, storage.usage_percent == null ? '—' : `${storage.usage_percent}%`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-zinc-800">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-0.5 text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div
                        className={storage.level === 'normal' ? 'h-full bg-[#64499D]' : storage.level === 'warning' ? 'h-full bg-amber-500' : 'h-full bg-red-600'}
                        style={{ width: `${Math.min(storage.usage_percent || 0, 100)}%` }}
                      />
                    </div>
                    {levelNote ? <p className="text-sm text-amber-800">{levelNote}</p> : null}
                    {(storage.pending_purchases || []).length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold">{c.pendingRequests}</h3>
                        <ul className="mt-2 space-y-2 text-sm">
                          {storage.pending_purchases?.map((purchase) => (
                            <li key={purchase.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="font-medium">{purchase.package_name} · {purchaseStatus(purchase.status, c)}</p>
                              <p>{c.reference}: {purchase.payment_reference}</p>
                              <p>{c.amountExcl}: {purchase.subtotal} {purchase.currency}</p>
                              <Button type="button" variant="outline" disabled={busy} className="mt-2 h-8" onClick={() => void dropPurchase(purchase.id)}>{c.cancelRequest}</Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="text-sm text-slate-500">
                      {c.library} {formatBytes(storage.breakdown.library_bytes)} · {c.cases} {formatBytes(storage.breakdown.case_bytes)} · {c.juriaFiles} {formatBytes(storage.breakdown.juria_bytes)}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {storage.packages.map((pkg) => (
                        <div key={pkg.code} className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-sm text-slate-500">{formatBytes(pkg.capacity_bytes)} · {c.oneTime}</p>
                          <p className="mt-1 text-sm">{pkg.price ? `${pkg.price} ${pkg.currency} ${b.exclVat}` : c.pricePending}</p>
                          {storage.can_manage && pkg.is_purchasable ? (
                            <Button
                              type="button"
                              disabled={busy}
                              onClick={() => setReview({
                                kind: 'storage',
                                code: pkg.code,
                                name: pkg.name,
                                detail: formatBytes(pkg.capacity_bytes),
                                price: `${pkg.price} ${pkg.currency}`,
                              })}
                              className="mt-3 h-9 bg-[#64499D] text-white hover:bg-[#4D3680]"
                            >
                              {c.buy}
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="credits" className="mt-4 space-y-4">
                {credits ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        [c.monthlyAllowance, credits.monthly_allowance == null ? '—' : String(credits.monthly_allowance)],
                        [c.monthlyUsed, String(credits.monthly_used)],
                        [c.monthlyLeft, String(credits.monthly_remaining)],
                        [c.purchasedLeft, String(credits.purchased_remaining)],
                        [c.trialLeft, String(credits.trial_remaining)],
                        [c.totalCredits, String(credits.total_available)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-zinc-800">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-0.5 text-sm font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                    {credits.monthly_allowance ? (
                      <p className="text-sm text-slate-600">
                        {tf(c.monthlyUsage, { percent: Math.min(100, Math.round((credits.monthly_used / credits.monthly_allowance) * 100)) })}
                      </p>
                    ) : null}
                    {(credits.pending_purchases || []).length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold">{c.pendingRequests}</h3>
                        <ul className="mt-2 space-y-2 text-sm">
                          {credits.pending_purchases?.map((purchase) => (
                            <li key={purchase.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="font-medium">{purchase.package_name} · {purchaseStatus(purchase.status, c)}</p>
                              <p>{c.reference}: {purchase.payment_reference}</p>
                              <p>{c.amountExcl}: {purchase.subtotal} {purchase.currency}</p>
                              <Button type="button" variant="outline" disabled={busy} className="mt-2 h-8" onClick={() => void dropPurchase(purchase.id)}>{c.cancelRequest}</Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {credits.alerts.includes('balance_empty') ? <p className="text-sm text-amber-800">{c.emptyBalance}</p> : null}
                    {credits.alerts.includes('monthly_low') ? <p className="text-sm text-amber-800">{c.monthlyLow}</p> : null}
                    {credits.alerts.includes('monthly_exhausted') ? <p className="text-sm text-amber-800">{c.monthlyEmpty}</p> : null}
                    {credits.alerts.includes('purchased_expiring') ? <p className="text-sm text-amber-800">{c.expiring}</p> : null}
                    {credits.lots.map((lot) => (
                      <p key={lot.expires_at} className="text-sm text-slate-600">{lot.remaining} · {c.expires} {formatWhen(lot.expires_at)}</p>
                    ))}
                    <div className="grid gap-3 md:grid-cols-3">
                      {credits.packages.map((pkg) => (
                        <div key={pkg.code} className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-sm text-slate-500">{pkg.credits} · {pkg.price ? `${pkg.price} ${pkg.currency} ${b.exclVat}` : c.pricePending}</p>
                          <p className="text-xs text-slate-500">{tf(c.validity, { days: pkg.validity_days })}</p>
                          {credits.can_manage && pkg.is_purchasable ? (
                            <Button
                              type="button"
                              disabled={busy}
                              onClick={() => setReview({
                                kind: 'credits',
                                code: pkg.code,
                                name: pkg.name,
                                detail: `${pkg.credits} · ${tf(c.validity, { days: pkg.validity_days })}`,
                                price: `${pkg.price} ${pkg.currency}`,
                              })}
                              className="mt-3 h-9 bg-[#64499D] text-white hover:bg-[#4D3680]"
                            >
                              {c.buy}
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {(credits.history || []).length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold">{c.creditHistory}</h3>
                        <ul className="mt-2 divide-y text-sm">
                          {credits.history?.map((row) => (
                            <li key={`${row.created_at}-${row.movement_type}-${row.balance_after}`} className="flex justify-between py-2">
                              <span>{c.ledger[row.movement_type as keyof typeof c.ledger] || row.movement_type} · {row.amount}</span>
                              <span className="text-slate-500">{formatWhen(row.created_at)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="billing" className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">{c.taxNote}</p>
                <div>
                  <h3 className="text-sm font-semibold">{c.historyInvoices}</h3>
                  {(history?.invoices || []).length === 0 ? <p className="mt-1 text-sm text-slate-500">{b.historyEmpty}</p> : (
                    <ul className="mt-2 divide-y text-sm">
                      {history?.invoices.map((invoice) => (
                        <li key={invoice.number} className="flex justify-between py-2">
                          <span>{invoice.number}</span>
                          <span>{invoice.total} {invoice.currency} · {invoice.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{c.historyPurchases}</h3>
                  {(history?.purchases || []).length === 0 ? <p className="mt-1 text-sm text-slate-500">{c.noPurchases}</p> : (
                    <ul className="mt-2 divide-y text-sm">
                      {history?.purchases.map((purchase) => (
                        <li key={purchase.id} className="py-2">
                          <div className="flex justify-between gap-3">
                            <span>{purchase.package_name}</span>
                            <span>{purchase.subtotal} {purchase.currency} {b.exclVat}</span>
                          </div>
                          <p className="text-slate-500">
                            {c.reference}: {purchase.payment_reference} · {purchaseStatus(purchase.status, c)} · {formatWhen(purchase.created_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          {review ? (
            <div className="mt-4 rounded-xl border border-[#64499D]/20 bg-[#F7F4FF] p-3 text-sm text-[#3E2D71]">
              <p className="font-semibold">{review.name}</p>
              <p className="mt-1">{review.detail}</p>
              <p>{c.amountExcl}: {review.price}</p>
              <p className="mt-1">{c.payByTransfer}</p>
              <p className="mt-1">{c.taxNote}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void (review.kind === 'storage' ? buyStorage(review.code) : buyCredits(review.code))}
                  className="h-9 bg-[#64499D] text-white hover:bg-[#4D3680]"
                >
                  {c.buy}
                </Button>
                <Button type="button" variant="outline" disabled={busy} className="h-9" onClick={() => setReview(null)}>{c.close}</Button>
              </div>
            </div>
          ) : null}
          {receipt ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">{receipt.package_name}</p>
              <p className="mt-1">{c.payByTransfer}</p>
              <p className="mt-1 font-medium">{c.reference}: {receipt.payment_reference}</p>
              <p>{c.amountExcl}: {receipt.subtotal} {receipt.currency}</p>
              <p className="mt-1">{c.taxNote}</p>
              <Button type="button" variant="outline" className="mt-3 h-9" onClick={() => setReceipt(null)}>{c.close}</Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCenter;
