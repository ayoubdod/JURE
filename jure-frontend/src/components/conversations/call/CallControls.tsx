import React, { useState } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, Video, MoreHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const btn =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45';

const CallControls: React.FC<{
  variant?: 'full' | 'compact';
  isMuted: boolean;
  canMinimize?: boolean;
  canExpand?: boolean;
  isFullscreen?: boolean;
  onToggleMute?: () => void;
  onEndCall?: () => void;
  onMinimize?: () => void;
  onExpand?: () => void;
  className?: string;
}> = ({
  variant = 'full',
  isMuted,
  canMinimize,
  canExpand,
  isFullscreen,
  onToggleMute,
  onEndCall,
  onMinimize,
  onExpand,
  className,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {onToggleMute ? (
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={isMuted}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={cn(
              btn,
              'h-10 w-10',
              isMuted ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
            )}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        ) : null}
        {onEndCall ? (
          <button type="button" onClick={onEndCall} aria-label="End call" className={cn(btn, 'h-10 w-10 bg-rose-600 text-white hover:bg-rose-700')}>
            <PhoneOff className="h-4 w-4" />
          </button>
        ) : null}
        {canExpand && onExpand ? (
          <button type="button" onClick={onExpand} aria-label="Expand call" className={cn(btn, 'h-10 w-10 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100')}>
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('relative flex w-full flex-col items-center gap-3', className)}>
        <div className="flex items-center justify-center gap-3">
          {onToggleMute ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={cn(
                    btn,
                    isMuted ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
                  )}
                >
                  {isMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" disabled aria-label="Speaker (coming soon)" className={cn(btn, 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                <Volume2 className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Speaker — coming soon</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" disabled aria-label="Camera (coming soon)" className={cn(btn, 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                <Video className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Camera — coming soon</TooltipContent>
          </Tooltip>
          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label="More call options"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(btn, 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100')}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            {moreOpen ? (
              <div role="menu" className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {canMinimize && onMinimize ? (
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMoreOpen(false); onMinimize(); }}>
                    <Minimize2 className="h-3.5 w-3.5" /> Minimize
                  </button>
                ) : null}
                {canExpand && onExpand ? (
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setMoreOpen(false); onExpand(); }}>
                    <Maximize2 className="h-3.5 w-3.5" /> {isFullscreen ? 'Exit full screen' : 'Full screen'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {onEndCall ? (
          <button
            type="button"
            onClick={onEndCall}
            aria-label="End call"
            className="inline-flex h-11 min-w-[148px] items-center justify-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <PhoneOff className="h-4 w-4" /> End Call
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  );
};

export default React.memo(CallControls);
