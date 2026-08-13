import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
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
  Search,
  Plus,
  Eye,
  Building,
  Briefcase,
  Grid3x3,
  List,
  ChevronRight,
  ChevronDown,
  X,
  Users,
} from 'lucide-react';
import { apiGetClients } from '@/services/client/api';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import ClientDeleteModal, { ClientDeleteModalRef } from '@/components/client/ClientDeleteModal';
import ClientUpdateModal, { ClientUpdateModalRef } from '@/components/client/ClientUpdateModal';
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import userIcon from '@/assets/icons/userIcon.png';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import '@/styles/workspace-list.css';

type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'list' | 'grid';

const initialsOf = (first?: string, last?: string) => {
  const i1 = (first?.[0] || '').toUpperCase();
  const i2 = (last?.[0] || '').toUpperCase();
  return (i1 + i2) || '';
};

const casesOf = (c: API.Client) => c.cases_count ?? (c.cases?.length || 0);

const companyOf = (c: API.Client) =>
  (c as API.Client & { company?: string }).company || '';

const KPI_ACCENTS: Record<string, string> = {
  total: 'border-s-slate-400',
  active: 'border-s-emerald-500',
  inactive: 'border-s-slate-300 dark:border-s-slate-600',
  withCases: 'border-s-indigo-500',
};

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => {
  const { t } = useAppTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
        active
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30'
          : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30'
      )}
    >
      {active ? t.clients.status.active : t.clients.status.inactive}
    </span>
  );
};

const ClientAvatar: React.FC<{ client: API.Client; size?: 'sm' | 'md' }> = ({
  client,
  size = 'sm',
}) => {
  const initials = initialsOf(client.first_name, client.last_name);
  const dim = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-sm';
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-[#64499D] to-[#3b2b66] flex items-center justify-center text-white font-semibold',
          dim
        )}
      >
        {initials || <img src={userIcon} alt="" className="w-4 h-4 opacity-90" />}
      </div>
      <span
        className={cn(
          'absolute -bottom-0.5 -end-0.5 rounded-full border-2 border-white dark:border-slate-950',
          size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
          client.is_active ? 'bg-emerald-500' : 'bg-slate-400'
        )}
        aria-hidden
      />
    </div>
  );
};

interface ClientRowProps {
  client: API.Client;
  rowIdx: number;
  onOpen: (c: API.Client) => void;
}

