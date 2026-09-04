import { memo, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { TaskPriority, TaskStatus } from '@/utils/constants';
import { taskPriorityBadgeClass, taskStatusBadgeClass } from '@/lib/calendarEvents';
import {
  displayPersonName,
  isTaskOverdue,
  taskAssigneeId,
  taskAssigneeUser,
  taskAssigneeUsers,
  taskCaseId,
  taskClientUser,
} from '@/lib/workspacePeople';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';

const STORAGE_KEY = 'jure.tasks.list.open';

const SECTIONS: Array<{
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

const DEFAULT_OPEN: Record<(typeof SECTIONS)[number]['key'], boolean> = {
  todo: true,
  inProgress: true,
  done: true,
  cancelled: true,
};

function readOpen(): Record<(typeof SECTIONS)[number]['key'], boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_OPEN>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

export const TaskTableRow = memo(function TaskTableRow({
  task,
  rowIdx,
  onOpen,
}: {
  task: API.Task;
  rowIdx: number;
  onOpen: (task: API.Task) => void;
}) {
  const { t, lang, enumLabel } = useAppTranslation();
  const lookup = useCabinetMemberDirectory();
  const assignee = taskAssigneeUser(task);
  const assigneeUsers = taskAssigneeUsers(task);
  const assigneeId = taskAssigneeId(task);
  const cab = assigneeId != null ? lookup(assigneeId) : undefined;
  const client = taskClientUser(task);
  const overdue = isTaskOverdue(task);
  const caseId = taskCaseId(task);

  return (
    <tr
      className={cn(
        'group cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors',
        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20'
      )}
      onClick={() => onOpen(task)}
    >
      <td className="px-4 py-3 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{task.title}</p>
        {overdue && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:text-rose-400">{t.tasks.overdue}</p>
        )}
      </td>
      <td className="px-3 py-3 text-[13px] text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
        {task.case_title || (caseId != null ? `#${caseId}` : '—')}
      </td>
      <td className="px-3 py-3 text-[13px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
        {displayPersonName(client)}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {assigneeUsers.length || cab ? (
            <>
              <div className="flex -space-x-1.5 rtl:space-x-reverse shrink-0">
                {assigneeUsers.slice(0, 3).map((person) => {
                  const row = person.id != null ? lookup(person.id) : undefined;
                  return (
                    <UserAvatar
                      key={person.id || person.email}
                      size="xs"
                      className="ring-2 ring-white dark:ring-slate-950"
                      image={getPersonImage(person) ?? row?.image}
                      firstName={person.first_name ?? row?.first_name}
                      lastName={person.last_name ?? row?.last_name}
                      email={person.email ?? row?.email}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {assigneeUsers.length > 1
                  ? `${assigneeUsers.length}`
                  : displayPersonName(assigneeUsers[0] || assignee || cab)}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-400">{t.tasks.modal.unassigned}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
        {task.due_date ? formatDate(task.due_date, lang, { day: 'numeric', month: 'short', year: 'numeric' }) : t.tasks.noDueDate}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            taskPriorityBadgeClass(task.priority)
          )}
        >
          {task.priority === TaskPriority.HIGH ? t.calendar.priorityHigh : enumLabel('taskPriority', task.priority)}
        </span>
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            taskStatusBadgeClass(task.status)
          )}
        >
          {enumLabel('taskStatus', task.status)}
        </span>
      </td>
      <td className="w-8 px-2 py-3">
        <ChevronRight className="h-4 w-4 text-slate-300 ms-auto opacity-0 group-hover:opacity-100 rtl:rotate-180" />
      </td>
    </tr>
  );
});

function SectionHeader({
  title,
  count,
  open,
  onToggle,
  headerClass,
  countClass,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  headerClass: string;
  countClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
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
            headerClass,
            !open && '-rotate-90 rtl:rotate-90'
          )}
          aria-hidden
        />
        <span className={cn('text-[11px] font-semibold uppercase tracking-[0.06em]', headerClass)}>{title}</span>
      </span>
      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', countClass)}>
        {count}
      </span>
    </button>
  );
}

export default function TaskList({
  tasks,
  loading,
  empty,
  error,
  onOpen,
}: {
  tasks: API.Task[];
  loading: boolean;
  empty: ReactNode;
  error: ReactNode | null;
  onOpen: (task: API.Task) => void;
}) {
  const { t, enumLabel } = useAppTranslation();
  const cols = t.tasks.columns;
  const [openMap, setOpenMap] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {
      /* ignore quota / private mode */
    }
  }, [openMap]);

  const toggle = (key: (typeof SECTIONS)[number]['key']) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sectionTitle = (key: (typeof SECTIONS)[number]['key']) =>
    key === 'cancelled' ? enumLabel('taskStatus', TaskStatus.CANCELLED) : t.tasks.board[key];

  if (loading || error || tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
                {[cols.task, cols.case, cols.client, cols.assignee, cols.due, cols.priority, cols.status, ''].map(
                  (h, i) => (
                    <th
                      key={h || 'a'}
                      className={cn(
                        'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-start',
                        i === 0 && 'px-4'
                      )}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 animate-pulse">
                      <td className="h-12 px-4" colSpan={8}>
                        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan={8}>{error || empty}</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950" />
              ))
            : error || empty}
        </div>
      </div>
    );
  }

  const visibleSections = SECTIONS.filter(
    (section) => section.key !== 'cancelled' || tasks.some((task) => task.status === section.status)
  );

  return (
    <div className="space-y-3">
      {visibleSections.map((section) => {
        const items = tasks.filter((task) => task.status === section.status);
        const isOpen = openMap[section.key];
        return (
          <div
            key={section.status}
            className={cn(
              'overflow-hidden rounded-xl border border-slate-200/90 border-l-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800',
              section.accent
            )}
          >
            <SectionHeader
              title={sectionTitle(section.key)}
              count={items.length}
              open={isOpen}
              onToggle={() => toggle(section.key)}
              headerClass={section.header}
              countClass={section.count}
            />
            {isOpen ? (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[880px]">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/50">
                        {[cols.task, cols.case, cols.client, cols.assignee, cols.due, cols.priority, cols.status, ''].map(
                          (h, i) => (
                            <th
                              key={h || 'a'}
                              className={cn(
                                'px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 text-start',
                                i === 0 && 'px-4'
                              )}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((task, i) => (
                        <TaskTableRow key={task.id} task={task} rowIdx={i} onOpen={onOpen} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
                  {items.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpen(task)}
                      className="w-full bg-white/80 px-4 py-3 text-start hover:bg-slate-50 dark:bg-slate-950/60 dark:hover:bg-slate-900/40"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {task.case_title || displayPersonName(taskClientUser(task))} · {enumLabel('taskStatus', task.status)}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
