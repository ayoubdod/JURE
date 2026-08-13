'use client'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Mail, MapPin, Phone, User, X, FileSpreadsheet } from 'lucide-react';
import { apiCreateClient } from '@/services/client/api';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { DialogDescription } from '@radix-ui/react-dialog';
import { PhoneInput } from '../ui/phone-input';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

export interface ClientCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface ClientCreateModalProps {
  onSuccess?: (_: API.Client) => void;
}

const ClientCreateModal = forwardRef<ClientCreateModalRef, ClientCreateModalProps>(({ onSuccess }, ref) => {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const schema = useMemo(() => yup.object({
    first_name: yup.string().required(t.clients.validation.firstNameRequired),
    last_name: yup.string().required(t.clients.validation.lastNameRequired),
    email: yup.string().email(t.validation.invalidEmail).required(t.clients.validation.emailRequired),
    phone: yup.string().required(t.clients.validation.phoneRequired),
    address: yup.string().required(t.clients.validation.addressRequired),
    ice: yup.string().optional(),
    fiscal_if: yup.string().optional(),
  }), [t]);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const mainForm = useForm<API.ClientCreateForm>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.ClientCreateForm>,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      ice: '',
      fiscal_if: '',
    },
  });

  const show = () => {
    mainForm.reset();
    setIsOpen(true);
  };

  const hide = () => {
    if (isLoading) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const handleSubmit = async (data: API.ClientCreateForm) => {
    setIsLoading(true);

    // Normalize payload a bit before sending
    const payload: API.ClientCreateForm = {
      first_name: data.first_name?.trim(),
      last_name: data.last_name?.trim(),
      email: data.email?.trim(),
      phone: data.phone || '',
      address: data.address || '',
      ...(data.ice?.trim() ? { ice: data.ice.trim() } : {}),
      ...(data.fiscal_if?.trim() ? { fiscal_if: data.fiscal_if.trim() } : {}),
    };

    try {
      const res = await apiCreateClient(payload);
      onSuccess?.(res.data);
      hide();
    } catch (err) {
      devError('Error creating client:', err);
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        Object.keys(remoteValidation).forEach((key) => {
          mainForm.setError(key as keyof API.ClientCreateForm, { message: remoteValidation[key] });
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isLoading ? undefined : setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden">
        {/* Header Banner */}
        <div className="relative h-32 bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#64499D] overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}></div>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 end-4 h-9 w-9 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30"
            onClick={hide}
            disabled={isLoading}
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Header Content */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t.clients.modal.createTitle}
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  {t.clients.modal.createDescription}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* IMPORTANT: onSubmit is already correct. */}
        <form onSubmit={mainForm.handleSubmit(handleSubmit)} className="px-8 py-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <User className="w-4 h-4 text-purple-600" />
              {t.clients.modal.personalInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  <span>{t.clients.modal.firstName}</span>
                  <Input
                    {...mainForm.register('first_name')}
                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder={t.clients.modal.firstNamePlaceholder}
                  />
                </label>
                {mainForm.formState.errors.first_name && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.first_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  <span>{t.clients.modal.lastName}</span>
                  <Input
                    {...mainForm.register('last_name')}
                    className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    placeholder={t.clients.modal.lastNamePlaceholder}
                  />
                </label>
                {mainForm.formState.errors.last_name && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.last_name.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <Mail className="w-4 h-4 text-purple-600" />
              {t.clients.modal.contactInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{t.clients.modal.email}</span>
                </label>
                <Input
                  {...mainForm.register('email')}
                  className="pl-0 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={t.clients.modal.emailPlaceholder}
                />
                {mainForm.formState.errors.email && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <span>{t.clients.modal.phoneNumber}</span>
                </label>

                <PhoneInput
                  value={mainForm.watch('phone') || ''}
                  onChange={(value) => mainForm.setValue('phone', value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={t.clients.modal.phonePlaceholder}
                />
                {mainForm.formState.errors.phone && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Other Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <Building2 className="w-4 h-4 text-purple-600" />
              {t.clients.modal.otherInfo}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  <span>{t.clients.modal.address}</span>
                </label>
                <Input
                  {...mainForm.register('address')}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={t.clients.modal.addressPlaceholder}
                />
                {mainForm.formState.errors.address && (
                  <p className="text-red-500 text-xs p-1 pb-0">
                    {mainForm.formState.errors.address.message}
                  </p>
                )}
              </div>


            </div>
          </div>

          {/* B2B — fiscal (Morocco) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              {t.clients.modal.fiscalInfoOptional}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t.clients.modal.ice}</label>
                <Input
                  {...mainForm.register('ice')}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={t.clients.modal.icePlaceholder}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.clients.modal.fiscalIf}</label>
                <Input
                  {...mainForm.register('fiscal_if')}
                  className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  placeholder={t.clients.modal.fiscalIfPlaceholder}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200/90 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={hide}
              disabled={isLoading}
            >
              {t.common.cancel}
            </Button>

            {/* IMPORTANT: make this a submit button */}
            <Button type="submit" variant="default" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

ClientCreateModal.displayName = 'ClientCreateModal';
export default ClientCreateModal;
