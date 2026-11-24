'use client';

import { useMemo } from 'react';
import { Briefcase, User } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData } from '@/utils/caseCardHelpers';
import { assignedDisplayName } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import { apiUpdateCase } from '@/services/case/api';
import {
  WorkspaceActivity,
  WorkspaceAppointments,
  WorkspaceDeadlines,
  WorkspaceDocuments,
  WorkspaceNotes,
  WorkspaceTasks,
} from '@/components/case/workspace/sections';
import { caseCsd } from '@/components/case/workspace/litigation-detail/helpers';
import {
  CaseWorkspaceHeader,
  CaseWorkspaceSegments,
  CaseWorkspaceShell,
  primaryCtaLabel,
  resolvePrimaryCta,
  useCaseWorkspaceController,
  type CaseWorkspaceNavItem,
  type HeaderMenuItem,
  type HeaderMetaItem,
} from '@/components/case/workspace/shell';
import AdministrativeOverview from './AdministrativeOverview';
import AdministrativeDutyFile from './AdministrativeDutyFile';
import { getAdministrativeConfig } from './getAdministrativeConfig';
import { adminStatusOf } from './helpers';

const { groupSegments: GROUP_SEGMENTS, navGroups: NAV_GROUPS } = getAdministrativeConfig();

type AdminBadgeKey = 'dutyFile' | 'schedule' | 'work' | 'documents';

export default function AdministrativeDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.administrative.detail;
  const litCopy = t.cases.workspaces.litigation.detail;
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
    toast,
  } = useCaseWorkspaceController({
    caseItem,
    onCaseChange,
    type: 'ADMINISTRATIVE',
    groupSegments: GROUP_SEGMENTS,
  });

  const status = adminStatusOf(caseItem);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const completed =
    status === CaseStatus.CLOSED || Boolean(getCaseData(caseItem, 'completion_date'));
  const caseClosed = caseItem.status === CaseStatus.CLOSED || completed;

  const primary = resolvePrimaryCta('ADMINISTRATIVE', summary, { canEdit, caseClosed });
  const primaryLabel = primary ? primaryCtaLabel(primary, shellCopy) : '';

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

  const runPrimary = () => {
    if (!primary) return;
    if (primary.id === 'open_checklist') {
      setLeaf('administrative');
      return;
    }
    if (primary.id === 'add_deadline') {
      modals.openDeadline();
      return;
    }
    if (primary.id === 'mark_completed') {
      void markCompleted();
      return;
    }
    modals.addTask();
  };

  const navItems = useMemo(() => {
    const attention = (label: string, count?: number) =>
      count ? tf(shellCopy.navAttention, { label, count }) : label;
    const badgeOf = (key?: AdminBadgeKey) => {
      if (key === 'dutyFile') return summary.dutyFileBadge;
      if (key === 'schedule') return summary.scheduleBadge;
      if (key === 'work') return summary.workBadge;
      if (key === 'documents') return summary.documentsBadge;
      return 0;
    };

    const items: CaseWorkspaceNavItem[] = [];
    for (const g of NAV_GROUPS) {
      if (g.financeGated && !showFinance) continue;
      if (g.juriaFlagged && !JURIA_ENABLED) continue;
      const count = badgeOf(g.badge) || undefined;
      const leaf =
        GROUP_SEGMENTS[g.id] != null ? (lastSegmentRef.current[g.id] ?? g.leaf) : g.leaf;
      items.push({
        id: g.id,
        leaf,
        label: shellCopy.groups[g.labelKey],
        icon: g.icon,
        count,
        urgent:
          g.badge === 'dutyFile' || g.badge === 'schedule'
            ? (count ?? 0) > 0
            : g.badge === 'documents'
              ? summary.missingRequiredDocCount > 0
              : undefined,
        countAriaLabel: attention(shellCopy.groups[g.labelKey], count),
        footer: g.footer,
      });
    }
    return items;
  }, [shellCopy, showFinance, summary, tf, lastSegmentRef]);

  const segmentOptions = (segmentLeaves ?? []).map((leaf) => ({
    id: leaf,
    label: copy.sections[leaf as keyof typeof copy.sections],
  }));

  const newItems: HeaderMenuItem[] = [
    { key: 'task', label: copy.addTask, onClick: () => modals.addTask() },
    ...(canEdit
      ? [{ key: 'deadline', label: copy.addDeadline, onClick: () => modals.openDeadline() }]
      : []),
    { key: 'appt', label: copy.addAppointment, onClick: () => modals.addAppointment() },
    ...(canEdit
      ? [
          { key: 'doc', label: copy.addDocument, onClick: () => modals.triggerUpload() },
          {
            key: 'note',
            label: litCopy.editNotes,
            onClick: () => modals.editCase({ focusField: 'notes' }),
          },
        ]
      : []),
  ];

  const lifecycle = lifecycleMoreItems({ edit: copy.edit });
  const moreItems: HeaderMenuItem[] = [
    ...lifecycle.filter((item) => item.key === 'edit'),
    ...(canEdit && !completed && primary?.id !== 'mark_completed'
      ? [{ key: 'mark', label: copy.markCompleted, onClick: () => void markCompleted() }]
      : []),
    ...lifecycle.filter((item) => item.key !== 'edit'),
  ];

  const leadName = assignedDisplayName(caseItem);
  const metaItems: HeaderMetaItem[] = [
    ...(caseItem.client
      ? [{ id: 'client', label: copy.snapshotClient, icon: User, value: <CaseClientLabel client={caseItem.client} nameClassName="truncate" /> }]
      : []),
    ...(leadName ? [{ id: 'lead', label: copy.snapshotLead, icon: Briefcase, value: leadName }] : []),
  ];

  return (
    <CaseWorkspaceShell
      header={
        <CaseWorkspaceHeader
          listPath={listPath}
          backLabel={copy.back}
          status={String(status || caseItem.status || '')}
          priorityLabel={priority ? enumPretty(priority) : undefined}
          title={caseItem.title || t.cases.untitledCase}
          reference={caseItem.reference}
          metaItems={metaItems}
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
      enableHearingDialog={false}
      segments={
        segmentOptions.length > 1 ? (
          <CaseWorkspaceSegments options={segmentOptions} value={activeLeaf} onChange={setLeaf} ariaLabel={shellCopy.segmentsLabel} />
        ) : null
      }
      paneHeading={
        activeLeaf === 'finance'
          ? shellCopy.groups.finance
          : activeLeaf === 'juria'
            ? shellCopy.groups.juria
            : undefined
      }
    >
      {activeLeaf === 'overview' ? (
        <AdministrativeOverview
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
      {activeLeaf === 'administrative' ? (
        <AdministrativeDutyFile
          caseItem={caseItem}
          onOpenCase={openRelated}
          onOpenClient={() => modals.openClient()}
          onOpenDocuments={() => setLeaf('documents')}
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
