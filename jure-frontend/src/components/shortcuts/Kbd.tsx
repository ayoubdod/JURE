import { cn } from '@/lib/utils';
import { useShortcuts } from '@/context/ShortcutsContext';

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function KbdSequence({
  keys,
  mod,
  className,
}: {
  keys: string[];
  mod: string;
  className?: string;
}) {
  if (!keys.length) return null;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <Kbd key={`${key}-${i}`}>{key === 'mod' ? mod : key}</Kbd>
      ))}
    </span>
  );
}

/** Shortcut badge for buttons and tooltips. Hidden when disabled in Settings. */
export function HintKbd({
  keys,
  className,
}: {
  keys: string[];
  className?: string;
}) {
  const { showHintsOnButtons, mod } = useShortcuts();
  if (!showHintsOnButtons) return null;
  return <KbdSequence keys={keys} mod={mod} className={className} />;
}
