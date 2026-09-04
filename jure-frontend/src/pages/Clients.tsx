import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Briefcase,
  LayoutGrid,
  List,
  ChevronRight,
  X,
  Users,
  UserRound,
  Mail,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { apiGetClients } from '@/services/client/api';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import ClientDeleteModal, { ClientDeleteModalRef } from '@/components/client/ClientDeleteModal';
import ClientUpdateModal, { ClientUpdateModalRef } from '@/components/client/ClientUpdateModal';
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import userIcon from '@/assets/icons/userIcon.png';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import { useAppTranslation } from '@/i18n';
import { useShortcutAction } from '@/context/ShortcutsContext';
import '@/styles/workspace-list.css';

type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter = 'all' | 'INDIVIDUAL' | 'COMPANY';
type CasesFilter = 'all' | 'with' | 'without';
type ViewMode = 'list' | 'grid';

const JURE_PURPLE = '#64499D';
const VIEW_STORAGE_KEY = 'jure.clients.viewMode';
const PAGE_SIZE_KEY = 'jure.clients.pageSize';

const readStoredView = (): ViewMode => {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
};

const readStoredPageSize = (): number => {
  try {
    const n = parseInt(localStorage.getItem(PAGE_SIZE_KEY) || '', 10);
    return n === 20 || n === 50 || n === 100 ? n : 20;
  } catch {
    return 20;
  }
};

const casesOf = (c: API.Client) => c.cases_count ?? (c.cases?.length || 0);

const isCompanyClient = (c: API.Client) => c.client_type === 'COMPANY';

const clientDisplayName = (c: API.Client, unnamed: string) => {
  if (isCompanyClient(c)) return (c.last_name || '').trim() || unnamed;
  return `${c.first_name || ''} ${c.last_name || ''}`.trim() || unnamed;
};

const clientContactPerson = (c: API.Client) =>
  isCompanyClient(c) ? (c.first_name || '').trim() : '';

const companyOf = (c: API.Client) =>
  isCompanyClient(c) ? (c.last_name || '').trim() : '';

const initialsOf = (c: API.Client) => {
  if (isCompanyClient(c)) {
    const name = (c.last_name || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const i1 = (c.first_name?.[0] || '').toUpperCase();
  const i2 = (c.last_name?.[0] || '').toUpperCase();
  return (i1 + i2) || '';
};

const sharePct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : null;

async function fetchAllClients(): Promise<API.Client[]> {
  const pageSize = 100;
  let page = 1;
  const acc: API.Client[] = [];
  while (true) {
    const res = await apiGetClients({ page, page_size: pageSize });
    acc.push(...(res.data.results || []));
    const last = res.data.last_page ?? 1;
    if (page >= last) break;
    page += 1;
  }
  return acc;
}

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useAppTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
        active
          ? 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400'
          : 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-400'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} />
      {active ? t.clients.status.active : t.clients.status.inactive}
    </span>
  );
};

const ClientAvatar: React.FC<{ client: API.Client; size?: 'sm' | 'md' }> = ({
  client,
  size = 'sm',
}) => {
  const initials = initialsOf(client);
  const dim = size === 'sm' ? 'h-9 w-9 text-[11px]' : 'h-11 w-11 text-[13px]';
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#64499D] font-semibold text-white ring-1 ring-[#64499D]/20',
          dim
        )}
      >
        {initials || <img src={userIcon} alt="" className="h-4 w-4 opacity-90" />}
      </div>
    </div>
  );
};

interface ClientRowProps {
  client: API.Client;
  onOpen: (c: API.Client) => void;
  onOpenCases: (c: API.Client) => void;
}

