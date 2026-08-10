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
import { apiDeleteConversation } from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';

export interface DeleteChatModalRef {
  show: (conversation: API.Conversation) => void;
  hide: () => void;
}

export interface DeleteChatModalProps {
  onSuccess?: (_: API.Conversation) => void;
}

const DeleteChatModal = forwardRef<DeleteChatModalRef, DeleteChatModalProps>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const m = t.conversations.deleteChat;
  const [instance, setInstance] = useState<API.Conversation | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    show: (conversation: API.Conversation) => {
      setInstance(conversation);
      setIsOpen(true);
    },
    hide: () => setIsOpen(false),
  }));

  const handleSubmit = async () => {
    if (!instance) return;
    setIsLoading(true);
    try {
      await apiDeleteConversation(instance.id);
      setIsOpen(false);
      onSuccess?.(instance);
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: t.conversations.toasts.accessDenied,
            description: t.conversations.toasts.accessDeniedMember,
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
      toast({ title: t.common.error, description: m.errorDesc, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!instance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {instance.type === 'group' ? m.leaveTitle : m.deleteTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {instance.type === 'group'
              ? tf(m.leaveConfirm, { title: instance.title ?? '' })
              : m.deleteConfirm}
          </p>
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : instance.type === 'group' ? (
              m.leave
            ) : (
              t.common.delete
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

DeleteChatModal.displayName = 'DeleteChatModal';

export default DeleteChatModal;
