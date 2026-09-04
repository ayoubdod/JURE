'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { clientDisplayName } from '@/services/case/caseType';
import { em } from '@/components/case/case-detail-drawer/format';
import { useConvertCase } from '@/hooks/useConvertCase';
import { LitigationConversionFields, defaultLitigationConversionState, type LitigationConversionState } from './LitigationConversionFields';
import {
  AdministrativeConversionFields,
  defaultAdministrativeConversionState,
  type AdministrativeConversionState,
} from './AdministrativeConversionFields';
import type { ConversionTargetType } from './CaseTypeSelector';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_SUBMIT_CLASS,
  CreateFormDialog,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';
import { cn } from '@/lib/utils';

function validDateInput(s: string): boolean {
  if (!s.trim()) return true;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function validateLitigation(lit: LitigationConversionState): Record<string, string> {
  const err: Record<string, string> = {};
  const dk = [
    'filing_date',
    'first_hearing_date',
    'next_hearing_date',
    'statute_of_limitations_date',
  ] as const;
  for (const k of dk) {
    const v = lit[k];
    if (typeof v === 'string' && v.trim() && !validDateInput(v)) {
      err[k] = 'Invalid date';
    }
  }
  for (const row of lit.key_deadlines) {
    const l = row.label.trim();
    const d = row.date.trim();
    if ((l && !d) || (!l && d)) {
      err.key_deadlines = 'Each deadline needs both a label and a date, or remove the row.';
      break;
    }
  }
  return err;
}

function validateAdministrative(a: AdministrativeConversionState): Record<string, string> {
  const err: Record<string, string> = {};
  if (a.start_date.trim() && !validDateInput(a.start_date)) err.start_date = 'Invalid date';
  if (a.due_date.trim() && !validDateInput(a.due_date)) err.due_date = 'Invalid date';
  return err;
}

function buildLitigationPayload(lit: LitigationConversionState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    targetType: 'LITIGATION',
    litigation_type: lit.litigation_type,
    priority: lit.priority,
    status: lit.status,
  };
  const addStr = (key: string, val: string) => {
    const t = val.trim();
    if (t) out[key] = t;
  };
  if (lit.client_role === 'PLAINTIFF' || lit.client_role === 'DEFENDANT') {
    out.client_role = lit.client_role;
  }
  addStr('opposing_party_name', lit.opposing_party);
  addStr('opposing_counsel', lit.opposing_counsel);
  addStr('court_name', lit.court_name);
  addStr('jurisdiction', lit.jurisdiction);
  addStr('chamber_division', lit.chamber);
  addStr('judge_name', lit.judge_name);
  addStr('court_case_number', lit.court_case_number);
  addStr('legal_arguments', lit.legal_arguments);

  const dates: [string, string][] = [
    ['filing_date', lit.filing_date],
    ['first_hearing_date', lit.first_hearing_date],
    ['next_hearing_date', lit.next_hearing_date],
    ['statute_of_limitations_date', lit.statute_of_limitations_date],
  ];
  for (const [k, v] of dates) {
    if (v.trim()) out[k] = v;
  }

  const co = lit.co_counsel_slots.filter((x): x is number => x != null && !Number.isNaN(Number(x)));
  if (co.length) out.co_counsel = co;

  const kds = lit.key_deadlines
    .filter((r) => r.label.trim() && r.date.trim())
    .map((r) => ({ label: r.label.trim(), date: r.date.trim() }));
  if (kds.length) out.key_deadlines = kds;

  return out;
}

function buildAdministrativePayload(a: AdministrativeConversionState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    targetType: 'ADMINISTRATIVE',
    duty_type: a.duty_type,
    priority: a.priority,
    status: a.status,
  };
  const addStr = (key: string, val: string) => {
    const t = val.trim();
    if (t) out[key] = t;
  };
  addStr('institution_authority', a.institution);
  addStr('institution_reference_number', a.institution_reference_number);
  if (a.start_date.trim()) out.start_date = a.start_date.trim();
  if (a.due_date.trim()) out.due_date = a.due_date.trim();
  const docs = a.required_documents
    .filter((r) => r.label.trim())
    .map((r) => ({ label: r.label.trim(), completed: r.completed }));
  if (docs.length) out.required_documents = docs;
  return out;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: API.Case;
  targetType: ConversionTargetType;
  onBack: () => void;
  onSuccess: (result: { newCase: API.Case; originalConsultation?: API.Case }) => void;
};

