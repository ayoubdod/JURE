/** Scroll active chip into view; respects prefers-reduced-motion. */
export function scrollChipIntoView(el: Element | null | undefined) {
  if (!el || typeof window === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
}
