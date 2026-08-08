import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import CallModal, { getCallStatusLabel, type CallModalStatus } from '@/components/conversations/call/CallModal';
import CallControls from '@/components/conversations/call/CallControls';
import CallTimer from '@/components/conversations/call/CallTimer';
import UserAvatar from '@/components/common/UserAvatar';
import type { CallUiState } from '@/hooks/useWebRtcCall';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const status = callState.status as CallModalStatus;
  const isLive = status === 'calling' || status === 'connecting' || status === 'active';
  const [presentation, setPresentation] = useState<Presentation>('expanded');
  const dragStartY = useRef<number | null>(null);
  const showCompact = open && presentation === 'compact' && isLive;
  const showExpanded = open && !showCompact;

  useEffect(() => {
    if (!open) setPresentation('expanded');
  }, [open]);

  useEffect(() => {
    if (!isLive && presentation === 'compact') setPresentation('expanded');
  }, [isLive, presentation]);

  const minimize = useCallback(() => {
    if (isLive) setPresentation('compact');
  }, [isLive]);

  const expand = useCallback(() => setPresentation('expanded'), []);

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
    if (delta > 56 && isLive) minimize();
  };

  if (!open) return null;

  const layout = presentation === 'fullscreen' ? 'fullscreen' : isMobile ? 'sheet' : 'card';

  return (
    <>
      <audio id="remote-audio" autoPlay playsInline className="hidden" />

      {showCompact ? (
        <div
          role="dialog"
          aria-label={`Call with ${remoteName}`}
          className={cn(
            'fixed inset-x-3 bottom-3 z-[110] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)] backdrop-blur-xl',
            'dark:border-slate-700/80 dark:bg-slate-900/90 sm:inset-x-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px]'
          )}
        >
          <button type="button" onClick={expand} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="Expand call">
            <div className="relative shrink-0">
              <UserAvatar image={remoteAvatar ?? undefined} firstName={remoteFirstName} lastName={remoteLastName} size="md" className="h-10 w-10 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{remoteName}</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CallTimer active startTime={callState.startTime} className="font-medium tabular-nums" />
                <span className="text-slate-400">·</span>
                <span className="truncate text-slate-500">{getCallStatusLabel(status)}</span>
              </p>
            </div>
          </button>
          <CallControls variant="compact" isMuted={callState.isMuted} onToggleMute={onToggleMute} onEndCall={onEndCall} canExpand onExpand={expand} />
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
                layout === 'fullscreen' ? 'bg-slate-950/40 backdrop-blur-sm' : layout === 'sheet' ? 'bg-slate-950/25 backdrop-blur-[2px]' : 'bg-slate-950/30 backdrop-blur-[3px]',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
              )}
            />
            <DialogPrimitive.Content
              className={cn(
                'fixed z-50 outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
                layout === 'card' && 'left-1/2 top-1/2 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                layout === 'sheet' && 'inset-x-0 bottom-0 max-h-[78dvh] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
                layout === 'fullscreen' && 'inset-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95'
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
              <DialogPrimitive.Title className="sr-only">Voice call with {remoteName}</DialogPrimitive.Title>
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
                layout={layout}
                onToggleMute={onToggleMute}
                onEndCall={onEndCall}
                onClose={onClose}
                onRetryMic={onRetryMic}
                onMinimize={isLive ? minimize : undefined}
                onToggleFullscreen={isMobile && isLive ? toggleFullscreen : undefined}
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
