'use client'
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import useUserStore from '@/stores/userStore';
import { Loader2, X, Trash2, AlertTriangle } from 'lucide-react';
import { apiDeleteCabinetMember } from '@/services/cabinet-member/api';
import { getCabinetMemberRouteId } from '@/utils/cabinetMemberHelpers';

export interface CabinetMemberDeleteModalRef {
  show: (member: API.CabinetMember) => void;
  hide: () => void;
}

export interface CabinetMemberDeleteModalProps {
  onSuccess?: (_: API.CabinetMember) => void;
}

const CabinetMemberDeleteModal = forwardRef<CabinetMemberDeleteModalRef, CabinetMemberDeleteModalProps>(({ onSuccess }, ref) => {
  const [instance, setInstance] = useState<API.CabinetMember | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userStore = useUserStore();

  useImperativeHandle(ref, () => ({
    show: (member: API.CabinetMember) => {
      setInstance(member);
      setIsOpen(true);
    },
    hide: () => setIsOpen(false),
  }));

  const handleSubmit = async () => {
    setIsLoading(true);
    await apiDeleteCabinetMember(getCabinetMemberRouteId(instance))
      .then(() => {
        setIsOpen(false);
        onSuccess?.(instance);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#FF6B6B] via-[#FF8E8E] to-[#FFB3B3] overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Delete Cabinet Member
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                Are you sure you want to remove {instance?.first_name} {instance?.last_name} from the team?
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                This will permanently remove the member and all associated data. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 pb-6 pt-0">
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
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CabinetMemberDeleteModal.displayName = 'CabinetMemberDeleteModal';

export default CabinetMemberDeleteModal;
