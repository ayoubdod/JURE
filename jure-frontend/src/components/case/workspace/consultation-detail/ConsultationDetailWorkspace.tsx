'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, User } from 'lucide-react';
import { useAppTranslation } from '@/i18n';
import { JURIA_ENABLED } from '@/config/features';
import { getCaseData } from '@/utils/caseCardHelpers';
import { CaseClientLabel } from '@/components/client/CaseClientLabel';
import {
  canShowConvertToCase,
  getConvertedToCase,
} from '@/components/case/conversion/ConvertedCaseLink';
import { ConversionTypeSelector, type ConversionTargetType } from '@/components/case/conversion/ConversionTypeSelector';
import { ConversionForm } from '@/components/case/conversion/ConversionForm';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import { apiRetryConsultationEmail, apiUpdateCase } from '@/services/case/api';
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
  type CaseWorkspaceNavItem,
  type HeaderMenuItem,
  type HeaderMetaItem,
} from '@/components/case/workspace/shell';
import {
  resolveConsultationHash,
  shouldOpenConvertFromQuery,
} from '@/components/case/workspace/shell/consultationDeepLinks';
import { stripConvertSearchParam } from '@/components/case/workspace/shell/navigationGuards';
import ConsultationOverview from './ConsultationOverview';
import ConsultationSession from './ConsultationSession';
import { getConsultationConfig } from './getConsultationConfig';
import {
  attorneysOf,
  consultationCanJoinVideo,
  isCancelled,
  isConsultationSessionDatePassed,
  isConsultationTerminal,
  outcomeOf,
  personName,
} from './helpers';

const { groupSegments: GROUP_SEGMENTS, navGroups: NAV_GROUPS } = getConsultationConfig();

