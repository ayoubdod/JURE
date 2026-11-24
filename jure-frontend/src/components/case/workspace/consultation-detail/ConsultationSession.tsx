'use client';

import { ConvertedCaseLink, getConvertedToCase } from '@/components/case/conversion/ConvertedCaseLink';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';
import { WorkspaceCard } from '@/components/case/workspace/litigation-detail/ui';
import ConsultationSessionBody from './ConsultationSessionBody';
import { isCancelled } from './helpers';

/** Single home for session fields, advice/outcome, follow-ups, and convert card. */
export default function ConsultationSession({
  caseItem,
  canEdit,
  canConvert,
  showConvertAction,
  onOpenCase,
  onAddFollowUp,
  onConvert,
}: {
  caseItem: API.Case;
  canEdit: boolean;
  canConvert: boolean;
  showConvertAction: boolean;
  onOpenCase: (id: number) => void;
  onAddFollowUp: () => void;
  onConvert: () => void;
}) {
  const { t } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const cw = t.cases.modal.consultationWorkflow;
  const converted = getConvertedToCase(caseItem);

  return (
    <div className="space-y-4">
      <ConsultationSessionBody
        c={caseItem}
        onOpenCaseById={onOpenCase}
        onAddFollowUp={canEdit && !isCancelled(caseItem) ? onAddFollowUp : undefined}
      />

      <WorkspaceCard title={cw.openCase}>
        {converted ? (
          <ConvertedCaseLink variant="converted" link={converted} onViewCase={onOpenCase} />
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-[13px] text-slate-500">{copy.notConverted}</p>
            {canConvert && showConvertAction ? (
              <Button
                type="button"
                className="min-h-11 rounded-lg bg-[#64499D] text-white hover:bg-[#4D3680]"
                onClick={onConvert}
              >
                {t.cases.workspaces.consultation.actions.convert}
              </Button>
            ) : null}
          </div>
        )}
      </WorkspaceCard>
    </div>
  );
}
