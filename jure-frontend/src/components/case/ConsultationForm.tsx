'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { DialogFooter } from '@/components/ui/dialog';
import ServerSelect from '@/components/common/ServerSelect';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import ClientCreateModal, { type ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation, formatTime } from '@/i18n';
import { cn } from '@/lib/utils';
import { apiGetClient } from '@/services/client/api';
import { apiCreateFollowUpConsultation, apiUploadCaseAttachment } from '@/services/case/api';
import { toBackendCaseCreatePayload } from '@/services/case/payloadBuilder';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_INPUT_CLASS,
  CREATE_SELECT_CLASS,
  CREATE_SERVER_SELECT_CLASS,
  CREATE_SUBMIT_CLASS,
  CREATE_TEXTAREA_CLASS,
  CreateFormField,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';

export type ConsultationFormValues = {
  reference: string;
  title: string;
  consultation_type: 'PREVENTIVE' | 'REACTIVE';
  client?: number | null;
  assigned_to?: number | null;
  assigned_attorney_ids: number[];
  consultation_date: string;
  duration: '15min' | '30min' | '1h' | '2h' | 'CUSTOM';
  custom_hours?: number;
  custom_minutes?: number;
  format: 'IN_PERSON' | 'PHONE' | 'VIDEO';
  address?: string;
  city?: string;
  address_instructions?: string;
  phone_number?: string;
  video_link?: string;
  legal_domain: 'FAMILY' | 'CRIMINAL' | 'CORPORATE' | 'LABOR' | 'REAL_ESTATE' | 'OTHER';
  custom_legal_domain?: string;
  legal_question: string;
  facts_context?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  advice_summary?: string;
  case_type: 'CONSULTATION';
};

export interface ConsultationFormProps {
  initialValues?: Partial<ConsultationFormValues>;
  mode: 'create' | 'edit' | 'follow-up';
  caseId?: number;
  parentConsultation?: API.Case | null;
  onSubmitSuccess?: (caseItem: API.Case) => void;
  onBack?: () => void;
}

function durationMinutesOf(data: ConsultationFormValues): number {
  if (data.duration === '15min') return 15;
  if (data.duration === '30min') return 30;
  if (data.duration === '1h') return 60;
  if (data.duration === '2h') return 120;
  return Math.max(1, (Number(data.custom_hours) || 0) * 60 + (Number(data.custom_minutes) || 0));
}

