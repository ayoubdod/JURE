import React, { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type CountUpStatProps = {
  value: number;
  suffix?: string;
  label: string;
  durationMs?: number;
  /** Space thousands with thin space for FR-style display */
  spaced?: boolean;
};

function formatNumber(n: number, spaced: boolean): string {
  const rounded = Math.round(n);
  if (!spaced) return String(rounded);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

const CountUpStat: React.FC<CountUpStatProps> = ({
  value,
  suffix = "",
  label,
  durationMs = 1600,
  spaced = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, durationMs, reduce]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-1 tabular-nums">
        {formatNumber(display, spaced)}
        {suffix}
      </div>
      <div className="text-purple-100/90 text-sm md:text-base">{label}</div>
    </div>
  );
};

export default CountUpStat;
