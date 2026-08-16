'use client';

import React, { useMemo, useState } from 'react';
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
import { Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useCaseForm } from '@/hooks/useCaseForm';
import { useToast } from '@/hooks/use-toast';
import { useAppTranslation } from '@/i18n';
import ConflictCheckDialog from '@/components/dashboard/ConflictCheckDialog';
import { cn } from '@/lib/utils';
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
  court_name: string;
  jurisdiction?: string;
  chamber_division?: string;
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

const LitigationForm: React.FC<LitigationFormProps> = ({
  initialValues,
  mode,
  caseId,
  onSubmitSuccess,
  onBack,
}) => {
  const { t } = useAppTranslation();
  const modal = t.cases.modal;

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
        court_name: yup.string().required(modal.validation.courtNameRequired),
        jurisdiction: yup.string().optional(),
        chamber_division: yup.string().optional(),
        judge_name: yup.string().optional(),
        court_case_number: yup.string().optional(),
        lead_attorney: yup.number().nullable().optional(),
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
      court_name: initialValues?.court_name ?? '',
      jurisdiction: initialValues?.jurisdiction ?? '',
      chamber_division: initialValues?.chamber_division ?? '',
      judge_name: initialValues?.judge_name ?? '',
      court_case_number: initialValues?.court_case_number ?? '',
      lead_attorney: initialValues?.lead_attorney ?? null,
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
      const payload: API.LitigationFormData = {
        case_type: 'LITIGATION',
        reference: data.reference,
        title: data.title,
        litigation_type: data.litigation_type,
        priority: data.priority,
        client: data.client ?? null,
        assigned_to: data.lead_attorney ?? null,
        client_role: data.client_role ?? null,
        opposing_party_name: data.opposing_party_name || undefined,
        opposing_counsel: data.opposing_counsel || undefined,
        third_parties: thirdParties.filter((s) => s.trim()).length
          ? thirdParties.filter((s) => s.trim())
          : undefined,
        court_name: data.court_name,
        jurisdiction: data.jurisdiction || undefined,
        chamber_division: data.chamber_division || undefined,
        judge_name: data.judge_name || undefined,
        court_case_number: data.court_case_number || undefined,
        lead_attorney: data.lead_attorney ?? null,
        co_counsel: form.watch('co_counsel') ?? [],
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

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      noValidate
    >
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7">
      <div className="space-y-6">
      {form.formState.errors.case_specific_data && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {form.formState.errors.case_specific_data.message}
        </div>
      )}
      <CreateFormSection index="01" title={modal.sections.basicInfo}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.reference} <span className="text-red-500">*</span>
            </label>
            <Input
              {...form.register('reference')}
              placeholder={modal.placeholders.reference}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.reference && (
              <p className="text-red-500 text-xs">{form.formState.errors.reference.message}</p>
            )}
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
              {modal.fields.priority}
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
              value={form.watch('client')}
              onChange={(v) => form.setValue('client', v ?? null)}
              labelKey={(c: { first_name?: string; last_name?: string; email?: string }) =>
                `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || t.cases.unnamed
              }
              cleanable
              placeholder={modal.placeholders.client}
              className={CREATE_SERVER_SELECT_CLASS}
            />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.courtName} <span className="text-red-500">*</span>
            </label>
            <Input
              {...form.register('court_name')}
              placeholder={modal.placeholders.court}
              className={CREATE_INPUT_CLASS}
            />
            {form.formState.errors.court_name && (
              <p className="text-red-500 text-xs">{form.formState.errors.court_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.jurisdictionCity}
            </label>
            <Input
              {...form.register('jurisdiction')}
              placeholder={modal.placeholders.city}
              className={CREATE_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.chamberDivision}
            </label>
            <Input
              {...form.register('chamber_division')}
              placeholder={modal.placeholders.division}
              className={CREATE_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.judgeName}
            </label>
            <Input
              {...form.register('judge_name')}
              placeholder={modal.placeholders.judge}
              className={CREATE_INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.courtCaseNumber}
            </label>
            <Input
              {...form.register('court_case_number')}
              placeholder={modal.placeholders.number}
              className={CREATE_INPUT_CLASS}
            />
          </div>
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
              value={form.watch('lead_attorney')}
              onChange={(v) => form.setValue('lead_attorney', v ? Number(v) : null)}
              labelKey="email"
              cleanable
              className={CREATE_SERVER_SELECT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {modal.fields.coCounsel}{' '}
              <span className="text-slate-400 text-xs">{modal.hints.coCounselMulti}</span>
            </label>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {modal.hints.coCounselHint}
            </p>
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
              {modal.fields.status}
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
