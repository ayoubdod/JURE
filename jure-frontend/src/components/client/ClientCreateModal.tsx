'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Building2, Check, Loader2, Mail, MapPin, User, X } from 'lucide-react';
import { apiCreateClient } from '@/services/client/api';
import * as yup from 'yup';
import { Resolver, useForm, type UseFormRegisterReturn, type UseFormReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
import {
  CLIENT_INPUT_CLASS,
  CLIENT_PHONE_CLASS,
  ClientField,
  ClientFormSection,
  ClientTypeOption,
  digitsOnly,
} from './ClientFormLayout';

export interface ClientCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface ClientCreateModalProps {
  onSuccess?: (_: API.Client) => void;
  onClose?: () => void;
}

const DEFAULT_VALUES: API.ClientCreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  ice: '',
  fiscal_if: '',
  client_type: 'INDIVIDUAL',
};

const ClientCreateModal = forwardRef<ClientCreateModalRef, ClientCreateModalProps>(
  ({ onSuccess, onClose }, ref) => {
    const { t } = useAppTranslation();
    const { toast } = useToast();
    const formId = useId();
    const firstFieldRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
    const isBusy = submitPhase !== 'idle';

    const schema = useMemo(
      () =>
        yup.object({
          client_type: yup.string().oneOf(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
          first_name: yup.string().when('client_type', {
            is: 'COMPANY',
            then: (s) =>
              s.trim().required(t.clients.validation.contactPersonRequired).min(2, t.clients.validation.firstNameMin),
            otherwise: (s) =>
              s.trim().required(t.clients.validation.firstNameRequired).min(2, t.clients.validation.firstNameMin),
          }),
          last_name: yup.string().when('client_type', {
            is: 'COMPANY',
            then: (s) =>
              s.trim().required(t.clients.validation.companyNameRequired).min(2, t.clients.validation.lastNameMin),
            otherwise: (s) =>
              s.trim().required(t.clients.validation.lastNameRequired).min(2, t.clients.validation.lastNameMin),
          }),
          email: yup.string().trim().required(t.clients.validation.emailRequired).email(t.clients.validation.invalidEmail),
          phone: yup
            .string()
            .required(t.clients.validation.phoneRequired)
            .test('phone', t.clients.validation.invalidPhone, (value) => {
              if (!value) return false;
              try {
                return isValidPhoneNumber(value);
              } catch {
                return false;
              }
            }),
          address: yup.string().trim().required(t.clients.validation.addressRequired),
          ice: yup
            .string()
            .optional()
            .test('ice', t.clients.validation.invalidIce, (value) => {
              const digits = digitsOnly(value);
              return !digits || digits.length === 15;
            }),
          fiscal_if: yup
            .string()
            .optional()
            .test('fiscal_if', t.clients.validation.invalidIf, (value) => {
              const digits = digitsOnly(value);
              return !digits || digits.length === 8;
            }),
        }),
      [t]
    );

    const schemaRef = useRef(schema);
    schemaRef.current = schema;

    const mainForm = useForm<API.ClientCreateForm>({
      resolver: ((values, context, options) =>
        yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.ClientCreateForm>,
      defaultValues: DEFAULT_VALUES,
    });

    const clientType = mainForm.watch('client_type') || 'INDIVIDUAL';
    const isCompany = clientType === 'COMPANY';

    const resetLocalState = () => {
      mainForm.reset(DEFAULT_VALUES);
      setSubmitPhase('idle');
      scrollRef.current?.scrollTo({ top: 0 });
    };

    const show = () => {
      resetLocalState();
      setIsOpen(true);
    };

    const hide = () => {
      if (isBusy) return;
      setIsOpen(false);
      onClose?.();
    };

    useImperativeHandle(ref, () => ({ show, hide }));

    useEffect(() => {
      if (!isOpen) return;
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }, [isOpen, isCompany]);

    const fieldError = (name: keyof API.ClientCreateForm) =>
      mainForm.formState.errors[name]?.message as string | undefined;

    const applyRemoteErrors = (err: unknown) => {
      if (!isAxiosError(err)) return;
      const remoteValidation = getRemoteFieldsValidation(err);
      const mapped: Partial<Record<keyof API.ClientCreateForm, string>> = {};
      Object.entries(remoteValidation).forEach(([key, message]) => {
        const clean = typeof message === 'string' ? message.replace(/^"|"$/g, '') : message;
        if (!clean) return;
        if (key === 'if' || key === 'if_number') {
          mapped.fiscal_if = clean;
          return;
        }
        mapped[key as keyof API.ClientCreateForm] = clean;
      });
      (Object.keys(mapped) as (keyof API.ClientCreateForm)[]).forEach((key) => {
        mainForm.setError(key, { message: mapped[key] });
      });
      const first = Object.keys(mapped)[0] as keyof API.ClientCreateForm | undefined;
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
    };

    const handleSubmit = async (data: API.ClientCreateForm) => {
      setSubmitPhase('loading');
      const ice = digitsOnly(data.ice);
      const fiscalIf = digitsOnly(data.fiscal_if);
      const payload: API.ClientCreateForm = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim(),
        phone: data.phone || '',
        address: data.address.trim(),
        client_type: data.client_type || 'INDIVIDUAL',
        ...(ice ? { ice } : {}),
        ...(fiscalIf ? { fiscal_if: fiscalIf } : {}),
      };

      try {
        const res = await apiCreateClient(payload);
        setSubmitPhase('success');
        toast({
          title: t.clients.modal.createdTitle,
          description: t.clients.modal.createdDescription,
        });
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        onSuccess?.(res.data);
        setIsOpen(false);
        onClose?.();
        setSubmitPhase('idle');
      } catch (err) {
        setSubmitPhase('idle');
        devError('Error creating client:', err);
        applyRemoteErrors(err);
        if (!isAxiosError(err)) {
          toast({
            title: t.clients.modal.toastErrorTitle,
            description: t.clients.modal.toastErrorDescription,
            variant: 'destructive',
          });
        }
      }
    };

    const onInvalid = () => {
      const order: (keyof API.ClientCreateForm)[] = isCompany
        ? ['last_name', 'first_name', 'email', 'phone', 'address', 'ice', 'fiscal_if']
        : ['first_name', 'last_name', 'email', 'phone', 'address', 'ice', 'fiscal_if'];
      const first = order.find((key) => mainForm.formState.errors[key]);
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
    };

    const firstNameRegister = mainForm.register('first_name');
    const lastNameRegister = mainForm.register('last_name');

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (isBusy) return;
          if (!open) {
            setIsOpen(false);
            onClose?.();
            return;
          }
          setIsOpen(true);
        }}
        modal
      >
        <DialogPortal>
          <DialogOverlay className="bg-slate-950/50" />
          <DialogPrimitive.Content
            aria-describedby={`${formId}-description`}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              firstFieldRef.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (isBusy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (isBusy) event.preventDefault();
            }}
            className={cn(
              'fixed z-50 flex min-h-0 flex-col overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl outline-none',
              'dark:border-zinc-800 dark:bg-zinc-950',
              'inset-x-0 bottom-0 top-auto h-[min(92dvh,820px)] w-full translate-x-0 translate-y-0 rounded-t-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(86vh,740px)] md:w-[min(92vw,680px)] md:max-w-[680px]',
              'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px]',
              'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
              'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
              'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]'
            )}
          >
            <header className="relative shrink-0 border-b border-[#64499D]/10 bg-[#F7F4FF] px-5 py-4 pe-14 dark:border-[#8B6FD1]/15 dark:bg-[#24183F]/80 md:px-6">
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(100,73,157,0.08) 0%, rgba(100,73,157,0.02) 52%, transparent 100%)',
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-3 top-3 z-10 h-8 w-8 rounded-full text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                onClick={hide}
                disabled={isBusy}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#64499D] shadow-sm ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                  <User className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                    {t.clients.modal.createTitle}
                  </DialogTitle>
                  <DialogDescription
                    id={`${formId}-description`}
                    className="mt-1 text-[13px] leading-snug text-slate-500 dark:text-zinc-400"
                  >
                    {t.clients.modal.createDescription}
                  </DialogDescription>
                </div>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={mainForm.handleSubmit(handleSubmit, onInvalid)}
              noValidate
              aria-busy={isBusy}
            >
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 md:px-6"
              >
                <ClientProfileFields
                  formId={formId}
                  t={t}
                  isCompany={isCompany}
                  isBusy={isBusy}
                  fieldError={fieldError}
                  mainForm={mainForm}
                  firstFieldRef={firstFieldRef}
                  firstNameRegister={firstNameRegister}
                  lastNameRegister={lastNameRegister}
                />
              </div>

              <DialogFooter className="shrink-0 flex-row items-center justify-between gap-2.5 space-x-0 border-t border-slate-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-950 sm:space-x-0 md:px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={hide}
                  disabled={isBusy}
                  className="h-10 border-slate-200 px-4 dark:border-zinc-700"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={isBusy}
                  className="h-10 min-w-[148px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680]"
                >
                  {submitPhase === 'loading' ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t.clients.modal.creating}
                    </>
                  ) : submitPhase === 'success' ? (
                    <>
                      <Check className="me-2 h-4 w-4" />
                      {t.clients.modal.createdTitle}
                    </>
                  ) : (
                    t.clients.modal.createClient
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }
);

