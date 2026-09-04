'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Calendar,
  Edit,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Scale,
  Save,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { apiUpdateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CaseStatus } from '@/utils/constants';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { clientDisplayName } from '@/services/case/caseType';
import { formatDate, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
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

export interface CaseViewModalRef {
  show: (instance: API.Case) => void;
  hide: () => void;
}

export interface CaseViewModalProps {
  onSuccess?: (_: API.Case) => void;
  onDelete?: (caseItem: API.Case) => void;
  deleteModalRef?: React.RefObject<{ show: (caseItem: API.Case) => void }>;
}

function ViewField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">{children}</div>
    </div>
  );
}

const CaseViewModal = forwardRef<CaseViewModalRef, CaseViewModalProps>(
  ({ onSuccess, onDelete, deleteModalRef }, ref) => {
    const { t, tf, lang, enumLabel, enumOptions } = useAppTranslation();
    const modal = t.cases.modal;
    const formId = useId();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [instance, setInstance] = useState<API.Case | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [additionalAssignees, setAdditionalAssignees] = useState<API.CabinetMember[]>([]);
    const { toast } = useToast();

    const schema = useMemo(
      () =>
        yup.object({
          category: yup.string().required(modal.validation.categoryRequired),
          status: yup.string().required(modal.validation.statusRequired),
          summary: yup.string().optional().default(''),
          description: yup.string().required(modal.validation.descriptionRequired),
          reference: yup.string().required(modal.validation.referenceRequired),
          title: yup.string().required(modal.validation.titleRequired),
          court: yup.string().required(modal.validation.courtRequired),
          assigned_to: yup.number().nullable().optional(),
          client: yup.number().nullable().optional(),
        }),
      [modal.validation]
    );

    const schemaRef = useRef(schema);
    schemaRef.current = schema;

    const mainForm = useForm<API.CaseUpdateForm>({
      resolver: ((values, context, options) =>
        yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.CaseUpdateForm>,
    });

    const show = (next: API.Case) => {
      setInstance(next);
      setIsEditing(false);
      setAdditionalAssignees([]);
      mainForm.reset({
        category: next.category,
        status: next.status,
        summary: next.summary,
        description: next.description,
        reference: next.reference,
        title: next.title,
        court: next.court,
        assigned_to: next?.assigned_to?.id ? next.assigned_to.id : null,
        client: next?.client?.id ? next.client.id : null,
      });
      scrollRef.current?.scrollTo({ top: 0 });
      setIsOpen(true);
    };

    const hide = () => {
      if (isLoading) return;
      setIsOpen(false);
      setIsEditing(false);
      mainForm.reset();
    };

    useImperativeHandle(ref, () => ({
      show,
      hide,
    }));

    const handleSubmit = async (data: API.CaseUpdateForm) => {
      if (!instance) return;

      setIsLoading(true);

      const submitData = {
        ...data,
        id: instance.id,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
        client: data.client ? Number(data.client) : null,
      };

      await apiUpdateCase(submitData)
        .then((res) => {
          onSuccess?.(res.data);
          setInstance(res.data);
          setIsEditing(false);
          toast({
            title: t.common.success,
            description: modal.toasts.updatedTitle,
          });
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            const remoteValidation = getRemoteFieldsValidation(err);
            Object.keys(remoteValidation).forEach((key) => {
              mainForm.setError(key as keyof API.CaseUpdateForm, {
                type: 'server',
                message: remoteValidation[key],
              });
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    const addAssignee = () => {
      toast({
        title: modal.addAssigneeTitle,
        description: modal.addAssigneeDescription,
      });
    };

    const removeAssignee = (assigneeId: number) => {
      setAdditionalAssignees((prev) => prev.filter((a) => a.id !== assigneeId));
    };

    const getStatusBadgeColor = (status: string) => {
      switch (status) {
        case CaseStatus.OPEN:
          return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800/60';
        case CaseStatus.IN_PROGRESS:
          return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800/60';
        case CaseStatus.CLOSED:
          return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';
        case CaseStatus.CANCELLED:
          return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800/60';
        case CaseStatus.PENDING:
          return 'bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:ring-yellow-800/60';
        case CaseStatus.ARCHIVED:
          return 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';
        default:
          return 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';
      }
    };

    const fieldError = (name: keyof API.CaseUpdateForm) =>
      mainForm.formState.errors[name]?.message as string | undefined;

    const canDelete = Boolean((deleteModalRef || onDelete) && instance);
    const viewDescription = instance
      ? [instance.reference, enumLabel('caseCategory', instance.category), enumLabel('caseStatus', instance.status)]
          .filter(Boolean)
          .join(' · ')
      : modal.viewEditDescription;

    return (
      <CreateFormDialog
        open={isOpen}
        onOpenChange={(next) => {
          if (isLoading) return;
          if (!next) hide();
          else setIsOpen(true);
        }}
        isBusy={isLoading}
        formId={formId}
        title={isEditing ? modal.editTitle : instance?.title || modal.editTitle}
        description={isEditing ? modal.viewEditDescription : viewDescription}
        icon={isEditing ? Pencil : Scale}
        closeLabel={t.common.close}
        onClose={hide}
        contentClassName="md:h-[min(86vh,780px)] md:w-[min(90vw,820px)] md:max-w-[820px]"
      >
        {instance && isEditing ? (
          <form
            onSubmit={mainForm.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            noValidate
            aria-busy={isLoading}
          >
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7"
            >
              <div className="space-y-6">
                <CreateFormSection index="01" title={modal.sections.basicInformation}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CreateFormField
                      id={`${formId}-reference`}
                      label={modal.fields.reference}
                      required
                      error={fieldError('reference')}
                    >
                      <Input
                        id={`${formId}-reference`}
                        placeholder={modal.placeholders.reference}
                        className={CREATE_INPUT_CLASS}
                        disabled={isLoading}
                        {...mainForm.register('reference')}
                      />
                    </CreateFormField>
                    <CreateFormField
                      id={`${formId}-title`}
                      label={modal.fields.title}
                      required
                      error={fieldError('title')}
                    >
                      <Input
                        id={`${formId}-title`}
                        placeholder={modal.placeholders.title}
                        className={CREATE_INPUT_CLASS}
                        disabled={isLoading}
                        {...mainForm.register('title')}
                      />
                    </CreateFormField>
                    <CreateFormField
                      id={`${formId}-court`}
                      label={modal.fields.courtName}
                      required
                      error={fieldError('court')}
                    >
                      <Input
                        id={`${formId}-court`}
                        placeholder={modal.placeholders.court}
                        className={CREATE_INPUT_CLASS}
                        disabled={isLoading}
                        {...mainForm.register('court')}
                      />
                    </CreateFormField>
                    <CreateFormField
                      id={`${formId}-category`}
                      label={modal.fields.category}
                      required
                      error={fieldError('category')}
                    >
                      <Select
                        value={mainForm.watch('category')}
                        onValueChange={(val: API.CaseCategory) => mainForm.setValue('category', val)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`${formId}-category`} className={CREATE_SELECT_CLASS}>
                          <SelectValue placeholder={modal.placeholders.category} />
                        </SelectTrigger>
                        <SelectContent>
                          {enumOptions('caseCategory').map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CreateFormField>
                    <CreateFormField
                      id={`${formId}-description`}
                      label={modal.fields.description}
                      required
                      error={fieldError('description')}
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id={`${formId}-description`}
                        placeholder={modal.placeholders.descriptionDetailed}
                        className={CREATE_TEXTAREA_CLASS}
                        disabled={isLoading}
                        {...mainForm.register('description')}
                      />
                    </CreateFormField>
                  </div>
                </CreateFormSection>

                <CreateFormSection index="02" title={modal.sections.caseDetails}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CreateFormField
                      id={`${formId}-status`}
                      label={modal.fields.status}
                      required
                      error={fieldError('status')}
                    >
                      <Select
                        value={mainForm.watch('status')}
                        onValueChange={(val: API.CaseStatus) => mainForm.setValue('status', val)}
                        disabled={isLoading}
                      >
                        <SelectTrigger id={`${formId}-status`} className={CREATE_SELECT_CLASS}>
                          <SelectValue placeholder={modal.placeholders.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {enumOptions('caseStatus').map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CreateFormField>
                    <CreateFormField id={`${formId}-summary`} label={modal.fields.summary} error={fieldError('summary')}>
                      <Input
                        id={`${formId}-summary`}
                        placeholder={modal.placeholders.summary}
                        className={CREATE_INPUT_CLASS}
                        disabled={isLoading}
                        {...mainForm.register('summary')}
                      />
                    </CreateFormField>
                  </div>
                </CreateFormSection>

                <CreateFormSection index="03" title={modal.sections.assignmentRelations}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CreateFormField
                      id={`${formId}-assigned_to`}
                      label={modal.primaryAssignee}
                      error={fieldError('assigned_to')}
                    >
                      <ServerSelect
                        id={`${formId}-assigned_to`}
                        link="/cabinets/members/select_list"
                        value={mainForm.watch('assigned_to')}
                        onChange={(val) => mainForm.setValue('assigned_to', val ? Number(val) : null)}
                        labelKey="email"
                        cleanable
                        disabled={isLoading}
                        className={CREATE_SERVER_SELECT_CLASS}
                      />
                    </CreateFormField>
                    <CreateFormField
                      id={`${formId}-client`}
                      label={modal.fields.relatedClient}
                      error={fieldError('client')}
                    >
                      <ServerSelect
                        id={`${formId}-client`}
                        link="/clients/clients/"
                        value={mainForm.watch('client')}
                        onChange={(val) => mainForm.setValue('client', val)}
                        labelKey={(client: API.Client) =>
                          clientDisplayName(client) || client.email || t.cases.unnamed
                        }
                        cleanable
                        placeholder={modal.placeholders.client}
                        disabled={isLoading}
                        className={CREATE_SERVER_SELECT_CLASS}
                      />
                    </CreateFormField>
                  </div>
                </CreateFormSection>
              </div>
            </div>

            <DialogFooter className={CREATE_FOOTER_CLASS}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
                className={CREATE_CANCEL_CLASS}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isLoading} className={CREATE_SUBMIT_CLASS}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t.common.saving}
                  </>
                ) : (
                  <>
                    <Save />
                    {modal.saveChanges}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : instance ? (
          <>
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7"
            >
              <div className="space-y-6">
                <CreateFormSection index="01" title={modal.sections.caseDetails}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ViewField label={modal.fields.reference}>{instance.reference || '—'}</ViewField>
                    <ViewField label={modal.fields.status}>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                          getStatusBadgeColor(instance.status)
                        )}
                      >
                        {enumLabel('caseStatus', instance.status)}
                      </span>
                    </ViewField>
                    <ViewField label={modal.fields.court}>{instance.court || '—'}</ViewField>
                    <ViewField label={modal.fields.category}>
                      {enumLabel('caseCategory', instance.category)}
                    </ViewField>
                    <ViewField label={modal.fields.description} className="sm:col-span-2">
                      <p className="whitespace-pre-wrap font-normal leading-relaxed text-slate-700 dark:text-zinc-300">
                        {instance.description || '—'}
                      </p>
                    </ViewField>
                    {instance.summary ? (
                      <ViewField label={modal.fields.summary} className="sm:col-span-2">
                        <p className="font-normal leading-relaxed text-slate-700 dark:text-zinc-300">
                          {instance.summary}
                        </p>
                      </ViewField>
                    ) : null}
                    <ViewField label={modal.created} className="sm:col-span-2">
                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#64499D]" aria-hidden />
                        <div>
                          <p>
                            {formatDate(instance.created, lang, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          {instance.created_by ? (
                            <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-zinc-400">
                              {tf(modal.createdBy, {
                                name: `${instance.created_by.first_name} ${instance.created_by.last_name || ''}`.trim(),
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </ViewField>
                  </div>
                </CreateFormSection>

                <CreateFormSection index="02" title={modal.assignmentTeam}>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">
                        {modal.primaryAssignee}
                      </p>
                      {instance.assigned_to ? (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                          <UserAvatar
                            image={getPersonImage(instance.assigned_to as Record<string, unknown>)}
                            firstName={instance.assigned_to.first_name}
                            lastName={instance.assigned_to.last_name}
                            email={instance.assigned_to.email}
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-zinc-50">
                              {instance.assigned_to.first_name} {instance.assigned_to.last_name}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
                              {instance.assigned_to.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[13px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                          {modal.notAssigned}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">
                          {modal.additionalAssignees}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={addAssignee}
                          className="h-8 px-3 text-xs shadow-none"
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          {t.common.add}
                        </Button>
                      </div>
                      {additionalAssignees.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[13px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                          {modal.noAdditionalAssignees}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {additionalAssignees.map((assignee) => (
                            <div
                              key={assignee.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <UserAvatar
                                  image={getPersonImage(assignee as Record<string, unknown>)}
                                  firstName={assignee.first_name}
                                  lastName={assignee.last_name}
                                  size="sm"
                                  className="h-8 w-8 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13.5px] font-medium text-slate-900 dark:text-zinc-50">
                                    {assignee.first_name} {assignee.last_name}
                                  </p>
                                  <p className="truncate text-xs text-slate-500 dark:text-zinc-400">{assignee.email}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAssignee(assignee.id)}
                                className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CreateFormSection>

                {instance.client ? (
                  <CreateFormSection index="03" title={modal.fields.relatedClient}>
                    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <UserAvatar
                        image={getPersonImage(instance.client as Record<string, unknown>)}
                        firstName={
                          instance.client.client_type === 'COMPANY'
                            ? instance.client.last_name
                            : instance.client.first_name
                        }
                        lastName={instance.client.client_type === 'COMPANY' ? '' : instance.client.last_name}
                        email={instance.client.email}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-zinc-50">
                          {clientDisplayName(instance.client) || instance.client.email}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-normal text-slate-600 dark:text-zinc-400">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-[#64499D]" aria-hidden />
                            <span className="truncate">{instance.client.email}</span>
                          </span>
                          {instance.client.phone ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-[#64499D]" aria-hidden />
                              {instance.client.phone}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CreateFormSection>
                ) : null}
              </div>
            </div>

            <DialogFooter className={cn(CREATE_FOOTER_CLASS, canDelete && 'justify-between')}>
              {canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!instance) return;
                    if (deleteModalRef?.current) {
                      deleteModalRef.current.show(instance);
                    } else if (onDelete) {
                      onDelete(instance);
                    }
                  }}
                  disabled={isLoading}
                  className={cn(CREATE_CANCEL_CLASS, 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30')}
                >
                  <Trash2 />
                  {t.common.delete}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2.5">
                <Button type="button" variant="outline" onClick={hide} disabled={isLoading} className={CREATE_CANCEL_CLASS}>
                  {t.common.close}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    scrollRef.current?.scrollTo({ top: 0 });
                  }}
                  disabled={isLoading}
                  className={CREATE_SUBMIT_CLASS}
                >
                  <Edit />
                  {t.common.edit}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </CreateFormDialog>
    );
  }
);

CaseViewModal.displayName = 'CaseViewModal';

export default CaseViewModal;
