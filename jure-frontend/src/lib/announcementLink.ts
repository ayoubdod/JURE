/** Parse and validate optional announcement CTA URLs. */

const UNSAFE_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:', 'blob:'];

export type ParsedAnnouncementLink =
  | { kind: 'internal'; to: string }
  | { kind: 'external'; href: string };

export function normalizeAnnouncementUrl(value: string | null | undefined): string {
  return (value || '').trim();
}

export function parseAnnouncementLink(value: string | null | undefined): ParsedAnnouncementLink | null {
  const raw = normalizeAnnouncementUrl(value);
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (UNSAFE_SCHEMES.some((scheme) => lowered.startsWith(scheme))) return null;
  if (raw.startsWith('//')) return null;

  if (raw.startsWith('/')) {
    if (raw.includes('\\') || raw.startsWith('//')) return null;
    return { kind: 'internal', to: raw };
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return { kind: 'external', href: url.toString() };
  } catch {
    return null;
  }
}

export function isValidAnnouncementLink(value: string | null | undefined): boolean {
  const raw = normalizeAnnouncementUrl(value);
  if (!raw) return true;
  return parseAnnouncementLink(raw) !== null;
}
