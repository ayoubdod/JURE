'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Briefcase, Calendar, CalendarClock, CalendarDays, Clock, LayoutGrid, List, MoreHorizontal, Plus, Scale, X } from 'lucide-react';
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
  DropdownMenuSeparator,
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
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import { usePermission } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { formatTime, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import {
  apiGetCases,
  apiRetryConsultationEmail,
  apiUpdateCase,
} from '@/services/case/api';
import { apiGetClient } from '@/services/client/api';
import { clientDisplayName, consultationOutcome } from '@/services/case/caseType';
import { getCaseData } from '@/utils/caseCardHelpers';
import { canShowConvertToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { useWorkspaceCases } from '@/hooks/useWorkspaceCases';
import { caseWorkspacePath, navigateToCaseById } from '@/lib/caseRoutes';
import { endOfLocalWeek, startOfLocalWeek } from '@/lib/calendarEvents';
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceKpiStrip,
  WorkspacePageHeader,
} from '@/components/workspace/WorkspaceChrome';
import ConsultationList from './ConsultationList';
import ConsultationBoard from './ConsultationBoard';
import { ConsultationMobileCard, ConsultationRow, thClass } from './consultation-rows';
import {
  consultationStatusOf,
  type ConsultationStatusKey,
} from './consultationStatus';
import '@/styles/workspace-list.css';

const JURE_PURPLE = '#64499D';
const CONSULTATION_TYPES = ['PREVENTIVE', 'REACTIVE'] as const;
const FORMATS = ['IN_PERSON', 'PHONE', 'VIDEO'] as const;
const LEGAL_DOMAINS = ['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'] as const;
const VIEW_KEY = 'jure.consultations.viewMode';
const PAGE_SIZE_KEY = 'jure.consultations.pageSize';

const KPI_ACCENT = {
  today: 'text-indigo-500',
  upcoming: 'text-blue-500',
  followUp: 'text-amber-500',
  converted: 'text-[#64499D]',
  thisMonth: 'text-slate-400',
};

type ConsultationViewMode = 'list' | 'board';

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

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readView(): ConsultationViewMode {
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

export default function ConsultationWorkspace() {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.consultation;
  const ws = t.cases.workspaces;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = usePermission('cases.create');
  const canEdit = usePermission('cases.edit');
  const canDelete = usePermission('cases.delete');

  const caseModalRef = useRef<CaseModalRef>(null);
  const deleteRef = useRef<CaseDeleteModalRef>(null);
  const clientPreviewRef = useRef<ClientProfilePreviewRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const search = searchParams.get('q') ?? '';
  const consultationType = searchParams.get('type') ?? '';
  const format = searchParams.get('format') ?? '';
  const legalDomain = searchParams.get('domain') ?? '';
  const attorneysParam = searchParams.get('attorney') ?? '';
  const datePreset = searchParams.get('date') ?? '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const followUpFilter = searchParams.get('follow') ?? '';
  const converted = searchParams.get('converted') ?? '';
  const sort = searchParams.get('sort') ?? 'upcoming';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const [pageSize, setPageSize] = useState(readPageSize);
  const [viewMode, setViewMode] = useState<ConsultationViewMode>(readView);
  const [refreshKey, setRefreshKey] = useState(0);
  const [todayRows, setTodayRows] = useState<API.Case[]>([]);

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
      next.delete('status');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (!searchParams.has('status')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const weekRange = useMemo(() => {
    const start = startOfLocalWeek();
    const end = endOfLocalWeek();
    return { from: isoDate(start), to: isoDate(end) };
  }, []);

  const filters = useMemo(() => {
    const todayOn = datePreset === 'today';
    const monthOn = datePreset === 'month';
    const weekOn = datePreset === 'week';
    const customOn = datePreset === 'custom';
    return {
      consultationType: consultationType || undefined,
      format: format || undefined,
      legalDomain: legalDomain || undefined,
      assignedToIn: attorneyIds.length ? attorneyIds.join(',') : undefined,
      followUpFilter: followUpFilter || undefined,
      converted: converted || undefined,
      today: todayOn ? true : undefined,
      thisMonth: monthOn ? true : undefined,
      upcoming: datePreset === 'upcoming' ? true : undefined,
      dateField: weekOn || customOn ? 'consultationDate' : undefined,
      dateFrom: weekOn ? weekRange.from : customOn ? dateFrom || undefined : undefined,
      dateTo: weekOn ? weekRange.to : customOn ? dateTo || undefined : undefined,
      ordering: sort,
    };
  }, [
    consultationType,
    format,
    legalDomain,
    attorneyIds,
    followUpFilter,
    converted,
    datePreset,
    dateFrom,
    dateTo,
    sort,
    weekRange.from,
    weekRange.to,
  ]);

  const kpiSpecs = useMemo(
    () => [
      { key: 'today', params: { today: true } },
      { key: 'upcoming', params: { upcoming: true } },
      { key: 'followUp', params: { followUpFilter: 'required' } },
      { key: 'converted', params: { converted: '1' } },
      { key: 'thisMonth', params: { thisMonth: true } },
    ],
    []
  );

  const listPage = viewMode === 'board' ? 1 : page;
  const listPageSize = viewMode === 'board' ? 100 : pageSize;

  const { rows, totalCount, isLoading, loadError, kpiValues, refetch, patchRow } = useWorkspaceCases({
    caseType: 'CONSULTATION',
    search,
    filters,
    page: listPage,
    pageSize: listPageSize,
    kpiSpecs,
    refreshKey,
  });

  const hasActiveFilters = Boolean(
    search.trim() ||
      consultationType ||
      format ||
      legalDomain ||
      attorneyIds.length ||
      datePreset ||
      followUpFilter ||
      converted
  );
  const filterCount = [
    consultationType,
    format,
    legalDomain,
    attorneyIds.length ? '1' : '',
    datePreset,
    followUpFilter,
    converted,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  useEffect(() => {
    apiGetCases({
      caseType: 'CONSULTATION',
      today: true,
      page: 1,
      page_size: 8,
      ordering: 'consultationDate',
    })
      .then((res) => setTodayRows(res.data?.results ?? []))
      .catch(() => setTodayRows([]));
  }, [refreshKey]);

  const openCreate = useCallback(() => {
    caseModalRef.current?.show(undefined, { createType: 'CONSULTATION' });
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

  const openRow = (c: API.Case, hash?: string) => {
    const path = caseWorkspacePath(c);
    navigate(hash ? `${path}?tab=consultation${hash}` : path);
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

  const patchOutcome = async (c: API.Case, nextOutcome: ConsultationStatusKey, silent = false) => {
    const existing = (c.case_specific_data as Record<string, unknown>) ?? {};
    patchRow(c.id, { case_specific_data: { ...existing, outcome: nextOutcome } });
    try {
      await apiUpdateCase({
        id: c.id,
        case_specific_data: { ...existing, outcome: nextOutcome },
      });
      if (!silent) toast({ title: t.common.success });
      refetch();
    } catch {
      refetch();
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const onStatusDrop = (caseId: number, status: ConsultationStatusKey) => {
    const current = rows.find((c) => c.id === caseId);
    if (!current || consultationStatusOf(current) === status) return;
    void patchOutcome(current, status, true);
  };

  const sendEmail = async (c: API.Case) => {
    try {
      await apiRetryConsultationEmail(c.id);
      toast({ title: t.cases.modal.consultationWorkflow.emailSent });
    } catch {
      toast({ title: t.cases.modal.consultationWorkflow.emailFailed, variant: 'destructive' });
    }
  };

  const handleViewMode = (mode: ConsultationViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const kpis = [
    {
      key: 'today',
      label: copy.kpis.today,
      value: kpiValues.today ?? null,
      hint: copy.kpis.todayHint,
      icon: Calendar,
      accent: KPI_ACCENT.today,
      active: datePreset === 'today',
      onClick: () => patchParams({ date: datePreset === 'today' ? null : 'today' }),
    },
    {
      key: 'upcoming',
      label: copy.kpis.scheduled,
      value: kpiValues.upcoming ?? null,
      hint: copy.kpis.scheduledHint,
      icon: CalendarClock,
      accent: KPI_ACCENT.upcoming,
      active: datePreset === 'upcoming',
      onClick: () => patchParams({ date: datePreset === 'upcoming' ? null : 'upcoming' }),
    },
    {
      key: 'followUp',
      label: copy.kpis.followUp,
      value: kpiValues.followUp ?? null,
      hint: copy.kpis.followUpHint,
      icon: Clock,
      accent: KPI_ACCENT.followUp,
      active: followUpFilter === 'required',
      onClick: () => patchParams({ follow: followUpFilter === 'required' ? null : 'required' }),
    },
    {
      key: 'converted',
      label: copy.kpis.converted,
      value: kpiValues.converted ?? null,
      hint: copy.kpis.convertedHint,
      icon: Briefcase,
      accent: KPI_ACCENT.converted,
      active: converted === '1',
      onClick: () => patchParams({ converted: converted === '1' ? null : '1' }),
    },
    {
      key: 'thisMonth',
      label: copy.kpis.thisMonth,
      value: kpiValues.thisMonth ?? null,
      hint: copy.kpis.thisMonthHint,
      icon: CalendarDays,
      accent: KPI_ACCENT.thisMonth,
      active: datePreset === 'month',
      onClick: () => patchParams({ date: datePreset === 'month' ? null : 'month' }),
    },
  ];

  const filterControls = (
    <>
      <FilterField label={ws.type}>
        <FilterSelect
          value={consultationType}
          onChange={(v) => patchParams({ type: v || null })}
          placeholder={ws.allOption}
          options={CONSULTATION_TYPES.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.format}>
        <FilterSelect
          value={format}
          onChange={(v) => patchParams({ format: v || null })}
          placeholder={ws.allOption}
          options={FORMATS.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={ws.legalDomain}>
        <FilterSelect
          value={legalDomain}
          onChange={(v) => patchParams({ domain: v || null })}
          placeholder={ws.allOption}
          options={LEGAL_DOMAINS.map((s) => ({ value: s, label: enumPretty(s) }))}
        />
      </FilterField>
      <FilterField label={copy.attorneys}>
        <TeamMemberMultiSelect
          value={attorneyIds}
          onChange={(ids) => patchParams({ attorney: ids.length ? ids.join(',') : null })}
          placeholder={ws.lawyer}
        />
      </FilterField>
      <FilterField label={ws.date}>
        <FilterSelect
          value={datePreset}
          onChange={(v) => patchParams({ date: v || null, from: null, to: null })}
          placeholder={ws.allOption}
          options={[
            { value: 'today', label: copy.dateToday },
            { value: 'week', label: copy.dateWeek },
            { value: 'month', label: copy.dateMonth },
            { value: 'upcoming', label: copy.kpis.scheduled },
            { value: 'custom', label: copy.dateCustom },
          ]}
        />
      </FilterField>
      {datePreset === 'custom' ? (
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => patchParams({ date: 'custom', from: e.target.value || null }, true)}
            className="h-9 text-[12px]"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => patchParams({ date: 'custom', to: e.target.value || null }, true)}
            className="h-9 text-[12px]"
          />
        </div>
      ) : null}
      <FilterField label={copy.columns.followUp}>
        <FilterSelect
          value={followUpFilter}
          onChange={(v) => patchParams({ follow: v || null })}
          placeholder={ws.allOption}
          options={[
            { value: 'required', label: copy.followRequired },
            { value: 'has', label: copy.followHas },
            { value: 'none', label: copy.followNone },
          ]}
        />
      </FilterField>
      <FilterField label={copy.conversion}>
        <FilterSelect
          value={converted}
          onChange={(v) => patchParams({ converted: v || null })}
          placeholder={ws.allOption}
          options={[
            { value: '0', label: copy.notConverted },
            { value: '1', label: copy.convertedFilter },
          ]}
        />
      </FilterField>
    </>
  );

  const rowActions = (c: API.Case) => {
    const outcomeVal = String(consultationOutcome(c) || '').toUpperCase();
    const cancelled = outcomeVal === 'CANCELLED';
    const completed = outcomeVal === 'COMPLETED';
    const canFollow = !cancelled;
    const canConvert = canShowConvertToCase(c) && canEdit;
    return (
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
          {canEdit && canFollow ? (
            <DropdownMenuItem onClick={() => caseModalRef.current?.show(undefined, { followUpOf: c })}>
              {copy.actions.addFollowUp}
            </DropdownMenuItem>
          ) : null}
          {canConvert ? (
            <DropdownMenuItem onClick={() => navigate(`${caseWorkspacePath(c)}?convert=1`)}>
              {copy.actions.convert}
            </DropdownMenuItem>
          ) : null}
          {canEdit && !completed && !cancelled ? (
            <DropdownMenuItem onClick={() => void patchOutcome(c, 'COMPLETED')}>
              {copy.actions.markCompleted}
            </DropdownMenuItem>
          ) : null}
          {canEdit && !cancelled && !completed ? (
            <DropdownMenuItem onClick={() => void patchOutcome(c, 'CANCELLED')}>
              {copy.actions.cancel}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => void sendEmail(c)}>{copy.actions.sendEmail}</DropdownMenuItem>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600"
                onClick={() => deleteRef.current?.show(c)}
              >
                {copy.actions.delete}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const sortHeader = (key: string, label: string, className?: string) => {
    const active = sort === key || sort === `-${key}`;
    const dir = sort === `-${key}` ? '-' : sort === key ? '' : '';
    return (
      <th className={cn(thClass(), className)}>
        <button
          type="button"
          className={cn('inline-flex items-center gap-1', active && 'text-slate-800 dark:text-white')}
          onClick={() => patchParams({ sort: dir === '' && active ? `-${key}` : key === 'upcoming' ? 'upcoming' : key })}
        >
          {label}
          {active ? <span className="text-[9px]">{sort.startsWith('-') ? '↓' : '↑'}</span> : null}
        </button>
      </th>
    );
  };

  const tableHead = (
    <>
      {sortHeader('reference', copy.columns.reference)}
      <th className={thClass()}>{copy.columns.consultation}</th>
      {sortHeader('client', copy.columns.client, 'hidden md:table-cell')}
      {sortHeader('consultationDate', copy.columns.date)}
      <th className={cn(thClass(), 'hidden md:table-cell')}>{copy.columns.format}</th>
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.legalDomain}</th>
      {sortHeader('attorney', copy.columns.lawyer, 'hidden lg:table-cell')}
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.followUp}</th>
      <th className={cn(thClass(), 'hidden lg:table-cell')}>{copy.columns.case}</th>
      <th className={cn(thClass(), 'text-end')}>{copy.columns.actions}</th>
    </>
  );

  const showTodayStrip = datePreset !== 'today' && todayRows.length > 0 && viewMode === 'list';

  const datePresetLabel =
    datePreset === 'today'
      ? copy.dateToday
      : datePreset === 'week'
        ? copy.dateWeek
        : datePreset === 'month'
          ? copy.dateMonth
          : datePreset === 'upcoming'
            ? copy.kpis.scheduled
            : datePreset === 'custom'
              ? copy.dateCustom
              : '';

  const followLabel =
    followUpFilter === 'required'
      ? copy.followRequired
      : followUpFilter === 'has'
        ? copy.followHas
        : followUpFilter === 'none'
          ? copy.followNone
          : '';

  const filterChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (consultationType) {
    filterChips.push({
      key: 'type',
      label: enumPretty(consultationType),
      onClear: () => patchParams({ type: null }),
    });
  }
  if (format) {
    filterChips.push({
      key: 'format',
      label: enumPretty(format),
      onClear: () => patchParams({ format: null }),
    });
  }
  if (legalDomain) {
    filterChips.push({
      key: 'domain',
      label: enumPretty(legalDomain),
      onClear: () => patchParams({ domain: null }),
    });
  }
  if (attorneyIds.length) {
    filterChips.push({
      key: 'attorney',
      label: `${copy.attorneys} (${attorneyIds.length})`,
      onClear: () => patchParams({ attorney: null }),
    });
  }
  if (datePreset && datePresetLabel) {
    filterChips.push({
      key: 'date',
      label: datePresetLabel,
      onClear: () => patchParams({ date: null, from: null, to: null }),
    });
  }
  if (followUpFilter && followLabel) {
    filterChips.push({
      key: 'follow',
      label: followLabel,
      onClear: () => patchParams({ follow: null }),
    });
  }
  if (converted === '1') {
    filterChips.push({
      key: 'converted',
      label: copy.convertedFilter,
      onClear: () => patchParams({ converted: null }),
    });
  } else if (converted === '0') {
    filterChips.push({
      key: 'converted',
      label: copy.notConverted,
      onClear: () => patchParams({ converted: null }),
    });
  }

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
          <Button
            size="sm"
            className="h-8 text-[12px] text-white hover:opacity-90"
            style={{ backgroundColor: JURE_PURPLE }}
            onClick={openCreate}
          >
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
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader
            title={copy.title}
            subtitle={copy.subtitle}
            actions={
              canCreate ? (
                <Button
                  size="sm"
                  className="hidden h-9 shrink-0 px-3 text-[13px] font-semibold text-white hover:opacity-90 md:inline-flex"
                  style={{ backgroundColor: JURE_PURPLE }}
                  onClick={openCreate}
                >
                  <Plus className="me-1.5 h-4 w-4" strokeWidth={2.5} />
                  {copy.newCta}
                </Button>
              ) : undefined
            }
          />
          <WorkspaceKpiStrip items={kpis} loading={isLoading && kpiValues.today == null} ariaLabel={copy.title} />
          <div className="sticky top-0 z-30 mt-5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
              {filterChips.length > 0 ? (
                <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {ws.filters}
                  </span>
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onClear}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F1ECFF] px-2 py-0.5 text-[12px] font-medium text-[#64499D] hover:bg-[#E6DDF8]"
                    >
                      {chip.label}
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="text-[12px] font-medium text-slate-500 hover:text-slate-800"
                    onClick={resetFilters}
                  >
                    {t.cases.reset}
                  </button>
                </div>
              ) : null}
          </div>

          {showTodayStrip ? (
            <div className="mt-4 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                {copy.todayStrip}
              </p>
              <ul className="space-y-1.5">
                {todayRows.map((c) => {
                  const dt = getCaseData(c, 'consultation_date') as string | undefined;
                  const fmt = getCaseData(c, 'format') as string | undefined;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                      <span className="w-12 shrink-0 tabular-nums font-medium text-slate-800 dark:text-zinc-100">
                        {dt ? formatTime(dt, lang, { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{c.reference}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-zinc-100">
                        {c.title}
                        {c.client ? ` — ${clientDisplayName(c.client)}` : ''}
                      </span>
                      <span className="hidden text-slate-500 sm:inline">{fmt ? enumPretty(fmt) : ''}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => openRow(c)}>
                        {copy.see}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 pb-3">
            {viewMode === 'board' ? (
              loadError ? (
                errorState
              ) : (
                <div className="min-h-[420px]">
                  <ConsultationBoard
                    rows={rows}
                    loading={isLoading}
                    canEdit={canEdit}
                    onOpen={(c) => openRow(c)}
                    onStatusDrop={onStatusDrop}
                    sectionTitle={(_key, status) => enumPretty(status) || status}
                  />
                </div>
              )
            ) : (
              <ConsultationList
                rows={rows}
                loading={isLoading}
                empty={emptyState}
                error={loadError ? errorState : null}
                tableHead={tableHead}
                colSpan={10}
                renderRow={(c, rowIdx) => (
                  <ConsultationRow
                    key={c.id}
                    c={c}
                    zebra={rowIdx % 2 === 0}
                    copy={copy}
                    enumPretty={enumPretty}
                    lang={lang}
                    tf={tf}
                    onOpen={() => openRow(c)}
                    onFollow={() => openRow(c, '#follow-ups')}
                    onClient={(e) => void openClient(e, c)}
                    onOpenCase={(id) => void navigateToCaseById(navigate, id)}
                    actions={rowActions(c)}
                  />
                )}
                renderMobile={(c) => (
                  <ConsultationMobileCard
                    key={c.id}
                    c={c}
                    copy={copy}
                    enumPretty={enumPretty}
                    lang={lang}
                    tf={tf}
                    onOpen={() => openRow(c)}
                    actions={rowActions(c)}
                  />
                )}
                sectionTitle={(_key, status) => enumPretty(status) || status}
              />
            )}
          </div>
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

        {canCreate ? (
          <Button
            type="button"
            size="icon"
            className="fixed z-40 h-12 w-12 rounded-full text-white shadow-lg md:hidden bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4"
            style={{ backgroundColor: JURE_PURPLE }}
            onClick={openCreate}
            aria-label={copy.newCta}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        ) : null}
      </div>

      <CaseModal
        ref={caseModalRef}
        onSuccess={(updated) => {
          if (updated.parentConsultation?.id) {
            void navigateToCaseById(navigate, updated.parentConsultation.id);
            refetch();
            return;
          }
          refetch();
        }}
      />
      <CaseDeleteModal ref={deleteRef} onSuccess={refetch} />
      <ClientProfilePreview ref={clientPreviewRef} />
    </TooltipProvider>
  );
}
