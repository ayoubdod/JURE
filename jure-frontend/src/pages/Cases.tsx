import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useDebounce } from '@/hooks/use-debounce';
import './Cases.css';
import {
  Plus,
  Search,
  List,
  Grid3x3,
  LayoutGrid,
  Activity,
  Flame,
  Archive,
  Scale,
  ChevronRight,
  Calendar,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useUserStore from '@/stores/userStore';
import { apiGetCases, GetCasesParams } from '@/services/case/api';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import CaseViewModal, { CaseViewModalRef } from '@/components/case/CaseViewModal';
import CaseDetailDrawer, { CaseDetailDrawerRef } from '@/components/case/CaseDetailDrawer';
import CaseCard from '@/components/case/CaseCard';
import { Input } from '@/components/ui/input';
import PaginationComponent from '@/components/common/Pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  getCaseData,
  getCaseDateForFilter,
  formatDate,
  getCountdownDays,
  getCountdownStyle,
} from '@/utils/caseCardHelpers';
import ServerSelect from '@/components/common/ServerSelect';

/* =========================
   Helpers & Mini Components
   ========================= */
const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

const getCaseTitle = (caseItem: API.Case) =>
  (caseItem as any).title ||
  caseItem.reference ||
  CaseCategory.getLabel(caseItem.category) ||
  'Untitled case';

const getCaseTypeKey = (c: API.Case): string => {
  const t = c.caseType ?? c.case_type;
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return 'ADMINISTRATIVE';
  return t ?? 'UNKNOWN';
};

const typeBadgeStyles: Record<string, string> = {
  CONSULTATION: 'bg-blue-500/12 text-blue-800 dark:text-blue-400 ring-blue-500/25',
  LITIGATION: 'bg-rose-500/12 text-rose-800 dark:text-rose-400 ring-rose-500/25',
  ADMINISTRATIVE: 'bg-amber-500/12 text-amber-900 dark:text-amber-400 ring-amber-500/25',
  UNKNOWN: 'bg-slate-500/12 text-slate-700 dark:text-slate-400 ring-slate-500/25',
};

const TypeBadge: React.FC<{ caseItem: API.Case }> = ({ caseItem }) => {
  const k = getCaseTypeKey(caseItem);
  const label = k === 'ADMINISTRATIVE' ? 'ADMIN' : k === 'UNKNOWN' ? '—' : k;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset min-w-[4.5rem]',
        typeBadgeStyles[k] ?? typeBadgeStyles.UNKNOWN
      )}
    >
      {label}
    </span>
  );
};

const getAssignedName = (c: API.Case): string => {
  const u = c.assigned_to as API.User | undefined;
  if (u?.first_name || u?.last_name) {
    return `${u.first_name || ''} ${u.last_name || ''}`.trim();
  }
  return '—';
};

