import React from 'react';
import { PhoneOff, Mic, MicOff, X, AlertTriangle } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import CallTimer from './CallTimer';
import AudioWave from './AudioWave';

export type CallModalStatus =
  | 'calling'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'error';

const CallModal: React.FC<{
  status: CallModalStatus;
  remoteName: string;
  remoteAvatar?: string | null;
  remoteFirstName?: string;
  remoteLastName?: string;
  isMuted: boolean;
  callStartTime: Date | null;
  /** Duration in seconds when call ended (caller/callee hang up) */
  endedDurationSec?: number | null;
  micDenied?: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onClose: () => void;
  onRetryMic?: () => void;
  /** Calling state: 0–1 progress for 30s outbound ring */
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
  onToggleMute,
  onEndCall,
  onClose,
  onRetryMic,
  callingProgress = 0,
}) => {
  const showActive = status === 'active';
  const showCalling = status === 'calling';
  const showConnecting = status === 'connecting';
  const showTerminal = status === 'ended' || status === 'declined' || status === 'missed';
  const showError = status === 'error';

  const circumference = 2 * Math.PI * 34;

  const terminalMessage = () => {
    if (status === 'declined') return 'Call declined';
    if (status === 'missed') return 'No answer';
    if (status === 'ended') {
      if (endedDurationSec != null && endedDurationSec >= 0) {
        const m = Math.floor(endedDurationSec / 60);
        const s = endedDurationSec % 60;
        const dur = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `Call ended · ${dur}`;
      }
      return 'Call ended';
    }
    return 'Call ended';
  };

  if (micDenied || showError) {
    const isMic = micDenied;
    return (
      <div className="relative w-[420px] max-w-[calc(100vw-2rem)] rounded-[20px] bg-[#0f172a] p-6 text-slate-100 shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">
            {isMic ? 'Microphone access denied' : 'Call failed'}
          </h2>
          <p className="text-sm text-slate-400">
            {isMic
              ? 'Please allow microphone access in your browser settings and try again.'
              : 'Call failed — check your microphone or network connection.'}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onRetryMic}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
            >
              Cancel
            </button>
          </div>
        </div>
        <audio id="remote-audio" autoPlay playsInline className="hidden" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-[420px] max-w-[calc(100vw-2rem)] rounded-[20px] bg-[#0f172a] p-6 text-slate-100',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'transition-opacity duration-200'
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-4 pt-2">
        {/* Avatar */}
        <div className="relative">
          {(showCalling || showConnecting) && (
            <svg className="absolute -inset-2 h-[88px] w-[88px] -rotate-90" viewBox="0 0 72 72">
              <circle
                cx="36"
                cy="36"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-700"
              />
              <circle
                cx="36"
                cy="36"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - callingProgress)}
                strokeLinecap="round"
                className={cn('text-emerald-500', showCalling && 'transition-[stroke-dashoffset] duration-200')}
              />
            </svg>
          )}
          <div
            className={cn(
              'relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full',
              showCalling && 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[#0f172a] animate-[modal-avatar-pulse_2s_ease-in-out_infinite]',
              showTerminal && 'opacity-50 grayscale'
            )}
          >
            <UserAvatar
              image={remoteAvatar ?? undefined}
              firstName={remoteFirstName}
              lastName={remoteLastName}
              size="lg"
              className="h-16 w-16"
            />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{remoteName}</h2>
          {showCalling && (
            <p className="mt-1 text-sm text-slate-400">Calling…</p>
          )}
          {showConnecting && (
            <p className="mt-1 text-sm text-slate-400">Connecting…</p>
          )}
          {showActive && (
            <>
              <div className="mt-2 font-mono text-lg text-emerald-400">
                <CallTimer active={showActive} startTime={callStartTime} />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-400/90">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Call connected
              </div>
            </>
          )}
          {showTerminal && (
            <p className="mt-2 text-sm text-slate-400">{terminalMessage()}</p>
          )}
        </div>

        {showActive && (
          <AudioWave active={showActive} muted={isMuted} className="mt-1" />
        )}

        <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-3">
          {showCalling && (
            <button
              type="button"
              onClick={onEndCall}
              className="rounded-full bg-rose-600 px-8 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-700"
            >
              End Call
            </button>
          )}

          {showConnecting && (
            <button
              type="button"
              onClick={onEndCall}
              className="rounded-full bg-rose-600 px-8 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-700"
            >
              Cancel
            </button>
          )}

          {showActive && (
            <>
              <button
                type="button"
                onClick={onToggleMute}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition',
                  isMuted
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15'
                )}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                onClick={onEndCall}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-700"
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </button>
            </>
          )}

          {showTerminal && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 bg-transparent px-8 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <audio id="remote-audio" autoPlay playsInline className="hidden" />
      <style>{`
        @keyframes modal-avatar-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0.1); }
        }
      `}</style>
    </div>
  );
};

export default CallModal;
