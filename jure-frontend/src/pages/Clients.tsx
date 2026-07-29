import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Search, Plus, Filter, Eye, Building, Loader2, Briefcase, Grid3x3, List
} from 'lucide-react';
import { apiGetClients } from '@/services/client/api';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import ClientDeleteModal, { ClientDeleteModalRef } from '@/components/client/ClientDeleteModal';
import ClientUpdateModal, { ClientUpdateModalRef } from '@/components/client/ClientUpdateModal';
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import userIcon from '@/assets/icons/userIcon.png';

// =========================
// Helpers & Mini Components
// =========================
const brand = '#64499D';

const formatDate = (d?: string | Date) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const initialsOf = (first?: string, last?: string) => {
  const i1 = (first?.[0] || '').toUpperCase();
  const i2 = (last?.[0] || '').toUpperCase();
  return (i1 + i2) || '';
};


const Pill: React.FC<{ className?: string }> = ({ className = '', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}>
    {children}
  </span>
);

const activeStyles = (isActive: boolean) =>
  isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800/60'
    : 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60';

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [clients, setClients] = useState<API.Client[]>([]);
  const [clientsIsLoading, setClientsIsLoading] = useState(false);

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

  // Derived list with simple search (client-side)
  const displayedClients = clients.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const hay = [
      c.first_name, c.last_name, c.email, c.phone, c.address, (c as any).company,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });

  // Actions
  const handleView = (client: API.Client) => {
    clientProfilePreviewRef.current?.show(client);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Client Management</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your client relationships and information
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => clientCreateModalRef.current?.show()}
              className="text-sm bg-[#64499d] hover:bg-[#563d89] text-white"
            >
              <Plus size={16} className="mr-2" />
              Add New Client
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search clients by name, email, phone, address…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}
              >
                <Grid3x3 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}
              >
                <List size={16} />
              </Button>
            </div>
            <Button variant="outline" className="text-sm border-slate-200 dark:border-slate-700">
              <Filter size={16} className="mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Clients Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
          {clientsIsLoading
            ? Array.from({ length: viewMode === 'grid' ? 6 : 8 }).map((_, i) => (
                viewMode === 'list' ? (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                      <div className="h-16 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg flex-shrink-0" />
                      <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded flex-shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse"
                  >
                    <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                    <div className="mt-5 h-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="mt-5 flex gap-2">
                      <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                      <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-9" />
                      <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-9" />
                      <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-9" />
                      <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded w-9" />
                    </div>
                  </div>
                )
              ))
            : displayedClients.length === 0
            ? (
              <div className="col-span-full text-center py-12">
                <div className="text-slate-500 dark:text-slate-400">
                  {/* <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-slate-300 dark:text-slate-600" /> */}
                  <p className="text-lg font-medium">No clients found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              </div>
            )
            : displayedClients.map((client) => {
                const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client';
                const initials = initialsOf(client.first_name, client.last_name);
                const casesCount = client.cases_count ?? (client.cases?.length || 0);

                if (viewMode === 'list') {
                  return (
                    <div
                      key={client.id}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => handleView(client)}
                    >
                      <div className="relative p-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#64499D] to-[#3b2b66] flex items-center justify-center text-white font-semibold text-lg shadow-md">
                              {initials || (
                                <img src={userIcon} alt="User" className="w-6 h-6 opacity-90" />
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                              client.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}></div>
                          </div>

                          {/* Client Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                                {fullName}
                              </h3>
                              <Pill className={activeStyles(!!client.is_active)}>
                                {client.is_active ? 'Active' : 'Inactive'}
                              </Pill>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              {(client as any).company && (
                                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                  <Building className="w-3.5 h-3.5" />
                                  <span className="truncate">{(client as any).company}</span>
                                </div>
                              )}
                              {client.email && (
                                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                  <div className="w-1 h-1 rounded-full bg-[#64499D] dark:bg-[#E9E0FF]"></div>
                                  <span className="truncate">{client.email}</span>
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                  <div className="w-1 h-1 rounded-full bg-[#64499D] dark:bg-[#E9E0FF]"></div>
                                  <span className="truncate">{client.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cases Count */}
                          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-br from-[#F1ECFF] to-[#E8F5F4] dark:from-[#2a2240] dark:to-[#1a2d2b] border border-[#64499D]/20 dark:border-slate-700 flex-shrink-0">
                            <div className="p-1.5 rounded-md bg-white/60 dark:bg-slate-800/60">
                              <Briefcase className="w-4 h-4 text-[#64499D] dark:text-[#E9E0FF]" />
                            </div>
                            <div>
                              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                                {casesCount}
                              </p>
                              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                {casesCount === 1 ? 'Case' : 'Cases'}
                              </p>
                            </div>
                          </div>

                          {/* View Button */}
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-[#64499D] hover:bg-[#5a3f8a] text-white shadow-sm hover:shadow-md transition-all duration-200 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(client);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Grid View
                return (
                  <div
                    key={client.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => handleView(client)}
                  >
                    {/* Gradient accent on hover */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(100,73,157,0.05) 0%, rgba(78,205,196,0.05) 100%)',
                      }}
                    />

                    {/* Card Content */}
                    <div className="relative p-6">
                      {/* Header with Avatar and Status */}
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#64499D] to-[#3b2b66] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {initials || (
                                <img src={userIcon} alt="User" className="w-8 h-8 opacity-90" />
                              )}
                            </div>
                            {/* Status Indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white dark:border-slate-900 ${
                              client.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate mb-1">
                              {fullName}
                            </h3>
                            {(client as any).company && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 truncate flex items-center gap-1.5">
                                <Building className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{(client as any).company}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <Pill className={activeStyles(!!client.is_active)}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </Pill>
                      </div>

                      {/* Cases Count - Prominent Display */}
                      <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-[#F1ECFF] to-[#E8F5F4] dark:from-[#2a2240] dark:to-[#1a2d2b] border border-[#64499D]/20 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                              <Briefcase className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {casesCount}
                              </p>
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {casesCount === 1 ? 'Case' : 'Cases'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Info - Minimal */}
                      <div className="space-y-2 mb-5">
                        {client.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-1 h-1 rounded-full bg-[#64499D] dark:bg-[#E9E0FF]"></div>
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="w-1 h-1 rounded-full bg-[#64499D] dark:bg-[#E9E0FF]"></div>
                            <span className="truncate">{client.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* View Button */}
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-[#64499D] hover:bg-[#5a3f8a] text-white shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(client);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Modals */}
      <ClientCreateModal ref={clientCreateModalRef} onSuccess={fetchClients} />
      <ClientUpdateModal ref={clientUpdateModalRef} onSuccess={fetchClients} />
      <ClientDeleteModal ref={clientDeleteModalRef} onSuccess={fetchClients} />
      <ClientProfilePreview 
        ref={clientProfilePreviewRef} 
        onUpdateSuccess={fetchClients}
        onDeleteSuccess={fetchClients}
      />
    </>
  );
};

export default Clients;