export function ConversionForm({
  open,
  onOpenChange,
  consultation,
  targetType,
  onBack,
  onSuccess,
}: Props) {
  const [lit, setLit] = useState<LitigationConversionState>(defaultLitigationConversionState);
  const [adm, setAdm] = useState<AdministrativeConversionState>(defaultAdministrativeConversionState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { convert, loading, submitError, clearError } = useConvertCase();

  useEffect(() => {
    if (open) {
      setLit(defaultLitigationConversionState());
      setAdm(defaultAdministrativeConversionState());
      setFieldErrors({});
      clearError();
    }
  }, [open, consultation.id, targetType, clearError]);

  const mergeLit = useCallback((next: Partial<LitigationConversionState>) => {
    setLit((prev) => ({ ...prev, ...next }));
  }, []);

  const mergeAdm = useCallback((next: Partial<AdministrativeConversionState>) => {
    setAdm((prev) => ({ ...prev, ...next }));
  }, []);

  const inherited = useMemo(() => {
    const legalQuestion = getCaseData(consultation, 'legal_question') as string | undefined;
    const adviceSummary = getCaseData(consultation, 'advice_summary') as string | undefined;
    const client = consultation.client;
    const clientName = clientDisplayName(client) || em(client?.email) || '—';
    const assigned = consultation.assigned_to;
    const assignedName = assigned
      ? `${assigned.first_name ?? ''} ${assigned.last_name ?? ''}`.trim() || em(assigned.email)
      : '—';
    return {
      title: consultation.title?.trim() || '—',
      clientName,
      assignedName,
      description: legalQuestion?.trim() ? legalQuestion : '—',
      summary: adviceSummary?.trim() ? adviceSummary : '—',
    };
  }, [consultation]);

  const handleCreate = async () => {
    clearError();
    if (targetType === 'LITIGATION') {
      const ve = validateLitigation(lit);
      setFieldErrors(ve);
      if (Object.keys(ve).length) return;
      const body = buildLitigationPayload(lit);
      const created = await convert(consultation.id, body);
      if (created) onSuccess(created);
    } else {
      const ve = validateAdministrative(adm);
      setFieldErrors(ve);
      if (Object.keys(ve).length) return;
      const body = buildAdministrativePayload(adm);
      const created = await convert(consultation.id, body);
      if (created) onSuccess(created);
    }
  };

  const titleSuffix =
    targetType === 'LITIGATION' ? 'Litigation' : 'Administrative duty';
  const formId = useId();
  const isBusy = loading;

  return (
    <CreateFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isBusy={isBusy}
      formId={formId}
      title="Convert Consultation to Case"
      description={`New case type: ${titleSuffix}`}
      icon={FileText}
      closeLabel="Close"
      onClose={() => onOpenChange(false)}
      overlayClassName="z-[100]"
      contentClassName="z-[110] md:h-[min(86vh,780px)] md:w-[min(90vw,820px)] md:max-w-[820px]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
        <div className="space-y-6">
          <CreateFormSection index="01" title="Copied from consultation — read only">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <ReadRow label="Title" value={inherited.title} />
              <ReadRow label="Client" value={inherited.clientName} />
              <ReadRow label="Assigned To" value={inherited.assignedName} />
              <ReadRow label="Description" value={inherited.description} multiline />
              <ReadRow label="Summary / Notes" value={inherited.summary} multiline />
            </div>
          </CreateFormSection>

          <CreateFormSection index="02" title="Complete the new case information">
            {targetType === 'LITIGATION' ? (
              <LitigationConversionFields
                values={lit}
                onChange={mergeLit}
                fieldErrors={fieldErrors}
              />
            ) : (
              <AdministrativeConversionFields
                values={adm}
                onChange={mergeAdm}
                fieldErrors={fieldErrors}
              />
            )}
          </CreateFormSection>
        </div>
      </div>

      <DialogFooter className={cn(CREATE_FOOTER_CLASS, 'justify-between')}>
        <Button type="button" variant="outline" onClick={onBack} disabled={isBusy} className={CREATE_CANCEL_CLASS}>
          ← Back
        </Button>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
            className={CREATE_CANCEL_CLASS}
          >
            Cancel
          </Button>
          <Button type="button" className={CREATE_SUBMIT_CLASS} onClick={handleCreate} disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2 className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Case'
            )}
          </Button>
        </div>
      </DialogFooter>
      {submitError ? (
        <p className="px-6 pb-3 text-end text-[13px] text-red-600 md:px-7">{submitError}</p>
      ) : null}
    </CreateFormDialog>
  );
}

function ReadRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[13px] text-slate-800 dark:text-slate-200 ${
          multiline ? 'whitespace-pre-wrap' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
