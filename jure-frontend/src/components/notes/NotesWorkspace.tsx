import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useResearchNotes } from '@/hooks/useResearchNotes';
import { useAppTranslation } from '@/i18n';
import type { ResearchNote } from '@/services/research-notes/api';
import NotesHeader from '@/components/notes/NotesHeader';
import RecentNotes from '@/components/notes/RecentNotes';
import NotesGrid from '@/components/notes/NotesGrid';
import NoteCard from '@/components/notes/NoteCard';
import NoteFilters from '@/components/notes/NoteFilters';
import NoteEmptyState from '@/components/notes/NoteEmptyState';
import NoteSkeleton from '@/components/notes/NoteSkeleton';
import NoteEditor, { type NoteDraft } from '@/components/notes/NoteEditor';
import NoteDetail from '@/components/notes/NoteDetail';
import { type MatterOption } from '@/components/notes/NoteMatterPicker';
import {
  filterNotes,
  recentNotes,
  type NotesFilter,
} from '@/components/notes/noteUtils';
import { Loader2 } from 'lucide-react';

type Props = {
  caseId?: number;
  matterTitle?: string;
  matterReference?: string;
  embedded?: boolean;
  startCreate?: boolean;
  openNoteId?: number | null;
  onConsumedStartCreate?: () => void;
};

export default function NotesWorkspace({
  caseId,
  matterTitle,
  matterReference,
  embedded = false,
  startCreate = false,
  openNoteId = null,
  onConsumedStartCreate,
}: Props) {
  const { t, tf } = useAppTranslation();
  const n = t.notes;
  const nb = t.dashboard.notebook;
  const { toast } = useToast();
  const [filter, setFilter] = useState<NotesFilter>('all');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchNote | null>(null);
  const [detail, setDetail] = useState<ResearchNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResearchNote | null>(null);

  const lockedMatter: MatterOption | null =
    caseId != null
      ? { id: caseId, title: matterTitle, reference: matterReference }
      : null;

  const {
    notes,
    loading,
    saving,
    deleting,
    loadError,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    saveErrorMessage,
  } = useResearchNotes({ caseId, errors: nb.errors });

  useEffect(() => {
    if (startCreate) {
      setEditing(null);
      setEditorOpen(true);
      onConsumedStartCreate?.();
    }
  }, [startCreate, onConsumedStartCreate]);

  useEffect(() => {
    if (openNoteId == null || loading) return;
    const found = notes.find((item) => item.id === openNoteId);
    if (found) setDetail(found);
  }, [openNoteId, notes, loading]);

  useEffect(() => {
    if (!detail) return;
    const next = notes.find((item) => item.id === detail.id);
    setDetail(next ?? null);
  }, [notes, detail?.id]);

  const visible = useMemo(() => filterNotes(notes, filter, search), [notes, filter, search]);
  const recent = useMemo(() => recentNotes(notes, 4), [notes]);
  const searching = search.trim().length > 0;
  const showRecentRow = !embedded && !detail && !searching && filter === 'all' && recent.length > 0;

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (note: ResearchNote) => {
    setEditing(note);
    setEditorOpen(true);
  };

  const openDetail = (note: ResearchNote) => {
    setDetail(note);
  };

  const handleSave = async (draft: NoteDraft) => {
    const title = draft.title.trim();
    if (!title) return;
    try {
      const payload = {
        title,
        citation: draft.citation.trim(),
        content: draft.content.trim(),
        matter: lockedMatter ? lockedMatter.id : draft.matter?.id ?? null,
      };
      const saved = editing ? await updateNote(editing.id, payload) : await createNote(payload);
      toast({ title: nb.toasts.saved });
      setEditorOpen(false);
      setEditing(null);
      if (detail && saved.id === detail.id) setDetail(saved);
    } catch (err) {
      toast({ title: saveErrorMessage(err), variant: 'destructive' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget.id);
      if (detail?.id === deleteTarget.id) setDetail(null);
      if (editing?.id === deleteTarget.id) {
        setEditorOpen(false);
        setEditing(null);
      }
      toast({ title: nb.toasts.deleted });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title:
          isAxiosError(err) && !err.response ? nb.errors.connectionDelete : nb.errors.delete,
        variant: 'destructive',
      });
    }
  };

  const title = embedded ? n.gridTitleMatter : n.pageTitle;
  const subtitle = embedded
    ? matterTitle || matterReference
      ? `${n.matterLabel}: ${[matterReference, matterTitle].filter(Boolean).join(' — ')}`
      : n.subtitleMatter
    : n.subtitle;

  const emptyVariant: 'empty' | 'search' | 'filter' = searching
    ? 'search'
    : notes.length === 0
      ? 'empty'
      : 'filter';

  return (
    <div
      className={
        embedded
          ? 'min-w-0'
          : 'flex h-full min-h-0 min-w-0 overflow-hidden bg-[#F7F8FA] dark:bg-slate-950'
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className={embedded ? 'min-w-0' : 'min-w-0 px-4 py-5 sm:px-6 lg:px-8'}>
            {detail ? (
              <NoteDetail note={detail} onBack={() => setDetail(null)} onEdit={openEdit} />
            ) : (
              <>
                <NotesHeader
                  title={title}
                  subtitle={subtitle}
                  search={search}
                  onSearchChange={setSearch}
                  onCreate={openCreate}
                />

                {loadError ? (
                  <div className="rounded-[16px] border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40">
                    <p className="text-sm text-red-700 dark:text-red-300">{n.error.title}</p>
                    <Button type="button" variant="outline" className="mt-3" onClick={() => void loadNotes()}>
                      {n.error.retry}
                    </Button>
                  </div>
                ) : loading ? (
                  <NoteSkeleton />
                ) : (
                  <>
                    {showRecentRow ? (
                      <RecentNotes
                        notes={recent}
                        onOpen={openDetail}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    ) : null}

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {embedded ? n.gridTitleMatter : n.gridTitle}
                      </h2>
                      <span className="text-[12px] text-slate-400">
                        {visible.length === 1
                          ? n.countOne
                          : tf(n.count, { count: visible.length })}
                      </span>
                    </div>

                    <NoteFilters
                      value={filter}
                      hideScope={embedded}
                      onChange={(next) => {
                        setFilter(next);
                        setDetail(null);
                      }}
                    />

                    {visible.length === 0 ? (
                      <NoteEmptyState
                        variant={emptyVariant}
                        onCreate={openCreate}
                        onClear={() => {
                          setSearch('');
                          setFilter('all');
                        }}
                      />
                    ) : embedded ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {visible.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onOpen={openDetail}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                          />
                        ))}
                      </div>
                    ) : (
                      <NotesGrid
                        notes={visible}
                        onOpen={openDetail}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <NoteEditor
        open={editorOpen}
        note={editing}
        lockedMatter={lockedMatter}
        saving={saving}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSave={(draft) => void handleSave(draft)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{nb.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {nb.deleteDescription}
              {deleteTarget?.title ? (
                <>
                  {' '}
                  <span className="font-medium text-foreground">“{deleteTarget.title}”</span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {nb.deleting}
                </>
              ) : (
                t.common.delete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
