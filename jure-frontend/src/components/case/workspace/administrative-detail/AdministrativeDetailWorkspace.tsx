'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Activity,
  Archive,
  ArrowLeft,
  Calendar,
  CheckSquare,
  ClipboardList,
  Clock,
  Flag,
  Folder,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
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
import { cn } from '@/lib/utils';
import { formatDate, useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData, getCountdownDays, getStatusColor } from '@/utils/caseCardHelpers';
import { assignedDisplayName, clientDisplayName } from '@/services/case/caseType';
import { caseTypeListPath, caseWorkspacePath, navigateToCaseById } from '@/lib/caseRoutes';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
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
import { getCaseFinance } from '@/services/finance/api';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import type { Appointment } from '@/services/appointment/api';
import LitigationTasks from '@/components/case/workspace/litigation-detail/LitigationTasks';
import LitigationAppointments from '@/components/case/workspace/litigation-detail/LitigationAppointments';
import LitigationDeadlines from '@/components/case/workspace/litigation-detail/LitigationDeadlines';
import LitigationDocuments from '@/components/case/workspace/litigation-detail/LitigationDocuments';
import LitigationNotes from '@/components/case/workspace/litigation-detail/LitigationNotes';
import LitigationActivity from '@/components/case/workspace/litigation-detail/LitigationActivity';
import { AddDeadlineDialog } from '@/components/case/workspace/litigation-detail/dialogs';
import {
  caseCsd,
  incompleteTasks,
  keyDeadlinesOf,
  requiredDocumentsOf,
  upcomingAppointments,
} from '@/components/case/workspace/litigation-detail/helpers';
import AdministrativeOverview from './AdministrativeOverview';
import AdministrativeDetails from './AdministrativeDetails';
import {
  adminStatusOf,
  dueDateOf,
  dutyTypeOf,
  institutionOf,
  parseAdministrativeSection,
  type AdministrativeDetailSection,
} from './helpers';

const NAV: Array<{ id: AdministrativeDetailSection; icon: typeof LayoutDashboard }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'administrative', icon: ClipboardList },
  { id: 'tasks', icon: CheckSquare },
  { id: 'appointments', icon: Calendar },
  { id: 'deadlines', icon: Clock },
  { id: 'documents', icon: Folder },
  { id: 'notes', icon: StickyNote },
  { id: 'finance', icon: Wallet },
  { id: 'juria', icon: Sparkles },
  { id: 'activity', icon: Activity },
];

export default function AdministrativeDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, enumPretty, lang } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
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

  const requested = parseAdministrativeSection(searchParams.get('tab'));
  const active: AdministrativeDetailSection = navItems.some((n) => n.id === requested) ? requested : 'overview';

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
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [legalDeadlines, setLegalDeadlines] = useState<CalculatedDeadline[] | null>(null);
  const [legalError, setLegalError] = useState(false);
  const [finance, setFinance] = useState<API.FinanceCaseSummary | null>(null);

  const setSection = (next: AdministrativeDetailSection) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const listPath = caseTypeListPath('ADMINISTRATIVE');
  const relatedLabel = [caseItem.reference, caseItem.title].filter(Boolean).join(' — ') || `Case #${caseItem.id}`;
  const origin = getConvertedFromCase(caseItem);
  const status = adminStatusOf(caseItem);
  const duty = dutyTypeOf(caseItem);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const due = dueDateOf(caseItem);
  const institution = institutionOf(caseItem);

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

  const markCompleted = async () => {
    try {
      const res = await apiUpdateCase({
        id: caseItem.id,
        status: CaseStatus.CLOSED,
        case_specific_data: {
          ...caseCsd(caseItem),
          completionDate: new Date().toISOString().slice(0, 10),
        },
      });
      onCaseChange(res.data);
      toast({ title: copy.markCompleted });
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const taskCount = incompleteTasks(caseItem).length;
  const apptCount = upcomingAppointments(caseItem).length;
  const deadlineCount =
    keyDeadlinesOf(caseItem).filter((d) => (getCountdownDays(d.date) ?? 0) >= 0).length +
    (legalDeadlines ?? []).filter((d) => d.status !== 'cancelled' && d.status !== 'completed').length;
  const docCount = (caseItem.attachments?.length ?? 0) + requiredDocumentsOf(caseItem).length;
  const counts: Partial<Record<AdministrativeDetailSection, number>> = {
    tasks: taskCount,
    appointments: apptCount,
    deadlines: deadlineCount,
    documents: docCount,
  };

  const snapshot = [
    { label: copy.snapshotClient, value: clientDisplayName(caseItem.client) },
    { label: copy.snapshotDuty, value: duty ? enumPretty(duty) : '' },
    { label: copy.snapshotInstitution, value: institution },
    { label: copy.snapshotLead, value: assignedDisplayName(caseItem) },
    {
      label: copy.snapshotDue,
      value: due ? formatDate(due, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : copy.noneScheduled,
    },
    { label: copy.snapshotPriority, value: priority ? enumPretty(priority) : '' },
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

  const completed = status === CaseStatus.CLOSED || Boolean(getCaseData(caseItem, 'completion_date'));

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
                  {t.cases.typeLabels.admin}
                </span>
                <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset', getStatusColor(status))}>
                  {enumPretty(status) || status}
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
                <Button type="button" variant="outline" className="hidden h-9 rounded-lg sm:inline-flex" onClick={() => setDeadlineOpen(true)}>
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
                  {canEdit && !completed ? (
                    <DropdownMenuItem onClick={() => void markCompleted()}>{copy.markCompleted}</DropdownMenuItem>
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
                  <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-800 dark:text-zinc-200">{row.value}</dd>
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
              <AdministrativeOverview
                caseItem={caseItem}
                canEdit={canEdit}
                showFinance={showFinance}
                legalDeadlines={legalDeadlines}
                finance={finance}
                onOpenSection={setSection}
                onOpenClient={() => void openClient()}
                onOpenCase={openRelated}
                onAddTask={addTask}
                onAddDeadline={() => setDeadlineOpen(true)}
                onAddAppointment={addAppointment}
                onUpload={() => fileInputRef.current?.click()}
                onEdit={() => caseModalRef.current?.show(caseItem)}
              />
            ) : null}
            {active === 'administrative' ? <AdministrativeDetails caseItem={caseItem} onOpenCase={openRelated} /> : null}
            {active === 'tasks' ? <LitigationTasks caseItem={caseItem} onAdd={addTask} onOpen={setDetailTaskId} /> : null}
            {active === 'appointments' ? (
              <LitigationAppointments caseItem={caseItem} onAdd={addAppointment} onOpen={setDetailAppointmentId} />
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
