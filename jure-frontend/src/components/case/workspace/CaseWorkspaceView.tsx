'use client';

import ConsultationDetailWorkspace from '@/components/case/workspace/consultation-detail/ConsultationDetailWorkspace';
import LitigationDetailWorkspace from '@/components/case/workspace/litigation-detail/LitigationDetailWorkspace';
import AdministrativeDetailWorkspace from '@/components/case/workspace/administrative-detail/AdministrativeDetailWorkspace';
import UnknownCaseWorkspace from '@/components/case/workspace/UnknownCaseWorkspace';
import { resolveWorkspaceKind } from '@/components/case/workspace/shell/resolveWorkspaceKind';

/** Thin type switch onto the shared-shell detail workspaces. */
export default function CaseWorkspaceView({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const kind = resolveWorkspaceKind(caseItem);
  if (kind === 'CONSULTATION') {
    return <ConsultationDetailWorkspace caseItem={caseItem} onCaseChange={onCaseChange} />;
  }
  if (kind === 'LITIGATION') {
    return <LitigationDetailWorkspace caseItem={caseItem} onCaseChange={onCaseChange} />;
  }
  if (kind === 'ADMINISTRATIVE') {
    return <AdministrativeDetailWorkspace caseItem={caseItem} onCaseChange={onCaseChange} />;
  }
  return <UnknownCaseWorkspace caseItem={caseItem} onCaseChange={onCaseChange} />;
}
