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

export interface DeleteChatModalRef {
  show: (conversation: API.Conversation) => void;
  hide: () => void;
}

export interface DeleteChatModalProps {
  onSuccess?: (_: API.Conversation) => void;
}

const DeleteChatModal = forwardRef<DeleteChatModalRef, DeleteChatModalProps>(({ onSuccess }, ref) => {
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
          toast({ title: 'Access denied', description: 'You are not a member of this conversation.', variant: 'destructive' });
          return;
        }
        if (status === 404) {
          toast({ title: 'Not found', description: 'Conversation not found. It may have been deleted.', variant: 'destructive' });
          onSuccess?.(instance);
          setIsOpen(false);
          return;
        }
      }
      toast({ title: 'Error', description: 'Could not complete the action. Please try again.', variant: 'destructive' });
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
            {instance.type === 'group' ? 'Leave conversation?' : 'Delete conversation'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {instance.type === 'group'
              ? `Are you sure you want to leave "${instance.title}"? You will no longer receive messages in this conversation.`
              : 'Are you sure you want to delete this conversation? This action cannot be undone.'}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : instance.type === 'group' ? 'Leave' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

DeleteChatModal.displayName = 'DeleteChatModal';

export default DeleteChatModal;
