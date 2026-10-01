import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { FileText, Globe, Landmark } from 'lucide-react';
import { API_ORIGIN } from '@/config/api';
import useUserStore from '@/stores/userStore';
import { cn } from '@/lib/utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);

function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/media/') || url.startsWith('/')) return `${API_ORIGIN}${url}`;
  if (url.startsWith('media/')) return `${API_ORIGIN}/${url}`;
  return `${API_ORIGIN}/media/${url}`;
}

function fileExtension(fileName: string): string {
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

async function fetchAuthenticatedBlob(url: string): Promise<Blob> {
  const token = useUserStore.getState().accessToken;
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
  return res.blob();
}

const pdfBlobCache = new Map<string, Promise<Blob>>();
function getPdfData(url: string): Promise<ArrayBuffer> {
  let cached = pdfBlobCache.get(url);
  if (!cached) {
    cached = fetchAuthenticatedBlob(url).catch((err) => {
      pdfBlobCache.delete(url);
      throw err;
    });
    pdfBlobCache.set(url, cached);
    if (pdfBlobCache.size > 12) {
      const first = pdfBlobCache.keys().next().value;
      if (first) pdfBlobCache.delete(first);
    }
  }
  return cached.then((blob) => blob.arrayBuffer());
}

export function coverTheme(category?: string, resourceType?: string): {
  from: string;
  via: string;
  to: string;
  accent: string;
  pattern: string;
} {
  const key = (category || resourceType || 'other').toLowerCase();
  if (key.includes('legislation') || key.includes('law') || key.includes('code') || key.includes('regulation') || key.includes('decree')) {
    return { from: '#1e3a5f', via: '#2a4a73', to: '#152a45', accent: '#f0c75e', pattern: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 45%)' };
  }
  if (key.includes('case') || key.includes('court') || key.includes('jurisprudence') || key.includes('plead')) {
    return { from: '#3b1f4a', via: '#5a2d6e', to: '#2a1536', accent: '#e8b4d4', pattern: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)' };
  }
  if (key.includes('contract') || key.includes('agreement') || key.includes('template') || key.includes('form')) {
    return { from: '#1a4d3e', via: '#246b56', to: '#12382d', accent: '#9fe0c4', pattern: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.14), transparent 40%)' };
  }
  if (key.includes('research') || key.includes('opinion') || key.includes('article') || key.includes('commentary') || key.includes('guide') || key.includes('report')) {
    return { from: '#4a3420', via: '#6b4a2e', to: '#332416', accent: '#f5d09a', pattern: 'linear-gradient(180deg, rgba(255,255,255,0.1), transparent 40%)' };
  }
  if (key.includes('compliance') || key.includes('governance') || key.includes('corporate') || key.includes('policy')) {
    return { from: '#1f3d4a', via: '#2d5a6b', to: '#152b35', accent: '#8fd4e8', pattern: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 50%)' };
  }
  if (key.includes('evidence') || key.includes('training') || key.includes('knowledge')) {
    return { from: '#4a2a1a', via: '#6e3d28', to: '#301c12', accent: '#f0b27a', pattern: 'linear-gradient(45deg, rgba(255,255,255,0.08), transparent 55%)' };
  }
  return { from: '#64499D', via: '#7a5fb8', to: '#4a3575', accent: '#d4c4ff', pattern: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), transparent 50%)' };
}

function CoverGlyph({ scope }: { scope?: string }) {
  if (scope === 'INTERNATIONAL') return <Globe className="h-5 w-5 opacity-80" aria-hidden />;
  if (scope === 'LOCAL') return <Landmark className="h-5 w-5 opacity-80" aria-hidden />;
  return <FileText className="h-5 w-5 opacity-80" aria-hidden />;
}

