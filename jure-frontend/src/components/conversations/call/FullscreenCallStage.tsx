import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { useCallSessionStore } from '@/stores/callSessionStore';
import CallTimer from './CallTimer';
import CallControls from './CallControls';
import VideoStage from './VideoStage';

const HIDE_MS = 3200;

/**
 * Immersive mobile/desktop fullscreen call surface matching the JURE video redesign:
 * edge-to-edge video, floating chrome, and screen-share takeover with auto-hide controls.
 */
const FullscreenCallStage: React.FC<{
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  kind: 'voice' | 'video';
  status: 'connecting' | 'active' | 'reconnecting' | string;
  callStartTime: Date | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
  selectedAudioInputId?: string | null;
  selectedVideoInputId?: string | null;
  selectedAudioOutputId?: string | null;
  onSelectAudioInput?: (id: string) => void;
  onSelectVideoInput?: (id: string) => void;
  onSelectAudioOutput?: (id: string) => void;
}> = ({
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  kind,
  status,
  callStartTime,
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  onMinimize,
  selectedAudioInputId,
  selectedVideoInputId,
  selectedAudioOutputId,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
}) => {
  const { t, tf } = useAppTranslation();
  const call = t.conversations.call;
  const mode = useCallSessionStore((s) => s.ui.mode);
  const peers = useCallSessionStore((s) => s.ui.peers);
  const displayTitle = useCallSessionStore((s) => s.ui.displayTitle);
  const hasRemoteVideo = useCallSessionStore((s) => s.ui.hasRemoteVideo);

  const remoteSharerPeer =
    !isScreenSharing && kind === 'voice'
      ? peers.find((p) => p.hasVideo) ?? null
      : null;

  const screenShareActive =
    isScreenSharing ||
    Boolean(remoteSharerPeer) ||
    (kind === 'voice' && hasRemoteVideo && !isScreenSharing);

  const sharerName = isScreenSharing
    ? null
    : remoteSharerPeer?.name || remoteName;

  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Auto-hide only during screen share (spec); keep visible for normal video.
    if (screenShareActive) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), HIDE_MS);
    }
  }, [screenShareActive]);

  useEffect(() => {
    bumpChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [bumpChrome, isScreenSharing, screenShareActive]);

  const title =
    mode === 'conference'
      ? displayTitle?.trim() || call.groupCallTitle
      : remoteName;

  const peerCount = mode === 'conference' ? Math.max(peers.length + 1, 1) : 2;

  return (
    <div
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black text-white"
      onPointerDown={bumpChrome}
      role="presentation"
    >
      <VideoStage
        remoteName={remoteName}
        remoteAvatar={remoteAvatar}
        remoteFirstName={remoteFirstName}
        remoteLastName={remoteLastName}
        immersive
        screenShareMode={screenShareActive}
        className="absolute inset-0 h-full w-full rounded-none"
        localPipClassName={
          screenShareActive
            ? 'hidden'
            : 'bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] end-[max(0.75rem,env(safe-area-inset-right))]'
        }
      />

      {/* Top chrome */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20 transition-all duration-300',
          chromeVisible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
        )}
      >
        <div
          className="pointer-events-auto bg-gradient-to-b from-black/70 via-black/35 to-transparent px-3 pb-6 pt-[max(0.65rem,env(safe-area-inset-top))]"
        >
          {screenShareActive ? (
            <div className="flex items-center gap-2 rounded-xl bg-black/55 px-3 py-2 backdrop-blur-md ring-1 ring-white/10">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                {isScreenSharing
                  ? call.youAreSharing
                  : tf(call.isSharingScreen, { name: sharerName || remoteName })}
              </p>
              {isScreenSharing && onToggleScreenShare ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleScreenShare();
                  }}
                  className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  {call.stopShareScreen}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-white/75">
                  <CallTimer
                    active={status === 'active'}
                    startTime={callStartTime}
                    className="font-medium tabular-nums text-white"
                  />
                  {mode === 'conference' ? (
                    <span className="inline-flex items-center gap-1 text-white/65">
                      <Users className="h-3 w-3" aria-hidden />
                      {peerCount}
                    </span>
                  ) : null}
                </p>
              </div>
              {onMinimize ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMinimize();
                  }}
                  aria-label={call.minimize}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/15 hover:bg-white/15"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Bottom floating controls */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-20 transition-all duration-300',
          chromeVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <div className="pointer-events-auto bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-10">
          <CallControls
            variant="floating"
            kind={kind}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onToggleScreenShare={onToggleScreenShare}
            onEndCall={onEndCall}
            canMinimize={Boolean(onMinimize)}
            onMinimize={onMinimize}
            selectedAudioInputId={selectedAudioInputId}
            selectedVideoInputId={selectedVideoInputId}
            selectedAudioOutputId={selectedAudioOutputId}
            onSelectAudioInput={onSelectAudioInput}
            onSelectVideoInput={onSelectVideoInput}
            onSelectAudioOutput={onSelectAudioOutput}
          />
        </div>
      </div>

      {/* Tap hint when chrome hidden during share */}
      {!chromeVisible && screenShareActive ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-default"
          aria-label={call.showControlsAria}
          onClick={bumpChrome}
        />
      ) : null}
    </div>
  );
};

export default React.memo(FullscreenCallStage);
