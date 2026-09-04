import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { clientContactPerson, clientDisplayName } from '@/services/case/caseType';

export function CaseClientLabel({
  client,
  fallback,
  nameClassName,
  presentedClassName,
}: {
  client?: API.User | null;
  fallback?: string;
  nameClassName?: string;
  presentedClassName?: string;
}) {
  const { t, tf } = useAppTranslation();
  const name = clientDisplayName(client);
  const person = clientContactPerson(client);
  if (!name) return <>{fallback ?? null}</>;
  const presented = person ? tf(t.clients.profile.presentedBy, { name: person }) : '';
  return (
    <span className="block min-w-0">
      <span className={cn('block break-words', nameClassName)} title={name}>
        {name}
      </span>
      {presented ? (
        <span
          className={cn(
            'mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400',
            presentedClassName
          )}
          title={presented}
        >
          {presented}
        </span>
      ) : null}
    </span>
  );
}
