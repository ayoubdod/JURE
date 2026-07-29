import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/utils/formatMAD';
import { generateInvoice } from '@/services/finance/api';
import { isCabinetTvaExonerated, type TVAStatus } from '@/services/financeService';
import { TVA_LEGAL_THRESHOLD_MAD } from '@/components/finance/tva/TVAProgressBar';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: number;
  fees: API.FinanceCaseFee[];
  onSuccess?: () => void;
  /** Cabinet TVA regime from GET /finance/tva-status/ — when null, TVA 20% preview matches previous behavior. */
  tvaStatus?: TVAStatus | null;
};

function formatCrossedDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'd MMM yyyy', { locale: fr });
}

export const GenerateInvoiceModal: React.FC<Props> = ({
  open,
  onOpenChange,
  caseId,
  fees,
  onSuccess,
  tvaStatus = null,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [feeId, setFeeId] = useState<string>('');
  const [amountHt, setAmountHt] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const htNum = parseFloat(amountHt.replace(',', '.')) || 0;
  const exonere = tvaStatus ? isCabinetTvaExonerated(tvaStatus) : false;
  const assujetti = tvaStatus ? !isCabinetTvaExonerated(tvaStatus) : false;
  const tva = useMemo(() => {
    if (exonere) return 0;
    return Math.round(htNum * 0.2 * 100) / 100;
  }, [htNum, exonere]);
  const ttc = useMemo(() => {
    if (exonere) return Math.round(htNum * 100) / 100;
    return Math.round((htNum + tva) * 100) / 100;
  }, [htNum, tva, exonere]);

  const thresholdMad =
    tvaStatus && tvaStatus.threshold_mad > 0 ? tvaStatus.threshold_mad : TVA_LEGAL_THRESHOLD_MAD;
  const pctCumul =
    tvaStatus && tvaStatus.threshold_percentage != null && !Number.isNaN(tvaStatus.threshold_percentage)
      ? Math.min(100, Math.max(0, tvaStatus.threshold_percentage))
      : tvaStatus && thresholdMad > 0
        ? Math.min(100, (tvaStatus.cumulative_ca_mad / thresholdMad) * 100)
        : 0;
  const showApproachWarning = exonere && pctCumul >= 80;

  const prevFeeIdRef = useRef<string>('');

  useEffect(() => {
    if (!feeId) {
      prevFeeIdRef.current = '';
      return;
    }
    if (prevFeeIdRef.current === feeId) return;
    prevFeeIdRef.current = feeId;
    const f = fees.find((x) => String(x.id) === feeId);
    if (!f) return;
    const remaining = Math.max(0, f.planned_amount - (f.invoiced_amount || 0));
    const next = remaining > 0 ? remaining : f.planned_amount;
    setAmountHt(String(next));
  }, [feeId, fees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fid = parseInt(feeId, 10);
    if (!fid || htNum <= 0) {
      toast({ title: 'Champs requis', description: 'Honoraire et montant HT requis.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await generateInvoice(caseId, {
        fee_id: fid,
        amount_ht: htNum,
        due_date: dueDate,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Facture générée' });
      onSuccess?.();
      setFeeId('');
      setAmountHt('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      devError('generateInvoice', err);
      let msg = 'Impossible de générer la facture.';
      if (isAxiosError(err)) {
        const d = err.response?.data as Record<string, unknown> | string | undefined;
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
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Générer une facture</DialogTitle>
              <DialogDescription className="text-sm text-white/90 mt-1">
                {exonere ? 'Montants HT et TTC (exonération TVA)' : 'Montants HT, TVA 20 % et TTC'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(85vh-100px)] flex-col overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Honoraire lié
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Select value={feeId || undefined} onValueChange={setFeeId}>
            <SelectTrigger className="mb-4 h-10">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {fees.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.fee_type} · {formatMAD(f.planned_amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Montant HT
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="relative mb-4">
            <Label className="sr-only">Montant HT</Label>
            <Input
              className="h-10 pr-14"
              value={amountHt}
              onChange={(e) => setAmountHt(e.target.value)}
              inputMode="decimal"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">
              MAD
            </span>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">TVA</p>
            {exonere ? (
              <>
                <p className="mt-1 text-slate-800 dark:text-slate-200">
                  Exonéré (CA cumulé {'<'} 500 000 MAD)
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Montant TVA : {formatMAD(0)}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">TTC = HT ({formatMAD(ttc)})</p>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                  La mention d&apos;exonération sera automatiquement ajoutée à la facture (Art. 89 CGI Maroc).
                </p>
                {showApproachWarning ? (
                  <p className="mt-3 rounded-md border border-amber-200/80 bg-amber-50/90 px-2 py-2 text-[12px] leading-snug text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                    Votre CA approche du seuil de 500 000 MAD cumulé. Cette facture sera exonérée, mais les
                    prochaines pourraient déclencher l&apos;assujettissement définitif.
                  </p>
                ) : null}
              </>
            ) : assujetti ? (
              <>
                <p className="mt-1 text-slate-600 dark:text-slate-400">TVA (20%) : {formatMAD(tva)}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">TTC : {formatMAD(ttc)}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                  TVA obligatoire — seuil cumulé de 500 000 MAD franchi le{' '}
                  {formatCrossedDate(tvaStatus?.tva_became_applicable_at ?? tvaStatus?.crossed_at)}.
                  (Art. 89 CGI Maroc)
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-400">TVA (20%) : {formatMAD(tva)}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">TTC : {formatMAD(ttc)}</p>
              </>
            )}
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              Date d&apos;échéance
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Input className="mb-4 h-10" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Générer la facture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
