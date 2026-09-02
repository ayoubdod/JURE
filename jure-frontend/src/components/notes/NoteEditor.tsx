import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppTranslation } from '@/i18n';
import type { ResearchNote } from '@/services/research-notes/api';
import NoteMatterPicker, { type MatterOption } from '@/components/notes/NoteMatterPicker';

export type NoteDraft = {
  title: string;
  citation: string;
  content: string;
  matter: MatterOption | null;
};

type Props = {
  open: boolean;
  note?: ResearchNote | null;
  lockedMatter?: MatterOption | null;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: NoteDraft) => void;
};

function fromNote(note?: ResearchNote | null, locked?: MatterOption | null): NoteDraft {
  if (note) {
    return {
      title: note.title,
      citation: note.citation || '',
      content: note.content || '',
      matter:
        locked ??
        (note.matter != null
          ? {
              id: note.matter,
              reference: note.matter_reference ?? undefined,
              title: note.matter_title ?? undefined,
            }
          : null),
    };
  }
  return { title: '', citation: '', content: '', matter: locked ?? null };
}

export default function NoteEditor({
  open,
  note,
  lockedMatter,
  saving,
  onOpenChange,
  onSave,
}: Props) {
  const { t } = useAppTranslation();
  const n = t.notes;
  const nb = t.dashboard.notebook;
  const [draft, setDraft] = useState<NoteDraft>(() => fromNote(note, lockedMatter));

  useEffect(() => {
    if (open) setDraft(fromNote(note, lockedMatter));
  }, [open, note, lockedMatter]);

  const editing = note != null;
  const titleOk = draft.title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:!max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? n.editor.editTitle : n.editor.createTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">
              {n.editor.title} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="note-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={nb.titlePlaceholder}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-citation">{n.editor.citation}</Label>
            <Input
              id="note-citation"
              value={draft.citation}
              onChange={(e) => setDraft({ ...draft, citation: e.target.value })}
              placeholder={nb.citationPlaceholder}
              disabled={saving}
            />
          </div>
          {lockedMatter ? (
            <div className="rounded-lg border border-[#E8EAF0] bg-slate-50 px-3 py-2 text-[13px] dark:border-slate-800 dark:bg-slate-900">
              <span className="text-slate-400">{n.matterLabel}: </span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {[lockedMatter.reference, lockedMatter.title].filter(Boolean).join(' — ') ||
                  n.unscopedBadge}
              </span>
            </div>
          ) : (
            <NoteMatterPicker
              value={draft.matter}
              onChange={(matter) => setDraft({ ...draft, matter })}
              disabled={saving}
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="note-content">{n.editor.content}</Label>
            <Textarea
              id="note-content"
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder={nb.contentPlaceholder}
              disabled={saving}
              className="min-h-[10rem] leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className="bg-[#64499D] text-white hover:bg-[#543d86]"
            disabled={saving || !titleOk}
            onClick={() => onSave(draft)}
          >
            {saving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t.common.saving}
              </>
            ) : editing ? (
              n.editor.saveChanges
            ) : (
              n.editor.save
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
