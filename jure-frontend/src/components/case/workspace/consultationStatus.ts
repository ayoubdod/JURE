import { consultationOutcome } from '@/services/case/caseType';

export const CONSULTATION_STATUSES = ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const;
export type ConsultationStatusKey = (typeof CONSULTATION_STATUSES)[number];
export type ConsultationStatusSectionKey = 'scheduled' | 'completed' | 'noShow' | 'cancelled';

export const CONSULTATION_STATUS_SECTIONS: Array<{
  status: ConsultationStatusKey;
  key: ConsultationStatusSectionKey;
  accent: string;
  header: string;
  count: string;
}> = [
  {
    status: 'SCHEDULED',
    key: 'scheduled',
    accent: 'border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/25',
    header: 'text-blue-800 dark:text-blue-200',
    count: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  {
    status: 'COMPLETED',
    key: 'completed',
    accent: 'border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/25',
    header: 'text-emerald-800 dark:text-emerald-200',
    count: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
  {
    status: 'NO_SHOW',
    key: 'noShow',
    accent: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
    header: 'text-amber-800 dark:text-amber-200',
    count: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  {
    status: 'CANCELLED',
    key: 'cancelled',
    accent: 'border-l-rose-500 bg-rose-50/70 dark:bg-rose-950/25',
    header: 'text-rose-800 dark:text-rose-200',
    count: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  },
];

export function consultationStatusOf(c: API.Case): ConsultationStatusKey {
  const o = String(consultationOutcome(c) || 'SCHEDULED').toUpperCase();
  if (o === 'COMPLETED' || o === 'NO_SHOW' || o === 'CANCELLED') return o;
  return 'SCHEDULED';
}
