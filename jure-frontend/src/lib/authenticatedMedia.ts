import { useEffect, useState } from 'react';
import { API_ORIGIN } from '@/config/api';

export function resolveBackendUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  const u = url.trim();
  if (u.startsWith('blob:') || u.startsWith('data:')) return u;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = API_ORIGIN.replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? '' : '/'}${u}`;
}

export function isSameOriginApiDownload(url: string | null | undefined): boolean {
  if (!url) return false;
  const resolved = resolveBackendUrl(url);
  try {
    const target = new URL(resolved, window.location.href);
    const api = new URL(API_ORIGIN, window.location.href);
    return target.origin === api.origin && /\/download\/?/.test(target.pathname);
  } catch {
    return false;
  }
}

export async function fetchAuthenticatedMediaBlob(url: string): Promise<Blob> {
  const res = await fetch(resolveBackendUrl(url), { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch media (${res.status})`);
  return res.blob();
}

export function useAuthenticatedObjectUrl(url: string | null | undefined): string | undefined {
  const resolved = resolveBackendUrl(url);
  const [objectUrl, setObjectUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!resolved) {
      setObjectUrl(undefined);
      return;
    }
    if (!isSameOriginApiDownload(resolved)) {
      setObjectUrl(resolved);
      return;
    }
    let cancelled = false;
    let nextObjectUrl: string | undefined;
    fetchAuthenticatedMediaBlob(resolved)
      .then((blob) => {
        if (cancelled) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(undefined);
      });
    return () => {
      cancelled = true;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [resolved]);

  return objectUrl;
}
