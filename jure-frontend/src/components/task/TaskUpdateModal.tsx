'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import CalendarAttachmentField, {
  type CalendarAttachment,
  type PendingAttachment,
  uploadCalendarAttachments,
  deleteCalendarAttachment,
} from '@/components/calendar/CalendarAttachmentField';
import { apiUpdateTask } from '@/services/task/api';
import { taskAssigneeIds } from '@/lib/workspacePeople';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { eventBus } from '@/utils/eventBus';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
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

function priorityDotClass(v: string) {
  if (v === TaskPriority.HIGH) return 'bg-amber-500';
  if (v === TaskPriority.MEDIUM) return 'bg-blue-500';
  return 'bg-slate-400';
}

function statusDotClass(v: string) {
  if (v === TaskStatus.DONE) return 'bg-emerald-500';
  if (v === TaskStatus.IN_PROGRESS) return 'bg-amber-500';
  if (v === TaskStatus.CANCELLED) return 'bg-rose-500';
  return 'bg-slate-400';
}

function relationId(value: unknown): number | string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'object' && value && 'id' in value) {
    return (value as { id: number }).id;
  }
  return value as number | string;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function valuesFromTask(instance: API.Task): API.TaskUpdateForm {
  const ids = taskAssigneeIds(instance);
  return {
    id: instance.id,
    title: instance.title,
    description: instance.description,
    priority: instance.priority,
    status: instance.status,
    due_date: toDateInput(instance.due_date),
    estimated_hours: instance.estimated_hours?.toString() ?? '',
    assigned_to: ids[0] ?? relationId(instance.assigned_to) ?? instance.assigned_to_details?.id,
    assignee_ids: ids,
    client: relationId(instance.client) ?? (instance.client_details as { id?: number } | null)?.id,
    case: instance.case ?? undefined,
  };
}

export interface TaskUpdateModalRef {
  show: (instance: API.Task) => void;
  hide: () => void;
}

export interface TaskUpdateModalProps {
  onSuccess?: (_: API.Task) => void;
}

