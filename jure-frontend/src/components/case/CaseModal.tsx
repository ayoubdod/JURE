'use client';

import React, { forwardRef, useImperativeHandle, useState, useCallback, useId } from 'react';
import { FileText, Pencil } from 'lucide-react';
import CaseTypeSelector, { CaseTypeChoice } from './CaseTypeSelector';
import ConsultationForm, { type ConsultationFormValues } from './ConsultationForm';
import LitigationForm, { type LitigationFormValues } from './LitigationForm';
import AdministrativeDutyForm, {
  type AdministrativeDutyFormValues,
} from './AdministrativeDutyForm';
import { splitLegacyJurisdiction, isCourtSpecialty } from '@/services/case/litigationCourt';
import { useAppTranslation } from '@/i18n';
import { CreateFormDialog } from '@/components/forms/CreateFormShell';

export interface CaseModalShowOptions {
  createType?: 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';
  followUpOf?: API.Case;
}

export interface CaseModalRef {
  show: (instance?: API.Case, options?: CaseModalShowOptions) => void;
  hide: () => void;
}

export interface CaseModalProps {
  onSuccess?: (caseItem: API.Case) => void;
}

/** Get case_specific_data or legacy top-level fields */
function getCaseData(c: API.Case, key: string): unknown {
  const csd = c.case_specific_data as Record<string, unknown> | undefined;
  const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  if (csd && camelKey in csd) return csd[camelKey];
  return (c as Record<string, unknown>)[key];
}

/** Map API.Case to form initial values - reads from case_specific_data (camelCase) or legacy */
function durationFromStored(c: API.Case): Pick<ConsultationFormValues, 'duration' | 'custom_hours' | 'custom_minutes'> {
  const stored = getCaseData(c, 'duration') as ConsultationFormValues['duration'] | undefined;
  if (stored && (['15min', '30min', '1h', '2h', 'CUSTOM'] as const).includes(stored)) {
    const hours = Number(getCaseData(c, 'custom_hours') ?? 0);
    const mins = Number(getCaseData(c, 'custom_minutes') ?? 0);
    return { duration: stored, custom_hours: hours, custom_minutes: mins };
  }
  const minutes = Number(getCaseData(c, 'duration_minutes') ?? 0);
  if (minutes === 15) return { duration: '15min' };
  if (minutes === 30) return { duration: '30min' };
  if (minutes === 60) return { duration: '1h' };
  if (minutes === 120) return { duration: '2h' };
  if (minutes > 0) {
    return {
      duration: 'CUSTOM',
      custom_hours: Math.floor(minutes / 60),
      custom_minutes: minutes % 60,
    };
  }
  return { duration: '1h' };
}

function caseToConsultationInitial(c: API.Case): Partial<ConsultationFormValues> {
  const cd = getCaseData(c, 'consultation_date') as string | undefined;
  const consultationDateFormatted = cd ? new Date(cd).toISOString().slice(0, 16) : '';
  const durationFields = durationFromStored(c);
  return {
    reference: c.reference,
    title: c.title,
    client: c.client?.id ?? null,
    assigned_to: (c as API.Case & { assigned_to?: API.User }).assigned_to?.id ?? null,
    consultation_type:
      ((getCaseData(c, 'consultation_type') as string) === 'PREVENTIVE' ||
      (getCaseData(c, 'consultation_type') as string) === 'REACTIVE'
        ? (getCaseData(c, 'consultation_type') as ConsultationFormValues['consultation_type'])
        : 'PREVENTIVE'),
    consultation_date: consultationDateFormatted,
    ...durationFields,
    format: (getCaseData(c, 'format') as ConsultationFormValues['format']) ?? 'IN_PERSON',
    address: (getCaseData(c, 'address') as string) ?? '',
    city: (getCaseData(c, 'city') as string) ?? '',
    address_instructions: (getCaseData(c, 'address_instructions') as string) ?? '',
    phone_number: (getCaseData(c, 'phone_number') as string) ?? '',
    video_link: (getCaseData(c, 'video_link') as string) ?? '',
    legal_domain: (getCaseData(c, 'legal_domain') as ConsultationFormValues['legal_domain']) ?? 'OTHER',
    custom_legal_domain: (getCaseData(c, 'custom_legal_domain') as string) ?? '',
    legal_question: (getCaseData(c, 'legal_question') as string) ?? '',
    facts_context: (getCaseData(c, 'facts_context') as string) ?? '',
    status: (['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const).includes(
      ((getCaseData(c, 'outcome') as string) ?? (getCaseData(c, 'status') as string)) as ConsultationFormValues['status']
    )
      ? (((getCaseData(c, 'outcome') as string) ??
          (getCaseData(c, 'status') as string)) as ConsultationFormValues['status'])
      : 'SCHEDULED',
    advice_summary: (getCaseData(c, 'advice_summary') as string) ?? '',
    assigned_attorney_ids: Array.isArray(c.assigned_attorneys)
      ? c.assigned_attorneys.map((u) => u.id).filter(Boolean)
      : [],
  };
}

function parseIdList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'number') return item;
      if (typeof item === 'string' && Number.isFinite(Number(item))) return Number(item);
      if (item && typeof item === 'object') {
        const rec = item as { id?: number; userId?: number };
        const val = rec.id ?? rec.userId;
        return val != null ? Number(val) : NaN;
      }
      return NaN;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
}

