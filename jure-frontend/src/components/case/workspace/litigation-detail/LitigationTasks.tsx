import { Button } from '@/components/ui/button';
import { TaskStatus } from '@/utils/constants';
import { getCountdownDays } from '@/utils/caseCardHelpers';
import { formatDate, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { EmptyAction, WorkspaceCard } from './ui';
import { personName, tasksOf } from './helpers';

function groupLabel(copy: ReturnType<typeof useAppTranslation>['t']['cases']['workspaces']['litigation']['detail'], key: string) {
  if (key === 'overdue') return copy.overdue;
  if (key === 'todo') return copy.todo;
  if (key === 'in_progress') return copy.inProgress;
  return copy.done;
}

export default function LitigationTasks({
  caseItem,
  onAdd,
  onOpen,
}: {
  caseItem: API.Case;
  onAdd: () => void;
  onOpen: (id: number) => void;
}) {
  const { t, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const tasks = tasksOf(caseItem);

  const groups: Record<string, API.Task[]> = { overdue: [], todo: [], in_progress: [], done: [] };
  for (const task of tasks) {
    const overdue =
      task.status !== TaskStatus.DONE &&
      task.status !== TaskStatus.CANCELLED &&
      (getCountdownDays(task.due_date) ?? 0) < 0;
    if (overdue) groups.overdue.push(task);
    else if (task.status === TaskStatus.IN_PROGRESS) groups.in_progress.push(task);
    else if (task.status === TaskStatus.DONE) groups.done.push(task);
    else if (task.status !== TaskStatus.CANCELLED) groups.todo.push(task);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onAdd}>
          {copy.addTask}
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyAction message={copy.noTasks} actionLabel={copy.addTask} onAction={onAdd} />
      ) : (
        (['overdue', 'todo', 'in_progress', 'done'] as const).map((key) =>
          groups[key].length ? (
            <WorkspaceCard key={key} title={`${groupLabel(copy, key)} · ${groups[key].length}`}>
              <ul className="space-y-2">
                {groups[key].map((task) => {
                  const assignee =
                    personName(task.assigned_to_details) || personName(task.assignees?.[0]) || copy.noneAssigned;
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(task.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-start hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      >
                        <div>
                          <p className="text-[13px] font-medium">{task.title}</p>
                          <p className="text-[12px] text-slate-500">
                            {assignee}
                            {task.due_date
                              ? ` · ${copy.due} ${formatDate(task.due_date, lang, { day: 'numeric', month: 'short' })}`
                              : ''}
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-semibold uppercase', key === 'overdue' ? 'text-red-600' : 'text-slate-400')}>
                          {enumPretty(task.status)}
                          {task.priority ? ` · ${enumPretty(task.priority)}` : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </WorkspaceCard>
          ) : null
        )
      )}
    </div>
  );
}
