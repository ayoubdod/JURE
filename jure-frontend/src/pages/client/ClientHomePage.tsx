import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/i18n';
import { apiGetPortalDashboard, type PortalDashboard } from '@/services/portal/api';
import { Button } from '@/components/ui/button';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';
import type { ConsultationStatus } from '@/services/consultations/api';

const ClientHomePage = () => {
  const { t } = useAppTranslation();
  const cp = t.clientPortal;
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetPortalDashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded bg-slate-200" />
        <div className="h-24 rounded-xl bg-slate-200" />
        <div className="h-40 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-rose-600">{cp.errors.loadFailed}</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-serif text-3xl tracking-tight text-[#2F2450] dark:text-slate-100">
          {cp.home.greeting.replace('{name}', data.clientName)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {cp.home.subtitle}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-slate-400">{cp.home.activeCases}</p>
          <p className="mt-2 text-2xl font-medium">{data.activeCasesCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-slate-400">{cp.home.pendingRequests}</p>
          <p className="mt-2 text-2xl font-medium">{data.pendingConsultationsCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs uppercase tracking-wide text-slate-400">{cp.home.unreadMessages}</p>
          <p className="mt-2 text-2xl font-medium">{data.unreadMessagesCount}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{cp.home.myCases}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/client/cases">{cp.common.viewAll}</Link>
          </Button>
        </div>
        {data.recentCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">{cp.empty.noCasesTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{cp.empty.noCasesBody}</p>
            <Button asChild className="mt-4 bg-[#64499D] hover:bg-[#553d86]" size="sm">
              <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {data.recentCases.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.reference} · {c.status}
                    {c.assignedLawyer ? ` · ${c.assignedLawyer}` : ''}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/client/cases/${c.id}`}>{cp.cases.viewCase}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">{cp.home.myConsultations}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/client/consultations">{cp.common.viewAll}</Link>
          </Button>
        </div>
        {data.pendingConsultations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="font-medium">{cp.empty.noConsultationsTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{cp.empty.noConsultationsBody}</p>
            <Button asChild className="mt-4 bg-[#64499D] hover:bg-[#553d86]" size="sm">
              <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.pendingConsultations.map((item) => {
              const row = item as {
                id: number;
                subject: string;
                reference: string;
                status: ConsultationStatus;
              };
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <p className="font-medium">{row.subject}</p>
                    <p className="text-xs text-slate-500">{row.reference}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConsultationStatusBadge
                      status={row.status}
                      label={cp.status[row.status] || row.status}
                    />
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/client/consultations/${row.id}`}>{cp.common.view}</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ClientHomePage;
