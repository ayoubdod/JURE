import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addExpense } from '@/services/finance/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation, localizeAxiosPayload } from '@/i18n';
import { isAxiosError } from 'axios';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
  onSuccess: () => void;
};

const CATEGORIES: API.FinanceExpenseCategory[] = ['TRAVEL', 'COURT', 'EXPERT', 'ADMIN', 'OTHER'];

export const AddExpenseModal: React.FC<Props> = ({ open, onOpenChange, caseId, onSuccess }) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const m = t.finance.modals.addExpense;
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<API.FinanceExpenseCategory>('OTHER');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billable, setBillable] = useState(true);
  const [reimbursable, setReimbursable] = useState(false);
  const [receipt, setReceipt] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    const amt = Number(amount);
    return description.trim().length > 0 && Number.isFinite(amt) && amt > 0 && !!expenseDate;
  }, [description, amount, expenseDate]);

  const reset = () => {
    setDescription('');
    setCategory('OTHER');
    setAmount('');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setBillable(true);
    setReimbursable(false);
    setReceipt('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await addExpense(caseId, {
        description: description.trim(),
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        billable,
        reimbursable,
        receipt_reference: receipt.trim() || undefined,
        currency: 'MAD',
      });
      toast({ title: t.finance.toasts.expenseSaved });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      let msg = t.finance.toasts.expenseSaveFailed;
      if (isAxiosError(err)) {
        msg = localizeAxiosPayload(err.response?.data, t.finance.toasts.expenseSaveFailed);
      }
      toast({ title: t.common.error, description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
          <DialogDescription>{m.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">{m.notes}</Label>
            <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{m.category}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as API.FinanceExpenseCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t.finance.expenseCategories[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amt">{m.amountMad}</Label>
              <Input
                id="exp-amt"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">{m.date}</Label>
              <Input
                id="exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={billable} onCheckedChange={(v) => setBillable(Boolean(v))} />
              {m.billable}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={reimbursable} onCheckedChange={(v) => setReimbursable(Boolean(v))} />
              {m.reimbursable}
            </label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-ref">{m.receiptRef}</Label>
            <Input id="exp-ref" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className="bg-jure-600 hover:bg-jure-700"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
          >
            {saving ? m.saving : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
