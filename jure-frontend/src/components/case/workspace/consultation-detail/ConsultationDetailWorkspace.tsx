'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileText,
  Flag,
  History,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Sparkles,
  StickyNote,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import { clientDisplayName, formatDuration } from '@/services/case/caseType';
import { caseTypeListPath, caseWorkspacePath, navigateToCaseById } from '@/lib/caseRoutes';
import { ConsultationSection } from '@/components/case/case-detail-drawer/consultation-section';
import { RelatedTasksAppointmentsSection } from '@/components/case/case-detail-drawer/RelatedTasksAppointmentsSection';
import { Field, LongText, SectionTitle } from '@/components/case/case-detail-drawer/primitives';
import {
  formatDrawerDateTime,
  formatUserDisplayName,
  getCaseUpdatedAtIso,
  getCaseUpdatedByUser,
} from '@/components/case/case-detail-drawer/format';
import { canShowConvertToCase } from '@/components/case/conversion/ConvertedCaseLink';
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import CaseDeleteModal, { CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, {
  ScheduleAppointmentDialogRef,
} from '@/components/ScheduleAppointmentDialog';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/AppointmentUpdateModal';
import { TaskDetailPanel, AppointmentDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import { CaseTypeSelector, type ConversionTargetType } from '@/components/case/conversion/CaseTypeSelector';
import { ConversionForm } from '@/components/case/conversion/ConversionForm';
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import { useToast } from '@/hooks/use-toast';
import { apiGetCase, apiRetryConsultationEmail, apiUpdateCase, apiUploadCaseAttachment } from '@/services/case/api';
import { apiGetClient } from '@/services/client/api';
import type { Appointment } from '@/services/appointment/api';
import ConsultationOverview from './ConsultationOverview';
import {
  attorneysOf,
  consultationTypeBadge,
  consultationWhen,
  isCancelled,
  outcomeOf,
  parseConsultationSection,
  personName,
  type ConsultationDetailSection,
} from './helpers';

const NAV: Array<{
  id: ConsultationDetailSection;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'administrative', icon: ClipboardList },
  { id: 'tasks', icon: CheckSquare },
  { id: 'appointments', icon: CalendarClock },
  { id: 'deadlines', icon: Flag },
  { id: 'documents', icon: FileText },
  { id: 'notes', icon: StickyNote },
  { id: 'finance', icon: Wallet },
  { id: 'juria', icon: Sparkles },
  { id: 'activity', icon: History },
];

export default function ConsultationDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const pw = t.cases.pageWorkspace;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = usePermission('cases.edit');
  const canDelete = usePermission('cases.delete');
  const { authorized: showFinance } = useFinanceAccess();

  const navItems = useMemo(
    () =>
      NAV.filter((item) => {
        if (item.id === 'finance') return showFinance;
        if (item.id === 'juria') return JURIA_ENABLED;
        return true;
      }),
    [showFinance]
  );

  const requested = parseConsultationSection(searchParams.get('tab'));
  const active: ConsultationDetailSection = navItems.some((n) => n.id === requested) ? requested : 'overview';

  const caseModalRef = useRef<CaseModalRef>(null);
  const deleteRef = useRef<CaseDeleteModalRef>(null);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);
  const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);
  const clientPreviewRef = useRef<ClientProfilePreviewRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [detailAppointmentId, setDetailAppointmentId] = useState<number | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [conversionFormOpen, setConversionFormOpen] = useState(false);
  const [conversionTarget, setConversionTarget] = useState<ConversionTargetType | null>(null);

  const setSection = (next: ConsultationDetailSection) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const canConvert = canShowConvertToCase(caseItem);
  const status = outcomeOf(caseItem);
  const ctype = consultationTypeBadge(caseItem);
  const dt = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const when = consultationWhen(dt, lang);
  const format = getCaseData(caseItem, 'format') as string | undefined;
  const duration =
    (getCaseData(caseItem, 'duration_minutes') as number | undefined) ??
    (getCaseData(caseItem, 'duration') as string | undefined);
  const videoLink = getCaseData(caseItem, 'video_link') as string | undefined;
  const attorneys = attorneysOf(caseItem);
  const followCount = caseItem.followUpCount ?? caseItem.followUps?.length ?? 0;
  const notesAdvice = (getCaseData(caseItem, 'advice_summary') as string) || '';
  const notesInternal = caseItem.summary || caseItem.description || '';
  const listPath = caseTypeListPath('CONSULTATION');
  const relatedLabel = [caseItem.reference, caseItem.title].filter(Boolean).join(' — ') || `Case #${caseItem.id}`;

  useEffect(() => {
    if (searchParams.get('convert') !== '1' || !canConvert) return;
    setTypeSelectorOpen(true);
    const params = new URLSearchParams(searchParams);
    params.delete('convert');
    setSearchParams(params, { replace: true });
  }, [canConvert, searchParams, setSearchParams]);

  useEffect(() => {
    if (window.location.hash !== '#follow-ups') return;
    setSection('administrative');
    requestAnimationFrame(() => document.getElementById('follow-ups')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on hash / case change
  }, [caseItem.id]);

  const refreshDetail = async () => {
    const res = await apiGetCase(caseItem.id);
    onCaseChange(res.data);
  };

  const addTask = () => taskCreateRef.current?.show({ relatedCaseId: caseItem.id, relatedCaseLabel: relatedLabel });
  const addAppointment = () =>
    appointmentCreateRef.current?.show({ relatedCaseId: caseItem.id, relatedCaseLabel: relatedLabel });
  const openRelated = (id: number) => {
    void navigateToCaseById(navigate, id);
  };

  const openClient = async () => {
    const id = caseItem.client?.id;
    if (!id) return;
    try {
      const res = await apiGetClient(id);
      clientPreviewRef.current?.show(res.data);
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const patchOutcome = async (next: 'COMPLETED' | 'CANCELLED') => {
    const existing = (caseItem.case_specific_data as Record<string, unknown>) ?? {};
    try {
      await apiUpdateCase({ id: caseItem.id, case_specific_data: { ...existing, outcome: next } });
      toast({ title: t.common.success });
      await refreshDetail();
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const sendEmail = () => {
    void apiRetryConsultationEmail(caseItem.id)
      .then(async () => {
        toast({ title: t.cases.modal.consultationWorkflow.emailSent });
        await refreshDetail();
      })
      .catch(() => {
        toast({ title: t.cases.modal.consultationWorkflow.emailFailed, variant: 'destructive' });
      });
  };

  const uploadFile = (file: File) => {
    void apiUploadCaseAttachment(caseItem.id, file)
      .then(async () => {
        toast({ title: t.cases.modal.consultationWorkflow.attachments });
        await refreshDetail();
      })
      .catch(() =>
        toast({ title: t.cases.modal.consultationWorkflow.attachmentFailed, variant: 'destructive' })
      );
  };

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-9 rounded-lg px-2.5">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ms-1">{pw.more}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={sendEmail}>{copy.sendEmail}</DropdownMenuItem>
        {canEdit && status !== 'COMPLETED' && status !== 'CANCELLED' ? (
          <DropdownMenuItem onClick={() => void patchOutcome('COMPLETED')}>{copy.markCompleted}</DropdownMenuItem>
        ) : null}
        {canEdit && status !== 'CANCELLED' && status !== 'COMPLETED' ? (
          <DropdownMenuItem onClick={() => void patchOutcome('CANCELLED')}>{copy.cancelConsultation}</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => setConflictOpen(true)}>{pw.conflictCheck}</DropdownMenuItem>
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => deleteRef.current?.show(caseItem)}>
              <Trash2 className="h-4 w-4" />
              {t.cases.workspaces.consultation.actions.delete}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="max-h-[min(50vh,28rem)] min-h-0 shrink-0 overflow-y-auto overscroll-contain border-b border-[#64499D]/10 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-[#64499D]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </button>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[12px] text-slate-500">{caseItem.reference || '—'}</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {caseItem.title || t.cases.untitledCase}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {ctype ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200">
                    {enumPretty(ctype)}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                    getStatusColor(status)
                  )}
                >
                  {enumPretty(status)}
                </span>
                {followCount > 0 ? (
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200">
                    {copy.followUps} · {followCount}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] text-slate-600 dark:text-zinc-300">
                {[
                  clientDisplayName(caseItem.client) || null,
                  attorneys[0]
                    ? `${copy.assignedTo} ${personName(attorneys[0])}${
                        attorneys.length > 1 ? ` ${tf(copy.plusAttorneys, { count: attorneys.length - 1 })}` : ''
                      }`
                    : null,
                  when.date ? `${when.date}${when.time ? ` · ${when.time}` : ''}` : null,
                  format ? enumPretty(format) : null,
                  formatDuration(duration) || null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canEdit ? (
                <Button
                  type="button"
                  className="h-9 rounded-lg bg-[#64499D] px-3 text-[12px] font-semibold text-white hover:bg-[#4D3680]"
                  onClick={() => caseModalRef.current?.show(caseItem)}
                >
                  <Pencil className="h-4 w-4" />
                  {copy.edit}
                </Button>
              ) : null}
              {canEdit && !isCancelled(caseItem) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden h-9 rounded-lg sm:inline-flex"
                  onClick={() => caseModalRef.current?.show(undefined, { followUpOf: caseItem })}
                >
                  {t.cases.workspaces.consultation.actions.addFollowUp}
                </Button>
              ) : null}
              {canConvert ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden h-9 rounded-lg sm:inline-flex"
                  onClick={() => setTypeSelectorOpen(true)}
                >
                  {t.cases.workspaces.consultation.actions.convert}
                </Button>
              ) : null}
              {format === 'VIDEO' && videoLink ? (
                <Button type="button" variant="outline" className="h-9 rounded-lg" asChild>
                  <a href={videoLink} target="_blank" rel="noreferrer">
                    {copy.joinVideo}
                  </a>
                </Button>
              ) : null}
              {moreMenu}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          className="min-w-0 shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:min-h-0 lg:w-[232px] lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-e"
          aria-label={copy.navLabel}
        >
          <div className="p-2 lg:hidden">
            <Select value={active} onValueChange={(v) => setSection(v as ConsultationDetailSection)}>
              <SelectTrigger className="h-9 w-full text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {navItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {copy.sections[item.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin] lg:flex">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {copy.navLabel}
            </p>
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const on = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-medium',
                      on
                        ? 'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{copy.sections[item.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className={cn('px-3 py-4 sm:px-5 lg:px-6', active === 'juria' && 'flex min-h-full flex-col p-0')}>
            {active === 'overview' ? (
              <ConsultationOverview
                caseItem={caseItem}
                canEdit={canEdit}
                canConvert={canConvert}
                onOpenSection={setSection}
                onEdit={() => caseModalRef.current?.show(caseItem)}
                onFollowUp={() => caseModalRef.current?.show(undefined, { followUpOf: caseItem })}
                onConvert={() => setTypeSelectorOpen(true)}
                onOpenClient={() => void openClient()}
                onOpenCase={openRelated}
                onAddTask={addTask}
                onAddAppointment={addAppointment}
                onUpload={() => fileInputRef.current?.click()}
              />
            ) : null}

            {active === 'administrative' ? (
              <div className="space-y-6">
                <section className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {copy.consultationInfo}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.cases.modal.fields.reference}>{caseItem.reference || '—'}</Field>
                    <Field label={t.cases.modal.fields.title}>{caseItem.title || '—'}</Field>
                    <Field label={t.cases.modal.fields.consultationType}>
                      {ctype ? enumPretty(ctype) : '—'}
                    </Field>
                    <Field label={t.cases.modal.fields.status}>{enumPretty(status)}</Field>
                    <Field label={copy.created}>
                      <div>
                        {formatDrawerDateTime(caseItem.created)}
                        <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(caseItem.created_by)}</p>
                      </div>
                    </Field>
                    <Field label={pw.activityTitle}>
                      <div>
                        {formatDrawerDateTime(getCaseUpdatedAtIso(caseItem))}
                        <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(getCaseUpdatedByUser(caseItem))}</p>
                      </div>
                    </Field>
                  </div>
                </section>
                <ConsultationSection
                  c={caseItem}
                  hideConversion
                  anchorFollowUps
                  onAddFollowUp={
                    canEdit && !isCancelled(caseItem)
                      ? () => caseModalRef.current?.show(undefined, { followUpOf: caseItem })
                      : undefined
                  }
                />
              </div>
            ) : null}

            {active === 'tasks' ? (
              <RelatedTasksAppointmentsSection
                caseItem={caseItem}
                onAddTask={addTask}
                onScheduleAppointment={addAppointment}
                onOpenTask={setDetailTaskId}
                onOpenAppointment={setDetailAppointmentId}
                showAppointments={false}
                bare
              />
            ) : null}

            {active === 'appointments' ? (
              <div className="space-y-6">
                <section className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t.cases.typeLabels.consultation}
                  </h3>
                  <p className="mt-2 text-[15px] font-semibold text-slate-900 dark:text-white">
                    {when.date || '—'}
                    {when.time ? ` · ${when.time}` : ''}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-600">
                    {[format ? enumPretty(format) : null, formatDuration(duration) || null, personName(attorneys[0]) || null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {format === 'VIDEO' && videoLink ? (
                    <Button size="sm" className="mt-3 h-8 text-[12px]" asChild>
                      <a href={videoLink} target="_blank" rel="noreferrer">
                        {copy.joinVideo}
                      </a>
                    </Button>
                  ) : null}
                </section>
                {(caseItem.followUps ?? []).length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {copy.followUps}
                    </h3>
                    <ul className="space-y-2">
                      {(caseItem.followUps ?? []).map((item, idx) => (
                        <li
                          key={item.id}
                          className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <p className="text-[12px] font-medium text-slate-500">
                            {copy.followUps} #{idx + 1}
                          </p>
                          <p className="mt-0.5 font-mono text-[12px] text-slate-500">{item.reference}</p>
                          <p className="mt-1 text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                            {item.consultationDate
                              ? `${formatDate(item.consultationDate, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · ${formatTime(item.consultationDate, lang, { hour: '2-digit', minute: '2-digit' })}`
                              : '—'}
                          </p>
                          <p className="text-[12px] text-slate-500">
                            {[item.format ? enumPretty(item.format) : null, item.durationMinutes != null ? formatDuration(item.durationMinutes) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <RelatedTasksAppointmentsSection
                  caseItem={caseItem}
                  onAddTask={addTask}
                  onScheduleAppointment={addAppointment}
                  onOpenTask={setDetailTaskId}
                  onOpenAppointment={setDetailAppointmentId}
                  showTasks={false}
                  bare
                />
              </div>
            ) : null}

            {active === 'deadlines' ? <DeadlinesCard caseId={caseItem.id} /> : null}

            {active === 'documents' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{copy.documents}</h2>
                  {canEdit ? (
                    <Button size="sm" className="h-8 text-[12px]" onClick={() => fileInputRef.current?.click()}>
                      {copy.upload}
                    </Button>
                  ) : null}
                </div>
                {(caseItem.attachments ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-500 dark:border-zinc-800">
                    {copy.noDocuments}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {caseItem.attachments?.map((att) => (
                      <li
                        key={att.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 dark:text-zinc-100">{att.file_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {[att.uploaded_by ? personName(att.uploaded_by) : null, att.created ? formatDrawerDateTime(att.created) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        {att.file_url ? (
                          <a className="shrink-0 text-[12px] text-[#64499D] hover:underline" href={att.file_url} target="_blank" rel="noreferrer">
                            {copy.viewAll}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {active === 'notes' ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {copy.consultationNotes}
                  </h3>
                  {notesInternal.trim() ? <LongText>{notesInternal}</LongText> : <p className="text-[13px] text-slate-500">{copy.noNotes}</p>}
                </section>
                <section className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {copy.adviceSummary}
                  </h3>
                  {notesAdvice.trim() ? <LongText>{notesAdvice}</LongText> : <p className="text-[13px] text-slate-500">{copy.noNotes}</p>}
                  {canEdit ? (
                    <Button size="sm" variant="outline" className="mt-3 h-8 text-[12px]" onClick={() => caseModalRef.current?.show(caseItem)}>
                      {copy.edit}
                    </Button>
                  ) : null}
                </section>
                <section id="follow-ups" className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {copy.followUpNextSteps}
                    </h3>
                    {canEdit && !isCancelled(caseItem) ? (
                      <button
                        type="button"
                        className="text-[12px] font-medium text-[#64499D] hover:underline"
                        onClick={() => caseModalRef.current?.show(undefined, { followUpOf: caseItem })}
                      >
                        {t.cases.workspaces.consultation.actions.addFollowUp}
                      </button>
                    ) : null}
                  </div>
                  {(caseItem.followUps ?? []).length === 0 ? (
                    <p className="text-[13px] text-slate-500">{t.cases.modal.consultationWorkflow.noFollowUp}</p>
                  ) : (
                    <ul className="space-y-2">
                      {(caseItem.followUps ?? []).map((item) => (
                        <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
                          <p className="font-mono text-[12px] text-slate-500">{item.reference}</p>
                          <p className="text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                            {item.consultationDate
                              ? `${formatDate(item.consultationDate, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · ${formatTime(item.consultationDate, lang, { hour: '2-digit', minute: '2-digit' })}`
                              : '—'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}

            {active === 'finance' && showFinance ? <FinanceTab caseId={caseItem.id} /> : null}

            {active === 'juria' && JURIA_ENABLED ? (
              <div className="flex min-h-[70vh] flex-col">
                <JuriaCasePanel caseItem={caseItem} />
              </div>
            ) : null}

            {active === 'activity' ? (
              <div className="space-y-3">
                <SectionTitle>{copy.sections.activity}</SectionTitle>
                {(caseItem.activity ?? []).length > 0 ? (
                  <ol className="space-y-2">
                    {caseItem.activity?.map((item) => (
                      <li key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-zinc-100">{item.message}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.created ? formatDrawerDateTime(item.created) : ''}
                          {item.actor ? ` · ${[item.actor.first_name, item.actor.last_name].filter(Boolean).join(' ')}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.created}>
                      <div>
                        {formatDrawerDateTime(caseItem.created)}
                        <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(caseItem.created_by)}</p>
                      </div>
                    </Field>
                    <Field label={copy.created}>
                      <div>
                        {formatDrawerDateTime(getCaseUpdatedAtIso(caseItem))}
                        <p className="mt-1 text-xs text-slate-500">{formatUserDisplayName(getCaseUpdatedByUser(caseItem))}</p>
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) uploadFile(file);
        }}
      />

      <CaseModal
        ref={caseModalRef}
        onSuccess={(updated) => {
          const originId = updated.parentConsultation?.id;
          if (originId) {
            if (originId === caseItem.id) {
              void refreshDetail();
              return;
            }
            void navigateToCaseById(navigate, originId);
            return;
          }
          onCaseChange(updated);
          const nextPath = caseWorkspacePath(updated);
          if (nextPath !== window.location.pathname) navigate(nextPath, { replace: true });
        }}
      />
      <CaseDeleteModal ref={deleteRef} onSuccess={() => navigate(listPath, { replace: true })} />
      <TaskCreateModal ref={taskCreateRef} onSuccess={() => void refreshDetail()} />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={() => void refreshDetail()} />
      <ScheduleAppointmentDialog ref={appointmentCreateRef} onSuccess={() => void refreshDetail()} />
      <AppointmentUpdateModal ref={appointmentUpdateRef} onSuccess={() => void refreshDetail()} />
      <TaskDetailPanel
        taskId={detailTaskId}
        open={detailTaskId != null}
        onOpenChange={(v) => {
          if (!v) setDetailTaskId(null);
        }}
        onEdit={(task) => taskUpdateRef.current?.show(task)}
        portalContainer={null}
        onOpenCase={openRelated}
        contextCaseId={caseItem.id}
      />
      <AppointmentDetailPanel
        appointmentId={detailAppointmentId}
        open={detailAppointmentId != null}
        onOpenChange={(v) => {
          if (!v) setDetailAppointmentId(null);
        }}
        onEdit={(a: Appointment) => appointmentUpdateRef.current?.show(a)}
        portalContainer={null}
        onOpenCase={openRelated}
        contextCaseId={caseItem.id}
      />
      <ConflictCheckDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        matterId={caseItem.id}
        excludeMatterId={caseItem.id}
      />
      <CaseTypeSelector
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onSelectType={(next) => {
          setConversionTarget(next);
          setTypeSelectorOpen(false);
          setConversionFormOpen(true);
        }}
      />
      {conversionTarget != null ? (
        <ConversionForm
          open={conversionFormOpen}
          onOpenChange={(v) => {
            setConversionFormOpen(v);
            if (!v) setConversionTarget(null);
          }}
          consultation={caseItem}
          targetType={conversionTarget}
          onBack={() => {
            setConversionFormOpen(false);
            setConversionTarget(null);
            setTypeSelectorOpen(true);
          }}
          onSuccess={({ newCase }) => {
            setConversionFormOpen(false);
            setConversionTarget(null);
            toast({
              title: tf(t.cases.modal.consultationWorkflow.convertSuccess, {
                reference: newCase.reference || '',
              }),
            });
            void refreshDetail();
          }}
        />
      ) : null}
      <ClientProfilePreview ref={clientPreviewRef} />
    </div>
  );
}
