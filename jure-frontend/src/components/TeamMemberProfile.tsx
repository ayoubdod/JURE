import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import {
  Phone,
  Mail,
  Edit,
  MapPin,
  Calendar,
  Loader2,
  ArrowUpRight,
  MoreVertical,
  Copy,
  ArrowRight,
  FolderOpen,
  CheckSquare,
  CalendarClock,
  AlarmClock,
  Briefcase,
  Globe,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import CabinetMemberUpdateModal, { CabinetMemberUpdateModalRef } from './cabinet-member/CabinetMemberUpdateModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import { apiGetCases, apiUpdateCase } from '@/services/case/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { cn } from '@/lib/utils';
import { navigateToCase } from '@/lib/caseRoutes';
import { Link, useNavigate } from 'react-router';
import {
  getCaseDateForFilter,
  getCountdownDays,
  getCountdownStyle,
} from '@/utils/caseCardHelpers';
import { BACKEND_BASE_URL, TaskPriority } from '@/utils/constants';
import { getPersonImage } from '@/components/common/UserAvatar';
import { clientDisplayName } from '@/services/case/caseType';
import { formatDate as formatI18nDate, useAppTranslation } from '@/i18n';

type Props = {
  profile: API.CabinetMember;
  onUpdateSuccess: (instance: API.CabinetMember) => void;
};

type CaseItem = {
  id: number | string;
  reference?: string;
  title?: string;
  category?: string;
  status?: string;
  created?: string;
  created_at?: string;
  case_type?: API.CaseType | string | null;
  caseType?: string | null;
  priority?: string | null;
  client?: API.User | null;
  _counts?: API.CaseRelatedCounts | null;
};

const STATUS = [
  { value: 'ALL' },
  { value: 'IN_PROGRESS' },
  { value: 'OPEN' },
  { value: 'PENDING' },
  { value: 'CLOSED' },
  { value: 'CANCELLED' },
  { value: 'ARCHIVED' },
] as const;
type StatusValue = (typeof STATUS)[number]['value'];

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = BACKEND_BASE_URL.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

function showPriorityPill(p?: string | null): boolean {
  if (p == null) return false;
  const u = String(p).toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function roleTone(role?: API.Role | string): string {
  const r = String(role || '').toUpperCase();
  if (r === 'OWNER') return 'text-amber-800 dark:text-amber-200';
  if (r === 'ADMIN') return 'text-slate-600 dark:text-slate-300';
  if (r === 'MANAGER') return 'text-[#64499D] dark:text-[#C4B5FD]';
  if (r === 'LAWYER') return 'text-indigo-700 dark:text-indigo-300';
  if (r === 'ASSISTANT') return 'text-teal-700 dark:text-teal-300';
  return 'text-slate-500 dark:text-slate-400';
}

function capacityFromTotal(total: number): {
  key: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
  fillPct: number;
  barClass: string;
} {
  if (total <= 3) {
    return { key: 'LOW', fillPct: Math.min(100, (total / 10) * 100), barClass: 'bg-emerald-500' };
  }
  if (total <= 6) {
    return { key: 'MEDIUM', fillPct: Math.min(100, (total / 10) * 100), barClass: 'bg-blue-500' };
  }
  if (total <= 10) {
    return { key: 'HIGH', fillPct: Math.min(100, (total / 10) * 100), barClass: 'bg-amber-500' };
  }
  return { key: 'OVERLOADED', fillPct: 100, barClass: 'bg-red-500' };
}

function capacityPillTone(key: string): string {
  const k = key.toUpperCase();
  if (k === 'LOW') return 'text-emerald-700 dark:text-emerald-400';
  if (k === 'MEDIUM') return 'text-blue-700 dark:text-blue-400';
  if (k === 'HIGH') return 'text-amber-800 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-indigo-500';
    case 'OPEN':
      return 'bg-[#64499D]';
    case 'PENDING':
      return 'bg-amber-500';
    case 'CLOSED':
      return 'bg-emerald-500';
    case 'CANCELLED':
      return 'bg-rose-500';
    case 'ARCHIVED':
      return 'bg-slate-400';
    default:
      return 'bg-slate-400';
  }
}

function statusTextClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'text-indigo-700 dark:text-indigo-300';
    case 'OPEN':
      return 'text-[#64499D] dark:text-[#C4B5FD]';
    case 'PENDING':
      return 'text-amber-700 dark:text-amber-300';
    case 'CLOSED':
      return 'text-slate-600 dark:text-slate-300';
    case 'CANCELLED':
      return 'text-rose-700 dark:text-rose-300';
    case 'ARCHIVED':
      return 'text-slate-500 dark:text-slate-400';
    default:
      return 'text-slate-500 dark:text-slate-400';
  }
}

