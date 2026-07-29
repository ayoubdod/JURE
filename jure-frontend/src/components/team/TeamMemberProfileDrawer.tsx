import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  X,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { apiGetCabinetMember } from '@/services/cabinet-member/api';
import { cn } from '@/lib/utils';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { getRoleDisplayName } from '@/utils/permissions';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { getStatusColor } from '@/utils/caseCardHelpers';
import { getCabinetMemberRouteId, getMemberCaseCounts } from '@/utils/cabinetMemberHelpers';
import { useToast } from '@/hooks/use-toast';

const JURE_PURPLE = '#6D54B5';

const formatDate = (d?: string | Date) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export interface TeamMemberProfileDrawerRef {
  open: (member: API.CabinetMember) => void;
  close: () => void;
}

function caseTypeDotClass(c: API.Case): string {
  const t = c.caseType ?? c.case_type;
  if (t === 'LITIGATION') return 'bg-rose-500';
  if (t === 'CONSULTATION') return 'bg-indigo-500';
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'bg-amber-400';
  return 'bg-slate-400';
}

function workloadBarClass(total: number): string {
  if (total <= 3) return 'bg-emerald-500';
  if (total <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function workloadFillPct(total: number): number {
  return Math.min(100, (total / 10) * 100);
}

const roleBadgeStyles: Record<API.Role, string> = {
  LAWYER: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 ring-1 ring-indigo-500/25',
  MANAGER: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 ring-1 ring-purple-500/25',
  ADMIN: 'bg-slate-500/15 text-slate-800 dark:text-slate-300 ring-1 ring-slate-500/25',
  ASSISTANT: 'bg-teal-500/15 text-teal-800 dark:text-teal-300 ring-1 ring-teal-500/25',
  VIEWER: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-300/50',
  OWNER: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-1 ring-amber-500/25',
};

const TeamMemberProfileDrawer = forwardRef<
  TeamMemberProfileDrawerRef,
  {
    portalContainer?: HTMLElement | null;
    onOpenChange?: (open: boolean) => void;
    onEditMember?: (member: API.CabinetMember) => void;
  }
>(({ portalContainer, onOpenChange, onEditMember }, ref) => {
  const [member, setMember] = useState<API.CabinetMember | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<API.CabinetMember | null>(null);
  const [drawerMobile, setDrawerMobile] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const fn = () => setDrawerMobile(mql.matches);
    mql.addEventListener('change', fn);
    fn();
    return () => mql.removeEventListener('change', fn);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  useImperativeHandle(ref, () => ({
    open: (m: API.CabinetMember) => {
      setMember(m);
      setDetail(null);
      setOpen(true);
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
  }), [onOpenChange]);

  const data = detail ?? member;
  const fullName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unnamed' : '';
  const cases = (data?.assigned_cases ?? []) as API.Case[];
  const memberRole = (data?.role || 'VIEWER') as API.Role;
  const { inProgress, assignedTotal } = data ? getMemberCaseCounts(data) : { inProgress: 0, assignedTotal: 0 };
  const pending = data ? !!(data as unknown as { invitation_sent?: boolean }).invitation_sent : false;

  const copyText = async (label: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const embedded = portalContainer != null;
  const side = drawerMobile ? 'bottom' : 'right';

  const goToCase = (caseItem: API.Case) => {
    const q = (caseItem.reference || caseItem.title || '').trim();
    if (q) {
      navigate({ pathname: '/dashboard/cases', search: `?search=${encodeURIComponent(q)}` });
    } else {
      navigate('/dashboard/cases');
    }
  };

  return (
    <Sheet modal={false} open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        container={portalContainer ?? undefined}
        side={side}
        overlayClassName={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          embedded ? 'bg-transparent pointer-events-none' : 'bg-black/30'
        )}
        className={cn(
          'flex flex-col gap-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-0 shadow-xl',
          '[&>button]:hidden',
          embedded && '!max-h-full',
          drawerMobile
            ? embedded
              ? 'max-h-[min(92vh,100%)] h-[min(92vh,100%)] w-full max-w-[100vw] rounded-t-2xl border-t sm:max-w-full'
              : 'h-[92vh] max-h-[100dvh] w-full max-w-[100vw] rounded-t-2xl border-t sm:max-w-full'
            : 'h-full w-[420px] max-w-[420px] border-l'
        )}
      >
        <SheetTitle className="sr-only">{fullName || 'Team member'}</SheetTitle>

        {/* Sticky header */}
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-5 pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {data ? (
                <UserAvatar
                  image={getPersonImage(data as Record<string, unknown>)}
                  firstName={data.first_name}
                  lastName={data.last_name}
                  size="lg"
                  className="h-14 w-14"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-800" />
              )}
              <span
                className={cn(
                  'absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950',
                  pending ? 'bg-amber-400' : data?.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2 pr-8">
              <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white truncate">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
                    roleBadgeStyles[memberRole]
                  )}
                >
                  {getRoleDisplayName(memberRole)}
                </span>
                {pending ? (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/25">
                    Pending
                  </span>
                ) : data?.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/25">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/25">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => handleOpenChange(false)}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: JURE_PURPLE }} />
            </div>
          ) : data ? (
            <div className="space-y-8">
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                  Contact
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <Mail className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Email</p>
                        {data.email ? (
                          <a href={`mailto:${data.email}`} className="text-[13px] text-[#6D54B5] dark:text-violet-300 hover:underline break-all">
                            {data.email}
                          </a>
                        ) : (
                          <p className="text-[13px] text-slate-600 dark:text-slate-400">—</p>
                        )}
                      </div>
                    </div>
                    {data.email ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        aria-label="Copy email"
                        onClick={() => copyText('Email', data.email)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <Phone className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Phone</p>
                        {data.phone ? (
                          <a href={`tel:${data.phone}`} className="text-[13px] text-slate-900 dark:text-white hover:underline">
                            {data.phone}
                          </a>
                        ) : (
                          <p className="text-[13px] text-slate-600 dark:text-slate-400">—</p>
                        )}
                      </div>
                    </div>
                    {data.phone ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                        aria-label="Copy phone"
                        onClick={() => copyText('Phone', data.phone)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Address</p>
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{data.address || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 min-w-0">
                    <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Joined</p>
                      <p className="text-[13px] text-slate-700 dark:text-slate-300">{formatDate(data.date_joined as string)}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                  Workload Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">In Progress</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{inProgress}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Assigned</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{assignedTotal}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Workload</span>
                    <span>{assignedTotal} cases</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={cn('h-full rounded-full transition-all', workloadBarClass(assignedTotal))}
                      style={{ width: `${workloadFillPct(assignedTotal)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">
                    {inProgress} of {assignedTotal} cases active
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                  Assigned Cases ({cases.length})
                </h3>
                {cases.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">
                    No cases assigned yet
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cases.map((c) => {
                      const caseItem = c as API.Case;
                      const statusKey = String(caseItem.status ?? '')
                        .toUpperCase()
                        .replace(/\s+/g, '_');
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => goToCase(caseItem)}
                            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                          >
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', caseTypeDotClass(caseItem))} aria-hidden />
                            <div className="min-w-0 flex-1">
                              {caseItem.reference ? (
                                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{caseItem.reference}</p>
                              ) : null}
                              <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate">
                                {caseItem.title || caseItem.reference || `Case #${c.id}`}
                              </p>
                              <span
                                className={cn(
                                  'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                                  getStatusColor(statusKey)
                                )}
                              >
                                {String(caseItem.status ?? '—').replace(/_/g, ' ')}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </div>

        {data ? (
          <footer className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-5 py-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Joined {formatDate(data.date_joined as string)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                className="h-9 bg-[#6D54B5] hover:bg-[#5a4699] text-white"
                onClick={() => onEditMember?.(data)}
              >
                Edit
              </Button>
            </div>
          </footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
});

TeamMemberProfileDrawer.displayName = 'TeamMemberProfileDrawer';

export default TeamMemberProfileDrawer;
