import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { clientDisplayName, formatShortDate, nextLitigationDeadline } from '@/services/case/caseType';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import { courtLabels } from '@/components/case/workspace/litigation-detail/helpers';
import { attorneysOf, personName } from './consultation-rows';
import {
  LITIGATION_LEVEL_SECTIONS,
  litigationLevelOf,
  type LitigationLevelKey,
} from './litigationLevels';

const STORAGE_KEY = 'jure.litigation.board.open';

const DEFAULT_OPEN: Record<LitigationLevelKey, boolean> = {
  FIRST_INSTANCE: true,
  APPEAL: true,
  CASSATION: true,
  OTHER: true,
};

function readOpen(): Record<LitigationLevelKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_OPEN>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

function LitigationBoardCard({ c, onOpen }: { c: API.Case; onOpen: () => void }) {
  const { t, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.litigation;
  const court = courtLabels(c, t);
  const nextDate = nextLitigationDeadline(c);
  const priority = getCaseData(c, 'priority') as string | undefined;
  const lead = attorneysOf(c)[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-start rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-500">{c.reference || copy.noneDash}</span>
        {priority ? (
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset',
              getStatusColor(priority)
            )}
          >
            {enumPretty(priority)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-snug">{c.title}</p>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
        {clientDisplayName(c.client) || copy.noneDash}
      </p>
      {court.composed ? (
        <p className="mt-1 text-[11px] text-slate-500 truncate">{court.composed}</p>
      ) : null}
      <p className="mt-1 text-[11px] tabular-nums text-slate-500">
        {formatShortDate(nextDate) || copy.noneDash}
      </p>
      {lead ? (
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <UserAvatar
            size="xs"
            firstName={lead.first_name}
            lastName={lead.last_name}
            image={getPersonImage(lead as unknown as Record<string, unknown>)}
          />
          <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">{personName(lead)}</span>
        </div>
      ) : null}
    </button>
  );
}

export default function LitigationBoard({
  rows,
  loading,
  onOpen,
  sectionTitle,
}: {
  rows: API.Case[];
  loading: boolean;
  onOpen: (c: API.Case) => void;
  sectionTitle: (key: LitigationLevelKey) => string;
}) {
  const [openMap, setOpenMap] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {
      /* ignore */
    }
  }, [openMap]);

  const toggle = (key: LitigationLevelKey) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleSections = LITIGATION_LEVEL_SECTIONS.filter(
    (section) => section.key !== 'OTHER' || rows.some((c) => litigationLevelOf(c) === 'OTHER')
  );
  const cols = visibleSections.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3';

  return (
    <div className={cn('grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:items-stretch h-full min-h-0', cols)}>
      {visibleSections.map((col) => {
        const items = rows.filter((c) => litigationLevelOf(c) === col.key);
        const isOpen = openMap[col.key];
        return (
          <div
            key={col.key}
            className={cn(
              'flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 border-l-[3px] dark:border-slate-800',
              col.accent,
              isOpen ? 'md:h-full' : 'self-start'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(col.key)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start',
                'border-b border-slate-200/80 dark:border-slate-800/80',
                'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                    col.header,
                    !isOpen && '-rotate-90 rtl:rotate-90'
                  )}
                  aria-hidden
                />
                <span className={cn('text-[11px] font-semibold uppercase tracking-[0.06em]', col.header)}>
                  {sectionTitle(col.key)}
                </span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  col.count
                )}
              >
                {items.length}
              </span>
            </button>
            {isOpen ? (
              <div className={cn('flex-1 min-h-0 overflow-y-auto p-2 space-y-2', loading && 'opacity-60')}>
                {items.map((c) => (
                  <LitigationBoardCard key={c.id} c={c} onOpen={() => onOpen(c)} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
