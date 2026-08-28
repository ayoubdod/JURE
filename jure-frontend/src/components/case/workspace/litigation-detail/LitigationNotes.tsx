import { Button } from '@/components/ui/button';
import { LongText } from '@/components/case/case-detail-drawer/primitives';
import { useAppTranslation } from '@/i18n';
import { EmptyAction, WorkspaceCard } from './ui';
import { notesText } from './helpers';

export default function LitigationNotes({
  caseItem,
  canEdit,
  onEdit,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { t } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const notes = notesText(caseItem);
  const empty = !notes.facts && !notes.arguments && !notes.internal;

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onEdit}>
            {copy.addNote}
          </Button>
        </div>
      ) : null}
      {empty ? (
        <EmptyAction message={copy.noNotes} actionLabel={canEdit ? copy.editNotes : undefined} onAction={canEdit ? onEdit : undefined} />
      ) : (
        <>
          {notes.facts ? (
            <WorkspaceCard title={copy.facts}>
              <LongText>{notes.facts}</LongText>
            </WorkspaceCard>
          ) : null}
          {notes.arguments ? (
            <WorkspaceCard title={copy.arguments}>
              <LongText>{notes.arguments}</LongText>
            </WorkspaceCard>
          ) : null}
          {notes.internal ? (
            <WorkspaceCard title={copy.internalNotes}>
              <LongText>{notes.internal}</LongText>
            </WorkspaceCard>
          ) : null}
        </>
      )}
    </div>
  );
}
