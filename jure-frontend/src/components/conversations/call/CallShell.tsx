import React from 'react';
import CallDialog from '@/components/chat/CallDialog';
import IncomingCallNotification from '@/components/conversations/call/IncomingCallNotification';
import { useCallSessionStore, useWebRtcCall } from '@/stores/callSessionStore';

/**
 * App-level call UI shell. Mount once under DashboardLayout so calls survive navigation.
 */
const CallShell: React.FC = () => {
  const bootstrap = useCallSessionStore((s) => s.bootstrap);
  React.useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const {
    callState,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    retryMic,
    closeUi,
    switchAudioInput,
    switchVideoInput,
    switchAudioOutput,
    showCallModal,
    showIncomingNotification,
  } = useWebRtcCall();

  const handleCallModalClose = () => {
    const s = callState.status;
    if (s === 'ended' || s === 'declined' || s === 'missed' || s === 'error') {
      closeUi();
    } else {
      endCall();
    }
  };

  return (
    <>
      {showIncomingNotification && callState.remoteUser ? (
        <IncomingCallNotification
          visible
          kind={callState.kind}
          callerName={callState.remoteUser.name}
          callerAvatar={callState.remoteUser.avatar}
          firstName={callState.remoteUser.firstName}
          lastName={callState.remoteUser.lastName}
          onAccept={acceptIncoming}
          onDecline={rejectIncoming}
        />
      ) : null}

      {showCallModal && (callState.remoteUser || callState.displayTitle) ? (
        <CallDialog
          open
          onOpenChange={(open) => {
            if (!open) handleCallModalClose();
          }}
          callState={callState}
          remoteName={
            callState.mode === 'conference' && callState.displayTitle
              ? callState.displayTitle
              : callState.remoteUser?.name ?? callState.displayTitle ?? 'Call'
          }
          remoteAvatar={callState.remoteUser?.avatar}
          remoteFirstName={callState.remoteUser?.firstName}
          remoteLastName={callState.remoteUser?.lastName}
          callingProgress={callState.callingProgress}
          onEndCall={endCall}
          onClose={handleCallModalClose}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={() => void toggleScreenShare()}
          onRetryMic={retryMic}
          onSelectAudioInput={(id) => void switchAudioInput(id)}
          onSelectVideoInput={(id) => void switchVideoInput(id)}
          onSelectAudioOutput={(id) => void switchAudioOutput(id)}
        />
      ) : null}
    </>
  );
};

export default CallShell;
