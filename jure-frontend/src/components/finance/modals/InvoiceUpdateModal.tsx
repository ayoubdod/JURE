import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInvoiceDetail, updateInvoice, type UpdateInvoiceBody } from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: number | null;
  /** When known (dossier), passed for consistency; detail load still fills amounts. */
  caseId?: number | null;
  onSuccess?: () => void;
};

function apiErrorMessage(err: unknown): string {
  if (!isAxiosError(err)) return 'Une erreur est survenue.';
  const d = err.response?.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const detail = (d as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    const first = Object.entries(d).find(([, v]) => v != null);
    if (first) {
      const v = first[1];
      return `${first[0]}: ${Array.isArray(v) ? String(v[0]) : String(v)}`;
    }
  }
  return 'Impossible d’enregistrer.';
}

export const InvoiceUpdateModal: React.FC<Props> = ({
  open,
  onOpenChange,
  invoiceId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadDetail, setLoadDetail] = useState(false);
  const [amountHt, setAmountHt] = useState('');
  const [tvaRate, setTvaRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<API.FinanceInvoiceStatus | null>(null);

  useEffect(() => {
    if (!open || invoiceId == null) {
      setStatus(null);
      return;
    }
    setLoadDetail(true);
    getInvoiceDetail(invoiceId)
      .then((res) => {
        const d = res.data;
        setStatus(d.status);
        setAmountHt(String(d.amount_ht ?? ''));
        const tr = (d as API.FinanceInvoiceDetail & { tva_rate?: number }).tva_rate;
        setTvaRate(tr != null && !Number.isNaN(Number(tr)) ? String(tr) : '0.2');
        setDueDate((d.due_date ?? '').slice(0, 10));
        setNotes(d.notes ?? '');
      })
      .catch(() => {
        toast({ title: 'Erreur', description: 'Impossible de charger la facture.', variant: 'destructive' });
        onOpenChange(false);
      })
      .finally(() => setLoadDetail(false));
  }, [open, invoiceId, onOpenChange, toast]);

  const isDraft = status === 'DRAFT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceId == null) return;
    setLoading(true);
    try {
      const body: UpdateInvoiceBody = {
        due_date: dueDate || null,
        notes: notes.trim() || null,
      };
      if (isDraft) {
        const ht = parseFloat(amountHt.replace(',', '.'));
        if (Number.isNaN(ht) || ht < 0) {
          toast({ title: 'Montant invalide', variant: 'destructive' });
          setLoading(false);
          return;
        }
        body.amount_ht = ht;
        const tr = parseFloat(tvaRate.replace(',', '.'));
        if (!Number.isNaN(tr) && tr >= 0) {
          body.tva_rate = tr;
        }
      }
      await updateInvoice(invoiceId, body);
      toast({ title: 'Facture mise à jour' });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      devError('updateInvoice', err);
      toast({ title: 'Erreur', description: apiErrorMessage(err), variant: 'destructive' });
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
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Modifier la facture</DialogTitle>
              <DialogDescription className="text-sm text-white/90 mt-1">
                {isDraft
                  ? 'Brouillon : montants, TVA, échéance et notes'
                  : 'Facture émise : échéance et notes uniquement'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(85vh-100px)] flex-col overflow-y-auto px-6 py-5">
          {loadDetail ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-jure-600" />
            </div>
          ) : (
            <>
              {!isDraft ? (
                <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[12px] text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  Les montants et le taux de TVA ne sont plus modifiables hors brouillon. Utilisez le workflow
                  d’annulation côté cabinet si nécessaire.
                </p>
              ) : null}

              <div className="mb-4 space-y-2">
                <Label htmlFor="inv-ht">Montant HT (MAD)</Label>
                <Input
                  id="inv-ht"
                  className="h-10"
                  value={amountHt}
                  onChange={(e) => setAmountHt(e.target.value)}
                  inputMode="decimal"
                  disabled={!isDraft}
                  readOnly={!isDraft}
                />
              </div>

              <div className="mb-4 space-y-2">
                <Label htmlFor="inv-tva">Taux TVA (ex. 0,2 pour 20 %)</Label>
                <Input
                  id="inv-tva"
                  className="h-10"
                  value={tvaRate}
                  onChange={(e) => setTvaRate(e.target.value)}
                  inputMode="decimal"
                  disabled={!isDraft}
                  readOnly={!isDraft}
                />
              </div>

              <div className="mb-4 space-y-2">
                <Label htmlFor="inv-due">Date d&apos;échéance</Label>
                <Input
                  id="inv-due"
                  type="date"
                  className="h-10"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="mb-4 space-y-2">
                <Label htmlFor="inv-notes">Notes</Label>
                <Textarea
                  id="inv-notes"
                  className="min-h-[88px] resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </>
          )}

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || loadDetail}>
              Annuler
            </Button>
            <Button type="submit" className="bg-jure-600 hover:bg-jure-700" disabled={loading || loadDetail}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
