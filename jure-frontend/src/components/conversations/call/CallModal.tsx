import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import CallTimer from './CallTimer';
import AudioWave from './AudioWave';
import CallControls from './CallControls';
import VideoStage from './VideoStage';
import VoiceStage from './VoiceStage';
import type { ConnectionQuality } from '@/utils/webrtc';
import { useAppTranslation, tFor, detectInitialLanguage } from '@/i18n';
import { useCallSessionStore } from '@/stores/callSessionStore';

export type CallModalStatus =
  | 'calling'
  | 'connecting'
  | 'active'
  | 'reconnecting'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'error';

export type CallLayoutMode = 'card' | 'sheet' | 'fullscreen';

const STATUS_CLASS: Record<string, string> = {
  calling: 'text-amber-600 dark:text-amber-400',
  connecting: 'text-sky-600 dark:text-sky-400',
  active: 'text-emerald-600 dark:text-emerald-400',
  reconnecting: 'text-amber-600 dark:text-amber-400',
  ended: 'text-slate-500',
  declined: 'text-slate-500',
  missed: 'text-slate-500',
  error: 'text-rose-600',
};

const QUALITY_CLASS: Record<ConnectionQuality, string | null> = {
  excellent: 'text-emerald-600',
  good: 'text-sky-600',
  poor: 'text-amber-600',
  unknown: null,
};

export function getCallStatusLabel(status: CallModalStatus): string {
  const call = tFor(detectInitialLanguage()).conversations.call;
  const map: Record<CallModalStatus, string> = {
    calling: call.calling,
    connecting: call.connecting,
    active: call.connected,
    reconnecting: call.reconnecting,
    ended: call.ended,
    declined: call.declined,
    missed: call.missed,
    error: call.failed,
  };
  return map[status] ?? call.call;
}

