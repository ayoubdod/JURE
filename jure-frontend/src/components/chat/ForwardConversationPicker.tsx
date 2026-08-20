import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import GroupChatIcon from '@/components/chat/GroupChatIcon';
import { apiListConversations } from '@/services/conversations/api';
import { cn } from '@/lib/utils';
import useUserStore from '@/stores/userStore';
import { useAppTranslation } from '@/i18n';

interface ForwardConversationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConversationId: number;
  onSelect: (conversationId: number) => void;
}

const ForwardConversationPicker: React.FC<ForwardConversationPickerProps> = ({
  open,
  onOpenChange,
  currentConversationId,
  onSelect,
}) => {
  const [conversations, setConversations] = useState<API.Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const currentUser = useUserStore((s) => s.user);
  const { t } = useAppTranslation();

  useEffect(() => {
    if (open) {
      setSearch('');
      setLoading(true);
      apiListConversations()
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setConversations(list.filter((c) => c.id !== currentConversationId));
        })
        .catch(() => setConversations([]))
        .finally(() => setLoading(false));
    }
  }, [open, currentConversationId]);

  const getMemberPerson = (m: API.ConversationMembership) =>
    (m as any).user ?? (m as any).cabinet_member ?? (m as any).member;

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const dn = (c as any).display_name ?? c.title ?? '';
        const members = c.memberships?.map((m) => {
          const p = getMemberPerson(m);
          return `${p?.first_name ?? ''} ${p?.last_name ?? ''} ${p?.email ?? ''}`.trim();
        }).join(' ');
        return `${dn} ${members}`.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  const getPeer = (c: API.Conversation) =>
    c.type === 'direct'
      ? c.memberships.find((m) =>
          (getMemberPerson(m)?.email ?? '').toLowerCase() !== (currentUser?.email ?? '').toLowerCase()
        )
      : undefined;

  const getPeerPerson = (c: API.Conversation) => {
    const peer = getPeer(c);
    return peer ? getMemberPerson(peer) : (c as any).other_participant;
  };

  const getDisplayName = (c: API.Conversation) => {
    if ((c as any).display_name) return (c as any).display_name;
    if (c.type === 'direct') {
      const op = (c as any).other_participant;
      const person = getPeerPerson(c);
      return op?.full_name ?? (`${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim() || person?.email || t.conversations.unknownContact);
    }
    return c.title || t.conversations.groupFallback;
  };

  const getPeerImage = (c: API.Conversation) =>
    getPersonImage((c as any).other_participant) ?? getPersonImage(getPeerPerson(c) as Record<string, unknown>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t.conversations.forwardTo}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.conversations.searchPlaceholder}
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[280px]">
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t.conversations.empty}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => {
                const person = getPeerPerson(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelect(c.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors'
                    )}
                  >
                    {c.type === 'direct' && person ? (
                      <UserAvatar
                        image={getPeerImage(c)}
                        firstName={person.first_name}
                        lastName={person.last_name}
                        size="sm"
                        className="h-9 w-9 shrink-0"
                      />
                    ) : c.type === 'group' ? (
                      <GroupChatIcon
                        iconUrl={(c as API.Conversation).icon_url}
                        iconPresetEmoji={(c as API.Conversation).icon_preset_emoji}
                        size="md"
                        className="shrink-0"
                      />
                    ) : (
                      <UserAvatar
                        firstName={c.title?.slice(0, 1)}
                        lastName={c.title?.slice(1, 2)}
                        size="sm"
                        className="h-9 w-9 shrink-0"
                      />
                    )}
                    <span className="flex-1 truncate text-sm font-medium">{getDisplayName(c)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardConversationPicker;
