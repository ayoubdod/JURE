'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, Flag, Landmark, LayoutGrid, List, MoreHorizontal, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TooltipProvider } from '@/components/ui/tooltip';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import PaginationComponent from '@/components/common/Pagination';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import ScheduleAppointmentDialog, {
  ScheduleAppointmentDialogRef,
} from '@/components/ScheduleAppointmentDialog';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import { usePermission } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { apiGetClient } from '@/services/client/api';
import { COURT_SPECIALTIES } from '@/services/case/litigationCourt';
import { useWorkspaceCases } from '@/hooks/useWorkspaceCases';
import { navigateToCase } from '@/lib/caseRoutes';
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceKpiStrip,
  WorkspacePageHeader,
} from '@/components/workspace/WorkspaceChrome';
import LitigationList from './LitigationList';
import LitigationBoard from './LitigationBoard';
import { LitigationMobileCard, LitigationRow } from './litigation-rows';
import { thClass } from './consultation-rows';
import {
  chamberFilterLabel,
  uniqueChamberCodes,
  type LitigationLevelKey,
} from './litigationLevels';
import '@/styles/workspace-list.css';

const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'CANCELLED', 'ARCHIVED'] as const;
const CLIENT_ROLES = ['PLAINTIFF', 'DEFENDANT'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const LITIGATION_TYPES = ['CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'] as const;
const VIEW_KEY = 'jure.litigation.viewMode';
const PAGE_SIZE_KEY = 'jure.litigation.pageSize';

const KPI_ACCENT = {
  active: 'text-emerald-600',
  hearings: 'text-rose-500',
  overdue: 'text-red-500',
  high: 'text-amber-500',
};

type LitigationViewMode = 'list' | 'board';

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value || 'ALL'} onValueChange={(v) => onChange(v === 'ALL' ? '' : v)}>
      <SelectTrigger
        className={cn(
          'h-9 w-full text-[12px] rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950',
          value && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]'
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{placeholder}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function readView(): LitigationViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

function readPageSize(): number {
  try {
    const n = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10);
    return n === 20 || n === 25 || n === 50 || n === 100 ? n : 25;
  } catch {
    return 25;
  }
}

