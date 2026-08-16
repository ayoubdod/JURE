import { TaskStatus } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import TaskCard from '@/components/tasks/TaskCard';

const COLUMNS: Array<{ status: API.TaskStatus; key: 'todo' | 'inProgress' | 'done' }> = [
  { status: TaskStatus.TODO, key: 'todo' },
  { status: TaskStatus.IN_PROGRESS, key: 'inProgress' },
  { status: TaskStatus.DONE, key: 'done' },
];

export default function TaskBoard({
  tasks,
  loading,
  canEdit,
  onOpen,
  onStatusDrop,
}: {
  tasks: API.Task[];
  loading: boolean;
  canEdit: boolean;
  onOpen: (task: API.Task) => void;
  onStatusDrop: (taskId: number, status: API.TaskStatus) => void;
}) {
  const { t } = useAppTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full min-h-0">
      {COLUMNS.map((col) => {
        const items = tasks.filter((task) => task.status === col.status);
        return (
          <div
            key={col.status}
            className="flex min-h-0 flex-col rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60"
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
              if (Number.isFinite(id)) onStatusDrop(id, col.status);
            }}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                {t.tasks.board[col.key]}
              </p>
              <span className="text-[10px] font-semibold tabular-nums rounded-full bg-white dark:bg-slate-900 px-1.5 py-0.5 text-slate-600 dark:text-slate-300">
                {items.length}
              </span>
            </div>
            <div className={cn('flex-1 min-h-0 overflow-y-auto p-2 space-y-2', loading && 'opacity-60')}>
              {items.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={onOpen} draggable={canEdit} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
