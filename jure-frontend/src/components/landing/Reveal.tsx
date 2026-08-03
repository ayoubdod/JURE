import React from "react";
import { motion, useReducedMotion } from "framer-motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** When true, rises slightly less (for nested items) */
  subtle?: boolean;
};

const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  subtle = false,
}) => {
  const reduce = useReducedMotion();
  const y = subtle ? 12 : 28;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
