import { Button } from '@/components/ui/button';
import { formatDate, useAppTranslation } from '@/i18n';
import { EmptyAction, WorkspaceCard } from './ui';
import { requiredDocumentsOf } from './helpers';

export default function LitigationDocuments({
  caseItem,
  canEdit,
  onUpload,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  onUpload: () => void;
}) {
  const { t, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const required = requiredDocumentsOf(caseItem);
  const attachments = caseItem.attachments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit ? (
          <Button type="button" className="h-9 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]" onClick={onUpload}>
            {copy.addDocument}
          </Button>
        ) : null}
      </div>

      {required.length ? (
        <WorkspaceCard title={copy.requiredDocuments}>
          <ul className="space-y-2">
            {required.map((doc) => (
              <li
                key={doc.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-[13px] dark:border-zinc-800"
              >
                <span>{doc.label}</span>
                <span className={doc.completed ? 'text-emerald-600' : 'text-amber-600'}>
                  {doc.completed ? copy.complete : copy.missing}
                </span>
              </li>
            ))}
          </ul>
        </WorkspaceCard>
      ) : null}

      <WorkspaceCard title={copy.documents}>
        {attachments.length ? (
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-[13px] dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{att.file_name}</p>
                  {att.created ? (
                    <p className="text-[11px] text-slate-500">
                      {copy.uploadedOn} {formatDate(att.created, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  ) : null}
                </div>
                {att.file_url ? (
                  <a className="shrink-0 text-[12px] text-[#64499D]" href={att.file_url} target="_blank" rel="noreferrer">
                    {copy.viewAll}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyAction message={copy.noDocuments} actionLabel={canEdit ? copy.addDocument : undefined} onAction={canEdit ? onUpload : undefined} />
        )}
      </WorkspaceCard>
    </div>
  );
}
