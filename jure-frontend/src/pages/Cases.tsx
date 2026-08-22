import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useDebounce } from '@/hooks/use-debounce';
import './Cases.css';
import {
  Plus,
  List,
  LayoutGrid,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Scale,
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
import { apiGetCase, apiGetCases, GetCasesParams } from '@/services/case/api';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import CaseViewModal, { CaseViewModalRef } from '@/components/case/CaseViewModal';
import CaseCard from '@/components/case/CaseCard';
import MatterWorkspaceCard from '@/components/case/MatterWorkspaceCard';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet from '@/components/common/MobileFilterSheet';
import PaginationComponent from '@/components/common/Pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { navigateToCase } from '@/lib/caseRoutes';
import { eventBus } from '@/utils/eventBus';
import {
  getCaseData,
  getCaseDateForFilter,
  formatDate,
  getCountdownDays,
  getCountdownStyle,
} from '@/utils/caseCardHelpers';
import ServerSelect from '@/components/common/ServerSelect';
import { useAppTranslation } from '@/i18n';
import { useShortcutAction } from '@/context/ShortcutsContext';

/* =========================
   Helpers & Mini Components
   ========================= */
const getClientName = (c?: API.Case['client']) =>
  c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || '—' : '—';

const getCaseTitle = (caseItem: API.Case, untitled: string) =>
  (caseItem as API.Case & { title?: string }).title ||
  caseItem.reference ||
  CaseCategory.getLabel(caseItem.category) ||
  untitled;

const getCaseTypeKey = (c: API.Case): string => {
  const type = c.caseType ?? c.case_type;
  if (type === 'ADMINISTRATIVE_DUTY' || type === 'ADMINISTRATIVE') return 'ADMINISTRATIVE';
  return type ?? 'UNKNOWN';
};

const typeBadgeStyles: Record<string, string> = {
  CONSULTATION: 'bg-blue-500/12 text-blue-800 dark:text-blue-400 ring-blue-500/25',
  LITIGATION: 'bg-rose-500/12 text-rose-800 dark:text-rose-400 ring-rose-500/25',
  ADMINISTRATIVE: 'bg-amber-500/12 text-amber-900 dark:text-amber-400 ring-amber-500/25',
  UNKNOWN: 'bg-slate-500/12 text-slate-700 dark:text-slate-400 ring-slate-500/25',
};

const TypeBadge: React.FC<{ caseItem: API.Case }> = ({ caseItem }) => {
  const { t } = useAppTranslation();
  const k = getCaseTypeKey(caseItem);
  const label =
    k === 'ADMINISTRATIVE'
      ? t.cases.typeLabels.admin
      : k === 'CONSULTATION'
        ? t.cases.typeLabels.consultation
        : k === 'LITIGATION'
          ? t.cases.typeLabels.litigation
          : k === 'UNKNOWN'
            ? '—'
            : k;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset min-w-[4rem]',
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
  const { t, tf } = useAppTranslation();
  const dateStr = getCaseDateForFilter(caseItem);
  if (!dateStr) {
    return <span className="text-[12px] text-slate-500 dark:text-slate-400">—</span>;
  }
  const days = getCountdownDays(dateStr);
  if (days === null) {
    return <span className="text-[12px] text-slate-500 dark:text-slate-400">—</span>;
  }
  const style = days < 0 ? 'critical' : getCountdownStyle(days);
  const label = formatDate(dateStr);
  const sub =
    days < 0
      ? tf(t.cases.deadline.overdue, { days: Math.abs(days) })
      : days === 0
        ? t.cases.deadline.today
        : tf(t.cases.deadline.inDays, { days });
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 min-w-[120px]',
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
        <span className="text-[12px]">{label}</span>
        <span className={cn('text-[10px]', style === 'critical' && 'font-semibold')}>{sub}</span>
      </span>
    </div>
  );
};

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

const StatusPill: React.FC<{ status: API.CaseStatus }> = ({ status }) => {
  const { enumPretty } = useAppTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
        statusPillStyles[status] ?? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
      )}
    >
      {enumPretty(status)}
    </span>
  );
};

const AnimatedStatValue: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || value === prevRef.current) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }
    let frame = 0;
    const start = prevRef.current;
    const diff = value - start;
    const steps = 12;
    let raf = 0;
    const tick = () => {
      frame += 1;
      setDisplay(Math.round(start + (diff * frame) / steps));
      if (frame < steps) raf = requestAnimationFrame(tick);
      else prevRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={cn('cases-stat-value tabular-nums', className)}>{display}</span>;
};

