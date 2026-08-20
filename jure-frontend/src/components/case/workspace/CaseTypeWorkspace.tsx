'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import ServerSelect from '@/components/common/ServerSelect';
import { useNavigate } from 'react-router';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import ScheduleAppointmentDialog, {
  ScheduleAppointmentDialogRef,
} from '@/components/ScheduleAppointmentDialog';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import ConsultationCard from '@/components/case/cards/ConsultationCard';
import LitigationCard from '@/components/case/cards/LitigationCard';
import AdministrativeDutyCard from '@/components/case/cards/AdministrativeDutyCard';
import { usePermission } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { apiUpdateCase } from '@/services/case/api';
import {
  assignedDisplayName,
  clientDisplayName,
  consultationOutcome,
  courtDisplay,
  formatDuration,
  formatShortDate,
  nextLitigationDeadline,
  prettyEnum,
} from '@/services/case/caseType';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import {
  getConsultationWorkflowStatus,
  getConvertedToCase,
} from '@/components/case/conversion/ConvertedCaseLink';
import CaseWorkspaceChrome from './CaseWorkspaceChrome';
import { useWorkspaceCases, type WorkspaceCaseType } from '@/hooks/useWorkspaceCases';
import { caseWorkspacePath, navigateToCase } from '@/lib/caseRoutes';
import { CaseStatus } from '@/utils/constants';

const KPI_ACCENT: Record<string, string> = {
  total: 'border-l-slate-400',
  scheduled: 'border-l-blue-500',
  today: 'border-l-indigo-500',
  followUp: 'border-l-amber-500',
  completed: 'border-l-emerald-500',
  active: 'border-l-emerald-500',
  hearings: 'border-l-rose-500',
  due: 'border-l-indigo-500',
  overdue: 'border-l-red-500',
  high: 'border-l-amber-500',
};

