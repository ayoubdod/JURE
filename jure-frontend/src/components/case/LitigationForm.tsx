'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import ServerSelect from '@/components/common/ServerSelect';
import TeamMemberMultiSelect from '@/components/calendar/TeamMemberMultiSelect';
import ClientCreateModal, { type ClientCreateModalRef } from '@/components/client/ClientCreateModal';
import { Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import { clientDisplayName } from '@/services/case/caseType';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import { cn } from '@/lib/utils';
import {
  COURT_SPECIALTIES,
  JURISDICTION_LEVELS,
  chambersForJurisdiction,
  isChamberValidForJurisdiction,
  isCourtSpecialty,
  isJurisdictionLevel,
  type CourtSpecialty,
  type JurisdictionLevel,
} from '@/services/case/litigationCourt';
import {
  CREATE_CANCEL_CLASS,
  CREATE_FOOTER_CLASS,
  CREATE_INPUT_CLASS,
  CREATE_SELECT_CLASS,
  CREATE_SERVER_SELECT_CLASS,
  CREATE_SUBMIT_CLASS,
  CREATE_TEXTAREA_CLASS,
  CreateFormSection,
} from '@/components/forms/CreateFormShell';

export type LitigationFormValues = {
  reference: string;
  title: string;
  litigation_type: 'CIVIL' | 'CRIMINAL' | 'COMMERCIAL' | 'ADMINISTRATIVE' | 'LABOR' | 'FAMILY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  client?: number | null;
  client_role?: 'PLAINTIFF' | 'DEFENDANT' | null;
  opposing_party_name?: string;
  opposing_counsel?: string;
  court_name?: string;
  court_specialty: CourtSpecialty;
  jurisdiction?: JurisdictionLevel | '';
  chamber_division?: string;
  city?: string;
  judge_name?: string;
  court_case_number?: string;
  lead_attorney?: number | null;
  filing_date?: string | null;
  first_hearing_date?: string | null;
  next_hearing_date?: string | null;
  statute_of_limitations_date?: string | null;
  description: string;
  legal_arguments?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'CLOSED' | 'ARCHIVED';
  case_type: 'LITIGATION';
  third_parties?: string[];
  key_deadlines?: { label: string; date: string }[];
  co_counsel?: number[];
};

export interface LitigationFormProps {
  initialValues?: Partial<LitigationFormValues>;
  mode: 'create' | 'edit';
  caseId?: number;
  onSubmitSuccess?: (caseItem: API.Case) => void;
  onBack?: () => void;
}

function CourtGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold tracking-wide text-slate-500 dark:text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

const LitigationForm: React.FC<LitigationFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const { t } = useAppTranslation();
  const modal = t.cases.modal;
  const cw = modal.consultationWorkflow;
  const clientModalRef = useRef<ClientCreateModalRef>(null);
  const [createdClient, setCreatedClient] = useState<API.Client | null>(null);

  const [thirdParties, setThirdParties] = useState<string[]>(
    initialValues?.third_parties?.length ? [...initialValues.third_parties] : ['']
  );
  const [keyDeadlines, setKeyDeadlines] = useState<{ label: string; date: string }[]>(
    initialValues?.key_deadlines?.length
      ? [...initialValues.key_deadlines]
      : [{ label: '', date: '' }]
  );
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictQuery, setConflictQuery] = useState('');

  const litigationTypeOptions = useMemo(
    () =>
      (['CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'] as const).map(
        (value) => ({
          value,
          label: modal.options.litigationType[value],
        })
      ),
    [modal.options.litigationType]
  );

  const priorityOptions = useMemo(
    () =>
      (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((value) => ({
        value,
        label: modal.options.priority[value],
      })),
    [modal.options.priority]
  );

  const statusOptions = useMemo(
    () =>
      (['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED'] as const).map((value) => ({
        value,
        label: modal.options.litigationStatus[value],
      })),
    [modal.options.litigationStatus]
  );

  const schema = useMemo(
    () =>
      yup.object({
        reference: yup.string().optional().default(''),
        title: yup.string().required(modal.validation.titleCaseNameRequired),
        litigation_type: yup
          .string()
          .oneOf(['CIVIL', 'CRIMINAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'LABOR', 'FAMILY'])
          .required(),
        priority: yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).required(),
        client: yup
          .number()
          .nullable()
          .optional()
          .transform((_, orig) =>
            orig === '' || orig == null || orig === undefined ? null : Number(orig)
          ),
        client_role: yup.string().oneOf(['PLAINTIFF', 'DEFENDANT']).nullable().optional(),
        opposing_party_name: yup.string().optional(),
        opposing_counsel: yup.string().optional(),
        court_name: yup.string().optional(),
        court_specialty: yup
          .string()
          .oneOf([...COURT_SPECIALTIES])
          .required(modal.validation.courtSpecialtyRequired),
        jurisdiction: yup
          .string()
          .required(modal.validation.jurisdictionRequired)
          .oneOf([...JURISDICTION_LEVELS], modal.validation.jurisdictionRequired),
        chamber_division: yup
          .string()
          .optional()
          .test('chamber-matches-jurisdiction', modal.validation.invalidChamber, function (value) {
            return isChamberValidForJurisdiction(this.parent.jurisdiction, value);
          }),
        city: yup.string().optional(),
        judge_name: yup.string().optional(),
        court_case_number: yup.string().optional(),
        lead_attorney: yup.number().nullable().optional(),
        co_counsel: yup.array().of(yup.number()).optional(),
        filing_date: yup.string().nullable().optional(),
        first_hearing_date: yup.string().nullable().optional(),
        next_hearing_date: yup.string().nullable().optional(),
        statute_of_limitations_date: yup.string().nullable().optional(),
        description: yup.string().required(modal.validation.descriptionFactsRequired),
        legal_arguments: yup.string().optional(),
        status: yup
          .string()
          .oneOf(['OPEN', 'IN_PROGRESS', 'PENDING', 'CLOSED', 'ARCHIVED'])
          .required(),
      }),
    [modal.validation]
  );

  const form = useForm<LitigationFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      reference: initialValues?.reference ?? '',
      title: initialValues?.title ?? '',
      litigation_type: initialValues?.litigation_type ?? 'CIVIL',
      priority: initialValues?.priority ?? 'MEDIUM',
      client: initialValues?.client ?? null,
      client_role: initialValues?.client_role ?? null,
      opposing_party_name: initialValues?.opposing_party_name ?? '',
      opposing_counsel: initialValues?.opposing_counsel ?? '',
      court_name: '',
      court_specialty: isCourtSpecialty(initialValues?.court_specialty)
        ? initialValues.court_specialty
        : 'NORMAL',
      jurisdiction: isJurisdictionLevel(initialValues?.jurisdiction)
        ? initialValues.jurisdiction
        : '',
      chamber_division: initialValues?.chamber_division ?? '',
      city: initialValues?.city ?? '',
      judge_name: initialValues?.judge_name ?? '',
      court_case_number: initialValues?.court_case_number ?? '',
      lead_attorney: initialValues?.lead_attorney ?? null,
      co_counsel: initialValues?.co_counsel ?? [],
      filing_date: initialValues?.filing_date ?? null,
      first_hearing_date: initialValues?.first_hearing_date ?? null,
      next_hearing_date: initialValues?.next_hearing_date ?? null,
      statute_of_limitations_date: initialValues?.statute_of_limitations_date ?? null,
      description: initialValues?.description ?? '',
      legal_arguments: initialValues?.legal_arguments ?? '',
      status: initialValues?.status ?? 'OPEN',
    },
  });

  const { handleCreate, handleUpdate, isLoading } = useCaseForm(
    form.setError as never,
    onSubmitSuccess,
    undefined
  );
  const { toast } = useToast();

  const jurisdiction = form.watch('jurisdiction');
  const leadAttorney = form.watch('lead_attorney');
  const coCounsel = form.watch('co_counsel') ?? [];
  const clientId = form.watch('client');
  const chamberOptions = chambersForJurisdiction(jurisdiction);
  const currentChamber = form.watch('chamber_division') || '';
  const chamberList =
    currentChamber && !chamberOptions.includes(currentChamber)
      ? [...chamberOptions, currentChamber]
      : chamberOptions;

  const chamberLabel = (code: string) => {
    if (jurisdiction === 'FIRST_INSTANCE' && code in modal.options.chamberFirstInstance) {
      return modal.options.chamberFirstInstance[
        code as keyof typeof modal.options.chamberFirstInstance
      ];
    }
    if (jurisdiction === 'APPEAL' && code in modal.options.chamberAppeal) {
      return modal.options.chamberAppeal[code as keyof typeof modal.options.chamberAppeal];
    }
    if (jurisdiction === 'CASSATION' && code in modal.options.chamberCassation) {
      return modal.options.chamberCassation[code as keyof typeof modal.options.chamberCassation];
    }
    return code;
  };

  const addThirdParty = () => setThirdParties((p) => [...p, '']);
  const removeThirdParty = (i: number) =>
    setThirdParties((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : ['']));
  const updateThirdParty = (i: number, v: string) =>
    setThirdParties((p) => {
      const next = [...p];
      next[i] = v;
      return next;
    });

  const addKeyDeadline = () => setKeyDeadlines((d) => [...d, { label: '', date: '' }]);
  const removeKeyDeadline = (i: number) =>
    setKeyDeadlines((d) =>
      d.length > 1 ? d.filter((_, j) => j !== i) : [{ label: '', date: '' }]
    );
  const updateKeyDeadline = (i: number, field: 'label' | 'date', value: string) =>
    setKeyDeadlines((d) => {
      const next = [...d];
      next[i] = { ...next[i], [field]: value };
      return next;
    });

  const handleSubmit = form.handleSubmit(
    (data) => {
      const lead = data.lead_attorney ?? null;
      const extraAttorneys = (data.co_counsel ?? [])
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0 && id !== lead);
      const payload: API.LitigationFormData = {
        case_type: 'LITIGATION',
        reference: mode === 'create' ? '' : data.reference,
        title: data.title,
        litigation_type: data.litigation_type,
        priority: data.priority,
        client: data.client ?? null,
        assigned_to: lead,
        client_role: data.client_role ?? null,
        opposing_party_name: data.opposing_party_name || undefined,
        opposing_counsel: data.opposing_counsel || undefined,
        third_parties: thirdParties.filter((s) => s.trim()).length
          ? thirdParties.filter((s) => s.trim())
          : undefined,
        court_name: undefined,
        court_specialty: data.court_specialty,
        jurisdiction: data.jurisdiction || undefined,
        chamber_division: data.chamber_division || undefined,
        city: data.city || undefined,
        judge_name: data.judge_name || undefined,
        court_case_number: data.court_case_number || undefined,
        lead_attorney: lead,
        co_counsel: extraAttorneys,
        assigned_attorney_ids: extraAttorneys,
        filing_date: data.filing_date || null,
        first_hearing_date: data.first_hearing_date || null,
        next_hearing_date: data.next_hearing_date || null,
        statute_of_limitations_date: data.statute_of_limitations_date || null,
        key_deadlines:
          keyDeadlines.filter((d) => d.label.trim() || d.date).length > 0
            ? keyDeadlines.filter((d) => d.label.trim() || d.date)
            : undefined,
        description: data.description,
        legal_arguments: data.legal_arguments || undefined,
        status: data.status,
      };
      if (mode === 'edit' && caseId) {
        handleUpdate({ ...payload, id: caseId });
      } else {
        handleCreate(payload);
      }
    },
    (errors) => {
      const msg = Object.values(errors)
        .map((e) => e?.message)
        .filter(Boolean)[0];
      toast({
        title: modal.toasts.fixFormTitle,
        description: msg || modal.toasts.fixFormDescription,
        variant: 'destructive',
      });
    }
  );

  const year = new Date().getFullYear();
  const referenceDisplay =
    mode === 'edit' && initialValues?.reference ? initialValues.reference : `L-${year}-••••`;

  const clientLabel = (c: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    client_type?: string;
  }) => clientDisplayName(c) || c.email || c.phone || t.cases.unnamed;

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      noValidate
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
      <div className="space-y-6">
      {(form.formState.errors as { case_specific_data?: { message?: string } }).case_specific_data && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {(form.formState.errors as { case_specific_data?: { message?: string } }).case_specific_data?.message}
        </div>
      )}
      <CreateFormSection index="01" title={modal.sections.basicInfo}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.reference}
            </label>
            <Input value={referenceDisplay} readOnly disabled className={CREATE_INPUT_CLASS} />
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {modal.hints.referenceGenerated}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.titleCaseName} <span className="text-red-500">*</span>
            </label>
            <Input
              {...form.register('title')}
              placeholder={modal.placeholders.caseName}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-xs">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.litigationType} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('litigation_type')}
              onValueChange={(v) =>
                form.setValue('litigation_type', v as LitigationFormValues['litigation_type'])
              }
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {litigationTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.priority} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('priority')}
              onValueChange={(v) => form.setValue('priority', v as LitigationFormValues['priority'])}
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="02" title={modal.sections.parties}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.relatedClient}
            </label>
            <ServerSelect
              link="/clients/clients/"
              value={clientId}
              onChange={(v) => form.setValue('client', v ?? null)}
              labelKey={clientLabel}
              extraOptions={createdClient ? [createdClient] : undefined}
              cleanable
              placeholder={modal.placeholders.client}
              searchPlaceholder={modal.placeholders.client}
              className={CREATE_SERVER_SELECT_CLASS}
            />
            {clientId && createdClient && Number(createdClient.id) === Number(clientId) ? (
              <p className="text-[12px] text-emerald-600 dark:text-emerald-400">
                {clientLabel(createdClient)} · {modal.hints.clientSelected}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className={CREATE_CANCEL_CLASS}
              onClick={() => clientModalRef.current?.show()}
            >
              <Plus className="h-4 w-4" />
              {cw.addClient}
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.clientRole}
            </label>
            <RadioGroup
              value={form.watch('client_role') ?? ''}
              onValueChange={(v) =>
                form.setValue(
                  'client_role',
                  v === '' ? null : (v as LitigationFormValues['client_role'])
                )
              }
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PLAINTIFF" id="client_plaintiff" />
                <Label htmlFor="client_plaintiff">{modal.options.clientRole.PLAINTIFF}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="DEFENDANT" id="client_defendant" />
                <Label htmlFor="client_defendant">{modal.options.clientRole.DEFENDANT}</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.opposingPartyName}
            </label>
            <div className="flex gap-2">
              <Input
                {...form.register('opposing_party_name')}
                placeholder={modal.placeholders.name}
                className={cn(CREATE_INPUT_CLASS, 'flex-1')}
              />
              <Button
                type="button"
                variant="outline"
                className={cn(CREATE_CANCEL_CLASS, 'shrink-0')}
                title={t.dashboard.conflictCheck.runFromMatter}
                onClick={() => {
                  const party = (form.getValues('opposing_party_name') || '').trim();
                  setConflictQuery(party);
                  setConflictOpen(true);
                }}
              >
                <ShieldAlert className="w-4 h-4 mr-1" />
                {t.dashboard.conflictCheck.runFromMatter}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.opposingCounsel}
            </label>
            <Input
              {...form.register('opposing_counsel')}
              placeholder={modal.placeholders.nameOrFirm}
              className={CREATE_INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.thirdParties}
            </label>
            <div className="space-y-2">
              {thirdParties.map((val, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={val}
                    onChange={(e) => updateThirdParty(i, e.target.value)}
                    placeholder={modal.placeholders.thirdPartyName}
                    className={cn(CREATE_INPUT_CLASS, 'flex-1')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeThirdParty(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addThirdParty}>
                <Plus className="w-4 h-4 mr-1" />
                {modal.actions.addRow}
              </Button>
            </div>
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="03" title={modal.sections.courtJurisdiction}>
        <div className="space-y-6">
          <CourtGroup title={modal.sections.courtTribunal}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {modal.fields.courtSpecialty} <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.watch('court_specialty')}
                onValueChange={(v) =>
                  form.setValue('court_specialty', v as CourtSpecialty, { shouldValidate: true })
                }
              >
                <SelectTrigger className={CREATE_SELECT_CLASS}>
                  <SelectValue placeholder={modal.placeholders.selectSpecialty} />
                </SelectTrigger>
                <SelectContent>
                  {COURT_SPECIALTIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {modal.options.courtSpecialty[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.court_specialty && (
                <p className="text-red-500 text-xs">
                  {form.formState.errors.court_specialty.message}
                </p>
              )}
            </div>
          </CourtGroup>

          <CourtGroup title={modal.sections.courtLevel}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modal.fields.jurisdictionLevel} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={jurisdiction || undefined}
                  onValueChange={(v) => {
                    form.setValue('jurisdiction', v as JurisdictionLevel, { shouldValidate: true });
                    form.setValue('chamber_division', '', { shouldValidate: true });
                  }}
                >
                  <SelectTrigger className={CREATE_SELECT_CLASS}>
                    <SelectValue placeholder={modal.placeholders.selectJurisdiction} />
                  </SelectTrigger>
                  <SelectContent>
                    {JURISDICTION_LEVELS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {modal.options.jurisdictionLevel[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.jurisdiction && (
                  <p className="text-red-500 text-xs">{form.formState.errors.jurisdiction.message}</p>
                )}
              </div>
              {isJurisdictionLevel(jurisdiction) ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {modal.fields.chamberDivision}
                  </label>
                  <Select
                    value={currentChamber || undefined}
                    onValueChange={(v) =>
                      form.setValue('chamber_division', v, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className={CREATE_SELECT_CLASS}>
                      <SelectValue placeholder={modal.placeholders.selectChamber} />
                    </SelectTrigger>
                    <SelectContent>
                      {chamberList.map((value) => (
                        <SelectItem key={value} value={value}>
                          {chamberLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.chamber_division && (
                    <p className="text-red-500 text-xs">
                      {form.formState.errors.chamber_division.message}
                    </p>
                  )}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modal.fields.city}
                </label>
                <Input
                  {...form.register('city')}
                  placeholder={modal.placeholders.city}
                  className={CREATE_INPUT_CLASS}
                />
              </div>
            </div>
          </CourtGroup>

          <CourtGroup title={modal.sections.courtJudicial}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modal.fields.judgePresident}
                </label>
                <Input
                  {...form.register('judge_name')}
                  placeholder={modal.placeholders.judge}
                  className={CREATE_INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {modal.fields.courtCaseNumber}
                </label>
                <Input
                  {...form.register('court_case_number')}
                  placeholder={modal.placeholders.number}
                  className={CREATE_INPUT_CLASS}
                />
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  {modal.hints.courtCaseNumberDistinct}
                </p>
              </div>
            </div>
          </CourtGroup>
        </div>
      </CreateFormSection>

      <CreateFormSection index="04" title={modal.sections.assignedTeam}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.leadAttorney}
            </label>
            <ServerSelect
              link="/cabinets/members/select_list"
              value={leadAttorney}
              onChange={(v) => {
                const nextLead = v ? Number(v) : null;
                form.setValue('lead_attorney', nextLead);
                if (nextLead) {
                  form.setValue(
                    'co_counsel',
                    (form.getValues('co_counsel') ?? []).filter((id) => Number(id) !== nextLead)
                  );
                }
              }}
              labelKey={(m: { first_name?: string; last_name?: string; email?: string }) =>
                `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email
              }
              cleanable
              searchPlaceholder={cw.searchAttorneys}
              className={CREATE_SERVER_SELECT_CLASS}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.additionalAttorneys}
            </label>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {modal.hints.additionalAttorneysHint}
            </p>
            <TeamMemberMultiSelect
              value={coCounsel}
              excludeIds={leadAttorney ? [Number(leadAttorney)] : []}
              onChange={(ids) => form.setValue('co_counsel', ids)}
              placeholder={cw.searchAttorneys}
            />
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="05" title={modal.sections.timelineDeadlines}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.filingDate}
            </label>
            <Input type="date" {...form.register('filing_date')} className={CREATE_INPUT_CLASS} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.firstHearingDate}
            </label>
            <Input type="date" {...form.register('first_hearing_date')} className={CREATE_INPUT_CLASS} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.nextHearingDate}
            </label>
            <Input type="date" {...form.register('next_hearing_date')} className={CREATE_INPUT_CLASS} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.statuteOfLimitationsDate}
            </label>
            <Input
              type="date"
              {...form.register('statute_of_limitations_date')}
              className={CREATE_INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.keyDeadlines}
            </label>
            <div className="space-y-2">
              {keyDeadlines.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={item.label}
                    onChange={(e) => updateKeyDeadline(i, 'label', e.target.value)}
                    placeholder={modal.placeholders.label}
                    className={cn(CREATE_INPUT_CLASS, 'flex-1')}
                  />
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => updateKeyDeadline(i, 'date', e.target.value)}
                    className={cn(CREATE_INPUT_CLASS, 'w-[140px]')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeKeyDeadline(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addKeyDeadline}>
                <Plus className="w-4 h-4 mr-1" />
                {modal.actions.addDeadline}
              </Button>
            </div>
          </div>
        </div>
      </CreateFormSection>

      <CreateFormSection index="06" title={modal.sections.caseDetails}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.descriptionFacts} <span className="text-red-500">*</span>
            </label>
            <Textarea
              {...form.register('description')}
              placeholder={modal.placeholders.descriptionFacts}
              className={CREATE_TEXTAREA_CLASS}
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-xs">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.legalArguments}
            </label>
            <Textarea
              {...form.register('legal_arguments')}
              placeholder={modal.placeholders.legalArguments}
              className={CREATE_TEXTAREA_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.status} <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as LitigationFormValues['status'])}
            >
              <SelectTrigger className={CREATE_SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CreateFormSection>
      </div>
      </div>

      <DialogFooter className={cn(CREATE_FOOTER_CLASS, onBack && 'justify-between')}>
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className={CREATE_CANCEL_CLASS}>
            {modal.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={isLoading} className={CREATE_SUBMIT_CLASS}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              {modal.submitting}
            </>
          ) : mode === 'edit' ? (
            modal.updateCase
          ) : (
            modal.createCase
          )}
        </Button>
      </DialogFooter>
    </form>
    <ClientCreateModal
      ref={clientModalRef}
      onSuccess={(client) => {
        setCreatedClient(client);
        form.setValue('client', client.id);
      }}
    />
    <ConflictCheckDialog
      open={conflictOpen}
      onOpenChange={setConflictOpen}
      initialQuery={conflictQuery}
      matterId={mode === 'edit' ? caseId ?? null : null}
      excludeMatterId={mode === 'edit' ? caseId ?? null : null}
    />
    </>
  );
};

export default LitigationForm;
