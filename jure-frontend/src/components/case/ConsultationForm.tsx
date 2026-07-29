'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { FileText, Loader2, MessageCircle, Calendar, Scale } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';

const CONSULTATION_TYPE_OPTIONS = [
  { label: 'Initial', value: 'INITIAL' },
  { label: 'Follow-up', value: 'FOLLOW_UP' },
  { label: 'Urgent', value: 'URGENT' },
];

const DURATION_OPTIONS = [
  { label: '30 minutes', value: '30min' },
  { label: '1 hour', value: '1h' },
  { label: '2 hours', value: '2h' },
  { label: 'Custom', value: 'CUSTOM' },
];

const FORMAT_OPTIONS = [
  { label: 'In Person', value: 'IN_PERSON' },
  { label: 'Phone', value: 'PHONE' },
  { label: 'Video', value: 'VIDEO' },
];

const LEGAL_DOMAIN_OPTIONS = [
  { label: 'Family', value: 'FAMILY' },
  { label: 'Criminal', value: 'CRIMINAL' },
  { label: 'Corporate', value: 'CORPORATE' },
  { label: 'Labor', value: 'LABOR' },
  { label: 'Real Estate', value: 'REAL_ESTATE' },
  { label: 'Other', value: 'OTHER' },
];

const STATUS_OPTIONS = [
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'No Show', value: 'NO_SHOW' },
  { label: 'Converted to Case', value: 'CONVERTED_TO_CASE' },
];

const schema = yup.object({
  reference: yup.string().optional().default(''),
  title: yup.string().required('Title is required'),
  consultation_type: yup.string().oneOf(['INITIAL', 'FOLLOW_UP', 'URGENT']).required(),
  client: yup.number().nullable().optional().transform((v, orig) => (orig === '' || orig == null || orig === undefined ? null : Number(orig))),
  assigned_to: yup.number().nullable().optional().transform((v, orig) => (orig === '' || orig == null || orig === undefined ? null : Number(orig))),
  consultation_date: yup.string().required('Consultation date and time is required'),
  duration: yup.string().oneOf(['30min', '1h', '2h', 'CUSTOM']).required(),
  format: yup.string().oneOf(['IN_PERSON', 'PHONE', 'VIDEO']).required(),
  legal_domain: yup.string().oneOf(['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER']).required(),
  legal_question: yup.string().required('Legal question / subject is required'),
  status: yup.string().oneOf(['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE']).required(),
  advice_summary: yup.string().optional(),
  follow_up_required: yup.boolean().optional(),
  follow_up_date: yup.string().nullable().optional(),
});

export type ConsultationFormValues = yup.InferType<typeof schema> & {
  case_type: 'CONSULTATION';
  assigned_to?: number | null;
  client?: number | null;
};

