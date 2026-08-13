import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Coins, FileText, Wallet, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMAD } from '@/utils/formatMAD';
import {
  getCaseFinance,
  deleteFee,
  deleteInvoiceFinance,
  deletePayment,
  deleteExpense,
  downloadInvoicePdfFile,
  previewInvoicePdfInNewTab,
  updateTaxAdvance,
} from '@/services/finance/api';
import { getTVAStatus, type TVAStatus } from '@/services/financeService';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import { FeeCard } from './FeeCard';
import { InvoiceCard } from './InvoiceCard';
import { PaymentRow } from './PaymentRow';
import { TaxAdvanceCard } from './TaxAdvanceCard';
import { AddFeeModal } from '@/components/finance/modals/AddFeeModal';
import { AddExpenseModal } from '@/components/finance/modals/AddExpenseModal';
import { GenerateInvoiceModal } from '@/components/finance/modals/GenerateInvoiceModal';
import { AddPaymentModal } from '@/components/finance/modals/AddPaymentModal';
import { InvoiceUpdateModal } from '@/components/finance/modals/InvoiceUpdateModal';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';

type Props = {
  caseId: number;
};

export const FinanceTab: React.FC<Props> = ({ caseId }) => {
  const { toast } = useToast();
  const [data, setData] = useState<API.FinanceCasePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [genInvOpen, setGenInvOpen] = useState(false);
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [invoiceEditId, setInvoiceEditId] = useState<number | null>(null);
  const [tvaStatus, setTvaStatus] = useState<TVAStatus | null>(null);

  useEffect(() => {
    getTVAStatus().then(setTvaStatus);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    getCaseFinance(caseId)
      .then((res) => {
        setData(normalizeCaseFinancePayload(res.data));
        setLoadError(false);
      })
      .catch(() => {
        setData(null);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const remainingLabel = () => {
    if (!summary) return null;
    if (summary.remaining_status === 'settled' || summary.remaining <= 0) {
      return <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Soldé</span>;
    }
    if (summary.remaining_status === 'overdue') {
      return <span className="text-red-600 dark:text-red-400 font-semibold">{formatMAD(summary.remaining)}</span>;
    }
    return <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatMAD(summary.remaining)}</span>;
  };

  const totalReceived = data?.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;

  const handleDeleteFee = async (fee: API.FinanceCaseFee) => {
    if (!window.confirm('Supprimer cet honoraire ?')) return;
    try {
      await deleteFee(caseId, fee.id);
      load();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (exp: API.FinanceExpense) => {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    try {
      await deleteExpense(exp.id);
      load();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDeleteInvoice = async (inv: API.FinanceCaseInvoice) => {
    if (inv.status !== 'DRAFT') return;
    if (!window.confirm('Supprimer définitivement ce brouillon de facture ?')) return;
    try {
      await deleteInvoiceFinance(inv.id);
      toast({ title: 'Facture supprimée' });
      load();
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
    }
  };

  const handleInvoicePdf = async (inv: API.FinanceCaseInvoice) => {
    try {
      await downloadInvoicePdfFile(inv.id, caseId);
    } catch (err) {
      let msg = 'Impossible de télécharger le PDF.';
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = 'Accès refusé (rôle requis).';
        else if (st === 404) msg = 'Facture introuvable.';
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const handleInvoicePreview = async (inv: API.FinanceCaseInvoice) => {
    try {
      await previewInvoicePdfInNewTab(inv.id, caseId);
    } catch (err) {
      let msg = 'Impossible d’ouvrir l’aperçu.';
      if (isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 403) msg = 'Accès refusé (rôle requis).';
        else if (st === 404) msg = 'Facture introuvable.';
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    }
  };

  const handleDeletePayment = async (p: API.FinanceCasePayment) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    try {
      await deletePayment(caseId, p.id);
      load();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleTaxPaid = async () => {
    try {
      await updateTaxAdvance(caseId, { status: 'PAID' });
      load();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (loadError || !data || !summary) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Impossible de charger les données financières de ce dossier.
        </p>
        <Button type="button" size="sm" className="mt-3" variant="outline" onClick={load}>
          Réessayer
        </Button>
      </div>
    );
  }

  const fees = data.fees ?? [];
  const invoices = data.invoices ?? [];
  const payments = data.payments ?? [];
  const expenses = data.expenses ?? [];
  const tax = data.tax_advance;

  return (
    <div className="space-y-8 pb-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-950">
        <span>
          Honoraires: <strong className="tabular-nums">{formatMAD(summary.planned)}</strong>
        </span>
        <span>
          Dépenses: <strong className="tabular-nums">{formatMAD(summary.total_expenses ?? 0)}</strong>
        </span>
        <span>
          Facturé: <strong className="tabular-nums">{formatMAD(summary.invoiced)}</strong>
        </span>
        <span>
          Payé: <strong className="tabular-nums">{formatMAD(summary.paid)}</strong>
        </span>
        <span>
          Net: <strong className="tabular-nums">{formatMAD(summary.net_position ?? 0)}</strong>
        </span>
        <span className="flex items-center gap-1">Restant: {remainingLabel()}</span>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Honoraires <span className="text-slate-500">({fees.length})</span>
          </h3>
          <Button type="button" size="sm" className="h-9 bg-jure-600 hover:bg-jure-700" onClick={() => setAddFeeOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        </div>
        {fees.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 py-10 dark:border-slate-700 dark:bg-slate-900/40">
            <Coins className="mb-2 h-10 w-10 text-slate-400" />
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Aucun honoraire défini</p>
            <Button type="button" size="sm" className="mt-3 bg-jure-600" onClick={() => setAddFeeOpen(true)}>
              + Ajouter honoraire
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fees.map((f) => (
              <FeeCard key={f.id} fee={f} onDelete={handleDeleteFee} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Dépenses <span className="text-slate-500">({expenses.length})</span>
          </h3>
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setAddExpenseOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter dépense
          </Button>
        </div>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 py-10 dark:border-slate-700 dark:bg-slate-900/40">
            <Receipt className="mb-2 h-10 w-10 text-slate-400" />
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Aucune dépense enregistrée pour ce dossier.</p>
            <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => setAddExpenseOpen(true)}>
              + Ajouter une dépense
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-950"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{e.description}</p>
                  <p className="text-slate-500">
                    {e.category} · {e.expense_date}
                    {e.billable ? ' · Facturable' : ' · Non facturable'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="tabular-nums">{formatMAD(e.amount)}</strong>
                  <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteExpense(e)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Factures <span className="text-slate-500">({invoices.length})</span>
          </h3>
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setGenInvOpen(true)}>
            <FileText className="mr-1.5 h-4 w-4" />
            + Générer facture
          </Button>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 py-10 dark:border-slate-700 dark:bg-slate-900/40">
            <FileText className="mb-2 h-10 w-10 text-slate-400" />
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Aucune facture générée</p>
            <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => setGenInvOpen(true)}>
              + Générer une facture
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onPdf={() => handleInvoicePdf(inv)}
                onPreviewPdf={() => handleInvoicePreview(inv)}
                onEdit={() => setInvoiceEditId(inv.id)}
                onDelete={inv.status === 'DRAFT' ? handleDeleteInvoice : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Paiements{' '}
            <span className="font-normal text-slate-500">(total {formatMAD(totalReceived)})</span>
          </h3>
          <Button type="button" size="sm" className="h-9 bg-jure-600 hover:bg-jure-700" onClick={() => setAddPayOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter paiement
          </Button>
        </div>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 py-10 dark:border-slate-700 dark:bg-slate-900/40">
            <Wallet className="mb-2 h-10 w-10 text-slate-400" />
            <p className="text-[13px] text-slate-600 dark:text-slate-400">Aucun paiement enregistré</p>
            <Button type="button" size="sm" className="mt-3 bg-jure-600" onClick={() => setAddPayOpen(true)}>
              + Enregistrer un paiement
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} onDelete={handleDeletePayment} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Acompte Fiscal (obligation marocaine)
        </h3>
        {tax ? (
          <TaxAdvanceCard tax={tax} onMarkPaid={tax.status === 'UNPAID' ? handleTaxPaid : undefined} />
        ) : (
          <p className="text-[13px] text-slate-500">Aucun acompte fiscal pour ce dossier.</p>
        )}
      </section>

      <AddFeeModal open={addFeeOpen} onOpenChange={setAddFeeOpen} caseId={caseId} onSuccess={load} />
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        caseId={caseId}
        onSuccess={load}
      />
      <GenerateInvoiceModal
        open={genInvOpen}
        onOpenChange={setGenInvOpen}
        caseId={caseId}
        fees={fees}
        onSuccess={load}
        tvaStatus={tvaStatus}
      />
      <AddPaymentModal
        open={addPayOpen}
        onOpenChange={setAddPayOpen}
        caseId={caseId}
        invoices={invoices}
        onSuccess={load}
      />
      <InvoiceUpdateModal
        open={invoiceEditId != null}
        invoiceId={invoiceEditId}
        caseId={caseId}
        onOpenChange={(o) => {
          if (!o) setInvoiceEditId(null);
        }}
        onSuccess={() => {
          setInvoiceEditId(null);
          load();
        }}
      />
    </div>
  );
};
