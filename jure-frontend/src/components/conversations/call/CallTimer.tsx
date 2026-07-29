import React, { useEffect, useState } from 'react';

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CallTimer: React.FC<{
  active: boolean;
  startTime: Date | null;
  className?: string;
}> = ({ active, startTime, className }) => {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (!active || !startTime) {
      setSec(0);
      return;
    }
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
      setSec(elapsed);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, startTime]);

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {formatMmSs(sec)}
    </span>
  );
};

export default CallTimer;