const ListDeadlineCell: React.FC<{ caseItem: API.Case }> = ({ caseItem }) => {
  const dateStr = getCaseDateForFilter(caseItem);
  if (!dateStr) {
    return <span className="text-[13px] text-slate-500 dark:text-slate-400">—</span>;
  }
  const days = getCountdownDays(dateStr);
  if (days === null) {
    return <span className="text-[13px] text-slate-500 dark:text-slate-400">—</span>;
  }
  const style = days < 0 ? 'critical' : getCountdownStyle(days);
  const label = formatDate(dateStr);
  const sub = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`;
  return (
    <div
      className={cn(
        'flex items-start gap-2 min-w-[130px]',
        style === 'normal' && 'text-slate-600 dark:text-slate-400',
        style === 'warning' && 'text-amber-700 dark:text-amber-400',
        style === 'critical' && 'text-red-700 dark:text-red-400 font-semibold'
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        {style === 'normal' && <Calendar className="w-3.5 h-3.5 text-slate-400" />}
        {style === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
        {style === 'critical' && (
          <span className="cases-critical-dot inline-block w-2 h-2 rounded-full bg-red-600 dark:bg-red-500" />
        )}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[13px]">{label}</span>
        <span className={cn('text-[11px]', style === 'critical' && 'font-semibold')}>{sub}</span>
      </span>
    </div>
  );
};

// Status pill for table/cards
const statusPillStyles: Record<string, string> = {
  [CaseStatus.OPEN]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
  [CaseStatus.IN_PROGRESS]: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30',
  [CaseStatus.CLOSED]: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30',
  [CaseStatus.CANCELLED]: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30',
  [CaseStatus.PENDING]: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30',
  [CaseStatus.ARCHIVED]: 'bg-slate-500/15 text-slate-500 dark:text-slate-500 ring-slate-500/30',
  [CaseStatus.CONVERTED_TO_CASE]:
    'bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30',
};

const StatusPill: React.FC<{ status: API.CaseStatus }> = ({ status }) => (
  <span
    className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ring-1 ring-inset',
      statusPillStyles[status] ?? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
    )}
  >
    {status.replace('_', ' ')}
  </span>
);

/** Check if case is assigned to user: assigned_to OR lead_attorney (LITIGATION) */
const isCaseAssignedToUser = (c: API.Case, userId: number): boolean => {
  const assignedToId = (c.assigned_to as API.User | null)?.id ?? (c.assigned_to as { id?: number } | null)?.id;
  if (assignedToId === userId) return true;
  const caseType = c.caseType ?? c.case_type;
  if (caseType === 'LITIGATION' || caseType === 'ADMINISTRATIVE_DUTY') {
    const leadAttorney = getCaseData(c, 'lead_attorney') as number | null | undefined;
    if (leadAttorney === userId) return true;
  }
  return false;
};

/** Status options for filter: General + Consultation-specific + Litigation/Admin-specific */
const GENERAL_STATUSES = ['OPEN', 'CLOSED', 'IN_PROGRESS', 'CANCELLED', 'PENDING', 'ARCHIVED'] as const;
const CONSULTATION_STATUSES = ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'] as const;
const LITIGATION_ADMIN_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'URGENT'] as const;
const ALL_STATUS_OPTIONS = [...GENERAL_STATUSES, ...CONSULTATION_STATUSES, ...LITIGATION_ADMIN_STATUSES];

const getStatusLabel = (s: string) => s.replace(/_/g, ' ');

/* ==============
   Main Component
   ============== */
type CaseTypeFilter = 'ALL' | 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';

type CasesTab = 'my' | 'all';

/** URL query param names for filters */
const Q = { type: 'type', status: 'status', clientId: 'clientId', search: 'search', tab: 'tab' } as const;

const Cases = () => {
  const [casesHolderEl, setCasesHolderEl] = useState<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useUserStore();
  const { toast } = useToast();

  /* Parse filters from URL */
  const activeTab: CasesTab = (searchParams.get(Q.tab) === 'my' || searchParams.get(Q.tab) === 'all') ? (searchParams.get(Q.tab) as CasesTab) : 'my';
  const caseType = (searchParams.get(Q.type) as CaseTypeFilter) || 'ALL';
  const validTypes: CaseTypeFilter[] = ['ALL', 'CONSULTATION', 'LITIGATION', 'ADMINISTRATIVE'];
  const caseTypeFilter = validTypes.includes(caseType) ? caseType : 'ALL';
  const statusParam = searchParams.get(Q.status);
  const statusFilters = statusParam ? statusParam.split(',').filter(Boolean) : [];
  const clientIdParam = searchParams.get(Q.clientId);
  const parsedClientId = clientIdParam ? parseInt(clientIdParam, 10) : NaN;
  const clientIdFilter = Number.isFinite(parsedClientId) ? parsedClientId : null;
  const searchTerm = searchParams.get(Q.search) ?? '';

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const updateUrlFilters = (updates: Partial<Record<string, string | null>>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      });
      return next;
    });
  };

  const setActiveTab = (t: CasesTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(Q.tab, t);
      return next;
    });
    setCurrentPage(1);
  };

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cases, setCases] = useState<API.Case[]>([]);
  const [casesIsLoading, setCasesIsLoading] = useState(false);
  const [fullFilteredCases, setFullFilteredCases] = useState<API.Case[]>([]);
  const [allCases, setAllCases] = useState<API.Case[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const caseModalRef = useRef<CaseModalRef>(null);
  const caseUpdateModalRef = useRef<CaseUpdateModalRef>(null);
  const caseDeleteModalRef = useRef<CaseDeleteModalRef>(null);
  const caseViewModalRef = useRef<CaseViewModalRef>(null);
  const caseDetailDrawerRef = useRef<CaseDetailDrawerRef>(null);

  const hasActiveFilters = useMemo(() => {
    return caseTypeFilter !== 'ALL' || statusFilters.length > 0 || clientIdFilter != null ||
      (debouncedSearchTerm?.trim() ?? '') !== '';
  }, [caseTypeFilter, statusFilters.length, clientIdFilter, debouncedSearchTerm]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (caseTypeFilter !== 'ALL') c++;
    if (statusFilters.length > 0) c++;
    if (clientIdFilter != null) c++;
    if ((debouncedSearchTerm?.trim() ?? '') !== '') c++;
    return c;
  }, [caseTypeFilter, statusFilters.length, clientIdFilter, debouncedSearchTerm]);

  const fetchAllCasesForStats = () => {
    apiGetCases({ page_size: 1000 })
      .then((res) => setAllCases(res.data?.results ?? []))
      .catch(() => setAllCases([]));
  };

  useEffect(() => {
    setCasesIsLoading(true);
    const params: GetCasesParams = { page: 1, page_size: 1000 };
    if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
    if (caseTypeFilter !== 'ALL') {
      params.caseType = caseTypeFilter === 'ADMINISTRATIVE' ? 'ADMINISTRATIVE' : caseTypeFilter;
    }
    if (statusFilters.length > 0) params.status = statusFilters.join(',');
    if (clientIdFilter != null) params.client = clientIdFilter;

    apiGetCases(params)
      .then((res) => {
        const raw = res.data?.results ?? [];
        setFullFilteredCases(raw);
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to fetch cases.', variant: 'destructive' });
        setFullFilteredCases([]);
      })
      .finally(() => setCasesIsLoading(false));
  }, [debouncedSearchTerm, caseTypeFilter, clientIdFilter, statusParam, refreshTrigger]);

  useEffect(() => {
    fetchAllCasesForStats();
  }, []);

  const myCases = useMemo(() => {
    if (!currentUser?.id) return [];
    return fullFilteredCases.filter((c) => isCaseAssignedToUser(c, currentUser.id));
  }, [fullFilteredCases, currentUser?.id]);

  const displayList = activeTab === 'my' ? myCases : fullFilteredCases;
  const totalCount = displayList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayList.slice(start, start + pageSize);
  }, [displayList, currentPage, pageSize]);

  useEffect(() => {
    setCases(paginatedCases);
  }, [paginatedCases]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const myCasesCount = myCases.length;
  const allCasesCount = fullFilteredCases.length;

  const handleRowClick = (caseItem: API.Case) => {
    caseDetailDrawerRef.current?.open(caseItem);
  };

  const handleEditFromDrawer = (caseItem: API.Case) => {
    caseDetailDrawerRef.current?.close();
    caseModalRef.current?.show(caseItem);
  };

  const handleDeleteFromDrawer = (caseItem: API.Case) => {
    caseDetailDrawerRef.current?.close();
    caseDeleteModalRef.current?.show(caseItem);
  };

  const stats = useMemo(() => {
    const list = allCases ?? [];
    const total = list.length;
    const active = list.filter(
      (c) => c.status === CaseStatus.OPEN || c.status === CaseStatus.IN_PROGRESS
    ).length;
    const urgent = list.filter(
      (c) => c.status === CaseStatus.IN_PROGRESS || c.status === CaseStatus.PENDING
    ).length;
    const closed = list.filter((c) => c.status === CaseStatus.CLOSED).length;
    return { total, active, urgent, closed };
  }, [allCases]);

  const handleStatusToggle = (status: string) => {
    const next = statusFilters.includes(status) ? statusFilters.filter((s) => s !== status) : [...statusFilters, status];
    updateUrlFilters({ [Q.status]: next.length ? next.join(',') : null });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      const tab = prev.get(Q.tab);
      if (tab) next.set(Q.tab, tab);
      return next;
    });
    setCurrentPage(1);
  };

  const refresh = () => {
    setRefreshTrigger((t) => t + 1);
    fetchAllCasesForStats();
  };

  const patchCaseInList = useCallback((caseId: number, patch: Partial<API.Case>) => {
    setFullFilteredCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, ...patch } : c))
    );
  }, []);

  /* ==================
     List View (Table)
     ================== */
  const renderListView = () => (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40">
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Type
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Reference
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Title
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Client
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Assigned
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400">
                Date / Deadline
              </th>
              <th className="w-10 py-3 px-2" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {casesIsLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 animate-pulse">
                  <td className="h-12 px-4">
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-4">
                    <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-12 px-2" />
                </tr>
              ))
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={8} className="align-middle">
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-4 shadow-inner">
                      <Scale className="w-7 h-7 text-slate-500 dark:text-slate-400" aria-hidden />
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {hasActiveFilters ? 'No cases match your filters' : activeTab === 'my' ? 'No cases assigned to you yet' : 'No cases found'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">
                      {hasActiveFilters
                        ? 'Try broadening your search or clearing filters to see more results.'
                        : activeTab === 'my'
                          ? 'When matters are assigned to you, they will appear here.'
                          : 'Create a case or adjust filters to get started.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" className="mt-5 rounded-lg border-slate-300 dark:border-slate-600" onClick={resetFilters}>
                        Reset Filters
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ) : (
              cases.map((caseItem, rowIdx) => (
                <tr
                  key={caseItem.id}
                  className={cn(
                    'group border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors',
                    rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/25',
                    'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                  )}
                  onClick={() => handleRowClick(caseItem)}
                >
                  <td className="px-4 py-3 align-middle">
                    <TypeBadge caseItem={caseItem} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {caseItem.reference || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-white line-clamp-2 max-w-[min(280px,28vw)]">
                      {getCaseTitle(caseItem)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle text-[13px] text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {getClientName(caseItem.client)}
                  </td>
                  <td className="px-4 py-3 align-middle text-[13px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                    {getAssignedName(caseItem)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <StatusPill status={caseItem.status} />
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <ListDeadlineCell caseItem={caseItem} />
                  </td>
                  <td className="px-2 py-3 align-middle text-right">
                    <ChevronRight
                      className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors ml-auto"
                      aria-hidden
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ==================
     Bento Card View
     ================== */
  const renderGridView = () => (
    <div className="grid grid-cols-1 min-[640px]:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
      {casesIsLoading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] rounded-[12px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_3px_rgba(0,0,0,0.06)] animate-pulse"
          >
            <div className="p-4 space-y-3">
              <div className="h-4 w-[70%] bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          </div>
        ))
      ) : cases.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-4 shadow-inner">
            <Scale className="w-7 h-7 text-slate-500 dark:text-slate-400" aria-hidden />
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {hasActiveFilters ? 'No cases match your filters' : activeTab === 'my' ? 'No cases assigned to you yet' : 'No cases found'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">
            {hasActiveFilters
              ? 'Try broadening your search or clearing filters to see more results.'
              : activeTab === 'my'
                ? 'When matters are assigned to you, they will appear here.'
                : 'Create a case or adjust filters to get started.'}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" className="mt-5 rounded-lg border-slate-300 dark:border-slate-600" onClick={resetFilters}>
              Reset Filters
            </Button>
          ) : null}
        </div>
      ) : (
        cases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            caseItem={caseItem}
            onClick={() => handleRowClick(caseItem)}
          />
        ))
      )}
    </div>
  );

  return (
    <div
      ref={setCasesHolderEl}
      className="relative h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      {/* Stats */}
      <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 px-3 sm:px-4 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-slate-400">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Total</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800/80 p-2 text-slate-600 dark:text-slate-300">
                <LayoutGrid className="w-4 h-4" aria-hidden />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-slate-300/0 via-slate-300/60 to-slate-300/0 dark:from-slate-600/0 dark:via-slate-600/50 dark:to-slate-600/0" />
          </div>
          <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-emerald-500">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Active</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.active}</p>
              </div>
              <div className="rounded-lg bg-emerald-500/12 p-2 text-emerald-700 dark:text-emerald-400">
                <Activity className="w-4 h-4" aria-hidden />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/35 to-emerald-500/0" />
          </div>
          <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-amber-500">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Urgent</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{stats.urgent}</p>
              </div>
              <div className="rounded-lg bg-amber-500/12 p-2 text-amber-700 dark:text-amber-400">
                <Flame className="w-4 h-4" aria-hidden />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/35 to-amber-500/0" />
          </div>
          <div className="cases-stat-card relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-[3px] border-l-slate-300 dark:border-l-slate-600">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Closed</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-200">{stats.closed}</p>
              </div>
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800/80 p-2 text-slate-500 dark:text-slate-400">
                <Archive className="w-4 h-4" aria-hidden />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-slate-300/0 via-slate-300/50 to-slate-300/0 dark:from-slate-600/0 dark:via-slate-600/40 dark:to-slate-600/0" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 px-3 sm:px-4 py-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select
            value={caseTypeFilter}
            onValueChange={(v) => {
              updateUrlFilters({ [Q.type]: v === 'ALL' ? null : v });
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              className={cn(
                'h-10 w-[168px] text-[13px] rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/25',
                caseTypeFilter !== 'ALL' && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
              )}
            >
              <SelectValue placeholder="Case Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="CONSULTATION">Consultation</SelectItem>
              <SelectItem value="LITIGATION">Litigation</SelectItem>
              <SelectItem value="ADMINISTRATIVE">Administrative Duty</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 rounded-lg px-3 text-[13px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-2 focus-visible:ring-primary/25',
                  statusFilters.length > 0 && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
                )}
              >
                Status {statusFilters.length > 0 && `(${statusFilters.length})`} ▾
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">General</p>
                  <div className="flex flex-wrap gap-1">
                    {GENERAL_STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={statusFilters.includes(s) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => handleStatusToggle(s)}
                      >
                        {getStatusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
                {caseTypeFilter === 'CONSULTATION' && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Consultation</p>
                    <div className="flex flex-wrap gap-1">
                      {CONSULTATION_STATUSES.map((s) => (
                        <Button
                          key={s}
                          variant={statusFilters.includes(s) ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => handleStatusToggle(s)}
                        >
                          {getStatusLabel(s)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Litigation / Admin</p>
                  <div className="flex flex-wrap gap-1">
                    {LITIGATION_ADMIN_STATUSES.map((s) => (
                      <Button
                        key={s}
                        variant={statusFilters.includes(s) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => handleStatusToggle(s)}
                      >
                        {getStatusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-[180px] sm:w-[200px]">
            <ServerSelect
              link="/clients/clients/"
              value={clientIdFilter ?? undefined}
              onChange={(v) => {
                updateUrlFilters({ [Q.clientId]: v != null ? String(v) : null });
                setCurrentPage(1);
              }}
              placeholder="Search client..."
              searchPlaceholder="Search client..."
              labelKey={(c: { first_name?: string; last_name?: string; email?: string }) =>
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Unnamed'
              }
              valueKey="id"
              cleanable
              className={cn(
                'h-10 text-[13px] rounded-lg border-slate-200 dark:border-slate-700',
                clientIdFilter != null && 'ring-2 ring-primary/30 border-primary/40 bg-primary/[0.04]'
              )}
            />
          </div>

          <div className="relative flex-1 min-w-0 w-full sm:min-w-[160px] max-w-none sm:max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search reference, title, client..."
              className={cn(
                'h-10 pl-9 pr-9 text-[13px] rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-2 focus-visible:ring-primary/25',
                searchTerm.trim() !== '' && 'ring-1 ring-primary/25 border-primary/30'
              )}
              value={searchTerm}
              onChange={(e) => updateUrlFilters({ [Q.search]: e.target.value || null })}
              aria-label="Search cases"
            />
            {searchTerm.trim() !== '' && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => updateUrlFilters({ [Q.search]: null })}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-10 text-[13px] text-slate-600" onClick={resetFilters}>
              Reset
            </Button>
          )}

          <div className="hidden sm:flex lg:hidden items-center gap-1 text-[12px] text-slate-500">
            {activeFilterCount > 0 && <>Filters ({activeFilterCount})</>}
          </div>

          <div
            className="flex items-center gap-0.5 ml-auto sm:ml-2 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/50"
            role="group"
            aria-label="View mode"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 rounded-md transition-all',
                viewMode === 'list' && 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700'
              )}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-3 rounded-md transition-all',
                viewMode === 'grid' && 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700'
              )}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            className="h-10 px-4 text-[13px] font-semibold shrink-0 rounded-lg shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-shadow"
            onClick={() => caseModalRef.current?.show()}
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Add New Case
          </Button>
          </div>
        </div>
      </div>

      {/* My Cases / All Cases Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CasesTab)}
        className="shrink-0 px-3 sm:px-4 pt-4"
      >
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0 border-b border-slate-200 dark:border-slate-800">
          <TabsTrigger
            value="my"
            className="relative rounded-none border-0 bg-transparent px-1 pb-3 mr-6 text-[14px] font-medium text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100"
          >
            <span className="inline-flex items-center gap-2">
              My Cases
              <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0 text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {activeTab === 'my' ? totalCount : myCasesCount}
              </span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="relative rounded-none border-0 bg-transparent px-1 pb-3 text-[14px] font-medium text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100"
          >
            <span className="inline-flex items-center gap-2">
              All Cases
              <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0 text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                {activeTab === 'all' ? totalCount : allCasesCount}
              </span>
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-5 border-t border-slate-200/90 dark:border-slate-800">
        {viewMode === 'list' ? renderListView() : renderGridView()}
      </div>

      {/* Pagination */}
      <div className="shrink-0 px-3 sm:px-4">
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          isLoading={casesIsLoading}
          onPageChange={setCurrentPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modals & Drawer */}
      <CaseModal ref={caseModalRef} onSuccess={refresh} />
      <CaseUpdateModal ref={caseUpdateModalRef} onSuccess={refresh} />
      <CaseDeleteModal ref={caseDeleteModalRef} onSuccess={refresh} />
      <CaseViewModal ref={caseViewModalRef} onSuccess={refresh} />
      <CaseDetailDrawer
        ref={caseDetailDrawerRef}
        portalContainer={casesHolderEl}
        onEdit={handleEditFromDrawer}
        onDelete={(c) => caseDeleteModalRef.current?.show(c)}
        onCaseListPatch={patchCaseInList}
      />
    </div>
  );
};

export default Cases;
