import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { apiListPortalCases, type PortalCaseListItem } from '@/services/portal/api';
import { Button } from '@/components/ui/button';

const ClientCasesPage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const [cases, setCases] = useState<PortalCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiListPortalCases()
      .then((res) => setCases(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-200" />;
  }
  if (error) {
    return <p className="text-sm text-rose-600">{cp.errors.loadFailed}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#2F2450]">{cp.cases.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{cp.cases.subtitle}</p>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="font-medium">{cp.empty.noCasesTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{cp.empty.noCasesBody}</p>
          <Button asChild className="mt-4 bg-[#64499D] hover:bg-[#553d86]" size="sm">
            <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-medium">{c.title}</h2>
                  <p className="text-sm text-slate-500">
                    {c.reference} · {c.caseType} · {c.status}
                  </p>
                  {c.lawFirm && (
                    <p className="text-sm text-slate-500">
                      {cp.cases.lawFirm}: {c.lawFirm}
                    </p>
                  )}
                  {c.assignedLawyer && (
                    <p className="text-sm text-slate-500">
                      {cp.cases.lawyer}: {c.assignedLawyer.fullName}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {cp.cases.lastUpdate}: {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/client/cases/${c.id}`}>{cp.cases.viewCase}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientCasesPage;
