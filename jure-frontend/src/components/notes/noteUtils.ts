import type { ResearchNote } from '@/services/research-notes/api';

export type NotesFilter = 'all' | 'recent' | 'unscoped' | 'matter';

export type NoteColor = 'purple' | 'blue' | 'yellow' | 'rose' | 'green';

const PALETTES: NoteColor[] = ['purple', 'blue', 'yellow', 'rose', 'green'];

export const NOTE_COLOR_CLASSES: Record<NoteColor, string> = {
  purple: 'bg-[#F0EBFA] dark:bg-[#2A2340]/85',
  blue: 'bg-[#EAF4FC] dark:bg-[#1A2A38]/85',
  yellow: 'bg-[#FFF9DD] dark:bg-[#3A3520]/75',
  rose: 'bg-[#FFF0F1] dark:bg-[#3A2428]/85',
  green: 'bg-[#EDF8F0] dark:bg-[#1E3328]/85',
};

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

export function noteColor(id: number): NoteColor {
  return PALETTES[Math.abs(id) % PALETTES.length];
}

export function previewContent(content: string, max = 140): string {
  const trimmed = content.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function isRecentNote(note: ResearchNote, now = Date.now()): boolean {
  const ts = new Date(note.modified || note.created).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= RECENT_MS;
}

export function isSameDay(value: string, now = new Date()): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function matchesQuery(note: ResearchNote, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [note.title, note.citation, note.content].some((field) =>
    (field || '').toLowerCase().includes(q)
  );
}

export function filterNotes(
  notes: ResearchNote[],
  filter: NotesFilter,
  query: string
): ResearchNote[] {
  return notes.filter((note) => {
    if (!matchesQuery(note, query)) return false;
    if (filter === 'unscoped') return note.matter == null;
    if (filter === 'matter') return note.matter != null;
    if (filter === 'recent') return isRecentNote(note);
    return true;
  });
}

export function recentNotes(notes: ResearchNote[], limit = 4): ResearchNote[] {
  return [...notes]
    .sort(
      (a, b) =>
        new Date(b.modified || b.created).getTime() -
        new Date(a.modified || a.created).getTime()
    )
    .slice(0, limit);
}

export function matterLabel(note: ResearchNote): string | null {
  if (note.matter == null) return null;
  const ref = note.matter_reference?.trim();
  const title = note.matter_title?.trim();
  if (ref && title) return `${ref} — ${title}`;
  return ref || title || null;
}
