import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  BookmarkPlus,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { isAxiosError } from 'axios';
import { devError } from '@/utils/devLog';
import useUserStore from '@/stores/userStore';
import {
  apiAddToMyLibrary,
  apiDeleteDocument,
  apiFavoriteDocument,
  apiGetLibrary,
  apiUnfavoriteDocument,
  type LibraryTab,
} from '@/services/library/api';
import { apiGetJurisdictions, type Jurisdiction } from '@/services/jurisdictions/api';
import { LIBRARY_RESOURCE_TYPE_IDS } from '@/lib/libraryTaxonomy';
import ResourceCard from '@/components/library/hub/ResourceCard';
import ResourceFormDialog, {
  type ResourceFormDialogRef,
  type ResourceFormMode,
} from '@/components/library/hub/ResourceFormDialog';
import DocumentReaderModal, {
  type DocumentReaderModalRef,
} from '@/components/library/hub/DocumentReaderModal';
import DocumentUpdateModal, {
  type DocumentUpdateModalRef,
} from '@/components/document/DocumentUpdateModal';
import DocumentDeleteModal, {
  type DocumentDeleteModalRef,
} from '@/components/document/DocumentDeleteModal';
import '@/styles/workspace-list.css';

const TABS: LibraryTab[] = ['my', 'local', 'international', 'favorites'];

function parseList(data: API.LibraryListResponse | API.Document[] | unknown): {
  results: API.Document[];
  recent: API.Document[];
} {
  if (Array.isArray(data)) return { results: data, recent: [] };
  if (data && typeof data === 'object') {
    const payload = data as API.LibraryListResponse;
    const results = Array.isArray(payload.results) ? payload.results : [];
    const recent = Array.isArray(payload.recent) ? payload.recent : [];
    return { results, recent };
  }
  return { results: [], recent: [] };
}

const RESOURCE_GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';

function SkeletonGrid() {
  return (
    <div className={RESOURCE_GRID} aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
      ))}
    </div>
  );
}

