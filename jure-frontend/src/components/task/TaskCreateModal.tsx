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
import { AlertTriangle, AlignJustify, Badge, BookOpenText, Briefcase, Calendar, CheckSquare, CircleDot, FileText, Flag, Gavel, Heading, Heading1, Info, Layers, Loader2, Scale, StickyNote, Tag, Tags, Type, User, UserCheck, Users, X } from 'lucide-react';
import { apiCreateTask } from '@/services/task/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Form, FormField, FormItem } from '../ui/form';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { eventBus } from '@/utils/eventBus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';


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

const schema = yup.object({
  title: yup.string().required('Title is required'),
  description: yup.string().required('Description is required'),
  priority: yup.string().required('Priority is required'),
  status: yup.string().required('Status is required'),
  due_date: yup.string().required('Due date is required'),
  estimated_hours: yup.string().optional(),
  assigned_to: yup.string().required('Assigned to is required'),
  client: yup.string().optional(),
  case: yup.string().optional(),   // <--
});

const TaskCreateModal = forwardRef<TaskCreateModalRef, TaskCreateModalProps>(({ onSuccess }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockedCase, setLockedCase] = useState<{ id: number; label: string } | null>(null);

  const mainForm = useForm<API.TaskCreateForm>({
    resolver: yupResolver(schema) as unknown as Resolver<API.TaskCreateForm>
  });

  const show = (opts?: TaskCreateModalOpenOptions) => {
    setLockedCase(null);
    mainForm.reset();
    setIsOpen(true);
    if (opts?.relatedCaseId != null) {
      setLockedCase({
        id: opts.relatedCaseId,
        label: opts.relatedCaseLabel ?? `#${opts.relatedCaseId}`,
      });
      mainForm.setValue('case', String(opts.relatedCaseId));
    }
  };

  const hide = () => {
    setLockedCase(null);
    setIsOpen(false);
    mainForm.reset();
  };

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.TaskCreateForm) => {
    setIsLoading(true);
    await apiCreateTask(data)
      .then((res) => {
        onSuccess?.(res.data);
        eventBus.emit('task-created');
        hide();
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.TaskCreateForm, { message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
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
                  Add New Task
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  Create a new task or reminder for your legal practice.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>



        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">

          {/* Task Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Task Information
              </span>
            </div>
            <div className="space-y-4">
              <div className=" ">
                <label className="text-sm font-medium flex items-center gap-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  {...mainForm.register('title')}
                  placeholder="e.g., Review contract documents"

                  className="h-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className=" ">
                <label className="text-sm font-medium">Task Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="description" {...mainForm.register('description')} placeholder="Detailed description of the task..."
                    className="min-h-[100px] pl-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25 resize-none"
                  /> {mainForm.formState.errors.description && (
                    <p className="text-red-500 text-xs p-1 pb-0">
                      {mainForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Task Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Task Details
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="">
                <label className="text-sm font-medium">Priority</label>
                <Select value={mainForm.watch('priority')} onValueChange={(val: API.TaskPriority) => mainForm.setValue('priority', val)} >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {
                      TaskPriority.options.map((priority, index) => (
                        <SelectItem key={index} value={priority.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityDotClass(priority.value))} />
                            {priority.label}
                          </span>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {
                  mainForm.formState.errors.priority && (
                    <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.priority.message}</p>
                  )
                }
              </div>

              <div className="">
                <label className="text-sm font-medium">Status</label>
                <Select value={mainForm.watch('status')} onValueChange={(val: API.TaskStatus) => mainForm.setValue('status', val)} >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {
                      TaskStatus.options.map((status, index) => (
                        <SelectItem key={index} value={status.value}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(status.value))} />
                            {status.label}
                          </span>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {
                  mainForm.formState.errors.status && (
                    <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.status.message}</p>
                  )
                }
              </div>

            </div>
            <div className="">
              <label className="text-sm font-medium">Estimated Hours</label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                {...mainForm.register('estimated_hours')}
                placeholder="e.g., 2.5"
                className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              {mainForm.formState.errors.estimated_hours && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.estimated_hours.message}
                </p>
              )}
            </div>
          </div>

          {/* Assignment & Timeline Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Assignment & Timeline
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className=" ">
                <label className="text-sm font-medium">Assign To</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
  
                      <ServerSelect
                        link='/cabinets/members/select_list'
                        value={mainForm.watch('assigned_to')}
                        onChange={(val) => mainForm.setValue('assigned_to', val)}
                        labelKey={'email'}
                        cleanable
                      />
                      {
                        mainForm.formState.errors.assigned_to && (
                          <p className="text-red-500 text-xs p-1 pb-0">{mainForm.formState.errors.assigned_to.message}</p>
                        )
                      }

               
                </div>
              </div>
              <div className=" ">
                <label className="text-sm font-medium">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="dueDate"
                    type="date"
                    {...mainForm.register('due_date')}
                    className="h-10 pl-10 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                  {mainForm.formState.errors.due_date && (
                    <p className="text-red-500 text-xs p-1 pb-0">
                      {mainForm.formState.errors.due_date.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Related Case */}
<div className="space-y-4">
  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
    <Gavel className="w-4 h-4 text-purple-600" />
    Related Case
  </div>
  <div className="">
    <label className="text-sm font-medium">Related case</label>
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
        onChange={(val) => mainForm.setValue('case', val)}
        labelKey="title"
        cleanable
      />
    )}
    {mainForm.formState.errors.case && (
      <p className="text-red-500 text-xs p-1 pb-0">
        {String(mainForm.formState.errors.case.message)}
      </p>
    )}
  </div>
</div>

          {/* Client Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-700">
              <Briefcase className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Client Information
              </span>
            </div>
            <div className=" ">
              <label className="text-sm font-medium">Related Client (optional)</label>
              <ServerSelect
                link="/clients/clients/"
                value={mainForm.watch('client')}
                onChange={(val) => mainForm.setValue('client', val)}
                labelKey={(client) => `${client.first_name} ${client.last_name}`}
                cleanable
              />
              {mainForm.formState.errors.client && (
                <p className="text-red-500 text-xs p-1 pb-0">
                  {mainForm.formState.errors.client.message}
                </p>
              )}
            </div>
          </div>



          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="rounded-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>


      </DialogContent>
    </Dialog >
  );
});

TaskCreateModal.displayName = 'TaskCreateModal';

export default TaskCreateModal;