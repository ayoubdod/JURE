import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import CallTimer from './CallTimer';
import AudioWave from './AudioWave';
import CallControls from './CallControls';

export type CallModalStatus =
  | 'calling'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'error';

export type CallLayoutMode = 'card' | 'sheet' | 'fullscreen';

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  calling: { label: 'Calling…', className: 'text-amber-600 dark:text-amber-400' },
  connecting: { label: 'Connecting…', className: 'text-sky-600 dark:text-sky-400' },
  active: { label: 'Connected', className: 'text-emerald-600 dark:text-emerald-400' },
  ended: { label: 'Call Ended', className: 'text-slate-500' },
  declined: { label: 'Call declined', className: 'text-slate-500' },
  missed: { label: 'No answer', className: 'text-slate-500' },
  error: { label: 'Call failed', className: 'text-rose-600' },
};

export function getCallStatusLabel(status: CallModalStatus): string {
  return STATUS_COPY[status]?.label ?? 'Call';
}

const CallModal: React.FC<{
  status: CallModalStatus;
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  isMuted: boolean;
  callStartTime: Date | null;
  endedDurationSec?: number | null;
  micDenied?: boolean;
  layout?: CallLayoutMode;
  onToggleMute: () => void;
  onEndCall: () => void;
  onClose: () => void;
  onRetryMic?: () => void;
  onMinimize?: () => void;
  onToggleFullscreen?: () => void;
  callingProgress?: number;
}> = ({
  status,
  remoteName,
  remoteAvatar,
  remoteFirstName,
  remoteLastName,
  isMuted,
  callStartTime,
  endedDurationSec,
  micDenied = false,
  layout = 'card',
  onToggleMute,
  onEndCall,
  onClose,
  onRetryMic,
  onMinimize,
  onToggleFullscreen,
  callingProgress = 0,
}) => {
  const showActive = status === 'active';
  const showCalling = status === 'calling';
  const showConnecting = status === 'connecting';
  const showTerminal = status === 'ended' || status === 'declined' || status === 'missed';
  const showError = status === 'error';
  const showProgress = showCalling || showConnecting;
  const circumference = 2 * Math.PI * 46;
  const statusMeta = STATUS_COPY[status] ?? STATUS_COPY.ended;

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
    layout === 'card' && 'w-[min(100%,400px)] rounded-2xl p-6',
    layout === 'sheet' && 'w-full rounded-t-2xl px-5 pb-6 pt-2',
    layout === 'fullscreen' && 'h-full min-h-[100dvh] w-full justify-center rounded-none p-6'
  );

  if (micDenied || showError) {
    const isMic = micDenied;
    return (
      <div className={shellClass}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">{isMic ? 'Microphone access denied' : 'Call failed'}</h2>
          <p className="max-w-sm text-sm text-slate-500">{isMic ? 'Allow microphone access in your browser settings, then try again.' : 'Check your microphone or network connection, then retry.'}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onRetryMic} className="h-10 rounded-full bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">Retry</button>
            <button type="button" onClick={onClose} className="h-10 rounded-full bg-rose-600 px-5 text-sm font-medium text-white hover:bg-rose-700">Cancel</button>
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

      {showTerminal ? (
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      ) : null}

      <div className={cn('flex flex-col items-center', layout === 'fullscreen' ? 'gap-6' : 'gap-4')}>
        <div className="relative">
          {showProgress ? (
            <svg className="absolute -inset-3 h-[104px] w-[104px] -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-200 dark:text-slate-700" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - callingProgress)} strokeLinecap="round" className={showCalling ? 'text-amber-500 transition-[stroke-dashoffset] duration-200' : 'text-sky-500'} />
            </svg>
          ) : null}
          <div className={cn('relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full', showActive && 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-white dark:ring-offset-slate-900', showActive && 'shadow-[0_0_24px_-4px_rgba(16,185,129,0.45)]', showTerminal && 'opacity-50 grayscale')}>
            <UserAvatar image={remoteAvatar ?? undefined} firstName={remoteFirstName} lastName={remoteLastName} size="lg" className="h-20 w-20 text-base" />
          </div>
          {showActive ? <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" aria-hidden /> : null}
        </div>

        <div className="w-full min-w-0 text-center">
          <h2 className="truncate text-xl font-semibold tracking-tight">{remoteName}</h2>
          <p className={cn('mt-1.5 text-sm font-medium', statusMeta.className)} aria-live="polite">
            {showTerminal && status === 'ended' && terminalDetail() ? `Call Ended · ${terminalDetail()}` : statusMeta.label}
          </p>
          {showActive ? (
            <div className="mt-2 font-mono text-2xl font-medium tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
              <CallTimer active={showActive} startTime={callStartTime} />
            </div>
          ) : null}
        </div>

        {showActive ? <AudioWave active={showActive} muted={isMuted} /> : null}

        <div className="mt-2 w-full">
          {(showCalling || showConnecting) && (
            <div className="flex justify-center">
              <button type="button" onClick={onEndCall} className="inline-flex h-11 min-w-[148px] items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-medium text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
                {showCalling ? 'End Call' : 'Cancel'}
              </button>
            </div>
          )}
          {showActive ? (
            <CallControls
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onEndCall={onEndCall}
              canMinimize={Boolean(onMinimize)}
              canExpand={Boolean(onToggleFullscreen)}
              isFullscreen={layout === 'fullscreen'}
              onMinimize={onMinimize}
              onExpand={onToggleFullscreen}
            />
          ) : null}
          {showTerminal ? (
            <div className="flex justify-center">
              <button type="button" onClick={onClose} className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
