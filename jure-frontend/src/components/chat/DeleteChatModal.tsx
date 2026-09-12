import { forwardRef, useImperativeHandle, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { apiDeleteConversation, apiDeleteGroupConversation } from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { isLastActiveMember } from '@/components/chat/conversationUtils';

export interface DeleteChatModalRef {
  show: (conversation: API.Conversation, options?: { deleteForEveryone?: boolean }) => void;
  hide: () => void;
}

export interface DeleteChatModalProps {
  onSuccess?: (_: API.Conversation) => void;
}

type Mode = 'direct' | 'leave' | 'last-member' | 'delete-group';

function resolveMode(conversation: API.Conversation, deleteForEveryone?: boolean): Mode {
  if (conversation.type !== 'group') return 'direct';
  if (deleteForEveryone) return 'delete-group';
  if (isLastActiveMember(conversation)) return 'last-member';
  return 'leave';
}

const DeleteChatModal = forwardRef<DeleteChatModalRef, DeleteChatModalProps>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const m = t.conversations.deleteChat;
  const [instance, setInstance] = useState<API.Conversation | null>(null);
  const [mode, setMode] = useState<Mode>('leave');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    show: (conversation, options) => {
      setInstance(conversation);
      setMode(resolveMode(conversation, options?.deleteForEveryone));
      setIsOpen(true);
    },
    hide: () => setIsOpen(false),
  }));

  const handleSubmit = async () => {
    if (!instance) return;
    setIsLoading(true);
    try {
      if (mode === 'delete-group') {
        await apiDeleteGroupConversation(instance.id);
        toast({ title: t.conversations.toasts.groupDeleted });
      } else {
        await apiDeleteConversation(instance.id);
      }
      setIsOpen(false);
      onSuccess?.(instance);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: t.conversations.toasts.accessDenied,
            description:
              mode === 'delete-group'
                ? t.conversations.toasts.accessDeniedAdmin
                : t.conversations.toasts.accessDeniedMember,
            variant: 'destructive',
          });
          return;
        }
        if (status === 404) {
          toast({
            title: t.conversations.toasts.notFoundTitle,
            description: m.notFoundDesc,
            variant: 'destructive',
          });
          onSuccess?.(instance);
          setIsOpen(false);
          return;
        }
      }
      toast({
        title: t.common.error,
        description: mode === 'delete-group' ? t.conversations.toasts.couldNotDeleteGroup : m.errorDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!instance) return null;

  const title = instance.display_name || instance.title || '';
  const heading =
    mode === 'delete-group'
      ? m.deleteGroupTitle
      : mode === 'last-member'
        ? m.lastMemberTitle
        : mode === 'leave'
          ? m.leaveTitle
          : m.deleteTitle;
  const body =
    mode === 'delete-group'
      ? tf(m.deleteGroupConfirm, { title })
      : mode === 'last-member'
        ? tf(m.lastMemberConfirm, { title })
        : mode === 'leave'
          ? tf(m.leaveConfirm, { title })
          : m.deleteConfirm;
  const actionLabel =
    mode === 'delete-group'
      ? m.deleteGroup
      : mode === 'last-member'
        ? m.lastMemberAction
        : mode === 'leave'
          ? m.leave
          : t.common.delete;

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

DeleteChatModal.displayName = 'DeleteChatModal';

export default DeleteChatModal;
