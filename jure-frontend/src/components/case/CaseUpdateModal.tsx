'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { apiUpdateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_INPUT_CLASS,
  CREATE_SELECT_CLASS,
  CREATE_SERVER_SELECT_CLASS,
  CREATE_SUBMIT_CLASS,
  CREATE_TEXTAREA_CLASS,
  CreateFormDialog,
  CreateFormField,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';

export interface CaseUpdateModalRef {
  show: (instance: API.Case) => void;
  hide: () => void;
}

export interface CaseUpdateModalProps {
  onSuccess?: (_: API.Case) => void;
}

function valuesFromCase(instance: API.Case): API.CaseUpdateForm {
  return {
    id: instance.id,
    category: instance.category,
    status: instance.status,
    summary: instance.summary,
    description: instance.description,
    reference: instance.reference,
    title: instance.title,
    court: instance.court,
    assigned_to: instance?.assigned_to?.id ? instance.assigned_to.id : null,
    client: instance?.client?.id ? instance.client.id : null,
  };
}

const CaseUpdateModal = forwardRef<CaseUpdateModalRef, CaseUpdateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const { toast } = useToast();
  const m = t.cases.modal;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [instance, setInstance] = useState<API.Case | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');

  const isBusy = submitPhase !== 'idle';

  const schema = useMemo(
    () =>
      yup.object({
        category: yup.string().required(m.validation.categoryRequired),
        status: yup.string().required(m.validation.statusRequired),
        summary: yup.string().optional().default(''),
        description: yup.string().required(m.validation.descriptionRequired),
        reference: yup.string().required(m.validation.referenceRequired),
        title: yup.string().required(m.validation.titleRequired),
        court: yup.string().required(m.validation.courtRequired),
        assigned_to: yup.number().nullable().optional(),
        client: yup.number().nullable().optional(),
      }),
    [m]
  );

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const mainForm = useForm<API.CaseUpdateForm>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.CaseUpdateForm>,
  });

  const show = (next: API.Case) => {
    setInstance(next);
    setSubmitPhase('idle');
    mainForm.reset(valuesFromCase(next));
    scrollRef.current?.scrollTo({ top: 0 });
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: API.CaseUpdateForm) => {
    if (!instance) return;
    setSubmitPhase('loading');
    try {
      const res = await apiUpdateCase({
        ...data,
        id: instance.id,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
        client: data.client ? Number(data.client) : null,
      });
      setSubmitPhase('success');
      toast({ title: m.toasts.updatedTitle });
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onSuccess?.(res.data);
      setIsOpen(false);
      setSubmitPhase('idle');
    } catch (err) {
      setSubmitPhase('idle');
      devError('apiUpdateCase', err);
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        const keys = Object.keys(remoteValidation);
        keys.forEach((key) => {
          mainForm.setError(key as keyof API.CaseUpdateForm, { message: remoteValidation[key] });
        });
        if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();

        let msg = m.toasts.updateFailed;
        const d = err.response?.data as Record<string, unknown> | string | undefined;
        if (typeof d === 'string') msg = d;
        else if (d && typeof d === 'object' && !Array.isArray(d)) {
          const detail = (d as { detail?: unknown }).detail;
          if (typeof detail === 'string') msg = detail;
          else if (Array.isArray(detail) && detail.length > 0) msg = String(detail[0]);
          else {
            const first = Object.entries(d).find(([, v]) => v != null);
            if (first) {
              const v = first[1];
              msg = `${first[0]}: ${Array.isArray(v) ? String(v[0]) : String(v)}`;
            }
          }
        }
        if (keys.length === 0) {
          toast({ title: t.common.error, description: msg, variant: 'destructive' });
        }
      } else {
        toast({
          title: t.common.error,
          description: m.toasts.updateFailed,
          variant: 'destructive',
        });
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof API.CaseUpdateForm)[] = ['reference', 'title', 'court', 'category', 'description', 'status'];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const fieldError = (name: keyof API.CaseUpdateForm) =>
    mainForm.formState.errors[name]?.message as string | undefined;

  const titleRegister = mainForm.register('title');

  return (
    <CreateFormDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      isBusy={isBusy}
      formId={formId}
      title={m.updateTitle}
      description={m.updateDescription}
      icon={Pencil}
      closeLabel={t.common.close}
      onClose={hide}
      onOpenAutoFocus={() => titleRef.current?.focus()}
      contentClassName="md:h-[min(86vh,780px)] md:w-[min(90vw,820px)] md:max-w-[820px]"
    >
      <form
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={mainForm.handleSubmit(handleSubmit, onInvalid)}
        noValidate
        aria-busy={isBusy}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7"
        >
          <div className="space-y-6">
            <CreateFormSection index="01" title={m.sections.basicInformation}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField
                  id={`${formId}-reference`}
                  label={m.fields.reference}
                  required
                  error={fieldError('reference')}
                >
                  <Input
                    id={`${formId}-reference`}
                    placeholder={m.placeholders.reference}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    aria-invalid={!!fieldError('reference')}
                    {...mainForm.register('reference')}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-title`}
                  label={m.fields.title}
                  required
                  error={fieldError('title')}
                >
                  <Input
                    id={`${formId}-title`}
                    placeholder={m.placeholders.title}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    aria-invalid={!!fieldError('title')}
                    {...titleRegister}
                    ref={(el) => {
                      titleRef.current = el;
                      titleRegister.ref(el);
                    }}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-court`}
                  label={m.fields.courtName}
                  required
                  error={fieldError('court')}
                >
                  <Input
                    id={`${formId}-court`}
                    placeholder={m.placeholders.court}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    aria-invalid={!!fieldError('court')}
                    {...mainForm.register('court')}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-category`}
                  label={m.fields.category}
                  required
                  error={fieldError('category')}
                >
                  <Select
                    value={mainForm.watch('category')}
                    onValueChange={(val: API.CaseCategory) =>
                      mainForm.setValue('category', val, { shouldValidate: true, shouldDirty: true })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger id={`${formId}-category`} className={CREATE_SELECT_CLASS}>
                      <SelectValue placeholder={m.placeholders.category} />
                    </SelectTrigger>
                    <SelectContent>
                      {CaseCategory.options.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {t.enums.caseCategory[category.value] ?? category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-description`}
                  label={m.fields.description}
                  required
                  error={fieldError('description')}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id={`${formId}-description`}
                    placeholder={m.placeholders.descriptionDetailed}
                    className={CREATE_TEXTAREA_CLASS}
                    disabled={isBusy}
                    aria-invalid={!!fieldError('description')}
                    {...mainForm.register('description')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="02" title={m.sections.caseDetails}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField
                  id={`${formId}-status`}
                  label={m.fields.status}
                  required
                  error={fieldError('status')}
                >
                  <Select
                    value={mainForm.watch('status')}
                    onValueChange={(val: API.CaseStatus) =>
                      mainForm.setValue('status', val, { shouldValidate: true, shouldDirty: true })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger id={`${formId}-status`} className={CREATE_SELECT_CLASS}>
                      <SelectValue placeholder={m.placeholders.status} />
                    </SelectTrigger>
                    <SelectContent>
                      {CaseStatus.options.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {t.enums.caseStatus[status.value] ?? status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CreateFormField>
                <CreateFormField id={`${formId}-summary`} label={m.fields.summary} error={fieldError('summary')}>
                  <Input
                    id={`${formId}-summary`}
                    placeholder={m.placeholders.summary}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    {...mainForm.register('summary')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="03" title={m.sections.assignmentRelations}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField
                  id={`${formId}-assigned_to`}
                  label={m.fields.assignedTo}
                  error={fieldError('assigned_to')}
                >
                  <ServerSelect
                    id={`${formId}-assigned_to`}
                    link="/cabinets/members/select_list"
                    value={mainForm.watch('assigned_to')}
                    onChange={(val) =>
                      mainForm.setValue('assigned_to', val ? Number(val) : null, { shouldDirty: true })
                    }
                    labelKey="email"
                    cleanable
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-client`}
                  label={m.fields.relatedClient}
                  error={fieldError('client')}
                >
                  <ServerSelect
                    id={`${formId}-client`}
                    link="/clients/clients/"
                    value={mainForm.watch('client')}
                    onChange={(val) => mainForm.setValue('client', val, { shouldDirty: true })}
                    labelKey={(client: API.Client) =>
                      `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
                      client.email ||
                      t.cases.unnamed
                    }
                    cleanable
                    placeholder={m.placeholders.client}
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>
          </div>
        </div>

        <DialogFooter className={CREATE_FOOTER_CLASS}>
          <Button type="button" variant="outline" onClick={hide} disabled={isBusy} className={CREATE_CANCEL_CLASS}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={isBusy} className={CREATE_SUBMIT_CLASS}>
            {submitPhase === 'loading' ? (
              <>
                <Loader2 className="animate-spin" />
                {m.updating}
              </>
            ) : submitPhase === 'success' ? (
              <>
                <Check />
                {m.toasts.updatedTitle}
              </>
            ) : (
              m.updateCase
            )}
          </Button>
        </DialogFooter>
      </form>
    </CreateFormDialog>
  );
});

CaseUpdateModal.displayName = 'CaseUpdateModal';

export default CaseUpdateModal;
