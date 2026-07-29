import React from 'react';
import { cn } from '@/lib/utils';

const BAR_COUNT = 5;

const AudioWave: React.FC<{
  active: boolean;
  muted: boolean;
  className?: string;
}> = ({ active, muted, className }) => {
  return (
    <div
      className={cn('flex h-10 items-end justify-center gap-1', className)}
      aria-hidden
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className={cn(
            'w-1 rounded-full bg-emerald-400/90 transition-all duration-300',
            muted || !active ? 'h-1 opacity-40' : 'call-wave-bar'
          )}
          style={
            !muted && active
              ? { animationDelay: `${i * 0.12}s` }
              : undefined
          }
        />
      ))}
      <style>{`
        @keyframes call-wave {
          0%, 100% { height: 4px; opacity: 0.5; }
          50% { height: 28px; opacity: 1; }
        }
        .call-wave-bar {
          animation: call-wave 0.9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AudioWave;