export interface ConsultationFormProps {
  initialValues?: Partial<ConsultationFormValues>;
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

const ConsultationForm: React.FC<ConsultationFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const form = useForm<ConsultationFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      reference: initialValues?.reference ?? '',
      title: initialValues?.title ?? '',
      consultation_type: initialValues?.consultation_type ?? 'INITIAL',
      client: initialValues?.client ?? null,
      assigned_to: initialValues?.assigned_to ?? null,
      consultation_date: initialValues?.consultation_date ?? '',
      duration: initialValues?.duration ?? '1h',
      format: initialValues?.format ?? 'IN_PERSON',
      legal_domain: initialValues?.legal_domain ?? 'OTHER',
      legal_question: initialValues?.legal_question ?? '',
      status: initialValues?.status ?? 'SCHEDULED',
      advice_summary: initialValues?.advice_summary ?? '',
      follow_up_required: initialValues?.follow_up_required ?? false,
      follow_up_date: initialValues?.follow_up_date ?? null,
    },
  });

  const { handleCreate, handleUpdate, isLoading } = useCaseForm(
    form.setError as never,
    onSubmitSuccess,
    undefined
  );
  const { toast } = useToast();

  const followUpRequired = form.watch('follow_up_required');

  const handleSubmit = form.handleSubmit(
    (data) => {
    const consultationDateIso =
      data.consultation_date && data.consultation_date.includes('T')
        ? new Date(data.consultation_date).toISOString()
        : data.consultation_date;
    const payload: API.ConsultationFormData = {
      case_type: 'CONSULTATION',
      reference: data.reference,
      title: data.title,
      consultation_type: data.consultation_type as 'INITIAL' | 'FOLLOW_UP' | 'URGENT',
      client: data.client ?? null,
      assigned_to: data.assigned_to ?? null,
      consultation_date: consultationDateIso,
      duration: data.duration as '30min' | '1h' | '2h' | 'CUSTOM',
      format: data.format as 'IN_PERSON' | 'PHONE' | 'VIDEO',
      legal_domain: data.legal_domain as 'FAMILY' | 'CRIMINAL' | 'CORPORATE' | 'LABOR' | 'REAL_ESTATE' | 'OTHER',
      legal_question: data.legal_question,
      status: data.status as 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CONVERTED_TO_CASE',
      advice_summary: data.advice_summary || undefined,
      follow_up_required: data.follow_up_required ?? false,
      follow_up_date: data.follow_up_required ? (data.follow_up_date || null) : null,
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
              Reference <span className="text-slate-400 text-xs">(optional, auto-generated if empty)</span>
            </label>
            <Input
              {...form.register('reference')}
              placeholder="Auto-generated or enter reference"
              className="h-10"
            />
            {form.formState.errors.reference && (
              <p className="text-red-500 text-xs">{form.formState.errors.reference.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Title <span className="text-red-500">*</span>
            </label>
            <Input {...form.register('title')} placeholder="Consultation title" className="h-10" />
            {form.formState.errors.title && (
              <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Consultation Type <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('consultation_type')}
              onValueChange={(v) => form.setValue('consultation_type', v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONSULTATION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.consultation_type && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.consultation_type.message}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Client & Scheduling" icon={MessageCircle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Related Client <span className="text-slate-400 text-xs">(optional)</span>
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
              Assigned Attorney <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <ServerSelect
              link="/cabinets/members/select_list"
              value={form.watch('assigned_to')}
              onChange={(v) => form.setValue('assigned_to', v ? Number(v) : null)}
              labelKey="email"
              cleanable
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Consultation Date & Time <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              {...form.register('consultation_date')}
              className="h-10"
            />
            {form.formState.errors.consultation_date && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.consultation_date.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Duration <span className="text-red-500">*</span>
            </label>
            <Select value={form.watch('duration')} onValueChange={(v) => form.setValue('duration', v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Format <span className="text-red-500">*</span>
            </label>
            <Select value={form.watch('format')} onValueChange={(v) => form.setValue('format', v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.format && (
              <p className="text-red-500 text-xs">{form.formState.errors.format.message}</p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Legal Context" icon={Scale}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Legal Domain <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('legal_domain')}
              onValueChange={(v) => form.setValue('legal_domain', v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_DOMAIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Legal Question / Subject <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...form.register('legal_question')}
              placeholder="Describe the legal question or subject"
              className="min-h-[80px] resize-none"
            />
            {form.formState.errors.legal_question && (
              <p className="text-red-500 text-xs">{form.formState.errors.legal_question.message}</p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Outcome" icon={Calendar}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select status" />
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Advice Summary / Notes
            </label>
            <Textarea
              {...form.register('advice_summary')}
              placeholder="Summary of advice given"
              className="min-h-[60px] resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="follow_up_required"
              checked={form.watch('follow_up_required') ?? false}
              onCheckedChange={(c) => form.setValue('follow_up_required', !!c)}
            />
            <label htmlFor="follow_up_required" className="text-sm font-medium cursor-pointer">
              Follow-up Required
            </label>
          </div>
          {followUpRequired && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Follow-up Date
              </label>
              <Input
                type="date"
                {...form.register('follow_up_date')}
                className="h-10"
              />
            </div>
          )}
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
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            mode === 'edit' ? 'Update Case' : 'Create Case'
          )}
        </Button>
      </div>
    </form>
  );
};

export default ConsultationForm;
