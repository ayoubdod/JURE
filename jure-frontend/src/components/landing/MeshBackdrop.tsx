import React from "react";

/** Subtle animated grid + aurora mesh. CSS-only, respect reduced-motion via landing.css. */
const MeshBackdrop: React.FC = () => (
  <div className="landing-mesh" aria-hidden>
    <div className="landing-mesh__grid" />
    <div className="landing-mesh__aurora landing-mesh__aurora--a" />
    <div className="landing-mesh__aurora landing-mesh__aurora--b" />
    <div className="landing-mesh__aurora landing-mesh__aurora--c" />
    <div className="landing-mesh__particles" />
  </div>
);

export default MeshBackdrop;