function StyledFallbackCover({
  doc,
  typeLabel,
  categoryLabel,
  className,
}: {
  doc: API.Document;
  typeLabel?: string;
  categoryLabel?: string;
  className?: string;
}) {
  const theme = coverTheme(doc.category, doc.resource_type);
  return (
    <div
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{
        background: `linear-gradient(160deg, ${theme.from}, ${theme.via} 48%, ${theme.to})`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{ backgroundImage: theme.pattern }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 start-0 w-2.5 bg-gradient-to-r from-black/35 via-black/10 to-transparent"
        aria-hidden
      />
      <div className="relative flex h-full flex-col px-3.5 pb-3.5 pt-3.5 sm:px-4 sm:pb-4 sm:pt-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className="inline-flex max-w-[75%] truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-950"
            style={{ backgroundColor: theme.accent }}
          >
            {typeLabel || categoryLabel || 'DOC'}
          </span>
          <span className="text-white/80">
            <CoverGlyph scope={doc.scope} />
          </span>
        </div>
        <div className="mt-auto min-w-0">
          <div
            className="mb-2.5 h-px w-10 rounded-full opacity-80"
            style={{ backgroundColor: theme.accent }}
            aria-hidden
          />
          <h3 className="line-clamp-4 text-[13px] font-bold leading-snug text-white sm:text-sm">
            {doc.title}
          </h3>
          {doc.reference_number ? (
            <p className="mt-1.5 truncate text-[10px] font-medium uppercase tracking-wide text-white/65">
              {doc.reference_number}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  document: API.Document;
  typeLabel?: string;
  categoryLabel?: string;
  className?: string;
  /** Compact list thumbnail */
  compact?: boolean;
};

/**
 * Real document cover: PDF page 1 or image file.
 * Falls back to a styled jacket when there is no previewable file.
 */
export default function DocumentCover({
  document: doc,
  typeLabel,
  categoryLabel,
  className,
  compact = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'loading' | 'pdf' | 'image' | 'fallback'>('loading');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fileUrl = resolveMediaUrl(doc.file);
  const ext = fileExtension(doc.file || doc.title || '');
  const isPdf = ext === 'pdf' && Boolean(fileUrl);
  const isImage = IMAGE_EXTS.has(ext) && Boolean(fileUrl);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: '180px' }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (!fileUrl) {
      setMode('fallback');
      return;
    }
    if (isImage) {
      let objectUrl: string | null = null;
      let cancelled = false;
      setMode('loading');
      fetchAuthenticatedBlob(fileUrl)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          setMode('image');
        })
        .catch(() => {
          if (!cancelled) setMode('fallback');
        });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    if (!isPdf) {
      setMode('fallback');
      return;
    }

    let cancelled = false;
    let proxy: pdfjsLib.PDFDocumentProxy | null = null;
    setMode('loading');

    (async () => {
      const data = await getPdfData(fileUrl);
      if (cancelled) return;
      proxy = await pdfjsLib.getDocument({
        data,
        verbosity: 0,
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true,
      }).promise;
      if (cancelled) {
        try {
          await proxy.destroy();
        } catch {
          /* ignore */
        }
        return;
      }
      const page = await proxy.getPage(1);
      if (cancelled) {
        page.cleanup();
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        page.cleanup();
        return;
      }
      const base = page.getViewport({ scale: 1 });
      const maxW = compact ? 96 : 280;
      const maxH = compact ? 128 : 420;
      const fitScale = Math.min(maxW / base.width, maxH / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: fitScale * dpr });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        page.cleanup();
        setMode('fallback');
        return;
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      page.cleanup();
      setMode('pdf');
    })().catch(() => {
      if (!cancelled) setMode('fallback');
    });

    return () => {
      cancelled = true;
      if (proxy) {
        proxy.destroy().catch(() => undefined);
      }
    };
  }, [visible, fileUrl, isPdf, isImage, compact]);

  return (
    <div ref={wrapRef} className={cn('relative h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900', className)}>
      {mode === 'loading' ? (
        <div className="absolute inset-0 animate-pulse bg-slate-200/90 dark:bg-slate-800" />
      ) : null}

      {mode === 'image' && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : null}

      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full object-cover object-top bg-white',
          mode === 'pdf' ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={mode !== 'pdf'}
      />

      {(mode === 'fallback' || (!fileUrl && mode !== 'loading')) ? (
        <StyledFallbackCover
          doc={doc}
          typeLabel={typeLabel}
          categoryLabel={categoryLabel}
        />
      ) : null}

      {/* subtle book edge */}
      <div
        className="pointer-events-none absolute inset-y-0 start-0 w-2 bg-gradient-to-r from-black/25 via-black/5 to-transparent"
        aria-hidden
      />
    </div>
  );
}
