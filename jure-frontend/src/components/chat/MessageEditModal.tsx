import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

interface MessageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: API.Message | null;
  onSave: (body: string) => Promise<void>;
}

const MessageEditModal: React.FC<MessageEditModalProps> = ({
  open,
  onOpenChange,
  message,
  onSave,
}) => {
  const { t } = useAppTranslation();
  const m = t.conversations.messageEdit;
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (message) {
      const text = message.body ?? (message as { content?: string }).content ?? '';
      setBody(text);
    } else {
      setBody('');
    }
  }, [message, open]);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || !message) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={m.placeholder}
          className="min-h-[100px] resize-none"
          disabled={saving}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !body.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessageEditModal;
