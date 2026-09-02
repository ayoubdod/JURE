import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import NotesWorkspace from '@/components/notes/NotesWorkspace';

export default function NotesPage() {
  const [params, setParams] = useSearchParams();
  const startCreate = params.get('new') === '1';
  const openNoteId = Number(params.get('note'));

  const onConsumedStartCreate = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div className="h-full min-h-0">
      <NotesWorkspace
        startCreate={startCreate}
        openNoteId={Number.isFinite(openNoteId) && openNoteId > 0 ? openNoteId : null}
        onConsumedStartCreate={onConsumedStartCreate}
      />
    </div>
  );
}
