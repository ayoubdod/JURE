import { ArrowLeft, Pencil, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime, useAppTranslation } from '@/i18n';
import type { ResearchNote } from '@/services/research-notes/api';
import { matterLabel } from '@/components/notes/noteUtils';

type Props = {
  note: ResearchNote;
  onBack: () => void;
  onEdit: (note: ResearchNote) => void;
};

export default function NoteDetail({ note, onBack, onEdit }: Props) {
  const { t, lang, dir } = useAppTranslation();
  const n = t.notes;
  const matter = matterLabel(note);

  return (
    <article className="mx-auto max-w-3xl">
      <Button type="button" variant="ghost" className="-ms-2 mb-5 h-9 rounded-lg px-2" onClick={onBack}>
        <ArrowLeft className={`me-1.5 h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        {n.back}
      </Button>

      <div className="rounded-[16px] border border-[#E8EAF0] bg-white px-5 py-6 sm:px-8 sm:py-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {note.title}
            </h2>
            {note.citation ? (
              <p className="mt-1.5 text-[14px] text-slate-500 dark:text-slate-400">{note.citation}</p>
            ) : null}
          </div>
          <Button
            type="button"
            className="shrink-0 rounded-lg bg-[#64499D] text-white hover:bg-[#543d86]"
            onClick={() => onEdit(note)}
          >
            <Pencil className="me-1.5 h-3.5 w-3.5" />
            {t.common.edit}
          </Button>
        </div>

        <div className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E8EAF0] bg-[#F7F8FA] px-3 py-1 text-[12.5px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Scale className="h-3.5 w-3.5 shrink-0 text-[#64499D]" />
          <span className="truncate">
            {matter ? `${n.matterLabel}: ${matter}` : n.unscopedBadge}
          </span>
        </div>

        <div className="mt-8 border-t border-[#E8EAF0] pt-6 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {n.researchHeading}
          </p>
          <div className="mt-3 whitespace-pre-wrap text-[15.5px] leading-8 text-slate-700 dark:text-slate-200">
            {note.content?.trim() ? note.content : n.contentPreviewFallback}
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-[#E8EAF0] pt-5 text-[13px] sm:grid-cols-3 dark:border-slate-800">
          <div>
            <dt className="text-slate-400">{n.createdBy}</dt>
            <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
              {note.author_name || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{n.created}</dt>
            <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
              {formatDate(note.created, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{n.updatedLabel}</dt>
            <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
              {formatDateTime(note.modified, lang)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
