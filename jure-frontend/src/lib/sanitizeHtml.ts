import DOMPurify from 'dompurify';

/** Client-side HTML sanitizer for JURIA artifact/chat HTML surfaces. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
