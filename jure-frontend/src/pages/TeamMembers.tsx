import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Edit,
  Trash2,
  List,
  LayoutGrid,
  BarChart3,
  Send,
  Loader2,
  Eye,
  Users,
  UserCheck,
  Briefcase,
  MailWarning,
  Calendar,
  FolderOpen,
  CheckSquare,
  X,
  UserCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  apiGetCabinetMembers,
  apiGetMyCabinetMember,
  apiResendInvitation,
} from '@/services/cabinet-member/api';
import { apiGetAllCasesFlattened } from '@/services/case/api';
import { hasPermission } from '@/utils/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CabinetMemberCreateModal, {
  CabinetMemberCreateModalRef,
} from '@/components/cabinet-member/CabinetMemberCreateModal';
import CabinetMemberUpdateModal, {
  CabinetMemberUpdateModalRef,
} from '@/components/cabinet-member/CabinetMemberUpdateModal';
import CabinetMemberDeleteModal, {
  CabinetMemberDeleteModalRef,
} from '@/components/cabinet-member/CabinetMemberDeleteModal';
import TeamMemberProfileDrawer, {
  TeamMemberProfileDrawerRef,
} from '@/components/team/TeamMemberProfileDrawer';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { getRoleDisplayName } from '@/utils/permissions';
import { getCabinetMemberRouteId, getMemberWorkloadDisplay } from '@/utils/cabinetMemberHelpers';
import { cn } from '@/lib/utils';

const JURE_PURPLE = '#6D54B5';

const formatDate = (d?: string | Date) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

type ViewMode = 'list' | 'grid' | 'workload';

const ROLE_OPTIONS: (API.Role | '')[] = ['', 'OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER'];
const STATUS_OPTIONS = ['', 'active', 'offline', 'pending'] as const;

const rolePillClass: Record<API.Role, string> = {
  LAWYER:
    'bg-indigo-500/12 text-indigo-800 dark:text-indigo-200 ring-1 ring-indigo-500/25 border-indigo-200/60 dark:border-indigo-500/20',
  MANAGER:
    'bg-purple-500/12 text-purple-800 dark:text-purple-200 ring-1 ring-purple-500/25 border-purple-200/60 dark:border-purple-500/20',
  ADMIN:
    'bg-slate-500/12 text-slate-800 dark:text-slate-200 ring-1 ring-slate-500/25 border-slate-200/60 dark:border-slate-500/20',
  ASSISTANT:
    'bg-teal-500/12 text-teal-800 dark:text-teal-200 ring-1 ring-teal-500/25 border-teal-200/60 dark:border-teal-500/20',
  VIEWER:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-300/50 border-slate-200 dark:border-slate-600',
  OWNER:
    'bg-amber-500/12 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/25 border-amber-200/60 dark:border-amber-500/20',
};

