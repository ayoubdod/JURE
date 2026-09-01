/** Radix modal layers can leave the document unclickable after they close. */
export function restorePointerEvents() {
  if (typeof document === 'undefined') return;
  if (document.body.style.pointerEvents === 'none') {
    document.body.style.removeProperty('pointer-events');
  }
  if (document.documentElement.style.pointerEvents === 'none') {
    document.documentElement.style.removeProperty('pointer-events');
  }
}
