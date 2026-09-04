import { useEffect, useState } from 'react';
import { Building2, Phone, Video, ChevronDown } from 'lucide-react';
import UserAvatar, { getPersonImage } from '@/components/common/UserAvatar';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { getCaseData } from '@/utils/caseCardHelpers';
import {
  CONSULTATION_STATUS_SECTIONS,
  consultationStatusOf,
  type ConsultationStatusKey,
  type ConsultationStatusSectionKey,
} from './consultationStatus';
import { attorneysOf, personName } from './consultation-rows';

const STORAGE_KEY = 'jure.consultations.board.open';

const DEFAULT_OPEN: Record<ConsultationStatusSectionKey, boolean> = {
  scheduled: true,
  completed: true,
  noShow: true,
  cancelled: true,
};

function readOpen(): Record<ConsultationStatusSectionKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_OPEN>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

function ConsultationBoardCard({
  c,
  draggable,
  onOpen,
}: {
  c: API.Case;
  draggable: boolean;
  onOpen: () => void;
}) {
  const { t, lang, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.consultation;
  const dt = getCaseData(c, 'consultation_date') as string | undefined;
  const format = getCaseData(c, 'format') as string | undefined;
  const lead = attorneysOf(c)[0];
  const converted = getConvertedToCase(c);
  const FormatIcon = format === 'PHONE' ? Phone : format === 'VIDEO' ? Video : Building2;
  const dateLabel = dt
    ? `${formatDate(dt, lang, { day: 'numeric', month: 'short' })} · ${formatTime(dt, lang, { hour: '2-digit', minute: '2-digit' })}`
    : copy.noneDash;

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData('text/plain', String(c.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onOpen}
      className="w-full text-start rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-500">{c.reference || copy.noneDash}</span>
        {format ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <FormatIcon className="h-3 w-3" />
            {enumPretty(format)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-snug">{c.title}</p>
      <div className="mt-1.5 min-w-0">
        <CaseClientLabel
          client={c.client}
          fallback={copy.noneDash}
          nameClassName="truncate text-[11px] text-slate-500 dark:text-slate-400"
        />
      </div>
      <p className="mt-1 text-[11px] tabular-nums text-slate-500">{dateLabel}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {lead ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <UserAvatar
              size="xs"
              firstName={lead.first_name}
              lastName={lead.last_name}
              image={getPersonImage(lead)}
            />
            <span className="truncate text-[11px] text-slate-600 dark:text-slate-400">{personName(lead)}</span>
          </div>
        ) : (
          <span />
        )}
        {converted ? (
          <span className="shrink-0 font-mono text-[10px] font-medium text-[#64499D]">{converted.reference}</span>
        ) : null}
      </div>
    </button>
  );
}

export default function ConsultationBoard({
  rows,
  loading,
  canEdit,
  onOpen,
  onStatusDrop,
  sectionTitle,
}: {
  rows: API.Case[];
  loading: boolean;
  canEdit: boolean;
  onOpen: (c: API.Case) => void;
  onStatusDrop: (caseId: number, status: ConsultationStatusKey) => void;
  sectionTitle: (key: ConsultationStatusSectionKey, status: string) => string;
}) {
  const [openMap, setOpenMap] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {
      /* ignore quota / private mode */
    }
  }, [openMap]);

  const toggle = (key: ConsultationStatusSectionKey) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4 md:items-stretch h-full min-h-0">
      {CONSULTATION_STATUS_SECTIONS.map((col) => {
        const items = rows.filter((c) => consultationStatusOf(c) === col.status);
        const isOpen = openMap[col.key];
        return (
          <div
            key={col.status}
            className={cn(
              'flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 border-l-[3px] dark:border-slate-800',
              col.accent,
              isOpen ? 'md:h-full' : 'self-start'
            )}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
              if (Number.isFinite(id)) onStatusDrop(id, col.status);
            }}
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
                  {sectionTitle(col.key, col.status)}
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
                  <ConsultationBoardCard
                    key={c.id}
                    c={c}
                    draggable={canEdit}
                    onOpen={() => onOpen(c)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