export default function ConsultationDetailWorkspace({
  caseItem,
  onCaseChange,
}: {
  caseItem: API.Case;
  onCaseChange: (next: API.Case) => void;
}) {
  const { t, tf, enumPretty } = useAppTranslation();
  const copy = t.cases.workspaces.consultation.detail;
  const litCopy = t.cases.workspaces.litigation.detail;
  const actions = t.cases.workspaces.consultation.actions;
  const {
    shellCopy,
    pw,
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
    searchParams,
    setSearchParams,
    toast,
  } = useCaseWorkspaceController({
    caseItem,
    onCaseChange,
    type: 'CONSULTATION',
    groupSegments: GROUP_SEGMENTS,
  });

  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [conversionFormOpen, setConversionFormOpen] = useState(false);
  const [conversionTarget, setConversionTarget] = useState<ConversionTargetType | null>(null);

  const canConvert = canShowConvertToCase(caseItem);
  const converted = getConvertedToCase(caseItem);
  const status = outcomeOf(caseItem);
  const canJoinVideo = consultationCanJoinVideo(caseItem);
  const sessionDatePassed = isConsultationSessionDatePassed(caseItem);
  const videoLink = getCaseData(caseItem, 'video_link') as string | undefined;
  const attorneys = attorneysOf(caseItem);
  const ctype = String(getCaseData(caseItem, 'consultation_type') || '');

  const ctaSummary = {
    ...summary,
    canJoinVideo,
    canConvert,
    sessionDatePassed,
    convertedCase: converted,
    consultationCancelled: status === 'CANCELLED',
    consultationCompleted: status === 'COMPLETED',
  };
  const primary = resolvePrimaryCta('CONSULTATION', ctaSummary, { canEdit, canConvert });
  const primaryLabel = primary ? primaryCtaLabel(primary, shellCopy) : '';

  const showJoinInMore = canJoinVideo && primary?.id !== 'join_video';
  const showConvertInMore = canConvert && primary?.id !== 'convert';
  const showConvertOnSession = canConvert && primary?.id !== 'convert';
  const showOpenCaseInMore = Boolean(converted?.id) && primary?.id !== 'open_case';
  const showCompleteInMore =
    canEdit && !isConsultationTerminal(caseItem) && primary?.id !== 'mark_completed';

  const convertParam = searchParams.get('convert');
  useEffect(() => {
    if (!shouldOpenConvertFromQuery(convertParam, canConvert)) return;
    setTypeSelectorOpen(true);
    setSearchParams((prev) => stripConvertSearchParam(prev), { replace: true });
  }, [canConvert, convertParam, setSearchParams]);

  useEffect(() => {
    const resolved = resolveConsultationHash(window.location.hash);
    if (!resolved.leaf) return;
    setLeaf(resolved.leaf);
    if (resolved.scrollToFollowUps) {
      requestAnimationFrame(() =>
        document.getElementById('follow-ups')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hash / case open
  }, [caseItem.id]);

  const patchOutcome = async (next: 'COMPLETED' | 'CANCELLED') => {
    const existing = (caseItem.case_specific_data as Record<string, unknown>) ?? {};
    try {
      await apiUpdateCase({ id: caseItem.id, case_specific_data: { ...existing, outcome: next } });
      toast({ title: t.common.success });
      await modalRef.current?.refreshDetail();
    } catch {
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };

  const runPrimary = () => {
    if (!primary) return;
    if (primary.id === 'join_video' && videoLink) {
      window.open(videoLink, '_blank', 'noopener,noreferrer');
      return;
    }
    if (primary.id === 'mark_completed') {
      void patchOutcome('COMPLETED');
      return;
    }
    if (primary.id === 'convert') {
      setTypeSelectorOpen(true);
      return;
    }
    if (primary.id === 'open_case' && converted?.id) {
      openRelated(converted.id);
      return;
    }
    if (primary.id === 'add_follow_up') {
      modals.addFollowUp();
      return;
    }
    modals.editCase();
  };

  const sendEmail = () => {
    void apiRetryConsultationEmail(caseItem.id)
      .then(async () => {
        toast({ title: t.cases.modal.consultationWorkflow.emailSent });
        await modalRef.current?.refreshDetail();
      })
      .catch(() => {
        toast({ title: t.cases.modal.consultationWorkflow.emailFailed, variant: 'destructive' });
      });
  };

  const navItems = useMemo(() => {
    const attention = (label: string, count?: number) =>
      count ? tf(shellCopy.navAttention, { label, count }) : label;
    const badgeOf = (key?: 'session' | 'schedule' | 'work' | 'documents') => {
      if (key === 'session') return summary.sessionBadge;
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
        urgent: g.badge === 'schedule' || g.badge === 'session' ? (count ?? 0) > 0 : undefined,
        countAriaLabel: attention(shellCopy.groups[g.labelKey], count),
        footer: g.footer,
      });
    }
    return items;
  }, [shellCopy, showFinance, summary, tf, lastSegmentRef]);

  const segmentOptions = (segmentLeaves ?? []).map((leaf) => ({
    id: leaf,
    label: copy.sections[leaf as keyof typeof copy.sections] ?? leaf,
  }));

  const newItems: HeaderMenuItem[] = [
    { key: 'task', label: copy.addTask, onClick: () => modals.addTask() },
    ...(canEdit
      ? [{ key: 'deadline', label: copy.addDeadline, onClick: () => modals.openDeadline() }]
      : []),
    { key: 'appt', label: copy.addAppointment, onClick: () => modals.addAppointment() },
    ...(canEdit && !isCancelled(caseItem)
      ? [{ key: 'followup', label: actions.addFollowUp, onClick: () => modals.addFollowUp() }]
      : []),
    ...(canEdit
      ? [
          { key: 'doc', label: copy.upload, onClick: () => modals.triggerUpload() },
          {
            key: 'note',
            label: litCopy.editNotes,
            onClick: () => modals.editCase({ focusField: 'notes' }),
          },
        ]
      : []),
  ];

  const moreItems: HeaderMenuItem[] = [
    ...(canEdit
      ? [{ key: 'edit', label: copy.edit, icon: <Pencil className="h-4 w-4" />, onClick: () => modals.editCase() }]
      : []),
    { key: 'email', label: copy.sendEmail, icon: <Mail className="h-4 w-4" />, onClick: sendEmail },
    ...(showJoinInMore && videoLink
      ? [{ key: 'join', label: copy.joinVideo, onClick: () => window.open(videoLink, '_blank', 'noopener,noreferrer') }]
      : []),
    ...(showConvertInMore
      ? [{ key: 'convert', label: actions.convert, onClick: () => setTypeSelectorOpen(true) }]
      : []),
    ...(showOpenCaseInMore && converted
      ? [{ key: 'open-case', label: copy.openCase, onClick: () => openRelated(converted.id) }]
      : []),
    ...(showCompleteInMore
      ? [{ key: 'complete', label: copy.markCompleted, onClick: () => void patchOutcome('COMPLETED') }]
      : []),
    ...(canEdit && !isConsultationTerminal(caseItem)
      ? [{ key: 'cancel', label: copy.cancelConsultation, onClick: () => void patchOutcome('CANCELLED') }]
      : []),
    ...lifecycleMoreItems({ edit: copy.edit, includeEdit: false }),
  ];

  const metaItems: HeaderMetaItem[] = [
    ...(caseItem.client
      ? [{ id: 'client', label: copy.clientLabel, icon: User, value: <CaseClientLabel client={caseItem.client} nameClassName="truncate" /> }]
      : []),
    ...(attorneys[0]
      ? [{ id: 'attorney', label: copy.primaryAttorney, icon: User, value: personName(attorneys[0]) }]
      : []),
  ];

  return (
    <>
      <CaseWorkspaceShell
        header={
          <CaseWorkspaceHeader
            listPath={listPath}
            backLabel={copy.back}
            status={String(status || caseItem.status || '')}
            priorityLabel={ctype ? enumPretty(ctype) : undefined}
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
          <ConsultationOverview
            caseItem={caseItem}
            showFinance={showFinance}
            finance={finance}
            canEdit={canEdit}
            onOpenSection={setLeaf}
            onOpenClient={() => modals.openClient()}
            onOpenCase={openRelated}
            onAddTask={() => modals.addTask()}
            onAddFollowUp={
              canEdit && !isCancelled(caseItem) ? () => modals.addFollowUp() : undefined
            }
            onEditSession={canEdit ? () => modals.editCase() : undefined}
          />
        ) : null}

        {activeLeaf === 'consultation' ? (
          <ConsultationSession
            caseItem={caseItem}
            canEdit={canEdit}
            canConvert={canConvert}
            showConvertAction={showConvertOnSession}
            onOpenCase={openRelated}
            onAddFollowUp={() => modals.addFollowUp()}
            onConvert={() => setTypeSelectorOpen(true)}
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

        {activeLeaf === 'tasks' ? (
          <WorkspaceTasks
            caseItem={caseItem}
            onAdd={() => modals.addTask()}
            onOpen={(id) => modals.openTask(id)}
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

      <ConversionTypeSelector
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onSelectType={(next) => {
          setConversionTarget(next);
          setTypeSelectorOpen(false);
          setConversionFormOpen(true);
        }}
      />
      {conversionTarget != null ? (
        <ConversionForm
          open={conversionFormOpen}
          onOpenChange={(v) => {
            setConversionFormOpen(v);
            if (!v) setConversionTarget(null);
          }}
          consultation={caseItem}
          targetType={conversionTarget}
          onBack={() => {
            setConversionFormOpen(false);
            setConversionTarget(null);
            setTypeSelectorOpen(true);
          }}
          onSuccess={({ newCase }) => {
            setConversionFormOpen(false);
            setConversionTarget(null);
            toast({
              title: tf(t.cases.modal.consultationWorkflow.convertSuccess, {
                reference: newCase.reference || '',
              }),
            });
            void modalRef.current?.refreshDetail();
          }}
        />
      ) : null}
    </>
  );
}
