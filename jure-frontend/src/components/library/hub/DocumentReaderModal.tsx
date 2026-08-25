import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { API_ORIGIN } from '@/config/api';
import useUserStore from '@/stores/userStore';
import { formatDate, useAppTranslation } from '@/i18n';
import type { AppMessages } from '@/i18n/messages/types';
import { renderAsync } from 'docx-preview';
import FilePreviewer from '@/components/library/FilePreviewer';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface DocumentReaderModalRef {
  show: (doc: API.Document) => void;
  hide: () => void;
}

type Props = {
  onDetails?: (doc: API.Document) => void;
};

const ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200, 250, 300] as const;
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

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

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(el.isContentEditable);
}

function nearestZoomIndex(zoom: number): number {
  return ZOOM_STEPS.reduce(
    (best, z, i) => (Math.abs(z - zoom) < Math.abs(ZOOM_STEPS[best] - zoom) ? i : best),
    0
  );
}

async function fetchAuthenticatedBlob(url: string): Promise<Blob> {
  const token = useUserStore.getState().accessToken;
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { credentials: 'include', headers });
  if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
  return res.blob();
}

type PdfDoc = pdfjsLib.PDFDocumentProxy;

function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center p-6', className)} aria-hidden>
      <div className="flex h-full min-h-[420px] w-full max-w-[640px] flex-col gap-3 rounded-sm border border-slate-200 bg-white p-8">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  className,
  fit = 'page',
  zoom = 1,
  maxWidth,
  maxHeight,
}: {
  pdf: PdfDoc;
  pageNumber: number;
  className?: string;
  fit?: 'page' | 'thumb';
  zoom?: number;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(fit === 'page');

  useEffect(() => {
    if (fit !== 'thumb') return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: '160px', root: wrap.closest('nav, [data-thumb-scroller]') as Element | null }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [fit]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const maxW = fit === 'thumb' ? 72 : Math.max(maxWidth || 720, 80);
      const maxH = fit === 'thumb' ? 96 : Math.max(maxHeight || 900, 80);
      const fitScale = Math.min(maxW / base.width, maxH / base.height);
      const scale = fit === 'thumb' ? fitScale : fitScale * zoom;
      const dpr = fit === 'thumb' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * dpr });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
    })().catch(() => {
      /* aborted or failed */
    });

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [pdf, pageNumber, fit, visible, zoom, maxWidth, maxHeight]);

  return (
    <div ref={wrapRef} className={cn('flex items-center justify-center', className)}>
      {fit === 'thumb' && !visible ? (
        <div className="h-full w-full animate-pulse bg-slate-100" />
      ) : (
        <canvas ref={canvasRef} className="max-w-none bg-white" />
      )}
    </div>
  );
}

