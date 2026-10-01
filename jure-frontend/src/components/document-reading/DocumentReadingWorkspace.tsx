import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { BookOpen, Share2, Sparkles, StickyNote, X } from 'lucide-react';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { restorePointerEvents } from '@/lib/unlockUi';
import { useAppTranslation } from '@/i18n';
import { documentReadingEn } from '@/i18n/messages/documentReading';
import FilePreviewer from '@/components/library/FilePreviewer';
import {
  downloadLibraryDocument,
  libraryFileExtension,
  openLibraryDocumentInNewTab,
  resolveLibraryMediaUrl,
} from '@/lib/libraryMedia';
import { apiCreateResearchNote } from '@/services/research-notes/api';
import { apiGetCases } from '@/services/case/api';
import { apiGetCabinetMembers } from '@/services/cabinet-member/api';
import { apiCreateConversation, apiSendMessage } from '@/services/conversations/api';
import { getUserIdFromCabinetMember } from '@/utils/cabinetMemberHelpers';
import ReadingNav from './ReadingNav';
import { ReadingToolbar, SelectionToolbar } from './ReadingChrome';
import ReadingErrorBoundary from './ReadingErrorBoundary';
import NotesPanel from './panels/NotesPanel';
import JuriaPanel from './panels/JuriaPanel';
import SharePanel, { type ColleagueOption } from './panels/SharePanel';
import type {
  DocumentReadingWorkspaceRef,
  ReadingContext,
  ReadingDocument,
  ReadingHighlight,
  ReadingNoteDraft,
  WorkspaceTab,
} from './types';

