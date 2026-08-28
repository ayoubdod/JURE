import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CONSULTATION_STATUS_SECTIONS,
  consultationStatusOf,
  type ConsultationStatusSectionKey,
} from './consultationStatus';

const STORAGE_KEY = 'jure.consultations.list.open';

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

function SectionHeader({
  title,
  count,
  open,
  onToggle,
  headerClass,
  countClass,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  headerClass: string;
  countClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
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
            headerClass,
            !open && '-rotate-90 rtl:rotate-90'
          )}
          aria-hidden
        />
        <span className={cn('text-[11px] font-semibold uppercase tracking-[0.06em]', headerClass)}>{title}</span>
      </span>
      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', countClass)}>
        {count}
      </span>
    </button>
  );
}

export default function ConsultationList({
  rows,
  loading,
  empty,
  error,
  tableHead,
  colSpan,
  renderRow,
  renderMobile,
  sectionTitle,
}: {
  rows: API.Case[];
  loading: boolean;
  empty: ReactNode;
  error: ReactNode | null;
  tableHead: ReactNode;
  colSpan: number;
  renderRow: (c: API.Case, rowIdx: number) => ReactNode;
  renderMobile: (c: API.Case) => ReactNode;
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

  if (loading || error || rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90">
                {tableHead}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="h-12 px-4" colSpan={colSpan}>
                      <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={colSpan}>{error || empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden">{loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950" />
        )) : error || empty}</div>
      </div>
    );
  }

  const visibleSections = CONSULTATION_STATUS_SECTIONS.filter(
    (section) =>
      section.key === 'scheduled' ||
      section.key === 'completed' ||
      rows.some((c) => consultationStatusOf(c) === section.status)
  );

  return (
    <div className="space-y-3">
      {visibleSections.map((section) => {
        const items = rows.filter((c) => consultationStatusOf(c) === section.status);
        const isOpen = openMap[section.key];
        return (
          <div
            key={section.status}
            className={cn(
              'overflow-hidden rounded-xl border border-slate-200/90 border-l-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-800',
              section.accent
            )}
          >
            <SectionHeader
              title={sectionTitle(section.key, section.status)}
              count={items.length}
              open={isOpen}
              onToggle={() => toggle(section.key)}
              headerClass={section.header}
              countClass={section.count}
            />
            {isOpen ? (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[880px]">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-950/50">
                        {tableHead}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c, i) => renderRow(c, i))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 sm:hidden">
                  {items.map((c) => (
                    <div key={c.id}>{renderMobile(c)}</div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
