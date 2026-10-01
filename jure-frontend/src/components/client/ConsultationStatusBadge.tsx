import type { ConsultationStatus } from '@/services/consultations/api';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ConsultationStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800',
  NEEDS_INFORMATION: 'bg-orange-50 text-orange-800',
  ASSIGNED: 'bg-indigo-50 text-indigo-800',
  CONFIRMED: 'bg-emerald-50 text-emerald-800',
  IN_PROGRESS: 'bg-sky-50 text-sky-800',
  COMPLETED: 'bg-slate-200 text-slate-600',
  DECLINED: 'bg-rose-50 text-rose-800',
};

export function ConsultationStatusBadge({
  status,
  label,
  className,
}: {
  status: ConsultationStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] || STATUS_STYLES.SUBMITTED,
        className,
      )}
    >
      {label}
    </span>
  );
}
