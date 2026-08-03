import React from "react";
import { cn } from "@/lib/utils";

type GlassPanelProps = {
  className?: string;
  glowOnHover?: boolean;
  children?: React.ReactNode;
};

const GlassPanel: React.FC<GlassPanelProps> = ({
  className,
  glowOnHover = true,
  children,
}) => (
  <div
    className={cn(
      "landing-glass rounded-2xl",
      glowOnHover && "landing-glass-glow transition-all duration-300",
      className
    )}
  >
    {children}
  </div>
);

export default GlassPanel;
