'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Activity,
  Archive,
  CheckSquare,
  FileText,
  Flag,
  Folder,
  Gavel,
  LayoutDashboard,
  Pencil,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { JURIA_ENABLED } from '@/config/features';
import { CaseStatus } from '@/utils/constants';
import { getCaseData } from '@/utils/caseCardHelpers';
import { assignedDisplayName } from '@/services/case/caseType';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import { caseTypeListPath, navigateToCaseById } from '@/lib/caseRoutes';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import { apiUpdateCase } from '@/services/case/api';
import { apiGetLegalDeadlines, type CalculatedDeadline } from '@/services/legal-deadlines/api';
import { unwrapDeadlineList } from '@/components/case/CaseLegalDeadlinesList';
import { apiGetResearchNotes, unwrapResearchNoteList, type ResearchNote } from '@/services/research-notes/api';
import { getCaseFinance } from '@/services/finance/api';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import { useToast } from '@/hooks/use-toast';
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
  const shellCopy = t.cases.workspaces.shell;
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
  const [researchNotes, setResearchNotes] = useState<ResearchNote[] | null>(null);
  const [finance, setFinance] = useState<API.FinanceCaseSummary | null>(null);

  const parsed = parseTab('LITIGATION', searchParams.get('tab'));
  const summary = useCaseSummary({
    caseItem,
    type: 'LITIGATION',
    legalDeadlines,
    researchNotes,
  });

  const activeGroup = parsed.group;
  const activeLeaf = parsed.leaf;

  const setLeaf = (next: CaseWorkspaceLeaf) => {
    const nextParsed = parseTab('LITIGATION', next);
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
        : defaultLeafForGroup('LITIGATION', group);
    setLeaf(leaf);
  };

  const navItems = useMemo(() => {
    const attention = (label: string, count?: number) =>
      count
        ? tf(shellCopy.navAttention, { label, count })
        : label;

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
  }, [shellCopy, showFinance, summary, tf]);

  const segmentLeaves = GROUP_SEGMENTS[activeGroup];
  const segmentOptions = (segmentLeaves ?? []).map((leaf) => ({
    id: leaf,
    label: copy.sections[leaf as keyof typeof copy.sections],
  }));

  const primary = resolvePrimaryCta(
    'LITIGATION',
    summary,
    { canEdit }
  );
  const primaryLabel = primary ? primaryCtaLabel(primary, shellCopy) : '';

  const runPrimary = () => {
    if (!primary) return;
    if (primary.id === 'add_hearing') {
      modalRef.current?.openHearing();
      return;
    }
    if (primary.id === 'prepare_hearing') {
      if (primary.preferUpload) {
        setLeaf('documents');
        modalRef.current?.triggerUpload();
      } else {
        setLeaf('hearings');
      }
      return;
    }
    if (primary.id === 'review_deadlines') {
      setLeaf('deadlines');
      return;
    }
    modalRef.current?.addTask();
  };

  const listPath = caseTypeListPath('LITIGATION');
  const priority = getCaseData(caseItem, 'priority') as string | undefined;
  const clientMeta = caseItem.client ? (
    <CaseClientLabel client={caseItem.client} nameClassName="truncate" />
  ) : null;
  const leadMeta = assignedDisplayName(caseItem);

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
    apiGetResearchNotes({ matter: caseItem.id, page_size: 20 })
      .then((res) => setResearchNotes(unwrapResearchNoteList(res.data)))
      .catch(() => setResearchNotes([]));
    if (!showFinance) return;
    getCaseFinance(caseItem.id)
      .then((res) => setFinance(normalizeCaseFinancePayload(res.data).summary))
      .catch(() => setFinance(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseItem.id, showFinance]);

  const openRelated = (id: number) => {
    void navigateToCaseById(navigate, id);
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

  const newItems: HeaderMenuItem[] = [
    { key: 'task', label: copy.addTask, onClick: () => modalRef.current?.addTask() },
    ...(canEdit
      ? [
          { key: 'hearing', label: copy.addHearing, onClick: () => modalRef.current?.openHearing() },
          { key: 'deadline', label: copy.addDeadline, onClick: () => modalRef.current?.openDeadline() },
        ]
      : []),
    { key: 'appt', label: copy.addAppointment, onClick: () => modalRef.current?.addAppointment() },
    ...(canEdit
      ? [
          { key: 'doc', label: copy.addDocument, onClick: () => modalRef.current?.triggerUpload() },
          {
            key: 'note',
            label: copy.editNotes,
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

  const header = (
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
  );

  return (
    <CaseWorkspaceShell
      header={header}
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
          onOpenClient={() => void modalRef.current?.openClient()}
          onOpenCase={openRelated}
          onAddTask={() => modalRef.current?.addTask()}
        />
      ) : null}
      {activeLeaf === 'caseDetails' ? (
        <LitigationDetails caseItem={caseItem} onOpenCase={openRelated} />
      ) : null}
      {activeLeaf === 'parties' ? (
        <LitigationParties
          caseItem={caseItem}
          onOpenClient={() => void modalRef.current?.openClient()}
          onConflict={() => modalRef.current?.openConflict()}
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
      {activeLeaf === 'hearings' ? (
        <LitigationHearings
          caseItem={caseItem}
          canEdit={canEdit}
          onAdd={() => modalRef.current?.openHearing()}
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
          onEdit={() => modalRef.current?.editCase(caseItem, { focusField: 'notes' })}
        />
      ) : null}
      {showFinance && activeLeaf === 'finance' ? <FinanceTab caseId={caseItem.id} /> : null}
      {JURIA_ENABLED && activeLeaf === 'juria' ? <JuriaCasePanel caseItem={caseItem} /> : null}
      {activeLeaf === 'activity' ? <WorkspaceActivity caseItem={caseItem} /> : null}
    </CaseWorkspaceShell>
  );
}