const CallModal: React.FC<{
  status: CallModalStatus;
  kind?: 'voice' | 'video';
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  isMuted: boolean;
  isCameraOff?: boolean;
  callStartTime: Date | null;
  endedDurationSec?: number | null;
  micDenied?: boolean;
  mediaErrorMessage?: string | null;
  connectionQuality?: ConnectionQuality;
  layout?: CallLayoutMode;
  selectedAudioInputId?: string | null;
  selectedVideoInputId?: string | null;
  selectedAudioOutputId?: string | null;
  onToggleMute: () => void;
  onToggleCamera?: () => void;
  onEndCall: () => void;
  onClose: () => void;
  onRetryMic?: () => void;
  onMinimize?: () => void;
  onToggleFullscreen?: () => void;
  onSelectAudioInput?: (id: string) => void;
  onSelectVideoInput?: (id: string) => void;
  onSelectAudioOutput?: (id: string) => void;
  callingProgress?: number;
}> = ({
  status,
  kind = 'voice',
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  isMuted,
  isCameraOff = false,
  callStartTime,
  endedDurationSec,
  micDenied = false,
  mediaErrorMessage = null,
  connectionQuality = 'unknown',
  layout = 'card',
  selectedAudioInputId,
  selectedVideoInputId,
  selectedAudioOutputId,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onClose,
  onRetryMic,
  onMinimize,
  onToggleFullscreen,
  onSelectAudioInput,
  onSelectVideoInput,
  onSelectAudioOutput,
  callingProgress = 0,
}) => {
  const { t, tf } = useAppTranslation();
  const call = t.conversations.call;
  const mode = useCallSessionStore((s) => s.ui.mode);
  const isConference = mode === 'conference';
  const showActive = status === 'active' || status === 'reconnecting';
  const showCalling = status === 'calling';
  const showConnecting = status === 'connecting';
  const showTerminal = status === 'ended' || status === 'declined' || status === 'missed';
  const showError = status === 'error';
  const showProgress = showCalling || showConnecting;
  const circumference = 2 * Math.PI * 46;
  const statusLabelMap: Record<string, string> = {
    calling: call.calling,
    connecting: call.connecting,
    active: call.connected,
    reconnecting: call.reconnecting,
    ended: call.ended,
    declined: call.declined,
    missed: call.missed,
    error: call.failed,
  };
  const statusLabel = statusLabelMap[status] ?? call.ended;
  const statusClass = STATUS_CLASS[status] ?? STATUS_CLASS.ended;
  const qualityLabelMap: Record<ConnectionQuality, string | null> = {
    excellent: call.qualityExcellent,
    good: call.qualityGood,
    poor: call.qualityPoor,
    unknown: null,
  };
  const qualityLabel = qualityLabelMap[connectionQuality];
  const qualityClass = QUALITY_CLASS[connectionQuality];
  const isVideo = kind === 'video';
  const videoLive = isVideo && (showActive || showConnecting);

  const terminalDetail = () => {
    if (status === 'ended' && endedDurationSec != null && endedDurationSec >= 0) {
      const m = Math.floor(endedDurationSec / 60);
      const s = endedDurationSec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return null;
  };

  const shellClass = cn(
    'relative flex flex-col text-slate-900 dark:text-slate-50',
    'bg-white/85 backdrop-blur-xl dark:bg-slate-900/90',
    'shadow-[0_8px_40px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(15,23,42,0.06)]',
    layout === 'card' && !videoLive && 'w-[min(100%,400px)] rounded-2xl p-6',
    layout === 'card' && videoLive && 'w-[min(100%,720px)] rounded-2xl p-4',
    layout === 'sheet' && 'w-full rounded-t-2xl px-5 pb-6 pt-2',
    layout === 'fullscreen' && 'h-full min-h-[100dvh] w-full justify-between rounded-none bg-slate-950 p-4 text-white'
  );

  if (micDenied || showError) {
    const title = micDenied
      ? isVideo
        ? call.cameraRequired
        : call.micDenied
      : call.failed;
    const detail =
      mediaErrorMessage ||
      (micDenied
        ? isVideo
          ? call.cameraDeniedHint
          : call.micDeniedHint
        : call.failedHint);
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={onClose}
          className="absolute end-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="max-w-sm text-sm text-slate-500">{detail}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onRetryMic}
              className="h-10 rounded-full bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              {call.tryAgain}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-full bg-rose-600 px-5 text-sm font-medium text-white hover:bg-rose-700"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {layout === 'sheet' ? (
        <div className="mb-3 flex justify-center" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>
      ) : null}

      {layout === 'fullscreen' && isVideo ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{remoteName}</h2>
            <p className={cn('text-xs font-medium', statusClass)} aria-live="polite">
              {statusLabel}
              {showActive ? (
                <>
                  {' '}
                  <CallTimer active={status === 'active'} startTime={callStartTime} className="tabular-nums" />
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {showTerminal ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute end-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {videoLive ? (
        <VideoStage
          remoteName={remoteName}
          remoteAvatar={remoteAvatar}
          remoteFirstName={remoteFirstName}
          remoteLastName={remoteLastName}
          className={cn(
            layout === 'fullscreen' ? 'min-h-0 flex-1' : 'aspect-video min-h-[240px]',
            layout === 'sheet' && 'min-h-[42dvh]'
          )}
        />
      ) : null}

      <div
        className={cn(
          'flex flex-col items-center',
          layout === 'fullscreen' ? 'gap-4 pt-4' : 'gap-4',
          videoLive && 'mt-3'
        )}
      >
        {!videoLive && isConference && (showActive || showConnecting) ? (
          <VoiceStage className="w-full px-1" />
        ) : null}

        {!videoLive && !(isConference && (showActive || showConnecting)) ? (
          <div className="relative">
            {showProgress ? (
              <svg
                className="absolute -inset-3 h-[104px] w-[104px] -rotate-90"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - callingProgress)}
                  strokeLinecap="round"
                  className={showCalling ? 'text-amber-500 transition-[stroke-dashoffset] duration-200' : 'text-sky-500'}
                />
              </svg>
            ) : null}
            <div
              className={cn(
                'relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full',
                showActive && 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                showActive && 'shadow-[0_0_24px_-4px_rgba(16,185,129,0.45)]',
                showTerminal && 'opacity-50 grayscale'
              )}
            >
              <UserAvatar
                image={remoteAvatar ?? undefined}
                firstName={remoteFirstName}
                lastName={remoteLastName}
                size="lg"
                className="h-20 w-20 text-base"
              />
            </div>
            {status === 'active' ? (
              <span
                className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}

        {layout !== 'fullscreen' || !isVideo ? (
          <div className="w-full min-w-0 text-center">
            <h2 className="truncate text-xl font-semibold tracking-tight">{remoteName}</h2>
            <p className={cn('mt-1.5 text-sm font-medium', statusClass)} aria-live="polite">
              {showTerminal && status === 'ended' && terminalDetail()
                ? tf(call.endedWithDuration, { duration: terminalDetail()! })
                : statusLabel}
            </p>
            {showActive && qualityLabel && qualityClass ? (
              <p className={cn('mt-1 text-xs', qualityClass)}>● {qualityLabel}</p>
            ) : null}
            {showActive && !videoLive ? (
              <div className="mt-2 font-mono text-2xl font-medium tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
                <CallTimer active={status === 'active'} startTime={callStartTime} />
              </div>
            ) : null}
            {showActive && videoLive ? (
              <div className="mt-1 font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">
                <CallTimer active={status === 'active'} startTime={callStartTime} />
              </div>
            ) : null}
          </div>
        ) : (
          showActive && qualityLabel && qualityClass ? (
            <p className={cn('text-xs', qualityClass)}>● {qualityLabel}</p>
          ) : null
        )}

        {showActive && !videoLive && !isConference ? (
          <AudioWave active={status === 'active'} muted={isMuted} />
        ) : null}

        <div className="mt-2 w-full">
          {(showCalling || showConnecting) && !videoLive && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onEndCall}
                className="inline-flex h-11 min-w-[148px] items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-medium text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                {showCalling ? call.endCall : t.common.cancel}
              </button>
            </div>
          )}
          {(showActive || (videoLive && showConnecting)) && (
            <CallControls
              kind={kind}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              onToggleMute={onToggleMute}
              onToggleCamera={onToggleCamera}
              onEndCall={onEndCall}
              canMinimize={Boolean(onMinimize)}
              canExpand={Boolean(onToggleFullscreen)}
              isFullscreen={layout === 'fullscreen'}
              onMinimize={onMinimize}
              onExpand={onToggleFullscreen}
              selectedAudioInputId={selectedAudioInputId}
              selectedVideoInputId={selectedVideoInputId}
              selectedAudioOutputId={selectedAudioOutputId}
              onSelectAudioInput={onSelectAudioInput}
              onSelectVideoInput={onSelectVideoInput}
              onSelectAudioOutput={onSelectAudioOutput}
            />
          )}
          {showTerminal ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
