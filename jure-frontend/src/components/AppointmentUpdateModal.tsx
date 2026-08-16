'use client';

import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import { apiUpdateAppointment, Appointment } from '@/services/appointment/api';
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
  location?: string;
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

    const isBusy = submitPhase !== 'idle';

    const schema = useMemo(
      () =>
        yup.object({
          title: yup.string().required(v.titleRequired),
          description: yup.string().optional(),
          start_at: yup.string().required(v.startRequired),
          end_at: yup.string().required(v.endRequired),
          status: yup.string().oneOf(['scheduled', 'done', 'cancelled']).required(v.statusRequired),
          location: yup.string().optional(),
          client: yup.number().nullable().optional(),
          case: yup.number().nullable().optional(),
        }),
      [v]
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

      setDate(dateStr);
      setTime(timeStr);
      setDuration(durationStr);

      mainForm.reset({
        title: next.title,
        description: next.description || '',
        start_at: next.start_at,
        end_at: next.end_at,
        status: next.status,
        location: next.location || '',
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

      setSubmitPhase('loading');
      try {
        const startDateTime = new Date(`${date}T${time}`);
        if (Number.isNaN(startDateTime.getTime())) {
          mainForm.setError('start_at', { message: v.startRequired });
          setSubmitPhase('idle');
          return;
        }
        const endDateTime = new Date(startDateTime.getTime() + parseInt(duration, 10) * 60000);

        const res = await apiUpdateAppointment({
          id: instance.id,
          title: data.title.trim(),
          description: data.description || '',
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          status: data.status,
          location: data.location || '',
          client: data.client || null,
          case: data.case || null,
        });

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
      const order: (keyof AppointmentFormValues)[] = ['title', 'status', 'start_at', 'end_at'];
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

              <CreateFormSection index="03" title={t.calendar.scheduleDialog.clientAndCase}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CreateFormField
                    id={`${formId}-client`}
                    label={m.clientOptional}
                    error={fieldError('client')}
                  >
                    <ServerSelect
                      id={`${formId}-client`}
                      link="/clients/clients/"
                      value={mainForm.watch('client')}
                      onChange={(val) =>
                        mainForm.setValue('client', val ? Number(val) : null, { shouldDirty: true })
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
                    id={`${formId}-location`}
                    label={m.location}
                    error={fieldError('location')}
                  >
                    <Input
                      id={`${formId}-location`}
                      placeholder={m.locationPlaceholder}
                      className={CREATE_INPUT_CLASS}
                      disabled={isBusy}
                      {...mainForm.register('location')}
                    />
                  </CreateFormField>
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
