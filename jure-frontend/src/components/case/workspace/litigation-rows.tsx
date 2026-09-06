import React from 'react';
import { cn } from '@/lib/utils';
import { formatShortDate, nextLitigationDeadline } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import { courtLabels } from '@/components/case/workspace/litigation-detail/helpers';
import { attorneysOf, personName, tdClass } from './consultation-rows';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import type { AppMessages } from '@/i18n/messages/types';

export type LitigationCopy = AppMessages['cases']['workspaces']['litigation'];

function EnumPill({ value, label }: { value: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
        getStatusColor(value)
      )}
    >
      {label}
    </span>
  );
}

export function LitigationRow({
  c,
  zebra,
  copy,
  t,
  enumPretty,
  onOpen,
  onClient,
  actions,
}: {
  c: API.Case;
  zebra: boolean;
  copy: LitigationCopy;
  t: AppMessages;
  enumPretty: (v: string | null | undefined) => string;
  onOpen: () => void;
  onClient: (e: React.MouseEvent) => void;
  actions: React.ReactNode;
}) {
  const miss = copy.noneDash;
  const court = courtLabels(c, t);
  const lead = attorneysOf(c)[0];
  const role = getCaseData(c, 'client_role') as string | undefined;
  const opposing = getCaseData(c, 'opposing_party') as string | undefined;
  const caseNo = getCaseData(c, 'court_case_number') as string | undefined;
  const priority = getCaseData(c, 'priority') as string | undefined;
  const nextDate = nextLitigationDeadline(c);

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
          {c.reference || miss}
        </button>
      </td>
      <td className={tdClass()}>
        <p className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{c.title}</p>
      </td>
      <td className={cn(tdClass(), 'hidden md:table-cell')}>
        {c.client ? (
          <button
            type="button"
            className="block max-w-[13rem] min-w-0 text-start hover:text-[#64499D]"
            onClick={onClient}
          >
            <CaseClientLabel
              client={c.client}
              nameClassName="truncate font-medium hover:underline"
              presentedClassName="truncate"
            />
          </button>
        ) : (
          miss
        )}
      </td>
      <td className={cn(tdClass(), 'hidden md:table-cell')}>
        {role ? enumPretty(role) : miss}
      </td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>{opposing || miss}</td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>{court.composed || miss}</td>
      <td className={cn(tdClass(), 'hidden xl:table-cell font-mono text-[11px]')}>{caseNo || miss}</td>
      <td className={cn(tdClass(), 'hidden lg:table-cell')}>
        {lead ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <UserAvatar
              size="xs"
              firstName={lead.first_name}
              lastName={lead.last_name}
              image={getPersonImage(lead)}
            />
            <span className="max-w-[9rem] truncate">{personName(lead)}</span>
          </div>
        ) : (
          miss
        )}
      </td>
      <td className={tdClass()}>
        {priority ? <EnumPill value={priority} label={enumPretty(priority) || priority} /> : miss}
      </td>
      <td className={tdClass()}>{formatShortDate(nextDate) || miss}</td>
      <td className={cn(tdClass(), 'hidden md:table-cell')}>
        <EnumPill value={c.status} label={enumPretty(c.status) || c.status} />
      </td>
      <td className={cn(tdClass(), 'text-end')} onClick={(e) => e.stopPropagation()}>
        {actions}
      </td>
    </tr>
  );
}

export function LitigationMobileCard({
  c,
  copy,
  t,
  enumPretty,
  onOpen,
  actions,
}: {
  c: API.Case;
  copy: LitigationCopy;
  t: AppMessages;
  enumPretty: (v: string | null | undefined) => string;
  onOpen: () => void;
  actions: React.ReactNode;
}) {
  const court = courtLabels(c, t);
  const nextDate = nextLitigationDeadline(c);
  const priority = getCaseData(c, 'priority') as string | undefined;
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
        <span className="font-mono text-[11px] text-slate-500">{c.reference || copy.noneDash}</span>
        <div onClick={(e) => e.stopPropagation()}>{actions}</div>
      </div>
      <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{c.title}</h3>
      <div className="mt-1.5 text-[12px] text-slate-600">
        <CaseClientLabel client={c.client} fallback={copy.noneDash} />
      </div>
      {court.composed ? (
        <p className="mt-1 text-[12px] text-slate-500">{court.composed}</p>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
        {nextDate ? <span>{formatShortDate(nextDate)}</span> : null}
        {priority ? <EnumPill value={priority} label={enumPretty(priority) || priority} /> : null}
      </div>
      {lead ? <p className="mt-1 text-[12px] text-slate-600">{personName(lead)}</p> : null}
    </article>
  );
}
