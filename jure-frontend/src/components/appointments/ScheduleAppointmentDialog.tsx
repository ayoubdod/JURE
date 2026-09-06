'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Calendar, Check, Loader2, MapPin, Video } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import JureConversationSelect from '@/components/calendar/JureConversationSelect';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import CalendarAttachmentField, {
  type PendingAttachment,
  uploadCalendarAttachments,
} from '@/components/calendar/CalendarAttachmentField';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  apiCreateAppointment,
  AppointmentConversationMode,
  AppointmentCreateForm,
  AppointmentMeetingType,
  AppointmentParticipantScope,
} from '@/services/appointment/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { eventBus } from '@/utils/eventBus';
import { devError } from '@/utils/devLog';
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

type AppointmentFormValues = AppointmentCreateForm & {
  date: string;
  time: string;
  duration: string;
  meeting_type: AppointmentMeetingType;
  participant_scope: AppointmentParticipantScope;
  conversation_mode: AppointmentConversationMode;
  conversation?: number | null;
  conversation_title?: string;
  attendee_ids: number[];
};

export type ScheduleAppointmentOpenOptions = {
  relatedCaseId?: number;
  relatedCaseLabel?: string;
};

export interface ScheduleAppointmentDialogRef {
  show: (opts?: ScheduleAppointmentOpenOptions) => void;
  hide: () => void;
}

export interface ScheduleAppointmentDialogProps {
  onSuccess?: () => void;
}

const DEFAULT_VALUES: AppointmentFormValues = {
  title: '',
  description: '',
  start_at: '',
  end_at: '',
  location: '',
  meeting_type: 'in_person',
  participant_scope: 'team',
  conversation_mode: 'create_temporary',
  conversation: null,
  conversation_title: '',
  attendee_ids: [],
  client: undefined,
  case: undefined,
  date: '',
  time: '',
  duration: '60',
};

const ScheduleAppointmentDialog = forwardRef<
  ScheduleAppointmentDialogRef,
  ScheduleAppointmentDialogProps
