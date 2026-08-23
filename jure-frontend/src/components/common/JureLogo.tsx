import { cn } from '@/lib/utils';

type JureLogoProps = {
  /** J mark only — use in compact chrome such as a collapsed sidebar. */
  mark?: boolean;
  /** White glyph for purple or dark backgrounds. */
  inverted?: boolean;
  className?: string;
  alt?: string;
};

/**
 * Cropped Jure wordmark (or J mark). The source PNGs are tight crops of
 * `jure-logo.png` with a transparent background so invert works on dark UI.
 */
export default function JureLogo({
  mark = false,
  inverted = false,
  className,
  alt = 'JURE',
}: JureLogoProps) {
  return (
    <img
      src={mark ? '/images/jure-mark.png' : '/images/jure-wordmark.png'}
      alt={alt}
      className={cn(
        'object-contain',
        mark ? 'h-8 w-8' : 'h-8 w-auto',
        inverted && 'brightness-0 invert',
        className,
      )}
    />
  );
}
