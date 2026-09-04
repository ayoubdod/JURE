'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, FileText, Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { apiCreateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';
import { clientDisplayName } from '@/services/case/caseType';
import { useToast } from '@/hooks/use-toast';
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

export interface CaseCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface CaseCreateModalProps {
  onSuccess?: (_: API.Case) => void;
}

const CaseCreateModal = forwardRef<CaseCreateModalRef, CaseCreateModalProps>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const { toast } = useToast();
  const m = t.cases.modal;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const mainForm = useForm<API.CaseCreateForm>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.CaseCreateForm>,
  });

  const show = () => {
    setSubmitPhase('idle');
    mainForm.reset();
    scrollRef.current?.scrollTo({ top: 0 });
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: API.CaseCreateForm) => {
    setSubmitPhase('loading');
    try {
      const res = await apiCreateCase(data);
      setSubmitPhase('success');
      toast({
        title: m.toasts.createdTitle,
        description: tf(m.toasts.createdDescription, { title: data.title }),
      });
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onSuccess?.(res.data);
      setIsOpen(false);
      setSubmitPhase('idle');
    } catch (err) {
      setSubmitPhase('idle');
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        const keys = Object.keys(remoteValidation);
        keys.forEach((key) => {
          mainForm.setError(key as keyof API.CaseCreateForm, { type: 'server', message: remoteValidation[key] });
        });
        if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof API.CaseCreateForm)[] = ['reference', 'title', 'court', 'category', 'description', 'status'];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const fieldError = (name: keyof API.CaseCreateForm) =>
    mainForm.formState.errors[name]?.message as string | undefined;

  const titleRegister = mainForm.register('title');

  return (
    <CreateFormDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      isBusy={isBusy}
      formId={formId}
      title={m.createTitle}
      description={m.createDescription}
      icon={FileText}
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
                    {...titleRegister}
                    ref={(el) => {
                      titleRef.current = el;
                      titleRegister.ref(el);
                    }}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-court`}
                  label={m.fields.court}
                  required
                  error={fieldError('court')}
                >
                  <Input
                    id={`${formId}-court`}
                    placeholder={m.placeholders.court}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
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
                    placeholder={m.placeholders.description}
                    className={CREATE_TEXTAREA_CLASS}
                    disabled={isBusy}
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
                      mainForm.setValue('assigned_to', val ? Number(val) : undefined, { shouldDirty: true })
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
                      clientDisplayName(client) || client.email || t.cases.unnamed
                    }
                    cleanable
                    placeholder={m.placeholders.client}
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-summary`}
                  label={m.fields.summary}
                  error={fieldError('summary')}
                  className="sm:col-span-2"
                >
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
                {m.creating}
              </>
            ) : submitPhase === 'success' ? (
              <>
                <Check />
                {m.toasts.createdTitle}
              </>
            ) : (
              m.createCase
            )}
          </Button>
        </DialogFooter>
      </form>
    </CreateFormDialog>
  );
});

CaseCreateModal.displayName = 'CaseCreateModal';

export default CaseCreateModal;