function caseToLitigationInitial(c: API.Case): Partial<LitigationFormValues> {
  const storedJurisdiction = (getCaseData(c, 'jurisdiction') as string) ?? '';
  const storedCity = (getCaseData(c, 'city') as string) ?? '';
  const { jurisdiction, city } = splitLegacyJurisdiction(storedJurisdiction, storedCity);
  const leadId = (c as API.Case & { assigned_to?: API.User }).assigned_to?.id ?? null;
  const fromCsd = parseIdList(getCaseData(c, 'co_counsel'));
  const fromM2M = Array.isArray(c.assigned_attorneys)
    ? c.assigned_attorneys.map((u) => u.id).filter(Boolean)
    : [];
  const coCounsel = [...new Set([...fromCsd, ...fromM2M])].filter((id) => id !== leadId);
  const specialty = getCaseData(c, 'court_specialty');
  return {
    reference: c.reference,
    title: c.title,
    client: c.client?.id ?? null,
    litigation_type: (getCaseData(c, 'litigation_type') as LitigationFormValues['litigation_type']) ?? 'CIVIL',
    priority: (getCaseData(c, 'priority') as LitigationFormValues['priority']) ?? 'MEDIUM',
    client_role: (getCaseData(c, 'client_role') as LitigationFormValues['client_role']) ?? null,
    opposing_party_name: (getCaseData(c, 'opposing_party') as string) ?? (getCaseData(c, 'opposing_party_name') as string) ?? '',
    opposing_counsel: (getCaseData(c, 'opposing_counsel') as string) ?? '',
    third_parties: (getCaseData(c, 'third_parties') as string[]) ?? [],
    court_name: (getCaseData(c, 'court_name') as string) ?? c.court ?? '',
    court_specialty: isCourtSpecialty(specialty) ? specialty : 'NORMAL',
    jurisdiction,
    chamber_division: (getCaseData(c, 'chamber') as string) ?? (getCaseData(c, 'chamber_division') as string) ?? '',
    city,
    judge_name: (getCaseData(c, 'judge_name') as string) ?? '',
    court_case_number: (getCaseData(c, 'court_case_number') as string) ?? '',
    lead_attorney: leadId,
    co_counsel: coCounsel,
    filing_date: (getCaseData(c, 'filing_date') as string | null) ?? null,
    first_hearing_date: (getCaseData(c, 'first_hearing_date') as string | null) ?? null,
    next_hearing_date: (getCaseData(c, 'next_hearing_date') as string | null) ?? null,
    statute_of_limitations_date: (getCaseData(c, 'statute_of_limitations_date') as string | null) ?? null,
    key_deadlines: (getCaseData(c, 'key_deadlines') as { label: string; date: string }[]) ?? [],
    description: c.description ?? '',
    legal_arguments: (getCaseData(c, 'legal_arguments') as string) ?? '',
    status: c.status as LitigationFormValues['status'],
  };
}

function caseToAdministrativeDutyInitial(c: API.Case): Partial<AdministrativeDutyFormValues> {
  return {
    reference: c.reference,
    title: c.title,
    client: c.client?.id ?? null,
    assigned_to: (c as API.Case & { assigned_to?: API.User }).assigned_to?.id ?? null,
    duty_type: (getCaseData(c, 'duty_type') as AdministrativeDutyFormValues['duty_type']) ?? 'OTHER',
    priority: (getCaseData(c, 'priority') as AdministrativeDutyFormValues['priority']) ?? 'MEDIUM',
    description: c.description ?? '',
    institution_authority: (getCaseData(c, 'institution') as string) ?? (getCaseData(c, 'institution_authority') as string) ?? '',
    institution_reference_number: ((c.case_specific_data as Record<string, unknown>)?.institutionRefNumber as string) ?? (getCaseData(c, 'institution_reference_number') as string) ?? '',
    start_date: (getCaseData(c, 'start_date') as string) ?? '',
    due_date: (getCaseData(c, 'due_date') as string) ?? '',
    completion_date: (getCaseData(c, 'completion_date') as string | null) ?? null,
    required_documents: (getCaseData(c, 'required_documents') as { label: string; completed: boolean }[]) ?? [],
    status: (getCaseData(c, 'status') as AdministrativeDutyFormValues['status']) ?? (c.status as AdministrativeDutyFormValues['status']) ?? 'PENDING',
  };
}