const isCaseAssignedToUser = (c: API.Case, userId: number): boolean => {
  const assignedToId =
    (c.assigned_to as API.User | null)?.id ?? (c.assigned_to as { id?: number } | null)?.id;
  if (assignedToId === userId) return true;
  const caseType = c.caseType ?? c.case_type;
  if (caseType === 'LITIGATION' || caseType === 'ADMINISTRATIVE_DUTY') {
    const leadAttorney = getCaseData(c, 'lead_attorney') as number | null | undefined;
    if (leadAttorney === userId) return true;
  }
  return false;
};

const GENERAL_STATUSES = ['OPEN', 'CLOSED', 'IN_PROGRESS', 'CANCELLED', 'PENDING', 'ARCHIVED'] as const;
const CONSULTATION_STATUSES = ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CONVERTED_TO_CASE'] as const;
const LITIGATION_ADMIN_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'URGENT'] as const;

type CaseTypeFilter = 'ALL' | 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';
type CasesTab = 'my' | 'all';

const Q = { type: 'type', status: 'status', clientId: 'clientId', search: 'search', tab: 'tab' } as const;

const KPI_ACCENTS: Record<string, string> = {
  total: 'border-l-slate-400',
  active: 'border-l-emerald-500',
  urgent: 'border-l-amber-500',
  closed: 'border-l-slate-300 dark:border-l-slate-600',
};

const TABLE_TH =
  'text-start py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal';

interface CaseTableRowProps {
  caseItem: API.Case;
  rowIdx: number;
  selected: boolean;
  onOpen: (c: API.Case) => void;
  onFocusRow: (idx: number) => void;
}

const CaseTableRow = memo(function CaseTableRow({
  caseItem,
  rowIdx,
  selected,
  onOpen,
  onFocusRow,
}: CaseTableRowProps) {
  const { t, tf } = useAppTranslation();
  const title = getCaseTitle(caseItem, t.cases.untitledCase);
  return (
    <tr
      tabIndex={0}
      data-row-idx={rowIdx}
      className={cn(
        'group border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none',
        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-[#F7F4FF] hover:shadow-[inset_3px_0_0_0_#64499D] rtl:hover:shadow-[inset_-3px_0_0_0_#64499D] dark:hover:bg-[#24183F]/50',
        selected && 'bg-primary/[0.06] dark:bg-primary/10 ring-1 ring-inset ring-primary/25',
        'focus-visible:outline-none focus-visible:bg-[#F7F4FF] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/40'
      )}
      onClick={() => onOpen(caseItem)}
      onFocus={() => onFocusRow(rowIdx)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(caseItem);
        }
      }}
      aria-label={tf(t.cases.aria.openMatter, { title })}
    >
      <td className="px-3 py-2 align-middle text-start">
        <TypeBadge caseItem={caseItem} />
      </td>
      <td className="px-3 py-2 align-middle text-start">
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          {caseItem.reference || '—'}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-start">
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white line-clamp-1 max-w-[min(320px,30vw)]">
          {title}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-start text-[12px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
        {getClientName(caseItem.client)}
      </td>
      <td className="px-3 py-2 align-middle text-start text-[12px] text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
        {getAssignedName(caseItem)}
      </td>
      <td className="px-3 py-2 align-middle text-start">
        <StatusPill status={caseItem.status} />
      </td>
      <td className="px-3 py-2 align-middle text-start">
        <ListDeadlineCell caseItem={caseItem} />
      </td>
      <td className="px-1.5 py-2 align-middle text-end w-8">
        <ChevronRight
          className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#64499D] transition-colors ms-auto rtl:rotate-180"
          aria-hidden
        />
      </td>
    </tr>
  );
});

/* ==============
   Main Component
   ============== */