function WordDocumentView({
  url,
  zoom,
  onError,
}: {
  url: string;
  zoom: number;
  onError: () => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || !url) return;
    let cancelled = false;
    setLoading(true);
    page.innerHTML = '';
    fetchAuthenticatedBlob(url)
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => {
        if (cancelled || !pageRef.current) return;
        return renderAsync(buffer, pageRef.current, undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreHeight: true,
          ignoreWidth: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        });
      })
      .then(() => {
        if (cancelled || !pageRef.current) return;
        pageRef.current.querySelectorAll('section').forEach((section) => {
          const el = section as HTMLElement;
          el.style.width = '100%';
          el.style.maxWidth = '100%';
          el.style.minHeight = 'auto';
          el.style.padding = '1.75rem 1.5rem';
          el.style.boxSizing = 'border-box';
        });
        const wrapper = pageRef.current.querySelector('.docx-wrapper') as HTMLElement | null;
        if (wrapper) {
          wrapper.style.width = '100%';
          wrapper.style.maxWidth = '100%';
          wrapper.style.background = 'transparent';
          wrapper.style.padding = '0';
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          onError();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, onError]);

  return (
    <div className="relative h-full w-full overflow-auto bg-slate-100">
      {loading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
          <PageSkeleton />
          <p className="flex items-center text-[13px] text-slate-500">
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          </p>
        </div>
      ) : null}
      <div
        className="origin-top-left"
        style={{
          width: `${100 / zoom}%`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          ref={pageRef}
          className={cn(
            'min-h-full w-full',
            '[&_.docx-wrapper]:!m-0 [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-3 sm:[&_.docx-wrapper]:!p-5',
            '[&_.docx-wrapper]:flex [&_.docx-wrapper]:flex-col [&_.docx-wrapper]:items-center [&_.docx-wrapper]:gap-4',
            '[&_.docx-wrapper>section]:!mx-auto [&_.docx-wrapper>section]:!mb-0 [&_.docx-wrapper>section]:w-full',
            '[&_.docx-wrapper>section]:max-w-full [&_.docx-wrapper>section]:bg-white',
            '[&_.docx-wrapper>section]:!shadow-[0_8px_28px_rgba(15,23,42,0.08)]'
          )}
        />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-[12.5px] leading-snug text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function DetailsCard({
  doc,
  hub,
  enumLabel,
  languageLabel,
  addedLabel,
  lang,
  onClose,
  className,
}: {
  doc: API.Document;
  hub: AppMessages['library']['hub'];
  enumLabel: (group: 'libraryResourceType', value: string | null | undefined) => string;
  languageLabel: string | null;
  addedLabel: string;
  lang: Parameters<typeof formatDate>[1];
  onClose: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex h-[min(78vh,820px)] w-[220px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white',
        'shadow-[0_24px_80px_rgba(15,23,42,0.32)] lg:w-[240px]',
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <h2 className="text-[13px] font-semibold text-slate-900">{hub.readerDetails}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500"
          onClick={onClose}
          aria-label={hub.readerCloseDetails}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <dl className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <MetaRow label={hub.fieldTitle} value={doc.title} />
        <MetaRow label={hub.fieldDescription} value={doc.description} />
        <MetaRow
          label={hub.fieldType}
          value={enumLabel('libraryResourceType', doc.resource_type || 'other')}
        />
        <MetaRow label={hub.fieldJurisdiction} value={doc.jurisdiction_name || doc.jurisdiction_code} />
        <MetaRow label={hub.fieldCountry} value={doc.country} />
        <MetaRow label={hub.fieldLanguage} value={languageLabel} />
        <MetaRow label={hub.fieldSource} value={doc.source || doc.source_library} />
        <MetaRow label={hub.fieldAuthor} value={doc.author} />
        <MetaRow
          label={hub.fieldPublication}
          value={doc.publication_date ? formatDate(doc.publication_date, lang) : null}
        />
        <MetaRow label={hub.readerAddedDate} value={addedLabel} />
        <MetaRow label={hub.readerAddedBy} value={doc.created_by_name} />
        {doc.tags?.length ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {hub.fieldTags}
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function ThumbnailList({
  pdf,
  pages,
  page,
  onGo,
  orientation,
  label,
  pageOf,
}: {
  pdf: PdfDoc;
  pages: number[];
  page: number;
  onGo: (n: number) => void;
  orientation: 'vertical' | 'horizontal';
  label: string;
  pageOf: (n: number) => string;
}) {
  const thumbRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    thumbRefs.current[page]?.scrollIntoView({
      block: orientation === 'vertical' ? 'nearest' : 'nearest',
      inline: orientation === 'horizontal' ? 'nearest' : 'nearest',
      behavior: 'smooth',
    });
  }, [page, orientation]);

  return (
    <nav
      aria-label={label}
      data-thumb-scroller=""
      className={cn(
        'overscroll-contain',
        orientation === 'vertical'
          ? 'h-full max-h-full w-[84px] shrink-0 overflow-y-auto pe-1'
          : 'flex h-full gap-2 overflow-x-auto'
      )}
    >
      <ul
        className={cn(
          orientation === 'vertical' ? 'flex flex-col gap-2 py-1' : 'flex h-full items-stretch gap-2'
        )}
      >
        {pages.map((n) => (
          <li key={n} className={orientation === 'horizontal' ? 'h-full w-[64px] shrink-0' : undefined}>
            <button
              type="button"
              ref={(el) => {
                thumbRefs.current[n] = el;
              }}
              onClick={() => onGo(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={pageOf(n)}
              className={cn(
                'block h-full w-full overflow-hidden rounded-md bg-white shadow-sm transition-all',
                n === page
                  ? 'bg-[#64499D]/10 ring-2 ring-[#64499D] shadow-[0_0_0_3px_rgba(100,73,157,0.18)]'
                  : 'ring-1 ring-slate-200 hover:ring-[#64499D]/40 dark:ring-slate-700'
              )}
            >
              <PdfPageCanvas
                pdf={pdf}
                pageNumber={n}
                fit="thumb"
                className={orientation === 'vertical' ? 'h-[96px] w-full' : 'h-full w-full'}
              />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const DocumentReaderModal = forwardRef<DocumentReaderModalRef, Props>((_props, ref) => {
  const { t, tf, enumLabel, lang } = useAppTranslation();
  const hub = t.library.hub;
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<API.Document | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'failed' | 'unsupported' | null>(null);
  const [zoom, setZoom] = useState(100);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobileThumbs, setMobileThumbs] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 720, h: 820 });

  const hide = useCallback(() => {
    setOpen(false);
    setDoc(null);
    setPage(1);
    setPageCount(0);
    setError(null);
    setZoom(100);
    setDetailsOpen(false);
    setMobileThumbs(false);
  }, []);

  useImperativeHandle(ref, () => ({
    show: (next) => {
      setDoc(next);
      setOpen(true);
      setPage(1);
      setZoom(100);
      setDetailsOpen(false);
      setMobileThumbs(false);
      setError(null);
    },
    hide,
  }));

  const fileUrl = resolveMediaUrl(doc?.file);
  const ext = fileExtension(doc?.file || doc?.title || '');
  const isPdf = ext === 'pdf' && Boolean(fileUrl);
  const isDocx = ext === 'docx' && Boolean(fileUrl);
  const canFallbackPreview = IMAGE_EXTS.includes(ext);
  const handleWordError = useCallback(() => setError('failed'), []);

  useEffect(() => {
    if (!open || !doc) return;
    if (!fileUrl && !doc.external_url) {
      setPdf(null);
      setLoading(false);
      setPageCount(0);
      setError('unsupported');
      return;
    }
    if (!isPdf) {
      setPdf(null);
      setLoading(false);
      setPageCount(0);
      setError(isDocx || canFallbackPreview || doc.external_url ? null : 'unsupported');
      return;
    }
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    setLoading(true);
    setError(null);
    fetchAuthenticatedBlob(fileUrl)
      .then((blob) => blob.arrayBuffer())
      .then((data) => pdfjsLib.getDocument({ data }).promise)
      .then((proxy) => {
        if (cancelled) {
          proxy.destroy().catch(() => undefined);
          return;
        }
        loaded = proxy;
        setPdf(proxy);
        setPageCount(proxy.numPages);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError('failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      loaded?.destroy().catch(() => undefined);
    };
  }, [open, isPdf, isDocx, fileUrl, doc, canFallbackPreview]);

  useEffect(() => {
    if (!open) return;
    const el = paperRef.current;
    if (!el) return;
    const measure = () => {
      setViewport({
        w: Math.max(120, el.clientWidth - 40),
        h: Math.max(160, el.clientHeight - 40),
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [open, loading, pdf, error, detailsOpen]);

  const go = useCallback(
    (next: number) => setPage((current) => Math.min(Math.max(1, next), pageCount || current)),
    [pageCount]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Escape') {
        if (detailsOpen) {
          e.preventDefault();
          setDetailsOpen(false);
        }
        return;
      }
      if (!pageCount) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPage((p) => Math.min(p + 1, pageCount));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pageCount, detailsOpen]);

  const handleDownload = () => {
    if (!doc) return;
    const href = doc.file || doc.external_url;
    if (!href) return;
    const a = window.document.createElement('a');
    a.href = href;
    a.download = doc.title || 'document';
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const stepZoom = (dir: 1 | -1) => {
    const idx = nearestZoomIndex(zoom);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir))]);
  };

  const thumbs = pdf && pageCount > 1 ? Array.from({ length: pageCount }, (_, i) => i + 1) : [];
  const fileLabel = ext ? ext.toUpperCase() : '';
  const addedLabel = doc?.created ? formatDate(doc.created_at || doc.created, lang) : '';
  const languageLabel = doc?.language
    ? t.common.languageNames[doc.language as keyof typeof t.common.languageNames] || doc.language
    : null;
  const pageOf = (n: number) => tf(hub.readerPageOf, { current: n, total: pageCount });

  const thumbnailRail =
    pdf && thumbs.length > 0 ? (
      <ThumbnailList
        pdf={pdf}
        pages={thumbs}
        page={page}
        onGo={go}
        orientation="vertical"
        label={hub.readerThumbnails}
        pageOf={pageOf}
      />
    ) : loading && isPdf ? (
      <div className="hidden w-[84px] shrink-0 flex-col gap-2 md:flex" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-white/35" />
        ))}
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && hide()}>
      <DialogPortal>
        <DialogOverlay className="bg-slate-950/55 backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (detailsOpen) {
              e.preventDefault();
              setDetailsOpen(false);
            }
          }}
        >
          <DialogTitle className="sr-only">{doc?.title || hub.preview}</DialogTitle>

          <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/30 px-2 py-2 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-white/90 hover:bg-white/10 hover:text-white"
                onClick={hide}
                aria-label={hub.readerBack}
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
              </Button>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-white">{doc?.title}</p>
                <p className="truncate text-[11px] text-white/65">
                  {[fileLabel, pageCount ? pageOf(page) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {doc ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 text-white/90 hover:bg-white/10 hover:text-white',
                    detailsOpen && 'bg-white/15 text-white'
                  )}
                  aria-pressed={detailsOpen}
                  onClick={() => setDetailsOpen((open) => !open)}
                >
                  {hub.readerDetails}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-white/90 hover:bg-white/10 hover:text-white"
                onClick={handleDownload}
              >
                <Download className="me-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{hub.download}</span>
              </Button>
              {thumbs.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/90 hover:bg-white/10 md:hidden"
                  aria-label={hub.readerThumbnails}
                  aria-pressed={mobileThumbs}
                  onClick={() => setMobileThumbs((v) => !v)}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/90 hover:bg-white/10 hover:text-white"
                onClick={hide}
                aria-label={hub.readerClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1">
            <div
              dir="ltr"
              className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center gap-1 overflow-hidden px-1 py-2 sm:gap-3 sm:px-5 sm:py-5 md:items-center"
            >
              {isPdf && pageCount > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-11 w-11 shrink-0 rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white disabled:opacity-35 md:flex"
                  onClick={() => go(page - 1)}
                  disabled={page <= 1}
                  aria-label={hub.readerPrev}
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
              ) : (
                <div className="hidden w-11 shrink-0 md:block" />
              )}

              <div
                className={cn(
                  'relative flex min-h-0 min-w-0 items-center justify-center transition-[max-width,width] duration-300',
                  'h-full w-full max-w-full',
                  detailsOpen
                    ? 'md:h-[min(78vh,820px)] md:w-[680px] md:max-w-[calc(100%-22rem)]'
                    : 'md:h-[min(78vh,820px)] md:w-[860px] md:max-w-[calc(100%-8rem)]'
                )}
              >
                <div
                  ref={paperRef}
                  className={cn(
                    'relative flex h-full w-full items-center justify-center overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]',
                    zoom > 100 && 'items-start justify-start'
                  )}
                >
                  {loading ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                      <PageSkeleton />
                      <p className="absolute bottom-6 flex items-center text-[13px] text-slate-500">
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {hub.readerOpening}
                      </p>
                    </div>
                  ) : error ? (
                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center">
                      <p className="text-sm text-slate-600">
                        {error === 'unsupported' ? hub.readerUnsupported : hub.readerFailed}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          className="bg-[#64499D] text-white hover:bg-[#543d86]"
                          onClick={handleDownload}
                        >
                          {hub.readerDownloadDocument}
                        </Button>
                        <Button type="button" variant="outline" onClick={hide}>
                          {hub.readerClose}
                        </Button>
                      </div>
                    </div>
                  ) : pdf ? (
                    <PdfPageCanvas
                      pdf={pdf}
                      pageNumber={page}
                      zoom={zoom / 100}
                      maxWidth={viewport.w}
                      maxHeight={viewport.h}
                      className="min-h-full w-full p-2 sm:p-4 md:p-5"
                    />
                  ) : isDocx && fileUrl ? (
                    <WordDocumentView url={fileUrl} zoom={zoom / 100} onError={handleWordError} />
                  ) : doc?.file && canFallbackPreview ? (
                    <div className="h-full w-full overflow-auto p-4">
                      <FilePreviewer
                        fileUrl={doc.file}
                        fileName={doc.file || doc.title}
                        title={doc.title}
                      />
                    </div>
                  ) : doc?.external_url ? (
                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
                      <p className="text-sm text-slate-500">{hub.readerUnsupported}</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          className="bg-[#64499D] text-white hover:bg-[#543d86]"
                          onClick={handleDownload}
                        >
                          {hub.readerDownloadDocument}
                        </Button>
                        <Button type="button" variant="outline" onClick={hide}>
                          {hub.readerClose}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {isPdf && pageCount > 0 ? (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[12.5px] font-medium text-slate-700 shadow-lg ring-1 ring-slate-200/80">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 md:hidden"
                        onClick={() => go(page - 1)}
                        disabled={page <= 1}
                        aria-label={hub.readerPrev}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                      </button>
                      <span className="min-w-[4.75rem] px-1 text-center tabular-nums">{pageOf(page)}</span>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 md:hidden"
                        onClick={() => go(page + 1)}
                        disabled={page >= pageCount}
                        aria-label={hub.readerNext}
                      >
                        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {(isPdf && pdf && !error) || (isDocx && !error) ? (
                  <div className="absolute bottom-3 start-3 z-10 flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-1 shadow-lg ring-1 ring-slate-200/80">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => stepZoom(-1)}
                      disabled={zoom <= ZOOM_STEPS[0]}
                      aria-label={hub.readerZoomOut}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="min-w-[2.75rem] text-center text-[11px] tabular-nums text-slate-600">
                      {zoom}%
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => stepZoom(1)}
                      disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                      aria-label={hub.readerZoomIn}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setZoom(100)}
                    >
                      <Maximize2 className="me-1 h-3 w-3" />
                      {hub.readerFit}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setZoom(100)}
                      aria-label={hub.readerReset}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {isPdf && pageCount > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-11 w-11 shrink-0 rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white disabled:opacity-35 md:flex"
                  onClick={() => go(page + 1)}
                  disabled={page >= pageCount}
                  aria-label={hub.readerNext}
                >
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </Button>
              ) : (
                <div className="hidden w-11 shrink-0 md:block" />
              )}

              {detailsOpen && doc ? (
                <>
                  <div className="hidden md:block">
                    <DetailsCard
                      doc={doc}
                      hub={hub}
                      enumLabel={enumLabel}
                      languageLabel={languageLabel}
                      addedLabel={addedLabel}
                      lang={lang}
                      onClose={() => setDetailsOpen(false)}
                    />
                  </div>
                  <div className="absolute inset-x-2 bottom-16 z-20 md:hidden">
                    <DetailsCard
                      doc={doc}
                      hub={hub}
                      enumLabel={enumLabel}
                      languageLabel={languageLabel}
                      addedLabel={addedLabel}
                      lang={lang}
                      onClose={() => setDetailsOpen(false)}
                      className="h-auto max-h-[45vh] w-full"
                    />
                  </div>
                </>
              ) : null}

              <div className="hidden h-[min(78vh,820px)] shrink-0 md:block">{thumbnailRail}</div>
            </div>
          </div>

          {mobileThumbs && pdf && thumbs.length > 0 ? (
            <div className="h-36 shrink-0 border-t border-white/10 bg-slate-950/40 p-2 md:hidden">
              <ThumbnailList
                pdf={pdf}
                pages={thumbs}
                page={page}
                onGo={(n) => {
                  go(n);
                  setMobileThumbs(false);
                }}
                orientation="horizontal"
                label={hub.readerThumbnails}
                pageOf={pageOf}
              />
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
});

DocumentReaderModal.displayName = 'DocumentReaderModal';
export default DocumentReaderModal;