export default function LitigationWorkspace() {
  const { t, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.litigation;
  const ws = t.cases.workspaces;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = usePermission('cases.create');
  const canEdit = usePermission('cases.edit');

  const caseModalRef = useRef<CaseModalRef>(null);
  const deleteRef = useRef<CaseDeleteModalRef>(null);
  const appointmentRef = useRef<ScheduleAppointmentDialogRef>(null);
  const taskRef = useRef<TaskCreateModalRef>(null);
  const clientPreviewRef = useRef<ClientProfilePreviewRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const courtSpecialty = searchParams.get('specialty') ?? '';
  const chamber = searchParams.get('chamber') ?? '';
  const city = searchParams.get('city') ?? '';
  const litigationType = searchParams.get('type') ?? '';
  const clientRole = searchParams.get('role') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const attorneysParam = searchParams.get('attorney') ?? '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const upcomingHearing = searchParams.get('hearing') === '1';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const [pageSize, setPageSize] = useState(readPageSize);
  const [viewMode, setViewMode] = useState<LitigationViewMode>(readView);
  const [refreshKey, setRefreshKey] = useState(0);

  const attorneyIds = useMemo(
    () => attorneysParam.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0),
    [attorneysParam]
  );

  const patchParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      if (resetPage) next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const filters = useMemo(
    () => ({
      status: status || undefined,
      courtSpecialty: courtSpecialty || undefined,
      chamber: chamber || undefined,
      city: city.trim() || undefined,
      litigationType: litigationType || undefined,
      clientRole: clientRole || undefined,
      priority: priority || undefined,
      assignedToIn: attorneyIds.length ? attorneyIds.join(',') : undefined,
      upcomingHearing: upcomingHearing ? true : undefined,
      dateField: dateFrom || dateTo ? 'nextHearingDate' : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [
      status,
      courtSpecialty,
      chamber,
      city,
      litigationType,
      clientRole,
      priority,
      attorneyIds,
      upcomingHearing,
      dateFrom,
      dateTo,
    ]
  );

  const kpiSpecs = useMemo(
    () => [
      { key: 'active', params: { status: 'OPEN,IN_PROGRESS' } },
      { key: 'hearings', params: { upcomingHearing: true } },
      { key: 'overdue', params: { overdue: true } },
      { key: 'high', params: { priorityIn: 'HIGH,URGENT' } },
    ],
    []
  );

  const listPage = viewMode === 'board' ? 1 : page;
  const listPageSize = viewMode === 'board' ? 100 : pageSize;

  const { rows, totalCount, isLoading, loadError, kpiValues, refetch } = useWorkspaceCases({
    caseType: 'LITIGATION',
    search,
    filters,
    page: listPage,
    pageSize: listPageSize,
    kpiSpecs,
    refreshKey,
  });

  const hasActiveFilters = Boolean(
    search.trim() ||
      status ||
      courtSpecialty ||
      chamber ||
      city.trim() ||
      litigationType ||
      clientRole ||
      priority ||
      attorneyIds.length ||
      upcomingHearing ||
      dateFrom ||
      dateTo
  );
  const filterCount = [
    status,
    courtSpecialty,
    chamber,
    city.trim(),
    litigationType,
    clientRole,
    priority,
    attorneyIds.length ? '1' : '',
    upcomingHearing ? '1' : '',
    dateFrom || dateTo ? '1' : '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const openCreate = useCallback(() => {
    caseModalRef.current?.show(undefined, { createType: 'LITIGATION' });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if ((e.key === 'n' || e.key === 'N') && !inField && canCreate && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canCreate, openCreate]);

  const openRow = (c: API.Case) => {
    void navigateToCase(navigate, c);
  };

  const openClient = async (e: React.MouseEvent, c: API.Case) => {
    e.stopPropagation();
    const id = c.client?.id;
    if (!id) return;
    try {
      const res = await apiGetClient(id);
      clientPreviewRef.current?.show(res.data);
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const handleViewMode = (mode: LitigationViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const titleOf = (c: API.Case) => c.title || c.reference || t.cases.untitledCase;

  const levelTitle = (key: LitigationLevelKey) => {
    if (key === 'OTHER') return copy.otherLevel;
    return t.cases.modal.options.jurisdictionLevel[key];
  };

  const kpis = [
    {
      key: 'active',
      label: copy.kpis.active,
      value: kpiValues.active ?? null,
      accent: KPI_ACCENT.active,
      icon: Scale,
    },
    {
      key: 'hearings',
      label: copy.kpis.upcomingHearings,
      value: kpiValues.hearings ?? null,
      accent: KPI_ACCENT.hearings,
      icon: Landmark,
      active: upcomingHearing,
      onClick: () => patchParams({ hearing: upcomingHearing ? null : '1' }),
    },
    {
      key: 'overdue',
      label: copy.kpis.criticalDeadlines,
      value: kpiValues.overdue ?? null,
      accent: KPI_ACCENT.overdue,
      icon: AlertTriangle,
    },
    {
      key: 'high',
      label: copy.kpis.highPriority,
      value: kpiValues.high ?? null,
      accent: KPI_ACCENT.high,
      icon: Flag,
      active: priority === 'HIGH' || priority === 'URGENT',
      onClick: () => patchParams({ priority: priority === 'HIGH' ? null : 'HIGH' }),
    },
  ];

  const filterControls = (
    <>
      <FilterField label={ws.status}>
        <FilterSelect
          value={status}
          onChange={(v) => patchParams({ status: v || null })}
          placeholder={ws.allOption}
          options={CASE_STATUSES.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.courtSpecialty}>
        <FilterSelect
          value={courtSpecialty}
          onChange={(v) => patchParams({ specialty: v || null })}
          placeholder={ws.allOption}
          options={COURT_SPECIALTIES.map((s) => ({
            value: s,
            label: t.cases.modal.options.courtSpecialty[s],
          }))}
        />
      </FilterField>
      <FilterField label={ws.chamber}>
        <FilterSelect
          value={chamber}
          onChange={(v) => patchParams({ chamber: v || null })}
          placeholder={ws.allOption}
          options={uniqueChamberCodes().map((s) => ({
            value: s,
            label: chamberFilterLabel(s, t.cases.modal.options),
          }))}
        />
      </FilterField>
      <FilterField label={ws.city}>
        <Input
          value={city}
          onChange={(e) => patchParams({ city: e.target.value || null })}
          placeholder={ws.city}
          className="h-9 text-[12px]"
        />
      </FilterField>
      <FilterField label={ws.type}>
        <FilterSelect
          value={litigationType}
          onChange={(v) => patchParams({ type: v || null })}
          placeholder={ws.allOption}
          options={LITIGATION_TYPES.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.clientRole}>
        <FilterSelect
          value={clientRole}
          onChange={(v) => patchParams({ role: v || null })}
          placeholder={ws.allOption}
          options={CLIENT_ROLES.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.priority}>
        <FilterSelect
          value={priority}
          onChange={(v) => patchParams({ priority: v || null })}
          placeholder={ws.allOption}
          options={PRIORITIES.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.lawyer}>
        <TeamMemberMultiSelect
          value={attorneyIds}
          onChange={(ids) => patchParams({ attorney: ids.length ? ids.join(',') : null })}
          placeholder={ws.lawyer}
        />
      </FilterField>
      <FilterField label={copy.columns.nextDeadline}>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => patchParams({ from: e.target.value || null })}
            className="h-9 text-[12px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => patchParams({ to: e.target.value || null })}
            className="h-9 text-[12px]"
          />
        </div>
      </FilterField>
    </>
  );

  const rowActions = (c: API.Case) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
          aria-label={copy.columns.actions}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => openRow(c)}>{copy.actions.open}</DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem onClick={() => caseModalRef.current?.show(c)}>{copy.actions.edit}</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() =>
            appointmentRef.current?.show({
              relatedCaseId: c.id,
              relatedCaseLabel: titleOf(c),
            })
          }
        >
          {copy.actions.addHearing}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => taskRef.current?.show({ relatedCaseId: c.id, relatedCaseLabel: titleOf(c) })}
        >
          {copy.actions.addTask}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const tableHead = (
    <>
      <th className={thClass()}>{copy.columns.reference}</th>
      <th className={thClass()}>{copy.columns.matter}</th>
      <th className={cn(thClass(), 'hidden md:table-cell')}>{copy.columns.client}</th>
      <th className={cn(thClass(), 'hidden md:table-cell')}>{copy.columns.clientRole}</th>
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.opposingParty}</th>
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.court}</th>
      <th className={cn(thClass(), 'hidden xl:table-cell')}>{copy.columns.courtCaseNumber}</th>
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.lawyer}</th>
      <th className={thClass()}>{copy.columns.priority}</th>
      <th className={thClass()}>{copy.columns.nextDeadline}</th>
      <th className={cn(thClass(), 'hidden md:table-cell')}>{copy.columns.status}</th>
      <th className={cn(thClass(), 'text-end')}>{copy.columns.actions}</th>
    </>
  );

  const emptyState = (
    <WorkspaceEmptyState
      icon={Scale}
      title={hasActiveFilters ? t.cases.empty.noMatch : copy.emptyTitle}
      hint={hasActiveFilters ? t.cases.empty.noMatchHint : copy.emptyHint}
      action={
        hasActiveFilters ? (
          <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={resetFilters}>
            {t.cases.empty.resetFilters}
          </Button>
        ) : canCreate ? (
          <Button size="sm" className="h-8 text-[12px]" onClick={openCreate}>
            <Plus className="me-1.5 h-3.5 w-3.5" />
            {copy.newCta}
          </Button>
        ) : undefined
      }
    />
  );

  const errorState = (
    <WorkspaceErrorState
      title={t.cases.errors.fetchFailed}
      description={t.cases.empty.noMatchHint}
      retryLabel={t.cases.errors.retry}
      onRetry={() => setRefreshKey((n) => n + 1)}
    />
  );

  const viewToggle = (
    <div
      className="ms-auto inline-flex items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50"
      role="group"
      aria-label={copy.viewList}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
          viewMode === 'list'
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
            : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
        )}
        onClick={() => handleViewMode('list')}
        aria-pressed={viewMode === 'list'}
        aria-label={copy.viewList}
      >
        <List className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">{copy.viewList}</span>
      </button>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
          viewMode === 'board'
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
            : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
        )}
        onClick={() => handleViewMode('board')}
        aria-pressed={viewMode === 'board'}
        aria-label={copy.viewBoard}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">{copy.viewBoard}</span>
      </button>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden bg-transparent">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader
            title={copy.title}
            subtitle={copy.subtitle}
            actions={
              canCreate ? (
                <Button
                  size="sm"
                  className="h-9 px-3 text-[12px] font-semibold rounded-md shadow-sm shadow-primary/15"
                  onClick={openCreate}
                >
                  <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                  {copy.newCta}
                </Button>
              ) : undefined
            }
          />
          <WorkspaceKpiStrip items={kpis} ariaLabel={copy.title} />
          <div className="py-2">
            <div className="relative rounded-xl border border-slate-200/80 bg-background/90 px-2.5 py-2 backdrop-blur-sm dark:border-slate-800 sm:px-4 sm:py-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CompactSearch
                  value={search}
                  onChange={(v) => patchParams({ q: v.trim() || null })}
                  placeholder={copy.searchPlaceholder}
                  ariaLabel={t.cases.searchAria}
                  clearAriaLabel={t.cases.clearSearch}
                  inputRef={searchInputRef}
                />
                <MobileFilterSheet
                  title={ws.filters}
                  count={filterCount}
                  footer={
                    hasActiveFilters ? (
                      <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={resetFilters}>
                        {t.cases.reset}
                      </Button>
                    ) : null
                  }
                >
                  {filterControls}
                </MobileFilterSheet>
                {viewToggle}
              </div>
            </div>
          </div>

          <div className="pb-3">
            {viewMode === 'board' ? (
              loadError ? (
                errorState
              ) : !isLoading && rows.length === 0 ? (
                emptyState
              ) : (
                <div className="min-h-[420px]">
                  <LitigationBoard
                    rows={rows}
                    loading={isLoading}
                    onOpen={openRow}
                    sectionTitle={levelTitle}
                  />
                </div>
              )
            ) : (
              <LitigationList
                rows={rows}
                loading={isLoading}
                empty={emptyState}
                error={loadError ? errorState : null}
                tableHead={tableHead}
                colSpan={12}
                renderRow={(c, rowIdx) => (
                  <LitigationRow
                    key={c.id}
                    c={c}
                    zebra={rowIdx % 2 === 0}
                    copy={copy}
                    t={t}
                    enumPretty={enumPretty}
                    onOpen={() => openRow(c)}
                    onClient={(e) => void openClient(e, c)}
                    actions={rowActions(c)}
                  />
                )}
                renderMobile={(c) => (
                  <LitigationMobileCard
                    key={c.id}
                    c={c}
                    copy={copy}
                    t={t}
                    enumPretty={enumPretty}
                    onOpen={() => openRow(c)}
                    actions={rowActions(c)}
                  />
                )}
                sectionTitle={levelTitle}
              />
            )}
          </div>
        </div>

        {viewMode === 'list' && !loadError ? (
          <PaginationComponent
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
            totalCount={totalCount}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageChange={(p) => patchParams({ page: p > 1 ? String(p) : null }, false)}
            onPageSizeChange={(n) => {
              setPageSize(n);
              try {
                localStorage.setItem(PAGE_SIZE_KEY, String(n));
              } catch {
                /* ignore */
              }
              patchParams({ page: null }, false);
            }}
            itemLabel={copy.paginationLabel}
            pageSizeOptions={[
              { value: '25', label: '25' },
              { value: '20', label: '20 per page' },
              { value: '50', label: '50 per page' },
              { value: '100', label: '100 per page' },
            ]}
          />
        ) : null}
      </div>

      <CaseModal ref={caseModalRef} onSuccess={refetch} />
      <CaseDeleteModal ref={deleteRef} onSuccess={refetch} />
      <ScheduleAppointmentDialog ref={appointmentRef} onSuccess={refetch} />
      <TaskCreateModal ref={taskRef} onSuccess={() => refetch()} />
      <ClientProfilePreview ref={clientPreviewRef} />
    </TooltipProvider>
  );
}
