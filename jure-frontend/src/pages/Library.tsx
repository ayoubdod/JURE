import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';
import { FolderTree, PanelLeftClose, PanelLeftOpen, Plus, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { apiGetDocuments, apiCopySharedDocument } from '@/services/library/api';
import DocumentCreateModal, {
  DocumentCreateModalRef,
} from '@/components/document/DocumentCreateModal';
import DocumentUpdateModal, {
  DocumentUpdateModalRef,
} from '@/components/document/DocumentUpdateModal';
import DocumentDeleteModal, {
  DocumentDeleteModalRef,
} from '@/components/document/DocumentDeleteModal';
import DocumentDetailDrawer, {
  DocumentDetailDrawerRef,
} from '@/components/library/DocumentDetailDrawer';
import {
  KnowledgeSearch,
  SmartMetricsBar,
  CollectionsSidebar,
  ViewTabs,
  KnowledgeCard,
  KnowledgeTableView,
  KnowledgeEmptyState,
  AICopilotPanel,
  MobileKnowledgeNav,
  enrichDocuments,
  computeSmartMetrics,
  semanticFilter,
  matchesCollection,
  matchesCategory,
  matchesArea,
  getFavorites,
  toggleFavorite,
  COLLECTIONS,
  type CollectionId,
  type EnrichedDocument,
  type KnowledgeViewMode,
  type MobileKnowledgeTab,
  type KnowledgeSearchHandle,
} from '@/components/library/knowledge-hub';
import {
  DOCUMENT_CATEGORY_IDS,
  LEGAL_AREA_IDS,
  type DocumentCategoryId,
  type LegalAreaId,
} from '@/lib/libraryTaxonomy';
import { cn } from '@/lib/utils';
import { importWithRetry } from '@/lib/chunkLoad';
import { useAppTranslation } from '@/i18n';
import { useShortcutAction } from '@/context/ShortcutsContext';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';
import useUserStore from '@/stores/userStore';
import '@/styles/workspace-list.css';

const KnowledgeTimelineView = lazy(() =>
  importWithRetry(() => import('@/components/library/knowledge-hub/KnowledgeTimelineView'))
);
const KnowledgeGraphView = lazy(() =>
  importWithRetry(() => import('@/components/library/knowledge-hub/KnowledgeGraphView'))
);
const KnowledgeAIView = lazy(() =>
  importWithRetry(() => import('@/components/library/knowledge-hub/KnowledgeAIView'))
);

type SortKey = 'date' | 'name' | 'size' | 'score';

const COLLECTIONS_COLLAPSED_KEY = 'jure.library.collectionsCollapsed';

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-[16rem] shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 ps-2 pe-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label={label}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function parseDocuments(data: unknown): API.Document[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results: unknown }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

const ViewFallback = () => (
  <div className="animate-pulse space-y-2 p-3" aria-hidden>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-12 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
    ))}
  </div>
);

