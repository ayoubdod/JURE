import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { apiUpdateCase } from '@/services/case/api';
import { caseCsd } from './helpers';

export function AddHearingDialog({
  open,
  onOpenChange,
  caseItem,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseItem: API.Case;
  onSaved: (next: API.Case) => void;
}) {
  const { t } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const existing = caseCsd(caseItem);
      const res = await apiUpdateCase({
        id: caseItem.id,
        case_specific_data: {
          ...existing,
          nextHearingDate: date,
          firstHearingDate: existing.firstHearingDate || existing.first_hearing_date || date,
        },
      });
      onSaved(res.data);
      onOpenChange(false);
      setDate('');
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.addHearingTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="hearing-date">{copy.hearingDate}</Label>
          <Input id="hearing-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className="bg-[#64499D] text-white hover:bg-[#4D3680]"
            disabled={!date || saving}
            onClick={() => void submit()}
          >
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddDeadlineDialog({
  open,
  onOpenChange,
  caseItem,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseItem: API.Case;
  onSaved: (next: API.Case) => void;
}) {
  const { t } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!label.trim() || !date) return;
    setSaving(true);
    try {
      const existing = caseCsd(caseItem);
      const current = Array.isArray(existing.keyDeadlines)
        ? existing.keyDeadlines
        : Array.isArray(existing.key_deadlines)
          ? existing.key_deadlines
          : [];
      const res = await apiUpdateCase({
        id: caseItem.id,
        case_specific_data: {
          ...existing,
          keyDeadlines: [...current, { label: label.trim(), date }],
        },
      });
      onSaved(res.data);
      onOpenChange(false);
      setLabel('');
      setDate('');
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.addDeadlineTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="deadline-label">{copy.deadlineLabel}</Label>
            <Input id="deadline-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline-date">{copy.deadlineDate}</Label>
            <Input id="deadline-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className="bg-[#64499D] text-white hover:bg-[#4D3680]"
            disabled={!label.trim() || !date || saving}
            onClick={() => void submit()}
          >
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
