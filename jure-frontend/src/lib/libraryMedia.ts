import { API_ORIGIN } from '@/config/api';
import { resolveBackendUrl } from '@/lib/authenticatedMedia';

export function resolveLibraryMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/') || url.startsWith('/api/v1/')) return resolveBackendUrl(url);
  if (url.startsWith('/media/') || url.startsWith('/')) return `${API_ORIGIN}${url}`;
  if (url.startsWith('media/')) return `${API_ORIGIN}/${url}`;
  return resolveBackendUrl(url);
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
};

/** Extension from a Content-Type header. Empty when the type is generic. */
export function extensionFromContentType(contentType: string | null | undefined): string {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  return CONTENT_TYPE_EXT[type] || '';
}

/** Extension from the first bytes when the server sends application/octet-stream. */
export function extensionFromBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp';
  }
  // Office Open XML (.docx) is a zip. Legacy .doc is not previewable here.
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'docx';
  }
  return '';
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
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
  return res.blob();
}

function downloadFilename(doc: API.Document): string {
  const stored = (doc.file_name || '').trim();
  if (stored) return stored.split('/').pop() || stored;
  const fromFile = (doc.file || '').split('?')[0].split('#')[0].split('/').pop();
  if (fromFile && fromFile.includes('.')) return fromFile;
  const ext = libraryFileExtension(doc.file_name || doc.title || '');
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
