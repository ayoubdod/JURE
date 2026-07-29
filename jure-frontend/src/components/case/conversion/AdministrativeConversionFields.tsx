'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

const DUTY_TYPE_OPTIONS = [
  { label: 'Corporate Filing', value: 'CORPORATE_FILING' },
  { label: 'Property Registration', value: 'PROPERTY_REGISTRATION' },
  { label: 'Notarial Act', value: 'NOTARIAL_ACT' },
  { label: 'Permit', value: 'PERMIT' },
  { label: 'Compliance', value: 'COMPLIANCE' },
  { label: 'Inheritance', value: 'INHERITANCE' },
  { label: 'Other', value: 'OTHER' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Closed', value: 'CLOSED' },
];

export type AdministrativeConversionState = {
  duty_type: string;
  priority: string;
  institution: string;
  institution_reference_number: string;
  start_date: string;
  due_date: string;
  required_documents: { label: string; completed: boolean }[];
  status: string;
};

export const defaultAdministrativeConversionState = (): AdministrativeConversionState => ({
  duty_type: 'CORPORATE_FILING',
  priority: 'MEDIUM',
  institution: '',
  institution_reference_number: '',
  start_date: '',
  due_date: '',
  required_documents: [],
  status: 'PENDING',
});

type Props = {
  values: AdministrativeConversionState;
  onChange: (next: Partial<AdministrativeConversionState>) => void;
  fieldErrors: Record<string, string>;
};

export function AdministrativeConversionFields({ values, onChange, fieldErrors }: Props) {
  const setDoc = (i: number, field: 'label' | 'completed', v: string | boolean) => {
    const next = [...values.required_documents];
    next[i] = { ...next[i], [field]: v };
    onChange({ required_documents: next });
  };
  const addDoc = () =>
    onChange({ required_documents: [...values.required_documents, { label: '', completed: false }] });
  const removeDoc = (i: number) =>
    onChange({ required_documents: values.required_documents.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[13px]">Duty Type</Label>
          <Select value={values.duty_type} onValueChange={(v) => onChange({ duty_type: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DUTY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-[13px]">Institution / Authority</Label>
          <Input
            className="h-9"
            value={values.institution}
            onChange={(e) => onChange({ institution: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-[13px]">Institution Reference Number (optional)</Label>
          <Input
            className="h-9"
            value={values.institution_reference_number}
            onChange={(e) => onChange({ institution_reference_number: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[13px]">Start Date</Label>
          <Input
            type="date"
            className="h-9"
            value={values.start_date}
            onChange={(e) => onChange({ start_date: e.target.value })}
          />
          {fieldErrors.start_date && (
            <p className="text-[11px] text-red-600">{fieldErrors.start_date}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[13px]">Due Date / Legal Deadline</Label>
          <Input
            type="date"
            className="h-9"
            value={values.due_date}
            onChange={(e) => onChange({ due_date: e.target.value })}
          />
          {fieldErrors.due_date && (
            <p className="text-[11px] text-red-600">{fieldErrors.due_date}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Required Documents</Label>
        <div className="space-y-2">
          {values.required_documents.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                className="h-9 flex-1"
                placeholder="Document label"
                value={item.label}
                onChange={(e) => setDoc(i, 'label', e.target.value)}
              />
              <label className="flex items-center gap-2 shrink-0 text-[12px] text-slate-600 dark:text-slate-400">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(ch) => setDoc(i, 'completed', ch === true)}
                />
                Done
              </label>
              <Button type="button" variant="outline" size="icon" onClick={() => removeDoc(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDoc}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add document
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[13px]">Status</Label>
        <Select value={values.status} onValueChange={(v) => onChange({ status: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