>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const { toast } = useToast();
  const dialog = t.calendar.scheduleDialog;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [lockedCase, setLockedCase] = useState<{ id: number; label: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);

  const isBusy = submitPhase !== 'idle';

  const schema = useMemo(
    () =>
      yup.object({
        title: yup.string().required(dialog.validation.titleRequired),
        description: yup.string().optional(),
        start_at: yup.string().required(dialog.validation.startRequired),
        end_at: yup.string().required(dialog.validation.endRequired),
        meeting_type: yup
          .mixed<AppointmentMeetingType>()
          .oneOf(['in_person', 'video'])
          .required(dialog.validation.meetingTypeRequired),
        participant_scope: yup
          .mixed<AppointmentParticipantScope>()
          .oneOf(['team', 'with_client'])
          .required(),
        attendee_ids: yup
          .array()
          .of(yup.number().required())
          .min(1, dialog.validation.attendeesRequired)
          .required(dialog.validation.attendeesRequired),
        location: yup.string().when('meeting_type', {
          is: 'in_person',
          then: (s) => s.trim().required(dialog.validation.addressRequired),
          otherwise: (s) => s.optional(),
        }),
        conversation_mode: yup
          .mixed<AppointmentConversationMode>()
          .oneOf(['existing', 'create_permanent', 'create_temporary'])
          .when('meeting_type', {
            is: 'video',
            then: (s) => s.required(),
            otherwise: (s) => s.optional(),
          }),
        conversation: yup
          .number()
          .nullable()
          .when(['meeting_type', 'conversation_mode'], ([mt, mode], schema) =>
            mt === 'video' && mode === 'existing'
              ? schema.required(dialog.validation.conversationRequired)
              : schema.nullable().optional()
          ),
        conversation_title: yup.string().optional(),
        client: yup
          .number()
          .nullable()
          .when('participant_scope', {
            is: 'with_client',
            then: (s) => s.required(dialog.validation.clientRequired),
            otherwise: (s) => s.nullable().optional(),
          }),
        case: yup.number().nullable().optional(),
      }),
    [dialog.validation]
  );

  const mainForm = useForm<AppointmentFormValues>({
    resolver: yupResolver(schema) as Resolver<AppointmentFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const applySchedule = (nextDate: string, nextTime: string, nextDuration: string) => {
    if (!nextDate || !nextTime) return;
    const startDateTime = new Date(`${nextDate}T${nextTime}`);
    if (Number.isNaN(startDateTime.getTime())) return;
    const endDateTime = new Date(startDateTime.getTime() + parseInt(nextDuration, 10) * 60000);
    mainForm.setValue('start_at', startDateTime.toISOString(), { shouldValidate: true, shouldDirty: true });
    mainForm.setValue('end_at', endDateTime.toISOString(), { shouldValidate: true, shouldDirty: true });
  };

  const resetLocalState = (opts?: ScheduleAppointmentOpenOptions) => {
    setLockedCase(null);
    mainForm.reset(DEFAULT_VALUES);
    setAttendeeIds([]);
    setDate('');
    setTime('');
    setDuration('60');
    setPendingFiles([]);
    setUploadingAttachments(false);
    setSubmitPhase('idle');
    scrollRef.current?.scrollTo({ top: 0 });
    if (opts?.relatedCaseId != null) {
      setLockedCase({
        id: opts.relatedCaseId,
        label: opts.relatedCaseLabel ?? `#${opts.relatedCaseId}`,
      });
      mainForm.setValue('case', opts.relatedCaseId);
    }
  };

  const show = (opts?: ScheduleAppointmentOpenOptions) => {
    resetLocalState(opts);
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: AppointmentFormValues) => {
    if (!date || !time) {
      mainForm.setError('start_at', { message: dialog.validation.startRequired });
      return;
    }
    if (!attendeeIds.length) {
      mainForm.setError('attendee_ids', { message: dialog.validation.attendeesRequired });
      return;
    }

    setSubmitPhase('loading');
    try {
      const startDateTime = new Date(`${date}T${time}`);
      if (Number.isNaN(startDateTime.getTime())) {
        mainForm.setError('start_at', { message: dialog.validation.startRequired });
        setSubmitPhase('idle');
        return;
      }
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration, 10) * 60000);

      const meetingType = data.meeting_type || 'in_person';
      const scope = data.participant_scope || 'team';
      const conversationMode = data.conversation_mode || 'create_temporary';
      if (meetingType === 'video' && conversationMode === 'existing' && !data.conversation) {
        mainForm.setError('conversation', { message: dialog.validation.conversationRequired });
        document.getElementById(`${formId}-conversation`)?.focus();
        setSubmitPhase('idle');
        return;
      }
      const appointmentData: AppointmentCreateForm = {
        title: data.title.trim(),
        description: data.description || '',
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        status: 'scheduled',
        meeting_type: meetingType,
        participant_scope: scope,
        attendee_ids: attendeeIds,
        location: meetingType === 'in_person' ? (data.location || '').trim() : '',
        conversation:
          meetingType === 'video' && conversationMode === 'existing'
            ? data.conversation || null
            : null,
        conversation_mode: meetingType === 'video' ? conversationMode : null,
        conversation_title:
          meetingType === 'video' && conversationMode !== 'existing'
            ? data.title.trim()
            : undefined,
        client: scope === 'with_client' ? data.client || null : null,
        case: data.case || null,
      };

      const res = await apiCreateAppointment(appointmentData);
      if (pendingFiles.length) {
        setUploadingAttachments(true);
        try {
          await uploadCalendarAttachments(
            `/tasks/appointments/${res.data.id}/attachments/`,
            pendingFiles.map((p) => p.file)
          );
        } finally {
          setUploadingAttachments(false);
        }
      }
      setSubmitPhase('success');
      toast({
        title: dialog.createdTitle,
        description: tf(dialog.createdDescription, { title: data.title.trim() }),
      });
      eventBus.emit('appointment-created');
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onSuccess?.();
      setIsOpen(false);
      setSubmitPhase('idle');
    } catch (err) {
      setSubmitPhase('idle');
      setUploadingAttachments(false);
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        const keys = Object.keys(remoteValidation);
        keys.forEach((key) => {
          mainForm.setError(key as keyof AppointmentCreateForm, { message: remoteValidation[key] });
        });
        if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
      } else {
        devError('Error creating appointment:', err);
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof AppointmentFormValues)[] = [
      'title',
      'start_at',
      'end_at',
      'participant_scope',
      'attendee_ids',
      'client',
      'meeting_type',
      'location',
      'conversation_mode',
      'conversation',
    ];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first === 'start_at' || first === 'end_at') {
      document.getElementById(`${formId}-date`)?.focus();
      return;
    }
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const fieldError = (name: keyof AppointmentFormValues) =>
    mainForm.formState.errors[name]?.message as string | undefined;

  const titleRegister = mainForm.register('title');

  const durationOptions = [
    { v: '30', l: dialog.duration30 },
    { v: '60', l: dialog.duration60 },
    { v: '90', l: dialog.duration90 },
    { v: '120', l: dialog.duration120 },
    { v: '180', l: dialog.duration180 },
  ];

  return (
    <CreateFormDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      isBusy={isBusy}
      formId={formId}
      title={dialog.title}
      description={dialog.description}
      icon={Calendar}
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
            <CreateFormSection index="01" title={dialog.appointmentInfo}>
              <CreateFormField
                id={`${formId}-title`}
                label={dialog.appointmentTitle}
                required
                error={fieldError('title')}
              >
                <Input
                  id={`${formId}-title`}
                  placeholder={dialog.titlePlaceholder}
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
            </CreateFormSection>

            <CreateFormSection index="02" title={dialog.scheduleDetails}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CreateFormField
                  id={`${formId}-date`}
                  label={dialog.date}
                  required
                  error={fieldError('start_at') || fieldError('end_at')}
                >
                  <Input
                    id={`${formId}-date`}
                    type="date"
                    value={date}
                    disabled={isBusy}
                    className={CREATE_INPUT_CLASS}
                    onChange={(e) => {
                      setDate(e.target.value);
                      applySchedule(e.target.value, time, duration);
                    }}
                  />
                </CreateFormField>
                <CreateFormField id={`${formId}-time`} label={dialog.time} required>
                  <Input
                    id={`${formId}-time`}
                    type="time"
                    value={time}
                    disabled={isBusy}
                    className={CREATE_INPUT_CLASS}
                    onChange={(e) => {
                      setTime(e.target.value);
                      applySchedule(date, e.target.value, duration);
                    }}
                  />
                </CreateFormField>
                <CreateFormField id={`${formId}-duration`} label={dialog.duration}>
                  <Select
                    value={duration}
                    disabled={isBusy}
                    onValueChange={(value) => {
                      setDuration(value);
                      applySchedule(date, time, value);
                    }}
                  >
                    <SelectTrigger id={`${formId}-duration`} className={CREATE_SELECT_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(({ v, l }) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="03" title={dialog.participants}>
              <div className="space-y-4">
                <CreateFormField
                  id={`${formId}-participant_scope`}
                  label={dialog.participantScope}
                  required
                  error={fieldError('participant_scope')}
                >
                  <RadioGroup
                    value={mainForm.watch('participant_scope') || 'team'}
                    onValueChange={(val) => {
                      const next = val as AppointmentParticipantScope;
                      mainForm.setValue('participant_scope', next, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      if (next === 'team') {
                        mainForm.setValue('client', null, { shouldDirty: true });
                      }
                    }}
                    disabled={isBusy}
                    className="gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="team" id={`${formId}-scope-team`} />
                      <Label htmlFor={`${formId}-scope-team`} className="font-normal text-[13.5px]">
                        {dialog.scopeTeam}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="with_client" id={`${formId}-scope-client`} />
                      <Label htmlFor={`${formId}-scope-client`} className="font-normal text-[13.5px]">
                        {dialog.scopeWithClient}
                      </Label>
                    </div>
                  </RadioGroup>
                </CreateFormField>

                <CreateFormField
                  id={`${formId}-attendee_ids`}
                  label={dialog.teamMembers}
                  required
                  error={fieldError('attendee_ids')}
                >
                  <TeamMemberMultiSelect
                    id={`${formId}-attendee_ids`}
                    value={attendeeIds}
                    onChange={(ids) => {
                      setAttendeeIds(ids);
                      mainForm.setValue('attendee_ids', ids, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                    disabled={isBusy}
                    placeholder={dialog.selectTeamMembers}
                  />
                </CreateFormField>

                {(mainForm.watch('participant_scope') || 'team') === 'with_client' ? (
                  <CreateFormField
                    id={`${formId}-client`}
                    label={dialog.client}
                    required
                    error={fieldError('client')}
                  >
                    <ServerSelect
                      id={`${formId}-client`}
                      link="/clients/clients/"
                      value={mainForm.watch('client')}
                      onChange={(val) =>
                        mainForm.setValue('client', val ? Number(val) : null, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      labelKey={(client: API.Client) =>
                        `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
                        client.email ||
                        t.clients.unnamed
                      }
                      placeholder={dialog.selectClient}
                      cleanable
                      disabled={isBusy}
                      className={CREATE_SERVER_SELECT_CLASS}
                    />
                  </CreateFormField>
                ) : null}

                <CreateFormField
                  id={`${formId}-case`}
                  label={dialog.relatedCase}
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
                      onChange={(val) =>
                        mainForm.setValue('case', val ? Number(val) : null, { shouldDirty: true })
                      }
                      labelKey="title"
                      placeholder={dialog.selectCase}
                      cleanable
                      disabled={isBusy}
                      className={CREATE_SERVER_SELECT_CLASS}
                    />
                  )}
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="04" title={dialog.locationDetails}>
              <div className="space-y-4">
                <CreateFormField
                  id={`${formId}-meeting_type`}
                  label={dialog.meetingType}
                  required
                  error={fieldError('meeting_type')}
                >
                  <RadioGroup
                    value={mainForm.watch('meeting_type') || 'in_person'}
                    onValueChange={(val) => {
                      const next = val as AppointmentMeetingType;
                      mainForm.setValue('meeting_type', next, { shouldValidate: true, shouldDirty: true });
                      if (next === 'video') {
                        mainForm.setValue('location', '', { shouldDirty: true });
                      } else {
                        mainForm.setValue('conversation', null, { shouldDirty: true });
                      }
                    }}
                    disabled={isBusy}
                    className="gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="in_person" id={`${formId}-mt-in`} />
                      <Label htmlFor={`${formId}-mt-in`} className="inline-flex items-center gap-1.5 font-normal text-[13.5px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                        {dialog.meetingTypeInPerson}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="video" id={`${formId}-mt-video`} />
                      <Label htmlFor={`${formId}-mt-video`} className="inline-flex items-center gap-1.5 font-normal text-[13.5px]">
                        <Video className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                        {dialog.meetingTypeVideo}
                      </Label>
                    </div>
                  </RadioGroup>
                </CreateFormField>

                {(mainForm.watch('meeting_type') || 'in_person') === 'in_person' ? (
                  <CreateFormField
                    id={`${formId}-location`}
                    label={dialog.address}
                    required
                    error={fieldError('location')}
                  >
                    <Input
                      id={`${formId}-location`}
                      placeholder={dialog.addressPlaceholder}
                      className={CREATE_INPUT_CLASS}
                      disabled={isBusy}
                      {...mainForm.register('location')}
                    />
                  </CreateFormField>
                ) : (
                  <>
                    <CreateFormField
                      id={`${formId}-conversation_mode`}
                      label={dialog.conversationMode}
                      required
                      error={fieldError('conversation_mode')}
                    >
                      <RadioGroup
                        value={mainForm.watch('conversation_mode') || 'create_temporary'}
                        onValueChange={(val) => {
                          const next = val as AppointmentConversationMode;
                          mainForm.setValue('conversation_mode', next, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          if (next !== 'existing') {
                            mainForm.setValue('conversation', null, { shouldDirty: true });
                          }
                        }}
                        disabled={isBusy}
                        className="gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="existing" id={`${formId}-cm-existing`} />
                          <Label htmlFor={`${formId}-cm-existing`} className="font-normal text-[13.5px]">
                            {dialog.conversationExisting}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="create_permanent" id={`${formId}-cm-perm`} />
                          <Label htmlFor={`${formId}-cm-perm`} className="font-normal text-[13.5px]">
                            {dialog.conversationCreatePermanent}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="create_temporary" id={`${formId}-cm-temp`} />
                          <Label htmlFor={`${formId}-cm-temp`} className="font-normal text-[13.5px]">
                            {dialog.conversationCreateTemporary}
                          </Label>
                        </div>
                      </RadioGroup>
                    </CreateFormField>

                    {(mainForm.watch('conversation_mode') || 'create_temporary') === 'existing' ? (
                      <CreateFormField
                        id={`${formId}-conversation`}
                        label={dialog.jureConversation}
                        required
                        error={fieldError('conversation')}
                      >
                        <JureConversationSelect
                          id={`${formId}-conversation`}
                          value={mainForm.watch('conversation')}
                          onChange={(id) =>
                            mainForm.setValue('conversation', id, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          disabled={isBusy}
                        />
                      </CreateFormField>
                    ) : null}
                  </>
                )}

                <CreateFormField
                  id={`${formId}-description`}
                  label={dialog.notes}
                  error={fieldError('description')}
                >
                  <Textarea
                    id={`${formId}-description`}
                    rows={3}
                    placeholder={dialog.notesPlaceholder}
                    className={CREATE_TEXTAREA_CLASS}
                    disabled={isBusy}
                    {...mainForm.register('description')}
                  />
                </CreateFormField>
              </div>
            </CreateFormSection>

            <CreateFormSection index="05" title={dialog.attachments}>
              <CalendarAttachmentField
                pending={pendingFiles}
                onPendingChange={setPendingFiles}
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
                {dialog.scheduling}
              </>
            ) : submitPhase === 'success' ? (
              <>
                <Check />
                {dialog.createdTitle}
              </>
            ) : (
              dialog.submit
            )}
          </Button>
        </DialogFooter>
      </form>
    </CreateFormDialog>
  );
});

ScheduleAppointmentDialog.displayName = 'ScheduleAppointmentDialog';

export default ScheduleAppointmentDialog;
