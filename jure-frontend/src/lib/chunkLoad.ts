/** Session flag so a missing post-deploy chunk reloads the page at most once. */
const RELOAD_KEY = 'jure:stale-chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk .+ failed/i.test(msg)
  );
}

/** Reload once so the browser picks up the new index.html after a deploy. */
export function reloadOnceOnStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export function clearStaleChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

/** Used by route-level `lazy()` so a stale hashed file reloads instead of crashing. */
export function importWithRetry<T>(loader: () => Promise<T>): Promise<T> {
  return loader()
    .then((mod) => {
      clearStaleChunkReloadFlag();
      return mod;
    })
    .catch(async (error: unknown) => {
      if (!isChunkLoadError(error)) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      try {
        const mod = await loader();
        clearStaleChunkReloadFlag();
        return mod;
      } catch (retryError) {
        if (isChunkLoadError(retryError)) {
          reloadOnceOnStaleChunk();
        }
        throw retryError;
      }
    });
}
