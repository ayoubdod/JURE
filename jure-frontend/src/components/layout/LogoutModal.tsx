'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useUserStore from '@/stores/userStore';
import { apiLogoutUser } from '@/services/auth/api';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { devError } from '@/utils/devLog';

export interface LogoutModalRef {
  show: () => void;
  hide: () => void;
}

const LogoutModal = forwardRef<LogoutModalRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userStore = useUserStore();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  useImperativeHandle(ref, () => ({
    show: () => setIsOpen(true),
    hide: () => setIsOpen(false),
  }));

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await apiLogoutUser();
      userStore.logout();
      setIsOpen(false);
      navigate('/');
    } catch (error) {
      devError('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.logoutModal.title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t.logoutModal.description}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            {t.logoutModal.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : t.logoutModal.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

LogoutModal.displayName = 'LogoutModal';

export default LogoutModal;
