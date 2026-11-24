'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Archive, Flag, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData } from '@/utils/caseCardHelpers';
import { assignedDisplayName } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { caseTypeListPath, navigateToCaseById } from '@/lib/caseRoutes';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import { apiUpdateCase } from '@/services/case/api';
import { apiGetLegalDeadlines, type CalculatedDeadline } from '@/services/legal-deadlines/api';
import { unwrapDeadlineList } from '@/components/case/CaseLegalDeadlinesList';
import { getCaseFinance } from '@/services/finance/api';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import { useToast } from '@/hooks/use-toast';
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
  defaultLeafForGroup,
  parseTab,
  primaryCtaLabel,
  resolvePrimaryCta,
  useCaseSummary,
  type CaseWorkspaceGroupId,
  type CaseWorkspaceLeaf,
  type CaseWorkspaceModalHostHandle,
  type CaseWorkspaceNavItem,
  type HeaderMenuItem,
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
  const shellCopy = t.cases.workspaces.shell;
  const litCopy = t.cases.workspaces.litigation.detail;
  const pw = t.cases.pageWorkspace;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEdit = usePermission('cases.edit');
  const canDelete = usePermission('cases.delete');
  const { authorized: showFinance } = useFinanceAccess();
  const modalRef = useRef<CaseWorkspaceModalHostHandle>(null);
  const lastSegmentRef = useRef<Partial<Record<CaseWorkspaceGroupId, CaseWorkspaceLeaf>>>({});

  const [legalDeadlines, setLegalDeadlines] = useState<CalculatedDeadline[] | null>(null);
  const [legalError, setLegalError] = useState(false);
  const [finance, setFinance] = useState<API.FinanceCaseSummary | null>(null);

  const parsed = parseTab('ADMINISTRATIVE', searchParams.get('tab'));
  const summary = useCaseSummary({
    caseItem,
    type: 'ADMINISTRATIVE',
    legalDeadlines,
  });

  const activeGroup = parsed.group;
  const activeLeaf = parsed.leaf;
  const status = adminStatusOf(caseItem);
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const completed =
    status === CaseStatus.CLOSED || Boolean(getCaseData(caseItem, 'completion_date'));
  const caseClosed = caseItem.status === CaseStatus.CLOSED || completed;

  const setLeaf = (next: CaseWorkspaceLeaf) => {
    const nextParsed = parseTab('ADMINISTRATIVE', next);
    if (GROUP_SEGMENTS[nextParsed.group]) {
      lastSegmentRef.current[nextParsed.group] = next;
    }
    const params = new URLSearchParams(searchParams);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const openGroup = (group: CaseWorkspaceGroupId) => {
    const remembered = lastSegmentRef.current[group];
    const leaf =
      remembered && GROUP_SEGMENTS[group]?.includes(remembered)
        ? remembered
        : defaultLeafForGroup('ADMINISTRATIVE', group);
    setLeaf(leaf);
  };

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
      modalRef.current?.openDeadline();
      return;
    }
    if (primary.id === 'mark_completed') {
      void markCompleted();
      return;
    }
    modalRef.current?.addTask();
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
        GROUP_SEGMENTS[g.id] != null
          ? (lastSegmentRef.current[g.id] ?? g.leaf)
          : g.leaf;
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
  }, [shellCopy, showFinance, summary, tf]);

  const segmentLeaves = GROUP_SEGMENTS[activeGroup];
  const segmentOptions = (segmentLeaves ?? []).map((leaf) => ({
    id: leaf,
    label: copy.sections[leaf as keyof typeof copy.sections],
  }));

  const listPath = caseTypeListPath('ADMINISTRATIVE');

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

  const archiveCase = async () => {
    try {
      const res = await apiUpdateCase({
        id: caseItem.id,
        status: CaseStatus.ARCHIVED,
      } as API.CaseUpdateForm);
      onCaseChange(res.data);
      toast({ title: pw.archiveCase });
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const newItems: HeaderMenuItem[] = [
    { key: 'task', label: copy.addTask, onClick: () => modalRef.current?.addTask() },
    ...(canEdit
      ? [
          {
            key: 'deadline',
            label: copy.addDeadline,
            onClick: () => modalRef.current?.openDeadline(),
          },
        ]
      : []),
    {
      key: 'appt',
      label: copy.addAppointment,
      onClick: () => modalRef.current?.addAppointment(),
    },
    ...(canEdit
      ? [
          {
            key: 'doc',
            label: copy.addDocument,
            onClick: () => modalRef.current?.triggerUpload(),
          },
          {
            key: 'note',
            label: litCopy.editNotes,
            onClick: () => modalRef.current?.editCase(caseItem, { focusField: 'notes' }),
          },
        ]
      : []),
  ];

  const moreItems: HeaderMenuItem[] = [
    ...(canEdit
      ? [
          {
            key: 'edit',
            label: copy.edit,
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => modalRef.current?.editCase(caseItem),
          },
        ]
      : []),
    ...(canEdit && !completed && primary?.id !== 'mark_completed'
      ? [{ key: 'mark', label: copy.markCompleted, onClick: () => void markCompleted() }]
      : []),
    ...(canEdit && caseItem.status !== CaseStatus.CLOSED
      ? [
          {
            key: 'close',
            label: pw.closeCase,
            icon: <Flag className="h-4 w-4" />,
            onClick: () => modalRef.current?.openClose(),
          },
        ]
      : []),
    ...(canEdit && caseItem.status !== CaseStatus.ARCHIVED
      ? [
          {
            key: 'archive',
            label: pw.archiveCase,
            icon: <Archive className="h-4 w-4" />,
            onClick: () => void archiveCase(),
          },
        ]
      : []),
    {
      key: 'conflict',
      label: pw.conflictCheck,
      icon: <ShieldAlert className="h-4 w-4" />,
      onClick: () => modalRef.current?.openConflict(),
    },
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: pw.deleteCase,
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
            separatorBefore: true,
            onClick: () => modalRef.current?.deleteCase(),
          },
        ]
      : []),
  ];

  const meta = (
    <>
      {caseItem.client ? (
        <CaseClientLabel client={caseItem.client} nameClassName="truncate" />
      ) : null}
      {caseItem.client && assignedDisplayName(caseItem) ? ' · ' : null}
      {assignedDisplayName(caseItem) ? (
        <span>
          {copy.snapshotLead}: {assignedDisplayName(caseItem)}
        </span>
      ) : null}
    </>
  );

  return (
    <CaseWorkspaceShell
      header={
        <CaseWorkspaceHeader
          listPath={listPath}
          backLabel={copy.back}
          typeLabel={t.cases.typeLabels.admin}
          status={String(status || caseItem.status || '')}
          priorityLabel={priority ? enumPretty(priority) : undefined}
          title={caseItem.title || t.cases.untitledCase}
          reference={caseItem.reference}
          meta={meta}
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
      onSelectNav={(item) => {
        if (GROUP_SEGMENTS[item.id]) openGroup(item.id);
        else setLeaf(item.leaf);
      }}
      caseItem={caseItem}
      listPath={listPath}
      onCaseChange={onCaseChange}
      modalRef={modalRef}
      enableHearingDialog={false}
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
          onOpenClient={() => void modalRef.current?.openClient()}
          onOpenCase={(id) => void navigateToCaseById(navigate, id)}
          onAddTask={() => modalRef.current?.addTask()}
        />
      ) : null}
      {activeLeaf === 'administrative' ? (
        <AdministrativeDutyFile
          caseItem={caseItem}
          onOpenDocuments={() => setLeaf('documents')}
        />
      ) : null}
      {activeLeaf === 'tasks' ? (
        <WorkspaceTasks
          caseItem={caseItem}
          onAdd={() => modalRef.current?.addTask()}
          onOpen={(id) => modalRef.current?.openTask(id)}
        />
      ) : null}
      {activeLeaf === 'appointments' ? (
        <WorkspaceAppointments
          caseItem={caseItem}
          onAdd={() => modalRef.current?.addAppointment()}
          onOpen={(id) => modalRef.current?.openAppointment(id)}
        />
      ) : null}
      {activeLeaf === 'deadlines' ? (
        <WorkspaceDeadlines
          caseItem={caseItem}
          canEdit={canEdit}
          legalDeadlines={legalDeadlines}
          legalError={legalError}
          onRetryLegal={loadLegal}
          onAdd={() => modalRef.current?.openDeadline()}
        />
      ) : null}
      {activeLeaf === 'documents' ? (
        <WorkspaceDocuments
          caseItem={caseItem}
          canEdit={canEdit}
          onUpload={() => modalRef.current?.triggerUpload()}
        />
      ) : null}
      {activeLeaf === 'notes' ? (
        <WorkspaceNotes
          caseItem={caseItem}
          canEdit={canEdit}
          onEdit={() => modalRef.current?.editCase(caseItem, { focusField: 'notes' })}
        />
      ) : null}
      {showFinance && activeLeaf === 'finance' ? <FinanceTab caseId={caseItem.id} /> : null}
      {JURIA_ENABLED && activeLeaf === 'juria' ? <JuriaCasePanel caseItem={caseItem} /> : null}
      {activeLeaf === 'activity' ? <WorkspaceActivity caseItem={caseItem} /> : null}
    </CaseWorkspaceShell>
  );
}
