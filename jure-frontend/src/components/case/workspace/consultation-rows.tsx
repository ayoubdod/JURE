import React from 'react';
import { Building2, Phone, Video } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { formatDate, formatTime, type AppMessages, type Lang } from '@/i18n';
import { cn } from '@/lib/utils';
import { clientDisplayName } from '@/services/case/caseType';
import { getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { getCaseData } from '@/utils/caseCardHelpers';

export type ConsultationCopy = AppMessages['cases']['workspaces']['consultation'];
export type Tf = (template: string, vars: Record<string, string | number>) => string;

export function thClass() {
  return 'text-start py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-[0.08em] rtl:normal-case rtl:tracking-normal';
}

export function tdClass() {
  return 'px-3 py-2.5 align-middle text-[12px] text-slate-700 dark:text-slate-300 text-start';
}

export function attorneysOf(c: API.Case): API.User[] {
  if (c.assigned_attorneys?.length) return c.assigned_attorneys;
  return c.assigned_to ? [c.assigned_to] : [];
}

export function personName(u: API.User) {
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || '';
}

export function DateCell({
  iso,
  lang,
  copy,
  tf,
}: {
  iso?: string;
  lang: Lang;
  copy: ConsultationCopy;
  tf: Tf;
}) {
  if (!iso) return <span>{copy.noneDash}</span>;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span>{copy.noneDash}</span>;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  const time = formatTime(d, lang, { hour: '2-digit', minute: '2-digit' });
  let label = formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  let tone = 'text-slate-800 dark:text-zinc-100';
  if (dayDiff === 0) {
    label = copy.dateToday;
    tone = 'text-[#64499D]';
    if (mins > 0 && mins <= 90) label = tf(copy.inMinutes, { minutes: mins });
  } else if (dayDiff === 1) {
    label = copy.tomorrow;
  } else if (dayDiff < 0) {
    tone = 'text-slate-500';
  }
  return (
    <div className="leading-tight">
      <p className={cn('font-medium', tone)}>{label}</p>
      <p className="text-[11px] tabular-nums text-slate-500">{time}</p>
    </div>
  );
}

export function FormatCell({
  format,
  videoLink,
  address,
  copy,
  enumPretty,
}: {
  format?: string;
  videoLink?: string;
  address?: string;
  copy: { join: string };
  enumPretty: (v: string) => string;
}) {
  if (!format) return <span>—</span>;
  const Icon = format === 'PHONE' ? Phone : format === 'VIDEO' ? Video : Building2;
  const node = (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800">
      <Icon className="h-3 w-3" />
      {enumPretty(format)}
    </span>
  );
  if (format === 'VIDEO' && videoLink) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {node}
        <a
          href={videoLink}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-[#64499D] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {copy.join}
        </a>
      </span>
    );
  }
  if (format === 'IN_PERSON' && address) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{node}</span>
        </TooltipTrigger>
        <TooltipContent>{address}</TooltipContent>
      </Tooltip>
    );
  }
  return node;
}

