// src/components/dashboard/MatterCloseModal.tsx
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Flag, Award, BookOpen, FileText, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import ServerSelect from '@/components/common/ServerSelect';
import { apiCloseCase } from '@/services/case/api';
import { eventBus } from '@/utils/eventBus';
import { isAxiosError } from 'axios';

export type MatterCloseModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When set, skip case picker (e.g. from case detail drawer). */
  caseId?: number;
  caseLabel?: string;
  onSuccess?: (closedCase: API.Case) => void;
};

function closeErrorMessage(
  err: unknown,
  messages: {
    unauthorized: string;
    forbidden: string;
    notFound: string;
    conflict: string;
    validation: string;
    server: string;
    network: string;
  }
): string {
  if (!isAxiosError(err)) {
    if (err instanceof Error && /network|fetch|failed to fetch/i.test(err.message)) {
      return messages.network;
    }
    return messages.server;
  }
  if (!err.response) return messages.network;
  const code = err.response.status;
  if (code === 401) return messages.unauthorized;
  if (code === 403) return messages.forbidden;
  if (code === 404) return messages.notFound;
  if (code === 409) return messages.conflict;
  if (code === 422 || code === 400) return messages.validation;
  return messages.server;
}

export default function MatterCloseModal({
  open,
  onOpenChange,
  caseId: lockedCaseId,
  caseLabel,
  onSuccess,
}: MatterCloseModalProps) {
  const { t } = useAppTranslation();
  const m = t.dashboard.matterClose;
  const { toast } = useToast();

  const [selectedCaseId, setSelectedCaseId] = useState<number | undefined>(lockedCaseId);
  const [lessons, setLessons] = useState('');
  const [outcome, setOutcome] = useState('');
  const [precedents, setPrecedents] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedCaseId(lockedCaseId);
    setLessons('');
    setOutcome('');
    setPrecedents('');
    setFormError(null);
    setSubmitting(false);
  }, [open, lockedCaseId]);

  const targetId = lockedCaseId ?? selectedCaseId;

  const save = async () => {
    if (!targetId) {
      setFormError(m.selectCaseRequired);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const { data } = await apiCloseCase(targetId, {
        outcome: outcome.trim() || undefined,
        lessons: lessons.trim() || undefined,
        precedents: precedents.trim() || undefined,
      });
      const closed = data.case;
      toast({
        title: m.successTitle,
        description: data.already_closed ? m.alreadyClosedDescription : m.successDescription,
      });
      eventBus.emit('case-updated');
      onSuccess?.(closed);
      onOpenChange(false);
    } catch (err) {
      const msg = closeErrorMessage(err, {
        unauthorized: m.errors.unauthorized,
        forbidden: m.errors.forbidden,
        notFound: m.errors.notFound,
        conflict: m.errors.conflict,
        validation: m.errors.validation,
        server: m.errors.server,
        network: m.errors.network,
      });
      setFormError(msg);
      toast({ title: t.common.error, description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={() => !submitting && onOpenChange(false)}
            aria-label={t.common.close}
            disabled={submitting}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">{m.title}</DialogTitle>
                <DialogDescription className="text-white/90 mt-1">{m.description}</DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{m.confirmMessage}</p>

          {lockedCaseId ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{caseLabel || `#${lockedCaseId}`}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.selectCase}</label>
              <ServerSelect
                link="/cases/?page_size=100"
                value={selectedCaseId}
                onChange={(v) => setSelectedCaseId(v ? Number(v) : undefined)}
                labelKey={(o) => {
                  const status = String(o.status || '');
                  const closed = status === 'CLOSED' ? m.closedSuffix : '';
                  return `${o.reference || ''} — ${o.title || ''}${closed}`.trim();
                }}
                valueKey="id"
                placeholder={m.selectCasePlaceholder}
                cleanable
                disabled={submitting}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {m.outcome}
            </label>
            <Textarea
              placeholder={m.outcomePlaceholder}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="min-h-[80px]"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {m.lessons}
            </label>
            <Textarea
              placeholder={m.lessonsPlaceholder}
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              className="min-h-[80px]"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {m.precedents}
            </label>
            <Textarea
              placeholder={m.precedentsPlaceholder}
              value={precedents}
              onChange={(e) => setPrecedents(e.target.value)}
              className="min-h-[80px]"
              disabled={submitting}
            />
          </div>

          {formError ? (
            <div className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-800 dark:text-red-300">
              {formError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-8 pb-6 pt-0 border-t border-slate-200/90 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={save}
            disabled={submitting || !targetId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {m.closing}
              </>
            ) : (
              m.confirmClose
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
