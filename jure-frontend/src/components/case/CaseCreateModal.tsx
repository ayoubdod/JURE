'use client'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Info, Loader2, Scale, X } from 'lucide-react';
import { apiCreateCase } from '@/services/case/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CaseCategory, CaseStatus } from '@/utils/constants';
import { DialogDescription } from '@radix-ui/react-dialog';
import ServerSelect from '../common/ServerSelect';
import { Textarea } from '../ui/textarea';
import { useAppTranslation } from '@/i18n';

export interface CaseCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface CaseCreateModalProps {
  onSuccess?: (_: API.Case) => void;
}

const CaseCreateModal = forwardRef<CaseCreateModalRef, CaseCreateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const schema = useMemo(() => yup.object({
    category: yup.string().required(t.cases.modal.validation.categoryRequired),
    status: yup.string().required(t.cases.modal.validation.statusRequired),
    summary: yup.string().optional().default(''),
    description: yup.string().required(t.cases.modal.validation.descriptionRequired),
    reference: yup.string().required(t.cases.modal.validation.referenceRequired),
    title: yup.string().required(t.cases.modal.validation.titleRequired),
    court: yup.string().required(t.cases.modal.validation.courtRequired),
    assigned_to: yup.number().nullable().optional(),
    client: yup.number().nullable().optional(),
  }), [t]);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const mainForm = useForm<API.CaseCreateForm>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.CaseCreateForm>
  });

  const show = () => {
    setIsOpen(true);
    mainForm.reset();
  }

  const hide = () => {
    setIsOpen(false);
    mainForm.reset();
  }

  useImperativeHandle(ref, () => ({
    show,
    hide,
  }));

  const handleSubmit = async (data: API.CaseCreateForm) => {
    setIsLoading(true);
    await apiCreateCase(data)
      .then((res) => {
        onSuccess?.(res.data);
        hide();
      })
      .catch((err) => {
        if (isAxiosError(err)) {
          const remoteValidation = getRemoteFieldsValidation(err);
          Object.keys(remoteValidation).forEach((key) => {
            mainForm.setError(key as keyof API.CaseCreateForm,  { type: 'server', message: remoteValidation[key] });
          });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#64499D] via-[#4ECDC4] to-[#FF6B6B] overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t.cases.modal.createTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {t.cases.modal.createDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-2 border-b border-gray-100">
              <FileText className="w-4 h-4 text-purple-600" />
              <span>{t.cases.modal.sections.basicInformation}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.reference} *
                </label>
                <Input 
                  {...mainForm.register('reference')}
                  placeholder={t.cases.modal.placeholders.reference}
                  className="h-10"
                />
                {mainForm.formState.errors.reference && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.reference.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.title} *
                </label>
                <Input 
                  {...mainForm.register('title')} 
                  placeholder={t.cases.modal.placeholders.title}
                  className="h-10"
                />
                {mainForm.formState.errors.title && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.title.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.court} *
                </label>
                <Input
                  {...mainForm.register('court')}
                  placeholder={t.cases.modal.placeholders.court}
                  className="h-10"
                />
                {mainForm.formState.errors.court && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.court.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.category} *
                </label>
                <Select
                  value={mainForm.watch('category')}
                  onValueChange={(val: API.CaseCategory) => mainForm.setValue('category', val)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t.cases.modal.placeholders.category} />
                  </SelectTrigger>
                  <SelectContent>
                    {CaseCategory.options.map((category, index) => (
                      <SelectItem key={index} value={category.value}>
                        {t.enums.caseCategory[category.value] ?? category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.category && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t.cases.modal.fields.description} *
              </label>
              <Textarea 
                {...mainForm.register('description')} 
                placeholder={t.cases.modal.placeholders.description}
                className="min-h-[80px] resize-none"
              />
              {mainForm.formState.errors.description && (
                <p className="text-red-500 text-xs">
                  {mainForm.formState.errors.description.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-2 border-b border-gray-100">
              <Info className="w-4 h-4 text-purple-600" />
              <span>{t.cases.modal.sections.caseDetails}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.status} *
                </label>
                <Select 
                  value={mainForm.watch('status')} 
                  onValueChange={(val: API.CaseStatus) => mainForm.setValue('status', val)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t.cases.modal.placeholders.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {CaseStatus.options.map((status, index) => (
                      <SelectItem key={index} value={status.value}>
                        {t.enums.caseStatus[status.value] ?? status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mainForm.formState.errors.status && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.assignedTo}{' '}
                  <span className="text-slate-400 text-xs">({t.common.optional})</span>
                </label>
                <ServerSelect
                  link='/cabinets/members/select_list'
                  value={mainForm.watch('assigned_to')}
                  onChange={(val) => mainForm.setValue('assigned_to', val ? Number(val) : null)}
                  labelKey={'email'}
                  cleanable
                />
                {mainForm.formState.errors.assigned_to && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.assigned_to.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t.cases.modal.fields.relatedClient} ({t.common.optional})
                </label>
                <ServerSelect
                  link='/clients/clients/'
                  value={mainForm.watch('client')}
                  onChange={(val) => mainForm.setValue('client', val)}
                  labelKey={(client: any) => `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email || t.cases.unnamed}
                  cleanable
                  placeholder={t.cases.modal.placeholders.client}
                />
                {mainForm.formState.errors.client && (
                  <p className="text-red-500 text-xs">
                    {mainForm.formState.errors.client.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t.cases.modal.fields.summary}
              </label>
              <Input 
                {...mainForm.register('summary')} 
                placeholder={t.cases.modal.placeholders.summary}
                className="h-10"
              />
              {mainForm.formState.errors.summary && (
                <p className="text-red-500 text-xs">
                  {mainForm.formState.errors.summary.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t.cases.modal.creating}
                </>
              ) : (
                t.cases.modal.createCase
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CaseCreateModal.displayName = 'CaseCreateModal';

export default CaseCreateModal;
