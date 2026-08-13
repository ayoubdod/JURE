'use client'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, MapPin, FileText, Building, Loader2, X } from 'lucide-react';
import { apiCreateAppointment, AppointmentCreateForm } from '@/services/appointment/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '@/components/common/ServerSelect';
import { eventBus } from '@/utils/eventBus';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

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

const ScheduleAppointmentDialog = forwardRef<ScheduleAppointmentDialogRef, ScheduleAppointmentDialogProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const dialog = t.calendar.scheduleDialog;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [lockedCase, setLockedCase] = useState<{ id: number; label: string } | null>(null);

  const schema = useMemo(() => yup.object({
    title: yup.string().required(dialog.validation.titleRequired),
    description: yup.string().optional(),
    start_at: yup.string().required(dialog.validation.startRequired),
    end_at: yup.string().required(dialog.validation.endRequired),
    location: yup.string().optional(),
    client: yup.number().nullable().optional(),
    case: yup.number().nullable().optional(),
  }), [dialog.validation]);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const mainForm = useForm<AppointmentCreateForm & { date: string; time: string; duration: string }>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<AppointmentCreateForm & { date: string; time: string; duration: string }>,
  });

  const show = (opts?: ScheduleAppointmentOpenOptions) => {
    setLockedCase(null);
    mainForm.reset();
    setDate('');
    setTime('');
    setDuration('60');
    setIsOpen(true);
    if (opts?.relatedCaseId != null) {
      setLockedCase({
        id: opts.relatedCaseId,
        label: opts.relatedCaseLabel ?? `#${opts.relatedCaseId}`,
      });
      mainForm.setValue('case', opts.relatedCaseId);
    }
  };

  const hide = () => {
    setLockedCase(null);
    setIsOpen(false);
    mainForm.reset();
    setDate('');
    setTime('');
    setDuration('60');
  };

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: AppointmentCreateForm & { date: string; time: string; duration: string }) => {
    setIsLoading(true);
    
    try {
      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);
      
      const appointmentData: AppointmentCreateForm = {
        title: data.title,
        description: data.description || '',
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        status: 'scheduled' as const,
        location: data.location || '',
        client: data.client || null,
        case: data.case || null,
      };
      
      await apiCreateAppointment(appointmentData)
        .then(() => {
          onSuccess?.();
          eventBus.emit('appointment-created');
          hide();
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            const remoteValidation = getRemoteFieldsValidation(err);
            Object.keys(remoteValidation).forEach((key) => {
              mainForm.setError(key as keyof AppointmentCreateForm, { message: remoteValidation[key] });
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      devError('Error creating appointment:', error);
      setIsLoading(false);
    }
  };

  const durationOptions = [
    { v: '30', l: dialog.duration30 },
    { v: '60', l: dialog.duration60 },
    { v: '90', l: dialog.duration90 },
    { v: '120', l: dialog.duration120 },
    { v: '180', l: dialog.duration180 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen} modal>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-br from-slate-900 via-primary to-indigo-900 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
            disabled={isLoading}
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {dialog.title}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {dialog.description}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <FileText className="w-4 h-4 text-purple-600" />
              {dialog.appointmentInfo}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{dialog.appointmentTitle} </span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  {...mainForm.register('title')}
                  placeholder={dialog.titlePlaceholder}
                  className="h-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {dialog.scheduleDetails}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{dialog.date} </span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (e.target.value && time) {
                        const startDateTime = new Date(`${e.target.value}T${time}`);
                        const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);
                        mainForm.setValue('start_at', startDateTime.toISOString());
                        mainForm.setValue('end_at', endDateTime.toISOString());
                      }
                    }}
                    className="h-10 pl-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{dialog.time} </span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      if (date && e.target.value) {
                        const startDateTime = new Date(`${date}T${e.target.value}`);
                        const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);
                        mainForm.setValue('start_at', startDateTime.toISOString());
                        mainForm.setValue('end_at', endDateTime.toISOString());
                      }
                    }}
                    className="h-10 pl-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{dialog.duration}</label>
                <Select value={duration} onValueChange={(value) => {
                  setDuration(value);
                  if (date && time) {
                    const startDateTime = new Date(`${date}T${time}`);
                    const endDateTime = new Date(startDateTime.getTime() + parseInt(value) * 60000);
                    mainForm.setValue('start_at', startDateTime.toISOString());
                    mainForm.setValue('end_at', endDateTime.toISOString());
                  }
                }}>
                  <SelectTrigger className="h-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(({ v, l }) => (
                      <SelectItem key={v} value={v}>
                        <span className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {l}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(mainForm.formState.errors.start_at || mainForm.formState.errors.end_at) && (
              <p className="text-red-500 text-xs p-1">
                {mainForm.formState.errors.start_at?.message || mainForm.formState.errors.end_at?.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <User className="w-4 h-4 text-purple-600" />
              {dialog.clientAndCase}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{dialog.clientOptional}</label>
                <ServerSelect
                  link="/clients/clients/"
                  value={mainForm.watch('client')}
                  onChange={(val) => mainForm.setValue('client', val ? Number(val) : null)}
                  labelKey={(client: any) => `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || t.clients.unnamed}
                  cleanable
                  placeholder={dialog.selectClient}
                />
                {mainForm.formState.errors.client && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.client.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{dialog.relatedCase}</label>
                {lockedCase ? (
                  <Input
                    readOnly
                    disabled
                    value={lockedCase.label}
                    className="h-10 rounded-lg bg-muted/80 text-muted-foreground cursor-not-allowed opacity-100 border-slate-200 dark:border-slate-700"
                    aria-readonly
                  />
                ) : (
                  <ServerSelect
                    link="/cases/"
                    value={mainForm.watch('case')}
                    onChange={(val) => mainForm.setValue('case', val ? Number(val) : null)}
                    labelKey="title"
                    cleanable
                    placeholder={dialog.selectCase}
                  />
                )}
                {mainForm.formState.errors.case && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.case.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                {dialog.locationDetails}
              </span>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{dialog.location}</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    {...mainForm.register('location')}
                    placeholder={dialog.locationPlaceholder}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                {mainForm.formState.errors.location && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.location.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{dialog.notes}</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Textarea
                    {...mainForm.register('description')}
                    rows={3}
                    placeholder={dialog.notesPlaceholder}
                    className="min-h-[80px] pl-10 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25 resize-none"
                  />
                </div>
                {mainForm.formState.errors.description && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="default" disabled={isLoading} className="rounded-lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {dialog.scheduling}
                </>
              ) : (
                dialog.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ScheduleAppointmentDialog.displayName = 'ScheduleAppointmentDialog';

export default ScheduleAppointmentDialog;