const Library = () => {
  const { t, tf, enumLabel } = useAppTranslation();
  const hub = t.library.hub;
  const { toast } = useToast();
  const user = useUserStore((s) => s.user);
  const isPlatformAdmin = Boolean(user?.is_platform_admin);
  const jurisdictionName = user?.jurisdiction?.name;
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as LibraryTab) ? params.get('tab') : 'my') as LibraryTab;
  const [searchInput, setSearchInput] = useState(params.get('q') || '');
  const [search, setSearch] = useState(params.get('q') || '');
  const [resourceType, setResourceType] = useState(params.get('type') || '');
  const [language, setLanguage] = useState(params.get('lang') || '');
  const [sort, setSort] = useState(params.get('sort') || '-created');
  const [view, setView] = useState<'grid' | 'list'>((params.get('view') as 'grid' | 'list') || 'grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [results, setResults] = useState<API.Document[]>([]);
  const [recent, setRecent] = useState<API.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const formRef = useRef<ResourceFormDialogRef>(null);
  const readerRef = useRef<DocumentReaderModalRef>(null);
  const updateRef = useRef<DocumentUpdateModalRef>(null);
  const deleteRef = useRef<DocumentDeleteModalRef>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('tab', tab);
    if (search) next.set('q', search);
    if (resourceType) next.set('type', resourceType);
    if (language) next.set('lang', language);
    if (sort && sort !== '-created') next.set('sort', sort);
    if (view !== 'grid') next.set('view', view);
    if (next.toString() === params.toString()) return;
    setParams(next, { replace: true });
  }, [tab, search, resourceType, language, sort, view, params, setParams]);

  const fetchLibrary = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGetLibrary(tab, {
      all: true,
      search: search || undefined,
      resource_type: resourceType || undefined,
      language: language || undefined,
      ordering: sort,
    })
      .then((res) => {
        const parsed = parseList(res.data);
        setResults(parsed.results);
        setRecent(parsed.recent);
      })
      .catch((err) => {
        devError('Library load failed', err);
        setResults([]);
        setRecent([]);
        setError(
          isAxiosError(err)
            ? err.response?.data?.detail || t.library.toasts.loadErrorFallback
            : t.library.toasts.loadErrorFallback
        );
      })
      .finally(() => setLoading(false));
  }, [tab, search, resourceType, language, sort, t.library.toasts.loadErrorFallback]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    apiGetJurisdictions()
      .then(setJurisdictions)
      .catch(() => setJurisdictions([]));
  }, [isPlatformAdmin]);

  const patchDoc = useCallback((updated: API.Document) => {
    const apply = (list: API.Document[]) => list.map((d) => (d.id === updated.id ? { ...d, ...updated } : d));
    setResults((prev) => apply(prev));
    setRecent((prev) => apply(prev));
  }, []);

  const handleFavorite = useCallback(
    async (doc: API.Document) => {
      try {
        const adding = !doc.is_favorited;
        const res = adding
          ? await apiFavoriteDocument(doc.id)
          : await apiUnfavoriteDocument(doc.id);
        patchDoc(res.data);
        if (tab === 'favorites' && !res.data.is_favorited) {
          setResults((prev) => prev.filter((d) => d.id !== doc.id));
          setRecent((prev) => prev.filter((d) => d.id !== doc.id));
        }
        if (adding && res.data.is_favorited) {
          toast({
            title: t.library.toasts.favoritedTitle,
            description: tf(t.library.toasts.favoritedDesc, { title: doc.title }),
          });
        }
      } catch {
        toast({ title: t.common.error, variant: 'destructive' });
      }
    },
    [patchDoc, t.common.error, t.library.toasts.favoritedTitle, t.library.toasts.favoritedDesc, tab, tf, toast]
  );

  const handleAddToMy = useCallback(
    async (doc: API.Document) => {
      try {
        const res = await apiAddToMyLibrary(doc.id);
        patchDoc(res.data);
        toast({
          title: t.library.toasts.copiedTitle,
          description: tf(t.library.toasts.copiedDesc, { title: doc.title }),
        });
      } catch (err) {
        toast({
          title: t.library.toasts.copyFailedTitle,
          description: isAxiosError(err)
            ? err.response?.data?.detail || t.library.toasts.copyFailedDesc
            : t.library.toasts.copyFailedDesc,
          variant: 'destructive',
        });
      }
    },
    [patchDoc, t, tf, toast]
  );

  const handleDownload = useCallback(
    (doc: API.Document) => {
      const href = doc.file || doc.external_url;
      if (!href) return;
      const a = window.document.createElement('a');
      a.href = href;
      a.download = doc.title || 'document';
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
      toast({
        title: t.library.toasts.downloadStarted,
        description: tf(t.library.toasts.downloading, { title: doc.title }),
      });
    },
    [t, tf, toast]
  );

  const handleOpen = useCallback((doc: API.Document) => {
    readerRef.current?.show(doc);
  }, []);

  const canEdit = useCallback(
    (doc: API.Document) => {
      if (doc.scope === 'PERSONAL' || doc.visibility_scope === 'CABINET') return Boolean(doc.is_owned ?? true);
      return isPlatformAdmin;
    },
    [isPlatformAdmin]
  );

  const setTab = (next: LibraryTab) => {
    if (next === tab) return;
    setParams(
      (prev) => {
        const copy = new URLSearchParams(prev);
        copy.set('tab', next);
        return copy;
      },
      { replace: true, flushSync: true }
    );
  };

  const recentTitle = tab === 'my' ? hub.recentlyAdded : hub.lastAdded;
  const emptyAll =
    tab === 'favorites'
      ? hub.emptyFavorites
      : tab === 'my'
        ? hub.emptyMy
        : tab === 'local'
          ? hub.emptyLocalAll
          : hub.emptyInternationalAll;
  const showAdd = tab === 'my' || (isPlatformAdmin && (tab === 'local' || tab === 'international'));
  const addMode: ResourceFormMode =
    tab === 'local' ? 'local' : tab === 'international' ? 'international' : 'personal';
  const listTitle = tab === 'favorites' ? hub.readingList : hub.allResources;

  const cardProps = {
    view,
    onOpen: handleOpen,
    onPreview: handleOpen,
    onDownload: handleDownload,
    onFavorite: handleFavorite,
  };

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-transparent">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="w-full min-w-0 px-4 py-5 sm:px-5 lg:px-6">
            <header className="mb-5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {t.library.title}
              </h1>
              <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {hub.subtitle}
              </p>
            </header>

            <div
              role="tablist"
              aria-label={t.library.title}
              className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-4"
            >
              {TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'min-w-0 rounded-lg px-2.5 py-2 text-start transition-colors sm:px-3',
                    tab === id
                      ? 'bg-[#64499D] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                  )}
                >
                  <span className="block truncate text-[13px] font-semibold">
                    {id === 'my'
                      ? hub.tabMy
                      : id === 'local'
                        ? hub.tabLocal
                        : id === 'international'
                          ? hub.tabInternational
                          : hub.tabFavorites}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 hidden truncate text-[11px] leading-tight md:block',
                      tab === id ? 'text-white/80' : 'text-slate-400'
                    )}
                  >
                    {id === 'my'
                      ? hub.tabMyHint
                      : id === 'local'
                        ? tf(hub.tabLocalHint, { jurisdiction: jurisdictionName || '—' })
                        : id === 'international'
                          ? hub.tabInternationalHint
                          : hub.tabFavoritesHint}
                  </span>
                </button>
              ))}
            </div>

            <div className="ws-toolbar-sticky sticky top-0 z-20 mb-5 min-w-0 rounded-xl border border-slate-200/80 bg-background/90 px-3 py-2 backdrop-blur-sm dark:border-slate-800">
              <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative min-w-0 w-full flex-1 lg:min-w-[14rem]">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={hub.searchPlaceholder}
                    aria-label={hub.searchPlaceholder}
                    className="h-9 min-w-0 rounded-lg border-slate-200 ps-8 text-[13px] dark:border-slate-700"
                  />
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                >
                  <Filter className="me-1.5 h-3.5 w-3.5" />
                  {t.common.filter}
                </Button>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-9 w-[8.5rem] shrink-0 text-[12.5px]" aria-label={hub.sortLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created">{hub.sortNewest}</SelectItem>
                    <SelectItem value="created">{hub.sortOldest}</SelectItem>
                    <SelectItem value="title">{hub.sortTitle}</SelectItem>
                  </SelectContent>
                </Select>
                <div
                  className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/50"
                  role="group"
                  aria-label={hub.viewGrid}
                >
                  {(['list', 'grid'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setView(mode)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                        view === mode
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                          : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
                      )}
                      aria-pressed={view === mode}
                      aria-label={mode === 'list' ? hub.viewList : hub.viewGrid}
                    >
                      {mode === 'list' ? (
                        <List className="h-3.5 w-3.5" />
                      ) : (
                        <LayoutGrid className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ))}
                </div>
                {showAdd ? (
                  <Button
                    type="button"
                    size="sm"
                    className="ms-auto h-9 shrink-0 bg-[#64499D] text-white hover:bg-[#543d86]"
                    onClick={() => formRef.current?.show(isPlatformAdmin && tab !== 'my' ? addMode : 'personal')}
                  >
                    {isPlatformAdmin && tab !== 'my' ? (
                      <Shield className="me-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Plus className="me-1.5 h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {tab === 'my' ? hub.addResource : tab === 'local' ? hub.publishLocal : hub.publishInternational}
                    </span>
                    <span className="sm:hidden">{hub.addResource}</span>
                  </Button>
                ) : null}
                </div>
              </div>
              {filtersOpen ? (
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <Select value={resourceType || 'all'} onValueChange={(v) => setResourceType(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 w-full min-w-0 sm:w-[12rem] text-[12px]">
                      <SelectValue placeholder={hub.fieldType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{hub.filterAllTypes}</SelectItem>
                      {LIBRARY_RESOURCE_TYPE_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {enumLabel('libraryResourceType', id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={language || 'all'} onValueChange={(v) => setLanguage(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-8 w-full min-w-0 sm:w-[9rem] text-[12px]">
                      <SelectValue placeholder={hub.fieldLanguage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{hub.filterAllLanguages}</SelectItem>
                      <SelectItem value="en">{t.common.languageNames.en}</SelectItem>
                      <SelectItem value="fr">{t.common.languageNames.fr}</SelectItem>
                      <SelectItem value="ar">{t.common.languageNames.ar}</SelectItem>
                    </SelectContent>
                  </Select>
                  {search || resourceType || language ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[12px]"
                      onClick={() => {
                        setSearchInput('');
                        setSearch('');
                        setResourceType('');
                        setLanguage('');
                      }}
                    >
                      <X className="me-1 h-3.5 w-3.5" />
                      {t.common.clearFilters}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <Button type="button" variant="outline" className="mt-3" onClick={fetchLibrary}>
                  {t.common.retry}
                </Button>
              </div>
            ) : loading ? (
              <SkeletonGrid />
            ) : (
              <div className="space-y-8">
                {tab !== 'favorites' && recent.length > 0 ? (
                <section aria-labelledby="library-recent">
                  <h2 id="library-recent" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {recentTitle}
                  </h2>
                  <div className={view === 'grid' ? RESOURCE_GRID : 'space-y-2'}>
                    {recent.map((doc) => (
                      <ResourceCard
                        key={`recent-${doc.id}`}
                        document={doc}
                        {...cardProps}
                        onEdit={canEdit(doc) ? (d) => updateRef.current?.show(d) : undefined}
                        onDelete={
                          canEdit(doc) || doc.is_in_my_library
                            ? (d) => deleteRef.current?.show(d)
                            : undefined
                        }
                        onAddToMyLibrary={tab !== 'my' ? handleAddToMy : undefined}
                      />
                    ))}
                  </div>
                </section>
                ) : null}

                <section aria-labelledby="library-all">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="library-all" className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {listTitle}
                    </h2>
                    <span className="text-[12px] text-slate-400">
                      {tf(t.library.documentsCount, { count: results.length })}
                    </span>
                  </div>
                  {results.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center dark:border-slate-800">
                      <p className="text-[13.5px] text-slate-500">{emptyAll}</p>
                      {tab === 'my' ? (
                        <Button
                          type="button"
                          className="mt-4 bg-[#64499D] text-white hover:bg-[#543d86]"
                          onClick={() => formRef.current?.show('personal')}
                        >
                          <Plus className="me-1.5 h-4 w-4" />
                          {hub.addResource}
                        </Button>
                      ) : tab !== 'my' ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => setTab('my')}
                        >
                          <BookmarkPlus className="me-1.5 h-4 w-4" />
                          {hub.tabMy}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className={view === 'grid' ? RESOURCE_GRID : 'space-y-2'}>
                      {results.map((doc) => (
                        <ResourceCard
                          key={doc.id}
                          document={doc}
                          {...cardProps}
                          onEdit={canEdit(doc) ? (d) => updateRef.current?.show(d) : undefined}
                          onDelete={
                            canEdit(doc) || (tab === 'my' && doc.is_in_my_library)
                              ? (d) => deleteRef.current?.show(d)
                              : undefined
                          }
                          onAddToMyLibrary={tab !== 'my' ? handleAddToMy : undefined}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
            {loading ? (
              <span className="sr-only">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.common.loading}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <ResourceFormDialog
        ref={formRef}
        jurisdictions={jurisdictions}
        defaultJurisdictionId={user?.jurisdiction?.id}
        defaultLanguage={user?.jurisdiction?.default_language}
        onSuccess={() => fetchLibrary()}
      />
      <DocumentReaderModal ref={readerRef} />
      <DocumentUpdateModal ref={updateRef} onSuccess={() => fetchLibrary()} />
      <DocumentDeleteModal
        ref={deleteRef}
        onSuccess={() => {
          fetchLibrary();
        }}
      />
    </>
  );
};

export default Library;
