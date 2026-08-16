'use client';

import React, { useMemo } from 'react';
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
import { DialogFooter } from '@/components/ui/dialog';
import ServerSelect from '@/components/common/ServerSelect';
import { Loader2 } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_INPUT_CLASS,
  CREATE_SELECT_CLASS,
  CREATE_SERVER_SELECT_CLASS,
  CREATE_SUBMIT_CLASS,
  CREATE_TEXTAREA_CLASS,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';

export type ConsultationFormValues = {
  reference: string;
  title: string;
  consultation_type: 'INITIAL' | 'FOLLOW_UP' | 'URGENT';
  client?: number | null;
  assigned_to?: number | null;
  consultation_date: string;
  duration: '30min' | '1h' | '2h' | 'CUSTOM';
  format: 'IN_PERSON' | 'PHONE' | 'VIDEO';
  legal_domain: 'FAMILY' | 'CRIMINAL' | 'CORPORATE' | 'LABOR' | 'REAL_ESTATE' | 'OTHER';
  legal_question: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CONVERTED_TO_CASE';
  advice_summary?: string;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  case_type: 'CONSULTATION';
};

export interface ConsultationFormProps {
  initialValues?: Partial<ConsultationFormValues>;
  mode: 'create' | 'edit';
  caseId?: number;
  onSubmitSuccess?: (caseItem: API.Case) => void;
  onBack?: () => void;
}

