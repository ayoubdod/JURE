import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TaskStatus } from '@/utils/constants';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import TaskCard from '@/components/tasks/TaskCard';

const STORAGE_KEY = 'jure.tasks.board.open';

const COLUMNS: Array<{
  status: API.TaskStatus;
  key: 'todo' | 'inProgress' | 'done' | 'cancelled';
  accent: string;
  header: string;
  count: string;
}> = [
  {
    status: TaskStatus.TODO,
    key: 'todo',
    accent: 'border-l-slate-500 bg-slate-50/90 dark:bg-slate-950/70',
    header: 'text-slate-700 dark:text-slate-200',
    count: 'bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    status: TaskStatus.IN_PROGRESS,
    key: 'inProgress',
    accent: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
    header: 'text-amber-800 dark:text-amber-200',
    count: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  {
    status: TaskStatus.DONE,
    key: 'done',
    accent: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/25',
    header: 'text-emerald-800 dark:text-emerald-200',
    count: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
  {
    status: TaskStatus.CANCELLED,
    key: 'cancelled',
    accent: 'border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/25',
    header: 'text-rose-800 dark:text-rose-200',
    count: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  },
];

const DEFAULT_OPEN: Record<(typeof COLUMNS)[number]['key'], boolean> = {
  todo: true,
  inProgress: true,
  done: true,
  cancelled: true,
};

function readOpen(): Record<(typeof COLUMNS)[number]['key'], boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_OPEN>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

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
  const [openMap, setOpenMap] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {
      /* ignore quota / private mode */
    }
  }, [openMap]);

  const toggle = (key: (typeof COLUMNS)[number]['key']) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4 md:items-stretch h-full min-h-0">
      {COLUMNS.map((col) => {
        const items = tasks.filter((task) => task.status === col.status);
        const isOpen = openMap[col.key];
        return (
          <div
            key={col.status}
            className={cn(
              'flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 border-l-[3px] dark:border-slate-800',
              col.accent,
              isOpen ? 'md:h-full' : 'self-start'
            )}
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
            <button
              type="button"
              onClick={() => toggle(col.key)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start',
                'border-b border-slate-200/80 dark:border-slate-800/80',
                'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                    col.header,
                    !isOpen && '-rotate-90 rtl:rotate-90'
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.06em]',
                    col.header
                  )}
                >
                  {t.tasks.board[col.key]}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  col.count
                )}
              >
                {items.length}
              </span>
            </button>
            {isOpen ? (
              <div className={cn('flex-1 min-h-0 overflow-y-auto p-2 space-y-2', loading && 'opacity-60')}>
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={onOpen} draggable={canEdit} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
