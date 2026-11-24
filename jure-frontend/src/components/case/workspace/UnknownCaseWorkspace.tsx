'use client';

import { useMemo } from 'react';
import { Activity, Folder, LayoutDashboard } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { WorkspaceActivity, WorkspaceDocuments } from '@/components/case/workspace/sections';
import {
  CaseWorkspaceHeader,
  CaseWorkspaceShell,
  useCaseWorkspaceController,
  type CaseWorkspaceNavItem,
} from '@/components/case/workspace/shell';
import { OverviewCard } from '@/components/case/workspace/shell/OverviewCards';

/** Minimal shared-shell workspace for unrecognized case types. */
export default function UnknownCaseWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t } = useAppTranslation();
  const shellCopy = t.cases.workspaces.shell;
  const pw = t.cases.pageWorkspace;
  const {
    canEdit,
    modalRef,
    activeGroup,
    activeLeaf,
    onSelectNav,
    listPath,
    modals,
    lifecycleMoreItems,
  } = useCaseWorkspaceController({
    caseItem,
    onCaseChange,
    type: 'UNKNOWN',
    groupSegments: {},
  });

  const navItems = useMemo((): CaseWorkspaceNavItem[] => {
    return [
      {
        id: 'overview',
        leaf: 'overview',
        label: shellCopy.groups.overview,
        icon: LayoutDashboard,
      },
      {
        id: 'documents',
        leaf: 'documents',
        label: shellCopy.groups.documents,
        icon: Folder,
      },
      {
        id: 'activity',
        leaf: 'activity',
        label: shellCopy.groups.activity,
        icon: Activity,
      },
    ];
  }, [shellCopy]);

  const moreItems = lifecycleMoreItems({ edit: pw.editCase });

  return (
    <CaseWorkspaceShell
      header={
        <CaseWorkspaceHeader
          listPath={listPath}
          backLabel={pw.cases}
          typeLabel={pw.cases}
          status={String(caseItem.status || '')}
          title={caseItem.title || t.cases.untitledCase}
          reference={caseItem.reference}
          primaryCta={null}
          newItems={[]}
          moreItems={moreItems}
          newMenuLabel={shellCopy.newMenu}
        />
      }
      navLabel={shellCopy.groups.overview}
      navItems={navItems}
      activeNavId={activeGroup}
      activeLeaf={activeLeaf}
      onSelectNav={onSelectNav}
      caseItem={caseItem}
      listPath={listPath}
      onCaseChange={onCaseChange}
      modalRef={modalRef}
      enableHearingDialog={false}
      enableDeadlineDialog={false}
    >
      {activeLeaf === 'overview' ? (
        <div className="space-y-4">
          <OverviewCard title={shellCopy.overview.keyFacts}>
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[13px] text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {shellCopy.unsupportedType}
            </p>
          </OverviewCard>
        </div>
      ) : null}
      {activeLeaf === 'documents' ? (
        <WorkspaceDocuments
          caseItem={caseItem}
          onUpload={() => modals.triggerUpload()}
          canEdit={canEdit}
        />
      ) : null}
      {activeLeaf === 'activity' ? <WorkspaceActivity caseItem={caseItem} /> : null}
    </CaseWorkspaceShell>
  );
}
