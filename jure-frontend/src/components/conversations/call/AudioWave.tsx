import React from 'react';
import { cn } from '@/lib/utils';

const PEAKS = [0.35, 0.55, 0.8, 0.45, 0.95, 0.6, 0.75, 0.4, 0.9, 0.5, 0.7, 0.4];

const AudioWave: React.FC<{ active: boolean; muted: boolean; className?: string }> = ({
  active,
  muted,
  className,
}) => {
  const animate = active && !muted;
  return (
    <div
      className={cn('flex h-8 items-center justify-center gap-[4px]', className)}
      role="img"
      aria-label={muted ? 'Microphone muted' : active ? 'Live audio' : 'Audio idle'}
    >
      {PEAKS.map((peak, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] rounded-full bg-sky-400/90 transition-all duration-200',
            !animate && 'h-[3px] opacity-35'
          )}
          style={
            animate
              ? {
                  animation: `call-wave-smooth ${0.85 + (i % 4) * 0.08}s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`,
                  ['--wave-peak' as string]: `${Math.round(4 + peak * 18)}px`,
                }
              : undefined
          }
        />
      ))}
      <style>{`
        @keyframes call-wave-smooth {
          0%, 100% { height: 3px; opacity: 0.4; }
          50% { height: var(--wave-peak, 16px); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(AudioWave);

