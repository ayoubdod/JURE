import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type CollapsibleSectionProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  /** Uncontrolled initial state. Ignored when `open` is provided. */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /** Optional leading icon in the trigger. */
  icon?: React.ReactNode;
  /**
   * `muted` reduces visual weight so the section reads as secondary
   * relative to primary navigation.
   */
  tone?: 'default' | 'muted';
  id?: string;
};

/**
 * Reusable expand/collapse section with chevron rotation and
 * keyboard-accessible Radix Collapsible primitives.
 */
export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  triggerClassName,
  contentClassName,
  icon,
  tone = 'default',
  id,
}: CollapsibleSectionProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const contentId = id ? `${id}-content` : undefined;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn('w-full', className)}
      id={id}
    >
      <CollapsibleTrigger
        type="button"
        className={cn(
          'flex w-full min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          tone === 'muted'
            ? 'text-muted-foreground/80 hover:bg-muted/60 hover:text-muted-foreground'
            : 'text-foreground hover:bg-muted hover:text-foreground',
          triggerClassName
        )}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        {icon ? <span className="shrink-0 text-muted-foreground/70">{icon}</span> : null}
        <span className="flex-1 truncate text-left text-[13px] font-medium tracking-wide">
          {title}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            'shrink-0 text-muted-foreground/60 transition-transform duration-[250ms] ease-out',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent
        id={contentId}
        className={cn(
          'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
          contentClassName
        )}
      >
        <div className="flex flex-col gap-0.5 pb-0.5 pt-0.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default CollapsibleSection;
