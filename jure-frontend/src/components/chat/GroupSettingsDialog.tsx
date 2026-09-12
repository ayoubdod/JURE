import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  ChevronLeft,
  Loader2,
  MoreHorizontal,
  Pencil,
  Settings2,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserAvatar, { getPersonImage, PresenceDot } from '@/components/common/UserAvatar';
import GroupChatIcon from '@/components/chat/GroupChatIcon';
import { apiGetAllCabinetMembers } from '@/services/cabinet-member/api';
import {
  apiAddConversationMembers,
  apiRemoveConversationMember,
  apiSetConversationMemberAdmin,
} from '@/services/conversations/api';
import { getUserIdFromCabinetMember } from '@/utils/cabinetMemberHelpers';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import useUserStore from '@/stores/userStore';
import { isCabinetMemberOnline } from '@/lib/presence';
import { useOnlineIds } from '@/hooks/useOnlinePresence';
import {
  activeMemberships,
  getMemberPerson,
  isConversationAdmin,
  isLastActiveMember,
  memberUserId,
} from '@/components/chat/conversationUtils';

interface GroupSettingsDialogProps {
  conversation: API.Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (conversation: API.Conversation) => void;
  onRename?: (conversation: API.Conversation) => void;
  onChangeIcon?: (conversation: API.Conversation) => void;
  onLeave?: (conversation: API.Conversation) => void;
  onDeleteGroup?: (conversation: API.Conversation) => void;
}

function memberDisplayName(m: API.ConversationMembership, fallback: string) {
  const p = getMemberPerson(m);
  return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || p?.email || fallback;
}

