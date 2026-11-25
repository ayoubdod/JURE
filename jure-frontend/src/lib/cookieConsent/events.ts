export const OPEN_COOKIE_PREFERENCES_EVENT = "jure:open-cookie-preferences";

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}
