import { API_ORIGIN } from '@/config/api';
import useUserStore from '@/stores/userStore';

export function resolveLibraryMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/') || url.startsWith('/')) return `${API_ORIGIN}${url}`;
  if (url.startsWith('media/')) return `${API_ORIGIN}/${url}`;
  return `${API_ORIGIN}/media/${url}`;
}

export function libraryFileExtension(fileName: string): string {
  if (!fileName) return '';
  let path = fileName;
  try {
    if (/^https?:\/\//i.test(fileName)) path = new URL(fileName).pathname;
  } catch {
    /* keep */
  }
  const clean = path.split('?')[0].split('#')[0];
  const base = clean.split('/').pop() || clean;
  const ext = base.includes('.') ? base.split('.').pop() : '';
  return (ext || '').toLowerCase();
}

export async function fetchLibraryBlob(url: string): Promise<Blob> {
  const token = useUserStore.getState().accessToken;
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
  return res.blob();
}

function downloadFilename(doc: API.Document): string {
  const fromFile = (doc.file || '').split('?')[0].split('#')[0].split('/').pop();
  if (fromFile && fromFile.includes('.')) return fromFile;
  const ext = libraryFileExtension(doc.file || doc.title || '');
  const base = (doc.title || 'document').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
}

/** Open the document file in a new browser tab (authenticated fetch when needed). */
export async function openLibraryDocumentInNewTab(doc: API.Document): Promise<void> {
  if (doc.external_url && !doc.file) {
    window.open(doc.external_url, '_blank', 'noopener,noreferrer');
    return;
  }
  const href = resolveLibraryMediaUrl(doc.file);
  if (!href) {
    if (doc.external_url) {
      window.open(doc.external_url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  const blob = await fetchLibraryBlob(href);
  const objectUrl = URL.createObjectURL(blob);
  const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    // Popup blocked — fall back to same-tab navigation via temporary anchor
    const a = window.document.createElement('a');
    a.href = objectUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Force a real file download (blob), instead of opening a new tab. */
export async function downloadLibraryDocument(doc: API.Document): Promise<void> {
  if (doc.external_url && !doc.file) {
    window.open(doc.external_url, '_blank', 'noopener,noreferrer');
    return;
  }
  const href = resolveLibraryMediaUrl(doc.file);
  if (!href) {
    if (doc.external_url) {
      window.open(doc.external_url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  const blob = await fetchLibraryBlob(href);
  const objectUrl = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = objectUrl;
  a.download = downloadFilename(doc);
  a.rel = 'noopener';
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}
