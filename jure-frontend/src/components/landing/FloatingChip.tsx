import React from "react";
import { useReducedMotion } from "framer-motion";

type FloatingChipProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in seconds for the float cycle */
  delay?: number;
  /** Float duration in seconds (3–5 recommended) */
  duration?: number;
};

/** Extremely subtle vertical float for product chrome accents. */
const FloatingChip: React.FC<FloatingChipProps> = ({
  children,
  className = "",
  delay = 0,
  duration = 4.2,
}) => {
  const reduce = useReducedMotion();

  return (
    <div
      className={`landing-float-chip ${className}`}
      style={
        reduce
          ? undefined
          : {
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }
      }
    >
      {children}
    </div>
  );
};

export default FloatingChip;