function toReadingDoc(doc: ReadingDocument | API.Document | null | undefined): ReadingDocument | null {
  if (!doc || typeof doc !== 'object') return null;
  const anyDoc = doc as ReadingDocument & API.Document;
  const title = String(anyDoc.title || anyDoc.file || 'Document').trim() || 'Document';
  return {
    id: anyDoc.id,
    title,
    file: anyDoc.file ?? null,
    external_url: anyDoc.external_url ?? null,
    resource_type: anyDoc.resource_type ?? null,
    category: 'category' in anyDoc ? anyDoc.category : null,
    author: anyDoc.author ?? null,
    source: anyDoc.source ?? null,
    language: anyDoc.language ?? null,
    jurisdiction_name: anyDoc.jurisdiction_name ?? null,
    reference_number: anyDoc.reference_number ?? null,
    created: anyDoc.created ?? null,
    created_at: anyDoc.created_at ?? null,
    created_by_name: anyDoc.created_by_name ?? null,
    description: anyDoc.description ?? null,
    size: 'size' in anyDoc ? anyDoc.size : null,
    scope: anyDoc.scope ?? null,
  };
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const DocumentReadingWorkspace = forwardRef<DocumentReadingWorkspaceRef, { onHide?: () => void }>(
  function DocumentReadingWorkspace({ onHide }, ref) {
    const { t, enumLabel } = useAppTranslation();
    const rm = t.documentReading ?? documentReadingEn;

    const [open, setOpen] = useState(false);
    const [doc, setDoc] = useState<ReadingDocument | null>(null);
    const [context, setContext] = useState<ReadingContext | undefined>();
    const [tab, setTab] = useState<WorkspaceTab>('notes');
    const [page, setPage] = useState(1);
    const [pageCount] = useState(0);
    const [zoom, setZoom] = useState(100);
    const [navSearch, setNavSearch] = useState('');
    const [bookmarks, setBookmarks] = useState<number[]>([]);
    const [highlights, setHighlights] = useState<ReadingHighlight[]>([]);
    const [notes, setNotes] = useState<ReadingNoteDraft[]>([]);
    const [selectionText, setSelectionText] = useState('');
    const [shareSeed, setShareSeed] = useState('');
    const [cases, setCases] = useState<Array<{ id: number; reference?: string; title?: string }>>([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [colleagues, setColleagues] = useState<ColleagueOption[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [mobilePanel, setMobilePanel] = useState(false);

    const hide = useCallback(() => {
      setOpen(false);
      setDoc(null);
      setContext(undefined);
      setPage(1);
      setZoom(100);
      setSelectionText('');
      setShareSeed('');
      setMobilePanel(false);
      setHighlights([]);
      setBookmarks([]);
      setNotes([]);
      restorePointerEvents();
      onHide?.();
    }, [onHide]);

    useImperativeHandle(ref, () => ({
      show: (next, ctx) => {
        const parsed = toReadingDoc(next);
        if (!parsed) return;
        setDoc(parsed);
        setContext(ctx);
        setOpen(true);
        setTab('notes');
        setPage(1);
        setZoom(100);
        setSelectionText('');
        setShareSeed('');
        setMobilePanel(false);
        setHighlights([]);
        setBookmarks([]);
        setNotes([]);
      },
      hide,
    }));

    useEffect(() => {
      if (!open) return;
      setCasesLoading(true);
      apiGetCases({ page: 1, page_size: 40 })
        .then((res) => {
          const raw = res.data as { results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
          const list = Array.isArray(raw) ? raw : raw.results || [];
          setCases(
            list.map((c) => ({
              id: Number(c.id),
              reference: String(c.reference || c.case_reference || c.ref || ''),
              title: String(c.title || c.name || ''),
            }))
          );
        })
        .catch(() => setCases([]))
        .finally(() => setCasesLoading(false));

      setMembersLoading(true);
      apiGetCabinetMembers({ expand: 'user' })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : (res.data as { results?: unknown[] })?.results || [];
          const mapped: ColleagueOption[] = [];
          for (const row of list as API.CabinetMember[]) {
            const id = getUserIdFromCabinetMember(row) ?? row.id;
            if (!Number.isFinite(id)) continue;
            const user = (row as unknown as { user?: API.User }).user;
            const name =
              [row.first_name || user?.first_name, row.last_name || user?.last_name]
                .filter(Boolean)
                .join(' ')
                .trim() ||
              String(row.email || user?.email || `#${id}`);
            mapped.push({
              id,
              name,
              email: row.email || user?.email || undefined,
              role: row.role ? String(row.role) : undefined,
            });
          }
          setColleagues(mapped);
        })
        .catch(() => setColleagues([]))
        .finally(() => setMembersLoading(false));
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onSelect = () => {
        const text = window.getSelection()?.toString().trim() || '';
        if (text.length > 1) setSelectionText(text);
      };
      document.addEventListener('mouseup', onSelect);
      document.addEventListener('keyup', onSelect);
      return () => {
        document.removeEventListener('mouseup', onSelect);
        document.removeEventListener('keyup', onSelect);
      };
    }, [open]);

    const ext = libraryFileExtension(doc?.file || doc?.title || '');
    const fileLabel = ext ? ext.toUpperCase() : rm.file;
    let typeLabel = '';
    try {
      typeLabel = doc?.resource_type
        ? enumLabel('libraryResourceType', doc.resource_type)
        : doc?.category
          ? enumLabel('documentCategory', doc.category)
          : '';
    } catch {
      typeLabel = '';
    }
    const metaLine = [typeLabel, doc?.author || doc?.source].filter(Boolean).join(' · ');
    const labels = rm;

    const addHighlight = useCallback(() => {
      const text = selectionText || labels.sampleHighlight;
      setHighlights((prev) => [
        {
          id: uid('hl'),
          page,
          text,
          color: 'lavender',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }, [labels.sampleHighlight, page, selectionText]);

    const createNote = useCallback(
      (draft: Omit<ReadingNoteDraft, 'id' | 'createdAt' | 'savedRemoteId'>) => {
        setNotes((prev) => [
          {
            ...draft,
            id: uid('note'),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      },
      []
    );

    const saveNoteRemote = useCallback(
      async (id: string) => {
        const note = notes.find((n) => n.id === id);
        if (!note) return;
        const citation = [
          doc?.title,
          note.page != null ? `p. ${note.page}` : null,
          note.highlightText ? `“${note.highlightText.slice(0, 120)}”` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const res = await apiCreateResearchNote({
          title: note.title,
          content: note.content,
          citation,
          matter: context?.caseId ?? null,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, savedRemoteId: res.data.id } : n))
        );
      },
      [context?.caseId, doc?.title, notes]
    );

    const addNoteToCase = useCallback(
      async (noteId: string, caseId: number) => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        const citation = [
          doc?.title,
          note.page != null ? `p. ${note.page}` : null,
          note.highlightText ? `“${note.highlightText.slice(0, 120)}”` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        await apiCreateResearchNote({
          title: note.title,
          content: note.content,
          citation,
          matter: caseId,
        });
      },
      [doc?.title, notes]
    );

    const sendToColleague = useCallback(
      async (payload: {
        memberId: number;
        message: string;
        includeDocument: boolean;
        includeHighlight: boolean;
      }) => {
        const created = await apiCreateConversation({
          participants: [payload.memberId],
          type: 'direct',
        });
        const conversationId = created.data.id;
        const parts = [payload.message];
        if (payload.includeDocument && doc) {
          parts.push(`\n📄 ${doc.title}`);
          parts.push(`📍 ${labels.pageShort.replace('{page}', String(page))}`);
        }
        if (payload.includeHighlight && selectionText) {
          parts.push(`\n📝 “${selectionText}”`);
        }
        const form: API.CreateMessageForm = {
          conversation: conversationId,
          body: parts.join('\n'),
        };
        if (payload.includeDocument && doc?.file && !doc.file.startsWith('blob:')) {
          try {
            const href = resolveLibraryMediaUrl(doc.file);
            const token = (await import('@/stores/userStore')).default.getState().accessToken;
            const headers: HeadersInit = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(href, { credentials: 'include', headers });
            if (res.ok) {
              const blob = await res.blob();
              const name = (doc.file.split('/').pop() || `${doc.title}.pdf`).split('?')[0];
              form.attachments = [new File([blob], name, { type: blob.type || 'application/pdf' })];
            }
          } catch {
            /* send text-only if attach fails */
          }
        }
        await apiSendMessage(form);
      },
      [doc, labels.pageShort, page, selectionText]
    );

    const openShareWith = useCallback((message?: string) => {
      if (message) setShareSeed(message);
      setTab('share');
      setMobilePanel(true);
    }, []);

    const copyText = useCallback(async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }, []);

    const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof StickyNote }> = [
      { id: 'notes', label: labels.tabNotes, icon: StickyNote },
      { id: 'juria', label: labels.tabJuria, icon: Sparkles },
      { id: 'share', label: labels.tabShare, icon: Share2 },
    ];

    const previewSrc = doc?.file || doc?.external_url || '';

    return (
      <Dialog modal={false} open={open && Boolean(doc)} onOpenChange={(v) => !v && hide()}>
        <DialogPortal>
          <DialogOverlay className="bg-slate-900/45 backdrop-blur-sm" />
          {doc ? (
            <DialogPrimitive.Content
              className="fixed inset-0 z-50 flex outline-none"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => {
                e.preventDefault();
                hide();
              }}
            >
              <DialogTitle className="sr-only">{doc.title}</DialogTitle>
              <ReadingErrorBoundary onClose={hide} title={labels.readingMode}>
                <div className="flex h-full w-full overflow-hidden bg-[#f5f4f8] dark:bg-slate-950">
                  <div className="hidden h-full lg:flex">
                    <ReadingNav
                      doc={doc}
                      page={page}
                      pageCount={pageCount}
                      onBack={hide}
                      onGoPage={setPage}
                      highlights={highlights}
                      bookmarks={bookmarks}
                      onToggleBookmark={(p) =>
                        setBookmarks((prev) =>
                          prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                        )
                      }
                      search={navSearch}
                      onSearchChange={setNavSearch}
                      fileLabel={fileLabel}
                      metaLine={metaLine}
                      labels={{
                        back: labels.back,
                        search: labels.searchInDoc,
                        pages: labels.pages,
                        bookmarks: labels.bookmarks,
                        highlights: labels.highlights,
                        info: labels.documentInfo,
                        pageOf: labels.pageOf,
                        documentInfo: labels.documentInfo,
                        noBookmarks: labels.noBookmarks,
                      }}
                    />
                  </div>

                  <section className="relative flex min-w-0 flex-1 flex-col">
                    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
                      <Button type="button" variant="ghost" size="sm" className="h-8" onClick={hide}>
                        {labels.back}
                      </Button>
                      <p className="min-w-0 truncate text-[13px] font-semibold">{doc.title}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setMobilePanel(true)}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                    </header>

                    <ReadingToolbar
                      page={page}
                      pageCount={pageCount}
                      zoom={zoom}
                      bookmarked={bookmarks.includes(page)}
                      onPrev={() => setPage((p) => Math.max(1, p - 1))}
                      onNext={() => setPage((p) => (pageCount ? Math.min(pageCount, p + 1) : p + 1))}
                      onZoomIn={() => setZoom((z) => Math.min(200, z + 10))}
                      onZoomOut={() => setZoom((z) => Math.max(60, z - 10))}
                      onFit={() => setZoom(100)}
                      onToggleBookmark={() =>
                        setBookmarks((prev) =>
                          prev.includes(page) ? prev.filter((x) => x !== page) : [...prev, page]
                        )
                      }
                      onHighlight={addHighlight}
                      onNote={() => {
                        setTab('notes');
                        setMobilePanel(true);
                      }}
                      labels={labels}
                    />

                    <SelectionToolbar
                      visible={Boolean(selectionText)}
                      onHighlight={addHighlight}
                      onNote={() => {
                        setTab('notes');
                        setMobilePanel(true);
                      }}
                      onAskJuria={() => {
                        setTab('juria');
                        setMobilePanel(true);
                      }}
                      onShare={() => openShareWith()}
                      onCopy={() => void copyText(selectionText)}
                      labels={labels}
                    />

                    <div className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
                      <div
                        className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950"
                        style={
                          zoom === 100
                            ? undefined
                            : {
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                              }
                        }
                      >
                        {previewSrc ? (
                          <FilePreviewer
                            fileUrl={previewSrc}
                            fileName={doc.file || doc.title}
                            title={doc.title}
                            className="h-full min-h-0 flex-1 border-0 [&_iframe]:!h-full [&_iframe]:min-h-[min(70dvh,560px)]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            {labels.noFile}
                          </div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute bottom-6 end-6 rounded-full bg-white/95 px-3 py-1 text-[11px] text-slate-500 shadow ring-1 ring-slate-200 dark:bg-slate-950/95 dark:ring-slate-800">
                        {labels.readingMode}
                      </div>
                    </div>

                    <div className="hidden shrink-0 items-center justify-end gap-2 border-t border-slate-200/90 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px]"
                        onClick={() => {
                          if (!doc?.file && !doc?.external_url) return;
                          void openLibraryDocumentInNewTab(doc as API.Document);
                        }}
                      >
                        {labels.openTab}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px]"
                        onClick={() => {
                          if (!doc?.file && !doc?.external_url) return;
                          void downloadLibraryDocument(doc as API.Document);
                        }}
                      >
                        {labels.download}
                      </Button>
                    </div>
                  </section>

                  <aside
                    className={cn(
                      'flex h-full w-full max-w-[22rem] shrink-0 flex-col border-s border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950',
                      'fixed inset-y-0 end-0 z-30 shadow-2xl transition-transform lg:static lg:z-auto lg:max-w-[22rem] lg:shadow-none',
                      mobilePanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/90 px-2 py-2 dark:border-slate-800 lg:justify-stretch">
                      <div className="flex min-w-0 flex-1 gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
                        {tabs.map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors',
                              tab === id
                                ? 'bg-white text-[#64499D] shadow-sm dark:bg-slate-950'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{label}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ms-1 h-8 w-8 lg:hidden"
                        onClick={() => setMobilePanel(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="min-h-0 flex-1">
                      {tab === 'notes' ? (
                        <NotesPanel
                          notes={notes}
                          page={page}
                          selectionText={selectionText}
                          cases={cases}
                          casesLoading={casesLoading}
                          onCreate={createNote}
                          onDelete={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                          onSaveRemote={saveNoteRemote}
                          onAddToCase={addNoteToCase}
                          onSend={(id) => {
                            const note = notes.find((n) => n.id === id);
                            openShareWith(note ? `${note.title}\n\n${note.content}` : undefined);
                          }}
                          onCopy={copyText}
                          labels={labels}
                        />
                      ) : null}
                      {tab === 'juria' ? (
                        <JuriaPanel
                          doc={doc}
                          page={page}
                          pageCount={pageCount}
                          selectionText={selectionText}
                          context={context}
                          onAddToNote={(text) => {
                            createNote({
                              title: labels.juriaNoteTitle,
                              content: text,
                              tags: ['juria'],
                              page,
                              highlightText: selectionText || undefined,
                            });
                            setTab('notes');
                          }}
                          onAddToCase={(text) => {
                            createNote({
                              title: labels.juriaNoteTitle,
                              content: text,
                              tags: ['juria'],
                              page,
                              highlightText: selectionText || undefined,
                            });
                            setTab('notes');
                          }}
                          onSend={(text) => openShareWith(text)}
                          onCopy={copyText}
                          labels={labels}
                        />
                      ) : null}
                      {tab === 'share' ? (
                        <SharePanel
                          doc={doc}
                          page={page}
                          selectionText={selectionText}
                          initialMessage={shareSeed}
                          colleagues={colleagues}
                          loadingMembers={membersLoading}
                          onSend={sendToColleague}
                          labels={labels}
                        />
                      ) : null}
                    </div>
                  </aside>
                </div>
              </ReadingErrorBoundary>
            </DialogPrimitive.Content>
          ) : null}
        </DialogPortal>
      </Dialog>
    );
  }
);

export default DocumentReadingWorkspace;
export type { DocumentReadingWorkspaceRef };
