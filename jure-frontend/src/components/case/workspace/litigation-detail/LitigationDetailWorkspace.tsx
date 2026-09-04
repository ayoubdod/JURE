'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Activity,
  Archive,
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Flag,
  Folder,
  Gavel,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
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
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData, getCountdownDays, getStatusColor } from '@/utils/caseCardHelpers';
import { assignedDisplayName } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { caseTypeListPath, caseWorkspacePath, navigateToCaseById } from '@/lib/caseRoutes';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
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
import ClientProfilePreview, { ClientProfilePreviewRef } from '@/components/client/ClientProfilePreview';
import { useToast } from '@/hooks/use-toast';
import { apiGetCase, apiUpdateCase, apiUploadCaseAttachment } from '@/services/case/api';
import { apiGetClient } from '@/services/client/api';
import { apiGetLegalDeadlines, type CalculatedDeadline } from '@/services/legal-deadlines/api';
import { unwrapDeadlineList } from '@/components/case/CaseLegalDeadlinesList';
import { apiGetResearchNotes, unwrapResearchNoteList, type ResearchNote } from '@/services/research-notes/api';
import { getCaseFinance } from '@/services/finance/api';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import type { Appointment } from '@/services/appointment/api';
import LitigationOverview from './LitigationOverview';
import LitigationDetails from './LitigationDetails';
import LitigationParties from './LitigationParties';
import LitigationTasks from './LitigationTasks';
import LitigationAppointments from './LitigationAppointments';
import LitigationHearings from './LitigationHearings';
import LitigationDeadlines from './LitigationDeadlines';
import LitigationDocuments from './LitigationDocuments';
import LitigationNotes from './LitigationNotes';
import LitigationActivity from './LitigationActivity';
import { AddDeadlineDialog, AddHearingDialog } from './dialogs';
import {
  courtLabels,
  incompleteTasks,
  keyDeadlinesOf,
  parseLitigationSection,
  upcomingAppointments,
  type LitigationDetailSection,
} from './helpers';

const NAV: Array<{ id: LitigationDetailSection; icon: typeof LayoutDashboard }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'caseDetails', icon: FileText },
  { id: 'parties', icon: Users },
  { id: 'tasks', icon: CheckSquare },
  { id: 'appointments', icon: Calendar },
  { id: 'hearings', icon: Gavel },
  { id: 'deadlines', icon: Clock },
  { id: 'documents', icon: Folder },
  { id: 'research', icon: Search },
  { id: 'notes', icon: StickyNote },
  { id: 'finance', icon: Wallet },
  { id: 'juria', icon: Sparkles },
  { id: 'activity', icon: Activity },
];

