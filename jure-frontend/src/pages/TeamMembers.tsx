import React, { useEffect, useRef, useState } from 'react';
import {
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
  UserRound,
  Scale,
  Clock,
  Calendar,
  ChevronRight,
  X,
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
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import { getRoleDisplayName } from '@/utils/permissions';
import { getCabinetMemberRouteId, getMemberWorkloadDisplay } from '@/utils/cabinetMemberHelpers';
import { isCabinetMemberOnline } from '@/lib/presence';
import { useOnlineIds } from '@/hooks/useOnlinePresence';
import { cn } from '@/lib/utils';
import CompactSearch from '@/components/common/CompactSearch';
import MobileFilterSheet, { FilterField } from '@/components/common/MobileFilterSheet';
import { formatDate, useAppTranslation } from '@/i18n';
import type { Lang } from '@/i18n';
import { useShortcutAction } from '@/context/ShortcutsContext';
import {
  WorkspaceKpiStrip,
  WorkspacePageHeader,
} from '@/components/workspace/WorkspaceChrome';
import '@/styles/workspace-list.css';

const JURE_PURPLE = '#64499D';

const sharePct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : null;

const formatJoined = (d: string | Date | undefined, lang: Lang) => {
  if (!d) return '—';
  return formatDate(d, lang, { day: '2-digit', month: 'short', year: 'numeric' });
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
  const { t, tf, lang } = useAppTranslation();
  const onlineIds = useOnlineIds();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [roleFilter, setRoleFilter] = useState<API.Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<API.CabinetMember[]>([]);
  const [myCabinetMember, setMyCabinetMember] = useState<API.CabinetMember | null>(null);
  const [resendTarget, setResendTarget] = useState<API.CabinetMember | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  /** All cases for the cabinet — used to compute real In progress / Assigned when member list omits counts. */
  const [allCases, setAllCases] = useState<API.Case[] | null>(null);

  const cabinetMemberCreateModalRef = useRef<CabinetMemberCreateModalRef>(null);
  const cabinetMemberUpdateModalRef = useRef<CabinetMemberUpdateModalRef>(null);
  const cabinetMemberDeleteModalRef = useRef<CabinetMemberDeleteModalRef>(null);
  const profileDrawerRef = useRef<TeamMemberProfileDrawerRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        m.role,
        m.position,
        m.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (roleFilter && (m.role || '') !== roleFilter) return false;
    if (statusFilter === 'active' && !m.is_active) return false;
    if (statusFilter === 'offline' && m.is_active) return false;
    if (statusFilter === 'pending' && !m.invitation_sent) return false;
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
  const pendingInviteCount = teamMembers.filter((m) => !!m.invitation_sent).length;

  const handleCall = (member: API.CabinetMember) => {
    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || t.team.unnamed;
    toast({
      title: t.team.toasts.callingTitle,
      description: tf(t.team.toasts.callingDesc, { name, phone: member.phone || '—' }),
    });
    if (member.phone) window.location.href = `tel:${member.phone}`;
  };

  const handleEmail = (member: API.CabinetMember) => {
    toast({
      title: t.team.toasts.emailTitle,
      description: tf(t.team.toasts.emailDesc, { email: member.email || '—' }),
    });
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
      toast({
        title: t.team.toasts.setupSentTitle,
        description: tf(t.team.toasts.setupSentDesc, { email: resendTarget.email }),
      });
      setResendTarget(null);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast({
        title: t.common.error,
        description: detail || t.team.toasts.inviteFailed,
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const isPending = (m: API.CabinetMember) => !!m.invitation_sent;

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
    if (s === 'pending') return t.team.status.pending;
    if (s === 'active') return t.team.status.active;
    return t.team.status.inactive;
  };

  const roleLabel = (role: API.Role) => t.team.roles[role] || getRoleDisplayName(role);

  /* ─── Grid tile ─── */
  const renderTile = (member: API.CabinetMember) => {
    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`.trim() || t.team.unnamed;
    const memberRole = (member.role || 'VIEWER') as API.Role;
    const roleDisplay = roleLabel(memberRole);
    const { inProgress, assignedTotal } = getMemberWorkloadDisplay(member, allCases);
    const pending = isPending(member);
    const selected = selectedMemberId === member.id && detailOpen;
    const joined = formatJoined(member.date_joined, lang);

    return (
      <article
        key={member.id}
        className={cn(
          'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950',
          'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-150',
          'hover:border-[#64499D]/30 hover:shadow-[0_6px_16px_rgba(100,73,157,0.08)]',
          selected && 'border-[#64499D]/40 ring-2 ring-[#64499D]/20'
        )}
        onClick={() => openProfile(member)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProfile(member);
          }
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-1.5 top-2 z-10 h-7 w-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
              aria-label={t.team.moreActions}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] p-1.5" onClick={(e) => e.stopPropagation()}>
            {showResendForMember(member) && (
              <DropdownMenuItem onClick={() => setResendTarget(member)}>
                <Send className="mr-2 h-3.5 w-3.5" />
                {t.team.resendInvitation}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleCall(member)}>
              <Phone className="mr-2 h-3.5 w-3.5" />
              {t.team.call}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEmail(member)}>
              <Mail className="mr-2 h-3.5 w-3.5" />
              {t.team.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => cabinetMemberUpdateModalRef.current?.show(member)}>
              <Edit className="mr-2 h-3.5 w-3.5" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
              onClick={() => cabinetMemberDeleteModalRef.current?.show(member)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-col px-3 pb-3 pt-4">
          <div className="flex items-start gap-3 pe-7">
            <div className="relative shrink-0">
              <UserAvatar
                image={getPersonImage(member)}
                firstName={member.first_name}
                lastName={member.last_name}
                size="lg"
                className="h-11 w-11"
              />
              {pending ? (
                <span
                  className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 dark:border-zinc-950"
                  aria-hidden
                />
              ) : (
                <PresenceDot
                  online={isCabinetMemberOnline(member, onlineIds)}
                  className="h-2.5 w-2.5 dark:border-zinc-950"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-semibold leading-tight text-slate-900 dark:text-white">
                {fullName}
              </h3>
              {member.email ? (
                <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-zinc-400">{member.email}</p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.05em]',
                    rolePillClass[memberRole]
                  )}
                >
                  {roleDisplay}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium',
                    statusBadgeClass(member)
                  )}
                >
                  {statusBadgeText(member)}
                </span>
                {showResendForMember(member) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResendTarget(member);
                    }}
                    className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200"
                  >
                    {t.team.resend}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] tabular-nums text-slate-600 dark:text-zinc-300">
              {tf(t.team.activeAssigned, { inProgress, assigned: assignedTotal })}
            </p>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800"
              title={tf(t.team.workloadTitle, { inProgress, assigned: assignedTotal })}
            >
              <div
                className={cn('h-full rounded-full', workloadBarClass(assignedTotal))}
                style={{ width: `${workloadFillPct(assignedTotal)}%` }}
              />
            </div>
          </div>

          {(member.phone || joined !== '—') && (
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-500 dark:text-zinc-400">
              {member.phone ? (
                <p className="flex min-w-0 items-center gap-1.5 truncate">
                  <Phone className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{member.phone}</span>
                </p>
              ) : null}
              {joined !== '—' ? (
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  {joined}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-3 py-1.5 dark:border-zinc-800">
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#64499D] hover:text-[#4D3680] dark:text-[#CFC2FF]"
            onClick={(e) => {
              e.stopPropagation();
              openProfile(member);
            }}
          >
            {t.team.view}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            onClick={(e) => {
              e.stopPropagation();
              cabinetMemberUpdateModalRef.current?.show(member);
            }}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            {t.common.edit}
          </Button>
        </div>
      </article>
    );
  };

  /* ─── Dense mobile card ─── */
  const renderMobileCard = (member: API.CabinetMember) => {
    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`.trim() || t.team.unnamed;
    const memberRole = (member.role || 'VIEWER') as API.Role;
    const { inProgress, assignedTotal } = getMemberWorkloadDisplay(member, allCases);

    return (
      <article
        key={member.id}
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950"
      >
        <button
          type="button"
          className="w-full rounded-none px-3 py-2.5 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 focus-visible:ring-inset"
          onClick={() => openProfile(member)}
          aria-label={tf(t.team.aria.openMember, { name: fullName })}
        >
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <UserAvatar
                image={getPersonImage(member)}
                firstName={member.first_name}
                lastName={member.last_name}
                size="md"
                className="h-9 w-9"
              />
              {isPending(member) ? (
                <span
                  className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 dark:border-zinc-950"
                  aria-hidden
                />
              ) : (
                <PresenceDot
                  online={isCabinetMemberOnline(member, onlineIds)}
                  className="dark:border-zinc-950"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{fullName}</p>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                    statusBadgeClass(member)
                  )}
                >
                  {statusBadgeText(member)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]',
                    rolePillClass[memberRole]
                  )}
                >
                  {roleLabel(memberRole)}
                </span>
                <span className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
                  {tf(t.team.activeAssigned, { inProgress, assigned: assignedTotal })}
                </span>
              </div>
              {member.email ? (
                <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-zinc-400">{member.email}</p>
              ) : null}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1 border-t border-slate-100 px-2 py-1.5 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 text-[12px] text-[#64499D] hover:text-[#4D3680] dark:text-[#CFC2FF]"
            onClick={() => openProfile(member)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            {t.team.viewProfile}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 text-[12px]"
            onClick={() => cabinetMemberUpdateModalRef.current?.show(member)}
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            {t.common.edit}
          </Button>
          {showResendForMember(member) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px] text-amber-700 dark:text-amber-400"
              onClick={() => setResendTarget(member)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </article>
    );
  };

  /* ─── List row ─── */
  const renderListRow = (member: API.CabinetMember) => {
    const fullName =
      `${member.first_name || ''} ${member.last_name || ''}`.trim() || t.team.unnamed;
    const memberRole = (member.role || 'VIEWER') as API.Role;
    const { inProgress, assignedTotal } = getMemberWorkloadDisplay(member, allCases);
    const selected = selectedMemberId === member.id && detailOpen;

    return (
      <tr
        key={member.id}
        tabIndex={0}
        className={cn(
          'cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-100',
          'odd:bg-white dark:bg-slate-950 even:bg-slate-50/40 dark:odd:bg-slate-950 dark:even:bg-slate-900/20',
          'hover:bg-slate-100 dark:hover:bg-slate-800/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
          selected && 'bg-primary/[0.06] dark:bg-primary/10'
        )}
        onClick={() => openProfile(member)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProfile(member);
          }
        }}
      >
        <td className="px-3 py-2 align-middle">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                image={getPersonImage(member)}
                firstName={member.first_name}
                lastName={member.last_name}
                size="sm"
                className="h-8 w-8"
              />
              {isPending(member) ? (
                <span
                  className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 dark:border-slate-950"
                  aria-hidden
                />
              ) : (
                <PresenceDot
                  online={isCabinetMemberOnline(member, onlineIds)}
                  className="dark:border-slate-950"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{fullName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{member.email || '—'}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2 align-middle">
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]',
              rolePillClass[memberRole]
            )}
          >
            {roleLabel(memberRole)}
          </span>
        </td>
        <td className="px-3 py-2 align-middle">
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
              statusBadgeClass(member)
            )}
          >
            {statusBadgeText(member)}
          </span>
        </td>
        <td className="px-3 py-2 align-middle text-right tabular-nums text-[12px] font-semibold text-slate-900 dark:text-white">
          {inProgress}
        </td>
        <td className="px-3 py-2 align-middle text-right tabular-nums text-[12px] font-semibold text-slate-900 dark:text-white">
          {assignedTotal}
        </td>
        <td className="px-3 py-2 align-middle whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
          {formatJoined(member.date_joined as string, lang)}
        </td>
        <td className="px-2 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-0.5">
            {showResendForMember(member) && (
              <button
                type="button"
                onClick={() => setResendTarget(member)}
                className="mr-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-500/15 ring-1 ring-amber-500/25 dark:text-amber-200"
              >
                {t.team.resend}
              </button>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={() => openProfile(member)}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              {t.team.view}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t.team.moreActions}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] p-1.5">
                {showResendForMember(member) && (
                  <DropdownMenuItem onClick={() => setResendTarget(member)}>
                    <Send className="mr-2 h-3.5 w-3.5" />
                    {t.team.resendInvitation}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleCall(member)}>
                  <Phone className="mr-2 h-3.5 w-3.5" />
                  {t.team.call}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEmail(member)}>
                  <Mail className="mr-2 h-3.5 w-3.5" />
                  {t.team.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => cabinetMemberUpdateModalRef.current?.show(member)}>
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  {t.common.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                  onClick={() => cabinetMemberDeleteModalRef.current?.show(member)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t.common.delete}
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
              `${member.first_name || ''} ${member.last_name || ''}`.trim() || t.team.unnamed;
            const memberRole = (member.role || 'VIEWER') as API.Role;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-56">
                  <UserAvatar
                    image={getPersonImage(member)}
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
                      {roleLabel(memberRole)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {total === 0 ? (
                    <div
                      className="h-1.5 w-full rounded-full border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30"
                      title={tf(t.team.workloadTitle, { inProgress, assigned: total })}
                    />
                  ) : (
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      title={tf(t.team.workloadTitle, { inProgress, assigned: total })}
                    >
                      <div
                        className={cn('h-full rounded-full transition-all', workloadBarClass(total))}
                        style={{ width: `${workloadFillPct(total)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:w-48 sm:justify-end">
                  <span className="text-[13px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{tf(t.team.casesCount, { count: total })}</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => openProfile(member)}>
                    {t.team.view}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            {t.team.workloadLegend.low}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden />
            {t.team.workloadLegend.medium}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
            {t.team.workloadLegend.high}
          </span>
        </div>
      </div>
    );
  };

  const openCreate = () => cabinetMemberCreateModalRef.current?.show();
  useShortcutAction('create-member', openCreate);

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
  }, []);

  const activePct = sharePct(activeCount, totalMembers);
  const lawyersPct = sharePct(lawyersCount, totalMembers);

  const kpiItems = [
    {
      key: 'total',
      label: t.team.stats.total,
      value: totalMembers,
      hint: t.team.stats.totalHint,
      icon: Users,
      accent: 'text-slate-500',
    },
    {
      key: 'active',
      label: t.team.stats.active,
      value: activeCount,
      hint: activePct != null ? tf(t.team.stats.shareOfTeam, { pct: activePct }) : t.team.stats.totalHint,
      icon: UserRound,
      accent: 'text-emerald-600',
    },
    {
      key: 'lawyers',
      label: t.team.stats.lawyers,
      value: lawyersCount,
      hint: lawyersPct != null ? tf(t.team.stats.shareOfTeam, { pct: lawyersPct }) : t.team.stats.totalHint,
      icon: Scale,
      accent: 'text-[#64499D]',
    },
    {
      key: 'pending',
      label: t.team.stats.pending,
      value: pendingInviteCount,
      hint: t.team.stats.pendingHint,
      icon: Clock,
      accent: 'text-amber-500',
    },
  ];

  const filterChips: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (roleFilter) {
    filterChips.push({
      key: 'role',
      label: roleLabel(roleFilter),
      onClear: () => setRoleFilter(''),
    });
  }
  if (statusFilter) {
    filterChips.push({
      key: 'status',
      label:
        statusFilter === 'active'
          ? t.team.status.active
          : statusFilter === 'offline'
            ? t.team.status.offline
            : t.team.status.pending,
      onClear: () => setStatusFilter(''),
    });
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="px-4 pb-8 pt-2 sm:px-5 lg:px-6">
          <WorkspacePageHeader
            title={t.sidebar.team}
            subtitle={t.team.pageSubtitle}
            actions={
              <Button
                size="sm"
                className="hidden h-9 shrink-0 px-3 text-[13px] font-semibold text-white hover:opacity-90 md:inline-flex"
                style={{ backgroundColor: JURE_PURPLE }}
                onClick={openCreate}
              >
                <Plus className="me-1.5 h-4 w-4" strokeWidth={2.5} />
                {t.team.addMember}
              </Button>
            }
          />

          <WorkspaceKpiStrip items={kpiItems} loading={loading} ariaLabel={t.team.aria.stats} />

          <div className="ws-toolbar-sticky sticky top-0 z-30 mt-5 rounded-xl border border-slate-200/80 bg-background/90 px-3 py-2 backdrop-blur-sm dark:border-slate-800 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <CompactSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.team.searchPlaceholder}
                ariaLabel={t.team.searchAria}
                clearAriaLabel={t.team.clearSearch}
                inputRef={searchInputRef}
              />

              <MobileFilterSheet
                title={t.team.filters.applied}
                count={(roleFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
                footer={
                  roleFilter || statusFilter ? (
                    <Button variant="ghost" size="sm" className="h-9 w-full text-[12px]" onClick={resetFilters}>
                      {t.team.filters.clearAll}
                    </Button>
                  ) : null
                }
              >
                <FilterField label={t.team.filters.role}>
                <Select
                  value={roleFilter || 'all'}
                  onValueChange={(v) => setRoleFilter(v === 'all' ? '' : (v as API.Role))}
                >
                  <SelectTrigger className="h-9 w-full rounded-md text-[12px]">
                    <SelectValue placeholder={t.team.filters.role} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.team.filters.allRoles}</SelectItem>
                    {ROLE_OPTIONS.filter(Boolean).map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r as API.Role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </FilterField>
                <FilterField label={t.team.filters.status}>
                <Select
                  value={statusFilter || 'all'}
                  onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full rounded-md text-[12px]">
                    <SelectValue placeholder={t.team.filters.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.team.filters.allStatuses}</SelectItem>
                    {STATUS_OPTIONS.filter(Boolean).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'active'
                          ? t.team.status.active
                          : s === 'offline'
                            ? t.team.status.offline
                            : t.team.status.pending}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </FilterField>
              </MobileFilterSheet>

              <div
                className="ms-auto inline-flex items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900 md:hidden"
                role="group"
                aria-label={t.team.views.aria}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold',
                    viewMode !== 'workload'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-600'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                  aria-pressed={viewMode !== 'workload'}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('workload')}
                  className={cn(
                    'inline-flex items-center rounded-md px-2.5 py-1.5 text-[11px] font-semibold',
                    viewMode === 'workload'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-600'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                  aria-pressed={viewMode === 'workload'}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="ms-auto hidden items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50 md:inline-flex"
                role="group"
                aria-label={t.team.views.aria}
              >
                {(['list', 'grid', 'workload'] as const).map((mode) => (
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
                  >
                    {mode === 'grid' && <LayoutGrid className="h-3.5 w-3.5" />}
                    {mode === 'list' && <List className="h-3.5 w-3.5" />}
                    {mode === 'workload' && <BarChart3 className="h-3.5 w-3.5" />}
                    <span className="hidden lg:inline">{t.team.views[mode]}</span>
                  </button>
                ))}
              </div>
            </div>

            {filterChips.length > 0 ? (
              <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {t.team.filters.applied}
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
                  {t.team.filters.clearAll}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 pb-20 md:pb-4">
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[168px] animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                />
              ))}
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/80">
                <Users className="h-6 w-6 text-slate-500 dark:text-slate-400" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.team.empty.title}</p>
              <p className="mt-1 max-w-sm text-center text-[13px] text-slate-500 dark:text-slate-400">
                {hasActiveFilters
                  ? t.team.empty.filteredHint
                  : t.team.empty.emptyHint}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={resetFilters}>
                  {t.team.empty.resetFilters}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="mt-4 h-8 text-[12px] text-white hover:opacity-90"
                  style={{ backgroundColor: JURE_PURPLE }}
                  onClick={openCreate}
                >
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  {t.team.addMember}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {viewMode === 'workload' ? (
                  renderWorkloadView()
                ) : (
                  <div className="flex flex-col gap-2">{displayedMembers.map(renderMobileCard)}</div>
                )}
              </div>
              <div className="hidden md:block">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                    {displayedMembers.map(renderTile)}
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] border-collapse text-left" aria-label={t.team.aria.list}>
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
                          {[
                            t.team.columns.name,
                            t.team.columns.role,
                            t.team.columns.status,
                            t.team.columns.inProgress,
                            t.team.columns.assigned,
                            t.team.columns.joined,
                            t.team.columns.actions,
                          ].map((h, i) => (
                            <th
                              key={h}
                              className={cn(
                                'px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400',
                                i >= 3 && i <= 4 ? 'text-right' : i === 6 ? 'text-right' : 'text-left'
                              )}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>{displayedMembers.map(renderListRow)}</tbody>
                    </table>
                    </div>
                  </div>
                ) : (
                  renderWorkloadView()
                )}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="icon"
        className="fixed z-40 h-12 w-12 rounded-full text-white shadow-lg md:hidden bottom-[max(1.25rem,env(safe-area-inset-bottom))] end-4"
        style={{ backgroundColor: JURE_PURPLE }}
        onClick={openCreate}
        aria-label={t.team.addMember}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </Button>

      <p className="sr-only" aria-live="polite">
        {loading
          ? t.team.loadingAria
          : tf(t.team.countAria, { count: displayedMembers.length })}
      </p>

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
        onOpenChange={handleDetailOpenChange}
        onEditMember={(m) => cabinetMemberUpdateModalRef.current?.show(m)}
      />

      <AlertDialog open={!!resendTarget} onOpenChange={(open) => !open && setResendTarget(null)}>
        <AlertDialogContent className="rounded-lg border border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.team.resendDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {resendTarget
                ? tf(t.team.resendDialog.description, { email: resendTarget.email })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resendLoading}>{t.common.cancel}</AlertDialogCancel>
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
                  {t.team.resendDialog.sending}
                </>
              ) : (
                t.team.resendDialog.sendLink
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamMembers;
