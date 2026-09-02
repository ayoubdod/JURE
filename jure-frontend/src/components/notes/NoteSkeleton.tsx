import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TINTS = [
  'bg-[#F0EBFA]/80 dark:bg-slate-800/80',
  'bg-[#EAF4FC]/80 dark:bg-slate-800/80',
  'bg-[#FFF9DD]/80 dark:bg-slate-800/80',
  'bg-[#FFF0F1]/80 dark:bg-slate-800/80',
  'bg-[#EDF8F0]/80 dark:bg-slate-800/80',
  'bg-white dark:bg-slate-800/80',
];

export default function NoteSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'min-h-[11.5rem] rounded-[14px] border border-[#E8EAF0] p-4 dark:border-slate-800',
            TINTS[i % TINTS.length]
          )}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
          <Skeleton className="mt-1.5 h-3 w-2/3" />
          <div className="mt-5 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-300" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