export function AttorneyCell({
  users,
  copy,
  tf,
}: {
  users: API.User[];
  copy: { moreAttorneys: string };
  tf: (s: string, v?: Record<string, string | number>) => string;
}) {
  if (!users.length) return <span>—</span>;
  const first = users[0];
  const extra = users.length - 1;
  return (
    <div className="flex items-center gap-1.5">
      <UserAvatar
        firstName={first.first_name}
        lastName={first.last_name}
        image={getPersonImage(first as unknown as Record<string, unknown>)}
        size="xs"
      />
      <span className="max-w-[9rem] truncate">{personName(first)}</span>
      {extra > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-zinc-800">
              {tf(copy.moreAttorneys, { count: extra })}
            </span>
          </TooltipTrigger>
          <TooltipContent>{users.slice(1).map(personName).join(', ')}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function ConsultationRow({
  c,
  zebra,
  copy,
  enumPretty,
  lang,
  tf,
  onOpen,
  onFollow,
  onClient,
  onOpenCase,
  actions,
}: {
  c: API.Case;
  zebra: boolean;
  copy: ConsultationCopy;
  enumPretty: (v: string | null | undefined) => string;
  lang: Lang;
  tf: Tf;
  onOpen: () => void;
  onFollow: () => void;
  onClient: (e: React.MouseEvent) => void;
  onOpenCase: (id: number) => void;
  actions: React.ReactNode;
}) {
  const ctype = getCaseData(c, 'consultation_type') as string | undefined;
  const domain = getCaseData(c, 'legal_domain') as string | undefined;
  const customDomain = getCaseData(c, 'custom_legal_domain') as string | undefined;
  const dt = getCaseData(c, 'consultation_date') as string | undefined;
  const format = getCaseData(c, 'format') as string | undefined;
  const videoLink = getCaseData(c, 'video_link') as string | undefined;
  const address = [getCaseData(c, 'address'), getCaseData(c, 'city')].filter(Boolean).join(', ');
  const converted = getConvertedToCase(c);
  const followCount = c.followUpCount ?? 0;
  const followRequired = Boolean(getCaseData(c, 'follow_up_required'));
  const domainLabel = domain === 'OTHER' && customDomain ? customDomain : domain ? enumPretty(domain) : '—';

  return (
    <tr
      className={cn(
        'group cursor-pointer border-b border-slate-100 dark:border-slate-800/60',
        zebra ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/40 dark:bg-slate-900/20',
        'hover:bg-[#F7F4FF] hover:shadow-[inset_3px_0_0_0_#64499D] rtl:hover:shadow-[inset_-3px_0_0_0_#64499D] dark:hover:bg-[#24183F]/50'
      )}
      onClick={onOpen}
    >
      <td className={cn(tdClass(), 'font-mono text-[11px] text-slate-600')}>
        <button type="button" className="hover:text-[#64499D] hover:underline" onClick={onOpen}>
          {c.reference || copy.noneDash}
        </button>
      </td>
      <td className={tdClass()}>
        <p className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{c.title}</p>
        {ctype ? (
          <span className="mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/80 dark:ring-zinc-800">
            {enumPretty(ctype)}
          </span>
        ) : null}
      </td>
      <td className={cn(tdClass(), 'hidden md:table-cell')}>
        {c.client ? (
          <button type="button" className="text-start hover:text-[#64499D] hover:underline" onClick={onClient}>
            {clientDisplayName(c.client)}
          </button>
        ) : (
          copy.noneDash
        )}
      </td>
      <td className={tdClass()}>
        <DateCell iso={dt} lang={lang} copy={copy} tf={tf} />
      </td>
      <td className={cn(tdClass(), 'hidden md:table-cell')}>
        <FormatCell format={format} videoLink={videoLink} address={address} copy={copy} enumPretty={enumPretty} />
      </td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>
        <span className="inline-flex rounded bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70 dark:bg-zinc-900 dark:text-zinc-300">
          {domainLabel}
        </span>
      </td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>
        <AttorneyCell users={attorneysOf(c)} copy={copy} tf={tf} />
      </td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>
        <button
          type="button"
          className={cn('text-start', followRequired && 'font-medium text-amber-700 dark:text-amber-400')}
          onClick={(e) => {
            e.stopPropagation();
            onFollow();
          }}
        >
          {followRequired
            ? copy.followRequired
            : followCount > 0
              ? tf(copy.followCount, { count: followCount })
              : copy.followNone}
        </button>
      </td>
      <td className={cn(tdClass(), 'hidden lg:table-cell font-mono text-[11px]')}>
        {converted ? (
          <button
            type="button"
            className="text-[#64499D] hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCase(converted.id);
            }}
          >
            {converted.reference}
          </button>
        ) : (
          copy.noneDash
        )}
      </td>
      <td className={cn(tdClass(), 'text-end')} onClick={(e) => e.stopPropagation()}>
        {actions}
      </td>
    </tr>
  );
}

export function ConsultationMobileCard({
  c,
  copy,
  enumPretty,
  lang,
  tf,
  onOpen,
  actions,
}: {
  c: API.Case;
  copy: ConsultationCopy;
  enumPretty: (v: string | null | undefined) => string;
  lang: Lang;
  tf: Tf;
  onOpen: () => void;
  actions: React.ReactNode;
}) {
  const ctype = getCaseData(c, 'consultation_type') as string | undefined;
  const dt = getCaseData(c, 'consultation_date') as string | undefined;
  const format = getCaseData(c, 'format') as string | undefined;
  const lead = attorneysOf(c)[0];
  return (
    <article
      className="bg-white/80 px-4 py-3 dark:bg-slate-950/60"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{c.reference}</span>
        <div onClick={(e) => e.stopPropagation()}>{actions}</div>
      </div>
      <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{c.title}</h3>
      {ctype ? (
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{enumPretty(ctype)}</p>
      ) : null}
      <p className="mt-1.5 text-[12px] text-slate-600">{clientDisplayName(c.client) || copy.noneDash}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
        <DateCell iso={dt} lang={lang} copy={copy} tf={tf} />
        {format ? <span>{enumPretty(format)}</span> : null}
      </div>
      {lead ? <p className="mt-1 text-[12px] text-slate-600">{personName(lead)}</p> : null}
    </article>
  );
}
