import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { fetchLibraryBlob, libraryFileExtension, resolveLibraryMediaUrl } from '@/lib/libraryMedia';
import type { ReadingDocument } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ExtractedPage = { page: number; text: string };

const pdfDataCache = new Map<string, Promise<ArrayBuffer>>();

async function loadPdfData(url: string): Promise<ArrayBuffer> {
  let cached = pdfDataCache.get(url);
  if (!cached) {
    cached = fetchLibraryBlob(url)
      .then((blob) => blob.arrayBuffer())
      .catch((err) => {
        pdfDataCache.delete(url);
        throw err;
      });
    pdfDataCache.set(url, cached);
    if (pdfDataCache.size > 8) {
      const first = pdfDataCache.keys().next().value;
      if (first) pdfDataCache.delete(first);
    }
  }
  // pdf.js may transfer/detach the buffer — always hand it a copy.
  const buf = await cached;
  return buf.slice(0);
}

async function textFromPdfPage(page: pdfjsLib.PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  const parts: string[] = [];
  let lastY: number | null = null;
  for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
    const str = (item.str || '').trim();
    if (!str) continue;
    const y = item.transform?.[5];
    if (lastY != null && y != null && Math.abs(lastY - y) > 6) parts.push('\n');
    else if (parts.length) parts.push(' ');
    parts.push(str);
    if (y != null) lastY = y;
  }
  return parts.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Extract text for specific PDF pages (1-indexed). */
export async function extractPdfPages(
  fileUrl: string,
  pages: number[]
): Promise<{ pages: ExtractedPage[]; pageCount: number }> {
  const href = resolveLibraryMediaUrl(fileUrl);
  if (!href) return { pages: [], pageCount: 0 };
  const data = await loadPdfData(href);
  const pdf = await pdfjsLib.getDocument({
    data,
    verbosity: 0,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  }).promise;
  try {
    const pageCount = pdf.numPages || 0;
    const unique = [...new Set(pages)]
      .filter((p) => p >= 1 && (pageCount === 0 || p <= pageCount))
      .sort((a, b) => a - b);
    const out: ExtractedPage[] = [];
    for (const n of unique) {
      const page = await pdf.getPage(n);
      try {
        const text = await textFromPdfPage(page);
        if (text) out.push({ page: n, text });
      } finally {
        page.cleanup();
      }
    }
    return { pages: out, pageCount };
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
  }
}

function wantsWholeDocument(question: string): boolean {
  return /entire document|whole document|ce document|this document|full document|document entier|الملف كاملا|هذا المستند/i.test(
    question
  );
}

function buildTextBlock(
  pages: ExtractedPage[],
  pageCount: number,
  maxChars: number,
  ocr = false
): { block: string; pagesUsed: number[] } {
  const chunks: string[] = [];
  let used = 0;
  const pagesUsed: number[] = [];
  for (const p of pages) {
    const tag = ocr ? 'OCR' : 'text';
    const header = `--- Page ${p.page} of ${pageCount} (${tag}) ---\n`;
    const body = p.text.slice(0, Math.max(0, maxChars - used - header.length));
    if (!body.trim()) continue;
    chunks.push(header + body);
    pagesUsed.push(p.page);
    used += header.length + body.length;
    if (used >= maxChars) break;
  }
  return { block: chunks.join('\n\n'), pagesUsed };
}

/**
 * Build readable text context for Juria from the open document.
 * Prefer current page (and neighbors); for full-doc asks, sample more pages.
 * When embedded PDF text is empty and `allowOcr` is set, OCR scanned pages.
 */
export async function extractReadingTextForAsk(args: {
  doc: ReadingDocument;
  page: number;
  question: string;
  allowOcr?: boolean;
  language?: string;
  onOcrProgress?: (info: {
    page: number;
    index: number;
    total: number;
    progress: number;
  }) => void;
}): Promise<{
  block: string;
  pageCount: number;
  pagesUsed: number[];
  usedOcr: boolean;
}> {
  const ext = libraryFileExtension(args.doc.file || args.doc.title || '');
  if (!args.doc.file || (ext && ext !== 'pdf')) {
    return { block: '', pageCount: 0, pagesUsed: [], usedOcr: false };
  }

  const whole = wantsWholeDocument(args.question);
  const center = Math.max(1, args.page || 1);
  const maxChars = whole ? 24000 : 12000;

  let pageCount = 0;
  let pages: ExtractedPage[] = [];

  try {
    // Probe page count via a single-page extract first
    const probe = await extractPdfPages(args.doc.file, [center]);
    pageCount = probe.pageCount || center;
    let targets: number[];
    if (whole) {
      const maxPages = Math.min(pageCount, 12);
      targets = Array.from({ length: maxPages }, (_, i) => i + 1);
    } else {
      targets = [center - 1, center, center + 1].filter((p) => p >= 1 && p <= pageCount);
      if (!targets.length) targets = [center];
    }

    const extracted =
      targets.length === 1 && targets[0] === center
        ? probe
        : await extractPdfPages(args.doc.file, targets);
    pages = extracted.pages;
    pageCount = extracted.pageCount || pageCount;
  } catch {
    // Embedded-text extract can fail (detached buffers, corrupt PDF) — fall through to OCR.
    pages = [];
  }

  if (pages.length) {
    const built = buildTextBlock(pages, pageCount || center, maxChars, false);
    return { ...built, pageCount: pageCount || center, usedOcr: false };
  }

  if (!args.allowOcr) {
    return { block: '', pageCount: pageCount || center, pagesUsed: [], usedOcr: false };
  }

  try {
    // Scanned / image-only PDF — OCR a smaller page window (expensive).
    const { ocrLangsForUi, ocrPdfPages, peekOcrCache } = await import('./ocrReadingPage');
    const langs = ocrLangsForUi(args.language);
    const ocrTargets = whole
      ? Array.from({ length: Math.min(Math.max(pageCount, center), 4) }, (_, i) => i + 1)
      : [center];

    // Reuse any pages already OCR'd (e.g. "OCR this page" button).
    const cachedPages: ExtractedPage[] = [];
    const missing: number[] = [];
    for (const p of ocrTargets) {
      const hit = peekOcrCache(args.doc.file, p, langs);
      if (hit) cachedPages.push({ page: p, text: hit });
      else missing.push(p);
    }

    let ocrPages = cachedPages;
    let ocrPageCount = pageCount;
    if (missing.length) {
      const ocr = await ocrPdfPages({
        fileUrl: args.doc.file,
        pages: missing,
        langs,
        onProgress: args.onOcrProgress,
      });
      ocrPageCount = ocr.pageCount || pageCount;
      ocrPages = [...cachedPages, ...ocr.pages].sort((a, b) => a.page - b.page);
    }

    const built = buildTextBlock(ocrPages, ocrPageCount || pageCount || center, maxChars, true);
    return {
      ...built,
      pageCount: ocrPageCount || pageCount || center,
      usedOcr: Boolean(built.block),
    };
  } catch {
    return { block: '', pageCount: pageCount || center, pagesUsed: [], usedOcr: false };
  }
}
