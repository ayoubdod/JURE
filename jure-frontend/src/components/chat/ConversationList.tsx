import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquarePlus, Search } from 'lucide-react';
import { apiGetAllCabinetMembers } from '@/services/cabinet-member/api';
import { Button } from '../ui/button';
import UserAvatar, { getPersonImage, PresenceDot } from '../common/UserAvatar';
import useUserStore from '@/stores/userStore';
import useChatStore from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import ConversationListItem from './ConversationListItem';
import { getDirectPeer, getLinkedCase, getMemberPerson } from './conversationUtils';
import { isCabinetMemberOnline, isOnlineUserId, personPresenceId } from '@/lib/presence';

type ListFilter = 'all' | 'unread' | 'cases' | 'team' | 'archived';

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
  onSelectMember?: (memberId: number) => void;
  onOpenLinkedCase?: (caseId: number) => void;
  className?: string;
}

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
  onOpenLinkedCase,
  className,
}) => {
  const { t } = useAppTranslation();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [members, setMembers] = useState<API.CabinetMember[]>([]);
  const chatStore = useChatStore();
  const currentUser = useUserStore((s) => s.user);

  useEffect(() => {
    apiGetAllCabinetMembers({ expand: 'user' })
      .then((res) => setMembers(res.data ?? []))
      .catch(() => apiGetAllCabinetMembers().then((r) => setMembers(r.data ?? [])));
  }, []);

  const recentMessages = chatStore.notifications.filter((m: { is_message?: boolean }) => m.is_message);
  const onlineIds = chatStore.onlineIds ?? [];

  const isMemberOnline = (member: API.CabinetMember) => isCabinetMemberOnline(member, onlineIds);

  const membersForAvatars = useMemo(() => {
    const currentEmail = (currentUser?.email ?? '').toLowerCase();
    const filtered = members.filter((m) => m.email?.toLowerCase() !== currentEmail);
    return [...filtered].sort((a, b) => {
      const aOnline = isMemberOnline(a);
      const bOnline = isMemberOnline(b);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    });
  }, [members, currentUser?.email, onlineIds]);

  const matchesQuery = (c: API.Conversation) => {
    const title = c.display_name ?? c.title ?? '';
    const people = (c.memberships ?? [])
      .map((p) => {
        const u = getMemberPerson(p);
        return `${u?.first_name ?? ''} ${u?.last_name ?? ''} ${u?.email ?? ''}`.trim();
      })
      .join(' ');
    const linked = getLinkedCase(c);
    const matter = `${linked?.reference ?? ''} ${linked?.title ?? ''}`;
    return `${title} ${people} ${matter}`.toLowerCase().includes(q.toLowerCase());
  };

  const unreadFor = (conversation: API.Conversation) => {
    const apiUnread = conversation.unread_count ?? (conversation as { unreadCount?: number }).unreadCount;
    if (typeof apiUnread === 'number') return apiUnread;
    return recentMessages.filter(
      (i: { conversation_id?: number; unread?: boolean }) =>
        i.conversation_id == conversation.id && i.unread
    ).length;
  };

  const sourceList = filter === 'archived' ? archivedConversations : conversations;

  const filtered = useMemo(() => {
    return sourceList.filter((c) => {
      if (!matchesQuery(c)) return false;
      if (filter === 'unread') return unreadFor(c) > 0;
      if (filter === 'cases') return !!getLinkedCase(c);
      if (filter === 'team') return c.type === 'group';
      return true;
    });
  }, [q, sourceList, filter, recentMessages]);

  const filters: { id: ListFilter; label: string }[] = [
    { id: 'all', label: t.conversations.filters.all },
    { id: 'unread', label: t.conversations.filters.unread },
    { id: 'cases', label: t.conversations.filters.cases },
    { id: 'team', label: t.conversations.filters.team },
    { id: 'archived', label: t.conversations.filters.archived },
  ];

  const handleFilter = (next: ListFilter) => {
    setFilter(next);
    if (next === 'archived' && !showArchived) onToggleArchived?.();
  };

  const isPeerOnline = (c: API.Conversation) => {
    if (c.type !== 'direct') return false;
    const peer = getDirectPeer(c, currentUser?.email);
    const person = peer ? getMemberPerson(peer) : c.other_participant;
    return isOnlineUserId(personPresenceId(person), onlineIds);
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full shrink-0 flex-col border-e border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 md:w-[300px] min-[1200px]:w-[300px]',
        className ?? 'flex'
      )}
    >
      <div className="shrink-0 border-b border-slate-200 px-3 pb-2.5 pt-3 dark:border-slate-800">
        <h1 className="mb-2.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {t.conversations.title}
        </h1>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            placeholder={t.conversations.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pe-3 ps-8 text-[13px] text-slate-800 placeholder:text-slate-400 transition-shadow focus:border-[#64499D]/40 focus:outline-none focus:ring-2 focus:ring-[#64499D]/15 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
            aria-label={t.conversations.searchPlaceholder}
          />
        </div>
        <div
          className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label={t.conversations.title}
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => handleFilter(f.id)}
              className={cn(
                'h-7 shrink-0 rounded-full px-2.5 text-[11px] font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30',
                filter === f.id
                  ? 'bg-[#64499D] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {membersForAvatars.length > 0 && filter !== 'archived' ? (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
            {membersForAvatars.map((m) => {
              const memberImage = getPersonImage(m as Record<string, unknown>);
              const isOnline = isMemberOnline(m);
              const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMember?.(m.id)}
                  className="group relative flex shrink-0 flex-col items-center"
                  title={name}
                  aria-label={name}
                >
                  <div className="relative">
                    <UserAvatar
                      image={memberImage}
                      firstName={m.first_name}
                      lastName={m.last_name}
                      size="sm"
                      className="h-8 w-8 ring-2 ring-transparent transition-shadow group-hover:ring-[#64499D]/30"
                    />
                    {isOnline ? <PresenceDot online className="h-2 w-2 border" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label={t.conversations.title}>
        {filter === 'archived' && archivedLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : isLoading ? (
          <div className="space-y-1 p-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-2.5 py-2">
                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800/80" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-slate-500">
            {filter === 'archived' ? t.conversations.archivedEmpty : t.conversations.empty}
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                active={activeId === conversation.id}
                currentEmail={currentUser?.email}
                isOnline={isPeerOnline(conversation)}
                unreadCount={unreadFor(conversation)}
                archived={filter === 'archived'}
                onSelect={onSelectConversation}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onPin={onPin}
                onUnpin={onUnpin}
                onDelete={onDelete}
                onRename={onRename}
                onChangeIcon={onChangeIcon}
                onOpenLinkedCase={onOpenLinkedCase}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 p-2.5 dark:border-slate-800">
        <Button onClick={onNewChat} size="sm" className="h-9 w-full text-[13px] font-medium">
          <MessageSquarePlus className="me-1.5 h-4 w-4" />
          {t.conversations.newChat}
        </Button>
      </div>
    </div>
  );
};

export default ConversationList;
