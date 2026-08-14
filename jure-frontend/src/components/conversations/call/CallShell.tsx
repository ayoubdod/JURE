import React from 'react';
import CallDialog from '@/components/chat/CallDialog';
import IncomingCallNotification from '@/components/conversations/call/IncomingCallNotification';
import { useCallSessionStore, useWebRtcCall } from '@/stores/callSessionStore';
import {
  attachRemoteMedia,
  onRemoteAudioPlayBlocked,
  unlockRemoteAudioPlayback,
} from '@/utils/webrtc';

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
  const [audioBlocked, setAudioBlocked] = React.useState(false);

  React.useEffect(() => onRemoteAudioPlayBlocked(setAudioBlocked), []);

  // Re-bind remote audio whenever a call becomes live (Accept race + minimize remount).
  React.useEffect(() => {
    if (status !== 'active' && status !== 'connecting' && status !== 'reconnecting') return;
    const bind = () => {
      const stream = getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    };
    bind();
    const t1 = window.setTimeout(bind, 100);
    const t2 = window.setTimeout(bind, 500);
    const t3 = window.setTimeout(bind, 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
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
    void unlockRemoteAudioPlayback();
    acceptIncoming();
    const bind = () => {
      const stream = useCallSessionStore.getState().getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    };
    window.setTimeout(bind, 0);
    window.setTimeout(bind, 300);
    window.setTimeout(bind, 1000);
  };

  const handleTapToHear = () => {
    void (async () => {
      await unlockRemoteAudioPlayback();
      const stream = getRemoteStream();
      if (stream) attachRemoteMedia(stream);
    })();
  };

  const live =
    status === 'active' || status === 'connecting' || status === 'reconnecting';

  return (
    <>
      <audio
        id="remote-audio"
        autoPlay
        playsInline
        // Do not use display:none / opacity-0 — some browsers suspend playback.
        className="pointer-events-none fixed left-0 top-0 z-[-1] h-px w-px"
        style={{ opacity: 0.01 }}
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
