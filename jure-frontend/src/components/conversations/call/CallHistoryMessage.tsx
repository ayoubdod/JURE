import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Phone, PhoneMissed, PhoneOff, Video, VideoOff } from 'lucide-react';
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

export function formatCallDuration(sec: number | null): string | null {
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
  const { kind, outcome, durationSeconds } = callMetaFromMessage(msg);
  const missed = outcome === 'missed' || outcome === 'declined';
  const declined = outcome === 'declined';
  const duration = formatCallDuration(durationSeconds);
  const time = formatTime(msg.sent_at ?? msg.created, intlLocale(lang));

  const Icon = missed
    ? kind === 'video'
      ? VideoOff
      : declined
        ? PhoneOff
        : PhoneMissed
    : kind === 'video'
      ? Video
      : Phone;

  const Direction = isOwn ? ArrowUpRight : ArrowDownLeft;

  return (
    <div
      className={cn(
        'flex max-w-[min(100%,22rem)] items-center gap-3 rounded-2xl border px-3.5 py-3',
        missed
          ? isOwn
            ? 'border-rose-300/50 bg-rose-50/90 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-50'
            : 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white text-rose-950 dark:border-rose-900/50 dark:from-rose-950/40 dark:to-slate-900 dark:text-rose-50'
          : isOwn
            ? 'border-[#64499D]/35 bg-[#64499D] text-white shadow-sm shadow-[#64499D]/20'
            : 'border-slate-200/90 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50'
      )}
      role="status"
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full ring-1',
            missed
              ? isOwn
                ? 'bg-rose-500/15 text-rose-700 ring-rose-400/30 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/25'
                : 'bg-rose-100 text-rose-600 ring-rose-200/80 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800'
              : isOwn
                ? 'bg-white/20 text-white ring-white/25'
                : kind === 'video'
                  ? 'bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900'
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span
          className={cn(
            'absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2',
            missed
              ? 'bg-rose-600 text-white ring-rose-50 dark:ring-rose-950'
              : isOwn
                ? 'bg-white text-[#64499D] ring-[#64499D]'
                : 'bg-slate-800 text-white ring-white dark:bg-slate-200 dark:text-slate-900 dark:ring-slate-900'
          )}
          aria-hidden
        >
          <Direction className="h-2.5 w-2.5" strokeWidth={2.5} />
        </span>
      </span>

      <div dir="auto" className="min-w-0 flex-1 text-start">
        <p className="truncate text-[13.5px] font-semibold tracking-tight">{title}</p>
        <div
          className={cn(
            'mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]',
            missed
              ? isOwn
                ? 'text-rose-800/80 dark:text-rose-200/75'
                : 'text-rose-700/80 dark:text-rose-200/70'
              : isOwn
                ? 'text-white/80'
                : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {duration ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                isOwn && !missed
                  ? 'bg-white/15 text-white'
                  : missed
                    ? 'bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {duration}
            </span>
          ) : null}
          {subtitle ? <span className="truncate">{subtitle}</span> : null}
          {showInlineTime && time ? (
            <>
              {(subtitle || duration) && <span aria-hidden>·</span>}
              <span className="tabular-nums">{time}</span>
            </>
          ) : null}
        </div>
      </div>

      {missed && onRecall && recallLabel ? (
        <button
          type="button"
          onClick={onRecall}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2',
            isOwn
              ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400'
              : 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400'
          )}
        >
          {kind === 'video' ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
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
  const { kind, outcome } = callMetaFromMessage(msg);
  const missed = outcome === 'missed' || outcome === 'declined';
  if (missed) return kind === 'video' ? labels.missedVideo : labels.missedVoice;
  return kind === 'video' ? labels.video : labels.voice;
}
