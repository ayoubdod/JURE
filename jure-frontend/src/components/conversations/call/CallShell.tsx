import React from 'react';
import CallDialog from '@/components/chat/CallDialog';
import IncomingCallNotification from '@/components/conversations/call/IncomingCallNotification';
import { useCallSessionStore, useWebRtcCall } from '@/stores/callSessionStore';
import {
  attachRemoteMedia,
  onRemoteAudioPlayBlocked,
  parkRemoteAudioIn,
  refreshRemoteAudioPlayback,
} from '@/utils/webrtc';

/**
 * App-level call UI. Mount once under DashboardLayout so calls survive navigation.
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
  const peers = callState.peers;
  const status = callState.status;
  const [audioBlocked, setAudioBlocked] = React.useState(false);

  React.useEffect(() => onRemoteAudioPlayBlocked(setAudioBlocked), []);

  React.useEffect(() => {
    if (status !== 'active' && status !== 'connecting' && status !== 'reconnecting') return;
    const bind = () => {
      const stream = getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    };
    bind();
    const t = window.setTimeout(bind, 400);
    return () => window.clearTimeout(t);
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
    void refreshRemoteAudioPlayback();
    acceptIncoming();
  };

  const handleTapToHear = () => {
    void (async () => {
      await refreshRemoteAudioPlayback(getRemoteStream());
      peers.forEach((p) => {
        if (p.stream) attachRemoteMedia(p.stream);
      });
    })();
  };

  const live = status === 'active' || status === 'connecting' || status === 'reconnecting';

  return (
    <>
      <div
        ref={(el) => {
          if (!showCallModal) parkRemoteAudioIn(el);
        }}
        className="pointer-events-none fixed bottom-0 left-0 z-[1] h-2 w-2 overflow-hidden"
        aria-hidden
      />

      {live && audioBlocked ? (
        <button
          type="button"
          onClick={handleTapToHear}
          className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-indigo-400/40"
        >
          Tap to hear
        </button>
      ) : null}

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
