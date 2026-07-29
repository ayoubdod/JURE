import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { apiRenameConversation } from '@/services/conversations/api';
import { useToast } from '@/hooks/use-toast';

export interface RenameGroupModalRef {
  show: (conversation: API.Conversation) => void;
  hide: () => void;
}

export interface RenameGroupModalProps {
  onSuccess?: (conversation: API.Conversation) => void;
}

const getDisplayTitle = (c: API.Conversation) =>
  (c as any).display_name ?? c.title ?? '';

const RenameGroupModal = forwardRef<RenameGroupModalRef, RenameGroupModalProps>(
  ({ onSuccess }, ref) => {
    const [instance, setInstance] = useState<API.Conversation | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const { toast } = useToast();

    useImperativeHandle(ref, () => ({
      show: (conversation: API.Conversation) => {
        if (conversation.type !== 'group') return;
        setInstance(conversation);
        setTitle(getDisplayTitle(conversation));
        setIsOpen(true);
      },
      hide: () => setIsOpen(false),
    }));

    useEffect(() => {
      if (isOpen && instance) {
        setTitle(getDisplayTitle(instance));
      }
    }, [isOpen, instance]);

    const handleSubmit = async () => {
      if (!instance) return;
      const trimmed = title.trim();
      if (!trimmed) {
        toast({ title: 'Enter a name', description: 'Group name cannot be empty.', variant: 'destructive' });
        return;
      }
      setIsLoading(true);
      try {
        const { data } = await apiRenameConversation(instance.id, trimmed);
        const updated = { ...instance, ...data, title: trimmed, display_name: (data as any).display_name ?? trimmed };
        setIsOpen(false);
        onSuccess?.(updated);
        toast({ title: 'Group renamed', description: `Renamed to "${trimmed}".` });
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 400) {
            const msg = (error.response?.data as any)?.title?.[0] ?? (error.response?.data as any)?.detail ?? 'Only group conversations can be renamed.';
            toast({ title: 'Cannot rename', description: msg, variant: 'destructive' });
            return;
          }
          if (status === 403) {
            toast({ title: 'Access denied', description: 'You are not allowed to rename this conversation.', variant: 'destructive' });
            return;
          }
          if (status === 404) {
            toast({ title: 'Not found', description: 'Conversation not found.', variant: 'destructive' });
            return;
          }
        }
        toast({ title: 'Error', description: 'Could not rename group. Please try again.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    if (!instance) return null;

    return (
      <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
            <DialogDescription>
              Enter a new name for this group conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="rename-group-input">Group name</Label>
            <Input
              id="rename-group-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Group name"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

RenameGroupModal.displayName = 'RenameGroupModal';

export default RenameGroupModal;
