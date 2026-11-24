'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Archive, Flag, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { usePermission } from '@/hooks/usePermissions';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { CaseStatus } from '@/utils/constants';
import { caseTypeListPath, navigateToCaseById } from '@/lib/caseRoutes';
import { apiUpdateCase } from '@/services/case/api';
import { apiGetLegalDeadlines, type CalculatedDeadline } from '@/services/legal-deadlines/api';
import { unwrapDeadlineList } from '@/components/case/CaseLegalDeadlinesList';
import { getCaseFinance } from '@/services/finance/api';
import { normalizeCaseFinancePayload } from '@/utils/normalizeCaseFinance';
import { apiGetResearchNotes, unwrapResearchNoteList, type ResearchNote } from '@/services/research-notes/api';
import { useToast } from '@/hooks/use-toast';
import { defaultLeafForGroup, parseTab } from './parseTab';
import { useCaseSummary } from './useCaseSummary';
import type { CaseWorkspaceGroupId, CaseWorkspaceLeaf, CaseWorkspaceType } from './types';
import type { CaseWorkspaceModalHostHandle } from './CaseWorkspaceModalHost';
import type { HeaderMenuItem } from './CaseWorkspaceHeader';

export type GroupSegments = Partial<Record<CaseWorkspaceGroupId, CaseWorkspaceLeaf[]>>;

/**
 * Shared leaf/segment routing, legal/finance (optional research) loads, and modal openers.
 * Type-specific nav, +New, More extras, and primary CTA stay in each workspace.
 */
export function useCaseWorkspaceController({
  caseItem,
  onCaseChange,
  type,
  groupSegments,
  loadResearch = false,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
  type: CaseWorkspaceType;
  groupSegments: GroupSegments;
  loadResearch?: boolean;
}) {
  const { t } = useAppTranslation();
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

  const parsed = parseTab(type, searchParams.get('tab'));
  const summary = useCaseSummary({
    caseItem,
    type,
    legalDeadlines,
    researchNotes: loadResearch ? researchNotes : undefined,
  });

  const setLeaf = useCallback(
    (next: CaseWorkspaceLeaf) => {
      const nextParsed = parseTab(type, next);
      if (groupSegments[nextParsed.group]) {
        lastSegmentRef.current[nextParsed.group] = next;
      }
      const params = new URLSearchParams(searchParams);
      if (next === 'overview') params.delete('tab');
      else params.set('tab', next);
      setSearchParams(params, { replace: true });
    },
    [groupSegments, searchParams, setSearchParams, type]
  );

  const openGroup = useCallback(
    (group: CaseWorkspaceGroupId) => {
      const remembered = lastSegmentRef.current[group];
      const leaf =
        remembered && groupSegments[group]?.includes(remembered)
          ? remembered
          : defaultLeafForGroup(type, group);
      setLeaf(leaf);
    },
    [groupSegments, setLeaf, type]
  );

  const onSelectNav = useCallback(
    (item: { id: CaseWorkspaceGroupId; leaf: CaseWorkspaceLeaf }) => {
      if (groupSegments[item.id]) openGroup(item.id);
      else setLeaf(item.leaf);
    },
    [groupSegments, openGroup, setLeaf]
  );

  const loadLegal = useCallback(() => {
    setLegalError(false);
    apiGetLegalDeadlines({ case: caseItem.id })
      .then((res) => setLegalDeadlines(unwrapDeadlineList(res.data)))
      .catch(() => {
        setLegalDeadlines([]);
        setLegalError(true);
      });
  }, [caseItem.id]);

  useEffect(() => {
    loadLegal();
    if (loadResearch) {
      apiGetResearchNotes({ matter: caseItem.id, page_size: 20 })
        .then((res) => setResearchNotes(unwrapResearchNoteList(res.data)))
        .catch(() => setResearchNotes([]));
    }
    if (!showFinance) {
      setFinance(null);
      return;
    }
    getCaseFinance(caseItem.id)
      .then((res) => setFinance(normalizeCaseFinancePayload(res.data).summary))
      .catch(() => setFinance(null));
  }, [caseItem.id, loadLegal, loadResearch, showFinance]);

  const listPath = caseTypeListPath(type);

  const openRelated = useCallback(
    (id: number) => {
      void navigateToCaseById(navigate, id);
    },
    [navigate]
  );

  const archiveCase = useCallback(async () => {
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
  }, [caseItem.id, onCaseChange, pw.archiveCase, t.common.error, toast]);

  const modals = {
    addTask: () => modalRef.current?.addTask(),
    openTask: (id: number) => modalRef.current?.openTask(id),
    addAppointment: () => modalRef.current?.addAppointment(),
    openAppointment: (id: number) => modalRef.current?.openAppointment(id),
    openDeadline: () => modalRef.current?.openDeadline(),
    openHearing: () => modalRef.current?.openHearing(),
    triggerUpload: () => modalRef.current?.triggerUpload(),
    editCase: (opts?: { focusField?: 'notes' }) => modalRef.current?.editCase(caseItem, opts),
    openClient: () => void modalRef.current?.openClient(),
    openClose: () => modalRef.current?.openClose(),
    openConflict: () => modalRef.current?.openConflict(),
    deleteCase: () => modalRef.current?.deleteCase(),
  };

  /** Shared lifecycle More items (Edit / Close / Archive / Conflict / Delete). */
  const lifecycleMoreItems = (labels: {
    edit: string;
    includeEdit?: boolean;
  }): HeaderMenuItem[] => {
    const includeEdit = labels.includeEdit ?? canEdit;
    return [
      ...(includeEdit
        ? [
            {
              key: 'edit',
              label: labels.edit,
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => modals.editCase(),
            },
          ]
        : []),
      ...(canEdit && caseItem.status !== CaseStatus.CLOSED
        ? [
            {
              key: 'close',
              label: pw.closeCase,
              icon: <Flag className="h-4 w-4" />,
              onClick: () => modals.openClose(),
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
        onClick: () => modals.openConflict(),
      },
      ...(canDelete
        ? [
            {
              key: 'delete',
              label: pw.deleteCase,
              icon: <Trash2 className="h-4 w-4" />,
              destructive: true,
              separatorBefore: true,
              onClick: () => modals.deleteCase(),
            },
          ]
        : []),
    ];
  };

  const segmentLeaves = groupSegments[parsed.group];

  return {
    t,
    shellCopy,
    pw,
    navigate,
    toast,
    canEdit,
    canDelete,
    showFinance,
    modalRef,
    lastSegmentRef,
    activeGroup: parsed.group,
    activeLeaf: parsed.leaf,
    setLeaf,
    openGroup,
    onSelectNav,
    summary,
    legalDeadlines,
    legalError,
    loadLegal,
    finance,
    researchNotes,
    listPath,
    openRelated,
    archiveCase,
    modals,
    lifecycleMoreItems,
    segmentLeaves,
    searchParams,
    setSearchParams,
  };
}