const Cases = () => {
  const { t, tf, enumPretty } = useAppTranslation();
  const navigate = useNavigate();
  const [casesHolderEl, setCasesHolderEl] = useState<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useUserStore();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusedRowIdx, setFocusedRowIdx] = useState<number>(-1);

  const activeTab: CasesTab =
    searchParams.get(Q.tab) === 'my' || searchParams.get(Q.tab) === 'all'
      ? (searchParams.get(Q.tab) as CasesTab)
      : 'my';
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

  useEffect(() => {
    const raw = searchParams.get('case');
    if (!raw) return;
    let cancelled = false;
    (async () => {
      const asId = Number(raw);
      if (Number.isInteger(asId) && String(asId) === raw) {
        try {
          const res = await apiGetCase(asId);
          if (!cancelled && res.data) {
            navigateToCase(navigate, res.data);
            return;
          }
        } catch {
          /* search by reference */
        }
      }
      try {
        const res = await apiGetCases({ search: raw, page: 1, page_size: 50 });
        const match = (res.data?.results ?? []).find(
          (c) => c.reference === raw || String(c.id) === raw
        );
        if (!cancelled && match) navigateToCase(navigate, match);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

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

  const setActiveTab = (tab: CasesTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(Q.tab, tab);
      return next;
    });
    setCurrentPage(1);
  };

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [cases, setCases] = useState<API.Case[]>([]);
  const [casesIsLoading, setCasesIsLoading] = useState(false);
  const [casesLoadError, setCasesLoadError] = useState(false);
  const [fullFilteredCases, setFullFilteredCases] = useState<API.Case[]>([]);
  const [allCases, setAllCases] = useState<API.Case[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const caseModalRef = useRef<CaseModalRef>(null);
  const caseUpdateModalRef = useRef<CaseUpdateModalRef>(null);
  const caseDeleteModalRef = useRef<CaseDeleteModalRef>(null);
  const caseViewModalRef = useRef<CaseViewModalRef>(null);

  const hasActiveFilters = useMemo(() => {
    return (
      caseTypeFilter !== 'ALL' ||
      statusFilters.length > 0 ||
      clientIdFilter != null ||
      (debouncedSearchTerm?.trim() ?? '') !== ''
    );
  }, [caseTypeFilter, statusFilters.length, clientIdFilter, debouncedSearchTerm]);

  const fetchAllCasesForStats = () => {
    apiGetCases({ page_size: 1000 })
      .then((res) => setAllCases(res.data?.results ?? []))
      .catch(() => {
        // Stats are secondary; do not invent sample matters on failure.
        setAllCases([]);
      });
  };

  useEffect(() => {
    setCasesIsLoading(true);
    setCasesLoadError(false);
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
        setCasesLoadError(false);
      })
      .catch(() => {
        toast({
          title: t.common.error,
          description: t.cases.errors.fetchFailed,
          variant: 'destructive',
        });
        setCasesLoadError(true);
        // Keep previous list only briefly cleared — do not pretend empty success.
        setFullFilteredCases([]);
      })
      .finally(() => setCasesIsLoading(false));
  }, [debouncedSearchTerm, caseTypeFilter, clientIdFilter, statusParam, refreshTrigger, t, toast]);

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

  useEffect(() => {
    setFocusedRowIdx(-1);
  }, [paginatedCases]);

  const myCasesCount = myCases.length;
  const allCasesCount = fullFilteredCases.length;

  const handleRowClick = useCallback((caseItem: API.Case) => {
    void navigateToCase(navigate, caseItem);
  }, [navigate]);

  const handleEditCase = useCallback((caseItem: API.Case) => {
    caseModalRef.current?.show(caseItem);
  }, []);

  const openCreateCase = useCallback(() => {
    caseModalRef.current?.show();
  }, []);

  useShortcutAction('create-case', openCreateCase);

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
    const next = statusFilters.includes(status)
      ? statusFilters.filter((s) => s !== status)
      : [...statusFilters, status];
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

  const extraFilterCount =
    (caseTypeFilter !== 'ALL' ? 1 : 0) +
    (statusFilters.length > 0 ? 1 : 0) +
    (clientIdFilter != null ? 1 : 0);

  const renderCaseFilters = (fullWidth: boolean) => (
    <>
      <Select
        value={caseTypeFilter}
        onValueChange={(v) => {
          updateUrlFilters({ [Q.type]: v === 'ALL' ? null : v });
          setCurrentPage(1);
        }}
      >
        <SelectTrigger
          className={cn(
            'h-9 text-[12px] rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-primary/25',
            fullWidth ? 'w-full' : 'w-[132px] sm:w-[148px]',
            caseTypeFilter !== 'ALL' && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]'
          )}
        >
          <SelectValue placeholder={t.cases.filters.matterType} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t.cases.filters.allTypes}</SelectItem>
          <SelectItem value="CONSULTATION">{t.cases.filters.consultation}</SelectItem>
          <SelectItem value="LITIGATION">{t.cases.filters.litigation}</SelectItem>
          <SelectItem value="ADMINISTRATIVE">{t.cases.filters.administrative}</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 rounded-md px-2.5 text-[12px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus-visible:ring-2 focus-visible:ring-primary/25',
              fullWidth && 'w-full justify-between',
              statusFilters.length > 0 && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]'
            )}
          >
            {t.cases.filters.status}
            {statusFilters.length > 0 ? ` (${statusFilters.length})` : ''} ▾
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t.cases.filters.general}
              </p>
              <div className="flex flex-wrap gap-1">
                {GENERAL_STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={statusFilters.includes(s) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => handleStatusToggle(s)}
                  >
                    {enumPretty(s)}
                  </Button>
                ))}
              </div>
            </div>
            {caseTypeFilter === 'CONSULTATION' && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {t.cases.filters.consultation}
                </p>
                <div className="flex flex-wrap gap-1">
                  {CONSULTATION_STATUSES.map((s) => (
                    <Button
                      key={s}
                      variant={statusFilters.includes(s) ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => handleStatusToggle(s)}
                    >
                      {enumPretty(s)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {t.cases.filters.litigation} / {t.cases.typeLabels.admin}
              </p>
              <div className="flex flex-wrap gap-1">
                {LITIGATION_ADMIN_STATUSES.map((s) => (
                  <Button
                    key={s}
                    variant={statusFilters.includes(s) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => handleStatusToggle(s)}
                  >
                    {enumPretty(s)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className={fullWidth ? 'w-full' : 'w-[160px] sm:w-[180px]'}>
        <ServerSelect
          link="/clients/clients/"
          value={clientIdFilter ?? undefined}
          onChange={(v) => {
            updateUrlFilters({ [Q.clientId]: v != null ? String(v) : null });
            setCurrentPage(1);
          }}
          placeholder={t.cases.clientPlaceholder}
          searchPlaceholder={t.cases.searchClient}
          labelKey={(c: { first_name?: string; last_name?: string; email?: string }) =>
            `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || t.cases.unnamed
          }
          valueKey="id"
          cleanable
          className={cn(
            'h-9 text-[12px] rounded-md border-slate-200 dark:border-slate-700',
            fullWidth && 'w-full max-w-none',
            clientIdFilter != null && 'ring-1 ring-primary/30 border-primary/40 bg-primary/[0.04]'
          )}
        />
      </div>
    </>
  );

  const refresh = () => {
    setRefreshTrigger((t) => t + 1);
    fetchAllCasesForStats();
  };

  useEffect(() => {
    const onCaseUpdated = () => refresh();
    eventBus.on('case-updated', onCaseUpdated);
    return () => eventBus.off('case-updated', onCaseUpdated);
  }, []);

  const patchCaseInList = useCallback((caseId: number, patch: Partial<API.Case>) => {
    setFullFilteredCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, ...patch } : c))
    );
  }, []);

  /* Keyboard: / search, n new case, j/k row nav */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openCreateCase();
        return;
      }

      if (inField) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIdx((idx) => {
          const next = Math.min((idx < 0 ? -1 : idx) + 1, cases.length - 1);
          const el = scrollRef.current?.querySelector(
            `[data-row-idx="${next}"]`
          ) as HTMLElement | null;
          el?.focus();
          return next;
        });
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIdx((idx) => {
          const next = Math.max((idx < 0 ? cases.length : idx) - 1, 0);
          const el = scrollRef.current?.querySelector(
            `[data-row-idx="${next}"]`
          ) as HTMLElement | null;
          el?.focus();
          return next;
        });
      }
      if (e.key === 'Enter' && focusedRowIdx >= 0 && cases[focusedRowIdx]) {
        handleRowClick(cases[focusedRowIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cases, focusedRowIdx, handleRowClick, openCreateCase]);

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-3">
        <Scale className="w-6 h-6 text-slate-500 dark:text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {hasActiveFilters
          ? t.cases.empty.noMatch
          : activeTab === 'my'
            ? t.cases.empty.noAssigned
            : t.cases.empty.none}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">
        {hasActiveFilters
          ? t.cases.empty.noMatchHint
          : activeTab === 'my'
            ? t.cases.empty.noAssignedHint
            : t.cases.empty.noneHint}
      </p>
      {hasActiveFilters ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8 rounded-md text-[12px]"
          onClick={resetFilters}
        >
          {t.cases.empty.resetFilters}
        </Button>
      ) : activeTab !== 'my' ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8 rounded-md text-[12px]"
          onClick={openCreateCase}
        >
          {t.cases.empty.createCta}
        </Button>
      ) : null}
    </div>
  );

  const errorState = (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="h-12 w-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-3">
        <Scale className="w-6 h-6 text-rose-600 dark:text-rose-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {t.cases.errors.fetchFailed}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 h-8 rounded-md text-[12px]"
        onClick={() => setRefreshTrigger((n) => n + 1)}
      >
        {t.cases.errors.retry}
      </Button>
    </div>
  );

  const renderListView = () => (
    <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]" role="grid" aria-label={t.cases.aria.mattersList}>
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              <th className={TABLE_TH}>
                {t.cases.columns.type}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.reference}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.title}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.client}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.assigned}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.status}
              </th>
              <th className={TABLE_TH}>
                {t.cases.columns.dateDeadline}
              </th>
              <th className="w-8 py-2 px-1" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {casesIsLoading ? (
              Array.from({ length: 14 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 animate-pulse">
                  <td className="h-10 px-3">
                    <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-3">
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </td>
                  <td className="h-10 px-1" />
                </tr>
              ))
            ) : casesLoadError ? (
              <tr>
                <td colSpan={8} className="align-middle">
                  {errorState}
                </td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={8} className="align-middle">
                  {emptyState}
                </td>
              </tr>
            ) : (
              cases.map((caseItem, rowIdx) => (
                <CaseTableRow
                  key={caseItem.id}
                  caseItem={caseItem}
                  rowIdx={rowIdx}
                  selected={focusedRowIdx === rowIdx}
                  onOpen={handleRowClick}
                  onFocusRow={setFocusedRowIdx}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 md:grid-cols-4">
      {casesIsLoading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-[14px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          />
        ))
      ) : casesLoadError ? (
        <div className="col-span-full">{errorState}</div>
      ) : cases.length === 0 ? (
        <div className="col-span-full">{emptyState}</div>
      ) : (
        cases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            caseItem={caseItem}
            onClick={() => handleRowClick(caseItem)}
            onEdit={() => handleEditCase(caseItem)}
          />
        ))
      )}
    </div>
  );

  const renderMobileCards = () => (
    <div className="flex flex-col gap-2 pb-16 md:pb-0" role="list" aria-label={t.cases.aria.mattersGrid}>
      {casesIsLoading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[108px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-pulse"
          />
        ))
      ) : casesLoadError ? (
        errorState
      ) : cases.length === 0 ? (
        emptyState
      ) : (
        cases.map((caseItem) => (
          <MatterWorkspaceCard
            key={caseItem.id}
            caseItem={caseItem}
            onOpen={() => handleRowClick(caseItem)}
            onEdit={() => handleEditCase(caseItem)}
          />
        ))
      )}
    </div>
  );

  const kpiItems = [
    { key: 'total', label: t.cases.stats.total, value: stats.total },
    { key: 'active', label: t.cases.stats.active, value: stats.active },
    { key: 'urgent', label: t.cases.stats.urgent, value: stats.urgent },
    { key: 'closed', label: t.cases.stats.closed, value: stats.closed },
  ] as const;

  return (
    <div
      ref={setCasesHolderEl}
      className="relative h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-0 pt-3 pb-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t.cases.allCases}
              </h1>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 max-w-2xl">
                {t.cases.allCasesSubtitle}
              </p>
            </div>
            <Button
              size="sm"
              className="hidden md:inline-flex h-9 px-3 text-[12px] font-semibold shrink-0 rounded-md shadow-sm shadow-primary/15"
              onClick={openCreateCase}
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
              {t.cases.addNewCase}
            </Button>
          </div>
        </div>

        {/* KPI strip — scrolls away */}
        <div
          className="cases-kpi-strip flex gap-2 overflow-x-auto snap-x snap-mandatory px-1 sm:px-0 py-2"
          role="region"
          aria-label={t.cases.aria.matterStats}
        >
          {kpiItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                'cases-kpi-chip snap-start shrink-0 flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
                'bg-white dark:bg-slate-950 border-l-[3px] px-2.5 py-1.5 min-w-[5.75rem]',
                'sm:flex-1 sm:min-w-0',
                KPI_ACCENTS[item.key]
              )}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none">
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white leading-none">
                  <AnimatedStatValue value={item.value} />
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky work controls */}
        <div
          className={cn(
            'cases-toolbar-sticky sticky top-0 z-30',
            'bg-slate-50/95 dark:bg-slate-950/95 border-b border-slate-200/90 dark:border-slate-800',
            'px-0 pt-1 pb-0'
          )}
        >
          <div className="relative rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 px-2 py-2 sm:px-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CompactSearch
                value={searchTerm}
                onChange={(v) => updateUrlFilters({ [Q.search]: v || null })}
                placeholder={t.cases.searchPlaceholder}
                ariaLabel={t.cases.searchAria}
                clearAriaLabel={t.cases.clearSearch}
                inputRef={searchInputRef}
              />
              <MobileFilterSheet
                title={t.common.filter}
                count={extraFilterCount}
                footer={
                  extraFilterCount > 0 ? (
                    <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={resetFilters}>
                      {t.cases.reset}
                    </Button>
                  ) : null
                }
              >
                {renderCaseFilters(true)}
              </MobileFilterSheet>

              <div
                className="ml-auto hidden items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50 md:inline-flex"
                role="group"
                aria-label={t.cases.aria.viewMode}
              >
                {(['list', 'grid'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                      viewMode === mode
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                        : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
                    )}
                    aria-pressed={viewMode === mode}
                    aria-label={mode === 'list' ? t.cases.aria.listView : t.cases.aria.gridView}
                  >
                    {mode === 'list' ? (
                      <List className="h-3.5 w-3.5" />
                    ) : (
                      <LayoutGrid className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as CasesTab)}
              className="mt-2"
            >
              <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-0 bg-transparent p-0 border-b border-slate-200 dark:border-slate-800">
                <TabsTrigger
                  value="my"
                  className="relative rounded-none border-0 bg-transparent px-1 pb-2 mr-5 text-[13px] font-medium text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.cases.myCases}
                    <span className="inline-flex min-w-[1.15rem] justify-center rounded-full bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0 text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {activeTab === 'my' ? totalCount : myCasesCount}
                    </span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="relative rounded-none border-0 bg-transparent px-1 pb-2 text-[13px] font-medium text-slate-500 dark:text-slate-400 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:content-[''] data-[state=active]:after:opacity-100"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {t.cases.allCases}
                    <span className="inline-flex min-w-[1.15rem] justify-center rounded-full bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0 text-[10px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {activeTab === 'all' ? totalCount : allCasesCount}
                    </span>
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Work surface */}
        <div className="px-0 py-3 md:py-4">
          {/* Mobile / small tablet: dense cards */}
          <div className="md:hidden">{renderMobileCards()}</div>
          {/* Desktop */}
          <div className="hidden md:block">
            {viewMode === 'list' ? renderListView() : renderGridView()}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="shrink-0 px-0">
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
          pageSizeOptions={[
            { value: '20', label: '20 per page' },
            { value: '50', label: '50 per page' },
            { value: '100', label: '100 per page' },
          ]}
        />
      </div>

      {/* Mobile FAB — Add Case */}
      <Button
        type="button"
        size="icon"
        className="md:hidden fixed z-40 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] right-4 h-12 w-12 rounded-full shadow-lg shadow-primary/30"
        onClick={openCreateCase}
        aria-label={t.cases.aria.addNewCase}
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </Button>

      <p className="sr-only" aria-live="polite">
        {casesIsLoading
          ? t.cases.loadingMatters
          : tf(t.cases.aria.loadingSummary, { count: totalCount })}
      </p>

      <CaseModal ref={caseModalRef} onSuccess={refresh} />
      <CaseUpdateModal ref={caseUpdateModalRef} onSuccess={refresh} />
      <CaseDeleteModal ref={caseDeleteModalRef} onSuccess={refresh} />
      <CaseViewModal ref={caseViewModalRef} onSuccess={refresh} />
    </div>
  );
};

export default Cases;
