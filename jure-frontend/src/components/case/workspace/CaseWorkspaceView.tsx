'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Archive,
  ArrowLeft,
  ChevronRight,
  Flag,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import {
  assignedDisplayName,
  clientDisplayName,
  getCaseType,
  type BackendCaseType,
} from '@/services/case/caseType';
import {
  caseTypeListPath,
  caseWorkspacePath,
  navigateToCaseById,
} from '@/lib/caseRoutes';
import { CREATE_SUBMIT_CLASS } from '@/components/forms/CreateFormShell';
import { ConsultationSection } from '@/components/case/case-detail-drawer/consultation-section';
import { LitigationSection } from '@/components/case/case-detail-drawer/litigation-section';
import { AdministrativeSection } from '@/components/case/case-detail-drawer/administrative-section';
import { RelatedTasksAppointmentsSection } from '@/components/case/case-detail-drawer/RelatedTasksAppointmentsSection';
import { Field, LongText, SectionTitle } from '@/components/case/case-detail-drawer/primitives';
import {
  formatDrawerDate,
  formatDrawerDateTime,
  formatUserDisplayName,
  getCaseUpdatedAtIso,
  getCaseUpdatedByUser,
} from '@/components/case/case-detail-drawer/format';
import { ConvertedCaseLink, getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
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
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import { CaseTypeSelector, type ConversionTargetType } from '@/components/case/conversion/CaseTypeSelector';
import { ConversionForm } from '@/components/case/conversion/ConversionForm';
import { canShowConvertToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { useToast } from '@/hooks/use-toast';
import { apiGetCase, apiUpdateCase } from '@/services/case/api';
import type { Appointment } from '@/services/appointment/api';

type WorkspaceTab =
  | 'overview'
  | 'consultation'
  | 'caseDetails'
  | 'parties'
  | 'administrative'
  | 'tasks'
  | 'appointments'
  | 'hearings'
  | 'deadlines'
  | 'documents'
  | 'research'
  | 'notes'
  | 'finance'
  | 'juria'
  | 'activity';

const CONSULTATION_TABS: WorkspaceTab[] = [
  'overview',
  'consultation',
  'tasks',
  'appointments',
  'notes',
  'documents',
  'finance',
  'juria',
  'activity',
];

const LITIGATION_TABS: WorkspaceTab[] = [
  'overview',
  'caseDetails',
  'parties',
  'tasks',
  'appointments',
  'hearings',
  'deadlines',
  'documents',
  'research',
  'notes',
  'finance',
  'juria',
  'activity',
];

const ADMINISTRATIVE_TABS: WorkspaceTab[] = [
  'overview',
  'administrative',
  'tasks',
  'appointments',
  'deadlines',
  'documents',
  'notes',
  'finance',
  'juria',
  'activity',
];

function tabsForType(type: BackendCaseType): WorkspaceTab[] {
  if (type === 'CONSULTATION') return CONSULTATION_TABS;
  if (type === 'LITIGATION') return LITIGATION_TABS;
  return ADMINISTRATIVE_TABS;
}

function typeWord(
  type: BackendCaseType | 'UNKNOWN',
  labels: { consultation: string; litigation: string; admin: string },
): string {
  if (type === 'CONSULTATION') return labels.consultation;
  if (type === 'LITIGATION') return labels.litigation;
  return labels.admin;
}

function personName(user?: API.User | null): string {
  return clientDisplayName(user) || '—';
}

export default function CaseWorkspaceView({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const pw = t.cases.pageWorkspace;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = usePermission('cases.edit');
  const canDelete = usePermission('cases.delete');
  const { authorized: showFinance } = useFinanceAccess();

  const type = getCaseType(caseItem) === 'UNKNOWN' ? 'LITIGATION' : getCaseType(caseItem);
  const tabs = useMemo(
    () =>
      tabsForType(type).filter((tab) => {
        if (tab === 'finance') return showFinance;
        if (tab === 'juria') return JURIA_ENABLED;
        return true;
      }),
    [type, showFinance]
  );

  const tabParam = searchParams.get('tab') as WorkspaceTab | null;
  const activeTab: WorkspaceTab = tabParam && tabs.includes(tabParam) ? tabParam : 'overview';

  const listPath = caseTypeListPath(type);
  const sectionTitle =
    type === 'CONSULTATION'
      ? t.cases.workspaces.consultation.title
      : type === 'LITIGATION'
        ? t.cases.workspaces.litigation.title
        : t.cases.workspaces.administrative.title;

  const caseModalRef = useRef<CaseModalRef>(null);
  const deleteRef = useRef<CaseDeleteModalRef>(null);
  const taskCreateRef = useRef<TaskCreateModalRef>(null);
  const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
  const appointmentCreateRef = useRef<ScheduleAppointmentDialogRef>(null);
  const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [detailAppointmentId, setDetailAppointmentId] = useState<number | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [conversionFormOpen, setConversionFormOpen] = useState(false);
  const [conversionTarget, setConversionTarget] = useState<ConversionTargetType | null>(null);

  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const relatedLabel = [caseItem.reference, caseItem.title].filter(Boolean).join(' — ') || `Case #${caseItem.id}`;

  const addTask = () => taskCreateRef.current?.show({ relatedCaseId: caseItem.id, relatedCaseLabel: relatedLabel });
  const addAppointment = () =>
    appointmentCreateRef.current?.show({ relatedCaseId: caseItem.id, relatedCaseLabel: relatedLabel });

  const refreshDetail = async () => {
    const res = await apiGetCase(caseItem.id);
    onCaseChange(res.data);
  };

  const archiveCase = async () => {
    try {
      const res = await apiUpdateCase({ id: caseItem.id, status: CaseStatus.ARCHIVED } as API.CaseUpdateForm);
      onCaseChange(res.data);
      toast({ title: pw.archiveCase });
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const headerStatus =
    type === 'CONSULTATION'
      ? String(
          (getCaseData(caseItem, 'outcome') as string) ??
            (getCaseData(caseItem, 'status') as string) ??
            caseItem.status
        )
      : String(caseItem.status ?? '');

  const consultationDate = getCaseData(caseItem, 'consultation_date') as string | undefined;
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const courtName = (getCaseData(caseItem, 'court_name') as string) ?? caseItem.court ?? '';
  const institution =
    (getCaseData(caseItem, 'institution') as string) ??
    (getCaseData(caseItem, 'institution_authority') as string) ??
    '';
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const notesText =
    (getCaseData(caseItem, 'advice_summary') as string) || caseItem.summary || caseItem.description || '';
  const requiredDocs = Array.isArray(getCaseData(caseItem, 'required_documents'))
    ? (getCaseData(caseItem, 'required_documents') as { label?: string; completed?: boolean }[])
    : [];

  const converted = getConvertedToCase(caseItem);
  const canConvert = canShowConvertToCase(caseItem);

  useEffect(() => {
    if (searchParams.get('convert') !== '1' || !canConvert) return;
    setTypeSelectorOpen(true);
    const params = new URLSearchParams(searchParams);
    params.delete('convert');
    setSearchParams(params, { replace: true });
  }, [canConvert, searchParams, setSearchParams]);

  const openRelated = (id: number) => {
    void navigateToCaseById(navigate, id);
  };

  const relatedBlock = (
    <RelatedTasksAppointmentsSection
      caseItem={caseItem}
      onAddTask={addTask}
      onScheduleAppointment={addAppointment}
      onOpenTask={setDetailTaskId}
      onOpenAppointment={setDetailAppointmentId}
      bare
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="shrink-0 border-b border-[#64499D]/10 bg-white dark:bg-zinc-950 dark:border-zinc-800">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-[#64499D]"
          >
            <ArrowLeft className="h-4 w-4" />
            {tf(pw.backTo, { section: sectionTitle })}
          </button>

          <nav className="mt-2 flex flex-wrap items-center gap-1 text-[12px] text-slate-500" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-[#64499D]">
              {pw.dashboard}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/dashboard/cases" className="hover:text-[#64499D]">
              {pw.cases}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={listPath} className="hover:text-[#64499D]">
              {sectionTitle}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-800 dark:text-zinc-200">{caseItem.title || caseItem.reference}</span>
          </nav>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-[#F7F4FF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64499D] ring-1 ring-[#64499D]/15">
                  {typeWord(type, t.cases.typeLabels)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                    getStatusColor(headerStatus)
                  )}
                >
                  {enumPretty(headerStatus) || headerStatus}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {caseItem.title || t.cases.untitledCase}
              </h1>
              {caseItem.reference ? (
                <p className="mt-1 font-mono text-[13px] text-slate-500">#{caseItem.reference.replace(/^#/, '')}</p>
              ) : null}

              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{pw.client}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                    {personName(caseItem.client)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{pw.lawyer}</dt>
                  <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                    {assignedDisplayName(caseItem) || '—'}
                  </dd>
                </div>
                {type === 'CONSULTATION' ? (
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{pw.date}</dt>
                    <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                      {consultationDate ? formatDrawerDateTime(consultationDate) : '—'}
                    </dd>
                  </div>
                ) : null}
                {type === 'LITIGATION' ? (
                  <>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{pw.role}</dt>
                      <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                        {clientRole ? enumPretty(clientRole) : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{pw.court}</dt>
                      <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                        {courtName || '—'}
                      </dd>
                    </div>
                  </>
                ) : null}
                {type === 'ADMINISTRATIVE' ? (
                  <>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        {pw.institution}
                      </dt>
                      <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                        {institution || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        {pw.priority}
                      </dt>
                      <dd className="mt-0.5 text-[13.5px] font-medium text-slate-800 dark:text-zinc-200">
                        {priority ? enumPretty(priority) : '—'}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canEdit ? (
                <Button
                  type="button"
                  className={CREATE_SUBMIT_CLASS}
                  onClick={() => caseModalRef.current?.show(caseItem)}
                >
                  <Pencil />
                  {pw.editCase}
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="h-10 rounded-lg">
                    {pw.more}
                    <MoreHorizontal className="ms-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canConvert ? (
                    <DropdownMenuItem onClick={() => setTypeSelectorOpen(true)}>
                      {pw.convertCase}
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && caseItem.status !== CaseStatus.CLOSED ? (
                    <DropdownMenuItem onClick={() => setCloseOpen(true)}>
                      <Flag className="h-4 w-4" />
                      {pw.closeCase}
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && caseItem.status !== CaseStatus.ARCHIVED ? (
                    <DropdownMenuItem onClick={() => void archiveCase()}>
                      <Archive className="h-4 w-4" />
                      {pw.archiveCase}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => setConflictOpen(true)}>
                    <ShieldAlert className="h-4 w-4" />
                    {pw.conflictCheck}
                  </DropdownMenuItem>
                  {canDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteRef.current?.show(caseItem)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {pw.deleteCase}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 lg:px-8">
          <TabsList className="h-auto w-max justify-start gap-0.5 rounded-none bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-[13px] data-[state=active]:border-[#64499D] data-[state=active]:bg-transparent data-[state=active]:text-[#64499D] data-[state=active]:shadow-none"
              >
                {tab === 'juria' ? (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    {pw.tabs[tab]}
                  </span>
                ) : (
                  pw.tabs[tab]
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="overview" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-8">
              {converted ? (
                <ConvertedCaseLink variant="converted" link={converted} onViewCase={openRelated} />
              ) : null}
              <section>
                <SectionTitle>{pw.overview}</SectionTitle>
                {type === 'CONSULTATION' ? (
                  <ConsultationSection c={caseItem} onOpenCaseById={openRelated} />
                ) : type === 'LITIGATION' ? (
                  <LitigationSection c={caseItem} onOpenCaseById={openRelated} />
                ) : (
                  <AdministrativeSection c={caseItem} onOpenCaseById={openRelated} />
                )}
              </section>
              {relatedBlock}
              {type !== 'CONSULTATION' ? (
                <div className="space-y-3">
                  <SectionTitle>{pw.tabs.deadlines}</SectionTitle>
                  <DeadlinesCard caseId={caseItem.id} />
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="consultation" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <ConsultationSection c={caseItem} onOpenCaseById={openRelated} />
            </div>
          </TabsContent>

          <TabsContent value="caseDetails" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <LitigationSection c={caseItem} onOpenCaseById={openRelated} />
            </div>
          </TabsContent>

          <TabsContent value="parties" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-4">
              <SectionTitle>{pw.tabs.parties}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={pw.client}>
                  {personName(caseItem.client)}
                  {clientRole ? (
                    <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase dark:bg-slate-800">
                      {enumPretty(clientRole)}
                    </span>
                  ) : null}
                </Field>
                <Field label={t.cases.modal.fields.opposingPartyName}>
                  {(getCaseData(caseItem, 'opposing_party_name') as string) || '—'}
                </Field>
                <Field label={t.cases.modal.fields.opposingCounsel}>
                  {(getCaseData(caseItem, 'opposing_counsel') as string) || '—'}
                </Field>
                <Field label={t.cases.modal.fields.leadAttorney}>
                  {assignedDisplayName(caseItem) || '—'}
                </Field>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="administrative" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <AdministrativeSection c={caseItem} onOpenCaseById={openRelated} />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <RelatedTasksAppointmentsSection
                caseItem={caseItem}
                onAddTask={addTask}
                onScheduleAppointment={addAppointment}
                onOpenTask={setDetailTaskId}
                onOpenAppointment={setDetailAppointmentId}
                showAppointments={false}
                bare
              />
            </div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
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
          </TabsContent>

          <TabsContent value="hearings" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.cases.modal.fields.firstHearingDate}>
                  {formatDrawerDate(getCaseData(caseItem, 'first_hearing_date') as string)}
                </Field>
                <Field label={t.cases.modal.fields.nextHearingDate}>
                  {formatDrawerDate(getCaseData(caseItem, 'next_hearing_date') as string)}
                </Field>
              </div>
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
          </TabsContent>

          <TabsContent value="deadlines" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <DeadlinesCard caseId={caseItem.id} />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-4">
              {requiredDocs.length > 0 ? (
                <ul className="space-y-2">
                  {requiredDocs.map((doc, i) => (
                    <li
                      key={`${doc.label}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <span>{doc.label || `Document ${i + 1}`}</span>
                      <span className="text-[11px] uppercase text-slate-500">
                        {doc.completed ? t.cases.workspaces.yes : t.cases.workspaces.no}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-[13px] text-slate-500 dark:border-zinc-800">
                  {pw.documentsEmpty}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="research" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <ResearchNotebookCard caseId={caseItem.id} />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              {notesText.trim() ? <LongText>{notesText}</LongText> : <p className="text-[13px] text-slate-500">{pw.notesEmpty}</p>}
            </div>
          </TabsContent>

          {showFinance ? (
            <TabsContent value="finance" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                {activeTab === 'finance' ? <FinanceTab caseId={caseItem.id} /> : null}
              </div>
            </TabsContent>
          ) : null}

          {JURIA_ENABLED ? (
            <TabsContent value="juria" className="mt-0 flex min-h-[60vh] flex-col p-0">
              {activeTab === 'juria' ? <JuriaCasePanel caseItem={caseItem} /> : null}
            </TabsContent>
          ) : null}

          <TabsContent value="activity" className="mt-0 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-4">
              <SectionTitle>{pw.activityTitle}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.cases.modal.created}>
                  <div>
                    {formatDrawerDateTime(caseItem.created)}
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      {formatUserDisplayName(caseItem.created_by)}
                    </p>
                  </div>
                </Field>
                <Field label={pw.activityTitle}>
                  <div>
                    {formatDrawerDateTime(getCaseUpdatedAtIso(caseItem))}
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      {formatUserDisplayName(getCaseUpdatedByUser(caseItem))}
                    </p>
                  </div>
                </Field>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <CaseModal
        ref={caseModalRef}
        onSuccess={(updated) => {
          onCaseChange(updated);
          const nextPath = caseWorkspacePath(updated);
          if (nextPath !== `${window.location.pathname}`) navigate(nextPath, { replace: true });
        }}
      />
      <CaseDeleteModal
        ref={deleteRef}
        onSuccess={() => navigate(listPath, { replace: true })}
      />
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
        contextCaseId={caseItem.id}
      />
      <MatterCloseModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        caseId={caseItem.id}
        caseLabel={relatedLabel}
        onSuccess={onCaseChange}
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
            toast({ title: t.common.success });
            navigate(caseWorkspacePath(newCase));
          }}
        />
      ) : null}
    </div>
  );
}
