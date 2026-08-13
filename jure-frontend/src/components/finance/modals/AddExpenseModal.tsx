import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
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
      toast({ title: 'Dépense enregistrée' });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      let msg = 'Impossible d’enregistrer la dépense.';
      if (isAxiosError(err)) {
        const d = err.response?.data;
        if (typeof d === 'string') msg = d;
        else if (d && typeof d === 'object' && 'detail' in d) msg = String((d as { detail: unknown }).detail);
      }
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une dépense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description</Label>
            <Input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as API.FinanceExpenseCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amt">Montant (MAD)</Label>
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
              <Label htmlFor="exp-date">Date</Label>
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
              Facturable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={reimbursable} onCheckedChange={(v) => setReimbursable(Boolean(v))} />
              Remboursable
            </label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-ref">Réf. justificatif (optionnel)</Label>
            <Input id="exp-ref" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-jure-600 hover:bg-jure-700"
            disabled={!canSubmit || saving}
            onClick={handleSubmit}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
