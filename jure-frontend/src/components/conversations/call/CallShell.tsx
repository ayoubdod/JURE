import React from 'react';
import CallDialog from '@/components/chat/CallDialog';
import IncomingCallNotification from '@/components/conversations/call/IncomingCallNotification';
import { useCallSessionStore, useWebRtcCall } from '@/stores/callSessionStore';
import { attachRemoteMedia } from '@/utils/webrtc';

/**
 * App-level call UI shell. Mount once under DashboardLayout so calls survive navigation.
 * `#remote-audio` stays mounted for the whole dashboard session so WebRTC ontrack
 * can always attach — even before CallDialog opens after Accept.
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

  const getRemoteStream = useCallSessionStore((s) => s.getRemoteStream);
  const status = callState.status;

  // Re-bind remote audio whenever a call becomes live (Accept race + minimize remount).
  React.useEffect(() => {
    if (status !== 'active' && status !== 'connecting' && status !== 'reconnecting') return;
    const bind = () => {
      const stream = getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    };
    bind();
    const t1 = window.setTimeout(bind, 100);
    const t2 = window.setTimeout(bind, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [status, getRemoteStream]);

  const handleCallModalClose = () => {
    const s = callState.status;
    if (s === 'ended' || s === 'declined' || s === 'missed' || s === 'error') {
      closeUi();
    } else {
      endCall();
    }
  };

  const handleAccept = () => {
    acceptIncoming();
    // Accept is a user gesture — unlock playback and retry attach shortly after tracks arrive.
    const bind = () => {
      const stream = useCallSessionStore.getState().getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    };
    bind();
    window.setTimeout(bind, 0);
    window.setTimeout(bind, 300);
    window.setTimeout(bind, 800);
  };

  return (
    <>
      <audio
        id="remote-audio"
        autoPlay
        playsInline
        className="pointer-events-none fixed h-px w-px opacity-0"
      />

      {showIncomingNotification && callState.remoteUser ? (
        <IncomingCallNotification
          visible
          kind={callState.kind}
          callerName={callState.remoteUser.name}
          callerAvatar={callState.remoteUser.avatar}
          firstName={callState.remoteUser.firstName}
          lastName={callState.remoteUser.lastName}
          onAccept={handleAccept}
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
