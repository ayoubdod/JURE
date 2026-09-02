import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import NotesWorkspace from '@/components/notes/NotesWorkspace';
import { useAppTranslation } from '@/i18n';
import {
  apiGetResearchNotes,
  unwrapResearchNoteCount,
} from '@/services/research-notes/api';

type Props = {
  /** When opened from a matter, notes are scoped and saved to that case. */
  caseId?: number;
  matterTitle?: string;
  matterReference?: string;
};

export default function ResearchNotebookCard({ caseId, matterTitle, matterReference }: Props) {
  const { t, tf } = useAppTranslation();
  const n = t.dashboard.notebook;
  const notesCopy = t.notes;
  const navigate = useNavigate();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (caseId != null) return;
    let cancelled = false;
    apiGetResearchNotes({ page_size: 1 })
      .then((res) => {
        if (!cancelled) setCount(unwrapResearchNoteCount(res.data));
      })
      .catch((err) => {
        if (!cancelled && isAxiosError(err)) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (caseId != null) {
    return (
      <NotesWorkspace
        embedded
        caseId={caseId}
        matterTitle={matterTitle}
        matterReference={matterReference}
      />
    );
  }

  const countLabel =
    count == null
      ? n.loading
      : count === 0
        ? n.countZero
        : count === 1
          ? notesCopy.countOne
          : tf(notesCopy.count, { count });

  return (
    <DashboardCollapsibleCard
      className="rounded-2xl"
      title={n.title}
      description={n.description}
      contentClassName="space-y-4"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EBFA] text-[#64499D] dark:bg-[#64499D]/20">
          <StickyNote className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{countLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-lg bg-[#64499D] text-white hover:bg-[#543d86]"
          onClick={() => navigate('/dashboard/notes')}
        >
          {n.openMyNotes}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-lg"
          onClick={() => navigate('/dashboard/notes?new=1')}
        >
          <Plus className="me-1.5 h-3.5 w-3.5" />
          {n.newNote}
        </Button>
      </div>
    </DashboardCollapsibleCard>
  );
}
