import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CallModal, { type CallModalStatus } from '@/components/conversations/call/CallModal';
import type { CallUiState } from '@/hooks/useWebRtcCall';

interface CallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callState: CallUiState;
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  callingProgress: number;
  onEndCall: () => void;
  onClose: () => void;
  onToggleMute: () => void;
  onRetryMic: () => void;
}

const CallDialog: React.FC<CallDialogProps> = ({
  open,
  onOpenChange,
  callState,
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  callingProgress,
  onEndCall,
  onClose,
  onToggleMute,
  onRetryMic,
}) => {
  const status = callState.status as CallModalStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[440px] border-0 bg-transparent p-0 shadow-none sm:max-w-[440px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <CallModal
          status={status}
          remoteName={remoteName}
          remoteAvatar={remoteAvatar}
          remoteFirstName={remoteFirstName}
          remoteLastName={remoteLastName}
          isMuted={callState.isMuted}
          callStartTime={callState.startTime}
          endedDurationSec={callState.endedDurationSec}
          micDenied={callState.micDenied}
          onToggleMute={onToggleMute}
          onEndCall={onEndCall}
          onClose={onClose}
          onRetryMic={onRetryMic}
          callingProgress={callingProgress}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CallDialog;
