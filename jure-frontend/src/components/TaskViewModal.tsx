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
  CheckSquare, 
  Clock, 
  FileText, 
  Flag, 
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

export interface TaskViewModalRef {
  show: (taskId: number) => void;
  hide: () => void;
}

export interface TaskViewModalProps {
  onUpdate?: (task: API.Task) => void;
  updateModalRef?: React.RefObject<{ show: (task: API.Task) => void }>;
}

const TaskViewModal = forwardRef<TaskViewModalRef, TaskViewModalProps>(({ onUpdate, updateModalRef }, ref) => {
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
      case TaskPriority.LOW: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case TaskStatus.DONE: return 'bg-green-100 text-green-800';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
      case TaskStatus.TODO: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={hide} modal>
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
                  Task Details
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  View task information and details
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
            {/* Task Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <FileText className="w-4 h-4 text-purple-600" />
                Task Information
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-base font-semibold text-gray-900 mt-1">{task.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{task.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority ? TaskPriority.options.find(p => p.value === task.priority)?.label || task.priority : 'Not set'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status ? TaskStatus.options.find(s => s.value === task.status)?.label || task.status : 'Not set'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Calendar className="w-4 h-4 text-purple-600" />
                Schedule & Assignment
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due Date
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Hours</label>
                  <p className="text-sm text-gray-700 mt-1">{task.estimated_hours || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Assigned To
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    {task.assigned_to ? `${task.assigned_to.first_name || ''} ${task.assigned_to.last_name || ''}`.trim() || task.assigned_to.email : 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Related Information */}
            {(task.client || task.case) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  Related Information
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {task.client && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Client
                      </label>
                      <p className="text-sm text-gray-700 mt-1">
                        {typeof task.client === 'object' 
                          ? `${task.client.first_name || ''} ${task.client.last_name || ''}`.trim() || task.client.email
                          : 'Client'}
                      </p>
                    </div>
                  )}
                  {task.case && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Gavel className="w-4 h-4" />
                        Case
                      </label>
                      <p className="text-sm text-gray-700 mt-1">
                        {typeof task.case === 'object' ? task.case.title : (task as any).case_title || 'Case'}
                      </p>
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
                Update Task
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="px-8 py-6 text-center">
            <p className="text-gray-500">Task not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

TaskViewModal.displayName = 'TaskViewModal';

export default TaskViewModal;




