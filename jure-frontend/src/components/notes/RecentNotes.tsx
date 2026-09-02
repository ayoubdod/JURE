import type { ResearchNote } from '@/services/research-notes/api';
import NoteCard from '@/components/notes/NoteCard';
import { useAppTranslation } from '@/i18n';

type Props = {
  notes: ResearchNote[];
  onOpen: (note: ResearchNote) => void;
  onEdit: (note: ResearchNote) => void;
  onDelete: (note: ResearchNote) => void;
};

export default function RecentNotes({ notes, onOpen, onEdit, onDelete }: Props) {
  const { t } = useAppTranslation();
  if (!notes.length) return null;

  return (
    <section aria-labelledby="recent-notes-heading" className="mb-6">
      <h2
        id="recent-notes-heading"
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
      >
        {t.notes.recentTitle}
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {notes.map((note) => (
          <NoteCard
            key={`recent-${note.id}`}
            note={note}
            compact
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
