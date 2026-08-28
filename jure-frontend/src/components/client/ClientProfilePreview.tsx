import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Briefcase,
  Building2,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import ClientUpdateModal, { ClientUpdateModalRef } from './ClientUpdateModal';
import ClientDeleteModal, { ClientDeleteModalRef } from './ClientDeleteModal';
import CaseViewModal, { CaseViewModalRef } from '@/components/case/CaseViewModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import { apiGetCases } from '@/services/case/api';
import { useNavigate } from 'react-router';
import { devError } from '@/utils/devLog';
import { cn } from '@/lib/utils';
import { navigateToCase } from '@/lib/caseRoutes';
import { formatDate, useAppTranslation } from '@/i18n';
import { CaseStatus } from '@/utils/constants';
import { getCaseType, assignedDisplayName } from '@/services/case/caseType';
import { getCaseData } from '@/utils/caseCardHelpers';
import { getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';

export interface ClientProfilePreviewRef {
  show: (client: API.Client) => void;
  hide: () => void;
}

interface ClientProfilePreviewProps {
  onUpdateSuccess?: (client: API.Client) => void;
  onDeleteSuccess?: (client: API.Client) => void;
}

const initialsOf = (first?: string, last?: string) => {
  const i1 = (first?.[0] || '').toUpperCase();
  const i2 = (last?.[0] || '').toUpperCase();
  return (i1 + i2) || '•';
};

const caseClientId = (caseItem: API.Case) => {
  if (!caseItem.client) return null;
  if (typeof caseItem.client === 'object') {
    return (caseItem.client as { id?: number }).id ?? null;
  }
  return caseItem.client;
};

async function fetchCasesForClient(clientId: number): Promise<API.Case[]> {
  const pageSize = 100;
  let page = 1;
  const acc: API.Case[] = [];

  while (true) {
    const res = await apiGetCases({ page, page_size: pageSize });
    const data = res.data;
    acc.push(...(data.results || []));
    const lastPage = data.last_page ?? 1;
    if (page >= lastPage) break;
    page += 1;
  }

  return acc
    .filter((caseItem) => caseClientId(caseItem) === clientId)
    .sort((a, b) => new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime());
}

const STATUS_PILL: Record<string, string> = {
  [CaseStatus.OPEN]: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400',
  [CaseStatus.IN_PROGRESS]: 'bg-[#64499D]/10 text-[#64499D] ring-[#64499D]/20 dark:text-[#CFC2FF]',
  [CaseStatus.CLOSED]: 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-400',
  [CaseStatus.CANCELLED]: 'bg-rose-500/12 text-rose-700 ring-rose-500/25 dark:text-rose-400',
  [CaseStatus.PENDING]: 'bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  [CaseStatus.ARCHIVED]: 'bg-slate-500/10 text-slate-500 ring-slate-500/20',
  [CaseStatus.CONVERTED_TO_CASE]: 'bg-[#64499D]/10 text-[#64499D] ring-[#64499D]/20 dark:text-[#CFC2FF]',
};

type ProfileTab = 'overview' | 'cases';

const ClientProfilePreview = React.forwardRef<ClientProfilePreviewRef, ClientProfilePreviewProps>(
  ({ onUpdateSuccess, onDeleteSuccess }, ref) => {
    const { t, tf, enumLabel, enumPretty, lang } = useAppTranslation();
    const navigate = useNavigate();
    const p = t.clients.profile;

    const [isOpen, setIsOpen] = useState(false);
    const [client, setClient] = useState<API.Client | null>(null);
    const [relatedCases, setRelatedCases] = useState<API.Case[]>([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [tab, setTab] = useState<ProfileTab>('overview');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const updateModalRef = useRef<ClientUpdateModalRef>(null);
    const deleteModalRef = useRef<ClientDeleteModalRef>(null);
    const caseViewModalRef = useRef<CaseViewModalRef>(null);
    const caseUpdateModalRef = useRef<CaseUpdateModalRef>(null);
    const caseDeleteModalRef = useRef<CaseDeleteModalRef>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const show = (clientData: API.Client) => {
      setClient(clientData);
      setTab('overview');
      setCategoryFilter('all');
      setIsOpen(true);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
    };

    const hide = () => setIsOpen(false);

    useImperativeHandle(ref, () => ({ show, hide }));

    const loadRelatedCases = useCallback(async (clientId: number) => {
      setCasesLoading(true);
      try {
        setRelatedCases(await fetchCasesForClient(clientId));
      } catch (err) {
        devError('Error fetching related cases:', err);
        setRelatedCases([]);
      } finally {
        setCasesLoading(false);
      }
    }, []);

    useEffect(() => {
      if (client?.id) {
        void loadRelatedCases(client.id);
      } else {
        setRelatedCases([]);
      }
    }, [client?.id, loadRelatedCases]);

    const handleEdit = () => {
      if (client) updateModalRef.current?.show(client);
    };

    const handleDelete = () => {
      if (client) deleteModalRef.current?.show(client);
    };

    const handleCaseClick = (caseItem: API.Case) => {
      hide();
      void navigateToCase(navigate, caseItem);
    };

    const handleCaseUpdate = (updatedCase: API.Case) => {
      if (client?.id) void loadRelatedCases(client.id);
      caseViewModalRef.current?.show(updatedCase);
    };

    const handleCaseDelete = () => {
      if (client?.id) void loadRelatedCases(client.id);
      caseViewModalRef.current?.hide();
    };

    const handleCall = () => {
      if (client?.phone) window.location.href = `tel:${client.phone}`;
    };

    const handleEmail = () => {
      if (client?.email) window.location.href = `mailto:${client.email}`;
    };

    const fullName = client
      ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || t.clients.unnamed
      : '';
    const initials = initialsOf(client?.first_name, client?.last_name);
    const isCompany = client?.client_type === 'COMPANY';
    const ice = client?.ice?.trim();
    const fiscalIf = (client?.fiscal_if || (client as API.Client & { if?: string | null })?.if || '').trim();

    const consultations = useMemo(
      () => relatedCases.filter((c) => getCaseType(c) === 'CONSULTATION'),
      [relatedCases]
    );
    const matterCases = useMemo(
      () => relatedCases.filter((c) => getCaseType(c) !== 'CONSULTATION'),
      [relatedCases]
    );

    const caseStats = useMemo(() => {
      const total = matterCases.length;
      const open = matterCases.filter(
        (c) => c.status === CaseStatus.OPEN || c.status === CaseStatus.IN_PROGRESS
      ).length;
      const closed = matterCases.filter((c) => c.status === CaseStatus.CLOSED).length;
      const pending = matterCases.filter((c) => c.status === CaseStatus.PENDING).length;
      return { total, open, closed, pending };
    }, [matterCases]);

    const categoryCounts = useMemo(() => {
      const counts = new Map<string, number>();
      matterCases.forEach((c) => {
        if (!c.category) return;
        counts.set(c.category, (counts.get(c.category) || 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [matterCases]);

    const filteredCases = useMemo(() => {
      if (categoryFilter === 'all') return matterCases;
      return matterCases.filter((c) => c.category === categoryFilter);
    }, [matterCases, categoryFilter]);

    const joinedLabel = client?.date_joined ? formatDate(client.date_joined, lang) : '';

    return (
      <>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) hide();
          }}
          modal
        >
          <DialogPortal>
            <DialogOverlay className="bg-slate-950/50" />
            <DialogPrimitive.Content
              aria-describedby="client-profile-description"
              className={cn(
                'fixed z-50 flex min-h-0 flex-col overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl outline-none',
                'dark:border-zinc-800 dark:bg-zinc-950',
                'inset-x-0 bottom-0 top-auto h-[min(92dvh,860px)] w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
                'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(88vh,760px)] md:w-[min(94vw,800px)] md:max-w-[800px]',
                'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px]',
                'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
                'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
                'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]'
              )}
            >
              <header className="relative shrink-0 overflow-hidden border-b border-[#64499D]/10 bg-[#F7F4FF] px-5 py-4 pe-14 dark:border-[#8B6FD1]/15 dark:bg-[#24183F]/80 md:px-6">
                <div
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(100,73,157,0.08) 0%, rgba(100,73,157,0.02) 52%, transparent 100%)',
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-3 top-3 z-10 h-8 w-8 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  onClick={hide}
                  aria-label={p.closeAria}
                >
                  <X className="h-4 w-4" />
                </Button>

                {client && (
                  <div className="relative min-w-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="relative mt-0.5 shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#64499D] to-[#3b2b66] text-[13px] font-semibold text-white ring-1 ring-[#64499D]/20">
                          {initials}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <DialogTitle className="truncate text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                            {fullName}
                          </DialogTitle>
                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
                              client.is_active
                                ? 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400'
                                : 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-400'
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                client.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              )}
                            />
                            {client.is_active ? t.clients.status.active : t.clients.status.inactive}
                          </span>
                        </div>
                        <DialogDescription id="client-profile-description" className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
                          {isCompany ? p.roleCompany : p.roleClient}
                        </DialogDescription>
                        {(client.email || client.phone) ? (
                          <p className="mt-1 truncate text-[12px] text-slate-500 dark:text-zinc-400">
                            {[client.email, client.phone].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                        {typeof client.cases_count === 'number' || (client.cases && client.cases.length > 0) ? (
                          <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-zinc-300">
                            {tf(
                              (client.cases_count ?? client.cases?.length ?? 0) === 1
                                ? t.clients.casesCountOne
                                : t.clients.casesCountOther,
                              { count: client.cases_count ?? client.cases?.length ?? 0 }
                            )}
                          </p>
                        ) : null}
                        {client.address ? (
                          <p
                            className="mt-1 flex min-w-0 items-center gap-1 text-[12px] text-slate-500 dark:text-zinc-400"
                            title={client.address}
                          >
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{client.address}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 bg-[#64499D] px-3 text-white hover:bg-[#4D3680]"
                        onClick={handleCall}
                        disabled={!client.phone}
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden />
                        {p.call}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-200 px-3 dark:border-zinc-700"
                        onClick={handleEmail}
                        disabled={!client.email}
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                        {p.sendEmail}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-200 px-3 dark:border-zinc-700"
                        onClick={handleEdit}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {t.common.edit}
                      </Button>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 border-slate-200 dark:border-zinc-700"
                            aria-label={p.moreActions}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={handleEdit}>
                            <Pencil className="me-2 h-3.5 w-3.5" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40"
                            onClick={handleDelete}
                          >
                            <Trash2 className="me-2 h-3.5 w-3.5" />
                            {t.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </header>

              <div
                className="flex shrink-0 gap-1 overflow-x-hidden border-b border-slate-200 px-5 pt-2 dark:border-zinc-800 md:px-6"
                role="tablist"
                aria-label={fullName}
              >
                {(['overview', 'cases'] as const).map((id) => {
                  const selected = tab === id;
                  const label = id === 'overview' ? p.overview : p.cases;
                  const count = id === 'cases' ? caseStats.total : undefined;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => {
                        setTab(id);
                        scrollRef.current?.scrollTo({ top: 0 });
                      }}
                      className={cn(
                        'relative mb-[-1px] inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-[13px] font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                        selected
                          ? 'text-[#64499D] dark:text-[#CFC2FF]'
                          : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      )}
                    >
                      {label}
                      {count !== undefined ? (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
                            selected
                              ? 'bg-[#64499D]/10 text-[#64499D] dark:bg-[#8B6FD1]/20 dark:text-[#CFC2FF]'
                              : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#64499D]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div
                ref={scrollRef}
                className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 md:px-6"
              >
                {client && tab === 'overview' ? (
                  <div className="min-w-0 space-y-6">
                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                      <SummaryCell icon={Mail} label={t.clients.email} value={client.email || '—'} />
                      <SummaryCell icon={Phone} label={t.clients.phone} value={client.phone || '—'} />
                      <SummaryCell
                        icon={Briefcase}
                        label={p.cases}
                        value={casesLoading ? '…' : String(caseStats.total)}
                      />
                      <SummaryCell
                        icon={User}
                        label={t.common.status}
                        value={client.is_active ? t.clients.status.active : t.clients.status.inactive}
                      />
                    </div>

                    <section className="min-w-0 space-y-3">
                      <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{p.contact}</h3>
                      <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                        <InfoRow icon={Mail} label={t.clients.email} value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
                        <InfoRow icon={Phone} label={t.clients.phone} value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
                        {client.address ? (
                          <InfoRow icon={MapPin} label={t.clients.modal.address} value={client.address} />
                        ) : null}
                        {joinedLabel ? (
                          <InfoRow icon={User} label={p.joined} value={joinedLabel} />
                        ) : null}
                      </dl>
                    </section>

                    {(ice || fiscalIf) && (
                      <section className="min-w-0 space-y-3">
                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                          {p.professional}
                        </h3>
                        <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                          {ice ? (
                            <InfoRow icon={FileSpreadsheet} label={t.clients.modal.ice} value={ice} hint={t.clients.modal.iceHint} />
                          ) : null}
                          {fiscalIf ? (
                            <InfoRow icon={Building2} label={t.clients.modal.fiscalIf} value={fiscalIf} hint={t.clients.modal.fiscalIfHint} />
                          ) : null}
                        </dl>
                      </section>
                    )}
                  </div>
                ) : null}

                {client && tab === 'cases' ? (
                  <div className="min-w-0 space-y-8">
                    <section className="space-y-4">
                      <div>
                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                          {p.consultations}
                        </h3>
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-zinc-400">
                          {casesLoading ? p.loadingCases : tf(p.casesTotal, { count: consultations.length })}
                        </p>
                      </div>
                      {casesLoading ? null : consultations.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[12px] text-slate-500 dark:border-zinc-800">
                          {p.noConsultations}
                        </p>
                      ) : (
                        <ul className="min-w-0 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                          {consultations.map((caseItem) => {
                            const converted = getConvertedToCase(caseItem);
                            const consultDate = getCaseData(caseItem, 'consultation_date') as string | undefined;
                            const consultType = getCaseData(caseItem, 'consultation_type') as string | undefined;
                            const outcome =
                              (getCaseData(caseItem, 'outcome') as string) ||
                              (getCaseData(caseItem, 'status') as string) ||
                              caseItem.status;
                            return (
                              <li key={caseItem.id} className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleCaseClick(caseItem)}
                                  className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/30 dark:hover:bg-zinc-900"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-mono text-[11px] text-slate-500">{caseItem.reference}</p>
                                    <p className="truncate text-[13px] font-medium text-slate-900 dark:text-zinc-100">
                                      {caseItem.title || t.cases.untitledCase}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-zinc-400">
                                      {[
                                        consultDate ? formatDate(consultDate, lang) : null,
                                        consultType ? enumPretty(consultType) : null,
                                        assignedDisplayName(caseItem) || null,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </p>
                                    {converted?.reference ? (
                                      <p className="mt-0.5 text-[11px] text-[#64499D]">
                                        {tf(p.convertedTo, { reference: converted.reference })}
                                      </p>
                                    ) : null}
                                  </div>
                                  {outcome ? (
                                    <span
                                      className={cn(
                                        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
                                        STATUS_PILL[outcome] ||
                                          'bg-slate-500/12 text-slate-600 ring-slate-500/25'
                                      )}
                                    >
                                      {enumPretty(outcome) || outcome}
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                      <div>
                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{p.cases}</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-zinc-400">
                          {casesLoading ? p.loadingCases : tf(p.casesTotal, { count: caseStats.total })}
                        </p>
                      </div>
                    </div>

                    {!casesLoading && matterCases.length > 0 ? (
                      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatChip label={p.statTotal} value={caseStats.total} />
                        <StatChip label={p.statOpen} value={caseStats.open} />
                        <StatChip label={p.statClosed} value={caseStats.closed} />
                        <StatChip label={p.statPending} value={caseStats.pending} />
                      </div>
                    ) : null}

                    {!casesLoading && matterCases.length > 0 ? (
                      <div className="flex min-w-0 flex-wrap gap-1.5" role="group" aria-label={p.cases}>
                        <FilterChip
                          active={categoryFilter === 'all'}
                          label={p.filterAll}
                          count={matterCases.length}
                          onClick={() => setCategoryFilter('all')}
                        />
                        {categoryCounts.map(([category, count]) => (
                          <FilterChip
                            key={category}
                            active={categoryFilter === category}
                            label={enumLabel('caseCategory', category) || category}
                            count={count}
                            onClick={() => setCategoryFilter(category)}
                          />
                        ))}
                      </div>
                    ) : null}

                    {casesLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-[#64499D]" />
                        <p className="text-[12px] font-medium">{p.loadingCases}</p>
                      </div>
                    ) : matterCases.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-zinc-800">
                        <Briefcase className="mx-auto h-6 w-6 text-slate-300 dark:text-zinc-600" aria-hidden />
                        <h3 className="mt-3 text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                          {p.noCasesTitle}
                        </h3>
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">
                          {p.noCasesDescription}
                        </p>
                      </div>
                    ) : (
                      <ul className="min-w-0 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {filteredCases.map((caseItem) => (
                          <li key={caseItem.id} className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleCaseClick(caseItem)}
                              className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/30 dark:hover:bg-zinc-900"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1ECFF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]">
                                <Briefcase className="h-3.5 w-3.5" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-slate-900 dark:text-zinc-100">
                                  {caseItem.title || caseItem.reference || `#${caseItem.id}`}
                                </p>
                                <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-zinc-400">
                                  {caseItem.reference ? `${p.ref} ${caseItem.reference}` : null}
                                  {caseItem.reference && caseItem.category ? ' · ' : null}
                                  {caseItem.category ? enumLabel('caseCategory', caseItem.category) : null}
                                </p>
                              </div>
                              {caseItem.status ? (
                                <span
                                  className={cn(
                                    'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
                                    STATUS_PILL[caseItem.status] ||
                                      'bg-slate-500/12 text-slate-600 ring-slate-500/25'
                                  )}
                                >
                                  {enumLabel('caseStatus', caseItem.status) || caseItem.status}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>

        <ClientUpdateModal
          ref={updateModalRef}
          onSuccess={(updatedClient) => {
            onUpdateSuccess?.(updatedClient);
            setClient(updatedClient);
            if (updatedClient.id) void loadRelatedCases(updatedClient.id);
          }}
        />
        <ClientDeleteModal
          ref={deleteModalRef}
          onSuccess={(deletedClient) => {
            onDeleteSuccess?.(deletedClient);
            hide();
          }}
        />
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

function SummaryCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
        <Icon className="h-3 w-3 text-[#64499D]" aria-hidden />
        {label}
      </div>
      <p className="mt-1 truncate text-[13px] font-medium text-slate-800 dark:text-zinc-200" title={value}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  hint?: string;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1ECFF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</dt>
        <dd className="truncate text-[13px] text-slate-800 dark:text-zinc-200" title={value}>
          {value}
        </dd>
        {hint ? <p className="truncate text-[11px] text-slate-400">{hint}</p> : null}
      </div>
    </>
  );

  return (
    <div className="px-3 py-2.5">
      {href ? (
        <a href={href} className="flex min-w-0 items-start gap-3 rounded-md hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30">
          {content}
        </a>
      ) : (
        <div className="flex min-w-0 items-start gap-3">{content}</div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-slate-800 dark:text-zinc-100">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
        active
          ? 'bg-[#64499D] text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          active ? 'text-white/80' : 'text-slate-400 dark:text-zinc-500'
        )}
      >
        {count}
      </span>
    </button>
  );
}

ClientProfilePreview.displayName = 'ClientProfilePreview';
export default ClientProfilePreview;
