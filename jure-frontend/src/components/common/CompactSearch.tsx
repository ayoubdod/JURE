import { useEffect, useRef, useState, type MutableRefObject, type Ref } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else (ref as MutableRefObject<T | null>).current = value;
}

export default function CompactSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  clearAriaLabel,
  inputRef,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel?: string;
  clearAriaLabel?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}) {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const localRef = useRef<HTMLInputElement | null>(null);
  const hasQuery = value.trim().length > 0;
  const label = ariaLabel || placeholder;

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => localRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const setInputNode = (node: HTMLInputElement | null) => {
    if (node) {
      const nativeFocus = node.focus.bind(node);
      node.focus = (options?: FocusOptions) => {
        setOpen(true);
        requestAnimationFrame(() => nativeFocus(options));
      };
    }
    localRef.current = node;
    assignRef(inputRef, node);
  };

  const collapse = () => setOpen(false);

  return (
    <>
      {!open ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            'relative h-9 w-9 shrink-0 rounded-lg',
            hasQuery && 'border-primary/40 bg-primary/[0.04] ring-1 ring-primary/30',
            className
          )}
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-expanded={false}
        >
          <Search className="h-4 w-4" />
          {hasQuery ? <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-[#64499D]" /> : null}
        </Button>
      ) : null}

      <div className={cn('min-w-0 flex-1 items-center gap-1.5 sm:max-w-md', open ? 'flex' : 'hidden')}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={setInputNode}
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (hasQuery) onChange('');
                else {
                  collapse();
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
            aria-label={label}
            className={cn(
              'h-9 rounded-lg border-slate-200 ps-8 pe-8 text-sm dark:border-slate-700',
              hasQuery && 'border-primary/35 ring-2 ring-primary/25',
              inputClassName
            )}
          />
          {hasQuery ? (
            <button
              type="button"
              className="absolute end-1.5 top-1/2 flex min-h-[28px] min-w-[28px] -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => onChange('')}
              aria-label={clearAriaLabel || t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 px-2 text-[12px]" onClick={collapse}>
          {t.common.close}
        </Button>
      </div>
    </>
  );
}
