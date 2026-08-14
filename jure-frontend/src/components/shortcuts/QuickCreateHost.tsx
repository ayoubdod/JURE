import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import ClientCreateModal, { ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import CaseModal, { CaseModalRef } from '@/components/case/CaseModal';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import ScheduleAppointmentDialog, {
  ScheduleAppointmentDialogRef,
} from '@/components/ScheduleAppointmentDialog';
import CabinetMemberCreateModal, {
  CabinetMemberCreateModalRef,
} from '@/components/cabinet-member/CabinetMemberCreateModal';
import DocumentCreateModal, {
  DocumentCreateModalRef,
} from '@/components/document/DocumentCreateModal';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import ClauseLibraryModal from '@/components/dashboard/ClauseLibraryModal';
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';
import { eventBus } from '@/utils/eventBus';
import { useShortcutAction } from '@/context/ShortcutsContext';

/**
 * Fallback create/action dialogs when the current page does not register its own handler.
 * Page-level `useShortcutAction` registrations win because they mount after this host.
 */
export default function QuickCreateHost() {
  const navigate = useNavigate();
  const [openConflict, setOpenConflict] = useState(false);
  const [openClauseLib, setOpenClauseLib] = useState(false);
  const [openMatterClose, setOpenMatterClose] = useState(false);

  const clientRef = useRef<ClientCreateModalRef>(null);
  const caseRef = useRef<CaseModalRef>(null);
  const taskRef = useRef<TaskCreateModalRef>(null);
  const apptRef = useRef<ScheduleAppointmentDialogRef>(null);
  const memberRef = useRef<CabinetMemberCreateModalRef>(null);
  const docRef = useRef<DocumentCreateModalRef>(null);

  useShortcutAction('create-client', () => clientRef.current?.show());
  useShortcutAction('create-case', () => caseRef.current?.show());
  useShortcutAction('create-task', () => taskRef.current?.show());
  useShortcutAction('create-appointment', () => apptRef.current?.show());
  useShortcutAction('create-member', () => memberRef.current?.show());
  useShortcutAction('create-document', () => docRef.current?.show());
  useShortcutAction('create-chat', () => {
    navigate('/dashboard/conversations?new=1');
  });
  useShortcutAction('conflict-check', () => setOpenConflict(true));
  useShortcutAction('clause-library', () => setOpenClauseLib(true));
  useShortcutAction('close-matter', () => setOpenMatterClose(true));

  const refreshDashboard = () => eventBus.emit('case-updated');

  return (
    <>
      <ClientCreateModal ref={clientRef} onSuccess={refreshDashboard} />
      <CaseModal ref={caseRef} onSuccess={refreshDashboard} />
      <TaskCreateModal ref={taskRef} onSuccess={refreshDashboard} />
      <ScheduleAppointmentDialog ref={apptRef} />
      <CabinetMemberCreateModal ref={memberRef} />
      <DocumentCreateModal ref={docRef} />
      <ConflictCheckDialog open={openConflict} onOpenChange={setOpenConflict} />
      <ClauseLibraryModal open={openClauseLib} onOpenChange={setOpenClauseLib} />
      <MatterCloseModal
        open={openMatterClose}
        onOpenChange={setOpenMatterClose}
        onSuccess={() => eventBus.emit('case-updated')}
      />
    </>
  );
}
