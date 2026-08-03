import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DemoFeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  delay?: number;
};

const DemoFeatureCard: React.FC<DemoFeatureCardProps> = ({
  icon,
  title,
  description,
  gradient,
  delay = 0,
}) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -3, scale: 1.01 }}
    >
      <Card
        className={cn(
          "landing-glass landing-glass-glow border-0 shadow-none h-full",
          "transition-all duration-300 group overflow-hidden"
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                "transition-transform duration-300 group-hover:scale-110",
                "group-hover:shadow-[0_0_20px_-4px_rgba(100,73,157,0.65)]",
                gradient
              )}
            >
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-semibold mb-1 tracking-tight">
                {title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DemoFeatureCard;
