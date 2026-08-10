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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { addFee } from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: number;
  onSuccess?: () => void;
};

export const AddFeeModal: React.FC<Props> = ({ open, onOpenChange, caseId, onSuccess }) => {
  const { t, tf } = useAppTranslation();
  const m = t.finance.modals.addFee;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const [feeType, setFeeType] = useState<API.FinanceFeeType>('FIXED');
  const [lawyerId, setLawyerId] = useState<string>('');
  const [planned, setPlanned] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    apiGetCabinetMembers({ expand: 'user' })
      .then((res) => setMembers(res.data.filter((mem) => mem.is_active !== false)))
      .catch(() => setMembers([]));
  }, [open]);

  const selectedMember = members.find((mem) => String(mem.id) === lawyerId);
  const hourlyRate = (selectedMember as { hourly_rate?: number } | undefined)?.hourly_rate;

  const reset = () => {
    setFeeType('FIXED');
    setLawyerId('');
    setPlanned('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(planned.replace(',', '.'));
    if (Number.isNaN(amt)) {
      toast({ title: m.requiredFields, description: m.plannedRequired, variant: 'destructive' });
      return;
    }
    const lid = lawyerId ? parseInt(lawyerId, 10) : NaN;
    const lawyer_id = !Number.isNaN(lid) && lid > 0 ? lid : undefined;
    setLoading(true);
    try {
      await addFee(caseId, {
        fee_type: feeType,
        planned_amount: amt,
        ...(lawyer_id != null && { lawyer_id }),
        notes: notes.trim() || undefined,
      });
      toast({ title: m.success });
      onSuccess?.();
      reset();
      onOpenChange(false);
    } catch (err) {
      devError('addFee', err);
      let msg = m.saveFailed;
      if (isAxiosError(err)) {
        const d = err.response?.data;
        if (typeof d?.detail === 'string') msg = d.detail;
        else if (d && typeof d === 'object') {
          const first = Object.entries(d).find(([, v]) => v != null);
          if (first) msg = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : String(first[1])}`;
        }
      }
      toast({ title: t.common.error, description: msg, variant: 'destructive' });
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
            className="absolute end-3 top-3 z-10 h-9 w-9 rounded-full bg-white/15 text-white hover:bg-white/25"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative flex items-center gap-3 px-6 pt-6 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">{m.title}</DialogTitle>
              <DialogDescription className="text-sm text-white/90 mt-1">
                {m.description}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(85vh-100px)] flex-col overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              {m.type}
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <ToggleGroup
            type="single"
            value={feeType}
            onValueChange={(v) => v && setFeeType(v as API.FinanceFeeType)}
            className="mb-6 grid w-full grid-cols-3 gap-2"
          >
            <ToggleGroupItem value="FIXED" className="h-10 text-xs">
              {t.finance.feeTypes.FIXED}
            </ToggleGroupItem>
            <ToggleGroupItem value="HOURLY" className="h-10 text-xs">
              {t.finance.feeTypes.HOURLY}
            </ToggleGroupItem>
            <ToggleGroupItem value="SUCCESS_FEE" className="h-10 text-xs">
              {t.finance.feeTypes.SUCCESS_FEE}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              {m.lawyer}
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="mb-4">
            <Label className="sr-only">{m.lawyer}</Label>
            <Select value={lawyerId || undefined} onValueChange={setLawyerId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={m.lawyerOptional} />
              </SelectTrigger>
              <SelectContent>
                {members.map((mem) => (
                  <SelectItem key={mem.id} value={String(mem.id)}>
                    {mem.first_name} {mem.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {feeType === 'HOURLY' && hourlyRate != null && (
            <p className="mb-3 text-[13px] text-slate-600 dark:text-slate-400">
              {tf(m.hourlyRate, { rate: hourlyRate })}
            </p>
          )}

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              {m.plannedAmount}
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <div className="relative mb-4">
            <Input
              className="h-10 pe-14"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              inputMode="decimal"
              placeholder={m.amountPlaceholder}
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">
              MAD
            </span>
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
              {m.notes}
            </p>
            <div className="mt-2 h-px w-full bg-slate-200 dark:bg-zinc-800" />
          </div>
          <Textarea
            className="min-h-[80px] resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.common.optional}
          />

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t.common.cancel}
            </Button>
            <Button type="submit" className="bg-jure-600 hover:bg-jure-700" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
