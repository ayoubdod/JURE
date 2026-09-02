import { Skeleton } from '@/components/ui/skeleton';

export default function LitigationWorkspaceSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="shrink-0 border-b border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="h-4 w-40" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-7 w-72" />
        <Skeleton className="mt-2 h-4 w-28" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="hidden min-h-0 w-[232px] overflow-y-auto border-e border-slate-200 p-3 dark:border-zinc-800 lg:block">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
