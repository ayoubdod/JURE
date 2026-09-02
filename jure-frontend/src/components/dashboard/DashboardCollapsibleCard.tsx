import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

/**
 * Dashboard card that stays fully expanded on desktop.
 * On mobile it starts collapsed; tap the header to expand.
 */
export default function DashboardCollapsibleCard({
  title,
  description,
  headerRight,
  defaultOpen = false,
  className,
  contentClassName,
  children,
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !isMobile || open;

  return (
    <Card className={cn('min-w-0 w-full rounded-xl border border-slate-200/90 dark:border-slate-800', className)}>
      <Collapsible open={expanded} onOpenChange={(next) => isMobile && setOpen(next)}>
        {isMobile ? (
          <div className="flex items-start gap-2 px-3 py-1">
            <CollapsibleTrigger
              type="button"
              className="flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-lg px-1 py-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
              aria-expanded={expanded}
            >
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">{title}</CardTitle>
                {description ? (
                  <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
                ) : null}
              </div>
              <ChevronDown
                aria-hidden
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                  open && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            {headerRight ? (
              <div className="shrink-0 pt-1.5" onClick={(e) => e.stopPropagation()}>
                {headerRight}
              </div>
            ) : null}
          </div>
        ) : (
          <CardHeader
            className={cn(
              'pb-2',
              headerRight && 'flex flex-row flex-wrap items-start justify-between space-y-0 gap-2'
            )}
          >
            <div className="min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
            </div>
            {headerRight}
          </CardHeader>
        )}
        <CollapsibleContent
          className={cn(
            'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
            expanded && 'overflow-visible'
          )}
        >
          <CardContent className={cn('pt-0', isMobile && 'pb-3', contentClassName)}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
