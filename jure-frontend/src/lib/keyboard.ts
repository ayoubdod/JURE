/** True when the event target is a text-entry control. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

/** Modifier chord key shown in the UI (⌘ on Apple, Ctrl elsewhere). */
export function modSymbol(isMac = isMacPlatform()): string {
  return isMac ? '⌘' : 'Ctrl';
}

/** Dialogs/sheets that should block letter shortcuts (not the palette/help overlay). */
export function hasBlockingDialog(): boolean {
  if (typeof document === 'undefined') return false;
  const open = document.querySelectorAll(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
  for (const el of open) {
    if (el instanceof HTMLElement && el.closest('[data-shortcuts-ui]')) continue;
    return true;
  }
  return false;
}
