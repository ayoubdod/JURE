import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, type LucideIcon } from "lucide-react";

export interface WorkflowStep {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  /** Highlight this step (e.g. the human-review step in AI workflows). */
  emphasis?: boolean;
}

interface WorkflowDiagramProps {
  steps: WorkflowStep[];
  /** "row" on desktop / column on mobile (default), or always vertical. */
  direction?: "responsive" | "vertical";
  className?: string;
  /** Accessible description of the workflow. */
  ariaLabel?: string;
}

/**
 * Animated step sequence used to explain how JURE works (document → analysis
 * → matter → tasks → deadline, etc.). Motion is a staggered reveal only and
 * fully disabled under prefers-reduced-motion.
 */
const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  steps,
  direction = "responsive",
  className = "",
  ariaLabel,
}) => {
  const reduce = useReducedMotion();
  const horizontal = direction === "responsive";

  const containerCls = horizontal
    ? "flex flex-col md:flex-row md:items-stretch items-center gap-1.5 md:gap-0"
    : "flex flex-col items-center gap-1.5";

  return (
    <div className={`${containerCls} ${className}`} role="img" aria-label={ariaLabel}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        const node = (
          <div
            className={`landing-glass rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 w-full md:w-auto md:flex-1 min-w-0 ${
              step.emphasis
                ? "border-[#A58CF4]/40 dark:border-[#A58CF4]/50 bg-[#A58CF4]/5 dark:bg-[#A58CF4]/20"
                : ""
            }`}
          >
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                step.emphasis
                  ? "bg-[#A58CF4] text-white"
                  : "bg-[#A58CF4]/10 text-[#A58CF4] dark:bg-[#A58CF4]/25 dark:text-[#A58CF4]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {step.label}
              </div>
              {step.sublabel && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                  {step.sublabel}
                </div>
              )}
            </div>
          </div>
        );

        const arrow =
          i < steps.length - 1 ? (
            <span className="flex items-center justify-center text-[#A58CF4]/50 dark:text-[#A58CF4]/60 shrink-0 md:px-1">
              {horizontal ? (
                <>
                  <ArrowRight className="w-4 h-4 hidden md:block rtl:rotate-180" />
                  <ArrowDown className="w-4 h-4 md:hidden" />
                </>
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </span>
          ) : null;

        if (reduce) {
          return (
            <React.Fragment key={step.label}>
              <div className="w-full md:w-auto md:flex-1 flex">{node}</div>
              {arrow}
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={step.label}>
            <motion.div
              className="w-full md:w-auto md:flex-1 flex"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              {node}
            </motion.div>
            {arrow && (
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: i * 0.12 + 0.15 }}
                className="flex"
              >
                {arrow}
              </motion.span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WorkflowDiagram;
