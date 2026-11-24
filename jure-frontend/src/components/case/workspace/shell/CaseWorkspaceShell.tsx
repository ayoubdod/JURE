'use client';

import type { ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import CaseWorkspaceNav from './CaseWorkspaceNav';
import CaseWorkspaceModalHost, {
  type CaseWorkspaceModalHostHandle,
} from './CaseWorkspaceModalHost';
import type { CaseWorkspaceGroupId, CaseWorkspaceLeaf, CaseWorkspaceNavItem } from './types';

export default function CaseWorkspaceShell({
  header,
  navLabel,
  navItems,
  activeNavId,
  activeLeaf,
  onSelectNav,
  children,
  caseItem,
  listPath,
  onCaseChange,
  modalRef,
  enableHearingDialog = true,
  enableDeadlineDialog = true,
}: {
  header: ReactNode;
  navLabel: string;
  navItems: CaseWorkspaceNavItem[];
  activeNavId: CaseWorkspaceGroupId;
  activeLeaf: CaseWorkspaceLeaf;
  onSelectNav: (item: CaseWorkspaceNavItem) => void;
  children: ReactNode;
  caseItem: API.Case;
  listPath: string;
  onCaseChange: (next: API.Case) => void;
  modalRef?: Ref<CaseWorkspaceModalHostHandle>;
  enableHearingDialog?: boolean;
  enableDeadlineDialog?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      {header}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <CaseWorkspaceNav
          items={navItems}
          activeId={activeNavId}
          navLabel={navLabel}
          onSelect={onSelectNav}
        />

        <div
          className={cn(
            'min-h-0 min-w-0 flex-1',
            activeLeaf === 'juria' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
          )}
        >
          <div
            className={cn(
              'px-3 py-4 sm:px-5 lg:px-6',
              activeLeaf === 'juria' && 'flex h-full min-h-0 flex-1 flex-col overflow-hidden p-0'
            )}
          >
            {children}
          </div>
        </div>
      </div>

      <CaseWorkspaceModalHost
        ref={modalRef}
        caseItem={caseItem}
        listPath={listPath}
        onCaseChange={onCaseChange}
        enableHearingDialog={enableHearingDialog}
        enableDeadlineDialog={enableDeadlineDialog}
      />
    </div>
  );
}