const ConsultationForm: React.FC<ConsultationFormProps> = ({
  initialValues,
  mode,
  caseId,
  parentConsultation,
  onSubmitSuccess,
  onBack,
}) => {
  const { t, tf, lang } = useAppTranslation();
  const modal = t.cases.modal;
  const cw = modal.consultationWorkflow;
  const clientModalRef = useRef<ClientCreateModalRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [clientPhone, setClientPhone] = useState('');
  const { toast } = useToast();

  const schema = useMemo(
    () =>
      yup.object({
        title: yup.string().trim().required(modal.validation.titleRequired).max(255),
        consultation_type: yup.string().oneOf(['PREVENTIVE', 'REACTIVE']).required(),
        client: yup.number().nullable().optional(),
        assigned_attorney_ids: yup.array().of(yup.number()).optional(),
        consultation_date: yup.string().required(modal.validation.consultationDateRequired),
        duration: yup.string().oneOf(['15min', '30min', '1h', '2h', 'CUSTOM']).required(),
        format: yup.string().oneOf(['IN_PERSON', 'PHONE', 'VIDEO']).required(),
        address: yup.string().when('format', {
          is: 'IN_PERSON',
          then: (s) => s.trim().required(cw.addressRequired),
          otherwise: (s) => s.optional(),
        }),
        city: yup.string().when('format', {
          is: 'IN_PERSON',
          then: (s) => s.trim().required(cw?.cityRequired ?? 'City is required'),
          otherwise: (s) => s.optional(),
        }),
        phone_number: yup.string().when('format', {
          is: 'PHONE',
          then: (s) => s.trim().required(cw?.phoneRequired ?? 'A client or phone number is required for a phone consultation.'),
          otherwise: (s) => s.optional(),
        }),
        video_link: yup.string().when('format', {
          is: 'VIDEO',
          then: (s) =>
            s
              .trim()
              .required(cw?.videoRequired ?? 'Video conference link is required')
              .url(cw?.videoInvalid ?? 'Enter a valid URL'),
          otherwise: (s) => s.optional(),
        }),
        legal_domain: yup
          .string()
          .oneOf(['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'])
          .required(),
        custom_legal_domain: yup.string().when('legal_domain', {
          is: 'OTHER',
          then: (s) => s.trim().required(cw?.customDomainRequired ?? 'Specify the legal domain'),
          otherwise: (s) => s.optional(),
        }),
        legal_question: yup.string().trim().required(modal.validation.legalQuestionRequired),
        facts_context: yup.string().optional(),
        status: yup.string().oneOf(['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']).required(),
        advice_summary: yup.string().optional(),
      }),
    [modal.validation, cw]
  );

  const form = useForm<ConsultationFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      reference: initialValues?.reference ?? '',
      title: initialValues?.title ?? parentConsultation?.title ?? '',
      consultation_type: initialValues?.consultation_type ?? 'PREVENTIVE',
      client: initialValues?.client ?? parentConsultation?.client?.id ?? null,
      assigned_to: initialValues?.assigned_to ?? null,
      assigned_attorney_ids: initialValues?.assigned_attorney_ids ?? [],
      consultation_date: initialValues?.consultation_date ?? '',
      duration: initialValues?.duration ?? '1h',
      custom_hours: initialValues?.custom_hours ?? 1,
      custom_minutes: initialValues?.custom_minutes ?? 0,
      format: initialValues?.format ?? 'IN_PERSON',
      address: initialValues?.address ?? '',
      city: initialValues?.city ?? '',
      address_instructions: initialValues?.address_instructions ?? '',
      phone_number: initialValues?.phone_number ?? '',
      video_link: initialValues?.video_link ?? '',
      legal_domain: initialValues?.legal_domain ?? 'CORPORATE',
      custom_legal_domain: initialValues?.custom_legal_domain ?? '',
      legal_question: initialValues?.legal_question ?? '',
      facts_context: initialValues?.facts_context ?? '',
      status: initialValues?.status ?? 'SCHEDULED',
      advice_summary: initialValues?.advice_summary ?? '',
    },
  });

  const formatValue = form.watch('format');
  const legalDomain = form.watch('legal_domain');
  const duration = form.watch('duration');
  const clientId = form.watch('client');
  const attorneyIds = form.watch('assigned_attorney_ids') ?? [];

  useEffect(() => {
    if (!clientId) {
      setClientPhone('');
      return;
    }
    let alive = true;
    apiGetClient(clientId)
      .then((res) => {
        if (!alive) return;
        const phone = res.data?.phone || '';
        setClientPhone(phone);
        if (form.getValues('format') === 'PHONE' && !form.getValues('phone_number') && phone) {
          form.setValue('phone_number', phone);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [clientId, form]);

  const finishSuccess = async (created: API.Case) => {
    if (files.length && created.id) {
      for (const file of files) {
        try {
          await apiUploadCaseAttachment(created.id, file);
        } catch {
          toast({
            title: cw?.attachmentFailed ?? 'Upload failed',
            description: file.name,
            variant: 'destructive',
          });
        }
      }
    }
    const conflicts = created.scheduleConflicts ?? [];
    if (conflicts.length) {
      toast({
        title: cw.scheduleConflictTitle,
        description: conflicts
          .map((item) => {
            if (item.attorneyName && item.start && item.end) {
              return tf(cw.conflictDetail, {
                name: item.attorneyName,
                start: formatTime(item.start, lang),
                end: formatTime(item.end, lang),
              });
            }
            return item.attorneyName || item.title || '';
          })
          .filter(Boolean)
          .join(' '),
      });
    }
    toast({
      title: mode === 'follow-up' ? cw.followUpCreated : cw.createdTitle,
      description:
        mode === 'follow-up'
          ? cw.followUpCreated
          : tf(cw.createdDescription, { reference: created.reference || '' }),
    });
    onSubmitSuccess?.(created);
  };

  const { handleCreate, handleUpdate, isLoading } = useCaseForm(
    form.setError as never,
    mode === 'follow-up' ? undefined : finishSuccess,
    undefined
  );
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const busy = isLoading || followUpLoading;

  const toPayload = (data: ConsultationFormValues): API.ConsultationFormData => {
    const consultationDateIso =
      data.consultation_date && data.consultation_date.includes('T')
        ? new Date(data.consultation_date).toISOString()
        : data.consultation_date;
    return {
      case_type: 'CONSULTATION',
      reference: '',
      title: data.title.trim(),
      consultation_type: data.consultation_type,
      client: data.client ?? null,
      assigned_to: attorneyIds[0] ?? data.assigned_to ?? null,
      assigned_attorney_ids: attorneyIds,
      consultation_date: consultationDateIso,
      duration: data.duration,
      duration_minutes: durationMinutesOf(data),
      custom_hours: data.custom_hours,
      custom_minutes: data.custom_minutes,
      format: data.format,
      address: data.address,
      city: data.city,
      address_instructions: data.address_instructions,
      phone_number: data.phone_number,
      video_link: data.video_link,
      legal_domain: data.legal_domain,
      custom_legal_domain: data.custom_legal_domain,
      legal_question: data.legal_question.trim(),
      facts_context: data.facts_context,
      status: data.status,
      advice_summary: data.advice_summary,
    };
  };

  const handleSubmit = form.handleSubmit(
    async (data) => {
      const payload = toPayload(data);
      if (mode === 'edit' && caseId) {
        handleUpdate({ ...payload, id: caseId });
        return;
      }
      if (mode === 'follow-up' && parentConsultation) {
        setFollowUpLoading(true);
        try {
          const res = await apiCreateFollowUpConsultation(
            parentConsultation.id,
            toBackendCaseCreatePayload(payload)
          );
          await finishSuccess(res.data);
        } catch {
          toast({
            title: modal.toasts.fixFormTitle,
            description: cw?.followUpFailed ?? 'Could not create the follow-up consultation.',
            variant: 'destructive',
          });
        } finally {
          setFollowUpLoading(false);
        }
        return;
      }
      handleCreate(payload);
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

  const year = new Date().getFullYear();
  const referenceDisplay =
    initialValues?.reference ||
    (mode === 'follow-up' && parentConsultation?.reference
      ? `${parentConsultation.reference}-F••`
      : `C-${year}-••••`);

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
        <div className="space-y-6">
          {form.formState.errors.case_specific_data && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {String(form.formState.errors.case_specific_data.message)}
            </div>
          )}

          <CreateFormSection index="01" title={cw?.sectionInfo ?? modal.sections.basicInfo}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CreateFormField id="consultation-reference" label={modal.fields.reference}>
                <Input value={referenceDisplay} readOnly disabled className={CREATE_INPUT_CLASS} />
              </CreateFormField>
              <CreateFormField
                id="consultation-title"
                label={modal.fields.title}
                required
                error={form.formState.errors.title?.message}
              >
                <Input
                  {...form.register('title')}
                  placeholder={modal.placeholders.consultationTitle}
                  className={CREATE_INPUT_CLASS}
                />
              </CreateFormField>
              <div className="sm:col-span-2">
                <CreateFormField id="consultation-type" label={modal.fields.consultationType} required>
                  <Select
                    value={form.watch('consultation_type')}
                    onValueChange={(v) =>
                      form.setValue('consultation_type', v as ConsultationFormValues['consultation_type'])
                    }
                  >
                    <SelectTrigger className={CREATE_SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREVENTIVE">{cw?.preventive ?? 'Preventive'}</SelectItem>
                      <SelectItem value="REACTIVE">{cw?.reactive ?? 'Reactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </CreateFormField>
              </div>
            </div>
          </CreateFormSection>

          <CreateFormSection index="02" title={cw?.sectionClient ?? modal.fields.relatedClient}>
            <div className="space-y-3">
              <CreateFormField id="consultation-client" label={modal.fields.relatedClient}>
                <ServerSelect
                  link="/clients/clients/"
                  value={clientId}
                  onChange={(v) => form.setValue('client', v ?? null)}
                  labelKey={(c: { first_name?: string; last_name?: string; email?: string; phone?: string }) =>
                    `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || c.phone || t.cases.unnamed
                  }
                  cleanable
                  placeholder={modal.placeholders.client}
                  className={CREATE_SERVER_SELECT_CLASS}
                />
              </CreateFormField>
              <Button
                type="button"
                variant="outline"
                className={CREATE_CANCEL_CLASS}
                onClick={() => clientModalRef.current?.show()}
              >
                <Plus className="h-4 w-4" />
                {cw?.addClient ?? 'Add new client'}
              </Button>
            </div>
          </CreateFormSection>

          <CreateFormSection index="03" title={cw?.assignedAttorneys ?? modal.fields.assignedAttorney}>
            <TeamMemberMultiSelect
              value={attorneyIds}
              onChange={(ids) => {
                form.setValue('assigned_attorney_ids', ids);
                form.setValue('assigned_to', ids[0] ?? null);
              }}
              placeholder={cw?.searchAttorneys ?? 'Search attorneys'}
            />
          </CreateFormSection>

          <CreateFormSection index="04" title={cw?.sectionScheduling ?? modal.sections.clientScheduling}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CreateFormField
                id="consultation-date"
                label={modal.fields.consultationDateTime}
                required
                error={form.formState.errors.consultation_date?.message}
              >
                <Input type="datetime-local" {...form.register('consultation_date')} className={CREATE_INPUT_CLASS} />
              </CreateFormField>
              <CreateFormField id="consultation-duration" label={modal.fields.duration} required>
                <Select
                  value={duration}
                  onValueChange={(v) => form.setValue('duration', v as ConsultationFormValues['duration'])}
                >
                  <SelectTrigger className={CREATE_SELECT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15min">{cw?.min15 ?? '15 minutes'}</SelectItem>
                    <SelectItem value="30min">{modal.options.duration.min30}</SelectItem>
                    <SelectItem value="1h">{modal.options.duration.h1}</SelectItem>
                    <SelectItem value="2h">{modal.options.duration.h2}</SelectItem>
                    <SelectItem value="CUSTOM">{modal.options.duration.CUSTOM}</SelectItem>
                  </SelectContent>
                </Select>
              </CreateFormField>
              {duration === 'CUSTOM' ? (
                <>
                  <CreateFormField id="custom-hours" label={cw?.hours ?? 'Hours'}>
                    <Input type="number" min={0} {...form.register('custom_hours')} className={CREATE_INPUT_CLASS} />
                  </CreateFormField>
                  <CreateFormField id="custom-minutes" label={cw?.minutes ?? 'Minutes'}>
                    <Input type="number" min={0} max={59} {...form.register('custom_minutes')} className={CREATE_INPUT_CLASS} />
                  </CreateFormField>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <CreateFormField id="consultation-format" label={modal.fields.format} required>
                  <Select
                    value={formatValue}
                    onValueChange={(v) => form.setValue('format', v as ConsultationFormValues['format'])}
                  >
                    <SelectTrigger className={CREATE_SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_PERSON">{modal.options.format.IN_PERSON}</SelectItem>
                      <SelectItem value="PHONE">{modal.options.format.PHONE}</SelectItem>
                      <SelectItem value="VIDEO">{modal.options.format.VIDEO}</SelectItem>
                    </SelectContent>
                  </Select>
                </CreateFormField>
              </div>
              {formatValue === 'IN_PERSON' ? (
                <>
                  <CreateFormField
                    id="address"
                    label={cw?.address ?? 'Address'}
                    required
                    error={form.formState.errors.address?.message}
                  >
                    <Input {...form.register('address')} className={CREATE_INPUT_CLASS} />
                  </CreateFormField>
                  <CreateFormField
                    id="city"
                    label={cw?.city ?? 'City'}
                    required
                    error={form.formState.errors.city?.message}
                  >
                    <Input {...form.register('city')} className={CREATE_INPUT_CLASS} />
                  </CreateFormField>
                  <div className="sm:col-span-2">
                    <CreateFormField id="address-instructions" label={cw?.addressInstructions ?? 'Additional instructions'}>
                      <Input {...form.register('address_instructions')} className={CREATE_INPUT_CLASS} />
                    </CreateFormField>
                  </div>
                </>
              ) : null}
              {formatValue === 'PHONE' ? (
                <div className="sm:col-span-2">
                  <CreateFormField
                    id="phone"
                    label={cw?.clientPhone ?? 'Client phone'}
                    required
                    error={form.formState.errors.phone_number?.message}
                  >
                    <Input
                      {...form.register('phone_number')}
                      placeholder={clientPhone || cw?.phonePlaceholder || '+212 …'}
                      className={CREATE_INPUT_CLASS}
                    />
                  </CreateFormField>
                  {!clientId && !form.watch('phone_number') ? (
                    <p className="text-[12px] text-amber-700 dark:text-amber-400">
                      {cw?.phoneHint ?? 'A client or phone number is required for a phone consultation.'}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {formatValue === 'VIDEO' ? (
                <div className="sm:col-span-2">
                  <CreateFormField
                    id="video"
                    label={cw?.videoLink ?? 'Video conference link'}
                    required
                    error={form.formState.errors.video_link?.message}
                  >
                    <Input
                      {...form.register('video_link')}
                      placeholder="https://meet.google.com/…"
                      className={CREATE_INPUT_CLASS}
                    />
                  </CreateFormField>
                </div>
              ) : null}
            </div>
          </CreateFormSection>

          <CreateFormSection index="05" title={modal.sections.legalContext}>
            <div className="space-y-4">
              <CreateFormField id="legal-domain" label={modal.fields.legalDomain} required>
                <Select
                  value={legalDomain}
                  onValueChange={(v) => form.setValue('legal_domain', v as ConsultationFormValues['legal_domain'])}
                >
                  <SelectTrigger className={CREATE_SELECT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {modal.options.legalDomain[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CreateFormField>
              {legalDomain === 'OTHER' ? (
                <CreateFormField
                  id="custom-domain"
                  label={cw?.customDomain ?? 'Specify legal domain'}
                  required
                  error={form.formState.errors.custom_legal_domain?.message}
                >
                  <Input {...form.register('custom_legal_domain')} className={CREATE_INPUT_CLASS} />
                </CreateFormField>
              ) : null}
              <CreateFormField
                id="legal-question"
                label={modal.fields.legalQuestion}
                required
                error={form.formState.errors.legal_question?.message}
              >
                <Textarea
                  {...form.register('legal_question')}
                  placeholder={modal.placeholders.legalQuestion}
                  className={cn(CREATE_TEXTAREA_CLASS, 'min-h-[120px]')}
                />
              </CreateFormField>
              <CreateFormField id="facts" label={cw?.facts ?? 'Facts / additional context'}>
                <Textarea {...form.register('facts_context')} className={cn(CREATE_TEXTAREA_CLASS, 'min-h-[100px]')} />
              </CreateFormField>
            </div>
          </CreateFormSection>

          <CreateFormSection index="06" title={cw.attachments}>
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center',
                'border-slate-300 dark:border-zinc-700'
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const next = Array.from(e.dataTransfer.files ?? []);
                if (next.length) setFiles((prev) => [...prev, ...next]);
              }}
            >
              <Upload className="mb-2 h-5 w-5 text-slate-400" aria-hidden />
              <p className="text-[13px] text-slate-600 dark:text-zinc-300">{cw.dropFiles}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-9 rounded-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                {t.common.add}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                tabIndex={-1}
                onChange={(e) => {
                  const next = Array.from(e.target.files ?? []);
                  if (next.length) setFiles((prev) => [...prev, ...next]);
                  e.target.value = '';
                }}
              />
            </div>
            {files.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[13px] dark:border-zinc-800"
                  >
                    <span className="truncate">
                      {file.name}{' '}
                      <span className="text-slate-400">({Math.max(1, Math.round(file.size / 1024))} KB)</span>
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </CreateFormSection>

          <CreateFormSection index="07" title={cw?.sectionNotes ?? modal.sections.outcome}>
            <div className="space-y-4">
              <CreateFormField id="status" label={modal.fields.status}>
                <Select
                  value={form.watch('status')}
                  onValueChange={(v) => form.setValue('status', v as ConsultationFormValues['status'])}
                >
                  <SelectTrigger className={CREATE_SELECT_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">{modal.options.consultationStatus.SCHEDULED}</SelectItem>
                    <SelectItem value="COMPLETED">{modal.options.consultationStatus.COMPLETED}</SelectItem>
                    <SelectItem value="NO_SHOW">{modal.options.consultationStatus.NO_SHOW}</SelectItem>
                    <SelectItem value="CANCELLED">{cw?.cancelled ?? 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </CreateFormField>
              <CreateFormField id="notes" label={cw?.notes ?? 'Consultation notes & advice'}>
                <Textarea {...form.register('advice_summary')} className={cn(CREATE_TEXTAREA_CLASS, 'min-h-[120px]')} />
              </CreateFormField>
            </div>
          </CreateFormSection>
        </div>
      </div>

      <DialogFooter className={cn(CREATE_FOOTER_CLASS, onBack && 'justify-between')}>
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} disabled={busy} className={CREATE_CANCEL_CLASS}>
            {modal.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={busy} className={CREATE_SUBMIT_CLASS}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {modal.submitting}
            </>
          ) : mode === 'edit' ? (
            modal.updateCase
          ) : mode === 'follow-up' ? (
            cw.addFollowUp
          ) : (
            cw.createConsultation
          )}
        </Button>
      </DialogFooter>

      <ClientCreateModal
        ref={clientModalRef}
        onSuccess={(client) => {
          form.setValue('client', client.id);
          if (client.phone) {
            setClientPhone(client.phone);
            if (form.getValues('format') === 'PHONE') form.setValue('phone_number', client.phone);
          }
        }}
      />
    </form>
  );
};

export default ConsultationForm;
