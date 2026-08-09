import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, MessageSquarePlus, Pin, PinOff, Archive, ArchiveRestore, Trash2, ChevronDown, ChevronRight, Pencil, ImageIcon } from 'lucide-react';
import { apiGetAllCabinetMembers } from '@/services/cabinet-member/api';
import { Button } from '../ui/button';
import UserAvatar, { getPersonImage } from '../common/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useUserStore from '@/stores/userStore';
import useChatStore from '@/stores/chatStore';
import GroupChatIcon from './GroupChatIcon';
import { getSharedMessagePreviewText } from '@/components/chat/SharedMessageCard';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

interface Props {
  isLoading?: boolean;
  conversations: API.Conversation[];
  archivedConversations?: API.Conversation[];
  showArchived?: boolean;
  archivedLoading?: boolean;
  onToggleArchived?: () => void;
  onArchive?: (c: API.Conversation) => void;
  onUnarchive?: (c: API.Conversation) => void;
  onPin?: (c: API.Conversation) => void;
  onUnpin?: (c: API.Conversation) => void;
  onDelete?: (c: API.Conversation) => void;
  onRename?: (c: API.Conversation) => void;
  onChangeIcon?: (c: API.Conversation) => void;
  activeId?: number;
  onSelectConversation: (id: number) => void;
  onNewChat?: () => void;
  /** Start or switch to direct chat with a member (cabinet member id) */
  onSelectMember?: (memberId: number) => void;
  className?: string;
}

const formatTimestamp = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const truncateSnippet = (text: string, maxLen = 40) => {
  if (!text?.trim()) return '—';
  const trimmed = text.trim();
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen) + '…';
};

const getPreviewText = (
  latestMessage: API.Message | undefined,
  labels: { deleted: string; attachment: string }
) => {
  if (!latestMessage) return '—';
  const isDeleted = (latestMessage as any).is_deleted === true;
  if (isDeleted) return labels.deleted;
  const sharedPreview = getSharedMessagePreviewText(latestMessage);
  if (sharedPreview) return sharedPreview;
  const body = (latestMessage as any).body ?? (latestMessage as any).content ?? '';
  if (body?.trim()) return body.trim();
  const hasAtt = ((latestMessage as API.Message).attachments ?? []).length > 0;
  if (hasAtt) return labels.attachment;
  return '—';
};

