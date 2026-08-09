'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, Trash2, AlertTriangle } from 'lucide-react';
import { apiDeleteTask } from '@/services/task/api';
import { eventBus } from '@/utils/eventBus';
import { useAppTranslation } from '@/i18n';

export interface TaskDeleteModalRef {
  show: (member: API.Task) => void;
  hide: () => void;
}

export interface TaskDeleteModalProps {
  onSuccess?: (_: API.Task) => void;
}

const TaskDeleteModal = forwardRef<TaskDeleteModalRef, TaskDeleteModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const [instance, setInstance] = useState<API.Task | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    show: (member: API.Task) => {
      setInstance(member);
      setIsOpen(true);
    },
    hide: () => setIsOpen(false),
  }));

  const handleSubmit = async () => {
    setIsLoading(true);
    await apiDeleteTask(instance.id)
      .then(() => {
        setIsOpen(false);
        eventBus.emit('task-deleted');
        onSuccess?.(instance);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#FF6B6B] via-[#FF8E8E] to-[#FFB3B3] overflow-hidden">
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
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t.tasks.modal.deleteTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {t.tasks.modal.deleteDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                {t.tasks.modal.deleteConfirm}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {t.tasks.modal.deleteWarning}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 pb-6 pt-0">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {t.tasks.modal.deleting}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 me-2" />
                {t.tasks.modal.deleteTask}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

TaskDeleteModal.displayName = 'TaskDeleteModal';

export default TaskDeleteModal;
