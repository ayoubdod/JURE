/** Parse filename from Content-Disposition (RFC 5987 / simple form). */
export function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header || typeof header !== 'string') return fallback;
  const star = /filename\*=(?:UTF-8''|utf-8'')([^;\n]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename=(["'])((?:\\.|(?!\1).)*)\1/i.exec(header);
  if (plain?.[2]) return plain[2].replace(/\\"/g, '"');
  const loose = /filename=([^;\s]+)/i.exec(header);
  if (loose?.[1]) return loose[1].replace(/^["']|["']$/g, '');
  return fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function openPdfBlobInNewTab(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}
