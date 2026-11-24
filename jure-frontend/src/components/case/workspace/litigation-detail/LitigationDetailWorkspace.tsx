'use client';

import { useMemo } from 'react';
import {
  Activity,
  CheckSquare,
  FileText,
  Folder,
  Gavel,
  LayoutDashboard,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';
import { JURIA_ENABLED } from '@/config/features';
import { getCaseData } from '@/utils/caseCardHelpers';
import { assignedDisplayName } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import LitigationOverview from './LitigationOverview';
import LitigationDetails from './LitigationDetails';
import LitigationParties from './LitigationParties';
import LitigationHearings from './LitigationHearings';
import {
  WorkspaceActivity,
  WorkspaceAppointments,
  WorkspaceDeadlines,
  WorkspaceDocuments,
  WorkspaceNotes,
  WorkspaceTasks,
} from '@/components/case/workspace/sections';
import {
  CaseWorkspaceHeader,
  CaseWorkspaceSegments,
  CaseWorkspaceShell,
  primaryCtaLabel,
  resolvePrimaryCta,
  useCaseWorkspaceController,
  type CaseWorkspaceGroupId,
  type CaseWorkspaceLeaf,
  type CaseWorkspaceNavItem,
  type HeaderMenuItem,
} from '@/components/case/workspace/shell';

const GROUP_SEGMENTS: Partial<Record<CaseWorkspaceGroupId, CaseWorkspaceLeaf[]>> = {
  caseFile: ['caseDetails', 'parties'],
  schedule: ['hearings', 'deadlines', 'appointments'],
  work: ['tasks', 'notes', 'research'],
};

export default function LitigationDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.litigation.detail;
  const {
    shellCopy,
    canEdit,
    showFinance,
    modalRef,
    lastSegmentRef,
    activeGroup,
    activeLeaf,
    setLeaf,
    onSelectNav,
    summary,
    legalDeadlines,
    legalError,
    loadLegal,
    finance,
    listPath,
    openRelated,
    modals,
    lifecycleMoreItems,
    segmentLeaves,
  } = useCaseWorkspaceController({
    caseItem,
    onCaseChange,
    type: 'LITIGATION',
    groupSegments: GROUP_SEGMENTS,
    loadResearch: true,
  });

  const navItems = useMemo(() => {
    const attention = (label: string, count?: number) =>
      count ? tf(shellCopy.navAttention, { label, count }) : label;

    const items: CaseWorkspaceNavItem[] = [
      {
        id: 'overview',
        leaf: 'overview',
        label: shellCopy.groups.overview,
        icon: LayoutDashboard,
      },
      {
        id: 'caseFile',
        leaf: lastSegmentRef.current.caseFile ?? 'caseDetails',
        label: shellCopy.groups.caseFile,
        icon: FileText,
      },
      {
        id: 'schedule',
        leaf: lastSegmentRef.current.schedule ?? 'hearings',
        label: shellCopy.groups.schedule,
        icon: Gavel,
        count: summary.scheduleBadge || undefined,
        urgent: summary.scheduleBadge > 0,
        countAriaLabel: attention(shellCopy.groups.schedule, summary.scheduleBadge || undefined),
      },
      {
        id: 'work',
        leaf: lastSegmentRef.current.work ?? 'tasks',
        label: shellCopy.groups.work,
        icon: CheckSquare,
        count: summary.workBadge || undefined,
        countAriaLabel: attention(shellCopy.groups.work, summary.workBadge || undefined),
      },
      {
        id: 'documents',
        leaf: 'documents',
        label: shellCopy.groups.documents,
        icon: Folder,
        count: summary.documentsBadge || undefined,
        urgent: summary.missingRequiredDocCount > 0,
        countAriaLabel: attention(shellCopy.groups.documents, summary.documentsBadge || undefined),
      },
    ];
    if (showFinance) {
      items.push({
        id: 'finance',
        leaf: 'finance',
        label: shellCopy.groups.finance,
        icon: Wallet,
      });
    }
    items.push({
      id: 'activity',
      leaf: 'activity',
      label: shellCopy.groups.activity,
      icon: Activity,
    });
    if (JURIA_ENABLED) {
      items.push({
        id: 'juria',
        leaf: 'juria',
        label: shellCopy.groups.juria,
        icon: Sparkles,
        footer: true,
      });
    }
    return items;
  }, [shellCopy, showFinance, summary, tf, lastSegmentRef]);

  const segmentOptions = (segmentLeaves ?? []).map((leaf) => ({
    id: leaf,
    label: copy.sections[leaf as keyof typeof copy.sections],
  }));

  const primary = resolvePrimaryCta('LITIGATION', summary, { canEdit });
  const primaryLabel = primary ? primaryCtaLabel(primary, shellCopy) : '';

  const runPrimary = () => {
    if (!primary) return;
    if (primary.id === 'add_hearing') {
      modals.openHearing();
      return;
    }
    if (primary.id === 'prepare_hearing') {
      if (primary.preferUpload) {
        setLeaf('documents');
        modals.triggerUpload();
      } else {
        setLeaf('hearings');
      }
      return;
    }
    if (primary.id === 'review_deadlines') {
      setLeaf('deadlines');
      return;
    }
    modals.addTask();
  };

  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const clientMeta = caseItem.client ? (
    <CaseClientLabel client={caseItem.client} nameClassName="truncate" />
  ) : null;
  const leadMeta = assignedDisplayName(caseItem);

  const newItems: HeaderMenuItem[] = [
    { key: 'task', label: copy.addTask, onClick: () => modals.addTask() },
    ...(canEdit
      ? [
          { key: 'hearing', label: copy.addHearing, onClick: () => modals.openHearing() },
          { key: 'deadline', label: copy.addDeadline, onClick: () => modals.openDeadline() },
        ]
      : []),
    { key: 'appt', label: copy.addAppointment, onClick: () => modals.addAppointment() },
    ...(canEdit
      ? [
          { key: 'doc', label: copy.addDocument, onClick: () => modals.triggerUpload() },
          {
            key: 'note',
            label: copy.editNotes,
            onClick: () => modals.editCase({ focusField: 'notes' }),
          },
        ]
      : []),
  ];

  const moreItems: HeaderMenuItem[] = lifecycleMoreItems({ edit: copy.edit });

  return (
    <CaseWorkspaceShell
      header={
        <CaseWorkspaceHeader
          listPath={listPath}
          backLabel={copy.back}
          typeLabel={t.cases.typeLabels.litigation}
          status={String(caseItem.status ?? '')}
          priorityLabel={priority ? enumPretty(priority) : undefined}
          title={caseItem.title || t.cases.untitledCase}
          reference={caseItem.reference}
          meta={
            clientMeta || leadMeta ? (
              <>
                {clientMeta}
                {clientMeta && leadMeta ? ' · ' : null}
                {leadMeta ? (
                  <span>
                    {copy.snapshotLead}: {leadMeta}
                  </span>
                ) : null}
              </>
            ) : undefined
          }
          primaryCta={primary ? { label: primaryLabel, onClick: runPrimary } : null}
          newItems={newItems}
          moreItems={moreItems}
          newMenuLabel={shellCopy.newMenu}
        />
      }
      navLabel={copy.navLabel}
      navItems={navItems}
      activeNavId={activeGroup}
      activeLeaf={activeLeaf}
      onSelectNav={onSelectNav}
      caseItem={caseItem}
      listPath={listPath}
      onCaseChange={onCaseChange}
      modalRef={modalRef}
    >
      {segmentOptions.length > 1 ? (
        <CaseWorkspaceSegments
          options={segmentOptions}
          value={activeLeaf}
          onChange={setLeaf}
          ariaLabel={shellCopy.segmentsLabel}
        />
      ) : null}

      {activeLeaf === 'overview' ? (
        <LitigationOverview
          caseItem={caseItem}
          canEdit={canEdit}
          showFinance={showFinance}
          summary={summary}
          legalDeadlines={legalDeadlines}
          finance={finance}
          primaryActionLabel={primaryLabel}
          onPrimaryAction={runPrimary}
          onOpenSection={setLeaf}
          onOpenClient={() => modals.openClient()}
          onOpenCase={openRelated}
          onAddTask={() => modals.addTask()}
        />
      ) : null}
      {activeLeaf === 'caseDetails' ? (
        <LitigationDetails caseItem={caseItem} onOpenCase={openRelated} />
      ) : null}
      {activeLeaf === 'parties' ? (
        <LitigationParties
          caseItem={caseItem}
          onOpenClient={() => modals.openClient()}
          onConflict={() => modals.openConflict()}
        />
      ) : null}
      {activeLeaf === 'tasks' ? (
        <WorkspaceTasks
          caseItem={caseItem}
          onAdd={() => modals.addTask()}
          onOpen={(id) => modals.openTask(id)}
        />
      ) : null}
      {activeLeaf === 'appointments' ? (
        <WorkspaceAppointments
          caseItem={caseItem}
          onAdd={() => modals.addAppointment()}
          onOpen={(id) => modals.openAppointment(id)}
        />
      ) : null}
      {activeLeaf === 'hearings' ? (
        <LitigationHearings
          caseItem={caseItem}
          canEdit={canEdit}
          onAdd={() => modals.openHearing()}
        />
      ) : null}
      {activeLeaf === 'deadlines' ? (
        <WorkspaceDeadlines
          caseItem={caseItem}
          canEdit={canEdit}
          legalDeadlines={legalDeadlines}
          legalError={legalError}
          onRetryLegal={loadLegal}
          onAdd={() => modals.openDeadline()}
        />
      ) : null}
      {activeLeaf === 'documents' ? (
        <WorkspaceDocuments
          caseItem={caseItem}
          canEdit={canEdit}
          onUpload={() => modals.triggerUpload()}
        />
      ) : null}
      {activeLeaf === 'research' ? (
        <div className="space-y-3">
          {JURIA_ENABLED ? (
            <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={() => setLeaf('juria')}>
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
      {activeLeaf === 'notes' ? (
        <WorkspaceNotes
          caseItem={caseItem}
          canEdit={canEdit}
          onEdit={() => modals.editCase({ focusField: 'notes' })}
        />
      ) : null}
      {showFinance && activeLeaf === 'finance' ? <FinanceTab caseId={caseItem.id} /> : null}
      {JURIA_ENABLED && activeLeaf === 'juria' ? <JuriaCasePanel caseItem={caseItem} /> : null}
      {activeLeaf === 'activity' ? <WorkspaceActivity caseItem={caseItem} /> : null}
    </CaseWorkspaceShell>
  );
}