function caseTypeLabel(
  caseType: string | null | undefined,
  labels: { admin: string; consultation: string; litigation: string }
): string {
  const t = String(caseType || '').toUpperCase();
  if (t === 'LITIGATION') return labels.litigation;
  if (t === 'CONSULTATION') return labels.consultation;
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return labels.admin;
  return '';
}

const surface =
  'rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

const sectionTitleClass =
  'text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white';

type AssignDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseItem: CaseItem | null;
  onAssigned: () => void;
};

const AssignDialog: React.FC<AssignDialogProps> = ({ open, onOpenChange, caseItem, onAssigned }) => {
  const { t } = useAppTranslation();
  const p = t.profile;
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | ''>('');
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGetCabinetMembers()
      .then((res) => {
        const actives = (res.data || []).filter((m: API.CabinetMember) => m.is_active);
        setMembers(actives);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleAssign = async () => {
    if (!caseItem || !selectedId) return;
    setLoading(true);
    try {
      await apiUpdateCase({ id: Number(caseItem.id), assigned_to: selectedId });
      toast({ title: p.caseAssigned, description: p.caseAssignedDesc });
      onOpenChange(false);
      onAssigned();
    } catch {
      toast({ title: p.assignmentFailed, description: p.assignmentFailedDesc, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{p.assignTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium text-slate-700 dark:text-slate-300">
              {caseItem?.title || caseItem?.reference || `Case #${caseItem?.id}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{p.assignHint}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">{p.assignee}</label>
            <select
              value={selectedId as string}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              disabled={loading}
            >
              <option value="" disabled>
                {p.selectMember}
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} {m.is_active ? '' : p.inactiveSuffix}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAssign} disabled={loading || !selectedId}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {p.assignCase}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function ProfileWorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-1 pb-12 sm:px-2">
      <div className={cn(surface, 'mb-6 p-4 sm:p-5')}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
          <div className="hidden gap-2 sm:flex">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Skeleton className="h-[640px] w-full rounded-2xl" />
        <Skeleton className="h-[640px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

const TeamMemberProfile: React.FC<Props> = ({ profile, onUpdateSuccess }) => {
  const navigate = useNavigate();
  const { t, tf, enumLabel, lang } = useAppTranslation();
  const p = t.profile;
  const cabinetUpdateRef = useRef<CabinetMemberUpdateModalRef>(null);
  const caseUpdateRef = useRef<CaseUpdateModalRef>(null);
  const caseDeleteRef = useRef<CaseDeleteModalRef>(null);

  const { user } = useUserStore();
  const { toast } = useToast();

  const isOwnProfile = user?.id === profile.id;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || p.unnamed;
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '•';
  const roleRaw = profile.role;
  const positionFallback = String((profile as { position?: string }).position || '').trim();
  const roleDisplay = roleRaw ? t.team.roles[roleRaw] || String(roleRaw) : positionFallback;
  const dept = String((profile as { department?: string }).department || '').trim();
  const cabinetName = [
    user?.trade_name,
    user?.firm_name,
    (user as { cabinet_name?: string } | null)?.cabinet_name,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean);

  const imageUrl = useMemo(() => {
    const fromProfile = getPersonImage(profile as unknown as Record<string, unknown>);
    const fromSession = isOwnProfile ? user?.image : undefined;
    return resolveMediaUrl(fromSession || fromProfile);
  }, [isOwnProfile, user?.image, profile]);

  const [countsLoading, setCountsLoading] = useState(true);
  const [allCases, setAllCases] = useState<CaseItem[]>([]);
  const [visible, setVisible] = useState<CaseItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusValue>('ALL');

  const [counts, setCounts] = useState<Record<StatusValue | 'TOTAL', number>>({
    ALL: 0,
    IN_PROGRESS: 0,
    OPEN: 0,
    PENDING: 0,
    CLOSED: 0,
    CANCELLED: 0,
    ARCHIVED: 0,
    TOTAL: 0,
  });

  const fmtDate = (d?: string | Date) => {
    if (!d) return p.emDash;
    const formatted = formatI18nDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
    return formatted || p.emDash;
  };

  const fmtShortDate = (d?: string | Date | null) => {
    if (!d) return p.emDash;
    const formatted = formatI18nDate(d, lang, { day: 'numeric', month: 'short' });
    return formatted || p.emDash;
  };

  const workloadStats = useMemo(() => {
    const activeStatuses = new Set(['OPEN', 'IN_PROGRESS', 'PENDING']);
    let activeCases = 0;
    let tasks = 0;
    let appointments = 0;
    let overdue = 0;
    for (const c of allCases) {
      const st = (c.status || '').toUpperCase();
      if (activeStatuses.has(st)) activeCases += 1;
      const full = c as CaseItem & API.Case;
      tasks += full._counts?.tasks ?? 0;
      appointments += full._counts?.appointments ?? 0;
      const filterDate = getCaseDateForFilter(full as API.Case);
      const days = getCountdownDays(filterDate);
      if (filterDate && days != null && days < 0 && !['CLOSED', 'CANCELLED', 'ARCHIVED'].includes(st)) {
        overdue += 1;
      }
    }
    return { activeCases, tasks, appointments, overdue };
  }, [allCases]);

  const capacity = useMemo(() => capacityFromTotal(counts.TOTAL), [counts.TOTAL]);

  const refreshCases = async () => {
    setCountsLoading(true);
    try {
      const pageSize = 100;
      let page = 1;
      let lastPage = 1;
      const acc: CaseItem[] = [];
      while (true) {
        const res = await apiGetCases({
          page,
          page_size: pageSize,
          assignedTo: profile.id,
          ordering: '-created',
        });
        const data = res.data;
        acc.push(...(data.results || []));
        lastPage = data.last_page ?? 1;
        if (page >= lastPage) break;
        page += 1;
      }
      const initial = {
        ALL: 0,
        IN_PROGRESS: 0,
        OPEN: 0,
        PENDING: 0,
        CLOSED: 0,
        CANCELLED: 0,
        ARCHIVED: 0,
        TOTAL: 0,
      } as Record<StatusValue | 'TOTAL', number>;
      acc.forEach((c) => {
        initial.ALL += 1;
        initial.TOTAL += 1;
        const s = (c.status || '').toUpperCase() as StatusValue;
        if (s && s in initial) initial[s] += 1;
      });
      const sorted = acc
        .map((c) => ({ ...c, _createdKey: (c.created || c.created_at || '') as string }))
        .sort(
          (a, b) => new Date(b._createdKey || 0).getTime() - new Date(a._createdKey || 0).getTime()
        );
      setAllCases(sorted);
      setCounts(initial);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    refreshCases();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [profile.id]);

  useEffect(() => {
    let rows = allCases;
    if (selectedStatus !== 'ALL') {
      rows = rows.filter((c) => (c.status || '').toUpperCase() === selectedStatus);
    }
    setVisible(rows.slice(0, 8));
  }, [allCases, selectedStatus]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<CaseItem | null>(null);

  const openAssign = (c: CaseItem) => {
    setAssignTarget(c);
    setAssignOpen(true);
  };
  const afterMutate = () => {
    refreshCases();
  };

  const viewCase = (c: CaseItem) => {
    const id = Number(c.id);
    if (!Number.isFinite(id)) return;
    void navigateToCase(navigate, {
      id,
      title: c.title,
      reference: c.reference,
      caseType: c.caseType,
      case_type: c.case_type,
    });
  };
  const editCase = (c: CaseItem) => caseUpdateRef.current?.show(c as API.Case);
  const deleteCase = (c: CaseItem) => caseDeleteRef.current?.show(c as API.Case);
  const printCase = () => window.print();

  const copyValue = (text: string, label: string) => {
    if (!text || text === p.emDash) return;
    void navigator.clipboard.writeText(text).then(() => {
      toast({ title: tf(p.copied, { label }) });
    });
  };

  const openEdit = () => cabinetUpdateRef.current?.show(profile);
  const contactHref = !isOwnProfile
    ? profile.email?.trim()
      ? `mailto:${profile.email.trim()}`
      : profile.phone?.trim()
        ? `tel:${profile.phone.trim()}`
        : undefined
    : undefined;

  const casesHref = `/dashboard/cases?assigned_to=${profile.id}`;

  const contactRows = [
    {
      icon: Mail,
      label: p.email,
      value: profile.email?.trim() || '',
      href: profile.email ? `mailto:${profile.email}` : undefined,
    },
    {
      icon: Phone,
      label: p.phone,
      value: profile.phone?.trim() || '',
      href: profile.phone ? `tel:${profile.phone}` : undefined,
    },
    {
      icon: MapPin,
      label: p.address,
      value: profile.address?.trim() || '',
    },
    ...(profile.country?.trim()
      ? [
          {
            icon: Globe,
            label: p.country,
            value: profile.country.trim(),
          },
        ]
      : []),
    {
      icon: Calendar,
      label: p.joined,
      value: fmtDate(profile.date_joined),
      copyable: false,
    },
  ];

  const overviewRows = [
    roleDisplay ? { label: p.role, value: roleDisplay } : null,
    cabinetName ? { label: p.cabinet, value: cabinetName } : null,
    profile.date_joined ? { label: p.activeSince, value: fmtDate(profile.date_joined) } : null,
    !countsLoading
      ? {
          label: p.assignedWorkload,
          value:
            counts.TOTAL === 1
              ? p.assignedWorkloadValueOne
              : tf(p.assignedWorkloadValue, { count: counts.TOTAL }),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const quickActions: Array<{
    key: string;
    label: string;
    to?: string;
    onClick?: () => void;
  }> = [
    { key: 'cases', label: p.viewAllCases, to: casesHref },
    { key: 'tasks', label: isOwnProfile ? p.viewMyTasks : p.viewTasks, to: '/dashboard/tasks' },
    { key: 'appointments', label: p.viewAppointments, to: '/dashboard/appointments' },
    ...(isOwnProfile
      ? [{ key: 'settings', label: p.profileSettings, to: '/dashboard/account' }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-1 pb-12 sm:px-2">
      <section className={cn(surface, 'mb-6 p-4 sm:px-5 sm:py-4')}>
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="relative shrink-0">
            <div
              className={cn(
                'h-[64px] w-[64px] overflow-hidden rounded-full bg-white sm:h-[72px] sm:w-[72px]',
                'ring-2 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800'
              )}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#64499D] to-[#3E2D71] text-lg font-semibold text-white sm:text-xl">
                  {initials}
                </div>
              )}
            </div>
            <span
              className={cn(
                'absolute bottom-0.5 end-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900',
                profile.is_active ? 'bg-emerald-500' : 'bg-slate-400'
              )}
              aria-hidden
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                {fullName}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                {(roleDisplay || dept) && (
                  <span className={cn('font-medium', roleTone(roleRaw))}>
                    {[roleDisplay, dept].filter(Boolean).join(' · ')}
                  </span>
                )}
                {(roleDisplay || dept) && (
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                    ·
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    profile.is_active
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      profile.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                    )}
                    aria-hidden
                  />
                  {profile.is_active ? p.statusActive : p.statusInactive}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {contactHref && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-[#64499D]/40 px-3 text-[#64499D] hover:bg-[#64499D]/10 dark:border-[#C4B5FD]/40 dark:text-[#C4B5FD] dark:hover:bg-[#C4B5FD]/10"
                >
                  <a href={contactHref}>
                    <Phone className="h-3.5 w-3.5" />
                    {p.contact}
                  </a>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-md bg-[#64499D] px-3 text-white hover:bg-[#543d86] dark:bg-[#7C6BB8] dark:hover:bg-[#8B6FD1]"
                onClick={openEdit}
              >
                <Edit className="h-3.5 w-3.5" />
                {p.editProfile}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className={cn(surface, 'order-2 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 lg:order-1')}>
          <section id="profile-contact-section" className="scroll-mt-24 p-6">
            <h2 className={sectionTitleClass}>{p.contactInformation}</h2>
            <div className="mt-5">
              {contactRows.map((row) => {
                const display = row.value || p.emDash;
                const canCopy = display !== p.emDash && (row as { copyable?: boolean }).copyable !== false;
                return (
                  <div
                    key={row.label}
                    className="group flex gap-3 border-b border-slate-100 py-3.5 first:pt-0 last:border-0 last:pb-0 dark:border-slate-800"
                  >
                    <div className="mt-0.5 text-[#64499D] dark:text-[#C4B5FD]">
                      <row.icon className="h-4 w-4 shrink-0" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{row.label}</p>
                      {row.href && row.value ? (
                        <a
                          href={row.href}
                          className="mt-0.5 block truncate text-sm font-semibold text-slate-900 transition-colors hover:text-[#64499D] dark:text-slate-100 dark:hover:text-[#C4B5FD]"
                        >
                          {display}
                        </a>
                      ) : (
                        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {display}
                        </p>
                      )}
                    </div>
                    {canCopy && (
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 transition-opacity hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35 dark:hover:bg-slate-800 sm:opacity-0 sm:group-hover:opacity-100"
                        onClick={() => copyValue(display, row.label)}
                        aria-label={tf(p.copyAria, { label: row.label })}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {overviewRows.length > 0 && (
            <section className="p-6">
              <h2 className={sectionTitleClass}>{p.professionalOverview}</h2>
              <dl className="mt-5 space-y-3.5">
                {overviewRows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[12px] text-slate-500 dark:text-slate-400">{row.label}</dt>
                    <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="p-6">
            <h2 className={sectionTitleClass}>{p.workload}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                {
                  icon: FolderOpen,
                  label: p.activeCases,
                  value: workloadStats.activeCases,
                  tone: 'text-indigo-600 dark:text-indigo-400',
                  bg: 'bg-indigo-500/10',
                },
                {
                  icon: CheckSquare,
                  label: p.tasks,
                  value: workloadStats.tasks,
                  tone: 'text-emerald-600 dark:text-emerald-400',
                  bg: 'bg-emerald-500/10',
                },
                {
                  icon: CalendarClock,
                  label: p.appointments,
                  value: workloadStats.appointments,
                  tone: 'text-blue-600 dark:text-blue-400',
                  bg: 'bg-blue-500/10',
                },
                {
                  icon: AlarmClock,
                  label: p.overdue,
                  value: workloadStats.overdue,
                  tone: 'text-rose-600 dark:text-rose-400',
                  bg: 'bg-rose-500/10',
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50/90 px-3.5 py-3.5 dark:bg-slate-950/50">
                  <div className={cn('mb-2 inline-flex rounded-lg p-1.5', s.bg)}>
                    <s.icon className={cn('h-3.5 w-3.5', s.tone)} aria-hidden />
                  </div>
                  <p className="text-[1.35rem] font-semibold tabular-nums leading-none text-slate-900 dark:text-white">
                    {countsLoading ? p.emDash : s.value}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.capacity}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {countsLoading ? p.emDash : `${Math.round(capacity.fillPct)}%`}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-valuenow={Math.round(capacity.fillPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={p.capacity}
              >
                <div
                  className={cn('h-full rounded-full transition-all duration-500', capacity.barClass)}
                  style={{ width: `${capacity.fillPct}%` }}
                />
              </div>
              <p className={cn('mt-2 text-[11px] font-semibold tracking-wide', capacityPillTone(capacity.key))}>
                {p.capacityLevels[capacity.key]} · {p.capacityLabels[capacity.key]}
              </p>
            </div>
          </section>

          <section className="p-6">
            <h2 className={sectionTitleClass}>{p.quickActions}</h2>
            <nav className="mt-3" aria-label={p.quickActions}>
              <ul className="flex flex-col">
                {quickActions.map((action) => {
                  const rowClass =
                    'group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-[#C4B5FD]';
                  const inner = (
                    <>
                      <span>{action.label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#64499D] motion-reduce:group-hover:translate-x-0 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 dark:group-hover:text-[#C4B5FD]" />
                    </>
                  );
                  return (
                    <li key={action.key}>
                      {action.to ? (
                        <Link to={action.to} className={rowClass}>
                          {inner}
                        </Link>
                      ) : (
                        <button type="button" onClick={action.onClick} className={rowClass}>
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </section>
        </aside>

        <section className={cn(surface, 'order-1 p-6 sm:p-7 lg:order-2')}>
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {p.assignedCases}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {countsLoading
                  ? t.common.loading
                  : counts.TOTAL === 1
                    ? p.totalCasesOne
                    : tf(p.totalCases, { count: counts.TOTAL })}
              </p>
            </div>
            <Link
              to={casesHref}
              className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-[#64499D] transition-colors hover:text-[#543d86] dark:text-[#C4B5FD]"
            >
              {p.viewAll}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </Link>
          </div>

          <div
            className="mb-5 flex flex-wrap gap-2"
            role="tablist"
            aria-label={p.filterByStatus}
          >
            {STATUS.map(({ value }) => {
              const active = selectedStatus === value;
              const count = value === 'ALL' ? counts.ALL : (counts as Record<string, number>)[value] ?? 0;
              const label =
                value === 'ALL' ? p.filterAll : enumLabel('caseStatus', value) || value.replace(/_/g, ' ');
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  onClick={() => setSelectedStatus(value)}
                  className={cn(
                    'inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/35',
                    active
                      ? 'bg-[#64499D] text-white shadow-sm dark:bg-[#7C6BB8]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                  aria-pressed={active}
                >
                  <span>{label}</span>
                  <span className={cn('tabular-nums', active ? 'opacity-90' : 'opacity-70')}>
                    {countsLoading ? '…' : count}
                  </span>
                </button>
              );
            })}
          </div>

          {countsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#64499D]" />
              <p className="text-xs font-medium">{p.loadingCases}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                <Briefcase className="h-7 w-7 text-slate-400 dark:text-slate-500" aria-hidden />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{p.noCasesTitle}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{p.noCasesHint}</p>
            </div>
          ) : (
            <div className="max-h-[min(560px,70vh)] space-y-2.5 overflow-y-auto pe-0.5">
              {visible.map((c) => {
                const full = c as CaseItem & API.Case;
                const ct = full.caseType ?? full.case_type;
                const statusKey = (c.status || '').toUpperCase();
                const keyDate = getCaseDateForFilter(full as API.Case) || c.created || c.created_at;
                const days = getCountdownDays(keyDate);
                const style = days != null ? getCountdownStyle(days) : 'normal';
                const dateCls =
                  style === 'critical'
                    ? 'text-red-700 font-semibold dark:text-red-400'
                    : style === 'warning'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400';
                const clientName = clientDisplayName(full.client);
                const typeLabel = caseTypeLabel(ct, t.cases.typeLabels);
                const categoryLabel = c.category ? enumLabel('caseCategory', c.category) || c.category : '';
                const statusLabel = enumLabel('caseStatus', statusKey) || (c.status || p.emDash).replace(/_/g, ' ');
                const ref = c.reference
                  ? `Ref: ${c.reference.startsWith('#') ? c.reference : `#${c.reference}`}`
                  : '';
                const meta = [ref, typeLabel, categoryLabel, fmtShortDate(keyDate)].filter(
                  (part, i, arr) => Boolean(part) && arr.indexOf(part) === i
                );

                return (
                  <article
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => viewCase(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        viewCase(c);
                      }
                    }}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border border-slate-200/90 bg-white px-4 py-3.5',
                      'transition-[border-color,box-shadow,background-color,transform] duration-200',
                      'hover:-translate-y-px hover:border-[#64499D]/40 hover:bg-[#F7F4FF] hover:shadow-[0_6px_18px_rgba(100,73,157,0.10)] motion-reduce:hover:translate-y-0',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                      'dark:border-slate-800 dark:bg-slate-900 dark:hover:border-[#8B6FD1]/45 dark:hover:bg-[#24183F]/40'
                    )}
                    aria-label={c.title || c.reference || `${p.openCase} ${c.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
                            statusTextClass(statusKey)
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(statusKey))} aria-hidden />
                          {statusLabel}
                        </span>
                        {showPriorityPill(full.priority) && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                            {enumLabel('taskPriority', String(full.priority).toLowerCase()) || full.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:bg-slate-800"
                              aria-label={p.moreActions}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                viewCase(c);
                              }}
                              className="rounded-lg"
                            >
                              <ArrowUpRight className="me-2 h-4 w-4" />
                              {p.viewDetails}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                editCase(c);
                              }}
                              className="rounded-lg"
                            >
                              <Edit className="me-2 h-4 w-4" />
                              {t.common.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssign(c);
                              }}
                              className="rounded-lg"
                            >
                              {p.assignCase}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                printCase();
                              }}
                              className="rounded-lg"
                            >
                              {p.print}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCase(c);
                              }}
                              className="rounded-lg text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                            >
                              {t.common.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <span
                          className="p-1.5 text-slate-400 transition-colors group-hover:text-[#64499D] dark:group-hover:text-[#C4B5FD]"
                          aria-hidden
                        >
                          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#64499D] dark:text-white dark:group-hover:text-[#C4B5FD]">
                      {c.title || c.reference || `Case #${c.id}`}
                    </h3>
                    <p className={cn('mt-1 text-[11px]', dateCls)}>
                      {meta.map((part, i) => (
                        <React.Fragment key={`${part}-${i}`}>
                          {i > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
                          <span className={i === meta.length - 1 ? dateCls : 'text-slate-500 dark:text-slate-400'}>
                            {part}
                          </span>
                        </React.Fragment>
                      ))}
                    </p>
                    {clientName ? (
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {p.client}: <span className="font-medium text-slate-700 dark:text-slate-300">{clientName}</span>
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {!countsLoading && visible.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <Link
                to={casesHref}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
                  'text-[#64499D] transition-colors hover:bg-[#64499D]/10 dark:text-[#C4B5FD] dark:hover:bg-[#C4B5FD]/10'
                )}
              >
                {p.viewAllAssigned}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      </div>

      <CabinetMemberUpdateModal ref={cabinetUpdateRef} onSuccess={onUpdateSuccess} />
      <CaseUpdateModal ref={caseUpdateRef} onSuccess={afterMutate} />
      <CaseDeleteModal ref={caseDeleteRef} onSuccess={afterMutate} />
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        caseItem={assignTarget}
        onAssigned={afterMutate}
      />
    </div>
  );
};

export default TeamMemberProfile;
