'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Trash2, X, Coins, Sparkles, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGetCase } from '@/services/case/api';
import { getCaseData, getStatusColor } from '@/utils/caseCardHelpers';
import { useToast } from '@/hooks/use-toast';
import TaskCreateModal, { TaskCreateModalRef } from '@/components/task/TaskCreateModal';
import TaskUpdateModal, { TaskUpdateModalRef } from '@/components/task/TaskUpdateModal';
import ScheduleAppointmentDialog, { ScheduleAppointmentDialogRef } from '@/components/ScheduleAppointmentDialog';
import AppointmentUpdateModal, { AppointmentUpdateModalRef } from '@/components/AppointmentUpdateModal';
import { TaskDetailPanel, AppointmentDetailPanel } from '@/components/calendar/EmbeddedDetailPanels';
import { RelatedTasksAppointmentsSection } from './case-detail-drawer/RelatedTasksAppointmentsSection';
import { eventBus } from '@/utils/eventBus';
import type { Appointment } from '@/services/appointment/api';
import { AdministrativeSection } from './case-detail-drawer/administrative-section';
import { ConsultationSection } from './case-detail-drawer/consultation-section';
import {
  formatDrawerDateTime,
  formatUserDisplayName,
  getCaseUpdatedAtIso,
  getCaseUpdatedByUser,
} from './case-detail-drawer/format';
import { LitigationSection } from './case-detail-drawer/litigation-section';
import { CaseDetailDrawerSkeleton } from './case-detail-drawer/skeleton';
import { CaseTypeSelector, type ConversionTargetType } from './conversion/CaseTypeSelector';
import { ConversionForm } from './conversion/ConversionForm';
import { getConvertedToCase, getConsultationWorkflowStatus } from './conversion/ConvertedCaseLink';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';
import { FinanceTab } from '@/components/case/panel/tabs/FinanceTab';
import { getTVAStatus, isCabinetTvaExonerated, type TVAStatus } from '@/services/financeService';
import { JuriaCasePanel } from '@/components/juria/JuriaCasePanel';
import useJuriaStore from '@/stores/juriaStore';
import { JURIA_ENABLED } from '@/config/features';
import DeadlinesCard from '@/components/dashboard/DeadlinesCard';
import ResearchNotebookCard from '@/components/dashboard/ResearchNotebookCard';
import MatterCloseModal from '@/components/dashboard/MatterCloseModal';
import { useAppTranslation } from '@/i18n';
import { CaseStatus } from '@/utils/constants';
import { useNavigate } from 'react-router';
export interface CaseDetailDrawerRef {
  open: (instance: API.Case) => void;
  close: () => void;
  /** After edit save — refreshes drawer content when the same case is open */
  applyUpdatedCase: (caseItem: API.Case) => void;
}

export interface CaseDetailDrawerProps {
  onEdit?: (instance: API.Case) => void;
  onDelete?: (instance: API.Case) => void;
  /** Mount inside this node so the panel only covers the cases column (not the app header). */
  portalContainer?: HTMLElement | null;
  /** Merge fresh `_counts` / `_related` into the cases list when detail is refetched. */
  onCaseListPatch?: (caseId: number, patch: Partial<API.Case>) => void;
}

function normalizeCaseType(c: API.Case): string {
  const t = c.caseType ?? c.case_type;
  if (t === 'ADMINISTRATIVE' || t === 'ADMINISTRATIVE_DUTY') return 'ADMINISTRATIVE_DUTY';
  return t ?? 'UNKNOWN';
}

function typeLabel(c: API.Case): string {
  const t = normalizeCaseType(c);
  if (t === 'ADMINISTRATIVE_DUTY') return 'ADMINISTRATIVE DUTY';
  return t === 'UNKNOWN' ? 'CASE' : t;
}

function typeAccentClass(c: API.Case): string {
  const t = normalizeCaseType(c);
  if (t === 'LITIGATION') return 'border-l-rose-500';
  if (t === 'CONSULTATION') return 'border-l-indigo-500';
  return 'border-l-amber-400';
}

function rawStatusKey(c: API.Case): string {
  const t = normalizeCaseType(c);
  if (t === 'CONSULTATION') {
    return (
      (getCaseData(c, 'outcome') as string) ?? (getCaseData(c, 'status') as string) ?? c.status
    ) as string;
  }
  return c.status as string;
}