const ConsultationForm: React.FC<ConsultationFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const { t } = useAppTranslation();
  const modal = t.cases.modal;

  const consultationTypeOptions = useMemo(
    () =>
      (['INITIAL', 'FOLLOW_UP', 'URGENT'] as const).map((value) => ({
        value,
        label: modal.options.consultationType[value],
      })),
    [modal.options.consultationType]
  );

  const durationOptions = useMemo(
    () =>
      [
        { value: '30min' as const, label: modal.options.duration.min30 },
        { value: '1h' as const, label: modal.options.duration.h1 },
        { value: '2h' as const, label: modal.options.duration.h2 },
        { value: 'CUSTOM' as const, label: modal.options.duration.CUSTOM },
      ],
    [modal.options.duration]
  );

  const formatOptions = useMemo(
    () =>
      (['IN_PERSON', 'PHONE', 'VIDEO'] as const).map((value) => ({
        value,
        label: modal.options.format[value],
      })),
    [modal.options.format]
  );

  const legalDomainOptions = useMemo(
    () =>
      (['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'] as const).map(
        (value) => ({
          value,
          label: modal.options.legalDomain[value],
        })
      ),
    [modal.options.legalDomain]
  );

  const statusOptions = useMemo(
    () =>
      (['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'] as const).map((value) => ({
        value,
        label: modal.options.consultationStatus[value],
      })),
    [modal.options.consultationStatus]
  );

  const schema = useMemo(
    () =>
      yup.object({
        reference: yup.string().optional().default(''),
        title: yup.string().required(modal.validation.titleRequired),
        consultation_type: yup.string().oneOf(['INITIAL', 'FOLLOW_UP', 'URGENT']).required(),
        client: yup
          .number()
          .nullable()
          .optional()
          .transform((v, orig) =>
            orig === '' || orig == null || orig === undefined ? null : Number(orig)
          ),
        assigned_to: yup
          .number()
          .nullable()
          .optional()
          .transform((v, orig) =>
            orig === '' || orig == null || orig === undefined ? null : Number(orig)
          ),
        consultation_date: yup.string().required(modal.validation.consultationDateRequired),
        duration: yup.string().oneOf(['30min', '1h', '2h', 'CUSTOM']).required(),
        format: yup.string().oneOf(['IN_PERSON', 'PHONE', 'VIDEO']).required(),
        legal_domain: yup
          .string()
          .oneOf(['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'])
          .required(),
        legal_question: yup.string().required(modal.validation.legalQuestionRequired),
        status: yup
          .string()
          .oneOf(['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'])
          .required(),
        advice_summary: yup.string().optional(),
        follow_up_required: yup.boolean().optional(),
        follow_up_date: yup.string().nullable().optional(),
      }),
    [modal.validation]
  );

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
        consultation_type: data.consultation_type,
        client: data.client ?? null,
        assigned_to: data.assigned_to ?? null,
        consultation_date: consultationDateIso,
        duration: data.duration,
        format: data.format,
        legal_domain: data.legal_domain,
        legal_question: data.legal_question,
        status: data.status,
        advice_summary: data.advice_summary || undefined,
        follow_up_required: data.follow_up_required ?? false,
        follow_up_date: data.follow_up_required ? data.follow_up_date || null : null,
      };
      if (mode === 'edit' && caseId) {
        handleUpdate({ ...payload, id: caseId });
      } else {
        handleCreate(payload);
      }
    },
    (errors) => {
      const msg = Object.values(errors)
        .map((e) => e?.message)
        .filter(Boolean)[0];
      toast({
        title: modal.toasts.fixFormTitle,
        description: msg || modal.toasts.fixFormDescription,
        variant: 'destructive',
      });
    }
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      noValidate
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
      <div className="space-y-6">
      {form.formState.errors.case_specific_data && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {form.formState.errors.case_specific_data.message}
        </div>
      )}
      <CreateFormSection index="01" title={modal.sections.basicInfo}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.reference}{' '}
              <span className="text-slate-400 text-xs">{modal.hints.referenceOptionalAuto}</span>
            </label>
            <Input
              {...form.register('reference')}
              placeholder={modal.placeholders.referenceAuto}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.reference && (
              <p className="text-red-500 text-xs">{form.formState.errors.reference.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.title} <span className="text-red-500">*</span>
            </label>
            <Input
              {...form.register('title')}
              placeholder={modal.placeholders.consultationTitle}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.consultationType} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('consultation_type')}
              onValueChange={(v) =>
                form.setValue('consultation_type', v as ConsultationFormValues['consultation_type'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue placeholder={modal.placeholders.selectType} />
              </SelectTrigger>
              <SelectContent>
                {consultationTypeOptions.map((opt) => (
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
      </CreateFormSection>

      <CreateFormSection index="02" title={modal.sections.clientScheduling}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.relatedClient}{' '}
              <span className="text-slate-400 text-xs">({t.common.optional})</span>
            </label>
            <ServerSelect
              link="/clients/clients/"
              value={form.watch('client')}
              onChange={(v) => form.setValue('client', v ?? null)}
              labelKey={(c: { first_name?: string; last_name?: string; email?: string }) =>
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || t.cases.unnamed
              }
              cleanable
              placeholder={modal.placeholders.client}
              className={CREATE_SERVER_SELECT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.assignedAttorney}{' '}
              <span className="text-slate-400 text-xs">({t.common.optional})</span>
            </label>
            <ServerSelect
              link="/cabinets/members/select_list"
              value={form.watch('assigned_to')}
              onChange={(v) => form.setValue('assigned_to', v ? Number(v) : null)}
              labelKey="email"
              cleanable
              className={CREATE_SERVER_SELECT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.consultationDateTime} <span className="text-red-500">*</span>
            </label>
            <Input
              type="datetime-local"
              {...form.register('consultation_date')}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.consultation_date && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.consultation_date.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.duration} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('duration')}
              onValueChange={(v) => form.setValue('duration', v as ConsultationFormValues['duration'])}
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue placeholder={modal.placeholders.selectDuration} />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.format} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('format')}
              onValueChange={(v) => form.setValue('format', v as ConsultationFormValues['format'])}
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue placeholder={modal.placeholders.selectFormat} />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((opt) => (
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
      </CreateFormSection>

      <CreateFormSection index="03" title={modal.sections.legalContext}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.legalDomain} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('legal_domain')}
              onValueChange={(v) =>
                form.setValue('legal_domain', v as ConsultationFormValues['legal_domain'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue placeholder={modal.placeholders.selectDomain} />
              </SelectTrigger>
              <SelectContent>
                {legalDomainOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.legalQuestion} <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...form.register('legal_question')}
              placeholder={modal.placeholders.legalQuestion}
              className={CREATE_TEXTAREA_CLASS}
            />
            {form.formState.errors.legal_question && (
              <p className="text-red-500 text-xs">{form.formState.errors.legal_question.message}</p>
            )}
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="04" title={modal.sections.outcome}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.status}
            </label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as ConsultationFormValues['status'])}
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue placeholder={modal.placeholders.status} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.adviceSummary}
            </label>
            <Textarea
              {...form.register('advice_summary')}
              placeholder={modal.placeholders.adviceSummary}
              className={CREATE_TEXTAREA_CLASS}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="follow_up_required"
              checked={form.watch('follow_up_required') ?? false}
              onCheckedChange={(c) => form.setValue('follow_up_required', !!c)}
            />
            <label htmlFor="follow_up_required" className="text-sm font-medium cursor-pointer">
              {modal.fields.followUpRequired}
            </label>
          </div>
          {followUpRequired && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {modal.fields.followUpDate}
              </label>
              <Input type="date" {...form.register('follow_up_date')} className={CREATE_INPUT_CLASS} />
            </div>
          )}
        </div>
      </CreateFormSection>
      </div>
      </div>

      <DialogFooter className={cn(CREATE_FOOTER_CLASS, onBack && 'justify-between')}>
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className={CREATE_CANCEL_CLASS}>
            {modal.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isLoading} className={CREATE_SUBMIT_CLASS}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {modal.submitting}
            </>
          ) : mode === 'edit' ? (
            modal.updateCase
          ) : (
            modal.createCase
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ConsultationForm;
