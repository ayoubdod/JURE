import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAppTranslation, formatDate } from '@/i18n';
import { apiGetPortalCase, type PortalCaseDetail } from '@/services/portal/api';
import { Button } from '@/components/ui/button';
import { ClientPageHeader } from '@/components/client/ClientPageHeader';

const ClientCaseDetailPage = () => {
  const { caseId } = useParams();
  const { t, tf, lang, enumPretty } = useAppTranslation();
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
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ms-2">
          <Link to="/client/cases">{cp.common.back}</Link>
        </Button>
        <ClientPageHeader
          title={data.title}
          subtitle={`${tf(cp.cases.referenceLabel, { ref: data.reference })} · ${enumPretty(data.status) || data.status}`}
        />
        <p className="text-[14px] text-[#0F172A] dark:text-slate-100">
          {cp.cases.matterLine[data.status] || cp.cases.matterLine.DEFAULT}
        </p>
      </div>

      <dl className="grid gap-4 border-y border-[#E2E8F0] py-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800">
        <div>
          <dt className="text-[12px] text-[#64748B]">{cp.cases.type}</dt>
          <dd className="mt-1 text-[#0F172A] dark:text-slate-100">{enumPretty(data.caseType) || data.caseType}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-[#64748B]">{cp.cases.lawyer}</dt>
          <dd className="mt-1 text-[#0F172A] dark:text-slate-100">{data.assignedLawyer?.fullName || '—'}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-[#64748B]">{cp.cases.lawFirm}</dt>
          <dd className="mt-1 text-[#0F172A] dark:text-slate-100">{data.lawFirm || '—'}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-[#64748B]">{cp.cases.opened}</dt>
          <dd className="mt-1 text-[#0F172A] dark:text-slate-100">
            {formatDate(data.openedAt, lang, { day: 'numeric', month: 'long', year: 'numeric' })}
          </dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-[18px] font-semibold tracking-tight text-[#2F2450] dark:text-slate-100">{cp.cases.timeline}</h2>
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
        <h2 className="text-[18px] font-semibold tracking-tight text-[#2F2450] dark:text-slate-100">{cp.cases.documents}</h2>
        {data.documents.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noDocuments}</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0] dark:divide-zinc-800 dark:border-zinc-800">
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
        <h2 className="text-[18px] font-semibold tracking-tight text-[#2F2450] dark:text-slate-100">{cp.cases.updates}</h2>
        {data.updates.length === 0 ? (
          <p className="text-sm text-slate-500">{cp.empty.noUpdates}</p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0] dark:divide-zinc-800 dark:border-zinc-800">
            {data.updates.map((u) => (
              <li
                key={u.id}
                className="py-4"
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
        <h2 className="text-[18px] font-semibold tracking-tight text-[#2F2450] dark:text-slate-100">{cp.cases.requiredActions}</h2>
        <p className="text-sm text-slate-500">{cp.empty.noActions}</p>
      </section>
    </div>
  );
};

export default ClientCaseDetailPage;
