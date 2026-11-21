import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, MessageSquare, Scale } from 'lucide-react';
import { useAppTranslation, formatDate } from '@/i18n';
import { apiGetPortalDashboard, type PortalDashboard } from '@/services/portal/api';
import type { ConsultationListItem } from '@/services/consultations/api';
import { Button } from '@/components/ui/button';
import { ConsultationStatusBadge } from '@/components/client/ConsultationStatusBadge';
import { cn } from '@/lib/utils';

const INK = 'text-[#2F2450] dark:text-slate-100';
const MUTED = 'text-[#64748B] dark:text-slate-400';
const HAIRLINE = 'border-[#E2E8F0] dark:border-zinc-800';
const ROW =
  'border-b border-[#E2E8F0] transition-colors duration-200 ease-out last:border-b-0 hover:bg-[#F7F4FF] focus-visible:bg-[#F7F4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D] dark:border-zinc-800 dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]';

type AttentionItem = {
  id: string;
  kind: 'alert' | 'message' | 'counsel';
  text: string;
  href: string;
  cta: string;
};

const ClientHomePage = () => {
  const { t, tf, lang, enumPretty } = useAppTranslation();
  const cp = t.clientPortal;
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    apiGetPortalDashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const consultations = data?.pendingConsultations ?? [];
  const cases = data?.recentCases ?? [];

  const attention = useMemo<AttentionItem[]>(() => {
    if (!data) return [];
    const items: AttentionItem[] = [];
    for (const item of consultations) {
      if (item.status !== 'NEEDS_INFORMATION' || items.length >= 2) continue;
      items.push({
        id: `info-${item.id}`,
        kind: 'alert',
        text: tf(cp.home.needsInformation, { subject: item.subject }),
        href: `/client/consultations/${item.id}`,
        cta: cp.home.provideInformation,
      });
    }
    if (data.unreadMessagesCount > 0) {
      items.push({
        id: 'unread',
        kind: 'message',
        text:
          data.unreadMessagesCount === 1
            ? cp.home.unreadOne
            : tf(cp.home.unreadMany, { count: data.unreadMessagesCount }),
        href: '/client/messages',
        cta: cp.home.readMessages,
      });
    }
    for (const item of consultations) {
      if (item.status !== 'CONFIRMED' && item.status !== 'ASSIGNED') continue;
      if (items.length >= 3) break;
      const lawyer = item.assignedLawyerName?.trim();
      if (item.status === 'ASSIGNED' && !lawyer) continue;
      const text =
        item.status === 'CONFIRMED'
          ? lawyer
            ? tf(cp.home.confirmedWithLawyer, { subject: item.subject, lawyer })
            : tf(cp.home.confirmed, { subject: item.subject })
          : tf(cp.home.lawyerAssigned, { subject: item.subject, lawyer: lawyer ?? '' });
      items.push({
        id: `consult-${item.id}`,
        kind: 'counsel',
        text,
        href: item.chatAvailable ? '/client/messages' : `/client/consultations/${item.id}`,
        cta: item.chatAvailable ? cp.home.readMessages : cp.home.openRequest,
      });
    }
    return items.slice(0, 3);
  }, [consultations, cp.home, data, tf]);

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">{cp.home.loadingLabel}</span>
        <div className="space-y-3">
          <div className="h-8 w-64 max-w-full animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
        </div>
        <div className="h-20 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-16 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-40 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="py-8">
        <p className={cn('text-sm', INK)}>{cp.errors.loadFailed}</p>
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
    <div className="space-y-10">
      <header>
        <h1 className={cn('text-[28px] font-semibold tracking-tight sm:text-[30px]', INK)}>
          {tf(cp.home.greeting, { name: data.clientName })}
        </h1>
        <p className={cn('mt-1.5 max-w-2xl text-[14px] leading-relaxed', MUTED)}>{cp.home.subtitle}</p>
      </header>

      <section aria-labelledby="client-attention-heading">
        <h2 id="client-attention-heading" className={cn('text-[18px] font-semibold tracking-tight', INK)}>
          {cp.home.attentionTitle}
        </h2>
        {attention.length === 0 ? (
          <p className={cn('mt-3 border-t pt-3 text-[14px] leading-relaxed', HAIRLINE, MUTED)}>
            {cp.home.attentionClear}
          </p>
        ) : (
          <ul className={cn('mt-3 divide-y overflow-hidden rounded-xl border bg-[#F7F4FF] dark:bg-jure-900/30', HAIRLINE, 'dark:divide-zinc-800')}>
            {attention.map((item) => {
              const Icon =
                item.kind === 'alert' ? AlertCircle : item.kind === 'message' ? MessageSquare : Scale;
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        item.kind === 'alert' ? 'text-amber-700' : 'text-[#64499D]',
                      )}
                      aria-hidden
                    />
                    <p className="min-w-0 text-[14px] leading-relaxed text-[#0F172A] dark:text-slate-100">
                      {item.text}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to={item.href}>{item.cta}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-label={`${cp.home.activeCases}, ${cp.home.pendingRequests}, ${cp.home.unreadMessages}`}
        className={cn('grid border-y sm:grid-cols-3', HAIRLINE)}
      >
        <CountLink to="/client/cases" label={cp.home.activeCases} value={data.activeCasesCount} />
        <CountLink
          to="/client/consultations"
          label={cp.home.pendingRequests}
          value={data.pendingConsultationsCount}
          divided
        />
        <CountLink
          to="/client/messages"
          label={cp.home.unreadMessages}
          value={data.unreadMessagesCount}
          divided
          emphasize={data.unreadMessagesCount > 0}
        />
      </section>

      <section aria-labelledby="client-cases-heading">
        <SectionTitle
          id="client-cases-heading"
          title={cp.home.myCases}
          to="/client/cases"
          action={cp.common.viewAll}
        />
        {cases.length === 0 ? (
          <EmptyLine title={cp.empty.noCasesTitle} body={cp.empty.noCasesBody} />
        ) : (
          <ul className={cn('mt-3 border-t', HAIRLINE)}>
            {cases.map((matter) => (
              <li key={matter.id}>
                <Link to={`/client/cases/${matter.id}`} className={cn('block px-1 py-3.5 sm:px-2', ROW)}>
                  <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-[#0F172A] dark:text-slate-100">
                        {matter.title}
                      </span>
                      <span className={cn('mt-1 block truncate text-[12px]', MUTED)}>
                        {tf(cp.cases.referenceLabel, { ref: matter.reference })}
                        {' · '}
                        {enumPretty(matter.caseType) || matter.caseType}
                        {' · '}
                        {enumPretty(matter.status) || matter.status}
                        {matter.assignedLawyer ? ` · ${matter.assignedLawyer}` : ''}
                      </span>
                    </span>
                    <span className={cn('shrink-0 text-[12px]', MUTED)}>
                      {tf(cp.home.updatedOn, {
                        date: formatDate(matter.updatedAt, lang, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }),
                      })}
                    </span>
                  </span>
                  <span className={cn('mt-1.5 block text-[13px]', MUTED)}>
                    {cp.cases.matterLine[matter.status] || cp.cases.matterLine.DEFAULT}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="client-consultations-heading">
        <SectionTitle
          id="client-consultations-heading"
          title={cp.home.myConsultations}
          to="/client/consultations"
          action={cp.common.viewAll}
        />
        {consultations.length === 0 ? (
          <EmptyLine title={cp.empty.noConsultationsTitle} body={cp.empty.noConsultationsBody} />
        ) : (
          <ul className={cn('mt-3 border-t', HAIRLINE)}>
            {consultations.map((item) => (
              <ConsultationRow
                key={item.id}
                item={item}
                statusLabel={cp.status[item.status] || item.status}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

function SectionTitle({
  id,
  title,
  to,
  action,
}: {
  id: string;
  title: string;
  to: string;
  action: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className={cn('text-[18px] font-semibold tracking-tight', INK)}>
        {title}
      </h2>
      <Link
        to={to}
        className="text-[13px] font-medium text-[#64499D] transition-colors duration-200 ease-out hover:text-[#4D3680]"
      >
        {action}
      </Link>
    </div>
  );
}

function CountLink({
  to,
  label,
  value,
  divided,
  emphasize,
}: {
  to: string;
  label: string;
  value: number;
  divided?: boolean;
  emphasize?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'block px-1 py-4 transition-colors duration-200 ease-out hover:bg-[#F7F4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#64499D] dark:hover:bg-white/[0.04] sm:px-4',
        divided && 'border-t sm:border-s sm:border-t-0',
        HAIRLINE,
      )}
    >
      <span className={cn('block text-[12px]', MUTED)}>{label}</span>
      <span
        className={cn(
          'mt-1 block text-[26px] font-semibold tabular-nums leading-none',
          emphasize ? 'text-[#64499D]' : INK,
        )}
      >
        {value}
      </span>
    </Link>
  );
}

function EmptyLine({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn('mt-3 border-t pt-4', HAIRLINE)}>
      <p className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100">{title}</p>
      <p className={cn('mt-1 text-[13px] leading-relaxed', MUTED)}>{body}</p>
    </div>
  );
}

function ConsultationRow({ item, statusLabel }: { item: ConsultationListItem; statusLabel: string }) {
  return (
    <li>
      <Link
        to={`/client/consultations/${item.id}`}
        className={cn('flex flex-wrap items-center justify-between gap-2 px-1 py-3.5 sm:px-2', ROW)}
      >
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-[#0F172A] dark:text-slate-100">
            {item.subject}
          </span>
          <span className={cn('mt-1 block text-[12px]', MUTED)}>{item.reference}</span>
        </span>
        <ConsultationStatusBadge status={item.status} label={statusLabel} quiet />
      </Link>
    </li>
  );
}

export default ClientHomePage;
