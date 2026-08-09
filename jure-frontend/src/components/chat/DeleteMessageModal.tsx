import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

interface DeleteMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: API.Message | null;
  onConfirm: () => Promise<void>;
}

const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  open,
  onOpenChange,
  message,
  onConfirm,
}) => {
  const { t } = useAppTranslation();
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (!message) return;
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.conversations.deleteMessage.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t.conversations.deleteMessage.description}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t.common.cancel}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMessageModal;
