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
import { apiUpdateAppointment, Appointment } from '@/services/appointment/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '@/components/common/ServerSelect';
import { eventBus } from '@/utils/eventBus';
import { useAppTranslation } from '@/i18n';

export interface AppointmentUpdateModalRef {
  show: (instance: Appointment) => void;
  hide: () => void;
}

export interface AppointmentUpdateModalProps {
  onSuccess?: (_: Appointment) => void;
}

const AppointmentUpdateModal = forwardRef<AppointmentUpdateModalRef, AppointmentUpdateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const m = t.calendar.appointmentModal;
  const v = t.calendar.scheduleDialog.validation;
  const [instance, setInstance] = useState<Appointment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');

  const schema = useMemo(() => yup.object({
    title: yup.string().required(v.titleRequired),
    description: yup.string().optional(),
    start_at: yup.string().required(v.startRequired),
    end_at: yup.string().required(v.endRequired),
    status: yup.string().oneOf(['scheduled', 'done', 'cancelled']).required(v.statusRequired),
    location: yup.string().optional(),
    client: yup.number().nullable().optional(),
    case: yup.number().nullable().optional(),
  }), [v]);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const mainForm = useForm<Partial<Appointment> & { date: string; time: string; duration: string }>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<Partial<Appointment> & { date: string; time: string; duration: string }>,
  });

  const show = (instance: Appointment) => {
    setInstance(instance);
    
    const startDate = new Date(instance.start_at);
    const endDate = new Date(instance.end_at);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    
    const dateStr = startDate.toISOString().split('T')[0];
    const timeStr = startDate.toTimeString().slice(0, 5);
    
    setDate(dateStr);
    setTime(timeStr);
    setDuration(durationMinutes.toString());
    
    mainForm.reset({
      title: instance.title,
      description: instance.description || '',
      start_at: instance.start_at,
      end_at: instance.end_at,
      status: instance.status,
      location: instance.location || '',
      client: instance.client || null,
      case: instance.case || null,
      date: dateStr,
      time: timeStr,
      duration: durationMinutes.toString(),
    });
    setIsOpen(true);
  }

  const hide = () => {
    setIsOpen(false);
    mainForm.reset();
    setDate('');
    setTime('');
    setDuration('60');
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: Partial<Appointment> & { date: string; time: string; duration: string }) => {
    if (!instance) return;
    
    setIsLoading(true);
    
    try {
      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);
      
      const appointmentData: Partial<Appointment> & { id: number } = {
        id: instance.id,
        title: data.title,
        description: data.description || '',
        start_at: startDateTime.toISOString(),
        end_at: endDateTime.toISOString(),
        status: data.status as 'scheduled' | 'done' | 'cancelled',
        location: data.location || '',
        client: data.client || null,
        case: data.case || null,
      };
      
      await apiUpdateAppointment(appointmentData)
        .then((res) => {
          onSuccess?.(res.data);
          eventBus.emit('appointment-updated');
          hide();
        })
        .catch((err) => {
          if (isAxiosError(err)) {
            const remoteValidation = getRemoteFieldsValidation(err);
            Object.keys(remoteValidation).forEach((key) => {
              mainForm.setError(key as keyof Appointment, { message: remoteValidation[key] });
            });
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } catch (error) {
      devError('Error updating appointment:', error);
      setIsLoading(false);
    }
  };

  const durationOptions = [
    { v: '30', l: m.duration30 },
    { v: '60', l: m.duration60 },
    { v: '90', l: m.duration90 },
    { v: '120', l: m.duration120 },
    { v: '180', l: m.duration180 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen} modal>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
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
                  {m.updateTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {m.updateDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <FileText className="w-4 h-4 text-purple-600" />
              {m.appointmentInfo}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{m.appointmentTitle} </span>
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  {...mainForm.register('title')}
                  placeholder={m.titlePlaceholder}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{m.status}</label>
                <Select
                  value={mainForm.watch('status')}
                  onValueChange={(value) => mainForm.setValue('status', value as 'scheduled' | 'done' | 'cancelled')}
                >
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue placeholder={m.selectStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{m.statusScheduled}</SelectItem>
                    <SelectItem value="done">{m.statusDone}</SelectItem>
                    <SelectItem value="cancelled">{m.statusCancelled}</SelectItem>
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.status && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.status.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Clock className="w-4 h-4 text-purple-600" />
              {m.scheduleDetails}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{m.date} </span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{m.time} </span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{m.duration}</label>
                <Select value={duration} onValueChange={(value) => {
                  setDuration(value);
                  if (date && time) {
                    const startDateTime = new Date(`${date}T${time}`);
                    const endDateTime = new Date(startDateTime.getTime() + parseInt(value) * 60000);
                    mainForm.setValue('start_at', startDateTime.toISOString());
                    mainForm.setValue('end_at', endDateTime.toISOString());
                  }
                }}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(({ v: val, l }) => (
                      <SelectItem key={val} value={val}>{l}</SelectItem>
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
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <User className="w-4 h-4 text-purple-600" />
              {t.calendar.scheduleDialog.clientAndCase}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{m.clientOptional}</label>
                <ServerSelect
                  link="/clients/clients/"
                  value={mainForm.watch('client')}
                  onChange={(val) => mainForm.setValue('client', val ? Number(val) : null)}
                  labelKey={(client: any) => `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || t.clients.unnamed}
                  cleanable
                  placeholder={m.selectClient}
                />
                {mainForm.formState.errors.client && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.client.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{m.caseOptional}</label>
                <ServerSelect
                  link="/cases/"
                  value={mainForm.watch('case')}
                  onChange={(val) => mainForm.setValue('case', val ? Number(val) : null)}
                  labelKey="title"
                  cleanable
                  placeholder={m.selectCase}
                />
                {mainForm.formState.errors.case && (
                  <p className="text-red-500 text-xs p-1">
                    {mainForm.formState.errors.case.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <MapPin className="w-4 h-4 text-purple-600" />
              {t.calendar.scheduleDialog.locationDetails}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{m.location}</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    {...mainForm.register('location')}
                    placeholder={m.locationPlaceholder}
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
                <label className="text-sm font-medium">{m.notes}</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    {...mainForm.register('description')}
                    rows={3}
                    placeholder={m.notesPlaceholder}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
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

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="default" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : m.updateAppointment}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

AppointmentUpdateModal.displayName = 'AppointmentUpdateModal';

export default AppointmentUpdateModal;
