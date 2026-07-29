import React, { useEffect, useState } from 'react';
import { Phone, X, Check } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';

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
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / AUTO_DISMISS_MS);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(t);
      cancelAnimationFrame(raf);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      onDecline();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [visible, onDecline]);

  if (!visible) return null;

  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={cn(
        'fixed z-[100] w-[300px] overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.06)] dark:bg-slate-900 dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]',
        'transition-transform duration-300 ease-out',
        entered ? 'translate-y-0' : 'translate-y-[100px]'
      )}
      style={{ bottom: 24, left: 24 }}
      role="dialog"
      aria-label="Incoming call"
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Phone className="h-4 w-4 shrink-0 animate-[phone-pulse_1.2s_ease-in-out_infinite] text-emerald-600" />
          <span className="text-sm font-semibold">Incoming Call</span>
        </div>

        <div className="flex gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="absolute inset-0 h-12 w-12 -rotate-90" viewBox="0 0 56 56">
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
            <div className="absolute inset-[3px] rounded-full ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-white animate-[avatar-ring_2s_ease-in-out_infinite] dark:ring-offset-slate-900">
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
            <p className="text-xs italic text-slate-500 dark:text-slate-400">is calling you...</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
          >
            <X className="h-4 w-4" />
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Accept
          </button>
        </div>
      </div>
      <style>{`
        @keyframes phone-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes avatar-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.45); }
          50% { box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.15); }
        }
      `}</style>
    </div>
  );
};

export default IncomingCallNotification;
