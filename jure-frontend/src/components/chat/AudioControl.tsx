import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const BAR_COUNT = 32;

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
    const envelope = 0.35 + 0.65 * Math.sin((i / BAR_COUNT) * Math.PI);
    out.push(0.18 + n * 0.82 * envelope);
  }
  return out;
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const bars = useMemo(() => barsFromKey(audioSrc), [audioSrc]);

  useEffect(() => {
    const fromMeta = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
    setDuration(fromMeta);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(!fromMeta);
  }, [audioSrc, durationMs]);

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
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
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

  const seekTo = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;
    const next = Math.min(1, Math.max(0, ratio)) * duration;
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const remaining = duration > 0 ? Math.max(0, duration - currentTime) : 0;

  return (
    <div
      className={cn(
        'flex w-[min(100%,15.5rem)] items-center gap-2.5 py-0.5',
        className
      )}
      role="group"
      aria-label={t.conversations.voiceNoteAria}
    >
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <button
        type="button"
        onClick={togglePlayPause}
        disabled={isLoading}
        aria-label={isPlaying ? t.conversations.pauseAria : t.conversations.playAria}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          isOwn
            ? 'bg-white text-[#64499D] hover:bg-white/90'
            : 'bg-[#64499D] text-white hover:bg-[#553d86]',
          isLoading && 'cursor-not-allowed opacity-60'
        )}
      >
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-3.5 w-3.5" fill="currentColor" />
        ) : (
          <Play className="ms-0.5 h-3.5 w-3.5" fill="currentColor" />
        )}
      </button>

      <button
        type="button"
        className="flex h-8 min-w-0 flex-1 items-center gap-[2px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30"
        aria-label={t.conversations.seekAria}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekTo((e.clientX - rect.left) / rect.width);
        }}
      >
        {bars.map((peak, i) => {
          const filled = i / bars.length <= progress;
          return (
            <span
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-colors duration-75',
                filled
                  ? isOwn
                    ? 'bg-white'
                    : 'bg-[#64499D]'
                  : isOwn
                    ? 'bg-white/30'
                    : 'bg-slate-300 dark:bg-slate-600',
                isPlaying && filled && 'animate-pulse'
              )}
              style={{ height: `${Math.round(6 + peak * 18)}px` }}
            />
          );
        })}
      </button>

      <span
        className={cn(
          'min-w-[2.25rem] text-right font-mono text-[11px] tabular-nums',
          isOwn ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
        )}
      >
        {isPlaying || currentTime > 0 ? formatTime(remaining) : formatTime(duration)}
      </span>
    </div>
  );
};

function fromKnownDuration(durationMs?: number | null): boolean {
  return !!(durationMs && durationMs > 0);
}

export default AudioControl;
