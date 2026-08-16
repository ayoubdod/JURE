import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import { TaskDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import { navigateToCaseById } from '@/lib/caseRoutes';
import TaskToolbar, { type TaskFiltersValue, type TaskViewMode } from '@/components/tasks/TaskToolbar';
import TaskList from '@/components/tasks/TaskList';
import TaskBoard from '@/components/tasks/TaskBoard';
import PaginationComponent from '@/components/common/Pagination';
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceKpiStrip,
  WorkspacePageHeader,
} from '@/components/workspace/WorkspaceChrome';
import { apiGetTasks, apiGetTaskStats, apiUpdateTask } from '@/services/task/api';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';
import { usePermission } from '@/hooks/usePermissions';
import { useShortcutAction } from '@/context/ShortcutsContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useAppTranslation } from '@/i18n';
import { eventBus } from '@/utils/eventBus';
import { useToast } from '@/hooks/use-toast';
import type { TaskStats } from '@/services/task/api';
import '@/styles/workspace-list.css';

const VIEW_KEY = 'jure.tasks.viewMode';
const PAGE_SIZE_KEY = 'jure.tasks.pageSize';

const DEFAULT_FILTERS: TaskFiltersValue = {
  search: '',
  status: 'all',
  priority: 'all',
  assignedTo: 'all',
  caseId: 'all',
  clientId: 'all',
  due: 'all',
};

function readView(): TaskViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

function readPageSize(): number {
  try {
    const n = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10);
    return n === 20 || n === 50 || n === 100 ? n : 20;
  } catch {
    return 20;
  }
}