function CaseBody({ c, onOpenCaseById }: { c: API.Case; onOpenCaseById?: (id: number) => void }) {
  const t = normalizeCaseType(c);
  if (t === 'CONSULTATION') return <ConsultationSection c={c} onOpenCaseById={onOpenCaseById} />;
  if (t === 'LITIGATION') return <LitigationSection c={c} onOpenCaseById={onOpenCaseById} />;
  if (t === 'ADMINISTRATIVE_DUTY') return <AdministrativeSection c={c} onOpenCaseById={onOpenCaseById} />;
  return (
    <p className="text-[13px] text-slate-600 dark:text-slate-400">
      No specialized layout for this case type. See raw fields in export if needed.
    </p>
  );
}

function canShowConvertToCase(c: API.Case): boolean {
  if (normalizeCaseType(c) !== 'CONSULTATION') return false;
  const outcome = getConsultationWorkflowStatus(c);
  if (outcome === 'CANCELLED') return false;
  return getConvertedToCase(c) == null;
}

function CaseAuditMeta({ c }: { c: API.Case }) {
  const updatedAt = getCaseUpdatedAtIso(c);
  const updatedBy = getCaseUpdatedByUser(c);
  return (
    <div className="shrink-0 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/30 px-4 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Created
          </p>
          <p className="text-[12px] tabular-nums text-slate-900 dark:text-slate-100">
            {formatDrawerDateTime(c.created)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Created by
          </p>
          <p className="text-[12px] text-slate-900 dark:text-slate-100">{formatUserDisplayName(c.created_by)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Last updated
          </p>
          <p className="text-[12px] tabular-nums text-slate-900 dark:text-slate-100">
            {updatedAt ? formatDrawerDateTime(updatedAt) : '—'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Updated by
          </p>
          <p className="text-[12px] text-slate-900 dark:text-slate-100">{formatUserDisplayName(updatedBy)}</p>
        </div>
      </div>
    </div>
  );
}

const CaseDetailDrawer = forwardRef<CaseDetailDrawerRef, CaseDetailDrawerProps>(
  ({ onEdit, onDelete, portalContainer, onCaseListPatch }, ref) => {
    const [open, setOpen] = useState(false);
    const [fetched, setFetched] = useState<API.Case | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedIdRef = useRef<number | null>(null);
    const [drawerMobile, setDrawerMobile] = useState(false);
    const openRef = useRef(false);
    const { toast } = useToast();
    const { t, enumPretty } = useAppTranslation();
    const navigate = useNavigate();
    const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
    const [conversionFormOpen, setConversionFormOpen] = useState(false);
    const [conversionTarget, setConversionTarget] = useState<ConversionTargetType | null>(null);
    const [matterCloseOpen, setMatterCloseOpen] = useState(false);

    const taskCreateRef = useRef<TaskCreateModalRef>(null);
    const scheduleAppointmentRef = useRef<ScheduleAppointmentDialogRef>(null);
    const taskUpdateRef = useRef<TaskUpdateModalRef>(null);
    const appointmentUpdateRef = useRef<AppointmentUpdateModalRef>(null);
    const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
    const [detailAppointmentId, setDetailAppointmentId] = useState<number | null>(null);
    const [casePanelTab, setCasePanelTab] = useState<'details' | 'finance' | 'juria'>('details');
    const { authorized: showFinanceTab } = useFinanceAccess();
    const [tvaCabinetStatus, setTvaCabinetStatus] = useState<TVAStatus | null>(null);

    useEffect(() => {
      if (!showFinanceTab) {
        setTvaCabinetStatus(null);
        return;
      }
      getTVAStatus().then(setTvaCabinetStatus);
    }, [showFinanceTab]);

    useEffect(() => {
      openRef.current = open;
    }, [open]);

    useEffect(() => {
      const mql = window.matchMedia('(max-width: 640px)');
      const fn = () => setDrawerMobile(mql.matches);
      mql.addEventListener('change', fn);
      fn();
      return () => mql.removeEventListener('change', fn);
    }, []);

    useEffect(() => {
      if (!showFinanceTab && casePanelTab === 'finance') setCasePanelTab('details');
    }, [showFinanceTab, casePanelTab]);

    useEffect(() => {
      if (!JURIA_ENABLED) return;
      if (!open || !fetched) {
        useJuriaStore.getState().setFabCaseContext(null);
        return;
      }
      useJuriaStore.getState().setFabCaseContext({
        id: fetched.id,
        reference: fetched.reference ?? undefined,
        title: fetched.title ?? undefined,
      });
    }, [open, fetched?.id, fetched?.reference, fetched?.title]);

    const patchListFromCase = useCallback(
      (c: API.Case) => {
        const patch: Partial<API.Case> = {};
        if (c._counts !== undefined) patch._counts = c._counts;
        if (c._related !== undefined) patch._related = c._related;
        if (Object.keys(patch).length) onCaseListPatch?.(c.id, patch);
      },
      [onCaseListPatch]
    );

    const refreshCaseDetail = useCallback(() => {
      const id = selectedIdRef.current;
      if (id == null) return;
      apiGetCase(id)
        .then((res) => {
          setFetched(res.data);
          patchListFromCase(res.data);
        })
        .catch(() => {});
    }, [patchListFromCase]);

    const fetchCase = useCallback(
      (id: number) => {
        setLoading(true);
        setError(null);
        apiGetCase(id)
          .then((res) => {
            setFetched(res.data);
            patchListFromCase(res.data);
          })
          .catch(() => {
            setError('Could not load case details.');
            setFetched(null);
          })
          .finally(() => setLoading(false));
      },
      [patchListFromCase]
    );

    const openCaseById = useCallback(
      (id: number) => {
        selectedIdRef.current = id;
        fetchCase(id);
      },
      [fetchCase]
    );

    const fetchCaseSilent = useCallback(
      (id: number) => {
        apiGetCase(id)
          .then((res) => {
            setFetched(res.data);
            patchListFromCase(res.data);
          })
          .catch(() => {
            /* keep existing content */
          });
      },
      [patchListFromCase]
    );

    const closeInternal = useCallback(() => {
      setOpen(false);
      selectedIdRef.current = null;
      setFetched(null);
      setError(null);
      setLoading(false);
      setTypeSelectorOpen(false);
      setConversionFormOpen(false);
      setConversionTarget(null);
      setDetailTaskId(null);
      setDetailAppointmentId(null);
      setCasePanelTab('details');
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        open: (inst: API.Case) => {
          selectedIdRef.current = inst.id;
          setOpen(true);
          setFetched(null);
          setError(null);
          fetchCase(inst.id);
        },
        close: () => closeInternal(),
        applyUpdatedCase: (caseItem: API.Case) => {
          if (selectedIdRef.current === caseItem.id && openRef.current) {
            setFetched(caseItem);
            fetchCaseSilent(caseItem.id);
          }
        },
      }),
      [fetchCase, fetchCaseSilent, closeInternal, patchListFromCase]
    );

    useEffect(() => {
      const bump = () => {
        if (openRef.current && selectedIdRef.current != null) {
          refreshCaseDetail();
        }
      };
      eventBus.on('task-created', bump);
      eventBus.on('appointment-created', bump);
      eventBus.on('task-deleted', bump);
      return () => {
        eventBus.off('task-created', bump);
        eventBus.off('appointment-created', bump);
        eventBus.off('task-deleted', bump);
      };
    }, [refreshCaseDetail]);

    const handleOpenChange = (next: boolean) => {
      if (!next) closeInternal();
    };

    const priority = fetched ? (getCaseData(fetched, 'priority') as string | undefined) : undefined;
    const showPriority = priority === 'HIGH' || priority === 'URGENT';

    const side = drawerMobile ? 'bottom' : 'right';
    const embedded = portalContainer != null;

    return (
      <>
      <Sheet modal={false} open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          container={portalContainer}
          side={side}
          overlayClassName="bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          className={cn(
            'flex flex-col gap-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0 shadow-xl',
            '[&>button]:hidden',
            'data-[state=open]:!duration-[250ms] data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in',
            embedded && '!max-h-full',
            drawerMobile
              ? embedded
                ? 'max-h-[min(92vh,100%)] h-[min(92vh,100%)] w-full max-w-[100vw] rounded-t-2xl border-t sm:max-w-full'
                : 'h-[92vh] max-h-[100dvh] w-full max-w-[100vw] rounded-t-2xl border-t sm:max-w-full'
              : 'h-full w-[min(100%,480px)] max-w-[480px] border-l'
          )}
        >
        {fetched && !loading && !error && (
          <>
            <header
              className={cn(
                'sticky top-0 z-20 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-4 pl-5 border-l-[3px]',
                typeAccentClass(fetched)
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-800 dark:text-slate-200">
                      {enumPretty(fetched.caseType ?? fetched.case_type) || typeLabel(fetched)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
                        getStatusColor(rawStatusKey(fetched))
                      )}
                    >
                      {enumPretty(rawStatusKey(fetched))}
                    </span>
                    {showPriority && (
                      <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/25">
                        {enumPretty(priority)}
                      </span>
                    )}
                  </div>
                  {fetched.reference && (
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{fetched.reference}</p>
                  )}
                  <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2">
                    {fetched.title || fetched.reference || 'Untitled case'}
                  </h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => onDelete(fetched)}
                      aria-label="Delete case"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => closeInternal()}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </header>

            <CaseAuditMeta c={fetched} />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Tabs
                value={casePanelTab}
                onValueChange={(v) => setCasePanelTab(v as 'details' | 'finance' | 'juria')}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="shrink-0 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 px-4 pt-3">
                  <TabsList className="h-10 w-full justify-start rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/60">
                    <TabsTrigger value="details" className="rounded-lg px-4 text-[13px]">
                      Détails
                    </TabsTrigger>
                    {showFinanceTab ?
                      <TabsTrigger value="finance" className="rounded-lg px-4 text-[13px]">
                        <Coins className="mr-1.5 h-4 w-4 opacity-90" aria-hidden />
                        Finance
                        {tvaCabinetStatus && isCabinetTvaExonerated(tvaCabinetStatus) ?
                          <span className="ml-2 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            TVA exonérée
                          </span>
                        : tvaCabinetStatus ?
                          <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                            TVA 20% applicable
                          </span>
                        : null}
                      </TabsTrigger>
                    : null}
                    {JURIA_ENABLED ?
                      <TabsTrigger value="juria" className="rounded-lg px-4 text-[13px] text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="mr-1.5 h-4 w-4 opacity-90" aria-hidden />
                        Juria
                      </TabsTrigger>
                    : null}
                  </TabsList>
                </div>
                <TabsContent
                  value="details"
                  className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 data-[state=inactive]:hidden"
                >
                  <CaseBody c={fetched} onOpenCaseById={openCaseById} />
                  <RelatedTasksAppointmentsSection
                    caseItem={fetched}
                    onAddTask={() => {
                      const refLine = fetched.reference?.trim();
                      const title = fetched.title?.trim();
                      taskCreateRef.current?.show({
                        relatedCaseId: fetched.id,
                        relatedCaseLabel:
                          refLine && title ?
                            `${refLine} — ${title}`
                          : refLine || title || `Case #${fetched.id}`,
                      });
                    }}
                    onScheduleAppointment={() => {
                      const refLine = fetched.reference?.trim();
                      const title = fetched.title?.trim();
                      scheduleAppointmentRef.current?.show({
                        relatedCaseId: fetched.id,
                        relatedCaseLabel:
                          refLine && title ?
                            `${refLine} — ${title}`
                          : refLine || title || `Case #${fetched.id}`,
                      });
                    }}
                    onOpenTask={(taskId) => setDetailTaskId(taskId)}
                    onOpenAppointment={(appointmentId) => setDetailAppointmentId(appointmentId)}
                  />
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Legal deadlines
                    </h3>
                    <DeadlinesCard caseId={fetched.id} />
                  </div>
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Research notebook
                    </h3>
                    <ResearchNotebookCard caseId={fetched.id} />
                  </div>
                </TabsContent>
                {showFinanceTab ?
                  <TabsContent
                    value="finance"
                    className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 data-[state=inactive]:hidden"
                  >
                    {casePanelTab === 'finance' ? <FinanceTab caseId={fetched.id} /> : null}
                  </TabsContent>
                : null}
                {JURIA_ENABLED ?
                  <TabsContent
                    value="juria"
                    className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0 data-[state=inactive]:hidden"
                  >
                    <JuriaCasePanel caseItem={fetched} />
                  </TabsContent>
                : null}
              </Tabs>
            </div>

            <footer className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-4 py-3">
              <div className="flex-1" />
              {canShowConvertToCase(fetched) && (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={() => setTypeSelectorOpen(true)}
                >
                  Convert to Case →
                </Button>
              )}
              {fetched.status !== CaseStatus.CLOSED && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setMatterCloseOpen(true)}
                >
                  <Flag className="mr-1.5 h-3.5 w-3.5" />
                  {t.dashboard.matterClose.confirmClose}
                </Button>
              )}
              {onEdit && (
                <Button type="button" size="sm" className="h-9" onClick={() => onEdit(fetched)}>
                  Edit case
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => closeInternal()}>
                Close
              </Button>
            </footer>

          </>
        )}

        {open && (
          <>
            <CaseTypeSelector
              open={typeSelectorOpen}
              onOpenChange={setTypeSelectorOpen}
              onSelectType={(t) => {
                setConversionTarget(t);
                setTypeSelectorOpen(false);
                setConversionFormOpen(true);
              }}
            />
            {conversionTarget != null && fetched != null && (
              <ConversionForm
                open={conversionFormOpen}
                onOpenChange={(v) => {
                  setConversionFormOpen(v);
                  if (!v) setConversionTarget(null);
                }}
                consultation={fetched}
                targetType={conversionTarget}
                onBack={() => {
                  setConversionFormOpen(false);
                  setConversionTarget(null);
                  setTypeSelectorOpen(true);
                }}
                onSuccess={({ newCase }) => {
                  setConversionFormOpen(false);
                  setConversionTarget(null);
                  setTypeSelectorOpen(false);
                  const refLine = newCase.reference?.trim();
                  toast({
                    title: refLine
                      ? `Case ${refLine} created successfully`
                      : 'Case created successfully',
                  });
                  closeInternal();
                  const nextType = newCase.caseType ?? newCase.case_type;
                  if (nextType === 'LITIGATION') {
                    navigate('/dashboard/cases/litigation');
                  } else if (nextType === 'ADMINISTRATIVE' || nextType === 'ADMINISTRATIVE_DUTY') {
                    navigate('/dashboard/cases/administrative');
                  }
                }}
              />
            )}
            {fetched != null && (
              <MatterCloseModal
                open={matterCloseOpen}
                onOpenChange={setMatterCloseOpen}
                caseId={fetched.id}
                caseLabel={
                  [fetched.reference, fetched.title].filter(Boolean).join(' — ') ||
                  `Case #${fetched.id}`
                }
                onSuccess={(closedCase) => {
                  setFetched(closedCase);
                  patchListFromCase(closedCase);
                }}
              />
            )}
          </>
        )}

        {loading && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-5 w-full max-w-sm animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <CaseDetailDrawerSkeleton />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <p className="text-[13px] text-slate-600 dark:text-slate-400">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => selectedIdRef.current != null && fetchCase(selectedIdRef.current)}
            >
              Retry
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => closeInternal()}>
              Close
            </Button>
          </div>
        )}
        </SheetContent>
      </Sheet>

      <TaskDetailPanel
        taskId={detailTaskId}
        open={detailTaskId != null}
        onOpenChange={(v) => {
          if (!v) setDetailTaskId(null);
        }}
        onEdit={(task) => taskUpdateRef.current?.show(task)}
        portalContainer={portalContainer ?? null}
        onOpenCase={(id) => openCaseById(id)}
        contextCaseId={fetched?.id ?? null}
      />
      <AppointmentDetailPanel
        appointmentId={detailAppointmentId}
        open={detailAppointmentId != null}
        onOpenChange={(v) => {
          if (!v) setDetailAppointmentId(null);
        }}
        onEdit={(a: Appointment) => appointmentUpdateRef.current?.show(a)}
        portalContainer={portalContainer ?? null}
        onOpenCase={(id) => openCaseById(id)}
        contextCaseId={fetched?.id ?? null}
      />

      <TaskCreateModal ref={taskCreateRef} />
      <ScheduleAppointmentDialog ref={scheduleAppointmentRef} />
      <TaskUpdateModal ref={taskUpdateRef} onSuccess={refreshCaseDetail} />
      <AppointmentUpdateModal ref={appointmentUpdateRef} onSuccess={refreshCaseDetail} />
      </>
    );
  }
);

CaseDetailDrawer.displayName = 'CaseDetailDrawer';

export default CaseDetailDrawer;