const ClientTableRow = memo(function ClientTableRow({ client, onOpen, onOpenCases }: ClientRowProps) {
  const { t, tf } = useAppTranslation();
  const fullName = clientDisplayName(client, t.clients.unnamed);
  const casesCount = casesOf(client);
  const company = companyOf(client);
  const typeLabel = isCompanyClient(client) ? t.clients.typeCompany : t.clients.typeIndividual;
  const contactPerson = clientContactPerson(client);
  const casesLabel = tf(
    casesCount === 1 ? t.clients.casesCountOne : t.clients.casesCountOther,
    { count: casesCount }
  );

  return (
    <tr
      tabIndex={0}
      className={cn(
        'group cursor-pointer border-b border-slate-100 transition-colors duration-100 dark:border-slate-800/60',
        'hover:bg-slate-50 dark:hover:bg-slate-900/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/30'
      )}
      onClick={() => onOpen(client)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(client);
        }
      }}
      aria-label={tf(t.clients.aria.openClient, { name: fullName })}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <ClientAvatar client={client} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{fullName}</p>
            <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">{typeLabel}</p>
          </div>
        </div>
      </td>
      <td className="max-w-[160px] truncate px-3 py-3 align-middle text-[13px] text-slate-600 dark:text-slate-400">
        {company || '—'}
        {contactPerson ? (
          <span className="mt-0.5 block truncate text-[12px] text-slate-400">
            {t.clients.modal.contactPerson} · {contactPerson}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate text-[13px] text-slate-600 dark:text-slate-400" title={client.email || undefined}>
            {client.email || '—'}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-slate-400" title={client.phone || undefined}>
            {client.phone || '—'}
          </p>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <button
          type="button"
          className="rounded-md px-1.5 py-0.5 text-[13px] font-semibold tabular-nums text-slate-800 hover:bg-[#F1ECFF] hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCases(client);
          }}
        >
          {casesLabel}
        </button>
      </td>
      <td className="px-3 py-3 align-middle">
        <StatusPill active={!!client.is_active} />
      </td>
      <td className="w-10 px-2 py-3 align-middle text-end">
        <ChevronRight
          className="ms-auto h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-slate-600 rtl:rotate-180"
          aria-hidden
        />
      </td>
    </tr>
  );
});

const ClientCard = memo(function ClientCard({ client, onOpen, onOpenCases }: ClientRowProps) {
  const { t, tf } = useAppTranslation();
  const fullName = clientDisplayName(client, t.clients.unnamed);
  const casesCount = casesOf(client);
  const typeLabel = isCompanyClient(client) ? t.clients.typeCompany : t.clients.typeIndividual;
  const contactPerson = clientContactPerson(client);
  const casesLabel = tf(
    casesCount === 1 ? t.clients.casesCountOne : t.clients.casesCountOther,
    { count: casesCount }
  );

  return (
    <article
      className={cn(
        'group flex min-w-0 cursor-pointer flex-col rounded-xl border border-slate-200/90 bg-white p-3',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors',
        'hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30'
      )}
      tabIndex={0}
      onClick={() => onOpen(client)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(client);
        }
      }}
      aria-label={tf(t.clients.aria.openClient, { name: fullName })}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <ClientAvatar client={client} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">
            {fullName}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">{typeLabel}</p>
          {contactPerson ? (
            <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
              {t.clients.modal.contactPerson} · {contactPerson}
            </p>
          ) : null}
        </div>
        <StatusPill active={!!client.is_active} />
      </div>
      <div className="mt-2.5 min-w-0 space-y-0.5 text-[12.5px] text-slate-600 dark:text-slate-400">
        {client.email ? (
          <p className="flex min-w-0 items-center gap-1.5" title={client.email}>
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{client.email}</span>
          </p>
        ) : null}
        {client.phone ? (
          <p className="flex min-w-0 items-center gap-1.5" title={client.phone}>
            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{client.phone}</span>
          </p>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button
          type="button"
          className="text-[12.5px] font-semibold tabular-nums text-slate-800 hover:text-[#64499D] dark:text-white"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCases(client);
          }}
        >
          {casesLabel}
        </button>
        <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-slate-400 group-hover:text-[#64499D]">
          {t.clients.viewClient}
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </span>
      </div>
    </article>
  );
});

