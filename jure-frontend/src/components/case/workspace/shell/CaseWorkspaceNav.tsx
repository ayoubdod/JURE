import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { CaseWorkspaceGroupId, CaseWorkspaceNavItem } from './types';
import { scrollChipIntoView } from './scrollChipIntoView';

function NavButton({
  item,
  on,
  compact,
  onSelect,
}: {
  item: CaseWorkspaceNavItem;
  on: boolean;
  compact?: boolean;
  onSelect: (item: CaseWorkspaceNavItem) => void;
}) {
  const Icon = item.icon;
  const count = item.count;
  return (
    <button
      key={item.id}
      type="button"
      data-ws-nav={item.id}
      onClick={() => onSelect(item)}
      aria-current={on ? 'page' : undefined}
      aria-label={item.countAriaLabel || item.label}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40 motion-reduce:transition-none',
        compact ? 'shrink-0' : 'w-full',
        on
          ? 'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
          : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
      {count ? (
        <span
          className={cn(
            'ms-auto text-[11px] tabular-nums',
            item.urgent ? 'font-semibold text-red-600' : on ? 'text-[#64499D]' : 'text-slate-400'
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function CaseWorkspaceNav({
  items,
  activeId,
  navLabel,
  onSelect,
}: {
  items: CaseWorkspaceNavItem[];
  /** Parent group id (or leaf id in Phase 1 flat mode). */
  activeId: CaseWorkspaceGroupId;
  navLabel: string;
  onSelect: (item: CaseWorkspaceNavItem) => void;
}) {
  const main = items.filter((i) => !i.footer);
  const footer = items.filter((i) => i.footer);

  useEffect(() => {
    scrollChipIntoView(document.querySelector(`[data-ws-nav="${activeId}"]`));
  }, [activeId]);

  return (
    <nav
      className="min-w-0 shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:min-h-0 lg:w-[232px] lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-e"
      aria-label={navLabel}
    >
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain p-2 [scrollbar-width:thin] lg:hidden">
        {items.map((item) => (
          <NavButton key={item.id} item={item} on={activeId === item.id} compact onSelect={onSelect} />
        ))}
      </div>
      <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin] lg:flex">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {navLabel}
        </p>
        <div className="flex flex-col gap-0.5">
          {main.map((item) => (
            <NavButton key={item.id} item={item} on={activeId === item.id} onSelect={onSelect} />
          ))}
        </div>
        {footer.length ? (
          <div className="mt-auto border-t border-slate-200 pt-2 dark:border-zinc-800">
            {footer.map((item) => (
              <NavButton key={item.id} item={item} on={activeId === item.id} onSelect={onSelect} />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
