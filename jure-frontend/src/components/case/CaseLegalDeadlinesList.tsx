import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import {
  apiGetLegalDeadlines,
  apiUpdateLegalDeadline,
  type CalculatedDeadline,
} from '@/services/legal-deadlines/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDate, useAppTranslation } from '@/i18n';

export function unwrapDeadlineList(
  data: API.Paginated<CalculatedDeadline> | CalculatedDeadline[] | undefined
): CalculatedDeadline[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

type Props = {
  caseId: number;
  /** Optional externally controlled list (e.g. after save). */
  items?: CalculatedDeadline[] | null;
  onLoaded?: (items: CalculatedDeadline[]) => void;
  refreshKey?: number;
};

/**
 * Lists persisted CalculatedDeadline rows for a matter.
 * These are separate from litigation keyDeadlines JSON fields.
 */
export default function CaseLegalDeadlinesList({
  caseId,
  items: controlledItems,
  onLoaded,
  refreshKey = 0,
}: Props) {
  const { toast } = useToast();
  const { t, tf, lang } = useAppTranslation();
  const list = t.dashboard.deadlines.list;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CalculatedDeadline[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const statusLabel = useMemo(
    () =>
      ({
        upcoming: list.statusUpcoming,
        due_soon: list.statusDueSoon,
        due_today: list.statusDueToday,
        overdue: list.statusOverdue,
        completed: list.statusCompleted,
        cancelled: list.statusCancelled,
      }) as Record<string, string>,
    [list],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGetLegalDeadlines({ case: caseId });
      const next = unwrapDeadlineList(res.data).filter((d) => d.status !== 'cancelled');
      setItems(next);
      onLoaded?.(next);
    } catch {
      setError(list.loadError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, onLoaded, list.loadError]);

  useEffect(() => {
    if (controlledItems) {
      setItems(controlledItems.filter((d) => d.status !== 'cancelled'));
      setLoading(false);
      return;
    }
    void load();
  }, [caseId, refreshKey, controlledItems, load]);

  const markStatus = async (id: number, status: 'completed' | 'cancelled') => {
    try {
      setActingId(id);
      await apiUpdateLegalDeadline(id, { status });
      setItems((prev) =>
        status === 'cancelled'
          ? prev.filter((d) => d.id !== id)
          : prev.map((d) => (d.id === id ? { ...d, status } : d)),
      );
      toast({
        title: status === 'completed' ? list.toastCompleted : list.toastCancelled,
      });
    } catch {
      toast({
        title: list.toastUpdateFailed,
        description: list.toastRetry,
        variant: 'destructive',
      });
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {list.loading}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-amber-800 dark:text-amber-300 py-2">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{list.empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((d) => (
        <li
          key={d.id}
          className="rounded-xl border border-emerald-100 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/80">
                <Scale className="h-3 w-3 shrink-0" />
                {list.legalDeadline}
                {d.is_manual_override ? (
                  <span className="normal-case tracking-normal text-amber-800 dark:text-amber-300">
                    · {list.manuallyVerified}
                  </span>
                ) : null}
              </div>
              <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100 mt-0.5">
                {formatDate(d.final_deadline, lang)}
              </p>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 mt-0.5">
                {d.rule?.name || list.fallbackName}
                {d.rule?.version ? ` · v${d.rule.version}` : ''}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {tf(list.fromDate, { date: formatDate(d.triggering_date, lang) })}
                {d.rule?.article_reference ? ` · ${d.rule.article_reference}` : ''}
                {' · '}
                {statusLabel[d.status] || d.status}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {d.status !== 'completed' && d.status !== 'cancelled' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={actingId === d.id}
                    onClick={() => void markStatus(d.id, 'completed')}
                  >
                    {list.complete}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground"
                    disabled={actingId === d.id}
                    onClick={() => void markStatus(d.id, 'cancelled')}
                  >
                    {t.common.cancel}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