const TaskUpdateModal = forwardRef<TaskUpdateModalRef, TaskUpdateModalProps>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const { toast } = useToast();
  const m = t.tasks.modal;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [instance, setInstance] = useState<API.Task | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<CalendarAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const isBusy = submitPhase !== 'idle';

  const schema = useMemo(
    () =>
      yup.object({
        title: yup.string().required(t.tasks.validation.titleRequired),
        description: yup.string().required(t.tasks.validation.descriptionRequired),
        priority: yup.string().required(t.tasks.validation.priorityRequired),
        status: yup.string().required(t.tasks.validation.statusRequired),
        due_date: yup.string().required(t.tasks.validation.dueDateRequired),
        estimated_hours: yup.string().optional(),
        assignee_ids: yup
          .array()
          .of(yup.number().required())
          .min(1, t.tasks.validation.assigneesRequired)
          .required(t.tasks.validation.assigneesRequired),
        client: yup.string().optional(),
        case: yup.string().optional(),
      }),
    [t]
  );

  const mainForm = useForm<API.TaskUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.TaskUpdateForm>,
  });

  const show = (next: API.Task) => {
    setInstance(next);
    setSubmitPhase('idle');
    const values = valuesFromTask(next);
    setAssigneeIds(values.assignee_ids || []);
    setExistingAttachments((next.attachments || []) as CalendarAttachment[]);
    setPendingFiles([]);
    setRemovedAttachmentIds([]);
    mainForm.reset(values);
    scrollRef.current?.scrollTo({ top: 0 });
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: API.TaskUpdateForm) => {
    if (!instance) return;
    if (!assigneeIds.length) {
      mainForm.setError('assignee_ids', { message: t.tasks.validation.assigneesRequired });
      return;
    }
    setSubmitPhase('loading');
    try {
      const res = await apiUpdateTask({
        ...data,
        id: instance.id,
        assignee_ids: assigneeIds,
        assigned_to: assigneeIds[0],
      });
      setUploadingAttachments(true);
      try {
        for (const id of removedAttachmentIds) {
          await deleteCalendarAttachment(`/tasks/tasks/${instance.id}/attachments/${id}/`);
        }
        if (pendingFiles.length) {
          await uploadCalendarAttachments(
            `/tasks/tasks/${instance.id}/attachments/`,
            pendingFiles.map((p) => p.file)
          );
        }
      } finally {
        setUploadingAttachments(false);
      }
      setSubmitPhase('success');
      toast({
        title: m.updatedTitle,
        description: tf(m.updatedDescription, { title: data.title.trim() }),
      });
      eventBus.emit('task-updated');
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onSuccess?.(res.data);
      setIsOpen(false);
      setSubmitPhase('idle');
    } catch (err) {
      setSubmitPhase('idle');
      setUploadingAttachments(false);
      devError('Error updating task:', err);
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        const keys = Object.keys(remoteValidation);
        keys.forEach((key) => {
          mainForm.setError(key as keyof API.TaskUpdateForm, { message: remoteValidation[key] });
        });
        if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof API.TaskUpdateForm)[] = [
      'title',
      'description',
      'priority',
      'status',
      'assignee_ids',
      'due_date',
    ];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const fieldError = (name: keyof API.TaskUpdateForm) =>
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
            <CreateFormSection index="01" title={m.taskInformation}>
              <div className="space-y-4">
                <CreateFormField
                  id={`${formId}-title`}
                  label={m.taskTitle}
                  required
                  error={fieldError('title')}
                >
                  <Input
                    id={`${formId}-title`}
                    placeholder={m.titlePlaceholder}
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
                  id={`${formId}-description`}
                  label={m.description}
                  required
                  error={fieldError('description')}
                >
                  <Textarea
                    id={`${formId}-description`}
                    placeholder={m.descriptionPlaceholder}
                    className={CREATE_TEXTAREA_CLASS}
                    disabled={isBusy}
                    aria-invalid={!!fieldError('description')}
                    {...mainForm.register('description')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="02" title={m.taskDetails}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField
                  id={`${formId}-priority`}
                  label={m.priority}
                  required
                  error={fieldError('priority')}
                >
                  <Select
                    value={mainForm.watch('priority') || undefined}
                    onValueChange={(val: API.TaskPriority) =>
                      mainForm.setValue('priority', val, { shouldValidate: true, shouldDirty: true })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger id={`${formId}-priority`} className={CREATE_SELECT_CLASS}>
                      <SelectValue placeholder={m.selectPriority} />
                    </SelectTrigger>
                    <SelectContent>
                      {TaskPriority.options.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityDotClass(priority.value))} />
                            {t.enums.taskPriority[priority.value] ?? priority.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-status`}
                  label={m.status}
                  required
                  error={fieldError('status')}
                >
                  <Select
                    value={mainForm.watch('status') || undefined}
                    onValueChange={(val: API.TaskStatus) =>
                      mainForm.setValue('status', val, { shouldValidate: true, shouldDirty: true })
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger id={`${formId}-status`} className={CREATE_SELECT_CLASS}>
                      <SelectValue placeholder={m.selectStatus} />
                    </SelectTrigger>
                    <SelectContent>
                      {TaskStatus.options.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(status.value))} />
                            {t.enums.taskStatus[status.value] ?? status.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-estimated_hours`}
                  label={m.estimatedHours}
                  error={fieldError('estimated_hours')}
                  className="sm:col-span-2"
                >
                  <Input
                    id={`${formId}-estimated_hours`}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder={m.estimatedHoursPlaceholder}
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    {...mainForm.register('estimated_hours')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="03" title={m.assignmentTimeline}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField
                  id={`${formId}-assignee_ids`}
                  label={m.assignTo}
                  required
                  error={fieldError('assignee_ids')}
                  className="sm:col-span-2"
                >
                  <TeamMemberMultiSelect
                    id={`${formId}-assignee_ids`}
                    value={assigneeIds}
                    onChange={(ids) => {
                      setAssigneeIds(ids);
                      mainForm.setValue('assignee_ids', ids, { shouldValidate: true, shouldDirty: true });
                      mainForm.setValue('assigned_to', ids[0], { shouldDirty: true });
                    }}
                    disabled={isBusy}
                    placeholder={m.selectAssignees}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-due_date`}
                  label={m.dueDate}
                  required
                  error={fieldError('due_date')}
                  className="sm:col-span-2"
                >
                  <Input
                    id={`${formId}-due_date`}
                    type="date"
                    className={CREATE_INPUT_CLASS}
                    disabled={isBusy}
                    {...mainForm.register('due_date')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="04" title={m.relatedInformation}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CreateFormField id={`${formId}-case`} label={m.relatedCaseOptional} error={fieldError('case')}>
                  <ServerSelect
                    id={`${formId}-case`}
                    link="/cases/"
                    value={mainForm.watch('case')}
                    onChange={(val) => mainForm.setValue('case', val, { shouldDirty: true })}
                    labelKey="title"
                    placeholder={m.selectCase}
                    cleanable
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-client`}
                  label={m.relatedClientOptional}
                  error={fieldError('client')}
                >
                  <ServerSelect
                    id={`${formId}-client`}
                    link="/clients/clients/"
                    value={mainForm.watch('client')}
                    onChange={(val) => mainForm.setValue('client', val, { shouldDirty: true })}
                    labelKey={(client) => `${client.first_name} ${client.last_name}`}
                    placeholder={m.selectClient}
                    cleanable
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="05" title={m.attachments}>
              <CalendarAttachmentField
                existing={existingAttachments.filter((a) => !removedAttachmentIds.includes(a.id))}
                pending={pendingFiles}
                onPendingChange={setPendingFiles}
                onRemoveExisting={(id) => setRemovedAttachmentIds((prev) => [...prev, id])}
                disabled={isBusy}
                uploading={uploadingAttachments}
              />
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
                {m.updatedTitle}
              </>
            ) : (
              m.updateTask
            )}
          </Button>
        </DialogFooter>
      </form>
    </CreateFormDialog>
  );
});

TaskUpdateModal.displayName = 'TaskUpdateModal';

export default TaskUpdateModal;
