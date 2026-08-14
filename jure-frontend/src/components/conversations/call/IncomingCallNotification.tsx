import React, { useEffect, useState } from 'react';
import { Phone, Video, PhoneOff, PhoneIncoming } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { requestCallNotificationPermission } from '@/utils/incomingCallNotify';

const AUTO_DISMISS_MS = 45_000;

const IncomingCallNotification: React.FC<{
  visible: boolean;
  kind?: 'voice' | 'video';
  callerName: string;
  callerAvatar?: string | null;
  firstName?: string;
  lastName?: string;
  onAccept: () => void;
  onDecline: () => void;
}> = ({
  visible,
  kind = 'voice',
  callerName,
  callerAvatar,
  firstName,
  lastName,
  onAccept,
  onDecline,
}) => {
  const isMobile = useIsMobile();
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(0);
  const isVideo = kind === 'video';

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      setProgress(0);
      return;
    }
    // Ask for OS notification permission on first ring (user-visible gesture path is ideal; best-effort here).
    void requestCallNotificationPermission();
    const t = requestAnimationFrame(() => setEntered(true));
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / AUTO_DISMISS_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(t);
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => onDecline(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [visible, onDecline]);

  if (!visible) return null;

  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - progress);

  // Mobile: WhatsApp / Messenger-style full-screen ringing UI
  if (isMobile) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[120] flex flex-col bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white',
          'pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          'transition-opacity duration-200',
          entered ? 'opacity-100' : 'opacity-0'
        )}
        role="dialog"
        aria-label={isVideo ? 'Incoming video call' : 'Incoming call'}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-400/90">
            {isVideo ? 'Video call' : 'Voice call'}
          </p>
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" aria-hidden />
            <span className="absolute -inset-3 rounded-full ring-2 ring-emerald-400/40" aria-hidden />
            <UserAvatar
              image={callerAvatar ?? undefined}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="relative h-28 w-28 text-3xl ring-4 ring-white/10"
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{callerName}</h2>
            <p className="mt-2 text-sm text-white/65">
              {isVideo ? 'is video calling you…' : 'is calling you…'}
            </p>
          </div>
          <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-emerald-400/80 transition-[width] duration-200"
              style={{ width: `${Math.max(4, (1 - progress) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-16 px-8 pb-4">
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            className="flex flex-col items-center gap-2"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-900/40">
              <PhoneOff className="h-7 w-7" />
            </span>
            <span className="text-xs font-medium text-white/80">Decline</span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            className="flex flex-col items-center gap-2"
          >
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 animate-pulse">
              <PhoneIncoming className="h-7 w-7" />
            </span>
            <span className="text-xs font-medium text-white/80">Accept</span>
          </button>
        </div>
      </div>
    );
  }

  // Desktop: compact toast card
  const Icon = isVideo ? Video : Phone;
  return (
    <div
      className={cn(
        'fixed z-[100] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95',
        'transition-all duration-200 ease-out',
        'bottom-6 left-6 w-[320px]',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
      role="dialog"
      aria-label={isVideo ? 'Incoming video call' : 'Incoming call'}
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Icon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">
            {isVideo ? 'Incoming Video Call' : 'Incoming Call'}
          </span>
        </div>
        <div className="flex gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="absolute inset-0 h-12 w-12 -rotate-90" viewBox="0 0 56 56" aria-hidden>
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-slate-200 dark:text-slate-700"
              />
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="text-emerald-500 transition-[stroke-dashoffset] duration-200"
              />
            </svg>
            <div className="absolute inset-[3px] overflow-hidden rounded-full">
              <UserAvatar
                image={callerAvatar ?? undefined}
                firstName={firstName}
                lastName={lastName}
                size="md"
                className="h-full w-full"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">
              {callerName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isVideo ? 'is video calling you…' : 'is calling you…'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
