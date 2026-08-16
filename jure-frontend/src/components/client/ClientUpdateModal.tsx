'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
import { Building2, Check, Loader2, User, X } from 'lucide-react';
import { apiUpdateClient } from '@/services/client/api';
import * as yup from 'yup';
import { Resolver, useForm, type UseFormReturn } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { devError } from '@/utils/devLog';
import { digitsOnly } from './ClientFormLayout';
import { ClientProfileFields } from './ClientCreateModal';

export interface ClientUpdateModalRef {
  show: (instance: API.Client) => void;
  hide: () => void;
}

export interface ClientUpdateModalProps {
  onSuccess?: (_: API.Client) => void;
  readOnly?: boolean;
}

const ClientUpdateModal = forwardRef<ClientUpdateModalRef, ClientUpdateModalProps>(
  ({ onSuccess, readOnly = false }, ref) => {
    const { t } = useAppTranslation();
    const { toast } = useToast();
    const formId = useId();
    const firstFieldRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [instance, setInstance] = useState<API.Client | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');

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

    const mainForm = useForm<API.ClientUpdateForm>({
      resolver: ((values, context, options) =>
        yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<API.ClientUpdateForm>,
    });

    const clientType = mainForm.watch('client_type') || 'INDIVIDUAL';
    const isCompany = clientType === 'COMPANY';

    const valuesFromClient = (inst: API.Client): API.ClientUpdateForm => {
      const apiIf = (inst as API.Client & { if?: string | null }).if;
      return {
        id: inst.id,
        first_name: inst.first_name || '',
        last_name: inst.last_name || '',
        email: inst.email || '',
        phone: inst.phone || '',
        address: inst.address || '',
        ice: inst.ice ?? '',
        fiscal_if: inst.fiscal_if ?? apiIf ?? '',
        client_type: inst.client_type === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL',
      };
    };

    const show = (inst: API.Client) => {
      setInstance(inst);
      setSubmitPhase('idle');
      mainForm.reset(valuesFromClient(inst));
      scrollRef.current?.scrollTo({ top: 0 });
      setIsOpen(true);
    };

    const hide = () => {
      if (submitPhase === 'loading') return;
      setIsOpen(false);
      mainForm.reset();
      setInstance(null);
    };

    useImperativeHandle(ref, () => ({ show, hide }), [submitPhase]);

    useEffect(() => {
      if (!isOpen) return;
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }, [isOpen, isCompany]);

    const fieldError = (name: keyof API.ClientCreateForm) =>
      mainForm.formState.errors[name as keyof API.ClientUpdateForm]?.message as string | undefined;

    const applyRemoteErrors = (err: unknown) => {
      if (!isAxiosError(err)) return;
      const errorData = err.response?.data;
      if (errorData?.email && Array.isArray(errorData.email)) {
        const emailError = errorData.email[0];
        if (typeof emailError === 'string' && emailError.toLowerCase().includes('already')) {
          mainForm.setError('email', { message: t.clients.validation.emailDuplicate });
        } else if (emailError) {
          mainForm.setError('email', { message: emailError });
        }
      }
      if (errorData?.phone && Array.isArray(errorData.phone)) {
        const phoneError = errorData.phone[0];
        if (typeof phoneError === 'string' && phoneError.toLowerCase().includes('already')) {
          mainForm.setError('phone', { message: t.clients.validation.phoneDuplicate });
        } else if (phoneError) {
          mainForm.setError('phone', { message: phoneError });
        }
      }

      const remoteValidation = getRemoteFieldsValidation(err);
      Object.entries(remoteValidation).forEach(([key, message]) => {
        const clean = typeof message === 'string' ? message.replace(/^"|"$/g, '') : message;
        if (!clean) return;
        const field =
          key === 'if' || key === 'if_number' ? 'fiscal_if' : (key as keyof API.ClientUpdateForm);
        if (!mainForm.formState.errors[field]) {
          mainForm.setError(field, { message: clean });
        }
      });

      const first = (['first_name', 'last_name', 'email', 'phone', 'address', 'ice', 'fiscal_if'] as const).find(
        (key) => mainForm.formState.errors[key]
      );
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
    };

    const handleSubmit = async (data: API.ClientUpdateForm) => {
      if (!instance || readOnly) return;
      setSubmitPhase('loading');

      const ice = digitsOnly(data.ice);
      const fiscalIf = digitsOnly(data.fiscal_if);
      const apiIf = (instance as API.Client & { if?: string | null }).if;
      const prevIf = digitsOnly(instance.fiscal_if ?? apiIf ?? '');
      const prevIce = digitsOnly(instance.ice);
      const nextType = data.client_type || 'INDIVIDUAL';
      const prevType = instance.client_type === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL';

      const hasChanges =
        data.first_name.trim() !== (instance.first_name || '') ||
        data.last_name.trim() !== (instance.last_name || '') ||
        data.email.trim() !== (instance.email || '') ||
        (data.phone || '') !== (instance.phone || '') ||
        (data.address || '').trim() !== (instance.address || '') ||
        ice !== prevIce ||
        fiscalIf !== prevIf ||
        nextType !== prevType;

      if (!hasChanges) {
        hide();
        setSubmitPhase('idle');
        return;
      }

      try {
        const res = await apiUpdateClient({
          id: instance.id,
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          email: data.email.trim(),
          phone: data.phone || '',
          address: (data.address || '').trim(),
          ice,
          fiscal_if: fiscalIf,
          client_type: nextType,
        });
        setSubmitPhase('success');
        toast({
          title: t.clients.modal.updatedTitle,
          description: t.clients.modal.updatedDescription,
        });
        await new Promise((resolve) => window.setTimeout(resolve, 220));
        onSuccess?.(res.data);
        setIsOpen(false);
        setSubmitPhase('idle');
      } catch (err) {
        setSubmitPhase('idle');
        if (isAxiosError(err)) {
          devError('Error updating client:', err.response?.data);
          applyRemoteErrors(err);
        } else {
          toast({
            title: t.clients.modal.toastErrorTitle,
            description: t.clients.modal.toastErrorDescription,
            variant: 'destructive',
          });
        }
      }
    };

    const onInvalid = () => {
      const order: (keyof API.ClientUpdateForm)[] = isCompany
        ? ['last_name', 'first_name', 'email', 'phone', 'address', 'ice', 'fiscal_if']
        : ['first_name', 'last_name', 'email', 'phone', 'address', 'ice', 'fiscal_if'];
      const first = order.find((key) => mainForm.formState.errors[key]);
      if (first) document.getElementById(`${formId}-${first}`)?.focus();
    };

    const firstNameRegister = mainForm.register('first_name');
    const lastNameRegister = mainForm.register('last_name');
    const fieldsBusy = submitPhase !== 'idle' || readOnly;

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (submitPhase === 'loading') return;
          if (!open) {
            hide();
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
              if (submitPhase === 'loading') event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (submitPhase === 'loading') event.preventDefault();
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
                disabled={submitPhase === 'loading'}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#64499D] shadow-sm ring-1 ring-[#64499D]/15 dark:bg-zinc-900 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/25">
                  {isCompany ? <Building2 className="h-4 w-4" aria-hidden /> : <User className="h-4 w-4" aria-hidden />}
                </div>
                <div className="min-w-0 pt-0.5">
                  <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                    {t.clients.modal.updateTitle}
                  </DialogTitle>
                  <DialogDescription
                    id={`${formId}-description`}
                    className="mt-1 text-[13px] leading-snug text-slate-500 dark:text-zinc-400"
                  >
                    {t.clients.modal.updateDescription}
                  </DialogDescription>
                </div>
              </div>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onSubmit={mainForm.handleSubmit(handleSubmit, onInvalid)}
              noValidate
              aria-busy={submitPhase === 'loading'}
            >
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 md:px-6"
              >
                <ClientProfileFields
                  formId={formId}
                  t={t}
                  isCompany={isCompany}
                  isBusy={fieldsBusy}
                  fieldError={fieldError}
                  mainForm={mainForm as unknown as UseFormReturn<API.ClientCreateForm>}
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
                  disabled={submitPhase === 'loading'}
                  className="h-10 border-slate-200 px-4 dark:border-zinc-700"
                >
                  {t.common.cancel}
                </Button>
                {!readOnly && (
                  <Button
                    type="submit"
                    disabled={submitPhase !== 'idle'}
                    className="h-10 min-w-[168px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680]"
                  >
                    {submitPhase === 'loading' ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        {t.clients.modal.updating}
                      </>
                    ) : submitPhase === 'success' ? (
                      <>
                        <Check className="me-2 h-4 w-4" />
                        {t.clients.modal.updatedTitle}
                      </>
                    ) : (
                      t.clients.modal.updateClient
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }
);

ClientUpdateModal.displayName = 'ClientUpdateModal';
export default ClientUpdateModal;
