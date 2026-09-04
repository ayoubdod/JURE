import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { clientContactPerson, formatDuration } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { getCaseData } from '@/utils/caseCardHelpers';
import { getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { getStatusColor } from '@/utils/caseCardHelpers';
import { TaskStatus } from '@/utils/constants';
import { apiGetLegalDeadlines, type CalculatedDeadline } from '@/services/legal-deadlines/api';
import { unwrapDeadlineList } from '@/components/case/CaseLegalDeadlinesList';
import { deadlineRuleTitle } from '@/lib/legalDeadlineLabels';
import {
  attorneysOf,
  consultationWhen,
  hoursUntil,
  outcomeOf,
  personName,
  type ConsultationDetailSection,
} from './helpers';

type Copy = ReturnType<typeof useAppTranslation>['t']['cases']['workspaces']['consultation']['detail'];

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ExpandableText({ text, copy }: { text: string; copy: Copy }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  const shown = !long || open ? text : `${text.slice(0, 280).trim()}…`;
  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800 dark:text-zinc-200">
        {shown}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 text-[12px] font-medium text-[#64499D] hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? copy.showLess : copy.showMore}
        </button>
      ) : null}
    </div>
  );
}

export default function ConsultationOverview({
  caseItem,
  canEdit,
  canConvert,
  onOpenSection,
  onEdit,
  onFollowUp,
  onConvert,
  onOpenClient,
  onOpenCase,
  onAddTask,
  onAddAppointment,
  onUpload,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  canConvert: boolean;
  onOpenSection: (id: ConsultationDetailSection) => void;
  onEdit: () => void;
  onFollowUp: () => void;
  onConvert: () => void;
  onOpenClient: () => void;
  onOpenCase: (id: number) => void;
  onAddTask: () => void;
  onAddAppointment: () => void;
  onUpload: () => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const cw = t.cases.modal.consultationWorkflow;
  const status = outcomeOf(caseItem);
  const dt = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const when = consultationWhen(dt, lang);
  const format = getCaseData(caseItem, 'format') as string | undefined;
  const duration =
    (getCaseData(caseItem, 'duration_minutes') as number | undefined) ??
    (getCaseData(caseItem, 'duration') as string | undefined);
  const videoLink = getCaseData(caseItem, 'video_link') as string | undefined;
  const legalDomain = getCaseData(caseItem, 'legal_domain') as string | undefined;
  const customDomain = getCaseData(caseItem, 'custom_legal_domain') as string | undefined;
  const legalQuestion = (getCaseData(caseItem, 'legal_question') as string) || '';
  const facts = (getCaseData(caseItem, 'facts_context') as string) || '';
  const advice = (getCaseData(caseItem, 'advice_summary') as string) || '';
  const followRequired = Boolean(getCaseData(caseItem, 'follow_up_required'));
  const attorneys = attorneysOf(caseItem);
  const converted = getConvertedToCase(caseItem);
  const followUps = caseItem.followUps ?? [];
  const tasks = caseItem._related?.tasks ?? [];
  const attachments = caseItem.attachments ?? [];
  const activity = caseItem.activity ?? [];
  const hours = hoursUntil(dt);
  const upcoming = hours != null && hours > 0 && status === 'SCHEDULED';
  const urgentSoon = upcoming && hours <= 24;

  const [deadlines, setDeadlines] = useState<CalculatedDeadline[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiGetLegalDeadlines({ case: caseItem.id })
      .then((res) => {
        if (cancelled) return;
        const next = unwrapDeadlineList(res.data)
          .filter((d) => d.status !== 'cancelled' && d.status !== 'completed')
          .slice(0, 3);
        setDeadlines(next);
      })
      .catch(() => {
        if (!cancelled) setDeadlines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [caseItem.id]);

  const domainLabel =
    legalDomain === 'OTHER' && customDomain ? customDomain : legalDomain ? enumPretty(legalDomain) : '';

  const clientType = (caseItem.client as { client_type?: string } | undefined)?.client_type;

  const convertedType = converted
    ? String(converted.caseType ?? converted.case_type ?? '').toUpperCase().includes('ADMIN')
      ? t.cases.workspaces.administrative.title
      : t.cases.workspaces.litigation.title
    : '';

  const taskDueLabel = (iso?: string, taskStatus?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
    if (taskStatus === TaskStatus.DONE) return enumPretty(taskStatus);
    if (diff === 0) return copy.dueToday;
    if (diff === 1) return copy.dueTomorrow;
    return formatDate(d, lang, { day: 'numeric', month: 'short' });
  };

  const quick = useMemo(() => {
    const items: { key: string; label: string; onClick: () => void; show: boolean }[] = [
      { key: 'edit', label: copy.edit, onClick: onEdit, show: canEdit },
      { key: 'follow', label: t.cases.workspaces.consultation.actions.addFollowUp, onClick: onFollowUp, show: canEdit && status !== 'CANCELLED' },
      { key: 'task', label: copy.addTask, onClick: onAddTask, show: true },
      { key: 'appt', label: copy.addAppointment, onClick: onAddAppointment, show: true },
      { key: 'deadline', label: copy.addDeadline, onClick: () => onOpenSection('deadlines'), show: true },
      { key: 'doc', label: copy.upload, onClick: onUpload, show: canEdit },
      { key: 'note', label: copy.addNote, onClick: onEdit, show: canEdit },
      { key: 'client', label: copy.openClient, onClick: onOpenClient, show: Boolean(caseItem.client?.id) },
      { key: 'case', label: copy.openCase, onClick: () => converted && onOpenCase(converted.id), show: Boolean(converted) },
      { key: 'convert', label: t.cases.workspaces.consultation.actions.convert, onClick: onConvert, show: canConvert },
    ];
    return items.filter((i) => i.show);
  }, [
    canConvert,
    canEdit,
    caseItem.client?.id,
    converted,
    copy,
    onAddAppointment,
    onAddTask,
    onConvert,
    onEdit,
    onFollowUp,
    onOpenCase,
    onOpenClient,
    onOpenSection,
    onUpload,
    status,
    t.cases.workspaces.consultation.actions.addFollowUp,
    t.cases.workspaces.consultation.actions.convert,
  ]);

  return (
    <div className="space-y-4">
      {upcoming ? (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
            urgentSoon
              ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20'
              : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20'
          )}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{copy.upcomingTitle}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-slate-900 dark:text-white">
              {hours != null && hours < 24 && hours > 0
                ? hours < 1.5
                  ? when.time
                  : tf(copy.inHours, { hours: Math.max(1, Math.round(hours)) })
                : `${when.date} · ${when.time}`}
            </p>
            <p className="text-[12px] text-slate-600">{format ? enumPretty(format) : ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {format === 'VIDEO' && videoLink ? (
              <Button size="sm" className="h-8 text-[12px]" asChild>
                <a href={videoLink} target="_blank" rel="noreferrer">
                  {copy.joinVideo}
                </a>
              </Button>
            ) : null}
            {caseItem.client?.id ? (
              <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onOpenClient}>
                {copy.openClient}
              </Button>
            ) : null}
            {canEdit ? (
              <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onEdit}>
                {copy.edit}
              </Button>
            ) : null}
          </div>
        </div>
      ) : status === 'COMPLETED' ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-200">
            {copy.completedBanner}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-700 dark:text-zinc-200">
            {when.date}
            {when.time ? ` · ${when.time}` : ''}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card title={t.cases.typeLabels.consultation}>
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{when.date || '—'}</p>
          <p className="text-[12px] text-slate-600">{when.time}</p>
          <p className="mt-1 text-[12px] text-slate-500">
            {[format ? enumPretty(format) : null, formatDuration(duration) || null].filter(Boolean).join(' · ')}
          </p>
        </Card>
        <Card
          title={t.cases.pageWorkspace.client}
          action={
            caseItem.client?.id ? (
              <button type="button" className="text-[11px] font-medium text-[#64499D] hover:underline" onClick={onOpenClient}>
                {copy.openClient}
              </button>
            ) : null
          }
        >
          <CaseClientLabel
            client={caseItem.client}
            fallback="—"
            nameClassName="text-[14px] font-semibold text-slate-900 dark:text-white"
          />
          {clientContactPerson(caseItem.client) ? null : (
            <p className="text-[12px] text-slate-500">
              {clientType ? enumPretty(clientType) : copy.clientTypeUnknown}
            </p>
          )}
        </Card>
        <Card title={copy.assignedTo}>
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white">
            {personName(attorneys[0]) || '—'}
          </p>
          {attorneys.length > 1 ? (
            <p className="text-[12px] text-slate-500">{tf(copy.plusAttorneys, { count: attorneys.length - 1 })}</p>
          ) : null}
        </Card>
        <Card title={t.cases.modal.fields.status}>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
              getStatusColor(status)
            )}
          >
            {enumPretty(status)}
          </span>
        </Card>
      </div>

      <Card title={copy.caseCard}>
        {converted ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                {tf(copy.convertedTo, { type: convertedType })}
              </p>
              <p className="font-mono text-[12px] text-slate-500">{converted.reference}</p>
            </div>
            <Button size="sm" className="h-8 text-[12px]" onClick={() => onOpenCase(converted.id)}>
              {copy.openCase}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-slate-600">{copy.notConverted}</p>
            {canConvert ? (
              <Button size="sm" className="h-8 text-[12px]" onClick={onConvert}>
                {t.cases.workspaces.consultation.actions.convert}
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      {(legalQuestion || facts || domainLabel) ? (
        <Card title={copy.legalContext}>
          {domainLabel ? (
            <p className="mb-2 text-[12px] font-medium text-slate-500">
              {t.cases.modal.fields.legalDomain}: {domainLabel}
            </p>
          ) : null}
          {legalQuestion ? (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {t.cases.modal.fields.legalQuestion}
              </p>
              <ExpandableText text={legalQuestion} copy={copy} />
            </div>
          ) : null}
          {facts ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{cw.facts}</p>
              <ExpandableText text={facts} copy={copy} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {status === 'COMPLETED' || advice || followRequired || followUps.length ? (
        <Card title={copy.outcome}>
          {advice ? (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {copy.adviceSummary}
              </p>
              <ExpandableText text={advice} copy={copy} />
            </div>
          ) : null}
          <p className="text-[13px] text-slate-700 dark:text-zinc-200">
            {copy.followUpRequired}: {followRequired || followUps.length ? t.cases.workspaces.yes : t.cases.workspaces.no}
          </p>
          {followUps[0] ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-zinc-900">
              <div>
                <p className="text-[12px] font-medium text-slate-800 dark:text-zinc-100">{copy.nextConsultation}</p>
                <p className="text-[12px] text-slate-500">
                  {followUps[0].consultationDate
                    ? formatDate(followUps[0].consultationDate, lang, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : followUps[0].reference}
                  {followUps[0].format ? ` · ${enumPretty(followUps[0].format)}` : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => onOpenSection('administrative')}>
                {copy.viewFollowUp}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card
          title={copy.documents}
          action={
            <button type="button" className="text-[11px] font-medium text-[#64499D] hover:underline" onClick={() => onOpenSection('documents')}>
              {copy.viewAll}
            </button>
          }
        >
          {attachments.length === 0 ? (
            <div>
              <p className="text-[13px] text-slate-500">{copy.noDocuments}</p>
              {canEdit ? (
                <Button size="sm" variant="outline" className="mt-2 h-8 text-[12px]" onClick={onUpload}>
                  {copy.upload}
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {attachments.slice(0, 3).map((att) => (
                <li key={att.id} className="truncate text-[13px] text-slate-800 dark:text-zinc-100">
                  {att.file_name || att.file_url}
                </li>
              ))}
              {attachments.length > 3 ? (
                <li className="text-[12px] text-slate-500">{tf(copy.moreFiles, { count: attachments.length - 3 })}</li>
              ) : null}
            </ul>
          )}
        </Card>

        <Card
          title={copy.tasks}
          action={
            <button type="button" className="text-[11px] font-medium text-[#64499D] hover:underline" onClick={() => onOpenSection('tasks')}>
              {copy.viewAll}
            </button>
          }
        >
          {tasks.length === 0 ? (
            <div>
              <p className="text-[13px] text-slate-500">{copy.noTasks}</p>
              <Button size="sm" variant="outline" className="mt-2 h-8 text-[12px]" onClick={onAddTask}>
                {copy.addTask}
              </Button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {tasks.slice(0, 3).map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-2 text-[13px]">
                  <span className={cn(task.status === TaskStatus.DONE && 'text-slate-400 line-through')}>{task.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">{taskDueLabel(task.due_date, task.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title={copy.upcomingDeadlines}
        action={
          <button type="button" className="text-[11px] font-medium text-[#64499D] hover:underline" onClick={() => onOpenSection('deadlines')}>
            {copy.viewAll}
          </button>
        }
      >
        {deadlines == null ? (
          <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ) : deadlines.length === 0 ? (
          <div>
            <p className="text-[13px] text-slate-500">{copy.noDeadlines}</p>
            <Button size="sm" variant="outline" className="mt-2 h-8 text-[12px]" onClick={() => onOpenSection('deadlines')}>
              {copy.addDeadline}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {deadlines.map((d) => (
              <li key={d.id} className="flex items-baseline gap-3 text-[13px]">
                <span className="w-16 shrink-0 tabular-nums font-medium text-slate-700 dark:text-zinc-200">
                  {formatDate(d.final_deadline, lang, { day: 'numeric', month: 'short' })}
                </span>
                <span className="min-w-0 truncate text-slate-800 dark:text-zinc-100">
                  {deadlineRuleTitle(lang, d.rule, d.notes || '—')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={copy.quickActions}>
        <div className="flex flex-wrap gap-2">
          {quick.map((item) => (
            <Button key={item.key} type="button" size="sm" variant="outline" className="h-8 text-[12px]" onClick={item.onClick}>
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card
        title={copy.recentActivity}
        action={
          <button type="button" className="text-[11px] font-medium text-[#64499D] hover:underline" onClick={() => onOpenSection('activity')}>
            {copy.viewAll}
          </button>
        }
      >
        {activity.length === 0 ? (
          <p className="text-[13px] text-slate-500">{copy.noActivity}</p>
        ) : (
          <ol className="space-y-2">
            {activity.slice(0, 4).map((item) => (
              <li key={item.id} className="text-[13px]">
                <p className="text-slate-800 dark:text-zinc-100">{item.message}</p>
                <p className="text-[11px] text-slate-500">
                  {item.created
                    ? formatDate(item.created, lang, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
