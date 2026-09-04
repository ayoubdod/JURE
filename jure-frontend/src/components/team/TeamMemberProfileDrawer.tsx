import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  X,
  Copy,
  Check,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Briefcase,
  Shield,
} from 'lucide-react';
import { apiGetCabinetMember } from '@/services/cabinet-member/api';
import { cn } from '@/lib/utils';
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import { useIsCabinetMemberOnline } from '@/hooks/useOnlinePresence';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router';
import { getStatusColor } from '@/utils/caseCardHelpers';
import { getCabinetMemberRouteId, getMemberCaseCounts } from '@/utils/cabinetMemberHelpers';
import { useToast } from '@/hooks/use-toast';
import { formatDate, useAppTranslation } from '@/i18n';
import { CaseStatus } from '@/utils/constants';

const JURE_PURPLE = '#64499D';

function normalizeStatus(s: unknown): string {
  return String(s ?? '')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function workloadFillPct(total: number): number {
  return Math.min(100, (total / 10) * 100);
}

const roleBadgeStyles: Record<API.Role, string> = {
  LAWYER: 'bg-[#64499D]/10 text-[#64499D] ring-1 ring-[#64499D]/20 dark:text-[#CFC2FF]',
  MANAGER: 'bg-slate-500/12 text-slate-700 ring-1 ring-slate-500/20 dark:text-slate-300',
  ADMIN: 'bg-slate-500/12 text-slate-700 ring-1 ring-slate-500/20 dark:text-slate-300',
  ASSISTANT: 'bg-slate-500/12 text-slate-700 ring-1 ring-slate-500/20 dark:text-slate-300',
  VIEWER: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300',
  OWNER: 'bg-amber-500/12 text-amber-900 ring-1 ring-amber-500/20 dark:text-amber-300',
};

export interface TeamMemberProfileDrawerRef {
  open: (member: API.CabinetMember) => void;
  close: () => void;
}

const TeamMemberProfileDrawer = forwardRef<
  TeamMemberProfileDrawerRef,
  {
    onOpenChange?: (open: boolean) => void;
    onEditMember?: (member: API.CabinetMember) => void;
  }
>(({ onOpenChange, onEditMember }, ref) => {
  const { t, tf, enumLabel, lang } = useAppTranslation();
  const d = t.team.drawer;
  const [member, setMember] = useState<API.CabinetMember | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<API.CabinetMember | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tab, setTab] = useState<'contact' | 'cases'>('contact');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
      if (!next) {
        setCategoryFilter('all');
        setTab('contact');
      }
    },
    [onOpenChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      open: (m: API.CabinetMember) => {
        setMember(m);
        setDetail(null);
        setCategoryFilter('all');
        setTab('contact');
        setOpen(true);
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
        onOpenChange?.(true);
        setLoading(true);
        apiGetCabinetMember(getCabinetMemberRouteId(m), { expand: 'assigned_cases' })
          .then((res) => setDetail(res.data))
          .catch(() => setDetail(m))
          .finally(() => setLoading(false));
      },
      close: () => {
        setOpen(false);
        onOpenChange?.(false);
      },
    }),
    [onOpenChange]
  );

  const data = detail ?? member;
  const isOnline = useIsCabinetMemberOnline(data);
  const fullName = data
    ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || t.team.unnamed
    : '';
  const cases = (data?.assigned_cases ?? []) as API.Case[];
  const memberRole = (data?.role || 'VIEWER') as API.Role;
  const { inProgress, assignedTotal } = data
    ? getMemberCaseCounts(data)
    : { inProgress: 0, assignedTotal: 0 };
  const pending = data ? !!data.invitation_sent : false;

  const closedCount = useMemo(
    () => cases.filter((c) => normalizeStatus(c.status) === CaseStatus.CLOSED).length,
    [cases]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    cases.forEach((c) => {
      if (!c.category) return;
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (categoryFilter === 'all') return cases;
    return cases.filter((c) => c.category === categoryFilter);
  }, [cases, categoryFilter]);

  const copyText = async (field: string, label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(
        () => setCopiedField((cur) => (cur === field ? null : cur)),
        1400
      );
      toast({ title: d.copied, description: label });
    } catch {
      toast({ title: d.copyFailed, variant: 'destructive' });
    }
  };

  const goToCase = (caseItem: API.Case) => {
    const q = (caseItem.reference || caseItem.title || '').trim();
    if (q) {
      navigate({ pathname: '/dashboard/cases', search: `?search=${encodeURIComponent(q)}` });
    } else {
      navigate('/dashboard/cases');
    }
  };

  const handleCall = () => {
    if (!data?.phone) return;
    toast({
      title: t.team.toasts.callingTitle,
      description: tf(t.team.toasts.callingDesc, { name: fullName, phone: data.phone }),
    });
    window.location.href = `tel:${data.phone}`;
  };

  const handleEmail = () => {
    if (!data?.email) return;
    toast({
      title: t.team.toasts.emailTitle,
      description: tf(t.team.toasts.emailDesc, { email: data.email }),
    });
    window.location.href = `mailto:${data.email}`;
  };

  const joined = data?.date_joined ? formatDate(data.date_joined, lang) : '';
  const roleLabel = t.team.roles[memberRole] || memberRole;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal>
      <DialogPortal>
        <DialogOverlay className="bg-slate-950/50" />
        <DialogPrimitive.Content
          aria-describedby="member-profile-description"
          className={cn(
            'fixed z-50 flex min-h-0 min-w-0 flex-col overflow-hidden overflow-x-hidden border border-slate-200/90 bg-white p-0 shadow-2xl outline-none',
            'dark:border-zinc-800 dark:bg-zinc-950',
            'inset-x-0 bottom-0 top-auto h-[min(92dvh,860px)] w-full max-w-full translate-x-0 translate-y-0 rounded-t-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(88vh,800px)] md:w-[min(94vw,720px)] md:max-w-[720px]',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px]',
            'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
            'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
            'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
        <DialogDescription id="member-profile-description" className="sr-only">
          {roleLabel}
        </DialogDescription>
        {!data ? (
          <DialogTitle className="sr-only">{t.team.unnamed}</DialogTitle>
        ) : null}

        <header className="relative shrink-0 overflow-hidden border-b border-[#64499D]/10 bg-[#F7F4FF] px-5 py-4 pe-14 dark:border-[#8B6FD1]/15 dark:bg-[#24183F]/80 md:px-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'linear-gradient(135deg, rgba(100,73,157,0.08) 0%, rgba(100,73,157,0.02) 52%, transparent 100%)',
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-3 top-3 z-10 h-8 w-8 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => handleOpenChange(false)}
            aria-label={d.closePanel}
          >
            <X className="h-4 w-4" />
          </Button>

          {data ? (
            <div className="relative min-w-0">
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative mt-0.5 shrink-0">
                  <UserAvatar
                    image={getPersonImage(data)}
                    firstName={data.first_name}
                    lastName={data.last_name}
                    size="md"
                  />
                  {pending ? (
                    <span
                      className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#F7F4FF] bg-amber-400 dark:border-[#24183F]"
                      aria-hidden
                    />
                  ) : (
                    <PresenceDot
                      online={isOnline}
                      className="border-[#F7F4FF] dark:border-[#24183F]"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                    {fullName}
                  </DialogTitle>
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]',
                        roleBadgeStyles[memberRole]
                      )}
                    >
                      {roleLabel}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
                        pending
                          ? 'bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300'
                          : data.is_active
                            ? 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400'
                            : 'bg-slate-500/12 text-slate-600 ring-slate-500/25 dark:text-slate-400'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          pending ? 'bg-amber-500' : data.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                        )}
                      />
                      {pending
                        ? t.team.status.pending
                        : data.is_active
                          ? t.team.status.active
                          : t.team.status.inactive}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-white hover:opacity-90"
                  style={{ backgroundColor: JURE_PURPLE }}
                  onClick={handleEmail}
                  disabled={!data.email}
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {t.team.email}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-slate-200 px-2.5 dark:border-zinc-700"
                  onClick={handleCall}
                  disabled={!data.phone}
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {t.team.call}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-slate-200 px-2.5 dark:border-zinc-700"
                  onClick={() => onEditMember?.(data)}
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
                      aria-label={t.team.moreActions}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem disabled={!data.email} onClick={() => copyText('email', d.copyEmail, data.email)}>
                      <Copy className="me-2 h-3.5 w-3.5" />
                      {d.copyEmail}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!data.phone} onClick={() => copyText('phone', d.copyPhone, data.phone)}>
                      <Copy className="me-2 h-3.5 w-3.5" />
                      {d.copyPhone}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}
        </header>

        <div
          className="flex shrink-0 gap-1 border-b border-slate-200 px-5 pt-2 dark:border-zinc-800 md:px-6"
          role="tablist"
          aria-label={fullName || t.team.unnamed}
        >
          {([
            { id: 'contact' as const, label: d.contact },
            { id: 'cases' as const, label: d.assignedCases, count: cases.length },
          ]).map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setTab(item.id);
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
                {item.label}
                {item.count !== undefined ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums',
                      selected
                        ? 'bg-[#64499D]/10 text-[#64499D] dark:bg-[#8B6FD1]/20 dark:text-[#CFC2FF]'
                        : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                    )}
                  >
                    {loading ? '…' : item.count}
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
          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#64499D]" />
            </div>
          ) : data && tab === 'contact' ? (
            <div className="min-w-0 space-y-6">
              <section className="min-w-0">
                <h3 className="mb-2 text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                  {d.contact}
                </h3>
                <div className="min-w-0 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                  <ContactRow
                    icon={Mail}
                    label={t.team.modal.email}
                    value={data.email}
                    href={data.email ? `mailto:${data.email}` : undefined}
                    onCopy={() => copyText('email', d.copyEmail, data.email)}
                    copied={copiedField === 'email'}
                    copyLabel={d.copyEmail}
                  />
                  <ContactRow
                    icon={Phone}
                    label={t.team.modal.phone}
                    value={data.phone}
                    href={data.phone ? `tel:${data.phone}` : undefined}
                    onCopy={() => copyText('phone', d.copyPhone, data.phone)}
                    copied={copiedField === 'phone'}
                    copyLabel={d.copyPhone}
                  />
                  {data.address ? (
                    <ContactRow
                      icon={MapPin}
                      label={t.team.modal.addressLabel}
                      value={data.address}
                      wrap
                    />
                  ) : null}
                  {data.country ? (
                    <ContactRow icon={MapPin} label={d.country} value={String(data.country)} />
                  ) : null}
                </div>
              </section>

              <section className="min-w-0">
                <h3 className="mb-2 text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                  {d.professional}
                </h3>
                <dl className="min-w-0 space-y-2.5 rounded-xl border border-slate-200 px-3 py-3 dark:border-zinc-800">
                  <MetaRow label={t.team.columns.role} value={roleLabel} />
                  <MetaRow
                    label={d.memberType}
                    value={pending ? d.memberTypePending : d.memberTypeActive}
                  />
                  {joined ? <MetaRow label={t.team.columns.joined} value={joined} /> : null}
                </dl>
                <p className="mt-2 flex min-w-0 items-start gap-1.5 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="font-medium text-slate-600 dark:text-zinc-300">{d.access}. </span>
                    {t.team.roleDescriptions[memberRole]}
                  </span>
                </p>
              </section>
            </div>
          ) : data && tab === 'cases' ? (
            <div className="min-w-0 space-y-4">
              <section className="min-w-0">
                <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                  {d.workload}
                </h3>
                <p className="mt-0.5 text-[13px] font-medium text-slate-800 dark:text-zinc-200">
                  {tf(d.casesAssigned, { count: assignedTotal })}
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#64499D]/70 transition-[width] duration-300"
                    style={{ width: `${workloadFillPct(assignedTotal)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-zinc-400">
                  {cases.length > 0
                    ? tf(d.activeClosed, { active: inProgress, closed: closedCount })
                    : tf(t.team.activeAssigned, { inProgress, assigned: assignedTotal })}
                </p>
              </section>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#64499D]" />
                </div>
              ) : cases.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[13px] text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                  {d.noCases}
                </p>
              ) : (
                <div className="min-w-0 space-y-2">
                  {categoryCounts.length > 0 ? (
                    <div className="flex min-w-0 flex-wrap gap-1" role="group" aria-label={d.assignedCases}>
                      <FilterChip
                        active={categoryFilter === 'all'}
                        label={d.filterAll}
                        count={cases.length}
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

                  <ul className="min-w-0 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {filteredCases.map((c) => {
                      const statusKey = normalizeStatus(c.status);
                      const title = c.title || c.reference || `#${c.id}`;
                      const heading =
                        c.reference && c.title && c.reference !== c.title
                          ? `${c.reference} — ${c.title}`
                          : title;
                      const categoryLabel = c.category ? enumLabel('caseCategory', c.category) : '';
                      const statusLabel =
                        enumLabel('caseStatus', c.status) || String(c.status ?? '—').replace(/_/g, ' ');
                      return (
                        <li key={c.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => goToCase(c)}
                            className="flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D]/30 dark:hover:bg-zinc-900"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F1ECFF] text-[#64499D] dark:bg-[#2a2240] dark:text-[#E9E0FF]">
                              <Briefcase className="h-3.5 w-3.5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-slate-900 dark:text-zinc-100">
                                {heading}
                              </p>
                              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                                <span
                                  className={cn(
                                    'inline-flex shrink-0 items-center rounded px-1.5 py-px text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
                                    getStatusColor(statusKey)
                                  )}
                                >
                                  {statusLabel}
                                </span>
                                {categoryLabel ? (
                                  <span className="min-w-0 truncate uppercase tracking-wide">
                                    {categoryLabel}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {data ? (
          <footer className="flex shrink-0 min-w-0 flex-col gap-2.5 border-t border-slate-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="min-w-0 truncate text-[11px] text-slate-400">
              {joined ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden />
                  {tf(d.joinedOn, { date: joined })}
                </span>
              ) : null}
            </p>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 border-slate-200 dark:border-zinc-700"
                onClick={() => handleOpenChange(false)}
              >
                {t.common.close}
              </Button>
              <Button
                type="button"
                className="h-9 shrink-0 text-white hover:opacity-90"
                style={{ backgroundColor: JURE_PURPLE }}
                onClick={() => onEditMember?.(data)}
              >
                {d.editMember}
              </Button>
            </div>
          </footer>
        ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
});

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  onCopy,
  copied,
  copyLabel,
  wrap,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  href?: string;
  onCopy?: () => void;
  copied?: boolean;
  copyLabel?: string;
  wrap?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2.5 px-3 py-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-400">{label}</p>
        {href ? (
          <a
            href={href}
            className={cn(
              'block text-[13px] text-slate-800 hover:text-[#64499D] dark:text-zinc-200',
              wrap ? 'break-words' : 'truncate'
            )}
            title={value}
          >
            {value}
          </a>
        ) : (
          <p
            className={cn(
              'text-[13px] text-slate-800 dark:text-zinc-200',
              wrap ? 'break-words' : 'truncate'
            )}
            title={value}
          >
            {value}
          </p>
        )}
      </div>
      {onCopy ? (
        <button
          type="button"
          className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30 dark:hover:bg-zinc-800"
          aria-label={copyLabel}
          onClick={onCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[12px] text-slate-400">{label}</dt>
      <dd className="truncate text-[13px] font-medium text-slate-800 dark:text-zinc-200">{value}</dd>
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
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
        active
          ? 'bg-[#64499D] text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn('tabular-nums', active ? 'text-white/80' : 'text-slate-400')}>{count}</span>
    </button>
  );
}

TeamMemberProfileDrawer.displayName = 'TeamMemberProfileDrawer';
export default TeamMemberProfileDrawer;