const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'CANCELLED', 'ARCHIVED'] as const;
const OUTCOMES = ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'] as const;
const CONSULTATION_TYPES = ['INITIAL', 'FOLLOW_UP', 'URGENT'] as const;
const FORMATS = ['IN_PERSON', 'PHONE', 'VIDEO'] as const;
const LEGAL_DOMAINS = ['FAMILY', 'CRIMINAL', 'CORPORATE', 'LABOR', 'REAL_ESTATE', 'OTHER'] as const;
const CLIENT_ROLES = ['PLAINTIFF', 'DEFENDANT'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const DUTY_TYPES = [
  'CORPORATE_FILING',
  'PROPERTY_REGISTRATION',
  'NOTARIAL_ACT',
  'PERMIT',
  'COMPLIANCE',
  'INHERITANCE',
  'OTHER',
] as const;
const LITIGATION_TYPES = ['CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'] as const;
const CATEGORIES = ['CRIMINAL', 'CIVIL', 'ECONOMIC', 'ENVIRONMENTAL', 'SOCIAL', 'OTHER'] as const;

function thClass() {
  return 'text-start py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal';
}
function tdClass() {
  return 'px-3 py-2 align-middle text-[12px] text-slate-700 dark:text-slate-300 text-start';
}

function EnumPill({ value }: { value: string }) {
  const { enumPretty } = useAppTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
        getStatusColor(value)
      )}
    >
      {enumPretty(value)}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value || 'ALL'} onValueChange={(v) => onChange(v === 'ALL' ? '' : v)}>
      <SelectTrigger
        className={cn(
          'h-9 w-[140px] text-[12px] rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950',
          value && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]',
          className
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

function displayOrMissing(
  value: unknown,
  missingLabel: string,
  pretty: (s: string) => string = prettyEnum,
): string {
  if (value == null || value === '' || value === 'N/A') return missingLabel;
  const formatted = pretty(String(value));
  return formatted === 'Not provided' ? missingLabel : formatted;
}

interface CaseTypeWorkspaceProps {
  kind: WorkspaceCaseType;
}

export default function CaseTypeWorkspace({ kind }: CaseTypeWorkspaceProps) {
  const { t, enumPretty } = useAppTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const ws = t.cases.workspaces;
  const copy =
    kind === 'CONSULTATION' ? ws.consultation : kind === 'LITIGATION' ? ws.litigation : ws.administrative;
  const canCreate = usePermission('cases.create');
  const canEdit = usePermission('cases.edit');

  const [holderEl, setHolderEl] = useState<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState<number | undefined>();
  const [outcome, setOutcome] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [format, setFormat] = useState('');
  const [legalDomain, setLegalDomain] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientRole, setClientRole] = useState('');
  const [priority, setPriority] = useState('');
  const [dutyType, setDutyType] = useState('');
  const [institution, setInstitution] = useState('');
  const [courtName, setCourtName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [category, setCategory] = useState('');
  const [litigationType, setLitigationType] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const caseModalRef = useRef<CaseModalRef>(null);
  const deleteRef = useRef<CaseDeleteModalRef>(null);
  const appointmentRef = useRef<ScheduleAppointmentDialogRef>(null);
  const taskRef = useRef<TaskCreateModalRef>(null);

  const dateField =
    kind === 'CONSULTATION' ? 'consultationDate' : kind === 'ADMINISTRATIVE' ? 'dueDate' : 'nextHearingDate';

  const filters = useMemo(() => {
    return {
      status: status || undefined,
      assignedTo,
      outcome: kind === 'CONSULTATION' && outcome ? outcome : undefined,
      consultationType: kind === 'CONSULTATION' && consultationType ? consultationType : undefined,
      format: kind === 'CONSULTATION' && format ? format : undefined,
      legalDomain: kind === 'CONSULTATION' && legalDomain ? legalDomain : undefined,
      followUpRequired:
        kind === 'CONSULTATION' && followUpRequired ? followUpRequired : undefined,
      clientRole: kind === 'LITIGATION' && clientRole ? clientRole : undefined,
      priority:
        (kind === 'LITIGATION' || kind === 'ADMINISTRATIVE') && priority ? priority : undefined,
      dutyType: kind === 'ADMINISTRATIVE' && dutyType ? dutyType : undefined,
      institution: kind === 'ADMINISTRATIVE' && institution ? institution : undefined,
      courtName: kind === 'LITIGATION' && courtName ? courtName : undefined,
      jurisdiction: kind === 'LITIGATION' && jurisdiction ? jurisdiction : undefined,
      category: kind === 'LITIGATION' && category ? category : undefined,
      litigationType: kind === 'LITIGATION' && litigationType ? litigationType : undefined,
      overdue: kind === 'ADMINISTRATIVE' && overdue ? true : undefined,
      dateField: dateFrom || dateTo ? dateField : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
  }, [
    status,
    assignedTo,
    outcome,
    consultationType,
    format,
    legalDomain,
    followUpRequired,
    clientRole,
    priority,
    dutyType,
    institution,
    courtName,
    jurisdiction,
    category,
    litigationType,
    overdue,
    dateFrom,
    dateTo,
    dateField,
    kind,
  ]);

  const kpiSpecs = useMemo(() => {
    if (kind === 'CONSULTATION') {
      return [
        { key: 'total' },
        { key: 'scheduled', params: { outcome: 'SCHEDULED' } },
        { key: 'today', params: { today: true } },
        { key: 'followUp', params: { followUpRequired: true } },
        { key: 'completed', params: { outcome: 'COMPLETED' } },
      ];
    }
    if (kind === 'LITIGATION') {
      return [
        { key: 'active', params: { status: 'OPEN,IN_PROGRESS' } },
        { key: 'hearings', params: { upcomingHearing: true } },
        { key: 'overdue', params: { overdue: true } },
        { key: 'high', params: { priorityIn: 'HIGH,URGENT' } },
      ];
    }
    return [
      { key: 'active', params: { status: 'OPEN,IN_PROGRESS,PENDING' } },
      { key: 'due', params: { dueThisWeek: true } },
      { key: 'overdue', params: { overdue: true } },
      { key: 'high', params: { priorityIn: 'HIGH,URGENT' } },
      { key: 'completed', params: { status: 'CLOSED' } },
    ];
  }, [kind]);

  const { rows, totalCount, isLoading, loadError, kpiValues, refetch, patchRow } = useWorkspaceCases({
    caseType: kind,
    search,
    filters,
    page,
    pageSize,
    kpiSpecs,
    refreshKey,
  });

  const hasActiveFilters = Boolean(
    search.trim() ||
      status ||
      assignedTo ||
      outcome ||
      consultationType ||
      format ||
      legalDomain ||
      followUpRequired ||
      clientRole ||
      priority ||
      dutyType ||
      institution ||
      courtName ||
      jurisdiction ||
      category ||
      litigationType ||
      overdue ||
      dateFrom ||
      dateTo
  );

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setAssignedTo(undefined);
    setOutcome('');
    setConsultationType('');
    setFormat('');
    setLegalDomain('');
    setFollowUpRequired('');
    setClientRole('');
    setPriority('');
    setDutyType('');
    setInstitution('');
    setCourtName('');
    setJurisdiction('');
    setCategory('');
    setLitigationType('');
    setOverdue(false);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const openCreate = useCallback(() => {
    caseModalRef.current?.show(undefined, { createType: kind });
  }, [kind]);

  const titleOf = (c: API.Case) => c.title || c.reference || t.cases.untitledCase;

  const markCompleted = async (c: API.Case) => {
    const existing = (c.case_specific_data as Record<string, unknown>) ?? {};
    const payload: Record<string, unknown> & { id: number } = {
      id: c.id,
      status: CaseStatus.CLOSED,
      case_specific_data:
        kind === 'CONSULTATION'
          ? { ...existing, outcome: 'COMPLETED' }
          : { ...existing, completionDate: new Date().toISOString().slice(0, 10) },
    };
    try {
      await apiUpdateCase(payload);
      toast({ title: copy.actions.markCompleted });
      refetch();
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const kpis = useMemo(() => {
    if (kind === 'CONSULTATION') {
      const k = ws.consultation.kpis;
      return [
        { key: 'total', label: k.total, value: kpiValues.total ?? 0, accent: KPI_ACCENT.total },
        { key: 'scheduled', label: k.scheduled, value: kpiValues.scheduled ?? 0, accent: KPI_ACCENT.scheduled },
        { key: 'today', label: k.today, value: kpiValues.today ?? 0, accent: KPI_ACCENT.today },
        { key: 'followUp', label: k.followUp, value: kpiValues.followUp ?? 0, accent: KPI_ACCENT.followUp },
        { key: 'completed', label: k.completed, value: kpiValues.completed ?? 0, accent: KPI_ACCENT.completed },
      ];
    }
    if (kind === 'LITIGATION') {
      const k = ws.litigation.kpis;
      return [
        { key: 'active', label: k.active, value: kpiValues.active ?? 0, accent: KPI_ACCENT.active },
        {
          key: 'hearings',
          label: k.upcomingHearings,
          value: kpiValues.hearings ?? 0,
          accent: KPI_ACCENT.hearings,
        },
        { key: 'overdue', label: k.criticalDeadlines, value: kpiValues.overdue ?? 0, accent: KPI_ACCENT.overdue },
        { key: 'high', label: k.highPriority, value: kpiValues.high ?? 0, accent: KPI_ACCENT.high },
      ];
    }
    const k = ws.administrative.kpis;
    return [
      { key: 'active', label: k.active, value: kpiValues.active ?? 0, accent: KPI_ACCENT.active },
      { key: 'due', label: k.dueThisWeek, value: kpiValues.due ?? 0, accent: KPI_ACCENT.due },
      { key: 'overdue', label: k.overdue, value: kpiValues.overdue ?? 0, accent: KPI_ACCENT.overdue },
      { key: 'high', label: k.highPriority, value: kpiValues.high ?? 0, accent: KPI_ACCENT.high },
      { key: 'completed', label: k.completed, value: kpiValues.completed ?? 0, accent: KPI_ACCENT.completed },
    ];
  }, [kind, kpiValues, ws]);

  const memberSelect = (
    <div className="w-[160px]">
      <ServerSelect
        link="/cabinets/members/select_list"
        value={assignedTo}
        onChange={(v) => {
          setAssignedTo(v != null ? Number(v) : undefined);
          setPage(1);
        }}
        placeholder={ws.lawyer}
        searchPlaceholder={ws.lawyer}
        labelKey={(u: { first_name?: string; last_name?: string; email?: string }) =>
          `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || ws.notProvided
        }
        valueKey="id"
        cleanable
        className={cn(
          'h-9 text-[12px] rounded-md border-slate-200 dark:border-slate-700',
          assignedTo != null && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]'
        )}
      />
    </div>
  );

  const dateInputs = (
    <div className="flex items-center gap-1">
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => {
          setDateFrom(e.target.value);
          setPage(1);
        }}
        className="h-9 w-[132px] text-[12px]"
        aria-label={ws.date}
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => {
          setDateTo(e.target.value);
          setPage(1);
        }}
        className="h-9 w-[132px] text-[12px]"
        aria-label={ws.date}
      />
    </div>
  );

  const filterControls = (
    <>
      <FilterSelect
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        placeholder={ws.status}
        options={CASE_STATUSES.map((s) => ({ value: s, label: enumPretty(s) }))}
      />
      {memberSelect}
      {kind === 'CONSULTATION' && (
        <>
          <FilterSelect
            value={consultationType}
            onChange={(v) => {
              setConsultationType(v);
              setPage(1);
            }}
            placeholder={ws.type}
            options={CONSULTATION_TYPES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={legalDomain}
            onChange={(v) => {
              setLegalDomain(v);
              setPage(1);
            }}
            placeholder={ws.legalDomain}
            options={LEGAL_DOMAINS.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={format}
            onChange={(v) => {
              setFormat(v);
              setPage(1);
            }}
            placeholder={ws.format}
            options={FORMATS.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={outcome}
            onChange={(v) => {
              setOutcome(v);
              setPage(1);
            }}
            placeholder={ws.outcome}
            options={OUTCOMES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={followUpRequired}
            onChange={(v) => {
              setFollowUpRequired(v);
              setPage(1);
            }}
            placeholder={ws.followUp}
            options={[
              { value: 'true', label: ws.yes },
              { value: 'false', label: ws.no },
            ]}
          />
        </>
      )}
      {kind === 'LITIGATION' && (
        <>
          <FilterSelect
            value={category}
            onChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            placeholder={t.cases.filters.matterType}
            options={CATEGORIES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={litigationType}
            onChange={(v) => {
              setLitigationType(v);
              setPage(1);
            }}
            placeholder={ws.type}
            options={LITIGATION_TYPES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <FilterSelect
            value={clientRole}
            onChange={(v) => {
              setClientRole(v);
              setPage(1);
            }}
            placeholder={ws.clientRole}
            options={CLIENT_ROLES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <Input
            value={courtName}
            onChange={(e) => {
              setCourtName(e.target.value);
              setPage(1);
            }}
            placeholder={ws.court}
            className="h-9 w-[140px] text-[12px]"
          />
          <Input
            value={jurisdiction}
            onChange={(e) => {
              setJurisdiction(e.target.value);
              setPage(1);
            }}
            placeholder={ws.jurisdiction}
            className="h-9 w-[140px] text-[12px]"
          />
          <FilterSelect
            value={priority}
            onChange={(v) => {
              setPriority(v);
              setPage(1);
            }}
            placeholder={ws.priority}
            options={PRIORITIES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
        </>
      )}
      {kind === 'ADMINISTRATIVE' && (
        <>
          <FilterSelect
            value={dutyType}
            onChange={(v) => {
              setDutyType(v);
              setPage(1);
            }}
            placeholder={ws.dutyType}
            options={DUTY_TYPES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <Input
            value={institution}
            onChange={(e) => {
              setInstitution(e.target.value);
              setPage(1);
            }}
            placeholder={ws.institution}
            className="h-9 w-[150px] text-[12px]"
          />
          <FilterSelect
            value={priority}
            onChange={(v) => {
              setPriority(v);
              setPage(1);
            }}
            placeholder={ws.priority}
            options={PRIORITIES.map((s) => ({ value: s, label: enumPretty(s) }))}
          />
          <Button
            type="button"
            variant={overdue ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-[12px]"
            onClick={() => {
              setOverdue((v) => !v);
              setPage(1);
            }}
          >
            {ws.overdueOnly}
          </Button>
        </>
      )}
      {dateInputs}
    </>
  );

  const rowActions = (c: API.Case) => {
    const canConvert =
      kind === 'CONSULTATION' &&
      getConsultationWorkflowStatus(c) === 'CONVERTED_TO_CASE' &&
      !getConvertedToCase(c);
    const completed =
      c.status === 'CLOSED' || String(consultationOutcome(c) || '').toUpperCase() === 'COMPLETED';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
            aria-label={
              kind === 'CONSULTATION'
                ? ws.consultation.columns.actions
                : kind === 'LITIGATION'
                  ? ws.litigation.columns.actions
                  : ws.administrative.columns.actions
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => void navigateToCase(navigate, c)}>
            {copy.actions.open}
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={() => caseModalRef.current?.show(c)}>
              {copy.actions.edit}
            </DropdownMenuItem>
          )}
          {kind === 'CONSULTATION' && (
            <DropdownMenuItem
              onClick={() =>
                appointmentRef.current?.show({
                  relatedCaseId: c.id,
                  relatedCaseLabel: titleOf(c),
                })
              }
            >
              {ws.consultation.actions.schedule}
            </DropdownMenuItem>
          )}
          {kind === 'CONSULTATION' && canEdit && !completed && (
            <DropdownMenuItem onClick={() => markCompleted(c)}>
              {ws.consultation.actions.markCompleted}
            </DropdownMenuItem>
          )}
          {canConvert && (
            <DropdownMenuItem onClick={() => navigate(`${caseWorkspacePath(c)}?convert=1`)}>
              {ws.consultation.actions.convert}
            </DropdownMenuItem>
          )}
          {kind === 'LITIGATION' && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  appointmentRef.current?.show({
                    relatedCaseId: c.id,
                    relatedCaseLabel: titleOf(c),
                  })
                }
              >
                {ws.litigation.actions.addHearing}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  taskRef.current?.show({ relatedCaseId: c.id, relatedCaseLabel: titleOf(c) })
                }
              >
                {ws.litigation.actions.addTask}
              </DropdownMenuItem>
            </>
          )}
          {kind === 'ADMINISTRATIVE' && canEdit && !completed && (
            <DropdownMenuItem onClick={() => markCompleted(c)}>
              {ws.administrative.actions.markCompleted}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const skeletonCols =
    kind === 'CONSULTATION' ? 13 : kind === 'LITIGATION' ? 13 : 11;

  const tableHeader =
    kind === 'CONSULTATION' ? (
      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
        {Object.values(ws.consultation.columns).map((label) => (
          <th key={label} className={thClass()}>
            {label}
          </th>
        ))}
      </tr>
    ) : kind === 'LITIGATION' ? (
      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
        {Object.values(ws.litigation.columns).map((label) => (
          <th key={label} className={thClass()}>
            {label}
          </th>
        ))}
      </tr>
    ) : (
      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
        {Object.values(ws.administrative.columns).map((label) => (
          <th key={label} className={thClass()}>
            {label}
          </th>
        ))}
      </tr>
    );

  const tableRows = rows.map((c, rowIdx) => {
    const miss = ws.notProvided;
    const follow = getCaseData(c, 'follow_up_required') as boolean | undefined;
    const due = getCaseData(c, 'due_date') as string | undefined;
    const overdueDue = due ? new Date(due).getTime() < Date.now() && c.status !== 'CLOSED' : false;

    return (
      <tr
        key={c.id}
        className={cn(
          'group border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-[background-color,box-shadow] duration-200',
          rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
          'hover:bg-[#F7F4FF] hover:shadow-[inset_3px_0_0_0_#64499D] rtl:hover:shadow-[inset_-3px_0_0_0_#64499D] dark:hover:bg-[#24183F]/50'
        )}
        onClick={() => void navigateToCase(navigate, c)}
      >
        {kind === 'CONSULTATION' && (
          <>
            <td className={cn(tdClass(), 'font-mono text-[11px]')}>{c.reference || miss}</td>
            <td className={tdClass()}>{clientDisplayName(c.client) || miss}</td>
            <td className={cn(tdClass(), 'font-semibold text-slate-900 dark:text-white')}>{titleOf(c)}</td>
            <td className={tdClass()}>
              {displayOrMissing(getCaseData(c, 'consultation_type'), miss, enumPretty)}
            </td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'legal_domain'), miss, enumPretty)}</td>
            <td className={tdClass()}>
              {formatShortDate(getCaseData(c, 'consultation_date') as string | undefined) || miss}
            </td>
            <td className={tdClass()}>{formatDuration(getCaseData(c, 'duration')) || miss}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'format'), miss, enumPretty)}</td>
            <td className={tdClass()}>{assignedDisplayName(c) || miss}</td>
            <td className={tdClass()}>
              <EnumPill value={consultationOutcome(c) || c.status} />
            </td>
            <td className={tdClass()}>{follow ? ws.yes : follow === false ? ws.no : miss}</td>
            <td className={tdClass()}>
              <EnumPill value={c.status} />
            </td>
            <td className={cn(tdClass(), 'text-end')} onClick={(e) => e.stopPropagation()}>
              {rowActions(c)}
            </td>
          </>
        )}
        {kind === 'LITIGATION' && (
          <>
            <td className={cn(tdClass(), 'font-mono text-[11px]')}>{c.reference || miss}</td>
            <td className={cn(tdClass(), 'font-semibold text-slate-900 dark:text-white')}>{titleOf(c)}</td>
            <td className={tdClass()}>{clientDisplayName(c.client) || miss}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'client_role'), miss, enumPretty)}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'opposing_party'), miss)}</td>
            <td className={tdClass()}>{courtDisplay(c) || miss}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'jurisdiction'), miss)}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'court_case_number'), miss)}</td>
            <td className={tdClass()}>{assignedDisplayName(c) || miss}</td>
            <td className={tdClass()}>
              {getCaseData(c, 'priority') ? (
                <EnumPill value={String(getCaseData(c, 'priority'))} />
              ) : (
                miss
              )}
            </td>
            <td className={tdClass()}>{formatShortDate(nextLitigationDeadline(c)) || miss}</td>
            <td className={tdClass()}>
              <EnumPill value={c.status} />
            </td>
            <td className={cn(tdClass(), 'text-end')} onClick={(e) => e.stopPropagation()}>
              {rowActions(c)}
            </td>
          </>
        )}
        {kind === 'ADMINISTRATIVE' && (
          <>
            <td className={cn(tdClass(), 'font-mono text-[11px]')}>{c.reference || miss}</td>
            <td className={cn(tdClass(), 'font-semibold text-slate-900 dark:text-white')}>{titleOf(c)}</td>
            <td className={tdClass()}>{clientDisplayName(c.client) || miss}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'duty_type'), miss, enumPretty)}</td>
            <td className={tdClass()}>{displayOrMissing(getCaseData(c, 'institution'), miss)}</td>
            <td className={tdClass()}>{assignedDisplayName(c) || miss}</td>
            <td className={tdClass()}>
              {formatShortDate(getCaseData(c, 'start_date') as string | undefined) || miss}
            </td>
            <td className={cn(tdClass(), overdueDue && 'font-semibold text-red-700 dark:text-red-400')}>
              {formatShortDate(due) || miss}
            </td>
            <td className={tdClass()}>
              {getCaseData(c, 'priority') ? (
                <EnumPill value={String(getCaseData(c, 'priority'))} />
              ) : (
                miss
              )}
            </td>
            <td className={tdClass()}>
              <EnumPill value={c.status} />
            </td>
            <td className={cn(tdClass(), 'text-end')} onClick={(e) => e.stopPropagation()}>
              {rowActions(c)}
            </td>
          </>
        )}
      </tr>
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const desktopTable = (
    <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]" role="grid">
          <thead className="sticky top-0 z-[1]">{tableHeader}</thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 animate-pulse">
                    {Array.from({ length: skeletonCols }).map((__, j) => (
                      <td key={j} className="h-10 px-3">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              : tableRows}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileList = (
    <div className="flex flex-col gap-2 pb-16 md:pb-0">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[108px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-pulse"
            />
          ))
        : rows.map((c) =>
            kind === 'CONSULTATION' ? (
              <ConsultationCard key={c.id} caseItem={c} onClick={() => void navigateToCase(navigate, c)} />
            ) : kind === 'LITIGATION' ? (
              <LitigationCard key={c.id} caseItem={c} onClick={() => void navigateToCase(navigate, c)} />
            ) : (
              <AdministrativeDutyCard key={c.id} caseItem={c} onClick={() => void navigateToCase(navigate, c)} />
            )
          )}
    </div>
  );

  return (
    <>
      <CaseWorkspaceChrome
        title={copy.title}
        subtitle={copy.subtitle}
        ctaLabel={copy.newCta}
        onCreate={openCreate}
        canCreate={canCreate}
        kpis={kpis}
        searchPlaceholder={copy.searchPlaceholder}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        renderFilters={() => filterControls}
        isLoading={isLoading}
        loadError={loadError}
        onRetry={() => setRefreshKey((n) => n + 1)}
        emptyTitle={copy.emptyTitle}
        emptyHint={copy.emptyHint}
        emptyFiltered={hasActiveFilters}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
        holderRef={setHolderEl}
        mobileList={mobileList}
      >
        {desktopTable}
      </CaseWorkspaceChrome>

      <CaseModal
        ref={caseModalRef}
        onSuccess={() => {
          refetch();
        }}
      />
      <CaseDeleteModal ref={deleteRef} onSuccess={refetch} />
      <ScheduleAppointmentDialog ref={appointmentRef} onSuccess={refetch} />
      <TaskCreateModal ref={taskRef} onSuccess={() => refetch()} />
    </>
  );
}
