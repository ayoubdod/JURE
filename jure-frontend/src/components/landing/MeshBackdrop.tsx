import React from "react";
import AuroraBackground from "@/components/common/AuroraBackground";

/** Subtle animated grid + aurora mesh. CSS-only, respect reduced-motion via aurora.css. */
const MeshBackdrop: React.FC = () => <AuroraBackground intensity="strong" />;

export default MeshBackdrop;
