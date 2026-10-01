import { createWorker, type Worker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { fetchLibraryBlob, resolveLibraryMediaUrl } from '@/lib/libraryMedia';
import type { ExtractedPage } from './extractReadingText';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const ocrCache = new Map<string, string>();
let sharedWorker: Worker | null = null;
let sharedWorkerLangs = '';

function normalizeFileKey(fileUrl: string): string {
  return resolveLibraryMediaUrl(fileUrl) || fileUrl;
}

function cacheKey(fileUrl: string, page: number, langs: string) {
  return `${normalizeFileKey(fileUrl)}::${page}::${langs}`;
}

/** Read a previously OCR'd page without re-running Tesseract. */
export function peekOcrCache(fileUrl: string, page: number, langs?: string): string | null {
  const key = cacheKey(fileUrl, page, langs || 'eng+fra');
  return ocrCache.get(key) ?? null;
}

/** Map UI language to Tesseract traineddata packs (eng always included). */
export function ocrLangsForUi(lang?: string): string {
  if (lang === 'ar') return 'eng+ara+fra';
  if (lang === 'fr') return 'eng+fra';
  return 'eng+fra';
}

async function getWorker(langs: string, onProgress?: (status: string, progress: number) => void) {
  if (sharedWorker && sharedWorkerLangs === langs) return sharedWorker;
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {
      /* ignore */
    }
    sharedWorker = null;
  }
  const worker = await createWorker(langs, 1, {
    logger: (m) => {
      if (!onProgress) return;
      if (m.status === 'recognizing text') {
        onProgress('recognizing', typeof m.progress === 'number' ? m.progress : 0);
      } else if (m.status) {
        onProgress(String(m.status), typeof m.progress === 'number' ? m.progress : 0);
      }
    },
  });
  sharedWorker = worker;
  sharedWorkerLangs = langs;
  return worker;
}

async function renderPdfPageToCanvas(
  fileUrl: string,
  pageNum: number
): Promise<{ canvas: HTMLCanvasElement; pageCount: number }> {
  const href = resolveLibraryMediaUrl(fileUrl);
  const buf = await fetchLibraryBlob(href).then((b) => b.arrayBuffer());
  // Copy so pdf.js transfer does not break later readers.
  const data = buf.slice(0);
  const pdf = await pdfjsLib.getDocument({
    data,
    verbosity: 0,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  }).promise;
  try {
    const pageCount = pdf.numPages || 0;
    if (pageNum < 1 || (pageCount > 0 && pageNum > pageCount)) {
      throw new Error(`Page ${pageNum} out of range (1–${pageCount})`);
    }
    const page = await pdf.getPage(pageNum);
    try {
      // Higher scale improves OCR accuracy on fine legal print.
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return { canvas, pageCount };
    } finally {
      page.cleanup();
    }
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
  }
}

/**
 * OCR one or more PDF pages (scanned / image-only). Results are cached in-memory.
 */
export async function ocrPdfPages(args: {
  fileUrl: string;
  pages: number[];
  langs?: string;
  onProgress?: (info: { page: number; index: number; total: number; progress: number }) => void;
}): Promise<{ pages: ExtractedPage[]; pageCount: number }> {
  const langs = args.langs || 'eng+fra';
  const unique = [...new Set(args.pages)].filter((p) => p >= 1).sort((a, b) => a - b);
  const out: ExtractedPage[] = [];
  let pageCount = 0;

  const worker = await getWorker(langs);

  for (let i = 0; i < unique.length; i++) {
    const pageNum = unique[i];
    const key = cacheKey(args.fileUrl, pageNum, langs);
    const cached = ocrCache.get(key);
    if (cached) {
      out.push({ page: pageNum, text: cached });
      args.onProgress?.({ page: pageNum, index: i, total: unique.length, progress: 1 });
      continue;
    }

    const { canvas, pageCount: pc } = await renderPdfPageToCanvas(args.fileUrl, pageNum);
    pageCount = pc || pageCount;
    args.onProgress?.({ page: pageNum, index: i, total: unique.length, progress: 0.05 });

    const result = await worker.recognize(canvas);
    const text = (result.data.text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    // Keep tiny OCR results — legalese scans can yield short headers.
    if (text.length >= 2) {
      ocrCache.set(key, text);
      out.push({ page: pageNum, text });
    }
    args.onProgress?.({ page: pageNum, index: i, total: unique.length, progress: 1 });
  }

  return { pages: out, pageCount };
}

export function clearOcrCacheForDoc(fileUrl: string) {
  const prefix = `${normalizeFileKey(fileUrl)}::`;
  for (const key of [...ocrCache.keys()]) {
    if (key.startsWith(prefix)) ocrCache.delete(key);
  }
}
