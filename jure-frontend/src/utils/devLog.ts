/**
 * Development-only logging helpers for Vite.
 * Avoids noisy production consoles while preserving diagnostics locally.
 */
export function devLog(...args: unknown[]): void {
  if (import.meta.env.DEV) console.log(...args);
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env.DEV) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (import.meta.env.DEV) console.error(...args);
}