const Clients: React.FC = () => {
  const { t, tf } = useAppTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [casesFilter, setCasesFilter] = useState<CasesFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredView);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(readStoredPageSize);
  const [clients, setClients] = useState<API.Client[]>([]);
  const [clientsIsLoading, setClientsIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const clientCreateModalRef = useRef<ClientCreateModalRef>(null);
  const clientUpdateModalRef = useRef<ClientUpdateModalRef>(null);
  const clientDeleteModalRef = useRef<ClientDeleteModalRef>(null);
  const clientProfilePreviewRef = useRef<ClientProfilePreviewRef>(null);

  const fetchClients = useCallback(async () => {
    setClientsIsLoading(true);
    setLoadError(false);
    try {
      setClients(await fetchAllClients());
    } catch {
      setLoadError(true);
      setClients([]);
    } finally {
      setClientsIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(pageSize));
    } catch {
      /* ignore */
    }
  }, [pageSize]);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.is_active).length;
    const inactive = total - active;
    const withCases = clients.filter((c) => casesOf(c) > 0).length;
    return { total, active, inactive, withCases };
  }, [clients]);

  const displayedClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;
      if (typeFilter !== 'all' && (c.client_type || 'INDIVIDUAL') !== typeFilter) return false;
      const n = casesOf(c);
      if (casesFilter === 'with' && n <= 0) return false;
      if (casesFilter === 'without' && n > 0) return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      const hay = [
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.client_type,
        companyOf(c),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clients, debouncedSearch, statusFilter, typeFilter, casesFilter]);

  const totalFiltered = displayedClients.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedClients.slice(start, start + pageSize);
  }, [displayedClients, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, casesFilter, pageSize]);

  const hasActiveFilters =
    !!debouncedSearch.trim() ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    casesFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCasesFilter('all');
  };

  const handleView = useCallback((client: API.Client) => {
    clientProfilePreviewRef.current?.show(client);
  }, []);

  const handleOpenCases = useCallback(
    (client: API.Client) => {
      navigate(`/dashboard/cases?tab=all&clientId=${client.id}`);
    },
    [navigate]
  );

  const openCreate = useCallback(() => {
    clientCreateModalRef.current?.show();
  }, []);

  useShortcutAction('create-client', openCreate);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if ((e.key === 'n' || e.key === 'N') && !inField && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openCreate]);

  const activePct = sharePct(stats.active, stats.total);
  const withCasesPct = sharePct(stats.withCases, stats.total);

  const kpiItems = [
    {
      key: 'total',
      label: t.clients.stats.total,
      value: stats.total,
      hint: t.clients.stats.totalHint,
      icon: Users,
      accent: 'text-slate-500',
    },
    {
      key: 'active',
      label: t.clients.stats.active,
      value: stats.active,
      hint:
        activePct != null
          ? tf(t.clients.stats.shareOfBase, { pct: activePct })
          : t.clients.stats.totalHint,
      icon: UserRound,
      accent: 'text-emerald-600',
    },
    {
      key: 'inactive',
      label: t.clients.stats.inactive,
      value: stats.inactive,
      hint:
        sharePct(stats.inactive, stats.total) != null
          ? tf(t.clients.stats.shareOfBase, { pct: sharePct(stats.inactive, stats.total)! })
          : t.clients.stats.totalHint,
      icon: UserRound,
      accent: 'text-slate-400',
    },
    {
      key: 'withCases',
      label: t.clients.stats.withCases,
      value: stats.withCases,
      hint:
        withCasesPct != null
          ? tf(t.clients.stats.shareOfClients, { pct: withCasesPct })
          : t.clients.stats.totalHint,
      icon: Briefcase,
      accent: 'text-[#64499D]',
    },
  ] as const;

  const filterChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (statusFilter !== 'all') {
    filterChips.push({
      key: 'status',
      label: statusFilter === 'active' ? t.clients.filters.active : t.clients.filters.inactive,
      onClear: () => setStatusFilter('all'),
    });
  }
  if (typeFilter !== 'all') {
    filterChips.push({
      key: 'type',
      label: typeFilter === 'COMPANY' ? t.clients.filters.company : t.clients.filters.individual,
      onClear: () => setTypeFilter('all'),
    });
  }
  if (casesFilter !== 'all') {
    filterChips.push({
      key: 'cases',
      label: casesFilter === 'with' ? t.clients.filters.withCases : t.clients.filters.withoutCases,
      onClear: () => setCasesFilter('all'),
    });
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80">
        <Users className="h-6 w-6 text-slate-500 dark:text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {hasActiveFilters ? t.clients.empty.filteredTitle : t.clients.empty.title}
      </p>
      <p className="mt-1 max-w-sm text-center text-[13px] text-slate-500 dark:text-slate-400">
        {hasActiveFilters ? t.clients.empty.filteredHint : t.clients.empty.emptyHint}
      </p>
      {hasActiveFilters ? (
        <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={resetFilters}>
          {t.clients.empty.resetFilters}
        </Button>
      ) : (
        <Button
          size="sm"
          className="mt-4 h-8 text-[12px] text-white hover:opacity-90"
          style={{ backgroundColor: JURE_PURPLE }}
          onClick={openCreate}
        >
          <Plus className="me-1.5 h-3.5 w-3.5" />
          {t.clients.empty.addClient}
        </Button>
      )}
    </div>
  );

  const errorState = (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
        <AlertCircle className="h-6 w-6 text-rose-500" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.clients.loadError.title}</p>
      <p className="mt-1 max-w-sm text-center text-[13px] text-slate-500 dark:text-slate-400">
        {t.clients.loadError.description}
      </p>
      <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={() => void fetchClients()}>
        {t.clients.loadError.retry}
      </Button>
    </div>
  );

  const rangeStart = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalFiltered);

  const renderList = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]" aria-label={t.clients.aria.list}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
              {[
                t.clients.columns.client,
                t.clients.columns.company,
                t.clients.columns.contact,
                t.clients.columns.cases,
                t.clients.columns.status,
                '',
              ].map((h, i) => (
                <th
                  key={h || 'a'}
                  className={cn(
                    'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400',
                    i === 0 ? 'px-4 text-start' : 'text-start',
                    i === 5 && 'w-10 px-2'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientsIsLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="h-16 px-4" colSpan={6}>
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              : loadError
                ? (
                  <tr>
                    <td colSpan={6}>{errorState}</td>
                  </tr>
                )
                : pagedClients.length === 0
                  ? (
                    <tr>
                      <td colSpan={6}>{emptyState}</td>
                    </tr>
                  )
                  : pagedClients.map((c) => (
                      <ClientTableRow
                        key={c.id}
                        client={c}
                        onOpen={handleView}
                        onOpenCases={handleOpenCases}
                      />
                    ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {clientsIsLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[148px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            />
          ))
        : loadError
          ? <div className="col-span-full">{errorState}</div>
          : pagedClients.length === 0
            ? <div className="col-span-full">{emptyState}</div>
            : pagedClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onOpen={handleView}
                  onOpenCases={handleOpenCases}
                />
              ))}
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white md:text-[26px]">
                {t.sidebar.clients}
              </h1>
              <p className="mt-1 max-w-xl text-[14px] text-slate-500 dark:text-slate-400">
                {t.clients.pageSubtitle}
              </p>
            </div>
            <Button
              size="sm"
              className="hidden h-9 shrink-0 px-3 text-[13px] font-semibold text-white hover:opacity-90 md:inline-flex"
              style={{ backgroundColor: JURE_PURPLE }}
              onClick={openCreate}
            >
              <Plus className="me-1.5 h-4 w-4" strokeWidth={2.5} />
              {t.clients.addClient}
            </Button>
          </header>

          <section className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label={t.clients.aria.stats}>
            {clientsIsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[96px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                  />
                ))
              : kpiItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="min-w-0 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                          {item.label}
                        </p>
                        <Icon className={cn('h-4 w-4 shrink-0', item.accent)} aria-hidden />
                      </div>
                      <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-slate-900 dark:text-white">
                        {loadError ? '—' : item.value}
                      </p>
                      <p className="mt-1.5 truncate text-[12px] text-slate-400">{item.hint}</p>
                    </div>
                  );
                })}
          </section>

          <div className="ws-toolbar-sticky sticky top-0 z-30 mt-5 rounded-xl border border-slate-200/80 bg-background/90 px-3 py-2 backdrop-blur-sm dark:border-slate-800 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <CompactSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.clients.searchPlaceholderWide}
                ariaLabel={t.clients.searchAria}
                clearAriaLabel={t.clients.clearSearch}
                inputRef={searchInputRef}
              />

              <MobileFilterSheet
                title={t.clients.filters.applied}
                count={(statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (casesFilter !== 'all' ? 1 : 0)}
                footer={
                  statusFilter !== 'all' || typeFilter !== 'all' || casesFilter !== 'all' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full text-[12px]"
                      onClick={() => {
                        setStatusFilter('all');
                        setTypeFilter('all');
                        setCasesFilter('all');
                      }}
                    >
                      {t.clients.filters.clearAll}
                    </Button>
                  ) : null
                }
              >
                <FilterField label={t.clients.filters.status}>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-9 w-full rounded-md text-[12px]" aria-label={t.clients.filters.status}>
                    <SelectValue placeholder={t.clients.filters.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.clients.filters.allStatuses}</SelectItem>
                    <SelectItem value="active">{t.clients.filters.active}</SelectItem>
                    <SelectItem value="inactive">{t.clients.filters.inactive}</SelectItem>
                  </SelectContent>
                </Select>
                </FilterField>
                <FilterField label={t.clients.filters.type}>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger className="h-9 w-full rounded-md text-[12px]" aria-label={t.clients.filters.type}>
                    <SelectValue placeholder={t.clients.filters.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.clients.filters.allTypes}</SelectItem>
                    <SelectItem value="INDIVIDUAL">{t.clients.filters.individual}</SelectItem>
                    <SelectItem value="COMPANY">{t.clients.filters.company}</SelectItem>
                  </SelectContent>
                </Select>
                </FilterField>
                <FilterField label={t.clients.filters.cases}>
                <Select value={casesFilter} onValueChange={(v) => setCasesFilter(v as CasesFilter)}>
                  <SelectTrigger className="h-9 w-full rounded-md text-[12px]" aria-label={t.clients.filters.cases}>
                    <SelectValue placeholder={t.clients.filters.cases} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.clients.filters.allCases}</SelectItem>
                    <SelectItem value="with">{t.clients.filters.withCases}</SelectItem>
                    <SelectItem value="without">{t.clients.filters.withoutCases}</SelectItem>
                  </SelectContent>
                </Select>
                </FilterField>
              </MobileFilterSheet>

              <div
                className="ms-auto hidden items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50 md:inline-flex"
                role="group"
                aria-label={t.clients.aria.viewMode}
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
                    aria-label={mode === 'list' ? t.clients.aria.listView : t.clients.aria.gridView}
                  >
                    {mode === 'list' ? (
                      <List className="h-3.5 w-3.5" />
                    ) : (
                      <LayoutGrid className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden lg:inline">
                      {mode === 'list' ? t.clients.viewList : t.clients.viewGrid}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filterChips.length > 0 ? (
              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {t.clients.filters.applied}
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
                  {t.clients.filters.clearAll}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 md:hidden">
            {clientsIsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[148px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800"
                  />
                ))}
              </div>
            ) : loadError ? (
              errorState
            ) : pagedClients.length === 0 ? (
              emptyState
            ) : (
              <div className="flex flex-col gap-2.5 pb-16">
                {pagedClients.map((c) => (
                  <ClientCard key={c.id} client={c} onOpen={handleView} onOpenCases={handleOpenCases} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 hidden md:block">
            {viewMode === 'list' ? renderList() : renderGrid()}
          </div>

          {!clientsIsLoading && !loadError && totalFiltered > 0 ? (
            <div className="mt-3 flex min-w-0 flex-col gap-2 border-t border-slate-200/80 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] tabular-nums text-slate-500">
                {tf(t.clients.rangeSummary, {
                  start: rangeStart,
                  end: rangeEnd,
                  total: totalFiltered,
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-slate-400">{t.clients.rowsPerPage}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(parseInt(v, 10))}
                >
                  <SelectTrigger className="h-8 w-[76px] text-[12px]" aria-label={t.clients.rowsPerPage}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[12px]"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </Button>
                    <span className="min-w-[3rem] text-center text-[12px] tabular-nums text-slate-600">
                      {currentPage}/{totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[12px]"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ›
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        className="fixed z-40 h-12 w-12 rounded-full text-white shadow-lg md:hidden bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4"
        style={{ backgroundColor: JURE_PURPLE }}
        onClick={openCreate}
        aria-label={t.clients.aria.addNewClient}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </Button>

      <p className="sr-only" aria-live="polite">
        {clientsIsLoading
          ? t.clients.loadingClients
          : loadError
            ? t.clients.loadError.title
            : tf(t.clients.aria.loadingSummary, { count: displayedClients.length })}
      </p>

      <ClientCreateModal ref={clientCreateModalRef} onSuccess={fetchClients} />
      <ClientUpdateModal ref={clientUpdateModalRef} onSuccess={fetchClients} />
      <ClientDeleteModal ref={clientDeleteModalRef} onSuccess={fetchClients} />
      <ClientProfilePreview
        ref={clientProfilePreviewRef}
        onUpdateSuccess={fetchClients}
        onDeleteSuccess={fetchClients}
      />
    </div>
  );
};

export default Clients;
