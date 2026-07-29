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
import { AlertTriangle, Calendar, CheckSquare, Clock, FileText, Flag, Loader2, User, Gavel, X } from 'lucide-react';
import { apiUpdateTask } from '@/services/task/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import { devError } from '@/utils/devLog';

export interface TaskUpdateModalRef {
  show: (instance: API.Task) => void;
  hide: () => void;
}

export interface TaskUpdateModalProps {
  onSuccess?: (_: API.Task) => void;
}

const schema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string().required('Description is required'),
  priority: yup.string().required('Priority is required'),
  status: yup.string().required('Status is required'),
  due_date: yup.string().required('Due date is required'),
  estimated_hours: yup.string().optional(),
  assigned_to: yup.string().required('Assigned to is required'),
  client: yup.string().optional(),
  case: yup.string().optional(),
});

const TaskUpdateModal = forwardRef<TaskUpdateModalRef, TaskUpdateModalProps>(({ onSuccess }, ref) => {
  const [instance, setInstance] = useState<API.Task | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mainForm = useForm<API.TaskUpdateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.TaskUpdateForm>
  });

  const show = (instance: API.Task) => {
    setInstance(instance);

    mainForm.reset({
      title: instance.title,
      description: instance.description,
      priority: instance.priority,
      status: instance.status,
      due_date: instance.due_date,
      estimated_hours: instance.estimated_hours?.toString(),
      assigned_to: instance.assigned_to?.id,
      client: instance.client?.id,
      // case: instance.case?.id?.toString?.() || (instance as any).case?.toString?.(), // <--
    });
    setIsOpen(true);
  }

  const hide = () => {
    setIsOpen(false);
    mainForm.reset();
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.TaskUpdateForm) => {
    setIsLoading(true);
    try {
      const res = await apiUpdateTask({
        ...data,
        id: instance!.id,
      });
      onSuccess?.(res.data);
      hide();
    } catch (err) {
      devError('Error updating task:', err);
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        Object.keys(remoteValidation).forEach((key) => {
          mainForm.setError(key as keyof API.TaskUpdateForm, { message: remoteValidation[key] });
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#4ECDC4] via-[#64499D] to-[#FF6B6B] overflow-hidden">
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
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Update Task
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Update the task information below.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          {/* Task Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <FileText className="w-4 h-4 text-jure-600" />
              Task Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  <span>Title</span>
                </label>
                <Input
                  {...mainForm.register('title')}
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder="Enter task title"
                />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  <span>Priority</span>
                </label>
                <Select value={mainForm.watch('priority')} onValueChange={(value) => mainForm.setValue('priority', value as API.TaskPriority)}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {TaskPriority.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.priority && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.priority.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                <span>Description</span>
              </label>
              <Textarea
                {...mainForm.register('description')}
                className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                placeholder="Enter task description"
                rows={3}
              />
              {mainForm.formState.errors.description && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>

          {/* Task Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="w-4 h-4 text-jure-600" />
              Task Details
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  <span>Status</span>
                </label>
                <Select value={mainForm.watch('status')} onValueChange={(value) => mainForm.setValue('status', value as API.TaskStatus)}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {TaskStatus.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.status && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  <span>Due Date</span>
                </label>
                <Input
                  {...mainForm.register('due_date')}
                  type="date"
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                />
                {mainForm.formState.errors.due_date && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.due_date.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  <span>Estimated Hours</span>
                </label>
                <Input
                  {...mainForm.register('estimated_hours')}
                  type="number"
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  placeholder="0"
                />
                {mainForm.formState.errors.estimated_hours && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.estimated_hours.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  <span>Assigned To</span>
                </label>
                <ServerSelect
                  link="/cabinets/members/select_list/"
                  labelKey="email"
                  value={mainForm.watch('assigned_to')}
                  onChange={(value) => mainForm.setValue('assigned_to', value)}
                  placeholder="Select assignee"
                  className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
                  showAvatar
                />
                {mainForm.formState.errors.assigned_to && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.assigned_to.message}
                  </p>
                )}
              </div>
            </div>
            {/* Related Case */}
<div className="mt-2">
  <label className="text-sm font-medium flex items-center gap-2">
    <Gavel className="w-4 h-4 text-jure-600" />
    <span>Related Case (optional)</span>
  </label>

  <ServerSelect
    link="/cases/"
    value={mainForm.watch('case')}
    onChange={(value) => mainForm.setValue('case', value)}
    placeholder="Select case"
    className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
  />

  {mainForm.formState.errors.case && (
    <p className="text-red-500 text-xs p-1 pb-0">
      {String(mainForm.formState.errors.case.message)}
    </p>
  )}
</div>

            <div>
              <label className="text-sm font-medium">
                <span>Client (Optional)</span>
              </label>
              <ServerSelect
                link="/clients/clients/"
                value={mainForm.watch('client')}
                onChange={(value) => mainForm.setValue('client', value)}
                labelKey={(client) => `${client.first_name} ${client.last_name}`}
                placeholder="Select client"
                className="transition-all duration-200 focus:ring-2 focus:ring-jure-600/20 focus:border-jure-600"
              />
              {mainForm.formState.errors.client && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.client.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Update Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

TaskUpdateModal.displayName = 'TaskUpdateModal';
export default TaskUpdateModal;
