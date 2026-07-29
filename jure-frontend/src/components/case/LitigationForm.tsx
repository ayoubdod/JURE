'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ServerSelect from '@/components/common/ServerSelect';
import { FileText, Loader2, Users, Gavel, UserCheck, Calendar, AlignJustify } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

const LITIGATION_TYPE_OPTIONS = [
  { label: 'Civil', value: 'CIVIL' },
  { label: 'Criminal', value: 'CRIMINAL' },
  { label: 'Commercial', value: 'COMMERCIAL' },
  { label: 'Administrative', value: 'ADMINISTRATIVE' },
  { label: 'Labor', value: 'LABOR' },
  { label: 'Family', value: 'FAMILY' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const schema = yup.object({
  reference: yup.string().optional().default(''),
  title: yup.string().required('Title / Case Name is required'),
  litigation_type: yup
    .string()
    .oneOf(['CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'])
    .required(),
  priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).required(),
  client: yup.number().nullable().optional().transform((_, orig) => (orig === '' || orig == null || orig === undefined ? null : Number(orig))),
  client_role: yup.string().oneOf(['PLAINTIFF', 'DEFENDANT']).nullable().optional(),
  opposing_party_name: yup.string().optional(),
  opposing_counsel: yup.string().optional(),
  court_name: yup.string().required('Court name is required'),
  jurisdiction: yup.string().optional(),
  chamber_division: yup.string().optional(),
  judge_name: yup.string().optional(),
  court_case_number: yup.string().optional(),
  lead_attorney: yup.number().nullable().optional(),
  filing_date: yup.string().nullable().optional(),
  first_hearing_date: yup.string().nullable().optional(),
  next_hearing_date: yup.string().nullable().optional(),
  statute_of_limitations_date: yup.string().nullable().optional(),
  description: yup.string().required('Description / Facts is required'),
  legal_arguments: yup.string().optional(),
  status: yup
    .string()
    .oneOf(['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED'])
    .required(),
});

export type LitigationFormValues = yup.InferType<typeof schema> & {
  case_type: 'LITIGATION';
  third_parties?: string[];
  key_deadlines?: { label: string; date: string }[];
  co_counsel?: number[];
};

export interface LitigationFormProps {
  initialValues?: Partial<LitigationFormValues>;
  mode: 'create' | 'edit';
  caseId?: number;
  onSubmitSuccess?: (caseItem: API.Case) => void;
  onBack?: () => void;
}

const FormSection: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-gray-800">
      <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <span>{title}</span>
    </div>
    {children}
  </div>
);

