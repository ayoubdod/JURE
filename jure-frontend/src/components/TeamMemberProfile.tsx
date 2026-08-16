import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import {
  Phone,
  Mail,
  Edit,
  MapPin,
  Calendar,
  Briefcase,
  Loader2,
  ArrowUpRight,
  MoreVertical,
  Copy,
  ArrowRight,
  FolderOpen,
  CheckSquare,
  CalendarClock,
  AlarmClock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CabinetMemberUpdateModal, { CabinetMemberUpdateModalRef } from './cabinet-member/CabinetMemberUpdateModal';
import CaseUpdateModal, { CaseUpdateModalRef } from '@/components/case/CaseUpdateModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import { apiGetCases, apiUpdateCase } from '@/services/case/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { getRoleDisplayName } from '@/utils/permissions';
import { cn } from '@/lib/utils';
import { navigateToCase } from '@/lib/caseRoutes';
import { useNavigate } from 'react-router';
import {
  getCaseDateForFilter,
  getCountdownDays,
  getCountdownStyle,
  getStatusColor,
} from '@/utils/caseCardHelpers';
import { TaskPriority } from '@/utils/constants';

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
  _counts?: API.CaseRelatedCounts | null;
};

const STATUS = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;
type StatusValue = (typeof STATUS)[number]['value'];

const fmtDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtShortDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

function caseLeftBorderClass(caseType?: string | null): string {
  const t = String(caseType || '').toUpperCase();
  if (t === 'LITIGATION') return 'border-l-rose-500';
  if (t === 'CONSULTATION') return 'border-l-indigo-500';
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return 'border-l-amber-400';
  return 'border-l-purple-500';
}

function caseTypeDotClass(caseType?: string | null): string {
  const t = String(caseType || '').toUpperCase();
  if (t === 'LITIGATION') return 'bg-rose-500';
  if (t === 'CONSULTATION') return 'bg-indigo-500';
  if (t === 'ADMINISTRATIVE_DUTY' || t === 'ADMINISTRATIVE') return 'bg-amber-400';
  return 'bg-purple-500';
}

function showPriorityPill(p?: string | null): boolean {
  if (p == null) return false;
  const u = String(p).toLowerCase();
  return u === 'high' || u === 'urgent' || p === TaskPriority.HIGH;
}

function filterPillSelectedClass(value: StatusValue): string {
  switch (value) {
    case 'IN_PROGRESS':
      return 'bg-indigo-600 text-white shadow-sm';
    case 'OPEN':
      return 'bg-emerald-600 text-white shadow-sm';
    case 'PENDING':
      return 'bg-amber-500 text-slate-900 shadow-sm';
    case 'CLOSED':
      return 'bg-slate-500 text-white shadow-sm';
    case 'CANCELLED':
      return 'bg-rose-600 text-white shadow-sm';
    case 'ARCHIVED':
      return 'bg-slate-600 text-white shadow-sm';
    case 'ALL':
    default:
      return 'bg-[#64499D] text-white shadow-sm';
  }
}

