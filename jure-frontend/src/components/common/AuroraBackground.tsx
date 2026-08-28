import React from 'react';
import { cn } from '@/lib/utils';
import '@/components/common/aurora.css';

export type AuroraIntensity = 'strong' | 'medium' | 'subtle' | 'minimal';

type AuroraBackgroundProps = {
  intensity?: AuroraIntensity;
  /** Override grid visibility. Defaults on for strong / medium / subtle. */
  grid?: boolean;
  className?: string;
};

/**
 * Atmospheric aurora for JURE. Sit this behind content (parent: relative).
 * Gradients are environmental light — content must stay at a higher z-index.
 */
const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  intensity = 'strong',
  grid,
  className,
}) => {
  const showGrid = grid ?? intensity !== 'minimal';
  const showBlue = intensity !== 'minimal';
  const showCyan = intensity === 'strong';
  const showViolet = intensity !== 'minimal';

  return (
    <div
      className={cn('aurora-layer', `aurora-layer--${intensity}`, className)}
      aria-hidden
    >
      <div className="aurora-layer__base" />
      <div className="aurora-layer__wash" />
      {showGrid ? <div className="aurora-layer__grid" /> : null}
      <div className="aurora-orb aurora-orb--a" />
      <div className="aurora-orb aurora-orb--b" />
      <div className="aurora-blob aurora-blob--purple" />
      {showViolet ? <div className="aurora-blob aurora-blob--violet" /> : null}
      {showBlue ? <div className="aurora-blob aurora-blob--blue" /> : null}
      {showCyan ? <div className="aurora-blob aurora-blob--cyan" /> : null}
    </div>
  );
};

/** Full-page frame: aurora behind centered cards (auth, verify, reset). */
export function AuroraPage({
  intensity = 'medium',
  className,
  children,
}: {
  intensity?: AuroraIntensity;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9FD] dark:bg-[#0c0a14]">
      <AuroraBackground intensity={intensity} />
      <div className={cn('relative z-[1] min-h-screen', className)}>{children}</div>
    </div>
  );
}

const MARKETING_STRONG =
  /\/(juria|demo|features|legal-ai|legal-research|responsible-legal-ai)(\/|$)/;
const MARKETING_MINIMAL = /\/(privacy|terms|docs)(\/|$)/;

/** Landing + AI marketing: strong. Legal copy: minimal. Other marketing: medium. */
export function auroraForMarketingPath(pathname: string): AuroraIntensity {
  const rest = pathname.replace(/^\/(en|fr|ar)(?=\/|$)/, '') || '/';
  if (rest === '/' || rest === '') return 'strong';
  if (MARKETING_STRONG.test(rest) || rest.includes('/solutions')) return 'strong';
  if (MARKETING_MINIMAL.test(rest)) return 'minimal';
  return 'medium';
}

/** JURIA: strong. Dashboard home: subtle. Casework / library / rest of app: minimal. */
export function auroraForAppPath(pathname: string): AuroraIntensity {
  if (pathname.startsWith('/dashboard/juria') || pathname.startsWith('/dashboard/legal-ai')) {
    return 'strong';
  }
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'subtle';
  return 'minimal';
}

export default AuroraBackground;
