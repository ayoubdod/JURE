'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  CheckSquare, 
  Clock, 
  FileText, 
  User, 
  Gavel, 
  Briefcase,
  X,
  Edit,
  Loader2
} from 'lucide-react';
import { apiGetTask } from '@/services/task/api';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

export interface TaskViewModalRef {
  show: (taskId: number) => void;
  hide: () => void;
}

export interface TaskViewModalProps {
  onUpdate?: (task: API.Task) => void;
  updateModalRef?: React.RefObject<{ show: (task: API.Task) => void }>;
}

const TaskViewModal = forwardRef<TaskViewModalRef, TaskViewModalProps>(({ onUpdate, updateModalRef }, ref) => {
  const { t } = useAppTranslation();
  const m = t.tasks.modal;
  const [task, setTask] = useState<API.Task | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const show = async (taskId: number) => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const response = await apiGetTask(taskId);
      setTask(response.data);
    } catch (error) {
      devError('Error fetching task:', error);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  const hide = () => {
    setIsOpen(false);
    setTask(null);
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleUpdate = () => {
    if (task) {
      hide();
      if (updateModalRef?.current) {
        updateModalRef.current.show(task);
      } else if (onUpdate) {
        onUpdate(task);
      }
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-100 text-red-800';
      case TaskPriority.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case TaskPriority.LOW: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case TaskStatus.DONE: return 'bg-green-100 text-green-800';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
      case TaskStatus.TODO: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={hide} modal>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#4ECDC4] via-[#64499D] to-[#FF6B6B] overflow-hidden">
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
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {m.viewTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {m.viewDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : task ? (
          <div className="px-8 py-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                <FileText className="w-4 h-4 text-purple-600" />
                {m.taskInformation}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.title}</label>
                  <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{task.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.description}</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{task.description || m.noDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.priority}</label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority
                          ? (t.enums.taskPriority[task.priority] ?? TaskPriority.options.find(p => p.value === task.priority)?.label ?? task.priority)
                          : m.notSet}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.status}</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status
                          ? (t.enums.taskStatus[task.status] ?? TaskStatus.options.find(s => s.value === task.status)?.label ?? task.status)
                          : m.notSet}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                <Calendar className="w-4 h-4 text-purple-600" />
                {m.scheduleAssignment}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {m.dueDate}
                  </label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : m.notSet}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.estimatedHours}</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{task.estimated_hours || m.notSet}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {m.assignedTo}
                  </label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {task.assigned_to ? `${task.assigned_to.first_name || ''} ${task.assigned_to.last_name || ''}`.trim() || task.assigned_to.email : m.unassigned}
                  </p>
                </div>
              </div>
            </div>

            {(task.client || task.case) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  {m.relatedInformation}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {task.client && (
                    <div>
                      <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {m.client}
                      </label>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {typeof task.client === 'object' 
                          ? `${task.client.first_name || ''} ${task.client.last_name || ''}`.trim() || task.client.email
                          : m.client}
                      </p>
                    </div>
                  )}
                  {task.case && (
                    <div>
                      <label className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Gavel className="w-4 h-4" />
                        {m.case}
                      </label>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {typeof task.case === 'object' ? task.case.title : (task as any).case_title || m.case}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-200/90 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={hide}
              >
                {t.common.close}
              </Button>
              <Button 
                type="button" 
                variant="default" 
                onClick={handleUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Edit className="w-4 h-4 me-2" />
                {m.updateTask}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="px-8 py-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">{m.notFound}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

TaskViewModal.displayName = 'TaskViewModal';

export default TaskViewModal;