const CaseModal = forwardRef<CaseModalRef, CaseModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const formId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [caseType, setCaseType] = useState<CaseTypeChoice | null>(null);
  const [editingCase, setEditingCase] = useState<API.Case | null>(null);
  const [lockCreateType, setLockCreateType] = useState<CaseModalShowOptions['createType']>(undefined);
  const [followUpOf, setFollowUpOf] = useState<API.Case | null>(null);

  const hide = useCallback(() => {
    setIsOpen(false);
    setStep('type');
    setCaseType(null);
    setEditingCase(null);
    setLockCreateType(undefined);
    setFollowUpOf(null);
  }, []);

  const show = useCallback((instance?: API.Case, options?: CaseModalShowOptions) => {
    setIsOpen(true);
    if (options?.followUpOf) {
      setFollowUpOf(options.followUpOf);
      setLockCreateType('CONSULTATION');
      setCaseType('CONSULTATION');
      setStep('form');
      setEditingCase(null);
      return;
    }
    setFollowUpOf(null);
    const resolvedType = instance?.caseType ?? instance?.case_type;
    if (instance && resolvedType) {
      setLockCreateType(undefined);
      setCaseType(resolvedType === 'ADMINISTRATIVE' ? 'ADMINISTRATIVE_DUTY' : resolvedType);
      setStep('form');
      setEditingCase(instance);
      return;
    }
    if (options?.createType) {
      setLockCreateType(options.createType);
      setCaseType(
        options.createType === 'ADMINISTRATIVE' ? 'ADMINISTRATIVE_DUTY' : options.createType
      );
      setStep('form');
      setEditingCase(null);
      return;
    }
    setLockCreateType(undefined);
    setStep('type');
    setCaseType(null);
    setEditingCase(null);
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleTypeSelect = (type: CaseTypeChoice) => {
    setCaseType(type);
    setStep('form');
  };

  const handleBack = () => {
    setStep('type');
    setCaseType(null);
  };

  const handleSuccess = useCallback(
    (caseItem: API.Case) => {
      onSuccess?.(caseItem);
      hide();
    },
    [onSuccess, hide]
  );

  const formDescription =
    caseType === 'CONSULTATION'
      ? t.cases.modal.consultationDetails
      : caseType === 'LITIGATION'
        ? t.cases.modal.litigationDetails
        : t.cases.modal.adminDetails;

  const dialogTitle = editingCase
    ? t.cases.modal.editTitle
    : followUpOf
      ? t.cases.modal.consultationWorkflow.addFollowUp
      : caseType === 'CONSULTATION' || lockCreateType === 'CONSULTATION'
        ? t.cases.workspaces.consultation.createTitle
        : lockCreateType === 'LITIGATION'
          ? t.cases.workspaces.litigation.createTitle
          : lockCreateType === 'ADMINISTRATIVE'
            ? t.cases.workspaces.administrative.createTitle
            : t.cases.modal.createTitle;

  return (
    <CreateFormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) hide();
      }}
      isBusy={false}
      formId={formId}
      title={dialogTitle}
      description={step === 'type' ? t.cases.modal.chooseType : formDescription}
      icon={editingCase ? Pencil : FileText}
      closeLabel={t.common.close}
      onClose={hide}
      contentClassName={
        step === 'type'
          ? 'h-auto max-h-[min(92dvh,640px)] md:h-auto md:w-[min(92vw,640px)] md:max-w-[640px]'
          : 'md:h-[min(86vh,780px)] md:w-[min(90vw,820px)] md:max-w-[820px]'
      }
    >
      {step === 'type' && (
        <div className="px-6 py-5 md:px-7">
          <CaseTypeSelector onSelect={handleTypeSelect} />
        </div>
      )}

      {step === 'form' && caseType === 'CONSULTATION' && (
        <ConsultationForm
          mode={editingCase ? 'edit' : followUpOf ? 'follow-up' : 'create'}
          caseId={editingCase?.id}
          parentConsultation={followUpOf}
          initialValues={
            editingCase
              ? caseToConsultationInitial(editingCase)
              : followUpOf
                ? {
                    ...caseToConsultationInitial(followUpOf),
                    reference: undefined,
                    consultation_date: '',
                    status: 'SCHEDULED',
                  }
                : undefined
          }
          onSubmitSuccess={handleSuccess}
          onBack={!editingCase && !lockCreateType ? handleBack : undefined}
        />
      )}

      {step === 'form' && caseType === 'LITIGATION' && (
        <LitigationForm
          mode={editingCase ? 'edit' : 'create'}
          caseId={editingCase?.id}
          initialValues={editingCase ? caseToLitigationInitial(editingCase) : undefined}
          onSubmitSuccess={handleSuccess}
          onBack={!editingCase && !lockCreateType ? handleBack : undefined}
        />
      )}

      {step === 'form' && caseType === 'ADMINISTRATIVE_DUTY' && (
        <AdministrativeDutyForm
          mode={editingCase ? 'edit' : 'create'}
          caseId={editingCase?.id}
          initialValues={editingCase ? caseToAdministrativeDutyInitial(editingCase) : undefined}
          onSubmitSuccess={handleSuccess}
          onBack={!editingCase && !lockCreateType ? handleBack : undefined}
        />
      )}
    </CreateFormDialog>
  );
});

CaseModal.displayName = 'CaseModal';

export default CaseModal;
