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

/** Client portal: slate, amber, emerald, rose only. */
const QUIET_STYLES: Record<ConsultationStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  UNDER_REVIEW: 'bg-slate-100 text-slate-700',
  NEEDS_INFORMATION: 'bg-amber-50 text-amber-800',
  ASSIGNED: 'bg-[#F4F1FF] text-[#4D3680]',
  CONFIRMED: 'bg-emerald-50 text-emerald-800',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-800',
  COMPLETED: 'bg-slate-100 text-slate-600',
  DECLINED: 'bg-rose-50 text-rose-800',
};

export function ConsultationStatusBadge({
  status,
  label,
  quiet = false,
  className,
}: {
  status: ConsultationStatus;
  label: string;
  quiet?: boolean;
  className?: string;
}) {
  const styles = quiet ? QUIET_STYLES : STATUS_STYLES;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        styles[status] || styles.SUBMITTED,
        className,
      )}
    >
      {label}
    </span>
  );
}
