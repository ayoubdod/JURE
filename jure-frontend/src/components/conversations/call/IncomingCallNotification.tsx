import React, { useEffect, useState } from 'react';
import { Phone, X, Check } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const AUTO_DISMISS_MS = 30_000;

const IncomingCallNotification: React.FC<{
  visible: boolean;
  callerName: string;
  callerAvatar?: string | null;
  firstName?: string;
  lastName?: string;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ visible, callerName, callerAvatar, firstName, lastName, onAccept, onDecline }) => {
  const isMobile = useIsMobile();
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      setProgress(0);
      return;
    }
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

  return (
    <div
      className={cn(
        'fixed z-[100] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95',
        'transition-all duration-200 ease-out',
        isMobile ? 'inset-x-3 bottom-3 max-w-none' : 'bottom-6 left-6 w-[320px]',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      )}
      role="dialog"
      aria-label="Incoming call"
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Phone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Incoming Call</span>
        </div>
        <div className="flex gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="absolute inset-0 h-12 w-12 -rotate-90" viewBox="0 0 56 56" aria-hidden>
              <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-700" />
              <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="text-emerald-500 transition-[stroke-dashoffset] duration-200" />
            </svg>
            <div className="absolute inset-[3px] overflow-hidden rounded-full">
              <UserAvatar image={callerAvatar ?? undefined} firstName={firstName} lastName={lastName} size="md" className="h-full w-full" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-50">{callerName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">is calling you…</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onDecline} aria-label="Decline call" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
            <X className="h-4 w-4" /> Decline
          </button>
          <button type="button" onClick={onAccept} aria-label="Accept call" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
            <Check className="h-4 w-4" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
