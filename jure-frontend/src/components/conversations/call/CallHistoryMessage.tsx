import React from 'react';
import { Phone, PhoneMissed, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { intlLocale, useAppTranslation } from '@/i18n';

export type CallHistoryKind = 'voice' | 'video';
export type CallHistoryOutcome = 'missed' | 'completed' | 'declined';

export function isCallMessageType(mt: string | undefined | null): boolean {
  return (
    mt === 'CALL_VOICE' ||
    mt === 'CALL_VIDEO' ||
    mt === 'CALL_MISSED_VOICE' ||
    mt === 'CALL_MISSED_VIDEO'
  );
}

export function callMetaFromMessage(msg: API.Message): {
  kind: CallHistoryKind;
  outcome: CallHistoryOutcome;
  durationSeconds: number | null;
} {
  const mt = msg.messageType ?? msg.message_type;
  const item = (msg.sharedItem ?? msg.shared_item) as
    | (API.SharedItem & {
        kind?: string;
        outcome?: string;
        durationSeconds?: number | null;
      })
    | null
    | undefined;

  const kindFromType: CallHistoryKind =
    mt === 'CALL_VIDEO' || mt === 'CALL_MISSED_VIDEO' ? 'video' : 'voice';
  const kind: CallHistoryKind =
    String(item?.kind ?? '').toLowerCase() === 'video' ? 'video' : kindFromType;

  let outcome: CallHistoryOutcome = 'completed';
  if (mt === 'CALL_MISSED_VOICE' || mt === 'CALL_MISSED_VIDEO') outcome = 'missed';
  else if (String(item?.outcome ?? '').toLowerCase() === 'missed') outcome = 'missed';
  else if (String(item?.outcome ?? '').toLowerCase() === 'declined') outcome = 'declined';

  const durationSeconds =
    typeof item?.durationSeconds === 'number'
      ? item.durationSeconds
      : typeof (item as { duration?: number } | null | undefined)?.duration === 'number'
        ? (item as { duration: number }).duration
        : null;

  return { kind, outcome, durationSeconds };
}

function formatDuration(sec: number | null): string | null {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso)
    );
  } catch {
    return '';
  }
}

export const CallHistoryMessage: React.FC<{
  msg: API.Message;
  title: string;
  subtitle?: string;
  recallLabel?: string;
  onRecall?: () => void;
  /** True when the current user initiated the call (same as sent messages). */
  isOwn?: boolean;
  /** Show timestamp below the card (MessageItem layout). */
  showInlineTime?: boolean;
}> = ({ msg, title, subtitle, recallLabel, onRecall, isOwn = false, showInlineTime = true }) => {
  const { lang } = useAppTranslation();
  const { kind, outcome } = callMetaFromMessage(msg);
  const missed = outcome === 'missed' || outcome === 'declined';
  const Icon = missed ? (kind === 'video' ? Video : PhoneMissed) : kind === 'video' ? Video : Phone;
  const time = formatTime(msg.sent_at ?? msg.created, intlLocale(lang));

  return (
    <div
      className={cn(
        'flex max-w-[min(100%,20rem)] items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-sm',
        isOwn
          ? missed
            ? 'border-rose-300/60 bg-primary/90 text-primary-foreground dark:border-rose-800/50'
            : 'border-primary/40 bg-primary text-primary-foreground'
          : missed
            ? 'border-rose-200/70 bg-white text-rose-950 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-50'
            : 'border-slate-200/80 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'
      )}
      role="status"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isOwn
            ? missed
              ? 'bg-white/20 text-white'
              : 'bg-white/25 text-white'
            : missed
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        {(subtitle || (showInlineTime && time)) && (
          <p
            className={cn(
              'truncate text-[11px]',
              isOwn
                ? 'text-primary-foreground/80'
                : missed
                  ? 'text-rose-800/75 dark:text-rose-200/65'
                  : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {[subtitle, showInlineTime ? time : null].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {missed && !isOwn && onRecall && recallLabel ? (
        <button
          type="button"
          onClick={onRecall}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <Phone className="h-3.5 w-3.5" />
          {recallLabel}
        </button>
      ) : null}
    </div>
  );
};

export function callHistoryTitle(
  msg: API.Message,
  labels: {
    missedVoice: string;
    missedVideo: string;
    voice: string;
    video: string;
  }
): string {
  const { kind, outcome, durationSeconds } = callMetaFromMessage(msg);
  const missed = outcome === 'missed' || outcome === 'declined';
  if (missed) return kind === 'video' ? labels.missedVideo : labels.missedVoice;
  const dur = formatDuration(durationSeconds);
  const base = kind === 'video' ? labels.video : labels.voice;
  return dur ? `${base} · ${dur}` : base;
}
