'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Pencil, Video } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import JureConversationSelect from '@/components/calendar/JureConversationSelect';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import CalendarAttachmentField, {
  type CalendarAttachment,
  type PendingAttachment,
  deleteCalendarAttachment,
  uploadCalendarAttachments,
} from '@/components/calendar/CalendarAttachmentField';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  apiUpdateAppointment,
  Appointment,
  AppointmentConversationMode,
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

type AppointmentFormValues = {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  status: Appointment['status'];
  meeting_type: AppointmentMeetingType;
  participant_scope: AppointmentParticipantScope;
  conversation_mode: AppointmentConversationMode;
  location?: string;
  conversation?: number | null;
  conversation_title?: string;
  attendee_ids: number[];
  client?: number | null;
  case?: number | null;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function localYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localHm(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function durationFromRange(start: Date, end: Date) {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  return String(minutes || 60);
}

function resolveAttendeeIds(appointment: Appointment): number[] {
  if (Array.isArray(appointment.attendee_ids) && appointment.attendee_ids.length) {
    return appointment.attendee_ids;
  }
  if (Array.isArray(appointment.attendees) && appointment.attendees.length) {
    return appointment.attendees.map((a) => a.id);
  }
  return [];
}

const STANDARD_DURATIONS = new Set(['30', '60', '90', '120', '180']);

export interface AppointmentUpdateModalRef {
  show: (instance: Appointment) => void;
  hide: () => void;
}

export interface AppointmentUpdateModalProps {
  onSuccess?: (_: Appointment) => void;
}

const AppointmentUpdateModal = forwardRef<AppointmentUpdateModalRef, AppointmentUpdateModalProps>(
  ({ onSuccess }, ref) => {
    const { t, tf } = useAppTranslation();
    const { toast } = useToast();
    const m = t.calendar.appointmentModal;
    const v = t.calendar.scheduleDialog.validation;
    const formId = useId();
    const titleRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [instance, setInstance] = useState<Appointment | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('60');
    const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<CalendarAttachment[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [attendeeIds, setAttendeeIds] = useState<number[]>([]);

    const isBusy = submitPhase !== 'idle';

    const schema = useMemo(
      () =>
        yup.object({
          title: yup.string().required(v.titleRequired),
          description: yup.string().optional(),
          start_at: yup.string().required(v.startRequired),
          end_at: yup.string().required(v.endRequired),
          status: yup.string().oneOf(['scheduled', 'done', 'cancelled']).required(v.statusRequired),
          meeting_type: yup
            .mixed<AppointmentMeetingType>()
            .oneOf(['in_person', 'video'])
            .required(v.meetingTypeRequired),
          participant_scope: yup
            .mixed<AppointmentParticipantScope>()
            .oneOf(['team', 'with_client'])
            .required(),
          attendee_ids: yup
            .array()
            .of(yup.number().required())
            .min(1, m.validation.attendeesRequired)
            .required(m.validation.attendeesRequired),
          location: yup.string().when('meeting_type', {
            is: 'in_person',
            then: (s) => s.trim().required(v.addressRequired),
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
                ? schema.required(v.conversationRequired)
                : schema.nullable().optional()
            ),
          conversation_title: yup.string().optional(),
          client: yup
            .number()
            .nullable()
            .when('participant_scope', {
              is: 'with_client',
              then: (s) => s.required(m.validation.clientRequired),
              otherwise: (s) => s.nullable().optional(),
            }),
          case: yup.number().nullable().optional(),
        }),
      [v, m.validation]
    );

    const mainForm = useForm<AppointmentFormValues>({
      resolver: yupResolver(schema) as Resolver<AppointmentFormValues>,
    });

    const applySchedule = (nextDate: string, nextTime: string, nextDuration: string) => {
      if (!nextDate || !nextTime) return;
      const startDateTime = new Date(`${nextDate}T${nextTime}`);
      if (Number.isNaN(startDateTime.getTime())) return;
      const endDateTime = new Date(startDateTime.getTime() + parseInt(nextDuration, 10) * 60000);
      mainForm.setValue('start_at', startDateTime.toISOString(), { shouldValidate: true, shouldDirty: true });
      mainForm.setValue('end_at', endDateTime.toISOString(), { shouldValidate: true, shouldDirty: true });
    };

    const resetTransient = () => {
      setSubmitPhase('idle');
      scrollRef.current?.scrollTo({ top: 0 });
    };

    const show = (next: Appointment) => {
      resetTransient();
      setInstance(next);

      const startDate = new Date(next.start_at);
      const endDate = new Date(next.end_at);
      const dateStr = Number.isNaN(startDate.getTime()) ? '' : localYmd(startDate);
      const timeStr = Number.isNaN(startDate.getTime()) ? '' : localHm(startDate);
      const durationStr = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())
        ? '60'
        : durationFromRange(startDate, endDate);

      const initialAttendees = resolveAttendeeIds(next);
      const scope: AppointmentParticipantScope =
        next.participant_scope || (next.client ? 'with_client' : 'team');

      setDate(dateStr);
      setTime(timeStr);
      setDuration(durationStr);
      setExistingAttachments((next.attachments || []) as CalendarAttachment[]);
      setPendingFiles([]);
      setRemovedAttachmentIds([]);
      setAttendeeIds(initialAttendees);

      mainForm.reset({
        title: next.title,
        description: next.description || '',
        start_at: next.start_at,
        end_at: next.end_at,
        status: next.status,
        meeting_type: next.meeting_type || (next.location ? 'in_person' : next.conversation ? 'video' : 'in_person'),
        participant_scope: scope,
        conversation_mode: 'existing',
        location: next.location || '',
        conversation: next.conversation ?? next.jure_conversation?.id ?? null,
        conversation_title: '',
        attendee_ids: initialAttendees,
        client: next.client ?? null,
        case: next.case ?? null,
      });
      setIsOpen(true);
    };

    const hide = () => {
      if (isBusy) return;
      setIsOpen(false);
    };

    useImperativeHandle(ref, () => ({ show, hide }));

    const handleSubmit = async (data: AppointmentFormValues) => {
      if (!instance) return;
      if (!date || !time) {
        mainForm.setError('start_at', { message: v.startRequired });
        document.getElementById(`${formId}-date`)?.focus();
        return;
      }
      if (!attendeeIds.length) {
        mainForm.setError('attendee_ids', { message: m.validation.attendeesRequired });
        return;
      }

      setSubmitPhase('loading');
      try {
        const startDateTime = new Date(`${date}T${time}`);
        if (Number.isNaN(startDateTime.getTime())) {
          mainForm.setError('start_at', { message: v.startRequired });
          setSubmitPhase('idle');
          return;
        }
        const endDateTime = new Date(startDateTime.getTime() + parseInt(duration, 10) * 60000);

        const meetingType = data.meeting_type || 'in_person';
        const scope = data.participant_scope || 'team';
        const conversationMode = data.conversation_mode || 'create_temporary';
        if (meetingType === 'video' && conversationMode === 'existing' && !data.conversation) {
          mainForm.setError('conversation', { message: v.conversationRequired });
          document.getElementById(`${formId}-conversation`)?.focus();
          setSubmitPhase('idle');
          return;
        }
        const res = await apiUpdateAppointment({
          id: instance.id,
          title: data.title.trim(),
          description: data.description || '',
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          status: data.status,
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
        });

        setUploadingAttachments(true);
        try {
          for (const id of removedAttachmentIds) {
            await deleteCalendarAttachment(`/tasks/appointments/${instance.id}/attachments/${id}/`);
          }
          if (pendingFiles.length) {
            await uploadCalendarAttachments(
              `/tasks/appointments/${instance.id}/attachments/`,
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
        eventBus.emit('appointment-updated');
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        onSuccess?.(res.data);
        setIsOpen(false);
        setSubmitPhase('idle');
      } catch (err) {
        setSubmitPhase('idle');
        setUploadingAttachments(false);
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          const keys = Object.keys(remoteValidation);
          keys.forEach((key) => {
            mainForm.setError(key as keyof AppointmentFormValues, { message: remoteValidation[key] });
          });
          if (keys[0]) document.getElementById(`${formId}-${keys[0]}`)?.focus();
        } else {
          devError('Error updating appointment:', err);
        }
      }
    };

    const onInvalid = () => {
      const order: (keyof AppointmentFormValues)[] = [
        'title',
        'status',
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
      { v: '30', l: m.duration30 },
      { v: '60', l: m.duration60 },
      { v: '90', l: m.duration90 },
      { v: '120', l: m.duration120 },
      { v: '180', l: m.duration180 },
    ];
    if (duration && !STANDARD_DURATIONS.has(duration)) {
      durationOptions.push({ v: duration, l: tf(m.durationMinutes, { n: duration }) });
    }

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
              <CreateFormSection index="01" title={m.appointmentInfo}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CreateFormField
                    id={`${formId}-title`}
                    label={m.appointmentTitle}
                    required
                    error={fieldError('title')}
                    className="sm:col-span-2"
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
                    id={`${formId}-status`}
                    label={m.status}
                    required
                    error={fieldError('status')}
                    className="sm:col-span-2"
                  >
                    <Select
                      value={mainForm.watch('status')}
                      disabled={isBusy}
                      onValueChange={(value) =>
                        mainForm.setValue('status', value as Appointment['status'], {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger id={`${formId}-status`} className={CREATE_SELECT_CLASS}>
                        <SelectValue placeholder={m.selectStatus} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">{m.statusScheduled}</SelectItem>
                        <SelectItem value="done">{m.statusDone}</SelectItem>
                        <SelectItem value="cancelled">{m.statusCancelled}</SelectItem>
                      </SelectContent>
                    </Select>
                  </CreateFormField>
                </div>
              </CreateFormSection>

              <CreateFormSection index="02" title={m.scheduleDetails}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <CreateFormField
                    id={`${formId}-date`}
                    label={m.date}
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
                  <CreateFormField id={`${formId}-time`} label={m.time} required>
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
                  <CreateFormField id={`${formId}-duration`} label={m.duration}>
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
                        {durationOptions.map(({ v: val, l }) => (
                          <SelectItem key={val} value={val}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CreateFormField>
                </div>
              </CreateFormSection>

              <CreateFormSection index="03" title={m.participants}>
                <div className="space-y-4">
                  <CreateFormField
                    id={`${formId}-participant_scope`}
                    label={m.participantScope}
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
                          {m.scopeTeam}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="with_client" id={`${formId}-scope-client`} />
                        <Label htmlFor={`${formId}-scope-client`} className="font-normal text-[13.5px]">
                          {m.scopeWithClient}
                        </Label>
                      </div>
                    </RadioGroup>
                  </CreateFormField>

                  <CreateFormField
                    id={`${formId}-attendee_ids`}
                    label={m.teamMembers}
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
                      placeholder={m.selectTeamMembers}
                    />
                  </CreateFormField>

                  {(mainForm.watch('participant_scope') || 'team') === 'with_client' ? (
                    <CreateFormField
                      id={`${formId}-client`}
                      label={m.client}
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
                        placeholder={m.selectClient}
                        cleanable
                        disabled={isBusy}
                        className={CREATE_SERVER_SELECT_CLASS}
                      />
                    </CreateFormField>
                  ) : null}

                  <CreateFormField id={`${formId}-case`} label={m.caseOptional} error={fieldError('case')}>
                    <ServerSelect
                      id={`${formId}-case`}
                      link="/cases/"
                      value={mainForm.watch('case')}
                      onChange={(val) =>
                        mainForm.setValue('case', val ? Number(val) : null, { shouldDirty: true })
                      }
                      labelKey="title"
                      placeholder={m.selectCase}
                      cleanable
                      disabled={isBusy}
                      className={CREATE_SERVER_SELECT_CLASS}
                    />
                  </CreateFormField>
                </div>
              </CreateFormSection>

              <CreateFormSection index="04" title={m.locationDetails}>
                <div className="space-y-4">
                  <CreateFormField
                    id={`${formId}-meeting_type`}
                    label={m.meetingType}
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
                          {m.meetingTypeInPerson}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="video" id={`${formId}-mt-video`} />
                        <Label htmlFor={`${formId}-mt-video`} className="inline-flex items-center gap-1.5 font-normal text-[13.5px]">
                          <Video className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                          {m.meetingTypeVideo}
                        </Label>
                      </div>
                    </RadioGroup>
                  </CreateFormField>

                  {(mainForm.watch('meeting_type') || 'in_person') === 'in_person' ? (
                    <CreateFormField
                      id={`${formId}-location`}
                      label={m.address}
                      required
                      error={fieldError('location')}
                    >
                      <Input
                        id={`${formId}-location`}
                        placeholder={m.addressPlaceholder}
                        className={CREATE_INPUT_CLASS}
                        disabled={isBusy}
                        {...mainForm.register('location')}
                      />
                    </CreateFormField>
                  ) : (
                    <>
                      <CreateFormField
                        id={`${formId}-conversation_mode`}
                        label={m.conversationMode}
                        required
                        error={fieldError('conversation_mode')}
                      >
                        <RadioGroup
                          value={mainForm.watch('conversation_mode') || 'existing'}
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
                              {m.conversationExisting}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="create_permanent" id={`${formId}-cm-perm`} />
                            <Label htmlFor={`${formId}-cm-perm`} className="font-normal text-[13.5px]">
                              {m.conversationCreatePermanent}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="create_temporary" id={`${formId}-cm-temp`} />
                            <Label htmlFor={`${formId}-cm-temp`} className="font-normal text-[13.5px]">
                              {m.conversationCreateTemporary}
                            </Label>
                          </div>
                        </RadioGroup>
                      </CreateFormField>

                      {(mainForm.watch('conversation_mode') || 'existing') === 'existing' ? (
                        <CreateFormField
                          id={`${formId}-conversation`}
                          label={m.jureConversation}
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
                    label={m.notes}
                    error={fieldError('description')}
                  >
                    <Textarea
                      id={`${formId}-description`}
                      rows={3}
                      placeholder={m.notesPlaceholder}
                      className={CREATE_TEXTAREA_CLASS}
                      disabled={isBusy}
                      {...mainForm.register('description')}
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
                m.updateAppointment
              )}
            </Button>
          </DialogFooter>
        </form>
      </CreateFormDialog>
    );
  }
);

AppointmentUpdateModal.displayName = 'AppointmentUpdateModal';

export default AppointmentUpdateModal;