const GroupSettingsDialog: React.FC<GroupSettingsDialogProps> = ({
  conversation,
  open,
  onOpenChange,
  onUpdated,
  onRename,
  onChangeIcon,
  onLeave,
  onDeleteGroup,
}) => {
  const { t, tf } = useAppTranslation();
  const gs = t.conversations.groupSettings;
  const { toast } = useToast();
  const currentUser = useUserStore((s) => s.user);
  const onlineIds = useOnlineIds();
  const [view, setView] = useState<'home' | 'add'>('home');
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setView('home');
      setSearch('');
      setSelected([]);
      setBusyId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || view !== 'add') return;
    setMembersLoading(true);
    apiGetAllCabinetMembers({ expand: 'user' })
      .then((res) => setMembers(res.data ?? []))
      .finally(() => setMembersLoading(false));
  }, [open, view]);

  const memberships = activeMemberships(conversation);
  const isAdmin = isConversationAdmin(conversation, currentUser?.id);
  const lastMember = isLastActiveMember(conversation);
  const existingUserIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of memberships) {
      const id = memberUserId(m);
      if (id != null) ids.add(id);
    }
    return ids;
  }, [memberships]);

  const addable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((member) => {
      const userId = getUserIdFromCabinetMember(member) ?? member.id;
      if (existingUserIds.has(userId) || existingUserIds.has(member.id)) return false;
      if (currentUser?.id != null && (userId === currentUser.id || member.id === currentUser.id)) {
        return false;
      }
      if (!q) return true;
      return (
        member.first_name.toLowerCase().includes(q) ||
        member.last_name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
      );
    });
  }, [members, existingUserIds, search, currentUser?.id]);

  const handleApiError = (error: unknown, fallback: string, adminOnly = false) => {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) {
        toast({
          title: t.conversations.toasts.accessDenied,
          description: adminOnly
            ? t.conversations.toasts.accessDeniedAdmin
            : t.conversations.toasts.accessDeniedMember,
          variant: 'destructive',
        });
        return;
      }
      if (status === 404) {
        toast({
          title: t.conversations.toasts.notFoundTitle,
          description: t.conversations.toasts.notFoundConversation,
          variant: 'destructive',
        });
        return;
      }
    }
    toast({ title: t.common.error, description: fallback, variant: 'destructive' });
  };

  const handleAdd = async () => {
    if (!conversation || selected.length === 0) return;
    const userIds = selected.map((id) => {
      const member = members.find((m) => m.id === id);
      return member ? (getUserIdFromCabinetMember(member) ?? member.id) : id;
    });
    setBusyId('add');
    try {
      const { data } = await apiAddConversationMembers(conversation.id, userIds);
      onUpdated?.(data);
      toast({
        title: userIds.length === 1 ? gs.memberAdded : tf(gs.membersAdded, { count: userIds.length }),
      });
      setSelected([]);
      setView('home');
    } catch (error) {
      handleApiError(error, t.conversations.toasts.couldNotAddMembers);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (membership: API.ConversationMembership) => {
    if (!conversation) return;
    const userId = memberUserId(membership);
    if (userId == null) return;
    const name = memberDisplayName(membership, t.conversations.unknownContact);
    if (!window.confirm(tf(gs.removeMemberConfirm, { name }))) return;
    setBusyId(userId);
    try {
      const { data } = await apiRemoveConversationMember(conversation.id, userId);
      onUpdated?.(data);
      toast({ title: gs.memberRemoved });
    } catch (error) {
      handleApiError(error, t.conversations.toasts.couldNotRemoveMember, true);
    } finally {
      setBusyId(null);
    }
  };

  const handleSetAdmin = async (membership: API.ConversationMembership, next: boolean) => {
    if (!conversation) return;
    const userId = memberUserId(membership);
    if (userId == null) return;
    setBusyId(userId);
    try {
      const { data } = await apiSetConversationMemberAdmin(conversation.id, userId, next);
      onUpdated?.(data);
      toast({ title: gs.adminUpdated });
    } catch (error) {
      handleApiError(error, t.conversations.toasts.couldNotUpdateAdmin, true);
    } finally {
      setBusyId(null);
    }
  };

  if (!conversation) return null;
  const title = conversation.display_name || conversation.title || t.conversations.typeGroup;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(86vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            {view === 'add' ? (
              <button
                type="button"
                className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setView('home')}
                aria-label={t.common.back}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
            ) : (
              <Settings2 className="mt-0.5 h-5 w-5 text-[#64499D]" />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{view === 'add' ? gs.addMembersTitle : gs.title}</DialogTitle>
              <DialogDescription>
                {view === 'add'
                  ? gs.addMembersDescription
                  : tf(t.conversations.membersCount, { count: memberships.length })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {view === 'home' ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-4 flex items-center gap-3">
              <GroupChatIcon
                iconUrl={conversation.icon_url}
                iconPresetEmoji={conversation.icon_preset_emoji}
                size="md"
                className="h-12 w-12"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onRename?.(conversation)}
                  >
                    <Pencil className="me-1 h-3 w-3" />
                    {t.conversations.renameGroupMenu}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onChangeIcon?.(conversation)}
                  >
                    {t.conversations.changeIconMenu}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Users className="h-3 w-3" />
                {gs.members}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[12px] text-[#64499D]"
                onClick={() => setView('add')}
              >
                <UserPlus className="me-1 h-3.5 w-3.5" />
                {gs.addMembers}
              </Button>
            </div>

            <ul className="space-y-1">
              {memberships.map((m) => {
                const p = getMemberPerson(m);
                if (!p) return null;
                const uid = memberUserId(m);
                const isYou = uid != null && uid === currentUser?.id;
                const img = getPersonImage(p as Record<string, unknown>);
                const canManage = isAdmin && !isYou;
                return (
                  <li key={m.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                    <div className="relative shrink-0">
                      <UserAvatar
                        firstName={p.first_name}
                        lastName={p.last_name}
                        image={img}
                        size="sm"
                        className="h-8 w-8"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                        {memberDisplayName(m, t.conversations.unknownContact)}
                        {isYou ? (
                          <span className="ms-1.5 text-[11px] font-normal text-slate-500">
                            ({gs.you})
                          </span>
                        ) : null}
                      </p>
                      {p.email ? (
                        <p className="truncate text-[11px] text-slate-500">{p.email}</p>
                      ) : null}
                    </div>
                    {m.is_admin ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-400">
                        <Shield className="h-3 w-3" />
                        {gs.admin}
                      </span>
                    ) : null}
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            disabled={busyId === uid}
                            aria-label={t.conversations.optionsAria}
                          >
                            {busyId === uid ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleSetAdmin(m, !m.is_admin)}>
                            <Shield className="me-2 h-3.5 w-3.5" />
                            {m.is_admin ? gs.dismissAdmin : gs.makeAdmin}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => void handleRemove(m)}
                          >
                            <UserMinus className="me-2 h-3.5 w-3.5" />
                            {gs.removeMember}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {!isAdmin ? (
              <p className="mt-3 text-[11px] text-slate-500">{gs.onlyAdminsManage}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.conversations.newChatModal.searchTeammates}
              className="mb-3"
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {membersLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-[#64499D]" />
                  {t.common.loading}
                </div>
              ) : addable.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-500">{gs.noTeammatesLeft}</p>
              ) : (
                <div className="space-y-1 p-1.5">
                  {addable.map((member) => {
                    const checked = selected.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        htmlFor={`add-member-${member.id}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5',
                          checked
                            ? 'border-[#64499D]/40 bg-[#F7F4FF] dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        )}
                      >
                        <Checkbox
                          id={`add-member-${member.id}`}
                          checked={checked}
                          onCheckedChange={() =>
                            setSelected((prev) =>
                              prev.includes(member.id)
                                ? prev.filter((id) => id !== member.id)
                                : [...prev, member.id]
                            )
                          }
                          className="data-[state=checked]:border-[#64499D] data-[state=checked]:bg-[#64499D]"
                        />
                        <div className="relative shrink-0">
                          <UserAvatar
                            image={getPersonImage(member as Record<string, unknown>)}
                            firstName={member.first_name}
                            lastName={member.last_name}
                            size="sm"
                          />
                          <PresenceDot online={isCabinetMemberOnline(member, onlineIds)} />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {member.first_name} {member.last_name}
                          </span>
                          <span className="block truncate text-[12px] text-slate-500">{member.email}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:justify-between">
          {view === 'add' ? (
            <>
              <Button type="button" variant="outline" onClick={() => setView('home')}>
                {t.common.cancel}
              </Button>
              <Button type="button" onClick={() => void handleAdd()} disabled={selected.length === 0 || busyId === 'add'}>
                {busyId === 'add' ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <UserPlus className="me-2 h-4 w-4" />}
                {busyId === 'add' ? gs.adding : gs.add}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={() => onLeave?.(conversation)}
              >
                {lastMember ? t.conversations.deleteChat.lastMemberAction : gs.leaveGroup}
              </Button>
              {isAdmin && !lastMember ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDeleteGroup?.(conversation)}
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {gs.deleteGroup}
                </Button>
              ) : (
                <span />
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSettingsDialog;
