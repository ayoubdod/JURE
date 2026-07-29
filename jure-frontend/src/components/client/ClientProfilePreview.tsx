import React, { useImperativeHandle, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Phone, Mail, MapPin, Calendar, Briefcase, Building, X, Edit, Trash2, Loader2
} from 'lucide-react';
import ClientUpdateModal, { ClientUpdateModalRef } from './ClientUpdateModal';
import ClientDeleteModal, { ClientDeleteModalRef } from './ClientDeleteModal';
import CaseViewModal, { CaseViewModalRef } from '@/components/case/CaseViewModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import { apiGetCases } from '@/services/case/api';
import { devError } from '@/utils/devLog';

export interface ClientProfilePreviewRef {
  show: (client: API.Client) => void;
  hide: () => void;
}

interface ClientProfilePreviewProps {
  onUpdateSuccess?: (client: API.Client) => void;
  onDeleteSuccess?: (client: API.Client) => void;
}

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
  return (i1 + i2) || '•';
};

const ClientProfilePreview = React.forwardRef<ClientProfilePreviewRef, ClientProfilePreviewProps>(
  ({ onUpdateSuccess, onDeleteSuccess }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [client, setClient] = useState<API.Client | null>(null);
    const [relatedCases, setRelatedCases] = useState<API.Case[]>([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const updateModalRef = React.useRef<ClientUpdateModalRef>(null);
    const deleteModalRef = React.useRef<ClientDeleteModalRef>(null);
    const caseViewModalRef = React.useRef<CaseViewModalRef>(null);
    const caseUpdateModalRef = React.useRef<CaseUpdateModalRef>(null);
    const caseDeleteModalRef = React.useRef<CaseDeleteModalRef>(null);

    const show = (clientData: API.Client) => {
      setClient(clientData);
      setIsOpen(true);
    };

    const hide = () => {
      setIsOpen(false);
      setClient(null);
    };

    useImperativeHandle(ref, () => ({ show, hide }));

    // Fetch related cases when client is set
    useEffect(() => {
      if (client?.id) {
        setCasesLoading(true);
        // Fetch all cases and filter client-side (backend might not support client filter)
        const pageSize = 100;
        let page = 1;
        let lastPage = 1;
        const acc: API.Case[] = [];
        
        const fetchAllCases = async () => {
          try {
            while (true) {
              const res = await apiGetCases({ page, page_size: pageSize });
              const data = res.data;
              acc.push(...(data.results || []));
              lastPage = data.last_page ?? 1;
              if (page >= lastPage) break;
              page += 1;
            }
            
            // Filter cases by client ID
            const filtered = acc.filter((caseItem: API.Case) => {
              // Check if case has a client and it matches our client ID
              if (caseItem.client) {
                // client can be API.User object with id, or just an id
                const clientId = typeof caseItem.client === 'object' && caseItem.client !== null
                  ? (caseItem.client as any).id
                  : caseItem.client;
                return clientId === client.id;
              }
              return false;
            });
            
            // Sort by created date (newest first)
            const sorted = filtered.sort((a, b) => {
              const dateA = new Date(a.created || 0).getTime();
              const dateB = new Date(b.created || 0).getTime();
              return dateB - dateA;
            });
            
            setRelatedCases(sorted);
          } catch (err) {
            devError('Error fetching related cases:', err);
            setRelatedCases([]);
          } finally {
            setCasesLoading(false);
          }
        };
        
        fetchAllCases();
      } else {
        setRelatedCases([]);
      }
    }, [client?.id]);

    if (!client) return null;

    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client';
    const initials = initialsOf(client.first_name, client.last_name);
    const company = (client as any).company;

    // Refresh related cases after case operations
    const refreshRelatedCases = async () => {
      if (!client?.id) return;
      
      setCasesLoading(true);
      try {
        const pageSize = 100;
        let page = 1;
        let lastPage = 1;
        const acc: API.Case[] = [];
        
        while (true) {
          const res = await apiGetCases({ page, page_size: pageSize });
          const data = res.data;
          acc.push(...(data.results || []));
          lastPage = data.last_page ?? 1;
          if (page >= lastPage) break;
          page += 1;
        }
        
        // Filter cases by client ID
        const filtered = acc.filter((caseItem: API.Case) => {
          if (caseItem.client) {
            const clientId = typeof caseItem.client === 'object' && caseItem.client !== null
              ? (caseItem.client as any).id
              : caseItem.client;
            return clientId === client.id;
          }
          return false;
        });
        
        // Sort by created date (newest first)
        const sorted = filtered.sort((a, b) => {
          const dateA = new Date(a.created || 0).getTime();
          const dateB = new Date(b.created || 0).getTime();
          return dateB - dateA;
        });
        
        setRelatedCases(sorted);
      } catch (err) {
        devError('Error refreshing related cases:', err);
      } finally {
        setCasesLoading(false);
      }
    };

    const handleEdit = () => {
      updateModalRef.current?.show(client);
      // Don't hide the preview, let user close it manually if needed
    };

    const handleDelete = () => {
      deleteModalRef.current?.show(client);
      // Don't hide the preview, let user close it manually if needed
    };

    const handleCaseClick = (caseItem: API.Case) => {
      caseViewModalRef.current?.show(caseItem);
    };

    const handleCaseUpdate = (updatedCase: API.Case) => {
      refreshRelatedCases();
      // Optionally refresh the case in the view modal if it's open
      if (caseViewModalRef.current) {
        caseViewModalRef.current?.show(updatedCase);
      }
    };

    const handleCaseDelete = () => {
      refreshRelatedCases();
      // Close the case view modal after deletion
      caseViewModalRef.current?.hide();
    };

    const handleCall = () => {
      if (client.phone) window.location.href = `tel:${client.phone}`;
    };

    const handleEmail = () => {
      if (client.email) window.location.href = `mailto:${client.email}`;
    };

    // Extract unique case categories from related cases
    const categories = Array.from(
      new Set(relatedCases.map((c: API.Case) => c?.category).filter(Boolean))
    ) as string[];

    return (
      <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl [&>button]:hidden">
            <div className="relative">
              {/* HORIZONTAL COVER BANNER */}
              <div className="relative h-48 bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#64499D] overflow-hidden">
                {/* Decorative Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                  }}></div>
                </div>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
                
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
                  onClick={hide}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* PROFILE CONTENT */}
              <div className="relative px-8 pb-8">
                {/* Avatar Centered on Cover */}
                <div className="flex justify-center -mt-20 mb-6">
                  <div className="relative">
                    <div className="h-40 w-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-white dark:bg-slate-900 flex items-center justify-center">
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#64499D] to-[#3b2b66] text-white text-4xl font-bold">
                        {initials}
                      </div>
                    </div>
                    {/* Status Indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-4 border-white dark:border-slate-900 ${
                      client.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}></div>
                  </div>
                </div>

                {/* Name, Company, and Status */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {fullName}
                    </h1>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                      client.is_active
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800/60'
                        : 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:ring-slate-800/60'
                    }`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {company && (
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-center gap-2">
                      <Building className="w-5 h-5" />
                      {company}
                    </p>
                  )}
                  {client.address && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {client.address}
                    </p>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <Button 
                      className="bg-[#64499D] hover:bg-[#5a3f8a] text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                      onClick={handleCall}
                    >
                      <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6"
                      onClick={handleEmail}
                    >
                      <Mail className="w-4 h-4 mr-2" /> Email
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6"
                      onClick={handleEdit}
                    >
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-red-300 dark:border-red-700 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-6"
                      onClick={handleDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>

                {/* Information Icons Row - Compact */}
                <div className="flex items-center justify-center gap-6 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-[#F1ECFF] dark:bg-[#2a2240]">
                      <Mail className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-[150px] truncate">{client.email || '—'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-[#F1ECFF] dark:bg-[#2a2240]">
                      <Phone className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{client.phone || '—'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-[#F1ECFF] dark:bg-[#2a2240]">
                      <Calendar className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{formatDate(client.date_joined as any)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-xl bg-[#F1ECFF] dark:bg-[#2a2240]">
                      <Briefcase className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{relatedCases.length} Cases</span>
                  </div>
                </div>

                {/* Cases Section */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-[#F1ECFF] dark:bg-[#2a2240]">
                      <Briefcase className="w-5 h-5 text-[#64499D] dark:text-[#E9E0FF]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Related Cases</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {casesLoading ? 'Loading...' : `${relatedCases.length} case${relatedCases.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>

                    {/* Case Categories */}
                    {categories.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Case Categories</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F1ECFF] dark:bg-[#2a2240] text-[#64499D] dark:text-[#E9E0FF] border border-[#64499D]/20 dark:border-[#64499D]/40"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cases List */}
                    {casesLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-8 text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-[#64499D]" />
                        <p className="text-xs font-medium">Loading cases…</p>
                      </div>
                    ) : relatedCases.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="inline-flex p-3 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
                          <Briefcase className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No cases found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This client has no related cases yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {relatedCases.map((caseItem: API.Case) => (
                          <div
                            key={caseItem.id}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 hover:border-[#64499D]/40 dark:hover:border-[#64499D]/60 hover:shadow-md transition-all duration-200 cursor-pointer"
                            onClick={() => handleCaseClick(caseItem)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-1.5 rounded-lg bg-[#F1ECFF] dark:bg-[#2a2240] flex-shrink-0">
                                  <Briefcase className="w-3.5 h-3.5 text-[#64499D] dark:text-[#E9E0FF]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5 truncate">
                                    {caseItem.title || caseItem.reference || `Case #${caseItem.id}`}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                    {caseItem.reference && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                        <span className="font-semibold">Ref:</span> 
                                        <span className="font-mono">{caseItem.reference}</span>
                                      </span>
                                    )}
                                    {caseItem.category && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                        {caseItem.category}
                                      </span>
                                    )}
                                    {caseItem.status && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                        caseItem.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                        caseItem.status === 'IN_PROGRESS' ? 'bg-[#F1ECFF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]' :
                                        caseItem.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                        caseItem.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      }`}>
                                        {caseItem.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <ClientUpdateModal ref={updateModalRef} onSuccess={(updatedClient) => {
          onUpdateSuccess?.(updatedClient);
          setClient(updatedClient as API.Client);
          refreshRelatedCases();
        }} />
        <ClientDeleteModal ref={deleteModalRef} onSuccess={(deletedClient) => {
          onDeleteSuccess?.(deletedClient);
          hide();
        }} />
        <CaseViewModal 
          ref={caseViewModalRef} 
          onSuccess={handleCaseUpdate}
          deleteModalRef={caseDeleteModalRef}
        />
        <CaseUpdateModal ref={caseUpdateModalRef} onSuccess={handleCaseUpdate} />
        <CaseDeleteModal ref={caseDeleteModalRef} onSuccess={handleCaseDelete} />
      </>
    );
  }
);

ClientProfilePreview.displayName = 'ClientProfilePreview';

export default ClientProfilePreview;

