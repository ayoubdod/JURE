import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import {
  deleteInvoiceFinance,
  downloadInvoicePdfFile,
  getInvoiceDetail,
  previewInvoicePdfInNewTab,
} from '@/services/finance/api';
import { invoiceExonerationNote } from '@/components/finance/tva/TVAProgressBar';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';

const statusClass: Record<API.FinanceInvoiceStatus, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  SENT: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  PARTIALLY_PAID: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  OVERDUE: 'bg-red-500/15 text-red-700 dark:text-red-300',
  CANCELLED: 'bg-slate-500/10 text-slate-500 line-through',
};

const methodLabel: Record<API.FinancePaymentMethod, string> = {
  CASH: 'Cash',
  VIREMENT_BANCAIRE: 'Virement',
  CHEQUE: 'Chèque',
};

type Props = {
  invoiceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateCase?: (caseId: number) => void;
  onEdit?: (inv: API.FinanceInvoiceDetail) => void;
  /** After delete or external update */
  onInvoiceMutated?: () => void;
};

export const InvoiceDetailPanel: React.FC<Props> = ({
  invoiceId,
  open,
  onOpenChange,
  onNavigateCase,
  onEdit,
  onInvoiceMutated,
}) => {
  const { toast } = useToast();
  const [data, setData] = useState<API.FinanceInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!open || invoiceId == null) {
      setData(null);
      return;
    }
    setLoading(true);
    getInvoiceDetail(invoiceId)
      .then((res) => setData(res.data))
      .catch(() => {
        toast({ title: 'Erreur', description: 'Impossible de charger la facture.', variant: 'destructive' });
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [open, invoiceId, toast]);

  const totalPaid = data?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const remaining = data ? data.amount_ttc - totalPaid : 0;
  const exonerationNote = data ? invoiceExonerationNote(data) : null;
  const tvaExempt = data != null && data.tva_applicable === false;

  const handleDownloadPdf = async () => {
    if (data == null) return;
    setPdfLoading(true);
    try {
      await downloadInvoicePdfFile(data.id, data.case_id);
    } catch (err) {
      let msg = 'Impossible de télécharger le PDF.';
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = 'Accès refusé (rôle requis).';
        else if (st === 404) msg = 'Facture introuvable.';
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (data == null) return;
    setPreviewLoading(true);
    try {
      await previewInvoicePdfInNewTab(data.id, data.case_id);
    } catch (err) {
      let msg = 'Impossible d’ouvrir l’aperçu.';
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = 'Accès refusé (rôle requis).';
        else if (st === 404) msg = 'Facture introuvable.';
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (data == null || data.status !== 'DRAFT') return;
    if (!window.confirm('Supprimer définitivement ce brouillon de facture ?')) return;
    setDeleteLoading(true);
    try {
      await deleteInvoiceFinance(data.id);
      toast({ title: 'Facture supprimée' });
      onInvoiceMutated?.();
      onOpenChange(false);
    } catch (err) {
      let msg = 'Suppression impossible.';
      if (isAxiosError(err)) {
        const d = err.response?.data;
        if (typeof d === 'string') msg = d;
        else if (d && typeof d === 'object' && 'detail' in d && typeof (d as { detail: string }).detail === 'string') {
          msg = (d as { detail: string }).detail;
        }
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex w-full flex-col gap-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0 sm:max-w-md',
          '[&>button]:hidden'
        )}
      >
        <header className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 px-4 py-4 backdrop-blur dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {loading ? (
                <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              ) : (
                <>
                  <p className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                    {data?.number ?? '—'}
                  </p>
                  {data?.status ? (
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
                        statusClass[data.status]
                      )}
                    >
                      {data.status.replace(/_/g, ' ')}
                    </span>
                  ) : null}
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
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          )}
          {!loading && data && (
            <>
              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Détails facture</p>
                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-[13px] space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Dossier lié</span>
                    <button
                      type="button"
                      className="font-mono text-jure-600 dark:text-jure-400 hover:underline"
                      onClick={() => data.case_id && onNavigateCase?.(data.case_id)}
                    >
                      {data.case_reference}
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500">Client</span>
                    <p className="font-medium text-slate-900 dark:text-white">{data.client_name}</p>
                    {(data.client_ice || data.client_if) && (
                      <p className="text-[12px] text-slate-600">
                        {[data.client_ice && `ICE ${data.client_ice}`, data.client_if && `IF ${data.client_if}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Montant HT</span>
                      <span className="tabular-nums">{formatMAD(data.amount_ht)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{tvaExempt ? 'TVA' : 'TVA (20%)'}</span>
                      <span className="tabular-nums">{formatMAD(data.tva)}</span>
                    </div>
                    {exonerationNote ? (
                      <p className="text-[11px] italic text-[#94a3b8]">{exonerationNote}</p>
                    ) : null}
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 dark:text-slate-200">Montant TTC</span>
                      <span className="tabular-nums">{formatMAD(data.amount_ttc)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[12px] text-slate-600">
                    <span>Émission: {data.issue_date}</span>
                    <span>Échéance: {data.due_date ?? '—'}</span>
                  </div>
                  {data.created_by_name ? (
                    <p className="text-[12px] text-slate-500">Créée par: {data.created_by_name}</p>
                  ) : null}
                </div>
              </section>

              <section className="mt-6 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Paiements liés</p>
                <div className="space-y-2">
                  {(data.payments ?? []).length === 0 ? (
                    <p className="text-[13px] text-slate-500">Aucun paiement lié</p>
                  ) : (
                    data.payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-[13px]"
                      >
                        <span className="font-medium tabular-nums">{formatMAD(p.amount)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                          {methodLabel[p.method]}
                        </span>
                        <span className="text-slate-600">{p.date}</span>
                        <span className="font-mono text-[12px] text-slate-500">{p.reference || '—'}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-[13px] dark:border-slate-800">
                    <span className="text-slate-600">Total payé</span>
                    <span className="font-semibold tabular-nums">{formatMAD(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-600">Restant dû</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        remaining <= 0 ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {formatMAD(Math.max(0, remaining))}
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95">
          <div className="text-[13px] font-medium">
            Restant:{' '}
            <span className={cn('tabular-nums', remaining <= 0 ? 'text-emerald-600' : 'text-amber-600')}>
              {data ? formatMAD(Math.max(0, remaining)) : '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1"
              disabled={!data || pdfLoading}
              onClick={handleDownloadPdf}
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1"
              disabled={!data || previewLoading}
              onClick={handlePreviewPdf}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Aperçu
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 bg-jure-600 hover:bg-jure-700"
              disabled={!data}
              onClick={() => data && onEdit?.(data)}
            >
              Modifier
            </Button>
            {data?.status === 'DRAFT' ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-9 gap-1"
                disabled={deleteLoading}
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" className="h-9" disabled>
              Clôturer
            </Button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
};
