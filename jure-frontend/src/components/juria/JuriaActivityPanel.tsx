import React from 'react';
import dayjs from 'dayjs';
import useJuriaStore from '@/stores/juriaStore';
import UserAvatar from '@/components/common/UserAvatar';
import { useAppTranslation } from '@/i18n';

export function JuriaActivityPanel() {
  const { t } = useAppTranslation();
  const labels = t.juria.workspace.activity.labels;
  const empty = t.juria.workspace.activity.empty;
  const activities = useJuriaStore((s) => s.activities);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-xl space-y-2">
        {activities.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">{empty}</p>
        )}
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
          >
            {a.actor ? (
              <UserAvatar
                image={a.actor.image}
                firstName={a.actor.first_name}
                lastName={a.actor.last_name}
                size="xs"
              />
            ) : (
              <div className="h-7 w-7" />
            )}
            <div>
              <p className="text-[13px] text-slate-800 dark:text-slate-100">
                {labels[a.action as keyof typeof labels] || a.action}
              </p>
              <p className="text-[11px] text-slate-400">{dayjs(a.created_at).format('DD MMM YYYY HH:mm')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