const TasksPage: React.FC = () => {
  const { t } = useAppTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canEdit = usePermission('tasks.edit');

  const [filters, setFilters] = useState<TaskFiltersValue>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<TaskViewMode>(readView);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readPageSize);
  const [tasks, setTasks] = useState<API.Task[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [holderEl, setHolderEl] = useState<HTMLDivElement | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);

  const openCreate = useCallback(() => {
    taskCreateRef.current?.show();
  }, []);

  useShortcutAction('create-task', openCreate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (inField || e.metaKey || e.ctrlKey) return;
      if ((e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiGetTaskStats();
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiGetTasks({
        page: viewMode === 'board' ? 1 : page,
        page_size: viewMode === 'board' ? 100 : pageSize,
        search: debouncedSearch.trim() || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        assigned_to: filters.assignedTo !== 'all' ? filters.assignedTo : undefined,
        case: filters.caseId !== 'all' ? filters.caseId : undefined,
        client: filters.clientId !== 'all' ? filters.clientId : undefined,
        due: filters.due !== 'all' ? filters.due : undefined,
        ordering: 'due_date',
      });
      setTasks(res.data.results || []);
      setTotalCount(res.data.count ?? 0);
      setLastPage(res.data.last_page ?? 1);
    } catch {
      setTasks([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    viewMode,
    debouncedSearch,
    filters.status,
    filters.priority,
    filters.assignedTo,
    filters.caseId,
    filters.clientId,
    filters.due,
  ]);

  const refreshAll = useCallback(() => {
    void fetchTasks();
    void fetchStats();
  }, [fetchTasks, fetchStats]);

  useWorkspaceSync(refreshAll);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.priority, filters.assignedTo, filters.caseId, filters.clientId, filters.due, pageSize, viewMode]);

  const handleViewMode = (mode: TaskViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  };

  const openTask = (task: API.Task) => setDetailId(task.id);
  const openCase = (id: number) => void navigateToCaseById(navigate, id);

  const onStatusDrop = async (taskId: number, status: API.TaskStatus) => {
    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.status === status) return;
    try {
      await apiUpdateTask({ id: taskId, status } as API.TaskUpdateForm);
      eventBus.emit('task-updated');
      void fetchTasks();
      void fetchStats();
    } catch {
      toast({ title: t.common.error, description: t.tasks.toasts.updateFailed, variant: 'destructive' });
    }
  };

  const hasFilters =
    !!debouncedSearch.trim() ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assignedTo !== 'all' ||
    filters.caseId !== 'all' ||
    filters.clientId !== 'all' ||
    filters.due !== 'all';

  const emptyState = (
    <WorkspaceEmptyState
      icon={CheckSquare}
      title={hasFilters ? t.tasks.empty.filteredTitle : t.tasks.empty.title}
      hint={hasFilters ? t.tasks.empty.filteredHint : t.tasks.empty.emptyHint}
      action={
        !hasFilters ? (
          <Button size="sm" className="h-8 text-[12px]" onClick={openCreate}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            {t.tasks.newTask}
          </Button>
        ) : undefined
      }
    />
  );

  const errorState = (
    <WorkspaceErrorState
      title={t.tasks.loadError}
      description={t.tasks.loadErrorHint}
      retryLabel={t.common.retry}
      onRetry={refreshAll}
    />
  );

  const kpiItems = [
    { key: 'total', label: t.tasks.stats.total, value: stats?.total ?? null, accent: 'border-l-slate-400' },
    { key: 'todo', label: t.tasks.stats.todo, value: stats?.todo ?? null, accent: 'border-l-slate-500' },
    { key: 'progress', label: t.tasks.stats.inProgress, value: stats?.in_progress ?? null, accent: 'border-l-amber-500' },
    { key: 'done', label: t.tasks.stats.done, value: stats?.done ?? null, accent: 'border-l-emerald-500' },
    { key: 'overdue', label: t.tasks.stats.overdue, value: stats?.overdue ?? null, accent: 'border-l-rose-500' },
  ];

  return (
    <div ref={setHolderEl} className="relative h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 sm:px-2.5 lg:px-3">
        <WorkspacePageHeader
          title={t.tasks.title}
          subtitle={t.tasks.subtitle}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex h-9 text-[12px]" onClick={() => navigate('/dashboard/calendar')}>
                {t.tasks.goToCalendar}
              </Button>
              <Button size="sm" className="h-9 px-3 text-[12px] font-semibold rounded-md shadow-sm shadow-primary/15" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                {t.tasks.newTask}
              </Button>
            </div>
          }
        />
        <WorkspaceKpiStrip items={kpiItems} loading={statsLoading} ariaLabel={t.tasks.title} />
        <div className="py-2">
          <TaskToolbar value={filters} onChange={setFilters} viewMode={viewMode} onViewModeChange={handleViewMode} />
        </div>
        <div className="pb-3">
          {viewMode === 'board' ? (
            loadError ? (
              errorState
            ) : (
              <div className="min-h-[420px]">
                <TaskBoard
                  tasks={tasks}
                  loading={loading}
                  canEdit={canEdit}
                  onOpen={openTask}
                  onStatusDrop={onStatusDrop}
                />
              </div>
            )
          ) : (
            <TaskList tasks={tasks} loading={loading} empty={emptyState} error={loadError ? errorState : null} onOpen={openTask} />
          )}
        </div>
      </div>

      {viewMode === 'list' && !loadError && (
        <PaginationComponent
          currentPage={page}
          totalPages={Math.max(1, lastPage)}
          totalCount={totalCount}
          pageSize={pageSize}
          isLoading={loading}
          onPageChange={setPage}
          onPageSizeChange={handlePageSize}
          itemLabel={t.sidebar.tasks.toLowerCase()}
        />
      )}

      <TaskDetailPanel
        taskId={detailId}
        open={detailId != null}
        onOpenChange={(v) => !v && setDetailId(null)}
        onEdit={(task) => taskUpdateRef.current?.show(task)}
        portalContainer={holderEl}
        onOpenCase={(id) => {
          setDetailId(null);
          openCase(id);
        }}
      />
      <TaskCreateModal ref={taskCreateRef} onSuccess={refreshAll} />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={refreshAll} />
    </div>
  );
};

export default TasksPage;
