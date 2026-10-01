import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { apiGetPortalCase, type PortalCaseDetail } from '@/services/portal/api';
import { Button } from '@/components/ui/button';

const ClientCaseDetailPage = () => {
  const { caseId } = useParams();
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const [data, setData] = useState<PortalCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    apiGetPortalCase(caseId)
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-slate-200" />;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-600">{cp.errors.loadFailed}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/client/cases">{cp.common.back}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2">
          <Link to="/client/cases">{cp.common.back}</Link>
        </Button>
        <h1 className="font-serif text-3xl text-[#2F2450]">{data.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.reference} · {data.status}
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.cases.type}</p>
          <p className="mt-1">{data.caseType}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.cases.lawyer}</p>
          <p className="mt-1">{data.assignedLawyer?.fullName || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.cases.lawFirm}</p>
          <p className="mt-1">{data.lawFirm || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-400">{cp.cases.opened}</p>
          <p className="mt-1">{new Date(data.openedAt).toLocaleDateString()}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.cases.timeline}</h2>
        {data.timeline.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noTimeline}</p>
        ) : (
          <ol className="relative space-y-4 border-s border-slate-200 ps-6 dark:border-zinc-700">
            {data.timeline.map((ev) => (
              <li key={String(ev.id)} className="relative">
                <span className="absolute -start-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#64499D]" />
                <p className="text-sm font-medium">{ev.message}</p>
                <p className="text-xs text-slate-400">
                  {ev.created ? new Date(ev.created).toLocaleString() : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.cases.documents}</h2>
        {data.documents.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noDocuments}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {data.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-slate-400">
                    {doc.uploadedBy} · {new Date(doc.date).toLocaleDateString()}
                  </p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#64499D] hover:underline"
                  >
                    {cp.common.download}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.cases.updates}</h2>
        {data.updates.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noUpdates}</p>
        ) : (
          <ul className="space-y-3">
            {data.updates.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <blockquote className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  “{u.content}”
                </blockquote>
                <p className="mt-2 text-xs text-slate-400">
                  {u.authorName} · {new Date(u.created).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{cp.cases.requiredActions}</h2>
        <p className="text-sm text-slate-500">{cp.empty.noActions}</p>
      </section>
    </div>
  );
};

export default ClientCaseDetailPage;
