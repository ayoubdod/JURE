'use client';

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getStatusColor } from '@/utils/caseCardHelpers';
import { useAppTranslation } from '@/i18n';

export type HeaderMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: ReactNode;
  separatorBefore?: boolean;
};

/**
 * Compact case identity header: no internal scroll, no hard max-height clipping.
 * Wraps on narrow viewports so CTA / + New / More stay reachable.
 */
export default function CaseWorkspaceHeader({
  listPath,
  backLabel,
  typeLabel,
  status,
  priorityLabel,
  title,
  reference,
  meta,
  primaryCta,
  newItems,
  moreItems,
  newMenuLabel,
}: {
  listPath: string;
  backLabel: string;
  typeLabel: string;
  status: string;
  priorityLabel?: string;
  title: string;
  reference?: string;
  meta?: ReactNode;
  primaryCta?: { label: string; onClick: () => void } | null;
  newItems: HeaderMenuItem[];
  moreItems: HeaderMenuItem[];
  newMenuLabel: string;
}) {
  const navigate = useNavigate();
  const { t, enumPretty } = useAppTranslation();
  const pw = t.cases.pageWorkspace;

  return (
    <header className="shrink-0 border-b border-[#64499D]/10 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-h-16 flex-col justify-center gap-1 px-3 py-2 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-500 hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>

          <span className="hidden rounded-full bg-[#F7F4FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64499D] ring-1 ring-[#64499D]/15 sm:inline-flex">
            {typeLabel}
          </span>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
              getStatusColor(status)
            )}
          >
            {enumPretty(status) || status}
          </span>
          {priorityLabel ? (
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 sm:inline-flex dark:bg-zinc-800 dark:text-zinc-200">
              {priorityLabel}
            </span>
          ) : null}

          <div className="min-w-0 flex-1 basis-[12rem]">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white sm:text-base">
                    {title}
                  </h1>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {reference ? (
              <p className="truncate font-mono text-[11px] text-slate-500">{reference}</p>
            ) : null}
          </div>

          <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {primaryCta ? (
              <Button
                type="button"
                className="min-h-11 max-w-full rounded-lg bg-[#64499D] px-3 text-[12px] text-white hover:bg-[#4D3680] focus-visible:ring-2 focus-visible:ring-[#64499D]/50 sm:max-w-xs"
                onClick={primaryCta.onClick}
              >
                <span className="truncate">{primaryCta.label}</span>
              </Button>
            ) : null}

            {newItems.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    <span className="ms-1.5 hidden sm:inline">{newMenuLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {newItems.map((item) => (
                    <DropdownMenuItem key={item.key} onClick={item.onClick}>
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span className="ms-1.5 hidden sm:inline">{pw.more}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {moreItems.map((item) => (
                  <div key={item.key}>
                    {item.separatorBefore ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className={item.destructive ? 'text-red-600' : undefined}
                      onClick={item.onClick}
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {meta ? <div className="truncate ps-1 text-[12px] text-slate-500 sm:ps-10">{meta}</div> : null}
      </div>
    </header>
  );
}