const ClientTableRow = memo(function ClientTableRow({ client, rowIdx, onOpen }: ClientRowProps) {
  const { t, tf } = useAppTranslation();
  const fullName =
    `${client.first_name || ''} ${client.last_name || ''}`.trim() || t.clients.unnamed;
  const casesCount = casesOf(client);
  const company = companyOf(client);

  return (
    <tr
      tabIndex={0}
      className={cn(
        'group border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors duration-100',
        rowIdx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-slate-100 dark:hover:bg-slate-800/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'
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
      <td className="px-3 py-2 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          <ClientAvatar client={client} />
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
            {fullName}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 align-middle text-[12px] text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
        {company || '—'}
      </td>
      <td className="px-3 py-2 align-middle text-[12px] text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
        {client.email || '—'}
      </td>
      <td className="px-3 py-2 align-middle text-[12px] text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
        {client.phone || '—'}
      </td>
      <td className="px-3 py-2 align-middle text-end tabular-nums text-[13px] font-semibold text-slate-900 dark:text-white">
        {casesCount}
      </td>
      <td className="px-3 py-2 align-middle">
        <StatusPill active={!!client.is_active} />
      </td>
      <td className="px-1.5 py-2 align-middle text-end w-8">
        <ChevronRight
          className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 ms-auto rtl:rotate-180"
          aria-hidden
        />
      </td>
    </tr>
  );
});

const ClientMobileCard = memo(function ClientMobileCard({
  client,
  onOpen,
}: {
  client: API.Client;
  onOpen: (c: API.Client) => void;
}) {
  const { t, tf } = useAppTranslation();
  const [expanded, setExpanded] = useState(false);
  const fullName =
    `${client.first_name || ''} ${client.last_name || ''}`.trim() || t.clients.unnamed;
  const casesCount = casesOf(client);
  const company = companyOf(client);
  const casesLabel = tf(
    casesCount === 1 ? t.clients.casesCountOne : t.clients.casesCountOther,
    { count: casesCount }
  );

  return (
    <article className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        className="w-full text-start px-3 py-2.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset rounded-lg"
        onClick={() => onOpen(client)}
        aria-label={tf(t.clients.aria.openClient, { name: fullName })}
      >
        <div className="flex items-start gap-2.5">
          <ClientAvatar client={client} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {fullName}
              </p>
              <StatusPill active={!!client.is_active} />
            </div>
            {company ? (
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <Building className="w-3 h-3 shrink-0" aria-hidden />
                {company}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Briefcase className="w-3 h-3" aria-hidden />
                {casesLabel}
              </span>
              {client.email ? <span className="truncate max-w-[55%]">{client.email}</span> : null}
            </div>
          </div>
        </div>
      </button>
      <div className="flex items-center border-t border-slate-100 dark:border-slate-800/80 px-1">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 min-h-[40px] text-[12px] font-medium text-slate-500 dark:text-slate-400"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
        >
          {expanded ? t.clients.less : t.clients.more}
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
          <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5 text-[12px]">
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">{t.clients.phone}</dt>
            <dd className="text-slate-700 dark:text-slate-300">{client.phone || '—'}</dd>
            <dt className="text-slate-400 uppercase tracking-wider text-[10px] font-medium">{t.clients.email}</dt>
            <dd className="text-slate-700 dark:text-slate-300 truncate">{client.email || '—'}</dd>
          </dl>
          <Button
            type="button"
            size="sm"
            className="h-9 w-full text-[12px]"
            onClick={() => onOpen(client)}
          >
            <Eye className="w-3.5 h-3.5 me-1.5" aria-hidden />
            {t.clients.view}
          </Button>
        </div>
      )}
    </article>
  );
});

const Clients: React.FC = () => {
  const { t, tf } = useAppTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [clients, setClients] = useState<API.Client[]>([]);
  const [clientsIsLoading, setClientsIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 250);

  const clientCreateModalRef = useRef<ClientCreateModalRef>(null);
  const clientUpdateModalRef = useRef<ClientUpdateModalRef>(null);
  const clientDeleteModalRef = useRef<ClientDeleteModalRef>(null);
  const clientProfilePreviewRef = useRef<ClientProfilePreviewRef>(null);

  const fetchClients = async () => {
    setClientsIsLoading(true);
    try {
      const res = await apiGetClients();
      setClients(res.data.results);
    } finally {
      setClientsIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

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
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      const hay = [c.first_name, c.last_name, c.email, c.phone, c.address, companyOf(c)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clients, debouncedSearch, statusFilter]);

  const hasActiveFilters = !!debouncedSearch.trim() || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const handleView = useCallback((client: API.Client) => {
    clientProfilePreviewRef.current?.show(client);
  }, []);

  const openCreate = useCallback(() => {
    clientCreateModalRef.current?.show();
  }, []);

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

  const kpiItems = [
    { key: 'total', label: t.clients.stats.total, value: stats.total },
    { key: 'active', label: t.clients.stats.active, value: stats.active },
    { key: 'inactive', label: t.clients.stats.inactive, value: stats.inactive },
    { key: 'withCases', label: t.clients.stats.withCases, value: stats.withCases },
  ] as const;

  const columnHeaders = [
    t.clients.columns.name,
    t.clients.columns.company,
    t.clients.columns.email,
    t.clients.columns.phone,
    t.clients.columns.cases,
    t.clients.columns.status,
    '',
  ];

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-3">
        <Users className="w-6 h-6 text-slate-500 dark:text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.clients.empty.title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center max-w-sm">
        {hasActiveFilters ? t.clients.empty.filteredHint : t.clients.empty.emptyHint}
      </p>
      {hasActiveFilters ? (
        <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={resetFilters}>
          {t.clients.empty.resetFilters}
        </Button>
      ) : (
        <Button size="sm" className="mt-4 h-8 text-[12px]" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 me-1.5" />
          {t.clients.empty.addClient}
        </Button>
      )}
    </div>
  );

  const renderList = () => (
    <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]" aria-label={t.clients.aria.list}>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
              {columnHeaders.map((h, i) => (
                <th
                  key={h || 'a'}
                  className={cn(
                    'py-2 px-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-slate-500 dark:text-slate-400',
                    i === 4 ? 'text-end' : 'text-start',
                    i === 6 && 'w-8 px-1'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientsIsLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="h-10 px-3" colSpan={7}>
                      <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                  </tr>
                ))
              : displayedClients.length === 0
                ? (
                  <tr>
                    <td colSpan={7}>{emptyState}</td>
                  </tr>
                )
                : displayedClients.map((c, i) => (
                    <ClientTableRow key={c.id} client={c} rowIdx={i} onOpen={handleView} />
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {clientsIsLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse bg-white dark:bg-slate-950"
            />
          ))
        : displayedClients.length === 0
          ? <div className="col-span-full">{emptyState}</div>
          : displayedClients.map((client) => {
              const fullName =
                `${client.first_name || ''} ${client.last_name || ''}`.trim() || t.clients.unnamed;
              const casesCount = casesOf(client);
              const company = companyOf(client);
              const casesLabel = tf(
                casesCount === 1 ? t.clients.casesCountOne : t.clients.casesCountOther,
                { count: casesCount }
              );
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleView(client)}
                  className="text-start rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex items-start gap-2.5">
                    <ClientAvatar client={client} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                          {fullName}
                        </p>
                        <StatusPill active={!!client.is_active} />
                      </div>
                      {company ? (
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 truncate">{company}</p>
                      ) : null}
                      <p className="mt-2 text-[12px] tabular-nums text-slate-600 dark:text-slate-400">
                        {casesLabel}
                        {client.email ? ` · ${client.email}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
    </div>
  );

  const renderMobile = () => (
    <div className="flex flex-col gap-2 pb-16" role="list" aria-label={t.clients.aria.list}>
      {clientsIsLoading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[96px] rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse bg-white dark:bg-slate-950"
            />
          ))
        : displayedClients.length === 0
          ? emptyState
          : displayedClients.map((c) => (
              <ClientMobileCard key={c.id} client={c} onOpen={handleView} />
            ))}
    </div>
  );

  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* KPI strip — scrolls away */}
        <div
          className="ws-kpi-strip flex gap-2 overflow-x-auto snap-x snap-mandatory py-2"
          role="region"
          aria-label={t.clients.aria.stats}
        >
          {kpiItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                'snap-start shrink-0 flex items-center gap-2 rounded-md border border-slate-200/90 dark:border-slate-800',
                'bg-white dark:bg-slate-950 border-s-[3px] px-2.5 py-1.5 min-w-[5.75rem] sm:flex-1 sm:min-w-0',
                KPI_ACCENTS[item.key]
              )}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none">
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white leading-none ws-stat-value">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky toolbar */}
        <div className="ws-toolbar-sticky sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 border-b border-slate-200/90 dark:border-slate-800 pt-1 pb-0">
          <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 px-2 py-2 sm:px-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="relative flex-1 min-w-[min(100%,12rem)] sm:min-w-[14rem] sm:flex-[1.4]">
                <Search
                  className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                  aria-hidden
                />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t.clients.searchPlaceholder}
                  className={cn(
                    'h-9 ps-8 pe-8 text-[13px] rounded-md',
                    searchTerm.trim() && 'ring-1 ring-primary/25 border-primary/30'
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchTerm('');
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  aria-label={t.clients.searchAria}
                />
                {searchTerm.trim() !== '' && (
                  <button
                    type="button"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[28px] min-w-[28px] flex items-center justify-center"
                    onClick={() => setSearchTerm('')}
                    aria-label={t.clients.clearSearch}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger
                  className={cn(
                    'h-9 w-[120px] text-[12px] rounded-md',
                    statusFilter !== 'all' && 'ring-1 ring-primary/30 border-primary/40'
                  )}
                >
                  <SelectValue placeholder={t.clients.filters.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.clients.filters.allStatuses}</SelectItem>
                  <SelectItem value="active">{t.clients.filters.active}</SelectItem>
                  <SelectItem value="inactive">{t.clients.filters.inactive}</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-[12px] px-2"
                  onClick={resetFilters}
                >
                  {t.clients.reset}
                </Button>
              )}

              <div
                className="hidden md:flex items-center gap-0.5 ms-auto p-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/50"
                role="group"
                aria-label={t.clients.aria.viewMode}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 rounded-md',
                    viewMode === 'list' &&
                      'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
                  )}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label={t.clients.aria.listView}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 rounded-md',
                    viewMode === 'grid' &&
                      'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700'
                  )}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label={t.clients.aria.gridView}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </div>

              <Button
                size="sm"
                className="hidden md:inline-flex h-9 px-3 text-[12px] font-semibold shrink-0 rounded-md ms-auto lg:ms-0"
                onClick={openCreate}
              >
                <Plus className="w-4 h-4 me-1.5" strokeWidth={2.5} />
                {t.clients.addNewClient}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {clientsIsLoading
                ? t.common.loading
                : tf(t.clients.countSummary, {
                    shown: displayedClients.length,
                    total: clients.length,
                  })}
            </p>
          </div>
        </div>

        <div className="py-3 md:py-4">
          <div className="md:hidden">{renderMobile()}</div>
          <div className="hidden md:block">
            {viewMode === 'list' ? renderList() : renderGrid()}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        className="md:hidden fixed z-40 bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4 h-12 w-12 rounded-full shadow-lg shadow-primary/30"
        onClick={openCreate}
        aria-label={t.clients.aria.addNewClient}
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </Button>

      <p className="sr-only" aria-live="polite">
        {clientsIsLoading
          ? t.clients.loadingClients
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
