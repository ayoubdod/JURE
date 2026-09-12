import React from "react";
import { useReducedMotion } from "framer-motion";

type FloatingChipProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in seconds for the float cycle */
  delay?: number;
  /** Float duration in seconds (3–5 recommended) */
  duration?: number;
  /** Slight physical tilt in degrees */
  rotate?: number;
};

/** Extremely subtle vertical float for product chrome accents. */
const FloatingChip: React.FC<FloatingChipProps> = ({
  children,
  className = "",
  delay = 0,
  duration = 4.2,
  rotate = 0,
}) => {
  const reduce = useReducedMotion();

  return (
    <div
      className={`landing-float-chip ${className}`}
      style={
        reduce
          ? { transform: rotate ? `rotate(${rotate}deg)` : undefined }
          : {
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }
      }
    >
      <div style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
        {children}
      </div>
    </div>
  );
};

export default FloatingChip;
