'use client';

import React, { useMemo, useState } from 'react';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

export type AdministrativeDutyFormValues = {
  reference: string;
  title: string;
  duty_type:
    | 'CORPORATE_FILING'
    | 'PROPERTY_REGISTRATION'
    | 'NOTARIAL_ACT'
    | 'PERMIT'
    | 'COMPLIANCE'
    | 'INHERITANCE'
    | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  client?: number | null;
  assigned_to?: number | null;
  description: string;
  institution_authority?: string;
  institution_reference_number?: string;
  start_date: string;
  due_date: string;
  completion_date?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  case_type: 'ADMINISTRATIVE_DUTY';
  required_documents?: { label: string; completed: boolean }[];
};

export interface AdministrativeDutyFormProps {
  initialValues?: Partial<AdministrativeDutyFormValues>;
  mode: 'create' | 'edit';
  caseId?: number;
  onSubmitSuccess?: (caseItem: API.Case) => void;
  onBack?: () => void;
}

const AdministrativeDutyForm: React.FC<AdministrativeDutyFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const { t } = useAppTranslation();
  const modal = t.cases.modal;
  const { toast } = useToast();

  const [requiredDocuments, setRequiredDocuments] = useState<
    { label: string; completed: boolean }[]
  >(
    initialValues?.required_documents?.length
      ? [...initialValues.required_documents]
      : [{ label: '', completed: false }]
  );

  const dutyTypeOptions = useMemo(
    () =>
      (
        [
          'CORPORATE_FILING',
          'PROPERTY_REGISTRATION',
          'NOTARIAL_ACT',
          'PERMIT',
          'COMPLIANCE',
          'INHERITANCE',
          'OTHER',
        ] as const
      ).map((value) => ({
        value,
        label: modal.options.dutyType[value],
      })),
    [modal.options.dutyType]
  );

  const priorityOptions = useMemo(
    () =>
      (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((value) => ({
        value,
        label: modal.options.priority[value],
      })),
    [modal.options.priority]
  );

  const statusOptions = useMemo(
    () =>
      (['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED'] as const).map(
        (value) => ({
          value,
          label: modal.options.dutyStatus[value],
        })
      ),
    [modal.options.dutyStatus]
  );

  const schema = useMemo(
    () =>
      yup.object({
        reference: yup.string().optional().default(''),
        title: yup.string().required(modal.validation.titleRequired),
        duty_type: yup
          .string()
          .oneOf([
            'CORPORATE_FILING',
            'PROPERTY_REGISTRATION',
            'NOTARIAL_ACT',
            'PERMIT',
            'COMPLIANCE',
            'INHERITANCE',
            'OTHER',
          ])
          .required(),
        priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).required(),
        client: yup
          .number()
          .nullable()
          .optional()
          .transform((_, orig) =>
            orig === '' || orig == null || orig === undefined ? null : Number(orig)
          ),
        assigned_to: yup
          .number()
          .nullable()
          .optional()
          .transform((_, orig) =>
            orig === '' || orig == null || orig === undefined ? null : Number(orig)
          ),
        description: yup.string().required(modal.validation.descriptionPurposeRequired),
        institution_authority: yup.string().optional(),
        institution_reference_number: yup.string().optional(),
        start_date: yup.string().required(modal.validation.startDateRequired),
        due_date: yup.string().required(modal.validation.dueDateRequired),
        completion_date: yup.string().nullable().optional(),
        status: yup
          .string()
          .oneOf(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CLOSED'])
          .required(),
      }),
    [modal.validation]
  );

  const form = useForm<AdministrativeDutyFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      reference: initialValues?.reference ?? '',
      title: initialValues?.title ?? '',
      duty_type: initialValues?.duty_type ?? 'OTHER',
      priority: initialValues?.priority ?? 'MEDIUM',
      client: initialValues?.client ?? null,
      assigned_to: initialValues?.assigned_to ?? null,
      description: initialValues?.description ?? '',
      institution_authority: initialValues?.institution_authority ?? '',
      institution_reference_number: initialValues?.institution_reference_number ?? '',
      start_date: initialValues?.start_date ?? '',
      due_date: initialValues?.due_date ?? '',
      completion_date: initialValues?.completion_date ?? null,
      status: initialValues?.status ?? 'PENDING',
    },
  });

  const { handleCreate, handleUpdate, isLoading } = useCaseForm(
    form.setError as never,
    onSubmitSuccess,
    undefined
  );

  const addDocument = () => setRequiredDocuments((d) => [...d, { label: '', completed: false }]);
  const removeDocument = (i: number) =>
    setRequiredDocuments((d) =>
      d.length > 1 ? d.filter((_, j) => j !== i) : [{ label: '', completed: false }]
    );
  const updateDocument = (i: number, field: 'label' | 'completed', value: string | boolean) =>
    setRequiredDocuments((d) => {
      const next = [...d];
      next[i] = { ...next[i], [field]: value };
      return next;
    });

  const handleSubmit = form.handleSubmit(
    (data) => {
      const payload: API.AdministrativeDutyFormData = {
        case_type: 'ADMINISTRATIVE_DUTY',
        reference: data.reference,
        title: data.title,
        duty_type: data.duty_type,
        priority: data.priority,
        client: data.client ?? null,
        assigned_to: data.assigned_to ?? null,
        description: data.description,
        institution_authority: data.institution_authority || undefined,
        institution_reference_number: data.institution_reference_number || undefined,
        start_date: data.start_date,
        due_date: data.due_date,
        completion_date: data.completion_date || null,
        required_documents:
          requiredDocuments.filter((d) => d.label.trim()).length > 0
            ? requiredDocuments.filter((d) => d.label.trim())
            : undefined,
        status: data.status,
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
              {modal.fields.reference} <span className="text-red-500">*</span>
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
              placeholder={modal.placeholders.dutyTitle}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.dutyType} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('duty_type')}
              onValueChange={(v) =>
                form.setValue('duty_type', v as AdministrativeDutyFormValues['duty_type'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dutyTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.priority}
            </label>
            <Select
              value={form.watch('priority')}
              onValueChange={(v) =>
                form.setValue('priority', v as AdministrativeDutyFormValues['priority'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="02" title={modal.sections.clientResponsible}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.relatedClient}
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
              {modal.fields.assignedTo}
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
        </div>
      </CreateFormSection>

      <CreateFormSection index="03" title={modal.sections.taskDetails}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.descriptionPurpose} <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...form.register('description')}
              placeholder={modal.placeholders.descriptionPurpose}
              className={CREATE_TEXTAREA_CLASS}
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-xs">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {modal.fields.institutionAuthority}
              </label>
              <Input
                {...form.register('institution_authority')}
                placeholder={modal.placeholders.institutionExample}
                className={CREATE_INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {modal.fields.institutionReferenceNumber}{' '}
                <span className="text-slate-400 text-xs">({t.common.optional})</span>
              </label>
              <Input
                {...form.register('institution_reference_number')}
                placeholder={modal.placeholders.referenceNumber}
                className={CREATE_INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="04" title={modal.sections.dates}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.startDate} <span className="text-red-500">*</span>
            </label>
            <Input type="date" {...form.register('start_date')} className={CREATE_INPUT_CLASS} />
            {form.formState.errors.start_date && (
              <p className="text-red-500 text-xs">{form.formState.errors.start_date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.dueDateLegalDeadline} <span className="text-red-500">*</span>
            </label>
            <Input type="date" {...form.register('due_date')} className={CREATE_INPUT_CLASS} />
            {form.formState.errors.due_date && (
              <p className="text-red-500 text-xs">{form.formState.errors.due_date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.completionDate}{' '}
              <span className="text-slate-400 text-xs">{modal.hints.completionDateOptional}</span>
            </label>
            <Input type="date" {...form.register('completion_date')} className={CREATE_INPUT_CLASS} />
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="05" title={modal.sections.documentsChecklist}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.requiredDocuments}
            </label>
            <div className="space-y-2">
              {requiredDocuments.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={item.label}
                    onChange={(e) => updateDocument(i, 'label', e.target.value)}
                    placeholder={modal.placeholders.documentName}
                    className={cn(CREATE_INPUT_CLASS, 'flex-1')}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Checkbox
                      id={`doc-${i}`}
                      checked={item.completed}
                      onCheckedChange={(c) => updateDocument(i, 'completed', !!c)}
                    />
                    <label htmlFor={`doc-${i}`} className="text-[13px] whitespace-nowrap">
                      {modal.actions.done}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeDocument(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addDocument}>
                <Plus className="w-4 h-4 mr-1" />
                {modal.actions.addDocument}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.status}
            </label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) =>
                form.setValue('status', v as AdministrativeDutyFormValues['status'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
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

export default AdministrativeDutyForm;
