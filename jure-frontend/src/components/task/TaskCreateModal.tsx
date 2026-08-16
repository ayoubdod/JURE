'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, CheckSquare, Loader2 } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { apiCreateTask } from '@/services/task/api';
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

export type TaskCreateModalOpenOptions = {
  relatedCaseId?: number;
  relatedCaseLabel?: string;
};

export interface TaskCreateModalRef {
  show: (opts?: TaskCreateModalOpenOptions) => void;
  hide: () => void;
}

export interface TaskCreateModalProps {
  onSuccess?: (_: API.Task) => void;
}

const DEFAULT_VALUES: API.TaskCreateForm = {
  title: '',
  description: '',
  priority: undefined,
  status: undefined,
  due_date: '',
  estimated_hours: '',
  assigned_to: undefined,
  client: undefined,
  case: undefined,
};

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

const TaskCreateModal = forwardRef<TaskCreateModalRef, TaskCreateModalProps>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const { toast } = useToast();
  const m = t.tasks.modal;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const [lockedCase, setLockedCase] = useState<{ id: number; label: string } | null>(null);

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
        assigned_to: yup.string().required(t.tasks.validation.assignedToRequired),
        client: yup.string().optional(),
        case: yup.string().optional(),
      }),
    [t]
  );

  const mainForm = useForm<API.TaskCreateForm>({
    resolver: yupResolver(schema) as Resolver<API.TaskCreateForm>,
    defaultValues: DEFAULT_VALUES,
  });

  const resetLocalState = (opts?: TaskCreateModalOpenOptions) => {
    setLockedCase(null);
    mainForm.reset(DEFAULT_VALUES);
    setSubmitPhase('idle');
    scrollRef.current?.scrollTo({ top: 0 });
    if (opts?.relatedCaseId != null) {
      setLockedCase({
        id: opts.relatedCaseId,
        label: opts.relatedCaseLabel ?? `#${opts.relatedCaseId}`,
      });
      mainForm.setValue('case', String(opts.relatedCaseId));
    }
  };

  const show = (opts?: TaskCreateModalOpenOptions) => {
    resetLocalState(opts);
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: API.TaskCreateForm) => {
    setSubmitPhase('loading');
    try {
      const res = await apiCreateTask(data);
      setSubmitPhase('success');
      toast({
        title: m.createdTitle,
        description: tf(m.createdDescription, { title: data.title.trim() }),
      });
      eventBus.emit('task-created');
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
          mainForm.setError(key as keyof API.TaskCreateForm, { message: remoteValidation[key] });
        });
        if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof API.TaskCreateForm)[] = [
      'title',
      'description',
      'priority',
      'status',
      'assigned_to',
      'due_date',
    ];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const fieldError = (name: keyof API.TaskCreateForm) =>
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
      icon={CheckSquare}
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
                  id={`${formId}-assigned_to`}
                  label={m.assignTo}
                  required
                  error={fieldError('assigned_to')}
                >
                  <ServerSelect
                    id={`${formId}-assigned_to`}
                    link="/cabinets/members/select_list"
                    value={mainForm.watch('assigned_to')}
                    onChange={(val) =>
                      mainForm.setValue('assigned_to', val, { shouldValidate: true, shouldDirty: true })
                    }
                    labelKey="email"
                    placeholder={m.selectAssignee}
                    cleanable
                    disabled={isBusy}
                    className={CREATE_SERVER_SELECT_CLASS}
                  />
                </CreateFormField>
                <CreateFormField
                  id={`${formId}-due_date`}
                  label={m.dueDate}
                  required
                  error={fieldError('due_date')}
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
                <CreateFormField
                  id={`${formId}-case`}
                  label={m.relatedCaseOptional}
                  error={fieldError('case')}
                >
                  {lockedCase ? (
                    <Input
                      id={`${formId}-case`}
                      readOnly
                      disabled
                      value={lockedCase.label}
                      className={cn(CREATE_INPUT_CLASS, 'cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-zinc-900')}
                      aria-readonly
                    />
                  ) : (
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
                  )}
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
                {m.createdTitle}
              </>
            ) : (
              m.createTask
            )}
          </Button>
        </DialogFooter>
      </form>
    </CreateFormDialog>
  );
});

TaskCreateModal.displayName = 'TaskCreateModal';

export default TaskCreateModal;
