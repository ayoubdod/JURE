import { Skeleton } from '@/components/ui/skeleton';

/** Shared loading chrome: header + nav + command-center cards (no layout shift). */
export default function CaseWorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex min-h-16 flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:px-5">
          <Skeleton className="mt-2 h-4 w-16" />
          <div className="min-w-0 flex-1 basis-[14rem] space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-48 sm:w-72" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="min-h-11 w-36 rounded-lg" />
          <Skeleton className="min-h-11 w-11 rounded-lg" />
          <Skeleton className="min-h-11 w-11 rounded-lg" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex gap-1 overflow-x-auto p-2 lg:hidden" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="min-h-11 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
        <div className="hidden min-h-0 w-[232px] overflow-y-auto border-e border-slate-200 p-2 dark:border-zinc-800 lg:block">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mb-1 min-h-11 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