function rolePillClass(role?: API.Role | string): string {
  const r = String(role || '').toUpperCase();
  if (r === 'OWNER') return 'border-amber-400/80 bg-amber-50/80 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-400/50';
  if (r === 'ADMIN')
    return 'border-slate-400/80 bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-500/50';
  if (r === 'MANAGER') return 'border-purple-400/80 bg-purple-50/90 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-500/50';
  if (r === 'LAWYER') return 'border-indigo-400/80 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-500/50';
  if (r === 'ASSISTANT') return 'border-teal-400/80 bg-teal-50/80 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-500/50';
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function capacityFromTotal(total: number): {
  key: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
  label: string;
  pillLabel: string;
  barClass: string;
  fillPct: number;
} {
  if (total <= 3) {
    return {
      key: 'LOW',
      label: 'Light',
      pillLabel: 'LOW',
      barClass: 'bg-emerald-500',
      fillPct: Math.min(100, (total / 10) * 100),
    };
  }
  if (total <= 6) {
    return {
      key: 'MEDIUM',
      label: 'Moderate',
      pillLabel: 'MEDIUM',
      barClass: 'bg-blue-500',
      fillPct: Math.min(100, (total / 10) * 100),
    };
  }
  if (total <= 10) {
    return {
      key: 'HIGH',
      label: 'Heavy',
      pillLabel: 'HIGH',
      barClass: 'bg-amber-500',
      fillPct: Math.min(100, (total / 10) * 100),
    };
  }
  return {
    key: 'OVERLOADED',
    label: 'Overloaded',
    pillLabel: 'OVERLOADED',
    barClass: 'bg-red-500',
    fillPct: 100,
  };
}

function capacityPillTone(key: string): string {
  const k = key.toUpperCase();
  if (k === 'LOW') return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 ring-emerald-500/30';
  if (k === 'MEDIUM') return 'text-blue-700 dark:text-blue-400 bg-blue-500/15 ring-blue-500/30';
  if (k === 'HIGH') return 'text-amber-800 dark:text-amber-400 bg-amber-500/15 ring-amber-500/30';
  return 'text-red-700 dark:text-red-400 bg-red-500/15 ring-red-500/30';
}

// ─────────────── Assign dialog (inline) ───────────────
type AssignDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseItem: CaseItem | null;
  onAssigned: () => void;
};
const AssignDialog: React.FC<AssignDialogProps> = ({ open, onOpenChange, caseItem, onAssigned }) => {
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
      await apiUpdateCase({ id: caseItem.id as any, assigned_to: selectedId } as any);
      toast({ title: 'Case assigned', description: 'The case has been assigned successfully.' });
      onOpenChange(false);
      onAssigned();
    } catch {
      toast({ title: 'Assignment failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign case</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <div className="text-slate-700 dark:text-slate-300 font-medium">
              {caseItem?.title || caseItem?.reference || `Case #${caseItem?.id}`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Choose an active team member</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Assignee</label>
            <select
              value={selectedId as any}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              disabled={loading}
            >
              <option value="" disabled>
                Select a member
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} {m.is_active ? '' : '(inactive)'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={loading || !selectedId}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const cardShell =
  'rounded-xl border border-[#e5e7eb] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]';

const sectionHeaderClass =
  'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7280] dark:text-slate-400 pb-2 border-b border-slate-200/90 dark:border-slate-800';

// ─────────────── Main component ───────────────
const TeamMemberProfile: React.FC<Props> = ({ profile, onUpdateSuccess }) => {
  const navigate = useNavigate();
  const cabinetUpdateRef = useRef<CabinetMemberUpdateModalRef>(null);
  const caseUpdateRef = useRef<CaseUpdateModalRef>(null);
  const caseDeleteRef = useRef<CaseDeleteModalRef>(null);

  const { user } = useUserStore();
  const { toast } = useToast();

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed';
  const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '•';
  const roleRaw = (profile as API.CabinetMember).role;
  const positionFallback = String((profile as { position?: string }).position || '').trim();
  const roleDisplay = roleRaw
    ? getRoleDisplayName(roleRaw)
    : positionFallback || '—';
  const dept = (profile as { department?: string }).department as string | undefined;

  const imageUrl = useMemo(() => {
    if (user?.id === profile.id && user?.image) return user.image;
    return (
      (profile as { image?: string }).image ||
      (profile as { avatar?: string }).avatar ||
      (profile as { photo?: string }).photo ||
      (profile as { photo_url?: string }).photo_url ||
      null
    );
  }, [user?.id, user?.image, profile]);

  const [countsLoading, setCountsLoading] = useState(true);
  const [allCases, setAllCases] = useState<CaseItem[]>([]);
  const [visible, setVisible] = useState<CaseItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusValue>('IN_PROGRESS');

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
      if (
        filterDate &&
        days != null &&
        days < 0 &&
        !['CLOSED', 'CANCELLED', 'ARCHIVED'].includes(st)
      ) {
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
          (a, b) =>
            new Date(b._createdKey || 0).getTime() - new Date(a._createdKey || 0).getTime()
        );
      setAllCases(sorted);
      setCounts(initial);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    refreshCases();
    /* eslint-disable-next-line */
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
  const editCase = (c: CaseItem) => caseUpdateRef.current?.show(c as any);
  const deleteCase = (c: CaseItem) => caseDeleteRef.current?.show(c as any);
  const printCase = (c: CaseItem) => window.print();

  const copyValue = (text: string, label: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied` });
    });
  };

  const scrollToContact = () => {
    document.getElementById('profile-contact-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const caseRowDate = (c: CaseItem) => {
    const full = c as CaseItem & API.Case;
    const keyDate = getCaseDateForFilter(full as API.Case) || (c.created || c.created_at);
    const days = getCountdownDays(keyDate);
    const style = days != null ? getCountdownStyle(days) : 'normal';
    const cls =
      style === 'critical'
        ? 'text-red-700 dark:text-red-400 font-semibold'
        : style === 'warning'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-slate-500 dark:text-slate-400';
    return { keyDate, cls, label: fmtShortDate(keyDate) };
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header card — full width */}
      <div className={cn('relative overflow-hidden mb-6', cardShell)}>
        <div
          className="relative h-[180px] md:h-[180px] bg-gradient-to-br from-[#5b3d9e] via-[#4f46e5] to-[#0d9488] overflow-hidden"
          aria-hidden
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />

          {profile.id === user?.id && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/30 hover:bg-black/40 backdrop-blur text-white border border-white/30 shadow-sm"
                onClick={() => cabinetUpdateRef.current?.show(profile)}
                type="button"
                aria-label="Edit profile"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="relative px-4 sm:px-8 pb-8">
          <div className="flex justify-center -mt-12 mb-6">
            <div className="relative">
              <div
                className={cn(
                  'rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-900 bg-white dark:bg-slate-900',
                  'shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
                  'h-[72px] w-[72px] md:h-24 md:w-24'
                )}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#64499D] to-[#3b2b66] text-white text-2xl md:text-3xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900',
                  'h-[14px] w-[14px]',
                  profile.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{fullName}</h1>
              {roleRaw ? (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] border',
                    rolePillClass(roleRaw)
                  )}
                >
                  {roleDisplay}
                </span>
              ) : positionFallback ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {positionFallback}
                </span>
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                  profile.is_active
                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:ring-emerald-800/60'
                    : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {dept && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{dept}</p>
            )}

            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px] border-[#64499D] text-[#64499D] hover:bg-[#64499D]/10 dark:border-[#E9E0FF] dark:text-[#E9E0FF]"
                onClick={scrollToContact}
              >
                <Phone className="w-4 h-4 mr-2" /> Contact
              </Button>
              {profile.id !== user?.id && (
                <Button
                  variant="outline"
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 rounded-[10px]"
                  onClick={() => cabinetUpdateRef.current?.show(profile)}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-6 items-start">
        {/* LEFT */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div id="profile-contact-section" className={cn('p-5', cardShell)}>
            <p className={sectionHeaderClass}>Contact</p>
            <div className="mt-4 space-y-0">
              {[
                {
                  icon: Mail,
                  label: 'Email',
                  value: profile.email,
                  href: profile.email ? `mailto:${profile.email}` : undefined,
                },
                {
                  icon: Phone,
                  label: 'Phone',
                  value: profile.phone,
                  href: profile.phone ? `tel:${profile.phone}` : undefined,
                },
                {
                  icon: MapPin,
                  label: 'Address',
                  value: profile.address?.trim() ? profile.address : '—',
                },
                {
                  icon: Calendar,
                  label: 'Joined',
                  value: fmtDate(profile.date_joined as string),
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="group flex gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 first:pt-0"
                >
                  <div className="mt-0.5 text-[#64499D] dark:text-[#E9E0FF]">
                    <row.icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {row.label}
                    </p>
                    {row.href ? (
                      <a
                        href={row.href}
                        className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-[#64499D] dark:hover:text-[#E9E0FF] transition-colors"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words">
                        {row.value}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={() => copyValue(String(row.value || ''), row.label)}
                    aria-label={`Copy ${row.label}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('p-5', cardShell)}>
            <p className={sectionHeaderClass}>Workload</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  icon: FolderOpen,
                  label: 'Active Cases',
                  value: workloadStats.activeCases,
                  color: 'text-indigo-600 dark:text-indigo-400',
                  bg: 'bg-indigo-500/10',
                },
                {
                  icon: CheckSquare,
                  label: 'Tasks',
                  value: workloadStats.tasks,
                  color: 'text-emerald-600 dark:text-emerald-400',
                  bg: 'bg-emerald-500/10',
                },
                {
                  icon: CalendarClock,
                  label: 'Appointments',
                  value: workloadStats.appointments,
                  color: 'text-blue-600 dark:text-blue-400',
                  bg: 'bg-blue-500/10',
                },
                {
                  icon: AlarmClock,
                  label: 'Overdue',
                  value: workloadStats.overdue,
                  color: 'text-rose-600 dark:text-rose-400',
                  bg: 'bg-rose-500/10',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 p-3"
                >
                  <div className={cn('inline-flex rounded-lg p-1.5 mb-2', s.bg)}>
                    <s.icon className={cn('w-4 h-4', s.color)} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {countsLoading ? '—' : s.value}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacity</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset',
                    capacityPillTone(capacity.key)
                  )}
                >
                  {capacity.pillLabel} · {capacity.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', capacity.barClass)}
                  style={{ width: `${capacity.fillPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className={cn('p-5', cardShell)}>
            <p className={sectionHeaderClass}>Quick actions</p>
            <div className="mt-4 flex flex-col gap-2">
              {profile.id !== user?.id && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start rounded-[10px] border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => cabinetUpdateRef.current?.show(profile)}
                >
                  <Edit className="w-4 h-4 mr-2 shrink-0" />
                  Edit profile
                </Button>
              )}
              <a
                href={`/dashboard/cases?assigned_to=${profile.id}`}
                className={cn(
                  'inline-flex w-full items-center justify-start rounded-[10px] border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                )}
              >
                <Briefcase className="w-4 h-4 mr-2 shrink-0" />
                View all cases
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT — Assigned cases */}
        <div className={cn('p-5', cardShell, 'order-1 lg:order-2')}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Cases</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {countsLoading ? 'Loading...' : `${counts.TOTAL} total case${counts.TOTAL !== 1 ? 's' : ''}`}
              </p>
            </div>
            <a
              href={`/dashboard/cases?assigned_to=${profile.id}`}
              className="text-sm font-semibold text-[#64499D] dark:text-[#E9E0FF] hover:underline shrink-0 self-start"
            >
              View all →
            </a>
          </div>

          <div className="mb-5">
            <div
              className="flex flex-wrap gap-2 md:gap-2"
              role="tablist"
              aria-label="Filter by case status"
            >
              {STATUS.map(({ value, label }) => {
                const active = selectedStatus === value;
                const count = value === 'ALL' ? counts.ALL : (counts as Record<string, number>)[value] ?? 0;
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    onClick={() => setSelectedStatus(value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 min-h-[32px]',
                      active
                        ? filterPillSelectedClass(value)
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                    aria-pressed={active}
                  >
                    <span>{label}</span>
                    <span className={cn('tabular-nums', active ? 'opacity-95' : 'opacity-80')}>
                      {countsLoading ? '…' : count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {countsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#64499D]" />
              <p className="text-xs font-medium">Loading cases…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex p-3 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
                <Briefcase className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No cases found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No cases match the selected filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[min(520px,70vh)] overflow-y-auto pr-0.5">
              {visible.map((c) => {
                const full = c as CaseItem & API.Case;
                const ct = full.caseType ?? full.case_type;
                const statusKey = (c.status || '').toUpperCase();
                const dateInfo = caseRowDate(c);
                const prio = full.priority;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => viewCase(c)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && viewCase(c)}
                    className={cn(
                      'group relative rounded-xl border border-[#e5e7eb] dark:border-slate-800 bg-white dark:bg-slate-900',
                      'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
                      'border-l-[3px] pl-4 pr-3 py-3 cursor-pointer',
                      'transition-[transform,box-shadow,border-color] duration-300 ease-out',
                      'hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg',
                      caseLeftBorderClass(ct ?? undefined)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={cn('inline-block h-2 w-2 rounded-full shrink-0', caseTypeDotClass(ct ?? undefined))}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset',
                            getStatusColor(statusKey)
                          )}
                        >
                          {(c.status || '—').replace(/_/g, ' ')}
                        </span>
                        {showPriorityPill(prio) && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] bg-amber-500/12 text-amber-800 dark:text-amber-400 ring-1 ring-inset ring-amber-500/25">
                            {prio}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
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
                              <ArrowUpRight className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                editCase(c);
                              }}
                              className="rounded-lg"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssign(c);
                              }}
                              className="rounded-lg"
                            >
                              Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                printCase(c);
                              }}
                              className="rounded-lg"
                            >
                              Print
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCase(c);
                              }}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 rounded-lg"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#64499D] dark:hover:text-[#E9E0FF] hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewCase(c);
                          }}
                          aria-label="Open case"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#64499D] dark:group-hover:text-[#E9E0FF] transition-colors">
                      {c.title || c.reference || `Case #${c.id}`}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {c.reference && (
                        <span className="font-mono">
                          Ref: {c.reference.startsWith('#') ? c.reference : `#${c.reference}`}
                        </span>
                      )}
                      {c.reference && c.category && <span className="mx-1.5">·</span>}
                      {c.category && <span>{c.category}</span>}
                      {(c.reference || c.category) && <span className="mx-1.5">·</span>}
                      <span className={dateInfo.cls}>{dateInfo.label}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {!countsLoading && visible.length > 0 && (
            <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
              <a
                href={`/dashboard/cases?assigned_to=${profile.id}`}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#64499D] dark:border-[#E9E0FF]/50',
                  'px-4 py-3 text-sm font-semibold text-[#64499D] dark:text-[#E9E0FF]',
                  'hover:bg-[#64499D]/5 dark:hover:bg-[#E9E0FF]/10 hover:border-solid transition-colors'
                )}
              >
                View all assigned cases
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
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
