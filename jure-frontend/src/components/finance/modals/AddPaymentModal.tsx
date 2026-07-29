import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addPayment, getCaseFinance } from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: number;
  invoices: API.FinanceCaseInvoice[];
  onSuccess?: () => void;
};

/** Backend may send `number` and/or `invoice_number` / `reference`. */
function invoiceRowLabel(inv: API.FinanceCaseInvoice & { invoice_number?: string; reference?: string }) {
  const n = inv.number ?? inv.invoice_number ?? inv.reference;
  return n ? String(n) : `Facture #${inv.id}`;
}

export const AddPaymentModal: React.FC<Props> = ({ open, onOpenChange, caseId, invoices, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invoiceRows, setInvoiceRows] = useState<API.FinanceCaseInvoice[]>(invoices);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<API.FinancePaymentMethod>('VIREMENT_BANCAIRE');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setInvoiceRows(invoices);
  }, [invoices]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setInvoicesLoading(true);
    getCaseFinance(caseId)
      .then((res) => {
        if (!cancelled) setInvoiceRows(res.data?.invoices ?? []);
      })
      .catch(() => {
        /* keep invoiceRows from parent sync */
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, caseId]);

  const refPlaceholder = useMemo(() => {
    if (method === 'CASH') return 'N° reçu';
    if (method === 'VIREMENT_BANCAIRE') return 'N° virement bancaire';
    return 'N° chèque';
  }, [method]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(amt) || amt <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await addPayment(caseId, {
        amount: amt,
        method,
        payment_date: paymentDate,
        reference: reference.trim() || undefined,
        invoice_id: invoiceId ? parseInt(invoiceId, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Paiement enregistré' });
      onSuccess?.();
      setAmount('');
      setReference('');
      setInvoiceId('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      devError('addPayment', err);
      let msg = 'Impossible d’enregistrer le paiement.';
      if (isAxiosError(err)) {
        const d = err.response?.data as Record<string, unknown> | undefined;
        if (d && typeof d === 'object' && !Array.isArray(d)) {
          const detail = d.detail;
          if (typeof detail === 'string') msg = detail;
          else if (Array.isArray(detail) && detail.length > 0) {
            const first = detail[0];
            msg = typeof first === 'string' ? first : String(first);
          } else {
            const first = Object.entries(d).find(([, v]) => v != null);
            if (first) {
              const v = first[1];
              msg = `${first[0]}: ${Array.isArray(v) ? String(v[0]) : String(v)}`;
            }
          }
        }
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-lg max-h-[85vh] overflow-hidden p-0 [&>button]:hidden',
          'border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
        )}
      >
        <div className="relative h-[100px] shrink-0 overflow-hidden bg-gradient-to-br from-[#5B3FA8] via-[#6D54B5] to-[#4B7BA8]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full bg-white/15 text-white hover:bg-white/25"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative flex items-center gap-3 px-6 pt-6 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Enregistrer un paiement</DialogTitle>
              <DialogDescription className="text-sm text-white/90 mt-1">
                Montant, méthode et référence
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(85vh-100px)] flex-col overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Montant
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="relative mb-4">
            <Input
              className="h-10 pr-14"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">
              MAD
            </span>
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Méthode de paiement
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <ToggleGroup
            type="single"
            value={method}
            onValueChange={(v) => v && setMethod(v as API.FinancePaymentMethod)}
            className="mb-4 grid w-full grid-cols-3 gap-2"
          >
            <ToggleGroupItem value="CASH" className="h-10 text-xs">
              💵 Cash
            </ToggleGroupItem>
            <ToggleGroupItem value="VIREMENT_BANCAIRE" className="h-10 text-xs">
              🏦 Virement
            </ToggleGroupItem>
            <ToggleGroupItem value="CHEQUE" className="h-10 text-xs">
              📄 Chèque
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Date de paiement
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Input
            className="mb-4 h-10"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Référence
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Input
            className="mb-4 h-10"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={refPlaceholder}
          />

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Facture liée
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Select modal={false} value={invoiceId || undefined} onValueChange={setInvoiceId}>
            <SelectTrigger className="mb-4 h-10" disabled={invoicesLoading}>
              <SelectValue placeholder={invoicesLoading ? 'Chargement des factures…' : 'Optionnel'} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[300]">
              {invoicesLoading ? (
                <SelectItem value="__loading" disabled className="opacity-70">
                  Chargement des factures…
                </SelectItem>
              ) : invoiceRows.length === 0 ? (
                <SelectItem value="__empty" disabled className="opacity-70">
                  Aucune facture — générez-en une dans Finance
                </SelectItem>
              ) : (
                invoiceRows.map((inv) => (
                  <SelectItem key={inv.id} value={String(inv.id)}>
                    {invoiceRowLabel(inv as API.FinanceCaseInvoice & { invoice_number?: string; reference?: string })}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Notes
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Textarea
            className="min-h-[72px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optionnel"
          />

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" className="bg-jure-600 hover:bg-jure-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
