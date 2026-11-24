/** Choose where to send focus after a workspace modal closes. */
export function pickModalFocusRestoreTarget(input: {
  preferred?: Element | null;
  active?: Element | null;
  header?: Element | null;
}): HTMLElement | null {
  const ok = (el: Element | null | undefined): HTMLElement | null => {
    if (!el || el.nodeType !== 1) return null;
    const n = el as HTMLElement;
    return !('focus' in n) || !n.isConnected || n.getAttribute('role') === 'menuitem' ? null : n;
  };
  const h = input.header as HTMLElement | null | undefined;
  return (
    ok(input.preferred) ??
    ok(input.active) ??
    (h?.isConnected
      ? ok(h.querySelector('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')) ?? h
      : null)
  );
}