const LitigationForm: React.FC<LitigationFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const [thirdParties, setThirdParties] = useState<string[]>(
    initialValues?.third_parties?.length ? [...initialValues.third_parties] : ['']
  );
  const [keyDeadlines, setKeyDeadlines] = useState<{ label: string; date: string }[]>(
    initialValues?.key_deadlines?.length ? [...initialValues.key_deadlines] : [{ label: '', date: '' }]
  );

  const form = useForm<LitigationFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      reference: initialValues?.reference ?? '',
      title: initialValues?.title ?? '',
      litigation_type: initialValues?.litigation_type ?? 'CIVIL',
      priority: initialValues?.priority ?? 'MEDIUM',
      client: initialValues?.client ?? null,
      client_role: initialValues?.client_role ?? null,
      opposing_party_name: initialValues?.opposing_party_name ?? '',
      opposing_counsel: initialValues?.opposing_counsel ?? '',
      court_name: initialValues?.court_name ?? '',
      jurisdiction: initialValues?.jurisdiction ?? '',
      chamber_division: initialValues?.chamber_division ?? '',
      judge_name: initialValues?.judge_name ?? '',
      court_case_number: initialValues?.court_case_number ?? '',
      lead_attorney: initialValues?.lead_attorney ?? null,
      filing_date: initialValues?.filing_date ?? null,
      first_hearing_date: initialValues?.first_hearing_date ?? null,
      next_hearing_date: initialValues?.next_hearing_date ?? null,
      statute_of_limitations_date: initialValues?.statute_of_limitations_date ?? null,
      description: initialValues?.description ?? '',
      legal_arguments: initialValues?.legal_arguments ?? '',
      status: initialValues?.status ?? 'OPEN',
    },
  });

  const { handleCreate, handleUpdate, isLoading } = useCaseForm(
    form.setError as never,
    onSubmitSuccess,
    undefined
  );
  const { toast } = useToast();

  const addThirdParty = () => setThirdParties((p) => [...p, '']);
  const removeThirdParty = (i: number) =>
    setThirdParties((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : ['']));
  const updateThirdParty = (i: number, v: string) =>
    setThirdParties((p) => {
      const next = [...p];
      next[i] = v;
      return next;
    });

  const addKeyDeadline = () => setKeyDeadlines((d) => [...d, { label: '', date: '' }]);
  const removeKeyDeadline = (i: number) =>
    setKeyDeadlines((d) => (d.length > 1 ? d.filter((_, j) => j !== i) : [{ label: '', date: '' }]));
  const updateKeyDeadline = (
    i: number,
    field: 'label' | 'date',
    value: string
  ) =>
    setKeyDeadlines((d) => {
      const next = [...d];
      next[i] = { ...next[i], [field]: value };
      return next;
    });

  const handleSubmit = form.handleSubmit((data) => {
    const payload: API.LitigationFormData = {
      case_type: 'LITIGATION',
      reference: data.reference,
      title: data.title,
      litigation_type: data.litigation_type as API.LitigationFormData['litigation_type'],
      priority: data.priority as API.LitigationFormData['priority'],
      client: data.client ?? null,
      assigned_to: data.lead_attorney ?? null,
      client_role: data.client_role ?? null,
      opposing_party_name: data.opposing_party_name || undefined,
      opposing_counsel: data.opposing_counsel || undefined,
      third_parties: thirdParties.filter((s) => s.trim()).length ? thirdParties.filter((s) => s.trim()) : undefined,
      court_name: data.court_name,
      jurisdiction: data.jurisdiction || undefined,
      chamber_division: data.chamber_division || undefined,
      judge_name: data.judge_name || undefined,
      court_case_number: data.court_case_number || undefined,
      lead_attorney: data.lead_attorney ?? null,
      co_counsel: form.watch('co_counsel') ?? [],
      filing_date: data.filing_date || null,
      first_hearing_date: data.first_hearing_date || null,
      next_hearing_date: data.next_hearing_date || null,
      statute_of_limitations_date: data.statute_of_limitations_date || null,
      key_deadlines:
        keyDeadlines.filter((d) => d.label.trim() || d.date).length > 0
          ? keyDeadlines.filter((d) => d.label.trim() || d.date)
          : undefined,
      description: data.description,
      legal_arguments: data.legal_arguments || undefined,
      status: data.status as API.LitigationFormData['status'],
    };
    if (mode === 'edit' && caseId) {
      handleUpdate({ ...payload, id: caseId });
    } else {
      handleCreate(payload);
    }
  },
    (errors) => {
      const msg = Object.values(errors).map((e) => e?.message).filter(Boolean)[0];
      toast({ title: 'Please fix the form', description: msg || 'Some required fields are missing.', variant: 'destructive' });
    }
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {form.formState.errors.case_specific_data && (
        <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[13px]">
          {form.formState.errors.case_specific_data.message}
        </div>
      )}
      <FormSection title="Basic Info" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reference <span className="text-red-500">*</span>
            </label>
            <Input
              {...form.register('reference')}
              placeholder="Case reference"
              className="h-10"
            />
            {form.formState.errors.reference && (
              <p className="text-red-500 text-xs">{form.formState.errors.reference.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Title / Case Name <span className="text-red-500">*</span>
            </label>
            <Input {...form.register('title')} placeholder="Case name" className="h-10" />
            {form.formState.errors.title && (
              <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Litigation Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('litigation_type')}
              onValueChange={(v) => form.setValue('litigation_type', v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LITIGATION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <Select value={form.watch('priority')} onValueChange={(v) => form.setValue('priority', v)}>
              <SelectTrigger className="h-10">
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
      </FormSection>

      <FormSection title="Parties" icon={Users}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Related Client
            </label>
            <ServerSelect
              link="/clients/clients/"
              value={form.watch('client')}
              onChange={(v) => form.setValue('client', v ?? null)}
              labelKey={(c: { first_name?: string; last_name?: string; email?: string }) =>
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unnamed'
              }
              cleanable
              placeholder="Select a client"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Client Role
            </label>
            <RadioGroup
              value={form.watch('client_role') ?? ''}
              onValueChange={(v) => form.setValue('client_role', v === '' ? null : v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PLAINTIFF" id="client_plaintiff" />
                <Label htmlFor="client_plaintiff">Plaintiff</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="DEFENDANT" id="client_defendant" />
                <Label htmlFor="client_defendant">Defendant</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Opposing Party Name
            </label>
            <Input {...form.register('opposing_party_name')} placeholder="Name" className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Opposing Counsel
            </label>
            <Input {...form.register('opposing_counsel')} placeholder="Name / firm" className="h-10" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Third Parties
            </label>
            <div className="space-y-2">
              {thirdParties.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={val}
                    onChange={(e) => updateThirdParty(i, e.target.value)}
                    placeholder="Third party name"
                    className="h-10 flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeThirdParty(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addThirdParty}>
                <Plus className="w-4 h-4 mr-1" />
                Add row
              </Button>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Court & Jurisdiction" icon={Gavel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Court Name <span className="text-red-500">*</span>
            </label>
            <Input {...form.register('court_name')} placeholder="Court name" className="h-10" />
            {form.formState.errors.court_name && (
              <p className="text-red-500 text-xs">{form.formState.errors.court_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Jurisdiction / City
            </label>
            <Input {...form.register('jurisdiction')} placeholder="City" className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Chamber / Division
            </label>
            <Input {...form.register('chamber_division')} placeholder="Division" className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Judge Name
            </label>
            <Input {...form.register('judge_name')} placeholder="Judge" className="h-10" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Court Case Number
            </label>
            <Input {...form.register('court_case_number')} placeholder="Number" className="h-10" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Assigned Team" icon={UserCheck}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Lead Attorney
            </label>
            <ServerSelect
              link="/cabinets/members/select_list"
              value={form.watch('lead_attorney')}
              onChange={(v) => form.setValue('lead_attorney', v ? Number(v) : null)}
              labelKey="email"
              cleanable
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Co-counsel <span className="text-slate-400 text-xs">(multi-select via add)</span>
            </label>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Multiple attorneys can be assigned; use Lead Attorney for primary.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Timeline & Deadlines" icon={Calendar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filing Date
            </label>
            <Input type="date" {...form.register('filing_date')} className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              First Hearing Date
            </label>
            <Input type="date" {...form.register('first_hearing_date')} className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Next Hearing Date
            </label>
            <Input type="date" {...form.register('next_hearing_date')} className="h-10" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Statute of Limitations Date
            </label>
            <Input type="date" {...form.register('statute_of_limitations_date')} className="h-10" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Key Deadlines
            </label>
            <div className="space-y-2">
              {keyDeadlines.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={item.label}
                    onChange={(e) => updateKeyDeadline(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="h-10 flex-1"
                  />
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateKeyDeadline(i, 'date', e.target.value)}
                    className="h-10 w-[140px]"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeKeyDeadline(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addKeyDeadline}>
                <Plus className="w-4 h-4 mr-1" />
                Add deadline
              </Button>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Case Details" icon={AlignJustify}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description / Facts <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...form.register('description')}
              placeholder="Case description and facts"
              className="min-h-[100px] resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-xs">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Legal Arguments
            </label>
            <Textarea
              {...form.register('legal_arguments')}
              placeholder="Legal arguments"
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v)}>
              <SelectTrigger className="h-10">
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
      </FormSection>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 gap-3">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
            Back
          </Button>
        )}
        {!onBack && <div />}
        <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
          {isLoading ? 'Submitting...' : mode === 'edit' ? 'Update Case' : 'Create Case'}
        </Button>
      </div>
    </form>
  );
};

export default LitigationForm;
