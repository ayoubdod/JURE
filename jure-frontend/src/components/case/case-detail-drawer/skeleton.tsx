import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CaseDetailDrawerSkeleton() {
  return (
    <div className="space-y-8 px-6 py-4 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-2/3 max-w-sm" />
      </div>
      {[1, 2, 3].map((s) => (
        <div key={s} className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ))}
      <div className="mt-8 border-t border-slate-200/80 dark:border-slate-800 pt-6 space-y-4">
        <Skeleton className="h-3 w-48" />
        {[1, 2, 3].map((r) => (
          <Skeleton key={r} className="h-24 w-full rounded-lg" />
        ))}
        <Skeleton className="h-3 w-40 mt-4" />
        {[1, 2].map((r) => (
          <Skeleton key={`a-${r}`} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