function workloadBarClass(assigned: number): string {
  if (assigned <= 3) return 'bg-emerald-500';
  if (assigned <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function workloadFillPct(assigned: number): number {
  return Math.min(100, (assigned / 10) * 100);
}

const TeamMembers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [roleFilter, setRoleFilter] = useState<API.Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<API.CabinetMember[]>([]);
  const [myCabinetMember, setMyCabinetMember] = useState<API.CabinetMember | null>(null);
  const [resendTarget, setResendTarget] = useState<API.CabinetMember | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [teamHolderEl, setTeamHolderEl] = useState<HTMLDivElement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  /** All cases for the cabinet — used to compute real In progress / Assigned when member list omits counts. */
  const [allCases, setAllCases] = useState<API.Case[] | null>(null);

  const cabinetMemberCreateModalRef = useRef<CabinetMemberCreateModalRef>(null);
  const cabinetMemberUpdateModalRef = useRef<CabinetMemberUpdateModalRef>(null);
  const cabinetMemberDeleteModalRef = useRef<CabinetMemberDeleteModalRef>(null);
  const profileDrawerRef = useRef<TeamMemberProfileDrawerRef>(null);

  const refreshTeamAndCases = () => {
    setLoading(true);
    Promise.all([
      apiGetCabinetMembers({ expand: 'user' }),
      apiGetAllCasesFlattened().catch(() => null),
    ])
      .then(([memRes, cases]) => {
        setTeamMembers(memRes.data);
        setAllCases(cases);
      })
      .finally(() => setLoading(false));
  };

  const refetchCasesOnly = () => {
    apiGetAllCasesFlattened().then(setAllCases).catch(() => {});
  };

  const refetchMembersOnly = () => {
    apiGetCabinetMembers({ expand: 'user' })
      .then((res) => setTeamMembers(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    refreshTeamAndCases();
  }, []);

  useEffect(() => {
    apiGetMyCabinetMember()
      .then((res) => setMyCabinetMember(res.data))
      .catch(() => setMyCabinetMember(null));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsNarrow(mql.matches);
    mql.addEventListener('change', fn);
    fn();
    return () => mql.removeEventListener('change', fn);
  }, []);

  const canManageRoles = hasPermission(
    'team.manage_roles',
    myCabinetMember?.role,
    myCabinetMember?.permissions
  );

  const displayedMembers = teamMembers.filter((m) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = [
        m.first_name,
        m.last_name,
        m.email,
        m.phone,
        m.address,
        (m as any).role,
        (m as any).position,
        (m as any).department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (roleFilter && (m.role || '') !== roleFilter) return false;
    if (statusFilter === 'active' && !m.is_active) return false;
    if (statusFilter === 'offline' && m.is_active) return false;
    if (statusFilter === 'pending' && !(m as any).invitation_sent) return false;
    return true;
  });

  const hasActiveFilters =
    !!searchTerm.trim() || !!roleFilter || !!statusFilter;

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const totalMembers = teamMembers.length;
  const activeCount = teamMembers.filter((m) => m.is_active).length;
  const lawyersCount = teamMembers.filter((m) => m.role === 'LAWYER').length;
  const pendingInviteCount = teamMembers.filter((m) => !!(m as any).invitation_sent).length;

  const handleCall = (member: API.CabinetMember) => {
    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    toast({ title: 'Calling', description: `Calling ${name || 'member'} at ${member.phone || '—'}` });
    if (member.phone) window.location.href = `tel:${member.phone}`;
  };

  const handleEmail = (member: API.CabinetMember) => {
    toast({ title: 'Email', description: `Composing email to ${member.email || '—'}` });
    if (member.email) window.location.href = `mailto:${member.email}`;
  };

  const showResendForMember = (member: API.CabinetMember) =>
    canManageRoles &&
    myCabinetMember != null &&
    member.id !== myCabinetMember.id;

  const handleResendInvitation = async () => {
    if (!resendTarget) return;
    setResendLoading(true);
    try {
      await apiResendInvitation(getCabinetMemberRouteId(resendTarget));
      toast({ title: 'Setup link sent', description: `Setup link sent to ${resendTarget.email}.` });
      setResendTarget(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })
        ?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({
        title: 'Error',
        description: detail || 'Failed to send invitation.',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const isPending = (m: API.CabinetMember) => !!(m as any).invitation_sent;

  const openProfile = (member: API.CabinetMember) => {
    setSelectedMemberId(member.id);
    profileDrawerRef.current?.open(member);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) setSelectedMemberId(null);
  };

  const memberStatusLabel = (m: API.CabinetMember) => {
    if (isPending(m)) return 'pending' as const;
    if (m.is_active) return 'active' as const;
    return 'inactive' as const;
  };

  const statusBadgeClass = (m: API.CabinetMember) => {
    const s = memberStatusLabel(m);
    if (s === 'pending') return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/25';
    if (s === 'active') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/25';
    return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-1 ring-slate-500/25';
  };

  const statusBadgeText = (m: API.CabinetMember) => {
    const s = memberStatusLabel(m);
    if (s === 'pending') return 'Pending';
    if (s === 'active') return 'Active';
    return 'Inactive';
  };

  /* ─── Grid tile ─── */
  const renderTile = (member: API.CabinetMember) => {
    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed';
    const memberRole = (member.role || 'VIEWER') as API.Role;
    const roleDisplay = getRoleDisplayName(memberRole);
    const { inProgress, assignedTotal } = getMemberWorkloadDisplay(member, allCases);
    const pending = isPending(member);
    const selected = selectedMemberId === member.id && detailOpen;

    return (
      <div
        key={member.id}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
          'transition-[transform,box-shadow,border-color] duration-300 ease-out',
          'hover:-translate-y-0.5 hover:border-purple-200/80 dark:hover:border-purple-800/55 hover:shadow-lg hover:shadow-purple-500/15',
          selected && 'ring-2 ring-[#6D54B5]/40 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-purple-500/[0.16] via-violet-500/[0.09] to-indigo-600/[0.2] opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          aria-hidden
        />
        <div className="relative z-[1] flex flex-1 flex-col items-stretch p-4">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <UserAvatar
                image={getPersonImage(member as Record<string, unknown>)}
                firstName={member.first_name}
                lastName={member.last_name}
                size="lg"
              />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950',
                  pending ? 'bg-amber-400' : member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white truncate">
                {fullName}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
                    rolePillClass[memberRole]
                  )}
                >
                  {roleDisplay}
                </span>
                {showResendForMember(member) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResendTarget(member);
                    }}
                    className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-500/25 transition-colors hover:bg-amber-500/25 dark:text-amber-200"
                  >
                    Resend
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200/80 dark:border-slate-800 pt-3">
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span>Joined {formatDate(member.date_joined as string)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <FolderOpen className="h-3.5 w-3.5 opacity-70" aria-hidden />
                In Progress
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{inProgress}</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <CheckSquare className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Assigned
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: JURE_PURPLE }}>
                {assignedTotal}
              </p>
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
                title={`${inProgress} active cases / ${assignedTotal} total assigned`}
              />
            </div>
          </div>
        </div>

        <div className="relative z-[1] mt-auto flex items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            onClick={() => openProfile(member)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-slate-200 dark:border-slate-700"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] p-1.5">
              {showResendForMember(member) && (
                <DropdownMenuItem
                  onClick={() => setResendTarget(member)}
                  className="focus:bg-slate-100 dark:focus:bg-slate-800"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  Resend invitation
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleCall(member)} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                <Phone className="mr-2 h-3.5 w-3.5" />
                Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEmail(member)} className="focus:bg-slate-100 dark:focus:bg-slate-800">
                <Mail className="mr-2 h-3.5 w-3.5" />
                Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => cabinetMemberUpdateModalRef.current?.show(member)}
                className="focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <Edit className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
                onClick={() => cabinetMemberDeleteModalRef.current?.show(member)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  /* ─── List row ─── */
  const renderListRow = (member: API.CabinetMember) => {
    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed';
    const memberRole = (member.role || 'VIEWER') as API.Role;
    const { inProgress, assignedTotal } = getMemberWorkloadDisplay(member, allCases);
    const selected = selectedMemberId === member.id && detailOpen;

    return (
      <tr
        key={member.id}
        className={cn(
          'cursor-pointer border-b border-slate-200/80 dark:border-slate-800 transition-colors',
          'odd:bg-white even:bg-slate-50/90 dark:odd:bg-slate-950 dark:even:bg-slate-900/50',
          'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
          selected && 'bg-indigo-50/80 dark:bg-indigo-950/30'
        )}
        onClick={() => openProfile(member)}
      >
        <td className="px-3 py-3 align-middle">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                image={getPersonImage(member as Record<string, unknown>)}
                firstName={member.first_name}
                lastName={member.last_name}
                size="sm"
                className="h-9 w-9"
              />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-950',
                  isPending(member) ? 'bg-amber-400' : member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{fullName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{member.email || '—'}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 align-middle">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]',
              rolePillClass[memberRole]
            )}
          >
            {getRoleDisplayName(memberRole)}
          </span>
        </td>
        <td className="px-3 py-3 align-middle">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
              statusBadgeClass(member)
            )}
          >
            {statusBadgeText(member)}
          </span>
        </td>
        <td className="px-3 py-3 align-middle text-right tabular-nums text-[13px] font-semibold text-slate-900 dark:text-white">
          {inProgress}
        </td>
        <td className="px-3 py-3 align-middle text-right tabular-nums text-[13px] font-semibold text-slate-900 dark:text-white">
          {assignedTotal}
        </td>
        <td className="px-3 py-3 align-middle text-right">
          <div
            className="ml-auto h-4 w-24 max-w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            title={`${inProgress} active cases / ${assignedTotal} total assigned`}
          >
            <div
              className={cn('h-full rounded-full', workloadBarClass(assignedTotal))}
              style={{ width: `${workloadFillPct(assignedTotal)}%` }}
            />
          </div>
        </td>
        <td className="px-3 py-3 align-middle whitespace-nowrap text-[12px] text-slate-600 dark:text-slate-400">
          {formatDate(member.date_joined as string)}
        </td>
        <td className="px-3 py-3 align-middle text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {showResendForMember(member) && (
              <button
                type="button"
                onClick={() => setResendTarget(member)}
                className="mr-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200"
              >
                Resend
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => openProfile(member)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] p-1.5">
                {showResendForMember(member) && (
                  <DropdownMenuItem onClick={() => setResendTarget(member)}>
                    <Send className="mr-2 h-3.5 w-3.5" />
                    Resend invitation
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleCall(member)}>
                  <Phone className="mr-2 h-3.5 w-3.5" />
                  Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEmail(member)}>
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cabinetMemberUpdateModalRef.current?.show(member)}>
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                  onClick={() => cabinetMemberDeleteModalRef.current?.show(member)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    );
  };

  /* ─── Workload View ─── */
  const renderWorkloadView = () => {
    const sorted = [...displayedMembers].sort((a, b) => {
      const aTotal = getMemberWorkloadDisplay(a, allCases).assignedTotal;
      const bTotal = getMemberWorkloadDisplay(b, allCases).assignedTotal;
      return bTotal - aTotal;
    });

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {sorted.map((member) => {
            const { inProgress, assignedTotal: total } = getMemberWorkloadDisplay(member, allCases);
            const fullName =
              `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unnamed';
            const memberRole = (member.role || 'VIEWER') as API.Role;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-56">
                  <UserAvatar
                    image={getPersonImage(member as Record<string, unknown>)}
                    firstName={member.first_name}
                    lastName={member.last_name}
                    size="sm"
                    className="h-9 w-9"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{fullName}</p>
                    <span
                      className={cn(
                        'mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        rolePillClass[memberRole]
                      )}
                    >
                      {getRoleDisplayName(memberRole)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {total === 0 ? (
                    <div
                      className="h-6 w-full rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30"
                      title={`${inProgress} active cases / ${total} total assigned`}
                    />
                  ) : (
                    <div
                      className="h-6 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
                      title={`${inProgress} active cases / ${total} total assigned`}
                    >
                      <div
                        className={cn('h-full rounded-md transition-all', workloadBarClass(total))}
                        style={{ width: `${workloadFillPct(total)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:w-48 sm:justify-end">
                  <span className="text-[13px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{total} cases</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openProfile(member)}>
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 px-4 py-3 text-[12px] text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            Low (0–3)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden />
            Medium (4–6)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
            High (7+)
          </span>
        </div>
      </div>
    );
  };

  const statPillClass =
    'group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-px hover:shadow-md';

  return (
    <div
      ref={setTeamHolderEl}
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {/* Page header */}
      <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6D54B5]/10 text-[#6D54B5] dark:bg-[#6D54B5]/20 dark:text-violet-200">
              <UserCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Team Cockpit</h1>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                Manage your firm&apos;s members and workload
              </p>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="h-10 shrink-0 rounded-lg px-4 text-[13px] font-semibold shadow-md shadow-[#6D54B5]/25"
          style={{ backgroundColor: JURE_PURPLE }}
          onClick={() => cabinetMemberCreateModalRef.current?.show()}
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
          Add Member
        </Button>
      </div>

      {/* Stats strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={cn(statPillClass, 'border-l-[3px] border-l-slate-400')}>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Users className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Total Members</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{totalMembers}</p>
          </div>
        </div>
        <div className={cn(statPillClass, 'border-l-[3px] border-l-emerald-500')}>
          <div className="rounded-lg bg-emerald-500/12 p-2 text-emerald-700 dark:text-emerald-400">
            <UserCheck className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Active</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{activeCount}</p>
          </div>
        </div>
        <div className={cn(statPillClass, 'border-l-[3px] border-l-indigo-500')}>
          <div className="rounded-lg bg-indigo-500/12 p-2 text-indigo-700 dark:text-indigo-400">
            <Briefcase className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Lawyers</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{lawyersCount}</p>
          </div>
        </div>
        <div className={cn(statPillClass, 'border-l-[3px] border-l-amber-500')}>
          <div className="rounded-lg bg-amber-500/12 p-2 text-amber-700 dark:text-amber-400">
            <MailWarning className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Pending Invite</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{pendingInviteCount}</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-5 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/40 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder="Search name, email, role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'h-10 w-full rounded-lg border bg-white pl-10 pr-10 text-[13px] text-slate-900 dark:bg-slate-950 dark:text-white',
                'border-slate-200 dark:border-slate-700',
                'focus:border-[#6D54B5] focus:outline-none focus:ring-2 focus:ring-[#6D54B5]/25',
                searchTerm.trim() && 'ring-2 ring-[#6D54B5]/20 border-[#6D54B5]/40'
              )}
            />
            {searchTerm.trim() ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : (v as API.Role))}>
              <SelectTrigger
                className={cn(
                  'h-10 w-[150px] rounded-lg border-slate-200 text-[13px] dark:border-slate-700',
                  roleFilter && 'ring-2 ring-[#6D54B5]/25 border-[#6D54B5]/40'
                )}
              >
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_OPTIONS.filter(Boolean).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === 'OWNER' ? 'Owner' : r === 'ADMIN' ? 'Admin' : getRoleDisplayName(r as API.Role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger
                className={cn(
                  'h-10 w-[150px] rounded-lg border-slate-200 text-[13px] dark:border-slate-700',
                  statusFilter && 'ring-2 ring-[#6D54B5]/25 border-[#6D54B5]/40'
                )}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 lg:ml-auto">
            <div
              className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-0.5 shadow-sm"
              role="group"
              aria-label="View mode"
            >
              {(['grid', 'list', 'workload'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold transition-colors',
                    viewMode === mode
                      ? 'bg-[#6D54B5] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  {mode === 'grid' && <LayoutGrid className="h-3.5 w-3.5" />}
                  {mode === 'list' && <List className="h-3.5 w-3.5" />}
                  {mode === 'workload' && <BarChart3 className="h-3.5 w-3.5" />}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden',
          detailOpen && !isNarrow && 'md:pr-[420px]' 
        )}
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50"
              />
            ))}
          </div>
        ) : displayedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 shadow-inner">
              <Users className="h-8 w-8 text-slate-400" aria-hidden />
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">No team members found</p>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your search or filters to see more results.'
                : 'Add your first colleague to collaborate on cases.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" className="mt-6" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button
                className="mt-6 bg-[#6D54B5] hover:bg-[#5a4699]"
                onClick={() => cabinetMemberCreateModalRef.current?.show()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedMembers.map(renderTile)}
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/40">
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Name
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Role
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    In Progress
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Assigned
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Workload
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Joined
                  </th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>{displayedMembers.map(renderListRow)}</tbody>
            </table>
          </div>
        ) : (
          renderWorkloadView()
        )}
        </div>
      </div>

      <CabinetMemberCreateModal
        ref={cabinetMemberCreateModalRef}
        onSuccess={(member) => {
          setTeamMembers((prev) => [member, ...prev]);
          refetchCasesOnly();
        }}
      />
      <CabinetMemberUpdateModal
        ref={cabinetMemberUpdateModalRef}
        onSuccess={() => {
          refetchMembersOnly();
          refetchCasesOnly();
        }}
      />
      <CabinetMemberDeleteModal
        ref={cabinetMemberDeleteModalRef}
        onSuccess={(member) => {
          setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
          refetchCasesOnly();
        }}
      />
      <TeamMemberProfileDrawer
        ref={profileDrawerRef}
        portalContainer={teamHolderEl}
        onOpenChange={handleDetailOpenChange}
        onEditMember={(m) => cabinetMemberUpdateModalRef.current?.show(m)}
      />

      <AlertDialog open={!!resendTarget} onOpenChange={(open) => !open && setResendTarget(null)}>
        <AlertDialogContent className="rounded-lg border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invitation</AlertDialogTitle>
            <AlertDialogDescription>
              {resendTarget
                ? `Send a new setup link to ${resendTarget.email}? The previous link will stop working.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resendLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResendInvitation();
              }}
              disabled={resendLoading}
              style={{ backgroundColor: JURE_PURPLE }}
              className="hover:opacity-90"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Send setup link'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamMembers;
