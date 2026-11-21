import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAppTranslation, formatDate } from '@/i18n';
import { apiListPortalCases, type PortalCaseListItem } from '@/services/portal/api';
import { Button } from '@/components/ui/button';
import { ClientPageHeader } from '@/components/client/ClientPageHeader';
import { cn } from '@/lib/utils';

function statusDot(status: string) {
  if (status === 'CANCELLED') return 'bg-rose-500';
  if (status === 'PENDING') return 'bg-amber-500';
  if (status === 'CLOSED' || status === 'ARCHIVED') return 'bg-slate-300';
  return 'bg-emerald-500';
}

const ClientCasesPage = () => {
  const { t, tf, lang, enumPretty } = useAppTranslation();
  const cp = t.clientPortal;
  const [cases, setCases] = useState<PortalCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiListPortalCases()
      .then((res) => {
        if (!cancelled) setCases(res.data);
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
  }, [attempt]);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />;
  }
  if (error) {
    return (
      <div role="alert" className="py-6">
        <p className="text-sm text-[#2F2450] dark:text-slate-100">{cp.errors.loadFailed}</p>
        <Button
          type="button"
          className="mt-4 bg-[#64499D] text-white hover:bg-[#4D3680]"
          onClick={() => setAttempt((value) => value + 1)}
        >
          {cp.errors.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader title={cp.cases.title} subtitle={cp.cases.subtitle} />

      {cases.length === 0 ? (
        <div className="border-t border-[#E2E8F0] pt-6 dark:border-zinc-800">
          <p className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100">{cp.empty.noCasesTitle}</p>
          <p className="mt-1 text-[13px] text-[#64748B]">{cp.empty.noCasesBody}</p>
          <Button asChild className="mt-4 bg-[#64499D] text-white hover:bg-[#4D3680]" size="sm">
            <Link to="/client/consultations/new">{cp.cta.requestConsultation}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((matter) => {
            const lawyer = matter.assignedLawyer?.fullName;
            return (
              <li key={matter.id}>
                <Link
                  to={`/client/cases/${matter.id}`}
                  className="block rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors duration-200 ease-out hover:bg-[#F7F4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D] sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-white/[0.04]"
                >
                  <article>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[18px] font-semibold tracking-tight text-[#2F2450] dark:text-slate-100">
                          {matter.title}
                        </h2>
                        <p className="mt-1 text-[13px] text-[#64748B]">
                          {tf(cp.cases.referenceLabel, { ref: matter.reference })}
                          {' · '}
                          {enumPretty(matter.caseType) || matter.caseType}
                        </p>
                      </div>
                      <p className="inline-flex items-center gap-2 text-[13px] text-[#0F172A] dark:text-slate-100">
                        <span className={cn('h-1.5 w-1.5 rounded-full', statusDot(matter.status))} aria-hidden />
                        {enumPretty(matter.status) || matter.status}
                      </p>
                    </div>

                    <dl className="mt-4 grid gap-3 border-t border-[#E2E8F0] pt-4 text-[13px] sm:grid-cols-2 dark:border-zinc-800">
                      <div>
                        <dt className="text-[12px] text-[#64748B]">
                          {lawyer ? cp.cases.lawyer : cp.cases.lawFirm}
                        </dt>
                        <dd className="mt-0.5 text-[#0F172A] dark:text-slate-100">
                          {lawyer || matter.lawFirm || '—'}
                          {lawyer && matter.lawFirm ? (
                            <span className="mt-0.5 block text-[12px] text-[#64748B]">{matter.lawFirm}</span>
                          ) : null}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[12px] text-[#64748B]">{cp.cases.lastUpdate}</dt>
                        <dd className="mt-0.5 text-[#0F172A] dark:text-slate-100">
                          {formatDate(matter.updatedAt, lang, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-[13px] text-[#0F172A] dark:text-slate-200">
                      {cp.cases.matterLine[matter.status] || cp.cases.matterLine.DEFAULT}
                    </p>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ClientCasesPage;