export default function LitigationDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
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

  const requested = parseLitigationSection(searchParams.get('tab'));
  const active: LitigationDetailSection = navItems.some((n) => n.id === requested) ? requested : 'overview';

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
  const [closeOpen, setCloseOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [hearingOpen, setHearingOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const [legalDeadlines, setLegalDeadlines] = useState<CalculatedDeadline[] | null>(null);
  const [legalError, setLegalError] = useState(false);
  const [researchNotes, setResearchNotes] = useState<ResearchNote[] | null>(null);
  const [finance, setFinance] = useState<API.FinanceCaseSummary | null>(null);

  const setSection = (next: LitigationDetailSection) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const listPath = caseTypeListPath('LITIGATION');
  const relatedLabel = [caseItem.reference, caseItem.title].filter(Boolean).join(' — ') || `Case #${caseItem.id}`;
  const origin = getConvertedFromCase(caseItem);
  const court = courtLabels(caseItem, t);
  const clientRole = getCaseData(caseItem, 'client_role') as string | undefined;
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const nextHearing = (getCaseData(caseItem, 'next_hearing_date') as string) || '';

  const loadLegal = () => {
    setLegalError(false);
    apiGetLegalDeadlines({ case: caseItem.id })
      .then((res) => setLegalDeadlines(unwrapDeadlineList(res.data)))
      .catch(() => {
        setLegalDeadlines([]);
        setLegalError(true);
      });
  };

  useEffect(() => {
    loadLegal();
    apiGetResearchNotes({ matter: caseItem.id, page_size: 20 })
      .then((res) => setResearchNotes(unwrapResearchNoteList(res.data)))
      .catch(() => setResearchNotes([]));
    if (!showFinance) return;
    getCaseFinance(caseItem.id)
      .then((res) => setFinance(normalizeCaseFinancePayload(res.data).summary))
      .catch(() => setFinance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseItem.id, showFinance]);

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

  const archiveCase = async () => {
    try {
      const res = await apiUpdateCase({ id: caseItem.id, status: CaseStatus.ARCHIVED } as API.CaseUpdateForm);
      onCaseChange(res.data);
      toast({ title: pw.archiveCase });
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const taskCount = incompleteTasks(caseItem).length;
  const apptCount = upcomingAppointments(caseItem).length;
  const hearingCount = nextHearing && (getCountdownDays(nextHearing) ?? -1) >= 0 ? 1 : 0;
  const deadlineCount =
    keyDeadlinesOf(caseItem).filter((d) => (getCountdownDays(d.date) ?? 0) >= 0).length +
    (legalDeadlines ?? []).filter((d) => d.status !== 'cancelled' && d.status !== 'completed').length;
  const docCount = caseItem.attachments?.length ?? 0;
  const researchCount = researchNotes?.length ?? 0;
  const counts: Partial<Record<LitigationDetailSection, number>> = {
    tasks: taskCount,
    appointments: apptCount,
    hearings: hearingCount,
    deadlines: deadlineCount,
    documents: docCount,
    research: researchCount,
  };

  const snapshot: { label: string; value: ReactNode }[] = [
    {
      label: copy.snapshotClient,
      value: caseItem.client ? (
        <CaseClientLabel
          client={caseItem.client}
          nameClassName="truncate text-[13px] font-medium text-slate-800 dark:text-zinc-200"
        />
      ) : '',
    },
    { label: copy.snapshotRole, value: clientRole ? enumPretty(clientRole) : '' },
    { label: copy.snapshotCourt, value: court.composed },
    { label: copy.snapshotChamber, value: court.chamber },
    { label: copy.snapshotLead, value: assignedDisplayName(caseItem) || personFallback(caseItem) },
    {
      label: copy.snapshotNextHearing,
      value: nextHearing
        ? formatDate(nextHearing, lang, { day: 'numeric', month: 'long', year: 'numeric' })
        : copy.noneScheduled,
    },
  ].filter((row) => row.value);

  const navButton = (item: (typeof NAV)[number], compact?: boolean) => {
    const Icon = item.icon;
    const on = active === item.id;
    const count = counts[item.id];
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSection(item.id)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-medium',
          compact ? 'shrink-0' : 'w-full',
          on
            ? 'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
            : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{copy.sections[item.id]}</span>
        {count ? (
          <span className={cn('ms-auto text-[11px] tabular-nums', on ? 'text-[#64499D]' : 'text-slate-400')}>
            {count}
          </span>
        ) : null}
      </button>
    );
  };

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
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rounded-full bg-[#F7F4FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#64499D] ring-1 ring-[#64499D]/15">
                  {t.cases.typeLabels.litigation}
                </span>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset', getStatusColor(String(caseItem.status ?? '')))}>
                  {enumPretty(String(caseItem.status ?? '')) || caseItem.status}
                </span>
                {priority ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200">
                    {enumPretty(priority)}
                  </span>
                ) : null}
                {origin ? (
                  <span className="inline-flex rounded-full bg-[#64499D]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64499D] ring-1 ring-[#64499D]/20">
                    {copy.convertedFrom}
                    {origin.reference ? ` · ${origin.reference}` : ''}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {caseItem.title || t.cases.untitledCase}
              </h1>
              {caseItem.reference ? (
                <p className="mt-0.5 font-mono text-[12px] text-slate-500">{caseItem.reference}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={addTask}>
                {copy.addTask}
              </Button>
              {canEdit ? (
                <Button type="button" variant="outline" className="hidden h-9 rounded-lg sm:inline-flex" onClick={() => setHearingOpen(true)}>
                  {copy.addHearing}
                </Button>
              ) : null}
              {canEdit ? (
                <Button type="button" variant="outline" className="hidden h-9 rounded-lg md:inline-flex" onClick={() => setDeadlineOpen(true)}>
                  {copy.addDeadline}
                </Button>
              ) : null}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="h-9 rounded-lg px-2.5">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ms-1">{pw.more}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                      <DropdownMenuItem className="text-red-600" onClick={() => deleteRef.current?.show(caseItem)}>
                        <Trash2 className="h-4 w-4" />
                        {pw.deleteCase}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {snapshot.length ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {snapshot.map((row) => (
                <div key={row.label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{row.label}</dt>
                  <dd className="mt-0.5 min-w-0 text-[13px] font-medium text-slate-800 dark:text-zinc-200">
                    {typeof row.value === 'string' ? <span className="truncate block">{row.value}</span> : row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          className="min-w-0 shrink-0 border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:min-h-0 lg:w-[232px] lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-e"
          aria-label={copy.navLabel}
        >
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain p-2 [scrollbar-width:thin] lg:hidden">
            {navItems.map((item) => navButton(item, true))}
          </div>
          <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin] lg:flex">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {copy.navLabel}
            </p>
            <div className="flex flex-col gap-0.5">{navItems.map((item) => navButton(item))}</div>
          </div>
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className={cn('px-3 py-4 sm:px-5 lg:px-6', active === 'juria' && 'flex min-h-full flex-col p-0')}>
            {active === 'overview' ? (
              <LitigationOverview
                caseItem={caseItem}
                canEdit={canEdit}
                showFinance={showFinance}
                juriaEnabled={JURIA_ENABLED}
                legalDeadlines={legalDeadlines}
                researchNotes={researchNotes}
                finance={finance}
                onOpenSection={setSection}
                onOpenClient={() => void openClient()}
                onOpenCase={openRelated}
                onAddTask={addTask}
                onAddHearing={() => setHearingOpen(true)}
                onAddDeadline={() => setDeadlineOpen(true)}
                onAddAppointment={addAppointment}
                onUpload={() => fileInputRef.current?.click()}
                onEdit={() => caseModalRef.current?.show(caseItem)}
              />
            ) : null}
            {active === 'caseDetails' ? <LitigationDetails caseItem={caseItem} onOpenCase={openRelated} /> : null}
            {active === 'parties' ? (
              <LitigationParties caseItem={caseItem} onOpenClient={() => void openClient()} onConflict={() => setConflictOpen(true)} />
            ) : null}
            {active === 'tasks' ? <LitigationTasks caseItem={caseItem} onAdd={addTask} onOpen={setDetailTaskId} /> : null}
            {active === 'appointments' ? (
              <LitigationAppointments caseItem={caseItem} onAdd={addAppointment} onOpen={setDetailAppointmentId} />
            ) : null}
            {active === 'hearings' ? (
              <LitigationHearings caseItem={caseItem} canEdit={canEdit} onAdd={() => setHearingOpen(true)} />
            ) : null}
            {active === 'deadlines' ? (
              <LitigationDeadlines
                caseItem={caseItem}
                canEdit={canEdit}
                legalDeadlines={legalDeadlines}
                legalError={legalError}
                onRetryLegal={loadLegal}
                onAdd={() => setDeadlineOpen(true)}
              />
            ) : null}
            {active === 'documents' ? (
              <LitigationDocuments caseItem={caseItem} canEdit={canEdit} onUpload={() => fileInputRef.current?.click()} />
            ) : null}
            {active === 'research' ? (
              <div className="space-y-3">
                {JURIA_ENABLED ? (
                  <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={() => setSection('juria')}>
                    {copy.analyzeJuria}
                  </Button>
                ) : null}
                <ResearchNotebookCard
                  caseId={caseItem.id}
                  matterTitle={caseItem.title}
                  matterReference={caseItem.reference}
                />
              </div>
            ) : null}
            {active === 'notes' ? (
              <LitigationNotes caseItem={caseItem} canEdit={canEdit} onEdit={() => caseModalRef.current?.show(caseItem)} />
            ) : null}
            {showFinance && active === 'finance' ? <FinanceTab caseId={caseItem.id} /> : null}
            {JURIA_ENABLED && active === 'juria' ? <JuriaCasePanel caseItem={caseItem} /> : null}
            {active === 'activity' ? <LitigationActivity caseItem={caseItem} /> : null}
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
      <MatterCloseModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        caseId={caseItem.id}
        caseLabel={relatedLabel}
        onSuccess={onCaseChange}
      />
      <ConflictCheckDialog open={conflictOpen} onOpenChange={setConflictOpen} matterId={caseItem.id} excludeMatterId={caseItem.id} />
      <ClientProfilePreview ref={clientPreviewRef} />
      <AddHearingDialog
        open={hearingOpen}
        onOpenChange={setHearingOpen}
        caseItem={caseItem}
        onSaved={(next) => {
          onCaseChange(next);
          toast({ title: t.common.success });
        }}
      />
      <AddDeadlineDialog
        open={deadlineOpen}
        onOpenChange={setDeadlineOpen}
        caseItem={caseItem}
        onSaved={(next) => {
          onCaseChange(next);
          toast({ title: t.common.success });
        }}
      />
    </div>
  );
}

function personFallback(c: API.Case) {
  return c.assigned_to ? `${c.assigned_to.first_name ?? ''} ${c.assigned_to.last_name ?? ''}`.trim() : '';
}
