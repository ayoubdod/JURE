import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import GlassPanel from "./GlassPanel";

type FeatureTileProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  delay?: number;
};

const FeatureTile: React.FC<FeatureTileProps> = ({
  icon,
  title,
  description,
  accent,
  delay = 0,
}) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
    >
      <GlassPanel className="group p-7 h-full">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_24px_-4px_rgba(100,73,157,0.7)]"
          style={{ background: accent }}
        >
          <span className="inline-flex motion-safe:group-hover:animate-pulse">{icon}</span>
        </div>
        <h3 className="font-display text-xl font-semibold mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
          {description}
        </p>
      </GlassPanel>
    </motion.div>
  );
};

export default FeatureTile;
