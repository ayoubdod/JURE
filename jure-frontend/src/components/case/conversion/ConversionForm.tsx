'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Scale, X } from 'lucide-react';
import { getCaseData } from '@/utils/caseCardHelpers';
import { em } from '@/components/case/case-detail-drawer/format';
import { useConvertCase } from '@/hooks/useConvertCase';
import { LitigationConversionFields, defaultLitigationConversionState, type LitigationConversionState } from './LitigationConversionFields';
import {
  AdministrativeConversionFields,
  defaultAdministrativeConversionState,
  type AdministrativeConversionState,
} from './AdministrativeConversionFields';
import type { ConversionTargetType } from './CaseTypeSelector';

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
    const clientName = client
      ? [client.first_name, client.last_name].filter(Boolean).join(' ') || em(client.email)
      : '—';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] flex max-h-[min(92vh,900px)] w-[min(100vw-1.5rem,720px)] max-w-[720px] flex-col gap-0 overflow-hidden border-slate-200 p-0 sm:rounded-xl [&>button]:hidden">
        {/* Same gradient charter as CaseModal / CaseCreateModal */}
        <div className="relative h-32 shrink-0 overflow-hidden bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B]">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-4 top-4 z-10 h-9 w-9 border border-white/30 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative px-8 pb-6 pt-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-sm">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">Convert Consultation to Case</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/90">
                  New case type: {titleSuffix}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Copied from consultation — read only
              </h3>
              <div className="mt-2 space-y-3 rounded-lg border border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <ReadRow label="Title" value={inherited.title} />
                <ReadRow label="Client" value={inherited.clientName} />
                <ReadRow label="Assigned To" value={inherited.assignedName} />
                <ReadRow label="Description" value={inherited.description} multiline />
                <ReadRow label="Summary / Notes" value={inherited.summary} multiline />
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Complete the new case information
              </h3>
              <div className="mt-3">
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
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50/90 px-8 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-start sm:justify-between">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onBack}>
            ← Back
          </Button>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-[#64499D] text-white shadow-md hover:bg-[#5a3f8a] hover:shadow-lg sm:flex-none"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Case'
                )}
              </Button>
            </div>
            {submitError && (
              <p className="w-full text-center text-[13px] text-red-600 sm:text-right">{submitError}</p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
