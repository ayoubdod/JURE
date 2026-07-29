'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  FileText, 
  Building,
  X,
  Edit,
  Loader2
} from 'lucide-react';
import { apiGetAppointment, Appointment } from '@/services/appointment/api';
import { DialogDescription } from '@radix-ui/react-dialog';
import { devError } from '@/utils/devLog';

export interface AppointmentViewModalRef {
  show: (appointmentId: number) => void;
  hide: () => void;
}

export interface AppointmentViewModalProps {
  onUpdate?: (appointment: Appointment) => void;
  updateModalRef?: React.RefObject<{ show: (appointment: Appointment) => void }>;
}

const AppointmentViewModal = forwardRef<AppointmentViewModalRef, AppointmentViewModalProps>(({ onUpdate, updateModalRef }, ref) => {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const show = async (appointmentId: number) => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const response = await apiGetAppointment(appointmentId);
      setAppointment(response.data);
    } catch (error) {
      devError('Error fetching appointment:', error);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  const hide = () => {
    setIsOpen(false);
    setAppointment(null);
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleUpdate = () => {
    if (appointment) {
      hide();
      if (updateModalRef?.current) {
        updateModalRef.current.show(appointment);
      } else if (onUpdate) {
        onUpdate(appointment);
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString()
    };
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes`;
    if (diffMins < 120) return `${Math.floor(diffMins / 60)} hour`;
    return `${Math.floor(diffMins / 60)} hours`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={hide} modal>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Appointment Details
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  View appointment information and details
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : appointment ? (
          <div className="px-8 py-6 space-y-6">
            {/* Appointment Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <FileText className="w-4 h-4 text-purple-600" />
                Appointment Information
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-base font-semibold text-gray-900 mt-1">{appointment.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Not set'}
                    </Badge>
                  </div>
                </div>
                {appointment.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{appointment.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Clock className="w-4 h-4 text-purple-600" />
                Schedule Details
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Start Date & Time
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {formatDateTime(appointment.start_at).full}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    End Date & Time
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {formatDateTime(appointment.end_at).full}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Duration</label>
                  <p className="text-sm text-gray-700 mt-1">
                    {getDuration(appointment.start_at, appointment.end_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Additional Details */}
            {appointment.location && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  Location
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    Location
                  </label>
                  <p className="text-sm text-gray-700 mt-1">{appointment.location}</p>
                </div>
              </div>
            )}

            {/* Client & Case */}
            {(appointment.client_details || appointment.case_title) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <User className="w-4 h-4 text-purple-600" />
                  Related Information
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {appointment.client_details && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Client
                      </label>
                      <p className="text-sm text-gray-700 mt-1">
                        {`${appointment.client_details.first_name || ''} ${appointment.client_details.last_name || ''}`.trim() || appointment.client_details.email}
                      </p>
                    </div>
                  )}
                  {appointment.case_title && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Case
                      </label>
                      <p className="text-sm text-gray-700 mt-1">{appointment.case_title}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={hide}
              >
                Close
              </Button>
              <Button 
                type="button" 
                variant="default" 
                onClick={handleUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Appointment
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="px-8 py-6 text-center">
            <p className="text-gray-500">Appointment not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

AppointmentViewModal.displayName = 'AppointmentViewModal';

export default AppointmentViewModal;




