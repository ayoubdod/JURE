import { memo, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { TaskPriority } from '@/utils/constants';
import { taskPriorityBadgeClass, taskStatusBadgeClass } from '@/lib/calendarEvents';
import {
  displayPersonName,
  isTaskOverdue,
  taskAssigneeId,
  taskAssigneeUser,
  taskCaseId,
  taskClientUser,
} from '@/lib/workspacePeople';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';

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
          {assignee || cab ? (
            <>
              <UserAvatar
                size="xs"
                image={getPersonImage(assignee as unknown as Record<string, unknown>) ?? cab?.image}
                firstName={assignee?.first_name ?? cab?.first_name}
                lastName={assignee?.last_name ?? cab?.last_name}
                email={assignee?.email ?? cab?.email}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {displayPersonName(assignee || cab)}
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
              : error
                ? (
                  <tr>
                    <td colSpan={8}>{error}</td>
                  </tr>
                )
                : tasks.length === 0
                  ? (
                    <tr>
                      <td colSpan={8}>{empty}</td>
                    </tr>
                  )
                  : tasks.map((task, i) => (
                      <TaskTableRow key={task.id} task={task} rowIdx={i} onOpen={onOpen} />
                    ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[88px] animate-pulse bg-white dark:bg-slate-950" />
            ))
          : error
            ? error
            : tasks.length === 0
              ? empty
              : tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpen(task)}
                    className="w-full text-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {task.case_title || displayPersonName(taskClientUser(task))} · {enumLabel('taskStatus', task.status)}
                    </p>
                  </button>
                ))}
      </div>
    </div>
  );
}
