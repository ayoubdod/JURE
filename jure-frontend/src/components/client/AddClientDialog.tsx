import { useEffect, useRef } from 'react';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddClientDialog = ({ open, onOpenChange }: AddClientDialogProps) => {
  const modalRef = useRef<ClientCreateModalRef>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      modalRef.current?.show();
    }
    if (!open && wasOpen.current) {
      modalRef.current?.hide();
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <ClientCreateModal
      ref={modalRef}
      onClose={() => onOpenChange(false)}
    />
  );
};

export default AddClientDialog;
