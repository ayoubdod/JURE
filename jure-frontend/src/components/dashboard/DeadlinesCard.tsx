import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ServerSelect from '@/components/common/ServerSelect';
import DashboardCollapsibleCard from '@/components/dashboard/DashboardCollapsibleCard';
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, Loader2, Scale } from 'lucide-react';
import { formatDate, useAppTranslation } from '@/i18n';
import { isAxiosError } from 'axios';
import {
  apiCalculateDeadline,
  apiCreateTaskFromDeadline,
  apiGetDeadlineRules,
  apiGetLegalDeadlines,
  apiGetLegalDomains,
  apiSaveLegalDeadline,
  type CalculateResponse,
  type CalculatedDeadline,
  type DeadlineRule,
  type LegalDomain,
} from '@/services/legal-deadlines/api';
import CaseLegalDeadlinesList, {
  unwrapDeadlineList,
} from '@/components/case/CaseLegalDeadlinesList';
import {
  deadlineComputationLabel,
  deadlineDomainLabel,
  deadlineDurationLabel,
  deadlineEventLabel,
  deadlineProcedureLabel,
  deadlineRuleTitle,
} from '@/lib/legalDeadlineLabels';

type Props = {
  /** When opened from a case, bind to that matter id. */
  caseId?: number;
};

function drfErrorMessage(err: unknown, fallback: string, extraField?: string): string {
  if (!isAxiosError(err) || !err.response?.data || typeof err.response.data !== 'object') {
    return fallback;
  }
  const data = err.response.data as Record<string, unknown>;
  if (typeof data.detail === 'string') return data.detail;
  if (extraField) {
    const field = data[extraField];
    const first = Array.isArray(field) ? field[0] : field;
    if (typeof first === 'string') return first;
  }
  return fallback;
}

