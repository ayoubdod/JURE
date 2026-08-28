import { formatDateTime, useAppTranslation } from '@/i18n';
import {
  formatDrawerDateTime,
  formatUserDisplayName,
  getCaseUpdatedAtIso,
  getCaseUpdatedByUser,
} from '@/components/case/case-detail-drawer/format';
import { Field } from '@/components/case/case-detail-drawer/primitives';
import { EmptyAction, WorkspaceCard } from './ui';

export default function LitigationActivity({ caseItem }: { caseItem: API.Case }) {
  const { t, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const pw = t.cases.pageWorkspace;
  const activity = caseItem.activity ?? [];

  return (
    <WorkspaceCard title={copy.recentActivity}>
      {activity.length ? (
        <ol className="space-y-3">
          {activity.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
              <p className="text-[13px] font-medium text-slate-800 dark:text-zinc-100">{item.message}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {item.created ? formatDateTime(item.created, lang) : ''}
                {item.actor ? ` · ${[item.actor.first_name, item.actor.last_name].filter(Boolean).join(' ')}` : ''}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-4">
          <EmptyAction message={copy.noActivity} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.cases.modal.created}>
              <div>
                {formatDrawerDateTime(caseItem.created)}
                <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(caseItem.created_by)}</p>
              </div>
            </Field>
            <Field label={pw.activityTitle}>
              <div>
                {formatDrawerDateTime(getCaseUpdatedAtIso(caseItem))}
                <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(getCaseUpdatedByUser(caseItem))}</p>
              </div>
            </Field>
          </div>
        </div>
      )}
    </WorkspaceCard>
  );
}