ClientCreateModal.displayName = 'ClientCreateModal';
export default ClientCreateModal;

export function ClientProfileFields({
  formId,
  t,
  isCompany,
  isBusy,
  fieldError,
  mainForm,
  firstFieldRef,
  firstNameRegister,
  lastNameRegister,
}: {
  formId: string;
  t: ReturnType<typeof useAppTranslation>['t'];
  isCompany: boolean;
  isBusy: boolean;
  fieldError: (name: keyof API.ClientCreateForm) => string | undefined;
  mainForm: UseFormReturn<API.ClientCreateForm>;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  firstNameRegister: UseFormRegisterReturn;
  lastNameRegister: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-6">
      <ClientFormSection icon={User} title={t.clients.modal.identitySection} hint={t.clients.modal.identityHint}>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700 dark:text-zinc-300">
              {t.clients.modal.clientType}
            </p>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label={t.clients.modal.clientType}
              onKeyDown={(event) => {
                if (
                  event.key !== 'ArrowRight' &&
                  event.key !== 'ArrowLeft' &&
                  event.key !== 'ArrowUp' &&
                  event.key !== 'ArrowDown'
                ) {
                  return;
                }
                event.preventDefault();
                mainForm.setValue('client_type', isCompany ? 'INDIVIDUAL' : 'COMPANY', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            >
              <ClientTypeOption
                selected={!isCompany}
                disabled={isBusy}
                icon={User}
                label={t.clients.modal.individual}
                onSelect={() =>
                  mainForm.setValue('client_type', 'INDIVIDUAL', { shouldDirty: true, shouldValidate: true })
                }
              />
              <ClientTypeOption
                selected={isCompany}
                disabled={isBusy}
                icon={Building2}
                label={t.clients.modal.business}
                onSelect={() =>
                  mainForm.setValue('client_type', 'COMPANY', { shouldDirty: true, shouldValidate: true })
                }
              />
            </div>
          </div>

          {isCompany ? (
            <div className="grid grid-cols-1 gap-4">
              <ClientField
                id={`${formId}-last_name`}
                label={t.clients.modal.companyName}
                required
                error={fieldError('last_name')}
              >
                <Input
                  id={`${formId}-last_name`}
                  autoComplete="organization"
                  placeholder={t.clients.modal.companyNamePlaceholder}
                  className={CLIENT_INPUT_CLASS}
                  disabled={isBusy}
                  aria-invalid={!!fieldError('last_name')}
                  {...lastNameRegister}
                  ref={(el) => {
                    firstFieldRef.current = el;
                    lastNameRegister.ref(el);
                  }}
                />
              </ClientField>
              <ClientField
                id={`${formId}-first_name`}
                label={t.clients.modal.contactPerson}
                required
                error={fieldError('first_name')}
              >
                <Input
                  id={`${formId}-first_name`}
                  autoComplete="given-name"
                  placeholder={t.clients.modal.contactPersonPlaceholder}
                  className={CLIENT_INPUT_CLASS}
                  disabled={isBusy}
                  aria-invalid={!!fieldError('first_name')}
                  {...firstNameRegister}
                />
              </ClientField>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ClientField
                id={`${formId}-first_name`}
                label={t.clients.modal.firstName}
                required
                error={fieldError('first_name')}
              >
                <Input
                  id={`${formId}-first_name`}
                  autoComplete="given-name"
                  placeholder={t.clients.modal.firstNamePlaceholder}
                  className={CLIENT_INPUT_CLASS}
                  disabled={isBusy}
                  aria-invalid={!!fieldError('first_name')}
                  {...firstNameRegister}
                  ref={(el) => {
                    firstFieldRef.current = el;
                    firstNameRegister.ref(el);
                  }}
                />
              </ClientField>
              <ClientField
                id={`${formId}-last_name`}
                label={t.clients.modal.lastName}
                required
                error={fieldError('last_name')}
              >
                <Input
                  id={`${formId}-last_name`}
                  autoComplete="family-name"
                  placeholder={t.clients.modal.lastNamePlaceholder}
                  className={CLIENT_INPUT_CLASS}
                  disabled={isBusy}
                  aria-invalid={!!fieldError('last_name')}
                  {...lastNameRegister}
                />
              </ClientField>
            </div>
          )}
        </div>
      </ClientFormSection>

      <ClientFormSection icon={Mail} title={t.clients.modal.contactInfo} hint={t.clients.modal.contactHint}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClientField
            id={`${formId}-email`}
            label={t.clients.modal.email}
            required
            error={fieldError('email')}
          >
            <Input
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t.clients.modal.emailPlaceholder}
              className={CLIENT_INPUT_CLASS}
              disabled={isBusy}
              aria-invalid={!!fieldError('email')}
              {...mainForm.register('email')}
            />
          </ClientField>
          <ClientField
            id={`${formId}-phone`}
            label={t.clients.modal.phoneNumber}
            required
            error={fieldError('phone')}
          >
            <PhoneInput
              id={`${formId}-phone`}
              defaultCountry="MA"
              value={mainForm.watch('phone') || ''}
              disabled={isBusy}
              placeholder={t.clients.modal.phonePlaceholder}
              className={CLIENT_PHONE_CLASS}
              onChange={(value) =>
                mainForm.setValue('phone', value, { shouldValidate: true, shouldDirty: true })
              }
            />
          </ClientField>
        </div>
      </ClientFormSection>

      <ClientFormSection icon={MapPin} title={t.clients.modal.addressInfo} hint={t.clients.modal.addressHint}>
        <ClientField
          id={`${formId}-address`}
          label={t.clients.modal.address}
          required
          error={fieldError('address')}
        >
          <Input
            id={`${formId}-address`}
            autoComplete="street-address"
            placeholder={t.clients.modal.addressPlaceholder}
            className={CLIENT_INPUT_CLASS}
            disabled={isBusy}
            aria-invalid={!!fieldError('address')}
            {...mainForm.register('address')}
          />
        </ClientField>
      </ClientFormSection>

      <ClientFormSection icon={Building2} title={t.clients.modal.professionalInfo} badge={t.common.optional}>
        <div
          className={cn(
            'rounded-xl border p-4 transition-colors duration-200',
            isCompany
              ? 'border-[#64499D]/15 bg-[#F7F4FF]/70 dark:border-[#8B6FD1]/20 dark:bg-[#64499D]/10'
              : 'border-dashed border-slate-200 bg-slate-50/70 dark:border-zinc-800 dark:bg-zinc-900/40'
          )}
        >
          <p className="mb-3 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">
            {t.clients.modal.professionalUseHint}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ClientField
              id={`${formId}-ice`}
              label={t.clients.modal.ice}
              hint={t.clients.modal.iceHint}
              error={fieldError('ice')}
            >
              <Input
                id={`${formId}-ice`}
                inputMode="numeric"
                autoComplete="off"
                placeholder={t.clients.modal.icePlaceholder}
                className={CLIENT_INPUT_CLASS}
                disabled={isBusy}
                aria-invalid={!!fieldError('ice')}
                {...mainForm.register('ice')}
              />
            </ClientField>
            <ClientField
              id={`${formId}-fiscal_if`}
              label={t.clients.modal.fiscalIf}
              hint={t.clients.modal.fiscalIfHint}
              error={fieldError('fiscal_if')}
            >
              <Input
                id={`${formId}-fiscal_if`}
                inputMode="numeric"
                autoComplete="off"
                placeholder={t.clients.modal.fiscalIfPlaceholder}
                className={CLIENT_INPUT_CLASS}
                disabled={isBusy}
                aria-invalid={!!fieldError('fiscal_if')}
                {...mainForm.register('fiscal_if')}
              />
            </ClientField>
          </div>
        </div>
      </ClientFormSection>
    </div>
  );
}
