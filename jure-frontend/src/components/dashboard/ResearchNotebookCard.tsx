import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import {
  apiCreateResearchNote,
  apiDeleteResearchNote,
  apiGetResearchNotes,
  apiUpdateResearchNote,
  unwrapResearchNoteList,
  type ResearchNote,
} from '@/services/research-notes/api';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';

type Draft = {
  title: string;
  citation: string;
  content: string;
};

const emptyDraft = (): Draft => ({ title: '', citation: '', content: '' });

type Props = {
  /** When opened from a matter, notes are scoped and saved to that case. */
  caseId?: number;
};

export default function ResearchNotebookCard({ caseId }: Props) {
  const { t } = useAppTranslation();
  const n = t.dashboard.notebook;
  const { toast } = useToast();
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResearchNote | null>(null);

  const saveErrorMessage = (err: unknown): string => {
    if (isAxiosError(err)) {
      if (!err.response) return n.errors.connectionSave;
      const data = err.response.data as { detail?: string; title?: string[] } | undefined;
      if (typeof data?.detail === 'string') return data.detail;
      if (Array.isArray(data?.title) && data.title[0]) return data.title[0];
    }
    return n.errors.save;
  };

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiGetResearchNotes({
        ...(caseId != null ? { matter: caseId } : {}),
        page_size: 100,
      });
      setNotes(unwrapResearchNoteList(res.data));
    } catch (err) {
      setNotes([]);
      setLoadError(
        isAxiosError(err) && !err.response ? n.errors.connectionLoad : n.errors.load
      );
    } finally {
      setLoading(false);
    }
  }, [caseId, n.errors.connectionLoad, n.errors.load]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const resetEditor = () => {
    setDraft(emptyDraft());
    setEditingId(null);
  };

  const startCreate = () => {
    resetEditor();
  };

  const startEdit = (note: ResearchNote) => {
    setEditingId(note.id);
    setDraft({
      title: note.title,
      citation: note.citation || '',
      content: note.content || '',
    });
  };

  const handleSave = async () => {
    const title = draft.title.trim();
    if (!title || saving) return;

    setSaving(true);
    try {
      if (editingId != null) {
        const res = await apiUpdateResearchNote(editingId, {
          title,
          citation: draft.citation.trim(),
          content: draft.content.trim(),
        });
        setNotes((prev) => prev.map((item) => (item.id === editingId ? res.data : item)));
        toast({ title: n.toasts.saved });
      } else {
        const res = await apiCreateResearchNote({
          title,
          citation: draft.citation.trim(),
          content: draft.content.trim(),
          ...(caseId != null ? { matter: caseId } : { matter: null }),
        });
        setNotes((prev) => [res.data, ...prev.filter((item) => item.id !== res.data.id)]);
        toast({ title: n.toasts.saved });
      }
      resetEditor();
    } catch (err) {
      toast({
        title: saveErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiDeleteResearchNote(deleteTarget.id);
      setNotes((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetEditor();
      toast({ title: n.toasts.deleted });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title:
          isAxiosError(err) && !err.response
            ? n.errors.connectionDelete
            : n.errors.delete,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DashboardCollapsibleCard
        className="rounded-2xl"
        title={n.title}
        description={caseId ? n.descriptionWithMatter : n.description}
        contentClassName="space-y-3"
      >
          <Input
            placeholder={n.titlePlaceholder}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            disabled={saving}
          />
          <Input
            placeholder={n.citationPlaceholder}
            value={draft.citation}
            onChange={(e) => setDraft({ ...draft, citation: e.target.value })}
            disabled={saving}
          />
          <Textarea
            placeholder={n.contentPlaceholder}
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            disabled={saving}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-lg"
              onClick={() => void handleSave()}
              disabled={saving || !draft.title.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : editingId != null ? (
                n.saveChanges
              ) : (
                n.saveNote
              )}
            </Button>
            {editingId != null && (
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={resetEditor}
                disabled={saving}
              >
                {t.common.cancel}
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-auto">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {n.loading}
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50/80 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                <p>{loadError}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() => void loadNotes()}
                >
                  {t.common.retry}
                </Button>
              </div>
            )}

            {!loading && !loadError && notes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 text-center space-y-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.emptyTitle}</p>
                <p className="text-xs text-muted-foreground">{n.emptyHint}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-lg"
                  onClick={startCreate}
                >
                  <Plus className="me-1.5 h-3.5 w-3.5" />
                  {n.createCta}
                </Button>
              </div>
            )}

            {!loading &&
              !loadError &&
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`rounded-xl border p-2 ${
                    editingId === note.id
                      ? 'border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/50'
                      : 'border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-slate-900 dark:text-white">{note.title}</div>
                      {note.citation ? (
                        <div className="text-xs text-muted-foreground truncate">{note.citation}</div>
                      ) : null}
                      {note.content ? (
                        <p className="text-xs mt-1 whitespace-pre-wrap">{note.content}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(note)}
                        disabled={saving}
                        aria-label={n.editAria}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        onClick={() => setDeleteTarget(note)}
                        disabled={saving || deleting}
                        aria-label={n.deleteAria}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
      </DashboardCollapsibleCard>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{n.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {n.deleteDescription}
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
                  {n.deleting}
                </>
              ) : (
                t.common.delete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
