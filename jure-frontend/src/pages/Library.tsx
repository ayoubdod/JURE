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
import { FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { apiGetDocuments } from '@/services/library/api';
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
  KnowledgeHubHeader,
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
  getFavorites,
  toggleFavorite,
  COLLECTIONS,
  type CollectionId,
  type EnrichedDocument,
  type KnowledgeViewMode,
  type MobileKnowledgeTab,
} from '@/components/library/knowledge-hub';
import { cn } from '@/lib/utils';
import { devError } from '@/utils/devLog';

const KnowledgeTimelineView = lazy(
  () => import('@/components/library/knowledge-hub/KnowledgeTimelineView')
);
const KnowledgeGraphView = lazy(
  () => import('@/components/library/knowledge-hub/KnowledgeGraphView')
);
const KnowledgeAIView = lazy(
  () => import('@/components/library/knowledge-hub/KnowledgeAIView')
);

type SortKey = 'date' | 'name' | 'size' | 'score';

function parseDocuments(data: unknown): API.Document[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results: unknown }).results;
    return Array.isArray(results) ? results : [];
  }
  return [];
}

const ViewFallback = () => (
  <div className="animate-pulse space-y-3 p-4" aria-hidden>
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
    ))}
  </div>
);

const Library = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collection, setCollection] = useState<CollectionId>('all');
  const [viewMode, setViewMode] = useState<KnowledgeViewMode>('grid');
  const [libraryItems, setLibraryItems] = useState<API.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDoc, setSelectedDoc] = useState<EnrichedDocument | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => getFavorites());
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileKnowledgeTab>('browse');
  const { toast } = useToast();

  const createModalRef = useRef<DocumentCreateModalRef>(null);
  const updateModalRef = useRef<DocumentUpdateModalRef>(null);
  const deleteModalRef = useRef<DocumentDeleteModalRef>(null);
  const detailDrawerRef = useRef<DocumentDetailDrawerRef>(null);

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
              'Failed to load knowledge repository.';
            toast({
              title: 'Error Loading Knowledge Hub',
              description: errorMessage,
              variant: 'destructive',
            });
          });
      })
      .finally(() => setLoading(false));
  }, [toast]);

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

  const metrics = useMemo(
    () =>
      computeSmartMetrics(
        enriched,
        COLLECTIONS.filter((c) => c.group === 'core' && c.id !== 'all').length
      ),
    [enriched]
  );

  const filteredItems = useMemo(() => {
    const byCollection = enriched.filter((d) =>
      matchesCollection(d, collection, favorites)
    );
    const searched = semanticFilter(byCollection, searchTerm);
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
  }, [enriched, collection, favorites, searchTerm, sortBy, sortOrder]);

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
    updateModalRef.current?.show(item);
  }, []);

  const handleDownload = useCallback(
    (e: React.MouseEvent, item: EnrichedDocument) => {
      e.stopPropagation();
      toast({
        title: 'Download Started',
        description: `Downloading ${item.title}…`,
      });
    },
    [toast]
  );

  const handleDelete = useCallback((e: React.MouseEvent, item: EnrichedDocument) => {
    e.stopPropagation();
    deleteModalRef.current?.show(item);
  }, []);

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, item: EnrichedDocument) => {
      e.stopPropagation();
      setFavorites(toggleFavorite(item.id));
    },
    []
  );

  const handleAddNew = () => createModalRef.current?.show();

  const handleCreateSuccess = (document: API.Document) => {
    toast({
      title: 'Knowledge added',
      description: `"${document.title}" is now in your repository`,
    });
    fetchDocuments();
  };
  const handleUpdateSuccess = (document: API.Document) => {
    toast({
      title: 'Updated',
      description: `"${document.title}" saved`,
    });
    fetchDocuments();
  };
  const handleDeleteSuccess = (document: API.Document) => {
    toast({
      title: 'Removed',
      description: `"${document.title}" deleted`,
    });
    if (selectedDoc?.id === document.id) setSelectedDoc(null);
    fetchDocuments();
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
      document.getElementById('knowledge-search-anchor')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    if (tab === 'ai') {
      setAiSheetOpen(true);
      return;
    }
    setFolderSheetOpen(true);
  };

  const cardHandlers = {
    onSelect: handleSelect,
    onOpen: handleOpen,
    onEdit: handleEdit,
    onDownload: handleDownload,
    onDelete: handleDelete,
    onToggleFavorite: handleToggleFavorite,
  };

  return (
    <>
      <div className="relative flex h-full min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950 md:min-h-0">
        <KnowledgeHubHeader
          documentCount={enriched.length}
          onUpload={handleAddNew}
          className="shrink-0"
        />

        <div className="shrink-0 space-y-4 border-b border-slate-200/80 px-4 py-4 dark:border-slate-800 sm:px-6">
          <div id="knowledge-search-anchor">
            <KnowledgeSearch
              value={searchTerm}
              onChange={setSearchTerm}
              onSubmit={setSearchTerm}
            />
          </div>
          <SmartMetricsBar metrics={metrics} />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Collections — desktop */}
          <aside
            className={cn(
              'hidden w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-950/40 lg:flex',
              'xl:w-60'
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <CollectionsSidebar
                selected={collection}
                onSelect={setCollection}
                documents={enriched}
                favorites={favorites}
                counts={collectionCounts}
              />
            </div>
          </aside>

          {/* Mobile collections sheet */}
          <Sheet open={folderSheetOpen} onOpenChange={setFolderSheetOpen}>
            <SheetContent
              side="left"
              className="w-[min(100vw,18rem)] p-0 sm:max-w-xs lg:hidden"
            >
              <SheetHeader className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <SheetTitle className="text-sm">Collections</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-3">
                <CollectionsSidebar
                  selected={collection}
                  onSelect={(id) => {
                    setCollection(id);
                    setFolderSheetOpen(false);
                  }}
                  documents={enriched}
                  favorites={favorites}
                  counts={collectionCounts}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Main workspace */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800 sm:px-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                onClick={() => setFolderSheetOpen(true)}
                aria-label="Open collections"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              <ViewTabs value={viewMode} onChange={setViewMode} className="min-w-0" />
              <div className="ml-auto hidden items-center gap-1 sm:flex">
                <span className="mr-1 text-[11px] text-slate-400">
                  {filteredItems.length} results
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-8 text-[12px] xl:hidden"
                onClick={() => setAiSheetOpen(true)}
                aria-label="Open AI Copilot"
              >
                Copilot
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-4">
              {loading ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-44 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <KnowledgeEmptyState
                  filtered={Boolean(searchTerm) || collection !== 'all'}
                  onUpload={handleAddNew}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-2 2xl:grid-cols-3">
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
                />
              ) : (
                <div className="p-3 sm:p-4">
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

          {/* AI Copilot — desktop */}
          <div className="hidden w-72 shrink-0 xl:block 2xl:w-80">
            <AICopilotPanel
              document={selectedDoc}
              onOpen={handleOpen}
              className="h-full"
            />
          </div>
        </div>

        {/* AI Copilot — mobile / tablet sheet */}
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

        <MobileKnowledgeNav active={mobileTab} onChange={handleMobileNav} />
      </div>

      <DocumentCreateModal ref={createModalRef} onSuccess={handleCreateSuccess} />
      <DocumentUpdateModal ref={updateModalRef} onSuccess={handleUpdateSuccess} />
      <DocumentDeleteModal ref={deleteModalRef} onSuccess={handleDeleteSuccess} />
      <DocumentDetailDrawer
        ref={detailDrawerRef}
        onSuccess={(doc) => {
          setLibraryItems((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
        }}
      />
    </>
  );
};

export default Library;
