import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import CallModal, { getCallStatusLabel, type CallModalStatus } from '@/components/conversations/call/CallModal';
import CallControls from '@/components/conversations/call/CallControls';
import CallTimer from '@/components/conversations/call/CallTimer';
import UserAvatar from '@/components/common/UserAvatar';
import type { CallUiState } from '@/hooks/useWebRtcCall';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

type Presentation = 'expanded' | 'compact' | 'fullscreen';

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
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onRetryMic: () => void;
  onSelectAudioInput?: (id: string) => void;
  onSelectVideoInput?: (id: string) => void;
  onSelectAudioOutput?: (id: string) => void;
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
  onToggleCamera,
  onToggleScreenShare,
  onRetryMic,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
}) => {
  const { t, tf } = useAppTranslation();
  const isMobile = useIsMobile();
  const status = callState.status as CallModalStatus;
  const isLive =
    status === 'calling' ||
    status === 'connecting' ||
    status === 'active' ||
    status === 'reconnecting';
  const isVideo = callState.kind === 'video';
  const hasVisualMedia =
    isVideo ||
    callState.isScreenSharing ||
    callState.hasRemoteVideo ||
    callState.peers.some((p) => p.hasVideo);
  /** Mobile video / screen share should own the viewport. */
  const preferMobileFullscreen = isMobile && hasVisualMedia;
  const [presentation, setPresentation] = useState<Presentation>(
    preferMobileFullscreen ? 'fullscreen' : 'expanded'
  );
  const dragStartY = useRef<number | null>(null);
  const showCompact = open && presentation === 'compact' && isLive;
  const showExpanded = open && !showCompact;

  useEffect(() => {
    if (!open) {
      setPresentation(preferMobileFullscreen ? 'fullscreen' : 'expanded');
      return;
    }
    // Promote to fullscreen when screen share / remote video starts (keep compact if minimized).
    if (preferMobileFullscreen) {
      setPresentation((p) => (p === 'compact' ? p : 'fullscreen'));
    }
  }, [open, preferMobileFullscreen]);

  useEffect(() => {
    if (!isLive && presentation === 'compact') setPresentation('expanded');
  }, [isLive, presentation]);

  const minimize = useCallback(() => {
    if (isLive) setPresentation('compact');
  }, [isLive]);

  const expand = useCallback(() => {
    // Expanding the mini bar: video → immersive fullscreen; voice → light sheet
    setPresentation(preferMobileFullscreen ? 'fullscreen' : 'expanded');
  }, [preferMobileFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setPresentation((p) => (p === 'fullscreen' ? 'expanded' : 'fullscreen'));
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || presentation === 'fullscreen') return;
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? dragStartY.current;
    const delta = endY - dragStartY.current;
    dragStartY.current = null;
    // Swipe down → minimize; swipe up on voice sheet → light fullscreen
    if (delta > 56 && isLive) {
      minimize();
      return;
    }
    if (delta < -56 && isLive && !hasVisualMedia && presentation !== 'fullscreen') {
      setPresentation('fullscreen');
    }
  };

  if (!open) return null;

  // Sheet by default on mobile voice; fullscreen when requested (same light style) or for video/share.
  const layout: 'card' | 'sheet' | 'fullscreen' = (() => {
    if (presentation === 'fullscreen') return 'fullscreen';
    if (isMobile) {
      if (preferMobileFullscreen) return 'fullscreen';
      return 'sheet';
    }
    return 'card';
  })();

  return (
    <>
      <audio id="remote-audio" autoPlay playsInline className="hidden" />

      {showCompact ? (
        <div
          role="dialog"
          aria-label={`Call with ${remoteName}`}
          className={cn(
            'fixed inset-x-3 bottom-3 z-[110] mx-auto flex max-w-lg flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)] backdrop-blur-xl',
            'dark:border-slate-700/80 dark:bg-slate-900/90 sm:inset-x-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px]'
          )}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={expand}
              aria-label={t.conversations.call.expandAria}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <div className="relative shrink-0">
                <UserAvatar
                  image={remoteAvatar ?? undefined}
                  firstName={remoteFirstName}
                  lastName={remoteLastName}
                  size="md"
                  className="h-10 w-10 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                />
                <span
                  className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {remoteName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CallTimer
                    active={status === 'active'}
                    startTime={callState.startTime}
                    className="font-medium tabular-nums"
                  />
                  <span className="text-slate-400">·</span>
                  <span className="truncate text-slate-500">{getCallStatusLabel(status)}</span>
                </p>
              </div>
            </button>
            <CallControls
              variant="compact"
              kind={callState.kind}
              isMuted={callState.isMuted}
              isCameraOff={callState.isCameraOff}
              isScreenSharing={callState.isScreenSharing}
              onToggleMute={onToggleMute}
              onToggleCamera={onToggleCamera}
              onToggleScreenShare={onToggleScreenShare}
              onEndCall={onEndCall}
              canExpand
              onExpand={expand}
            />
          </div>
          {hasVisualMedia ? (
            <button type="button" onClick={expand} className="relative h-28 w-full overflow-hidden rounded-xl bg-slate-900">
              <video
                autoPlay
                playsInline
                muted
                className={cn(
                  'h-full w-full opacity-90',
                  callState.isScreenSharing || (!isVideo && callState.hasRemoteVideo)
                    ? 'object-contain'
                    : 'object-cover'
                )}
                ref={(el) => {
                  if (!el) return;
                  const remote = document.getElementById('remote-video') as HTMLVideoElement | null;
                  if (remote?.srcObject) el.srcObject = remote.srcObject;
                }}
              />
              {callState.isScreenSharing ? (
                <span className="absolute bottom-1 start-1 rounded bg-indigo-600/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  {t.conversations.call.sharingScreen}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      ) : null}

      {showExpanded ? (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) {
              if (isLive) {
                minimize();
                return;
              }
              onOpenChange(false);
            }
          }}
        >
          <DialogPortal>
            <DialogPrimitive.Overlay
              className={cn(
                'fixed inset-0 z-50 transition-colors duration-200',
                layout === 'fullscreen'
                  ? 'bg-slate-950/40 backdrop-blur-sm'
                  : layout === 'sheet'
                    ? 'bg-slate-950/25 backdrop-blur-[2px]'
                    : 'bg-slate-950/30 backdrop-blur-[3px]',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
              )}
            />
            <DialogPrimitive.Content
              className={cn(
                'fixed z-50 outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
                layout === 'card' &&
                  'left-1/2 top-1/2 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                layout === 'sheet' &&
                  'inset-x-0 bottom-0 max-h-[min(85dvh,640px)] overflow-y-auto data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
                layout === 'fullscreen' &&
                  'inset-0 flex h-[100dvh] max-h-[100dvh] flex-col data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
              )}
              onPointerDownOutside={(e) => {
                e.preventDefault();
                if (isLive) minimize();
              }}
              onEscapeKeyDown={(e) => {
                e.preventDefault();
                if (isLive) minimize();
                else onClose();
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">
                {tf(
                  isVideo ? t.conversations.call.videoCallWith : t.conversations.call.voiceCallWith,
                  { name: remoteName },
                )}
              </DialogPrimitive.Title>
              <CallModal
                status={status}
                kind={callState.kind}
                remoteName={remoteName}
                remoteAvatar={remoteAvatar}
                remoteFirstName={remoteFirstName}
                remoteLastName={remoteLastName}
                isMuted={callState.isMuted}
                isCameraOff={callState.isCameraOff}
                isScreenSharing={callState.isScreenSharing}
                callStartTime={callState.startTime}
                endedDurationSec={callState.endedDurationSec}
                micDenied={callState.micDenied}
                mediaErrorMessage={callState.mediaErrorMessage}
                connectionQuality={callState.connectionQuality}
                layout={layout}
                onToggleMute={onToggleMute}
                onToggleCamera={onToggleCamera}
                onToggleScreenShare={onToggleScreenShare}
                onEndCall={onEndCall}
                onClose={onClose}
                onRetryMic={onRetryMic}
                onMinimize={isLive ? minimize : undefined}
                onToggleFullscreen={isLive ? toggleFullscreen : undefined}
                selectedAudioInputId={callState.selectedAudioInputId}
                selectedVideoInputId={callState.selectedVideoInputId}
                selectedAudioOutputId={callState.selectedAudioOutputId}
                onSelectAudioInput={onSelectAudioInput}
                onSelectVideoInput={onSelectVideoInput}
                onSelectAudioOutput={onSelectAudioOutput}
                callingProgress={callingProgress}
              />
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>
      ) : null}
    </>
  );
};

export default CallDialog;