/** Get person from membership (user or cabinet_member). */
const getMemberPerson = (m: API.ConversationMembership) =>
  (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;

/** Get peer image for direct chat: other_participant or memberships[].user/cabinet_member. */
const getDirectPeerImage = (c: API.Conversation, peer: API.ConversationMembership | undefined) =>
  getPersonImage((c as any).other_participant) ?? getPersonImage(peer ? getMemberPerson(peer) as Record<string, unknown> : null);

/** Get peer display name and initials for direct chat. */
const getDirectPeerInfo = (
  c: API.Conversation,
  peer: API.ConversationMembership | undefined,
  unknownLabel: string
) => {
  const op = (c as any).other_participant;
  const person = peer ? getMemberPerson(peer) : null;
  const firstName = op?.first_name ?? person?.first_name;
  const lastName = op?.last_name ?? person?.last_name;
  const fullName =
    op?.full_name ??
    (`${firstName ?? ''} ${lastName ?? ''}`.trim() || person?.email || unknownLabel);
  const initials = [firstName?.[0], lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return { fullName, firstName, lastName, initials };
};

const ConversationList: React.FC<Props> = ({
  isLoading,
  conversations,
  archivedConversations = [],
  showArchived = false,
  archivedLoading = false,
  onToggleArchived,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
  onDelete,
  onRename,
  onChangeIcon,
  activeId,
  onSelectConversation,
  onNewChat,
  onSelectMember,
  className,
}) => {
  const { t } = useAppTranslation();
  const [q, setQ] = useState('');
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const chatStore = useChatStore();
  const currentUser = useUserStore((s) => s.user);

  useEffect(() => {
    apiGetAllCabinetMembers({ expand: 'user' })
      .then((res) => setMembers(res.data ?? []))
      .catch(() => apiGetAllCabinetMembers().then((r) => setMembers(r.data ?? [])));
  }, []);

  const recentMessages = chatStore.notifications.filter((m: any) => m.is_message);
  const onlineIds = chatStore.onlineIds ?? [];

  const isMemberOnline = (member: API.CabinetMember) => {
    const ids = [(member as any).user_id, (member as any).user?.id, (member as any).user, member.id].filter(
      (x): x is number => typeof x === 'number'
    );
    return ids.some((id) => onlineIds.includes(id));
  };

  const membersForAvatars = useMemo(() => {
    const currentEmail = (currentUser?.email ?? '').toLowerCase();
    const filtered = members.filter(
      (m) => m.email?.toLowerCase() !== currentEmail
    );
    return [...filtered].sort((a, b) => {
      const aOnline = isMemberOnline(a);
      const bOnline = isMemberOnline(b);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    });
  }, [members, currentUser?.email, onlineIds]);

  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        const title = (c as any).display_name ?? c.title ?? '';
        const members = (c.memberships ?? []).map((p) => {
          const u = (p as any).user ?? (p as any).cabinet_member;
          return `${u?.first_name ?? ''} ${u?.last_name ?? ''} ${u?.email ?? ''}`.trim();
        }).join(' ');
        return `${title} ${members}`.toLowerCase().includes(q.toLowerCase());
      }),
    [q, conversations]
  );

  return (
    <div className={cn(
      'w-full md:w-[300px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 h-full min-h-0',
      className ?? 'flex'
    )}>
      {/* Search bar */}
      <div className="shrink-0 p-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            placeholder={t.conversations.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full h-8 ps-8 pe-3 text-[13px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
          />
        </div>
        {/* Member avatars - connected first */}
        {membersForAvatars.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
            {membersForAvatars.map((m) => {
              const memberImage = getPersonImage(m as Record<string, unknown>);
              const isOnline = isMemberOnline(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMember?.(m.id)}
                  className={cn(
                    'shrink-0 relative flex flex-col items-center gap-0.5 group',
                    onSelectMember && 'cursor-pointer hover:opacity-90'
                  )}
                  title={`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email}
                  aria-label={`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email}
                >
                  <div className="relative">
                    <UserAvatar
                      image={memberImage}
                      firstName={m.first_name}
                      lastName={m.last_name}
                      size="sm"
                      className="ring-2 ring-transparent group-hover:ring-slate-300 dark:group-hover:ring-slate-600"
                    />
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Thread list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-slate-500 dark:text-slate-500">
            {t.conversations.empty}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((conversation) => {
              const apiUnread =
                (conversation as any).unread_count ?? (conversation as any).unreadCount;
              const unreadCount =
                typeof apiUnread === 'number'
                  ? apiUnread
                  : recentMessages.filter(
                      (i: any) => i.conversation_id == conversation.id && i.unread
                    ).length;
              const peer =
                conversation.type === 'direct'
                  ? conversation.memberships.find((m) =>
                      (getMemberPerson(m)?.email ?? '').toLowerCase() !== (currentUser?.email ?? '').toLowerCase()
                    )
                  : undefined;
              const peerInfo =
                conversation.type === 'direct'
                  ? getDirectPeerInfo(conversation, peer, t.conversations.unknownContact)
                  : null;
              const displayName =
                (conversation as any).display_name ||
                (conversation.type === 'direct'
                  ? peerInfo?.fullName ?? t.conversations.unknownContact
                  : conversation.title);
              const initials =
                conversation.type === 'direct'
                  ? peerInfo?.initials ?? '?'
                  : (conversation as any).icon_preset_emoji || conversation.title?.slice(0, 2).toUpperCase() || '?';
              const snippet = truncateSnippet(
                getPreviewText(conversation.latest_message, {
                  deleted: t.conversations.messageDeletedPreview,
                  attachment: t.conversations.attachmentPreview,
                })
              );
              const lm = conversation.latest_message as any;
              const timestamp = formatTimestamp(lm?.sent_at ?? lm?.created);
              const caseTitle = (conversation as any).case_title ?? (conversation as any).matter?.title;
              const isPinned = (conversation as any).is_pinned === true;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors cursor-pointer',
                    activeId === conversation.id
                      ? 'bg-slate-100 dark:bg-slate-800/80 border-l-2 border-l-primary'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-l-transparent'
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {conversation.type === 'group' ? (
                    <GroupChatIcon
                      iconUrl={(conversation as any).icon_url}
                      iconPresetEmoji={(conversation as any).icon_preset_emoji}
                      size="md"
                      className="h-9 w-9"
                    />
                  ) : (
                    <UserAvatar
                      image={getDirectPeerImage(conversation, peer)}
                      firstName={peerInfo?.firstName}
                      lastName={peerInfo?.lastName}
                      size="sm"
                      className="h-9 w-9 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isPinned && (
                          <Pin className="h-3 w-3 shrink-0 text-slate-500 dark:text-slate-400" />
                        )}
                        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">
                          {displayName}
                        </span>
                        {caseTitle && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                            {caseTitle}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-500 shrink-0">
                        {timestamp}
                      </span>
                      {unreadCount > 0 && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-[10px] font-semibold text-white flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {(onArchive || onPin || onUnpin || onDelete || (onRename && conversation.type === 'group') || (onChangeIcon && conversation.type === 'group')) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                              aria-label={t.conversations.optionsAria}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {conversation.type === 'group' && onRename && (
                              <DropdownMenuItem onClick={() => onRename(conversation)}>
                                <Pencil className="h-3.5 w-3.5 me-2" />
                                {t.conversations.renameGroup}
                              </DropdownMenuItem>
                            )}
                            {conversation.type === 'group' && onChangeIcon && (
                              <DropdownMenuItem onClick={() => onChangeIcon(conversation)}>
                                <ImageIcon className="h-3.5 w-3.5 me-2" />
                                {t.conversations.changeIcon}
                              </DropdownMenuItem>
                            )}
                            {onArchive && (
                              <DropdownMenuItem onClick={() => onArchive(conversation)}>
                                <Archive className="h-3.5 w-3.5 me-2" />
                                {t.conversations.archive}
                              </DropdownMenuItem>
                            )}
                            {isPinned && onUnpin && (
                              <DropdownMenuItem onClick={() => onUnpin(conversation)}>
                                <PinOff className="h-3.5 w-3.5 me-2" />
                                {t.conversations.unpin}
                              </DropdownMenuItem>
                            )}
                            {!isPinned && onPin && (
                              <DropdownMenuItem onClick={() => onPin(conversation)}>
                                <Pin className="h-3.5 w-3.5 me-2" />
                                {t.conversations.pin}
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(conversation)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 me-2" />
                                {t.common.delete}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-500 truncate mt-0.5">
                      {snippet}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived section */}
      {onToggleArchived && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onToggleArchived}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            {showArchived ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {t.conversations.archived}
            {archivedConversations.length > 0 ? ` (${archivedConversations.length})` : ''}
          </button>
          {showArchived && (
            <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
              {archivedLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              ) : archivedConversations.length === 0 ? (
                <p className="p-3 text-[12px] text-slate-500 dark:text-slate-500">
                  {t.conversations.archivedEmpty}
                </p>
              ) : (
                archivedConversations.map((conversation) => {
                  const peer =
                    conversation.type === 'direct'
                      ? conversation.memberships.find((m) =>
                          (getMemberPerson(m)?.email ?? '').toLowerCase() !== (currentUser?.email ?? '').toLowerCase()
                        )
                      : undefined;
                  const peerInfo =
                    conversation.type === 'direct'
                      ? getDirectPeerInfo(conversation, peer, t.conversations.unknownContact)
                      : null;
                  const displayName =
                    (conversation as any).display_name ||
                    (conversation.type === 'direct'
                      ? peerInfo?.fullName ?? t.conversations.unknownContact
                      : conversation.title);
                  return (
                    <div
                      key={conversation.id}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer',
                        activeId === conversation.id
                          ? 'bg-slate-100 dark:bg-slate-800/80'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      {conversation.type === 'group' ? (
                        <GroupChatIcon
                          iconUrl={(conversation as any).icon_url}
                          iconPresetEmoji={(conversation as any).icon_preset_emoji}
                          size="sm"
                          className="h-8 w-8"
                        />
                      ) : (
                        <UserAvatar
                          image={getDirectPeerImage(conversation, peer)}
                          firstName={peerInfo?.firstName}
                          lastName={peerInfo?.lastName}
                          size="sm"
                          className="h-8 w-8 shrink-0"
                        />
                      )}
                      <span className="flex-1 text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">
                        {displayName}
                      </span>
                      {(onUnarchive || onDelete || (onRename && conversation.type === 'group') || (onChangeIcon && conversation.type === 'group')) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                              aria-label={t.conversations.optionsAria}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {conversation.type === 'group' && onRename && (
                              <DropdownMenuItem onClick={() => onRename(conversation)}>
                                <Pencil className="h-3.5 w-3.5 me-2" />
                                {t.conversations.renameGroup}
                              </DropdownMenuItem>
                            )}
                            {conversation.type === 'group' && onChangeIcon && (
                              <DropdownMenuItem onClick={() => onChangeIcon(conversation)}>
                                <ImageIcon className="h-3.5 w-3.5 me-2" />
                                {t.conversations.changeIcon}
                              </DropdownMenuItem>
                            )}
                            {onUnarchive && (
                              <DropdownMenuItem onClick={() => onUnarchive(conversation)}>
                                <ArchiveRestore className="h-3.5 w-3.5 me-2" />
                                {t.conversations.unarchive}
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(conversation)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 me-2" />
                                {t.common.delete}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <div className="shrink-0 p-2 border-t border-slate-200 dark:border-slate-800">
        <Button
          onClick={onNewChat}
          size="sm"
          className="w-full h-8 text-[13px] font-medium"
        >
          <MessageSquarePlus className="w-4 h-4 me-1.5" />
          {t.conversations.newChat}
        </Button>
      </div>
    </div>
  );
};

export default ConversationList;
