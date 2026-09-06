import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { deletePayment, getPaymentDetail } from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { formatDate, localizeAxiosPayload, useAppTranslation } from '@/i18n';
import { isAxiosError } from 'axios';

type Props = {
  paymentId: number | null;
  preview?: API.FinancePaymentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateCase?: (caseId: number) => void;
  onDeleted?: () => void;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function mergePaymentDetail(
  raw: unknown,
  preview?: API.FinancePaymentListItem | null
): API.FinancePaymentDetail | null {
  const o = asRecord(raw);
  const inv = o ? asRecord(o.invoice) : null;
  const id = Number(o?.id ?? preview?.id ?? 0);
  if (!id) return null;
  const method = String(o?.method ?? o?.payment_method ?? preview?.method ?? 'OTHER') as API.FinancePaymentMethod;
  return {
    id,
    case_id: Number(o?.case_id ?? o?.case ?? preview?.case_id ?? 0),
    case_reference: String(o?.case_reference ?? preview?.case_reference ?? ''),
    client_name: String(o?.client_name ?? preview?.client_name ?? ''),
    amount: Number(o?.amount ?? preview?.amount ?? 0),
    method,
    payment_method: method,
    reference: (o?.reference as string | null | undefined) ?? preview?.reference ?? null,
    linked_invoice_id:
      inv?.id != null
        ? Number(inv.id)
        : o?.linked_invoice_id != null
          ? Number(o.linked_invoice_id)
          : (preview?.linked_invoice_id ?? null),
    linked_invoice_number:
      (inv?.invoice_number as string | undefined) ??
      (o?.linked_invoice_number as string | undefined) ??
      preview?.linked_invoice_number ??
      null,
    date: String(o?.date ?? o?.payment_date ?? preview?.date ?? ''),
    payment_date: String(o?.payment_date ?? o?.date ?? preview?.date ?? ''),
    status: (String(o?.status ?? 'CONFIRMED') as API.FinancePaymentDetail['status']),
    notes: (o?.notes as string | null | undefined) ?? null,
    created_by_name: (o?.created_by_name as string | null | undefined) ?? null,
  };
}

export const PaymentDetailPanel: React.FC<Props> = ({
  paymentId,
  preview,
  open,
  onOpenChange,
  onNavigateCase,
  onDeleted,
}) => {
  const { toast } = useToast();
  const { t, tf, lang } = useAppTranslation();
  const dateOpts = { month: 'short' as const, day: 'numeric' as const, year: 'numeric' as const };
  const [data, setData] = useState<API.FinancePaymentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!open || paymentId == null) {
      setData(null);
      return;
    }
    setData(mergePaymentDetail(null, preview));
    setLoading(true);
    getPaymentDetail(paymentId)
      .then((res) => setData(mergePaymentDetail(res.data, preview)))
      .catch((err) => {
        if (!preview) {
          let msg = t.finance.paymentDetail.loadFailed;
          if (isAxiosError(err) && err.response?.status === 404) msg = t.finance.toasts.paymentNotFound;
          toast({ title: t.common.error, description: msg, variant: 'destructive' });
          setData(null);
        }
      })
      .finally(() => setLoading(false));
  }, [open, paymentId, preview]);

  const handleDelete = async () => {
    if (data == null) return;
    if (!window.confirm(t.finance.toasts.deletePaymentConfirm)) return;
    setDeleteLoading(true);
    try {
      await deletePayment(data.case_id, data.id);
      toast({ title: t.finance.toasts.paymentDeleted });
      onDeleted?.();
      onOpenChange(false);
    } catch (err) {
      let msg = t.finance.toasts.deleteFailed;
      if (isAxiosError(err)) {
        msg = localizeAxiosPayload(err.response?.data, t.finance.toasts.deleteFailed);
      }
      toast({ title: t.common.error, description: msg, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const status = data?.status ?? 'CONFIRMED';
  const cancelled = status === 'CANCELLED';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="end"
        className={cn(
          'flex w-[min(calc(100vw-1.5rem),28rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:max-w-md',
          '!inset-y-3 !end-3 !h-auto max-h-[calc(100dvh-1.5rem)]',
          '[&>button]:hidden'
        )}
      >
        <header className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {loading && !data ? (
                <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : (
                <>
                  <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                    {data ? formatMAD(data.amount, lang) : '—'}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
                      cancelled
                        ? 'bg-slate-500/10 text-slate-500 line-through'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {t.finance.paymentStatuses[status]}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{data?.client_name}</p>
                </>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label={t.common.close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : null}
          {data ? (
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {t.finance.paymentDetail.title}
              </p>
              <div className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.caseTab.linkedCase}</span>
                  <button
                    type="button"
                    className="font-mono text-jure-600 hover:underline dark:text-jure-400"
                    onClick={() => data.case_id && onNavigateCase?.(data.case_id)}
                  >
                    {data.case_reference || '—'}
                  </button>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.columns.client}</span>
                  <span className="text-end font-medium text-slate-900 dark:text-white">{data.client_name || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.columns.method}</span>
                  <span>{t.finance.paymentMethods[data.method] ?? data.method}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.columns.reference}</span>
                  <span className="font-mono text-[12px]">{data.reference || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.columns.linkedInvoice}</span>
                  <span className="font-mono text-[12px]">{data.linked_invoice_number || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">{t.finance.caseTab.paymentDate}</span>
                  <span>{data.date ? formatDate(data.date, lang, dateOpts) : '—'}</span>
                </div>
                {data.created_by_name ? (
                  <p className="text-[12px] text-slate-500">{tf(t.finance.caseTab.createdBy, { name: data.created_by_name })}</p>
                ) : null}
                {data.notes ? (
                  <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="text-slate-500">{t.finance.modals.addPayment.notes}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-slate-800 dark:text-slate-100">{data.notes}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-9 gap-1"
            disabled={!data || deleteLoading}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t.common.delete}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
};