const Library = () => {
  const { t, tf, enumLabel } = useAppTranslation();
  const jurisdictionName = useUserStore((s) => s.user?.jurisdiction?.name);
  const [searchTerm, setSearchTerm] = useState('');
  const [collection, setCollection] = useState<CollectionId>('all');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategoryId | null>(null);
  const [areaFilter, setAreaFilter] = useState<LegalAreaId | null>(null);
  const [viewMode, setViewMode] = useState<KnowledgeViewMode>('table');
  const [libraryItems, setLibraryItems] = useState<API.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDoc, setSelectedDoc] = useState<EnrichedDocument | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites());
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileKnowledgeTab>('browse');
  const [collectionsCollapsed, setCollectionsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLECTIONS_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { toast } = useToast();

  const toggleCollectionsCollapsed = useCallback(() => {
    setCollectionsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLECTIONS_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const createModalRef = useRef<DocumentCreateModalRef>(null);
  const updateModalRef = useRef<DocumentUpdateModalRef>(null);
  const deleteModalRef = useRef<DocumentDeleteModalRef>(null);
  const detailDrawerRef = useRef<DocumentDetailDrawerRef>(null);
  const searchRef = useRef<KnowledgeSearchHandle>(null);

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    apiGetDocuments({ all: true })
      .then((response) => {
        setLibraryItems(parseDocuments(response.data));
      })
      .catch((error) => {
        devError('Error fetching documents:', error);
        apiGetDocuments()
          .then((response) => {
            setLibraryItems(parseDocuments(response.data));
          })
          .catch((fallbackError) => {
            devError('Fallback fetch also failed:', fallbackError);
            setLibraryItems([]);
            const errorMessage =
              fallbackError.response?.data?.detail ||
              fallbackError.response?.data?.message ||
              fallbackError.message ||
              t.library.toasts.loadErrorFallback;
            toast({
              title: t.library.toasts.loadErrorTitle,
              description: errorMessage,
              variant: 'destructive',
            });
          });
      })
      .finally(() => setLoading(false));
  }, [toast, t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const enriched = useMemo(() => enrichDocuments(libraryItems), [libraryItems]);

  useEffect(() => {
    if (!selectedDoc) return;
    const next = enriched.find((d) => d.id === selectedDoc.id);
    if (next) setSelectedDoc(next);
    else setSelectedDoc(null);
  }, [enriched]); // eslint-disable-line react-hooks/exhaustive-deps — sync selection when corpus refreshes

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const def of COLLECTIONS) {
      counts[def.id] = enriched.filter((d) =>
        matchesCollection(d, def.id, favorites)
      ).length;
    }
    return counts;
  }, [enriched, favorites]);

  const scopedForTaxonomy = useMemo(
    () => enriched.filter((d) => matchesCollection(d, collection, favorites)),
    [enriched, collection, favorites]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of DOCUMENT_CATEGORY_IDS) {
      counts[id] = scopedForTaxonomy.filter((d) => matchesCategory(d, id)).length;
    }
    return counts;
  }, [scopedForTaxonomy]);

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of LEGAL_AREA_IDS) {
      counts[id] = scopedForTaxonomy.filter((d) => matchesArea(d, id)).length;
    }
    return counts;
  }, [scopedForTaxonomy]);

  const populatedCategoryCount = useMemo(
    () => DOCUMENT_CATEGORY_IDS.filter((id) => (categoryCounts[id] ?? 0) > 0).length,
    [categoryCounts]
  );

  const metrics = useMemo(
    () =>
      computeSmartMetrics(
        enriched.filter((d) => !d.is_shared),
        populatedCategoryCount
      ),
    [enriched, populatedCategoryCount]
  );

  const filtersActive = Boolean(searchTerm || categoryFilter || areaFilter || collection !== 'all');

  const filteredItems = useMemo(() => {
    const byCollection = enriched.filter((d) =>
      matchesCollection(d, collection, favorites)
    );
    const byTaxonomy = byCollection.filter(
      (d) => matchesCategory(d, categoryFilter) && matchesArea(d, areaFilter)
    );
    const searched = semanticFilter(byTaxonomy, searchTerm);
    return [...searched].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison =
          new Date(a.modified || 0).getTime() - new Date(b.modified || 0).getTime();
      } else if (sortBy === 'name') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'size') {
        comparison = (a.size || 0) - (b.size || 0);
      } else {
        comparison = a.insight.knowledgeScore - b.insight.knowledgeScore;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [enriched, collection, favorites, categoryFilter, areaFilter, searchTerm, sortBy, sortOrder]);

  const handleSelect = useCallback((doc: EnrichedDocument) => {
    startTransition(() => {
      setSelectedDoc(doc);
    });
  }, []);

  const handleOpen = useCallback((doc: EnrichedDocument) => {
    setSelectedDoc(doc);
    detailDrawerRef.current?.open(doc);
  }, []);

  const handleEdit = useCallback((e: React.MouseEvent, item: EnrichedDocument) => {
    e.stopPropagation();
    if (item.is_shared) return;
    updateModalRef.current?.show(item);
  }, []);

  const handleDownload = useCallback(
    (e: React.MouseEvent, item: EnrichedDocument) => {
      e.stopPropagation();
      toast({
        title: t.library.toasts.downloadStarted,
        description: tf(t.library.toasts.downloading, { title: item.title }),
      });
    },
    [toast, t, tf]
  );

  const handleDelete = useCallback((e: React.MouseEvent, item: EnrichedDocument) => {
    e.stopPropagation();
    if (item.is_shared) return;
    deleteModalRef.current?.show(item);
  }, []);

  const handleCopy = useCallback(
    async (e: React.MouseEvent, item: EnrichedDocument) => {
      e.stopPropagation();
      try {
        const res = await apiCopySharedDocument(item.id);
        toast({
          title: t.library.toasts.copiedTitle,
          description: tf(t.library.toasts.copiedDesc, { title: res.data.title || item.title }),
        });
        fetchDocuments();
      } catch (error) {
        const description = isAxiosError(error)
          ? error.response?.data?.detail || t.library.toasts.copyFailedDesc
          : t.library.toasts.copyFailedDesc;
        toast({
          title: t.library.toasts.copyFailedTitle,
          description,
          variant: 'destructive',
        });
      }
    },
    [toast, t, tf, fetchDocuments]
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, item: EnrichedDocument) => {
      e.stopPropagation();
      setFavorites(toggleFavorite(item.id));
    },
    []
  );

  const handleAddNew = useCallback(() => {
    createModalRef.current?.show();
  }, []);

  useShortcutAction('create-document', handleAddNew);

  const handleCreateSuccess = (document: API.Document) => {
    toast({
      title: t.library.toasts.addedTitle,
      description: tf(t.library.toasts.addedDesc, { title: document.title }),
    });
    fetchDocuments();
  };
  const handleUpdateSuccess = (document: API.Document) => {
    toast({
      title: t.library.toasts.updatedTitle,
      description: tf(t.library.toasts.updatedDesc, { title: document.title }),
    });
    fetchDocuments();
  };
  const handleDeleteSuccess = (document: API.Document) => {
    toast({
      title: t.library.toasts.removedTitle,
      description: tf(t.library.toasts.removedDesc, { title: document.title }),
    });
    if (selectedDoc?.id === document.id) setSelectedDoc(null);
    fetchDocuments();
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setCollection('all');
    setCategoryFilter(null);
    setAreaFilter(null);
  };

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const handleMobileNav = (tab: MobileKnowledgeTab) => {
    setMobileTab(tab);
    if (tab === 'upload') {
      handleAddNew();
      return;
    }
    if (tab === 'search') {
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (tab === 'ai') {
      setAiSheetOpen(true);
      return;
    }
    setFolderSheetOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (
        (e.key === 'n' || e.key === 'N' || e.key === 'u' || e.key === 'U') &&
        !inField &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleAddNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAddNew]);

  const cardHandlers = {
    onSelect: handleSelect,
    onOpen: handleOpen,
    onEdit: handleEdit,
    onDownload: handleDownload,
    onDelete: handleDelete,
    onCopy: handleCopy,
    onToggleFavorite: handleToggleFavorite,
  };

  return (
    <>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Collections — desktop (collapsible) */}
          <aside
            className={cn(
              'hidden shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/50 lg:flex',
              'transition-[width] duration-200 ease-in-out',
              collectionsCollapsed ? 'w-12' : 'w-60 xl:w-72'
            )}
            aria-label={t.library.collections}
          >
            <div
              className={cn(
                'flex shrink-0 items-center border-b border-slate-200/80 dark:border-slate-800',
                collectionsCollapsed ? 'justify-center px-1 py-1.5' : 'justify-end px-1.5 py-1'
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={toggleCollectionsCollapsed}
                aria-expanded={!collectionsCollapsed}
                aria-label={
                  collectionsCollapsed ? t.library.expandCollections : t.library.collapseCollections
                }
              >
                {collectionsCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4 rtl:rotate-180" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 rtl:rotate-180" />
                )}
              </Button>
            </div>
            <div className={cn('min-h-0 flex-1 overflow-y-auto', collectionsCollapsed ? 'p-1' : 'p-2.5')}>
              <CollectionsSidebar
                selectedCollection={collection}
                selectedCategory={categoryFilter}
                selectedArea={areaFilter}
                onSelectCollection={setCollection}
                onSelectCategory={setCategoryFilter}
                onSelectArea={setAreaFilter}
                collectionCounts={collectionCounts}
                categoryCounts={categoryCounts}
                areaCounts={areaCounts}
                collapsed={collectionsCollapsed}
              />
            </div>
          </aside>

          <Sheet open={folderSheetOpen} onOpenChange={setFolderSheetOpen}>
            <SheetContent
              side="left"
              className="w-[min(100vw,18rem)] p-0 sm:max-w-xs lg:hidden"
            >
              <SheetHeader className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <SheetTitle className="text-sm">{t.library.categories}</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-3">
                <CollectionsSidebar
                  selectedCollection={collection}
                  selectedCategory={categoryFilter}
                  selectedArea={areaFilter}
                  onSelectCollection={(id) => {
                    setCollection(id);
                    setFolderSheetOpen(false);
                  }}
                  onSelectCategory={(id) => {
                    setCategoryFilter(id);
                    setFolderSheetOpen(false);
                  }}
                  onSelectArea={(id) => {
                    setAreaFilter(id);
                    setFolderSheetOpen(false);
                  }}
                  collectionCounts={collectionCounts}
                  categoryCounts={categoryCounts}
                  areaCounts={areaCounts}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Main workspace — metrics scroll away; toolbar sticky */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="px-3 pt-2 sm:px-4">
                {jurisdictionName ? (
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t.library.yourLegalLibrary}
                    <span className="ms-1.5 font-semibold normal-case tracking-normal text-slate-700 dark:text-slate-200">
                      {jurisdictionName}
                    </span>
                  </p>
                ) : null}
                <SmartMetricsBar metrics={metrics} />
              </div>

              <div
                className={cn(
                  'ws-toolbar-sticky sticky top-0 z-30',
                  'border-b border-slate-200/90 bg-slate-50/95 px-3 py-2 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 sm:px-4'
                )}
              >
                <div className="rounded-lg border border-slate-200/90 bg-white/95 px-2 py-2 dark:border-slate-800 dark:bg-slate-950/90 sm:px-3">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 lg:hidden"
                      onClick={() => setFolderSheetOpen(true)}
                      aria-label={t.library.openCollections}
                    >
                      <FolderTree className="h-4 w-4" />
                    </Button>

                    <KnowledgeSearch
                      ref={searchRef}
                      value={searchTerm}
                      onChange={setSearchTerm}
                      onSubmit={setSearchTerm}
                      compact
                      className="min-w-[min(100%,12rem)] flex-1 sm:min-w-[14rem] sm:flex-[1.6]"
                    />

                    <ViewTabs value={viewMode} onChange={setViewMode} className="min-w-0" />

                    <span className="hidden text-[11px] tabular-nums text-slate-400 sm:inline">
                      {tf(t.library.resultsCount, { count: filteredItems.length })}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-[12px] xl:hidden"
                      onClick={() => setAiSheetOpen(true)}
                      aria-label={t.library.openCopilot}
                    >
                      {t.library.copilot}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="ms-auto hidden h-9 shrink-0 gap-1.5 rounded-md bg-[#64499D] px-3 text-[12px] font-semibold text-white hover:bg-[#4D3680] md:inline-flex"
                      onClick={handleAddNew}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {t.library.upload}
                    </Button>
                  </div>
                  {filtersActive ? (
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
                      {collection !== 'all' ? (
                        <FilterChip
                          label={
                            collection === 'public'
                              ? t.library.publicLibrary
                              : COLLECTIONS.find((c) => c.id === collection)?.label || collection
                          }
                          onRemove={() => setCollection('all')}
                        />
                      ) : null}
                      {categoryFilter ? (
                        <FilterChip
                          label={enumLabel('documentCategory', categoryFilter)}
                          onRemove={() => setCategoryFilter(null)}
                        />
                      ) : null}
                      {areaFilter ? (
                        <FilterChip
                          label={enumLabel('documentLegalArea', areaFilter)}
                          onRemove={() => setAreaFilter(null)}
                        />
                      ) : null}
                      {searchTerm ? (
                        <FilterChip
                          label={searchTerm}
                          onRemove={() => setSearchTerm('')}
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="shrink-0 px-1.5 text-[11px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
                      >
                        {t.library.clearAllFilters}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pb-20 md:pb-4">
                {loading ? (
                  <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-28 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800"
                      />
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <KnowledgeEmptyState
                    filtered={filtersActive}
                    onUpload={handleAddNew}
                  />
                ) : viewMode === 'grid' ? (
                  <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-3 xl:grid-cols-2 2xl:grid-cols-3">
                    {filteredItems.map((item) => (
                      <KnowledgeCard
                        key={item.id}
                        document={item}
                        selected={selectedDoc?.id === item.id}
                        isFavorite={favorites.includes(item.id)}
                        {...cardHandlers}
                      />
                    ))}
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="p-2 sm:p-3">
                    <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <KnowledgeTableView
                        items={filteredItems}
                        selectedId={selectedDoc?.id}
                        sortBy={sortBy === 'score' ? 'score' : sortBy}
                        sortOrder={sortOrder}
                        onSort={toggleSort}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onEdit={handleEdit}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <Suspense fallback={<ViewFallback />}>
                      {viewMode === 'timeline' && (
                        <KnowledgeTimelineView
                          items={filteredItems}
                          selectedId={selectedDoc?.id}
                          onSelect={handleSelect}
                        />
                      )}
                      {viewMode === 'graph' && (
                        <KnowledgeGraphView
                          items={filteredItems}
                          selectedId={selectedDoc?.id}
                          onSelect={handleSelect}
                        />
                      )}
                      {viewMode === 'ai' && (
                        <KnowledgeAIView items={filteredItems} onSelect={handleSelect} />
                      )}
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Copilot — desktop */}
          <div className="hidden w-72 shrink-0 border-l border-slate-200/80 dark:border-slate-800 xl:block 2xl:w-80">
            <AICopilotPanel
              document={selectedDoc}
              onOpen={handleOpen}
              className="h-full"
            />
          </div>
        </div>

        <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
          <SheetContent side="right" className="w-full max-w-md p-0 sm:max-w-md xl:hidden">
            <AICopilotPanel
              document={selectedDoc}
              onClose={() => setAiSheetOpen(false)}
              onOpen={(doc) => {
                setAiSheetOpen(false);
                handleOpen(doc);
              }}
              className="h-full border-0"
            />
          </SheetContent>
        </Sheet>

        {/* Mobile FAB for upload (also in bottom nav) */}
        <Button
          type="button"
          size="icon"
          className="fixed z-40 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] right-4 h-12 w-12 rounded-full bg-[#64499D] shadow-lg hover:bg-[#4D3680] md:hidden"
          onClick={handleAddNew}
          aria-label={t.library.uploadDocuments}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>

        <MobileKnowledgeNav active={mobileTab} onChange={handleMobileNav} />

        <p className="sr-only" aria-live="polite">
          {loading
            ? t.library.loadingAria
            : tf(t.library.countAria, { count: filteredItems.length })}
        </p>
      </div>

      <DocumentCreateModal ref={createModalRef} onSuccess={handleCreateSuccess} />
      <DocumentUpdateModal ref={updateModalRef} onSuccess={handleUpdateSuccess} />
      <DocumentDeleteModal ref={deleteModalRef} onSuccess={handleDeleteSuccess} />
      <DocumentDetailDrawer
        ref={detailDrawerRef}
        onSuccess={(doc) => {
          setLibraryItems((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
        }}
        onCopied={(doc) => {
          fetchDocuments();
        }}
      />
    </>
  );
};

export default Library;
