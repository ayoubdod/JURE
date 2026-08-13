import React from 'react';
import { Phone, PhoneIncoming, PhoneMissed, Users, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationActiveCall, ConversationMissedCall } from '@/stores/conversationCallPresenceStore';

function formatCallTime(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(at));
  } catch {
    return '';
  }
}

export const ActiveCallBanner: React.FC<{
  call: ConversationActiveCall;
  amInCall: boolean;
  onJoin: () => void;
  joinLabel: string;
  inCallLabel: string;
  title: string;
  groupSubtitle: string;
  ongoingSubtitle: string;
  inCallCountLabel: string;
}> = ({
  call,
  amInCall,
  onJoin,
  joinLabel,
  inCallLabel,
  title,
  groupSubtitle,
  ongoingSubtitle,
  inCallCountLabel,
}) => {
  const Icon = call.kind === 'video' ? Video : call.mode === 'conference' ? Users : Phone;
  const subtitle =
    call.joinedIds.length > 0
      ? inCallCountLabel.replace('{count}', String(call.joinedIds.length))
      : call.mode === 'conference'
        ? groupSubtitle
        : ongoingSubtitle;

  return (
    <div
      className={cn(
        'mx-2 mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:mx-3',
        'border-emerald-200/80 bg-emerald-50 text-emerald-950',
        'dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-50'
      )}
      role="status"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-50 dark:ring-emerald-950 animate-pulse" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-200/70">{subtitle}</p>
      </div>
      {amInCall ? (
        <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">{inCallLabel}</span>
      ) : (
        <button
          type="button"
          onClick={onJoin}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <PhoneIncoming className="h-3.5 w-3.5" />
          {joinLabel}
        </button>
      )}
    </div>
  );
};

/** In-thread missed-call card — reads like a chat system message with Call back. */
export const MissedCallMessage: React.FC<{
  missed: ConversationMissedCall;
  title: string;
  subtitle: string;
  recallLabel: string;
  onRecall: () => void;
  onDismiss: () => void;
}> = ({ missed, title, subtitle, recallLabel, onRecall, onDismiss }) => {
  const Icon = missed.kind === 'video' ? Video : PhoneMissed;
  const time = formatCallTime(missed.at);

  return (
    <div className="flex w-full justify-center py-1" role="status">
      <div
        className={cn(
          'group relative flex max-w-[min(100%,22rem)] items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-sm',
          'border-rose-200/70 bg-white dark:bg-slate-950 text-rose-950',
          'dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-50'
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          <p className="truncate text-[11px] text-rose-800/75 dark:text-rose-200/65">
            {missed.callerName ? `${missed.callerName} · ${subtitle}` : subtitle}
            {time ? ` · ${time}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onRecall}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <Phone className="h-3.5 w-3.5" />
          {recallLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200/80 bg-white text-rose-500 opacity-0 shadow-sm transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
