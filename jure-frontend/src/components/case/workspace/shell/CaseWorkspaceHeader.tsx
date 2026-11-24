'use client';

import type { LucideIcon } from 'lucide-react';
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

export type HeaderMetaItem = {
  id: string;
  label: string;
  value: ReactNode;
  icon: LucideIcon;
};

export default function CaseWorkspaceHeader({
  listPath,
  backLabel,
  status,
  priorityLabel,
  title,
  reference,
  metaItems,
  primaryCta,
  newItems,
  moreItems,
  newMenuLabel,
}: {
  listPath: string;
  backLabel: string;
  status: string;
  priorityLabel?: string;
  title: string;
  reference?: string;
  metaItems?: HeaderMetaItem[];
  primaryCta?: { label: string; onClick: () => void } | null;
  newItems: HeaderMenuItem[];
  moreItems: HeaderMenuItem[];
  newMenuLabel: string;
}) {
  const navigate = useNavigate();
  const { t, enumPretty } = useAppTranslation();
  const pw = t.cases.pageWorkspace;
  const meta = (metaItems ?? []).filter((i) => i.value != null && i.value !== '');

  return (
    <header className="shrink-0 border-b border-[#64499D]/10 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-h-16 flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={() => navigate(listPath)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-500 hover:text-[#64499D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/40"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>

        <div className="min-w-0 flex-1 basis-[14rem]">
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h1 className="max-w-full truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {title}
                  </h1>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                getStatusColor(status)
              )}
            >
              {enumPretty(status) || status}
            </span>
            {priorityLabel ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200">
                {priorityLabel}
              </span>
            ) : null}
          </div>
          {reference ? <p className="mt-0.5 truncate font-mono text-[12px] text-slate-500">{reference}</p> : null}
          {meta.length ? (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 md:flex-nowrap md:overflow-hidden">
              {meta.map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.id} className="inline-flex min-w-0 max-w-full items-center gap-1.5 md:shrink">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="shrink-0 font-medium text-slate-400">{item.label}</span>
                    <span className="min-w-0 truncate text-slate-600 dark:text-zinc-300">{item.value}</span>
                  </span>
                );
              })}
            </div>
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
                <Button type="button" variant="outline" className="min-h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
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
              <Button type="button" variant="outline" className="min-h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-[#64499D]/40">
                <MoreHorizontal className="h-4 w-4" aria-hidden />
                <span className="ms-1.5 hidden sm:inline">{pw.more}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {moreItems.map((item) => (
                <div key={item.key}>
                  {item.separatorBefore ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem className={item.destructive ? 'text-red-600' : undefined} onClick={item.onClick}>
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
