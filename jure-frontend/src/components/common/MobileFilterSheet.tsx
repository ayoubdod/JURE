import { useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FilterPanelContext } from '@/components/common/filterPanelContext';
import { cn } from '@/lib/utils';

function useMdUp() {
  const [mdUp, setMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setMdUp(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mdUp;
}

function isPortaledMenu(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(
    el?.closest('[data-radix-select-content], [data-radix-popper-content-wrapper], [data-radix-select-viewport], [cmdk-root], [role="listbox"]')
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="w-28 shrink-0 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400" title={label}>
        {label}
      </span>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function MobileFilterSheet({
  title,
  count = 0,
  children,
  footer,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const mdUp = useMdUp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !mdUp) return;

    const onPointerDown = (e: PointerEvent) => {
      if (isPortaledMenu(e.target)) return;
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mdUp]);

  const triggerClass = cn(
    'h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-[12px]',
    count > 0 && 'border-primary/40 bg-primary/[0.04] ring-1 ring-primary/30'
  );

  const panel = (
    <FilterPanelContext.Provider value={true}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{title}</p>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#64499D] px-1.5 text-[10px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 overflow-visible px-4 py-3">{children}</div>
      {footer ? <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">{footer}</div> : null}
    </FilterPanelContext.Provider>
  );

  if (mdUp) {
    return (
      <div ref={rootRef} className="relative shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={triggerClass}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          {title}
          {count > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#64499D] px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          ) : null}
        </Button>
        {open ? (
          <div className="absolute start-0 top-[calc(100%+8px)] z-[70] w-[min(calc(100vw-2rem),22rem)] overflow-visible rounded-xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {panel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={triggerClass}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Filter className="h-3.5 w-3.5" />
        {title}
        {count > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#64499D] px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    </>
  );
}