export default function DeadlinesCard({ caseId }: Props) {
  const { t, tf, lang } = useAppTranslation();
  const d = t.dashboard.deadlines;
  const { toast } = useToast();
  const [domains, setDomains] = useState<LegalDomain[]>([]);
  const [rules, setRules] = useState<DeadlineRule[]>([]);
  const [domain, setDomain] = useState('civil_procedure');
  const [procedureType, setProcedureType] = useState<string>('');
  const [triggeringDate, setTriggeringDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [selectedCaseId, setSelectedCaseId] = useState<number | undefined>(caseId);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [saved, setSaved] = useState<CalculatedDeadline | null>(null);
  const [useManual, setUseManual] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState<number[]>([7, 3, 1, 0]);
  const [caseDeadlines, setCaseDeadlines] = useState<CalculatedDeadline[]>([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const reminderOptions = useMemo(
    () => [
      { value: 30, label: tf(d.reminderDaysBefore, { n: 30 }) },
      { value: 14, label: tf(d.reminderDaysBefore, { n: 14 }) },
      { value: 7, label: tf(d.reminderDaysBefore, { n: 7 }) },
      { value: 3, label: tf(d.reminderDaysBefore, { n: 3 }) },
      { value: 1, label: d.reminderDayBefore },
      { value: 0, label: d.reminderDayOf },
    ],
    [d, tf]
  );

  const formatDisplayDate = (iso: string) => {
    try {
      return formatDate(`${iso}T00:00:00`, lang);
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    if (caseId) setSelectedCaseId(caseId);
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedCaseId) {
      setCaseDeadlines([]);
      return;
    }
    (async () => {
      try {
        const res = await apiGetLegalDeadlines({ case: selectedCaseId });
        if (!cancelled) {
          setCaseDeadlines(unwrapDeadlineList(res.data).filter((x) => x.status !== 'cancelled'));
        }
      } catch {
        if (!cancelled) setCaseDeadlines([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCaseId, listRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingMeta(true);
        const [domainRes, rulesRes] = await Promise.all([
          apiGetLegalDomains(),
          apiGetDeadlineRules({ domain: 'civil_procedure', as_of: triggeringDate }),
        ]);
        if (cancelled) return;
        setDomains(domainRes.data);
        setRules(rulesRes.data);
        if (!procedureType && rulesRes.data[0]) {
          setProcedureType(rulesRes.data[0].procedure_type);
        }
      } catch {
        if (!cancelled) setError(d.errors.loadRules);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reload rules when triggering date changes (version windows).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggeringDate]);

  const selectedRule = useMemo(
    () => rules.find((r) => r.procedure_type === procedureType) || null,
    [rules, procedureType]
  );

  const selectedDomain = domains.find((x) => x.value === domain);

  const onCalculate = async () => {
    setError(null);
    setSaved(null);
    if (!selectedDomain?.available) {
      setError(d.errors.noVerifiedRule);
      return;
    }
    if (!procedureType) {
      setError(d.errors.additionalInfo);
      return;
    }
    if (!triggeringDate) {
      setError(d.errors.additionalInfo);
      return;
    }
    try {
      setCalculating(true);
      const res = await apiCalculateDeadline({
        legal_domain: domain,
        procedure_type: procedureType,
        event_type: selectedRule?.event_type || 'notification',
        triggering_date: triggeringDate,
        rule_id: selectedRule?.id,
      });
      setResult(res.data);
      setManualDate(res.data.calculated_deadline);
    } catch (err) {
      setError(drfErrorMessage(err, d.errors.calculate, 'legal_domain'));
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    if (!selectedCaseId) {
      setError(d.errors.selectCase);
      return;
    }
    if (useManual && !manualDate) {
      setError(d.errors.enterManualDate);
      return;
    }
    if (useManual && !overrideReason.trim()) {
      setError(d.errors.overrideReason);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await apiSaveLegalDeadline({
        case: selectedCaseId,
        legal_domain: domain,
        procedure_type: procedureType,
        event_type: selectedRule?.event_type || 'notification',
        triggering_date: triggeringDate,
        rule_id: selectedRule?.id,
        notes,
        manual_deadline: useManual ? manualDate : null,
        override_reason: useManual ? overrideReason : '',
        reminder_offsets: reminders,
      });
      setSaved(res.data);
      setCaseDeadlines((prev) => [res.data, ...prev.filter((x) => x.id !== res.data.id)]);
      setListRefreshKey((k) => k + 1);
      toast({
        title: d.toasts.savedTitle,
        description: tf(d.toasts.savedDescription, {
          date: formatDisplayDate(res.data.final_deadline),
        }),
      });
    } catch (err) {
      setError(drfErrorMessage(err, d.errors.save, 'case'));
    } finally {
      setSaving(false);
    }
  };

  const onCreateTask = async () => {
    if (!saved) return;
    try {
      setCreatingTask(true);
      await apiCreateTaskFromDeadline(saved.id, {
        title: tf(d.taskTitle, {
          label: deadlineProcedureLabel(lang, selectedRule?.procedure_type, selectedRule?.procedure_type_label) || d.legalDeadline,
        }),
        priority: 'high',
      });
      toast({
        title: d.toasts.taskCreatedTitle,
        description: tf(d.toasts.taskCreatedDescription, {
          date: formatDisplayDate(saved.final_deadline),
        }),
      });
    } catch {
      toast({
        title: d.toasts.taskCreateFailedTitle,
        description: d.toasts.taskCreateFailedDescription,
        variant: 'destructive',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const toggleReminder = (days: number) => {
    setReminders((prev) =>
      prev.includes(days) ? prev.filter((x) => x !== days) : [...prev, days].sort((a, b) => b - a)
    );
  };

  return (
    <DashboardCollapsibleCard
      className="rounded-2xl"
      title={
        <span className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          {d.title}
        </span>
      }
      description={d.description}
      contentClassName="space-y-4"
    >
        {selectedCaseId ? (
          <div className="space-y-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
            <p className="text-xs font-medium text-slate-900 dark:text-white">{d.savedOnCase}</p>
            <CaseLegalDeadlinesList
              caseId={selectedCaseId}
              items={caseDeadlines}
              refreshKey={listRefreshKey}
              onLoaded={setCaseDeadlines}
            />
          </div>
        ) : null}

        {loadingMeta ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> {d.loadingRules}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{d.legalDomain}</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((item) => (
                      <SelectItem key={item.value} value={item.value} disabled={!item.available}>
                        {deadlineDomainLabel(lang, item.value, item.label)}
                        {!item.available ? d.soon : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{d.procedure}</Label>
                <Select value={procedureType} onValueChange={setProcedureType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={d.selectProcedure} />
                  </SelectTrigger>
                  <SelectContent>
                    {rules.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        {d.noVerifiedRule}
                      </SelectItem>
                    ) : (
                      rules.map((r) => (
                        <SelectItem key={r.id} value={r.procedure_type}>
                          {deadlineProcedureLabel(lang, r.procedure_type, r.procedure_type_label)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{d.triggeringEvent}</Label>
                <Input
                  value={deadlineEventLabel(
                    lang,
                    selectedRule?.event_type,
                    selectedRule?.event_type_label || d.officialNotification
                  )}
                  readOnly
                  className="h-9 bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{d.triggeringEventDate}</Label>
                <Input
                  type="date"
                  value={triggeringDate}
                  onChange={(e) => setTriggeringDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {!caseId && (
              <div className="space-y-1.5">
                <Label className="text-xs">{d.caseMatter}</Label>
                <ServerSelect
                  link="/cases/"
                  value={selectedCaseId}
                  onChange={(v) => setSelectedCaseId(v ? Number(v) : undefined)}
                  labelKey={(o) => `${o.reference || ''} — ${o.title || ''}`.trim()}
                  valueKey="id"
                  placeholder={d.selectCase}
                  cleanable
                />
              </div>
            )}

            {selectedRule && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {deadlineDurationLabel(lang, selectedRule.duration_value, selectedRule.duration_unit)} ·{' '}
                {deadlineComputationLabel(
                  lang,
                  selectedRule.computation_method,
                  selectedRule.computation_method_label
                )}
                {selectedRule.article_reference
                  ? ` · ${selectedRule.article_reference}`
                  : ''}
                {selectedRule.version
                  ? ` · ${tf(d.ruleMeta, { version: selectedRule.version })}`
                  : ''}
              </p>
            )}

            <Button
              onClick={onCalculate}
              disabled={calculating || !procedureType}
              className="w-full rounded-lg"
            >
              {calculating ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" /> {d.calculating}
                </>
              ) : (
                d.calculate
              )}
            </Button>

            {error && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-3 rounded-xl border border-emerald-100 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/80 font-medium">
                    {d.legalDeadline}
                  </p>
                  <p className="text-2xl font-semibold text-emerald-950 dark:text-emerald-100 mt-1">
                    {formatDisplayDate(
                      useManual && manualDate ? manualDate : result.calculated_deadline
                    )}
                  </p>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 mt-1">
                    {tf(d.durationFrom, {
                      duration: deadlineDurationLabel(
                        lang,
                        result.rule.duration_value,
                        result.rule.duration_unit
                      ) || result.explanation.legal_duration,
                      event: deadlineEventLabel(
                        lang,
                        result.explanation.starting_event_type,
                        result.explanation.starting_event_type.replace(/_/g, ' ')
                      ),
                    })}
                  </p>
                  <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70 mt-0.5">
                    {tf(d.calculatedUnder, {
                      source:
                        result.explanation.legal_source || result.rule.article_reference || '',
                    })}
                  </p>
                  {useManual && (
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mt-2">{d.manuallyVerified}</p>
                  )}
                </div>

                <dl className="grid grid-cols-1 gap-1.5 text-xs text-emerald-950/90 dark:text-emerald-100/90">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.startingEvent}</dt>
                    <dd>{formatDisplayDate(result.explanation.starting_event_date)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.applicableRule}</dt>
                    <dd className="text-end">
                      {deadlineRuleTitle(lang, result.rule, result.explanation.applicable_rule)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.computation}</dt>
                    <dd>
                      {deadlineComputationLabel(
                        lang,
                        result.explanation.computation_method,
                        result.explanation.computation_method_label
                      )}
                    </dd>
                  </div>
                  {result.explanation.non_working_day_adjustment && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{d.nonWorkingDayAdjustment}</dt>
                      <dd className="text-end">
                        {formatDisplayDate(result.explanation.non_working_day_adjustment.original)}{' '}
                        →{' '}
                        {formatDisplayDate(
                          result.explanation.non_working_day_adjustment.adjusted_to
                        )}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.ruleVersionLabel}</dt>
                    <dd>{result.explanation.rule_version}</dd>
                  </div>
                </dl>

                {result.explanation.uncertainty && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    {d.uncertaintyFallback}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-emerald-100 dark:border-emerald-800/60 pt-2">
                  {d.disclaimer}
                </p>

                <div className="space-y-2 border-t border-emerald-100 dark:border-emerald-800/60 pt-3">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={useManual}
                      onCheckedChange={(v) => setUseManual(Boolean(v))}
                    />
                    {d.enterVerifiedManually}
                  </label>
                  {useManual && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{d.verifiedDate}</Label>
                        <Input
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{d.reason}</Label>
                        <Input
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder={d.reasonPlaceholder}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{d.remindersLabel}</Label>
                  <div className="flex flex-wrap gap-2">
                    {reminderOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleReminder(opt.value)}
                        className={`text-[11px] rounded-md border px-2 py-1 transition-colors ${
                          reminders.includes(opt.value)
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-muted-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{d.notes}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder={d.notesPlaceholder}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={onSave}
                    disabled={saving || !selectedCaseId}
                    className="flex-1 rounded-lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" /> {t.common.saving}
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="me-2 h-4 w-4" /> {d.saveToCase}
                      </>
                    )}
                  </Button>
                  {saved && (
                    <Button
                      variant="outline"
                      onClick={onCreateTask}
                      disabled={creatingTask}
                      className="flex-1 rounded-lg"
                    >
                      {creatingTask ? d.creating : d.createTask}
                    </Button>
                  )}
                </div>

                {saved && (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    {tf(d.savedPersisted, {
                      reference: saved.case_reference || '',
                      title: saved.case_title || '',
                    })}
                  </p>
                )}
              </div>
            )}
          </>
        )}
    </DashboardCollapsibleCard>
  );
}
