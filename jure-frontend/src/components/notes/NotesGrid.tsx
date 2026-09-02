import type { ResearchNote } from '@/services/research-notes/api';
import NoteCard from '@/components/notes/NoteCard';
import { cn } from '@/lib/utils';

type Props = {
  notes: ResearchNote[];
  onOpen: (note: ResearchNote) => void;
  onEdit: (note: ResearchNote) => void;
  onDelete: (note: ResearchNote) => void;
  className?: string;
};

export default function NotesGrid({ notes, onOpen, onEdit, onDelete, className }: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
        className
      )}
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onOpen={onOpen}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
