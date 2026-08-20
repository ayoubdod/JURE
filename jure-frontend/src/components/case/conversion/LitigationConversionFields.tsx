'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ServerSelect from '@/components/common/ServerSelect';
import { Plus, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

const LITIGATION_TYPE_OPTIONS = [
  'CIVIL',
  'CRIMINAL',
  'COMMERCIAL',
  'ADMINISTRATIVE',
  'LABOR',
  'FAMILY',
] as const;

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED'] as const;

export type LitigationConversionState = {
  litigation_type: string;
  priority: string;
  client_role: '' | 'PLAINTIFF' | 'DEFENDANT';
  opposing_party: string;
  opposing_counsel: string;
  court_name: string;
  jurisdiction: string;
  chamber: string;
  judge_name: string;
  court_case_number: string;
  co_counsel_slots: (number | null)[];
  filing_date: string;
  first_hearing_date: string;
  next_hearing_date: string;
  statute_of_limitations_date: string;
  key_deadlines: { label: string; date: string }[];
  legal_arguments: string;
  status: string;
};

export const defaultLitigationConversionState = (): LitigationConversionState => ({
  litigation_type: 'CIVIL',
  priority: 'MEDIUM',
  client_role: '',
  opposing_party: '',
  opposing_counsel: '',
  court_name: '',
  jurisdiction: '',
  chamber: '',
  judge_name: '',
  court_case_number: '',
  co_counsel_slots: [],
  filing_date: '',
  first_hearing_date: '',
  next_hearing_date: '',
  statute_of_limitations_date: '',
  key_deadlines: [],
  legal_arguments: '',
  status: 'OPEN',
});

type Props = {
  values: LitigationConversionState;
  onChange: (next: Partial<LitigationConversionState>) => void;
  fieldErrors: Record<string, string>;
};

export function LitigationConversionFields({ values, onChange, fieldErrors }: Props) {
  const { enumPretty } = useAppTranslation();
  const setDeadline = (i: number, field: 'label' | 'date', v: string) => {
    const next = [...values.key_deadlines];
    next[i] = { ...next[i], [field]: v };
    onChange({ key_deadlines: next });
  };
  const addDeadline = () => onChange({ key_deadlines: [...values.key_deadlines, { label: '', date: '' }] });
  const removeDeadline = (i: number) =>
    onChange({ key_deadlines: values.key_deadlines.filter((_, j) => j !== i) });

  const setCoSlot = (i: number, v: number | null) => {
    const next = [...values.co_counsel_slots];
    next[i] = v;
    onChange({ co_counsel_slots: next });
  };
  const addCoRow = () => onChange({ co_counsel_slots: [...values.co_counsel_slots, null] });
  const removeCoRow = (i: number) =>
    onChange({ co_counsel_slots: values.co_counsel_slots.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[13px]">Litigation Type</Label>
          <Select
            value={values.litigation_type}
            onValueChange={(v) => onChange({ litigation_type: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LITIGATION_TYPE_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {enumPretty(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Priority</Label>
          <Select value={values.priority} onValueChange={(v) => onChange({ priority: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {enumPretty(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Client Role</Label>
        <RadioGroup
          value={values.client_role === '' ? 'none' : values.client_role}
          onValueChange={(v) =>
            onChange({ client_role: v === 'none' ? '' : (v as 'PLAINTIFF' | 'DEFENDANT') })
          }
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="PLAINTIFF" id="conv_plaintiff" />
            <Label htmlFor="conv_plaintiff" className="font-normal">
              {enumPretty('PLAINTIFF')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="DEFENDANT" id="conv_defendant" />
            <Label htmlFor="conv_defendant" className="font-normal">
              {enumPretty('DEFENDANT')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="none" id="conv_role_none" />
            <Label htmlFor="conv_role_none" className="font-normal text-slate-500">
              Not set
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[13px]">Opposing Party</Label>
          <Input
            className="h-9"
            value={values.opposing_party}
            onChange={(e) => onChange({ opposing_party: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Opposing Counsel</Label>
          <Input
            className="h-9"
            value={values.opposing_counsel}
            onChange={(e) => onChange({ opposing_counsel: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-[13px]">Court Name</Label>
          <Input
            className="h-9"
            value={values.court_name}
            onChange={(e) => onChange({ court_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Jurisdiction</Label>
          <Input
            className="h-9"
            value={values.jurisdiction}
            onChange={(e) => onChange({ jurisdiction: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Chamber</Label>
          <Input
            className="h-9"
            value={values.chamber}
            onChange={(e) => onChange({ chamber: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Judge Name</Label>
          <Input
            className="h-9"
            value={values.judge_name}
            onChange={(e) => onChange({ judge_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Court Case Number</Label>
          <Input
            className="h-9"
            value={values.court_case_number}
            onChange={(e) => onChange({ court_case_number: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Co-counsel</Label>
        <p className="text-[11px] text-slate-500">Select team members from your cabinet.</p>
        <div className="space-y-2">
          {values.co_counsel_slots.map((slot, i) => (
            <div key={i} className="flex gap-2">
              <ServerSelect
                link="/cabinets/members/select_list"
                value={slot ?? undefined}
                onChange={(v) => setCoSlot(i, v != null && v !== '' ? Number(v) : null)}
                labelKey={(u: { first_name?: string; last_name?: string; email?: string }) =>
                  `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || 'Member'
                }
                cleanable
                placeholder="Select member"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => removeCoRow(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addCoRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add co-counsel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['filing_date', 'Filing Date', values.filing_date],
            ['first_hearing_date', 'First Hearing Date', values.first_hearing_date],
            ['next_hearing_date', 'Next Hearing Date', values.next_hearing_date],
            ['statute_of_limitations_date', 'Statute of Limitations Date', values.statute_of_limitations_date],
          ] as const
        ).map(([key, label, val]) => (
          <div key={key} className="space-y-2">
            <Label className="text-[13px]">{label}</Label>
            <Input
              type="date"
              className="h-9"
              value={val}
              onChange={(e) => onChange({ [key]: e.target.value } as Partial<LitigationConversionState>)}
            />
            {fieldErrors[key] && <p className="text-[11px] text-red-600">{fieldErrors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Key Deadlines</Label>
        <div className="space-y-2">
          {values.key_deadlines.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="h-9 flex-1"
                placeholder="Label"
                value={item.label}
                onChange={(e) => setDeadline(i, 'label', e.target.value)}
              />
              <Input
                type="date"
                className="h-9 w-[140px]"
                value={item.date}
                onChange={(e) => setDeadline(i, 'date', e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => removeDeadline(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDeadline}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add deadline
          </Button>
        </div>
        {fieldErrors.key_deadlines && (
          <p className="text-[11px] text-red-600">{fieldErrors.key_deadlines}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Legal Arguments</Label>
        <Textarea
          className="min-h-[80px] resize-none text-[13px]"
          value={values.legal_arguments}
          onChange={(e) => onChange({ legal_arguments: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Status</Label>
        <Select value={values.status} onValueChange={(v) => onChange({ status: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {enumPretty(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
