import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import getBlobDuration from 'get-blob-duration';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { devError } from '@/utils/devLog';

interface AudioControlProps {
  audioSrc: string;
  isOwn?: boolean;
  durationMs?: number | null;
  className?: string;
}

const BAR_COUNT = 48;

function barsFromKey(key: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const n = ((h >>> 0) % 1000) / 1000;
    const envelope = 0.28 + 0.72 * Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
    const detail = 0.55 + 0.45 * Math.sin(i * 0.7 + (h % 7));
    out.push(0.16 + n * 0.84 * envelope * detail);
  }
  return out;
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function fromKnownDuration(durationMs?: number | null): boolean {
  return !!(durationMs && durationMs > 0);
}

const AudioControl: React.FC<AudioControlProps> = ({
  audioSrc,
  isOwn = false,
  durationMs,
  className = '',
}) => {
  const { t } = useAppTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs && durationMs > 0 ? durationMs / 1000 : 0);
  const [isLoading, setIsLoading] = useState(!(durationMs && durationMs > 0));
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pulse, setPulse] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const bars = useMemo(() => barsFromKey(audioSrc), [audioSrc]);

  useEffect(() => {
    const fromMeta = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
    setDuration(fromMeta);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(!fromMeta);
    setPlaybackRate(1);
  }, [audioSrc, durationMs]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = (ts: number) => {
      setPulse((ts / 180) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    const applyDuration = (value: number) => {
      if (Number.isFinite(value) && value > 0) {
        setDuration(value);
        setIsLoading(false);
      }
    };

    const handleLoaded = () => applyDuration(audio.duration);
    const handleTimeUpdate = () => {
      if (!draggingRef.current) setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('durationchange', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    if (audio.readyState >= 1) handleLoaded();

    let cancelled = false;
    if (!fromKnownDuration(durationMs) && (!Number.isFinite(audio.duration) || audio.duration === Infinity)) {
      void (async () => {
        try {
          const response = await fetch(audioSrc);
          if (!response.ok) return;
          const blob = await response.blob();
          const blobDuration = await getBlobDuration(blob);
          if (!cancelled && Number.isFinite(blobDuration) && blobDuration > 0) {
            applyDuration(blobDuration);
          }
        } catch (error) {
          devError('Error loading audio duration:', error);
          if (!cancelled) setIsLoading(false);
        }
      })();
    }

    return () => {
      cancelled = true;
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('durationchange', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioSrc, durationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.play().then(() => setIsPlaying(true)).catch((e) => devError('Audio play failed:', e));
  };

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = waveRef.current;
      const audio = audioRef.current;
      if (!el || !audio || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = ratio * duration;
      audio.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  const onWavePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0 || isLoading) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  };

  const onWavePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromClientX(e.clientX);
  };

  const onWavePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const cycleRate = () => {
    setPlaybackRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1));
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const displayTime =
    isPlaying || currentTime > 0.05 ? formatTime(currentTime) : formatTime(duration);
  const activeBar = Math.min(bars.length - 1, Math.floor(progress * bars.length));

  return (
    <div
      className={cn(
        'relative flex w-[min(100%,19rem)] flex-col gap-1.5 overflow-hidden rounded-2xl px-2.5 py-2',
        isOwn
          ? 'bg-gradient-to-br from-[#6f54a8] to-[#553d86] text-white shadow-[0_8px_22px_rgba(100,73,157,0.32)]'
          : 'border border-slate-200/90 bg-gradient-to-br from-white to-slate-50 text-slate-800 shadow-[0_8px_22px_rgba(15,23,42,0.07)] dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100',
        className
      )}
      role="group"
      aria-label={t.conversations.voiceNoteAria}
    >
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Play + waveform on one aligned row */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? t.conversations.pauseAria : t.conversations.playAria}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full p-0 transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            isOwn
              ? 'bg-white text-[#64499D] shadow-md hover:bg-white/95 focus-visible:ring-white/70 focus-visible:ring-offset-[#553d86]'
              : 'bg-[#64499D] text-white shadow-md hover:bg-[#553d86] focus-visible:ring-[#64499D]/40 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-800',
            isLoading && 'cursor-not-allowed opacity-60',
            !isLoading && 'active:scale-[0.96]',
            isPlaying && (isOwn ? 'ring-2 ring-white/35' : 'ring-2 ring-[#64499D]/25')
          )}
        >
          {isLoading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" />
          )}
        </button>

        <div
          ref={waveRef}
          role="slider"
          tabIndex={0}
          aria-label={t.conversations.seekAria}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          className={cn(
            'relative flex h-9 min-w-0 flex-1 touch-none items-center gap-[2px] self-center rounded-xl px-0.5',
            'focus-visible:outline-none focus-visible:ring-2',
            isOwn ? 'focus-visible:ring-white/50' : 'focus-visible:ring-[#64499D]/35',
            duration > 0 && !isLoading ? 'cursor-pointer' : 'cursor-default'
          )}
          onPointerDown={onWavePointerDown}
          onPointerMove={onWavePointerMove}
          onPointerUp={onWavePointerUp}
          onPointerCancel={onWavePointerUp}
          onKeyDown={(e) => {
            if (duration <= 0) return;
            const step = e.shiftKey ? 5 : 1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const audio = audioRef.current;
              if (!audio) return;
              const delta = e.key === 'ArrowRight' ? step : -step;
              const next = Math.min(duration, Math.max(0, audio.currentTime + delta));
              audio.currentTime = next;
              setCurrentTime(next);
            }
          }}
        >
          {bars.map((peak, i) => {
            const filled = i / bars.length <= progress;
            const dist = Math.abs(i - activeBar);
            const liveBoost =
              isPlaying && dist <= 3 ? 1 + 0.22 * Math.sin(pulse + dist * 0.9) * (1 - dist / 3) : 1;
            return (
              <span
                key={i}
                className={cn(
                  'w-[2.5px] shrink-0 rounded-full transition-[background-color] duration-75 sm:w-[3px]',
                  filled
                    ? isOwn
                      ? 'bg-white'
                      : 'bg-[#64499D]'
                    : isOwn
                      ? 'bg-white/25'
                      : 'bg-slate-300/90 dark:bg-slate-600'
                )}
                style={{
                  height: `${Math.round(5 + peak * 20 * liveBoost)}px`,
                }}
              />
            );
          })}
          <span
            className={cn(
              'pointer-events-none absolute inset-y-1.5 w-0.5 rounded-full',
              isOwn ? 'bg-white' : 'bg-[#64499D]'
            )}
            style={{
              left: `calc(${progress * 100}% - 1px)`,
              opacity: duration > 0 ? 0.9 : 0,
            }}
            aria-hidden
          />
        </div>
      </div>

      {/* Time + speed outside the wave bar */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 ps-[2.625rem]',
          isOwn ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
        )}
      >
        <span className="font-mono text-[11px] tabular-nums leading-none tracking-tight">
          {isLoading ? '…' : displayTime}
          {duration > 0 && (isPlaying || currentTime > 0.05) ? (
            <span className={cn('ms-1 opacity-60')}>/ {formatTime(duration)}</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={cycleRate}
          aria-label={`${playbackRate}x`}
          className={cn(
            'inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-[10px] font-semibold tabular-nums leading-none transition-colors',
            'focus-visible:outline-none focus-visible:ring-2',
            isOwn
              ? 'bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white/50'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 focus-visible:ring-[#64499D]/30 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
          )}
        >
          {playbackRate === 1 ? '1×' : playbackRate === 1.5 ? '1.5×' : '2×'}
        </button>
      </div>
    </div>
  );
};

export default AudioControl;
