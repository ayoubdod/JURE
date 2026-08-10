// src/components/dashboard/ConflictCheckDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2, Search, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import {
  apiRunConflictCheck,
  type ConflictCheckResult,
  type ConflictPotentialMatch,
} from '@/services/conflict-checks/api';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Prefill search (e.g. opposing party from matter creation). */
  initialQuery?: string;
  /** Associate the persisted check with an existing matter. */
  matterId?: number | null;
  excludeMatterId?: number | null;
};

function MatchCard({
  match,
  onViewMatter,
  labels,
}: {
  match: ConflictPotentialMatch;
  onViewMatter: (m: ConflictPotentialMatch) => void;
  labels: {
    role: string;
    status: string;
    match: string;
    viewMatter: string;
  };
}) {
  return (
    <div className="rounded-lg border border-border/80 p-3 space-y-1.5 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug">{match.entity_name}</div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground border px-1.5 py-0.5 rounded">
          {match.match_type_label || match.match_type}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">{match.match_reason}</div>
      <div className="text-xs">
        <span className="text-muted-foreground">{labels.role}: </span>
        {match.role_label || match.role}
      </div>
      <div className="text-xs">
        <span className="font-medium">
          {match.matter_reference ? `#${match.matter_reference}` : `Matter #${match.matter}`}
        </span>
        {match.matter_title ? ` — ${match.matter_title}` : null}
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">{labels.status}: </span>
        {match.matter_status}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onViewMatter(match)}
      >
        <ExternalLink className="h-3 w-3 me-1" />
        {labels.viewMatter}
      </Button>
    </div>
  );
}

export default function ConflictCheckDialog({
  open,
  onOpenChange,
  initialQuery = '',
  matterId = null,
  excludeMatterId = null,
}: Props) {
  const { t, tf } = useAppTranslation();
  const m = t.dashboard.conflictCheck;
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConflictCheckResult | null>(null);
  const [ran, setRan] = useState(false);

  const resetOnClose = (v: boolean) => {
    if (!v) {
      setError(null);
      setResult(null);
      setRan(false);
      setLoading(false);
      setQ(initialQuery);
    } else if (initialQuery) {
      setQ(initialQuery);
    }
    onOpenChange(v);
  };

  const runCheck = async () => {
    const query = q.trim();
    if (query.length < 2) {
      setError(m.queryTooShort);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setRan(true);
    try {
      const res = await apiRunConflictCheck({
        query,
        matter_id: matterId ?? undefined,
        exclude_matter_id: excludeMatterId ?? undefined,
      });
      setResult(res.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        const queryErr = err.response?.data?.query;
        if (typeof detail === 'string') setError(detail);
        else if (Array.isArray(queryErr)) setError(String(queryErr[0]));
        else if (err.response?.status === 403) setError(m.errorForbidden);
        else setError(m.errorGeneric);
      } else {
        setError(m.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const viewMatter = (match: ConflictPotentialMatch) => {
    const search = match.matter_reference || String(match.matter);
    onOpenChange(false);
    navigate(`/dashboard/cases?search=${encodeURIComponent(search)}`);
  };

  const exact = result?.exact_matches ?? [];
  const potential = result?.potential_matches ?? [];
  const total = result?.result_count ?? 0;

  return (
    <Dialog open={open} onOpenChange={resetOnClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {m.title}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">{m.disclaimer}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="ps-8"
                placeholder={m.searchPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runCheck();
                  }
                }}
                disabled={loading}
              />
            </div>
            <Button type="button" onClick={() => void runCheck()} disabled={loading || q.trim().length < 2}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : m.runCheck}
            </Button>
          </div>

          {loading && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              {m.loading}
            </div>
          )}

          {error && !loading && (
            <div className="text-xs text-destructive border border-destructive/30 rounded-md p-2">{error}</div>
          )}

          {!loading && ran && result && total === 0 && (
            <div className="text-sm text-muted-foreground py-3">{m.empty}</div>
          )}

          {!loading && result && total > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-medium">
                {tf(m.resultsCount, { count: total })}
              </div>

              {exact.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {m.exactMatches}
                  </div>
                  {exact.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onViewMatter={viewMatter}
                      labels={{
                        role: m.roleLabel,
                        status: m.statusLabel,
                        match: m.matchLabel,
                        viewMatter: m.viewMatter,
                      }}
                    />
                  ))}
                </div>
              )}

              {potential.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {m.potentialMatches}
                  </div>
                  {potential.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onViewMatter={viewMatter}
                      labels={{
                        role: m.roleLabel,
                        status: m.statusLabel,
                        match: m.matchLabel,
                        viewMatter: m.viewMatter,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
