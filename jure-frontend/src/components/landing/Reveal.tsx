import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** When true, rises slightly less (for nested items) */
  subtle?: boolean;
  /** Horizontal entrance: from left (-) or right (+) */
  x?: number;
  /** Scale from → 1 */
  scale?: number;
  duration?: number;
};

const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  subtle = false,
  x = 0,
  scale,
  duration = 0.65,
}) => {
  const reduce = useReducedMotion();
  const y = subtle ? 12 : 24;

  if (reduce) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35, delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: x === 0 ? y : 0,
        x,
        scale: scale ?? 1,
      }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px", amount: 0.25 }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
