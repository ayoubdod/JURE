import { memo } from 'react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { TaskPriority } from '@/utils/constants';
import { taskPriorityBadgeClass, getCountdownDays } from '@/lib/calendarEvents';
import {
  displayPersonName,
  isTaskOverdue,
  taskAssigneeId,
  taskAssigneeUser,
  taskClientUser,
} from '@/lib/workspacePeople';
import { useCabinetMemberDirectory } from '@/hooks/useCabinetMemberDirectory';

export default memo(function TaskCard({
  task,
  onOpen,
  draggable,
}: {
  task: API.Task;
  onOpen: (task: API.Task) => void;
  draggable?: boolean;
}) {
  const { t, lang, enumLabel } = useAppTranslation();
  const lookup = useCabinetMemberDirectory();
  const assignee = taskAssigneeUser(task);
  const assigneeId = taskAssigneeId(task);
  const cab = assigneeId != null ? lookup(assigneeId) : undefined;
  const client = taskClientUser(task);
  const overdue = isTaskOverdue(task);
  const days = task.due_date ? getCountdownDays(task.due_date) : null;
  const dueLabel =
    !task.due_date
      ? t.tasks.noDueDate
      : overdue
        ? t.tasks.overdue
        : days === 0
          ? t.tasks.dueToday
          : formatDate(task.due_date, lang, { day: 'numeric', month: 'short' });

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(task)}
      className="w-full text-start rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
            taskPriorityBadgeClass(task.priority)
          )}
        >
          {task.priority === TaskPriority.HIGH ? t.calendar.priorityHigh : enumLabel('taskPriority', task.priority)}
        </span>
        <span className={cn('text-[10px] font-medium', overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500')}>
          {dueLabel}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-snug">{task.title}</p>
      {(task.case_title || client) && (
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {task.case_title ? `${t.tasks.columns.case}: ${task.case_title}` : null}
          {task.case_title && client ? ' · ' : null}
          {client ? `${t.tasks.columns.client}: ${displayPersonName(client)}` : null}
        </p>
      )}
      {(assignee || cab) && (
        <div className="mt-2 flex items-center gap-2">
          <UserAvatar
            size="xs"
            image={getPersonImage(assignee as unknown as Record<string, unknown>) ?? cab?.image}
            firstName={assignee?.first_name ?? cab?.first_name}
            lastName={assignee?.last_name ?? cab?.last_name}
            email={assignee?.email ?? cab?.email}
          />
          <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
            {displayPersonName(assignee || cab)}
          </span>
        </div>
      )}
    </button>
  );
});
