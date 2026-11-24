'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import CaseModal, { type CaseModalRef } from '@/components/case/CaseModal';
import CaseDeleteModal, { type CaseDeleteModalRef } from '@/components/case/CaseDeleteModal';
import TaskCreateModal, { type TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { type TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, {
  type ScheduleAppointmentDialogRef,
} from '@/components/appointments/ScheduleAppointmentDialog';
import AppointmentUpdateModal, {
  type AppointmentUpdateModalRef,
} from '@/components/appointments/AppointmentUpdateModal';
import { TaskDetailPanel, AppointmentDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import ClientProfilePreview, {
  type ClientProfilePreviewRef,
} from '@/components/client/ClientProfilePreview';
import {
  AddDeadlineDialog,
  AddHearingDialog,
} from '@/components/case/workspace/litigation-detail/dialogs';
import { caseWorkspacePath, navigateToCaseById } from '@/lib/caseRoutes';
import { apiGetCase, apiUploadCaseAttachment } from '@/services/case/api';
import { apiGetClient } from '@/services/client/api';
import type { Appointment } from '@/services/appointment/api';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';

export type CaseWorkspaceModalHostHandle = {
  editCase: (
    caseItem?: API.Case,
    opts?: { followUpOf?: API.Case; focusField?: 'notes' }
  ) => void;
  deleteCase: () => void;
  addTask: () => void;
  addAppointment: () => void;
  openTask: (id: number) => void;
  openAppointment: (id: number) => void;
  openClose: () => void;
  openConflict: () => void;
  openHearing: () => void;
  openDeadline: () => void;
  openClient: () => Promise<void>;
  triggerUpload: () => void;
  refreshDetail: () => Promise<void>;
};

type Props = {
  caseItem: API.Case;
  listPath: string;
  onCaseChange: (next: API.Case) => void;
  enableHearingDialog?: boolean;
  enableDeadlineDialog?: boolean;
};

const CaseWorkspaceModalHost = forwardRef<CaseWorkspaceModalHostHandle, Props>(
  function CaseWorkspaceModalHost(
    {
      caseItem,
      listPath,
      onCaseChange,
      enableHearingDialog = true,
      enableDeadlineDialog = true,
    },
    ref
  ) {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useAppTranslation();

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

    const relatedLabel =
      [caseItem.reference, caseItem.title].filter(Boolean).join(' — ') || `Case #${caseItem.id}`;

    const refreshDetail = async () => {
      const res = await apiGetCase(caseItem.id);
      onCaseChange(res.data);
    };

    const openRelated = (id: number) => {
      void navigateToCaseById(navigate, id);
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

    useImperativeHandle(ref, () => ({
      editCase: (item, opts) => {
        if (opts?.followUpOf) {
          caseModalRef.current?.show(undefined, {
            followUpOf: opts.followUpOf,
            focusField: opts.focusField,
          });
        } else {
          caseModalRef.current?.show(item ?? caseItem, { focusField: opts?.focusField });
        }
      },
      deleteCase: () => deleteRef.current?.show(caseItem),
      addTask: () =>
        taskCreateRef.current?.show({ relatedCaseId: caseItem.id, relatedCaseLabel: relatedLabel }),
      addAppointment: () =>
        appointmentCreateRef.current?.show({
          relatedCaseId: caseItem.id,
          relatedCaseLabel: relatedLabel,
        }),
      openTask: (id) => setDetailTaskId(id),
      openAppointment: (id) => setDetailAppointmentId(id),
      openClose: () => setCloseOpen(true),
      openConflict: () => setConflictOpen(true),
      openHearing: () => setHearingOpen(true),
      openDeadline: () => setDeadlineOpen(true),
      openClient: async () => {
        const id = caseItem.client?.id;
        if (!id) return;
        try {
          const res = await apiGetClient(id);
          clientPreviewRef.current?.show(res.data);
        } catch {
          toast({ title: t.common.error, variant: 'destructive' });
        }
      },
      triggerUpload: () => fileInputRef.current?.click(),
      refreshDetail,
    }));

    return (
      <>
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
        <ConflictCheckDialog
          open={conflictOpen}
          onOpenChange={setConflictOpen}
          matterId={caseItem.id}
          excludeMatterId={caseItem.id}
        />
        <ClientProfilePreview ref={clientPreviewRef} />
        {enableHearingDialog ? (
          <AddHearingDialog
            open={hearingOpen}
            onOpenChange={setHearingOpen}
            caseItem={caseItem}
            onSaved={(next) => {
              onCaseChange(next);
              toast({ title: t.common.success });
            }}
          />
        ) : null}
        {enableDeadlineDialog ? (
          <AddDeadlineDialog
            open={deadlineOpen}
            onOpenChange={setDeadlineOpen}
            caseItem={caseItem}
            onSaved={(next) => {
              onCaseChange(next);
              toast({ title: t.common.success });
            }}
          />
        ) : null}
      </>
    );
  }
);

export default CaseWorkspaceModalHost;
