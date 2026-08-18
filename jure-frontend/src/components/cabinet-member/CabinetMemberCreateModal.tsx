'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
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
import {
  Camera,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  apiCreateCabinetMember,
  apiUploadCabinetMemberImage,
} from '@/services/cabinet-member/api';
import { getCabinetMemberRouteId } from '@/utils/cabinetMemberHelpers';
import { getRolePermissions } from '@/utils/permissions';
import * as yup from 'yup';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Input } from '../ui/input';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { PhoneInput } from '../ui/phone-input';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppTranslation } from '@/i18n';
import { useToast } from '@/hooks/use-toast';

const ALL_ROLES: API.Role[] = ['VIEWER', 'ASSISTANT', 'LAWYER', 'MANAGER', 'ADMIN', 'OWNER'];

const DEFAULT_VALUES: API.CabinetMemberCreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  role: 'VIEWER',
  is_active: true,
  send_invitation_email: true,
};

const INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

type ModuleKey = 'clients' | 'cases' | 'library' | 'tasks' | 'conversations' | 'team' | 'settings';
type AccessLevel = 'none' | 'view' | 'edit';

const PERMISSION_MODULES: {
  key: ModuleKey;
  view: API.Permission;
  edit?: API.Permission;
}[] = [
  { key: 'clients', view: 'clients.view', edit: 'clients.edit' },
  { key: 'cases', view: 'cases.view', edit: 'cases.edit' },
  { key: 'library', view: 'library.view', edit: 'library.edit' },
  { key: 'tasks', view: 'tasks.view', edit: 'tasks.edit' },
  { key: 'conversations', view: 'conversations.view', edit: 'conversations.edit' },
  { key: 'team', view: 'team.view', edit: 'team.edit' },
  { key: 'settings', view: 'settings.view', edit: 'settings.edit' },
];

function moduleAccess(permissions: API.Permission[], view: API.Permission, edit?: API.Permission): AccessLevel {
  if (edit && permissions.includes(edit)) return 'edit';
  if (permissions.includes(view)) return 'view';
  return 'none';
}

function initialsFrom(first: string, last: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || '';
}

export interface CabinetMemberCreateModalRef {
  show: () => void;
  hide: () => void;
}

export interface CabinetMemberCreateModalProps {
  onSuccess?: (_: API.CabinetMember) => void;
}

const CabinetMemberCreateModal = forwardRef<
  CabinetMemberCreateModalRef,
  CabinetMemberCreateModalProps
>(({ onSuccess }, ref) => {
  const { t, tf } = useAppTranslation();
  const { toast } = useToast();
  const formId = useId();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const [showPermissions, setShowPermissions] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const isBusy = submitPhase !== 'idle';

  const schema = useMemo(
    () =>
      yup.object({
        first_name: yup.string().required(t.team.validation.firstNameRequired),
        last_name: yup.string().required(t.team.validation.lastNameRequired),
        email: yup.string().email(t.validation.invalidEmail).required(t.team.validation.emailRequired),
        phone: yup.string().required(t.team.validation.phoneRequired),
        is_active: yup.boolean().default(true),
        address: yup.string().required(t.team.validation.addressRequired),
        role: yup.string().oneOf(['OWNER', 'ADMIN', 'MANAGER', 'LAWYER', 'ASSISTANT', 'VIEWER']).optional(),
        send_invitation_email: yup.boolean().default(true),
      }),
    [t]
  );

  const mainForm = useForm<API.CabinetMemberCreateForm>({
    resolver: yupResolver(schema) as Resolver<API.CabinetMemberCreateForm>,
    defaultValues: DEFAULT_VALUES,
  });

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  }, []);

  const resetLocalState = useCallback(() => {
    mainForm.reset(DEFAULT_VALUES);
    setSubmitPhase('idle');
    setShowPermissions(false);
    clearPhoto();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [clearPhoto, mainForm]);

  const show = () => {
    resetLocalState();
    setIsOpen(true);
  };

  const hide = () => {
    if (isBusy) return;
    setIsOpen(false);
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPhotoFile(file);
  };

  const handleSubmit = async (data: API.CabinetMemberCreateForm) => {
    setSubmitPhase('loading');
    try {
      const payload: API.CabinetMemberCreateForm = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email.trim(),
        phone: data.phone,
        address: data.address.trim(),
        is_active: data.is_active ?? true,
        role: data.role || 'VIEWER',
        send_invitation_email: data.send_invitation_email ?? true,
      };

      const res = await apiCreateCabinetMember(payload);
      let member = res.data;

      if (photoFile) {
        try {
          const imageRes = await apiUploadCabinetMemberImage(getCabinetMemberRouteId(member), photoFile);
          member = { ...member, ...imageRes.data, id: member.id };
        } catch {
          // Member was created; photo is optional and must not fail the flow.
        }
      }

      setSubmitPhase('success');
      toast({
        title: t.team.modal.createdTitle,
        description: tf(t.team.modal.createdDescription, {
          name: `${payload.first_name} ${payload.last_name}`.trim(),
        }),
      });
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      onSuccess?.(member);
      setIsOpen(false);
      setSubmitPhase('idle');
    } catch (err) {
      setSubmitPhase('idle');
      if (isAxiosError(err)) {
        const remoteValidation = getRemoteFieldsValidation(err);
        const keys = Object.keys(remoteValidation);
        keys.forEach((key) => {
          mainForm.setError(key as keyof API.CabinetMemberCreateForm, { message: remoteValidation[key] });
        });
        if (keys[0]) {
          document.getElementById(`${formId}-${keys[0]}`)?.focus();
        }
      }
    }
  };

  const onInvalid = () => {
    const order: (keyof API.CabinetMemberCreateForm)[] = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
    ];
    const first = order.find((key) => mainForm.formState.errors[key]);
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
  };

  const firstName = mainForm.watch('first_name') || '';
  const lastName = mainForm.watch('last_name') || '';
  const currentRole = mainForm.watch('role') || 'VIEWER';
  const displayRole = ALL_ROLES.includes(currentRole) ? currentRole : 'VIEWER';
  const isActive = mainForm.watch('is_active') ?? true;
  const sendInvite = mainForm.watch('send_invitation_email') ?? true;
  const rolePermissions = getRolePermissions(displayRole);
  const initials = initialsFrom(firstName, lastName);

  const fieldError = (name: keyof API.CabinetMemberCreateForm) =>
    mainForm.formState.errors[name]?.message as string | undefined;

  const firstNameRegister = mainForm.register('first_name');

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isBusy) return;
        if (!open) {
          setIsOpen(false);
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
          firstNameRef.current?.focus();
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
          'inset-x-[2.5vw] bottom-0 top-auto h-[min(92dvh,840px)] w-auto translate-x-0 translate-y-0 rounded-t-[20px]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-[min(86vh,740px)] md:w-[min(90vw,820px)] md:max-w-[820px]',
          'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[20px]',
          'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
          'md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]',
          'md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%]'
        )}
      >
        <header className="relative shrink-0 border-b border-[#64499D]/10 bg-[#F7F4FF] px-6 py-4 pe-14 dark:border-[#8B6FD1]/15 dark:bg-[#24183F]/80 md:px-7">
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
              <Users className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <DialogTitle className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                {t.team.modal.createTitle}
              </DialogTitle>
              <DialogDescription
                id={`${formId}-description`}
                className="mt-1 text-[13px] leading-snug text-slate-500 dark:text-zinc-400"
              >
                {t.team.modal.createDescription}
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
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-5 md:px-7"
          >
            <div className="space-y-6">
              <FormSection index="01" title={t.team.modal.sectionPersonal}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <input
                      ref={photoInputRef}
                      id={`${formId}-photo`}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isBusy}
                      onChange={handlePhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isBusy}
                      aria-label={photoPreview ? t.team.modal.photoChange : t.team.modal.photoAdd}
                      className={cn(
                        'group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full',
                        'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 transition-all duration-200',
                        'hover:ring-[#64499D]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]',
                        'dark:bg-[#64499D]/20 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/30'
                      )}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                      ) : initials ? (
                        <span className="text-sm font-semibold tracking-wide">{initials}</span>
                      ) : (
                        <Camera className="h-5 w-5 opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={isBusy}
                          className="text-[13px] font-medium text-[#64499D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D] rounded-sm dark:text-[#CFC2FF]"
                        >
                          {photoPreview ? t.team.modal.photoChange : t.team.modal.photoAdd}
                        </button>
                        {photoPreview && (
                          <button
                            type="button"
                            onClick={clearPhoto}
                            disabled={isBusy}
                            className="inline-flex items-center gap-0.5 text-[12px] text-slate-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-sm"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t.team.modal.photoRemove}
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-slate-400">{t.team.modal.photoOptional}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      id={`${formId}-first_name`}
                      label={t.team.modal.firstName}
                      error={fieldError('first_name')}
                    >
                      <Input
                        id={`${formId}-first_name`}
                        autoComplete="given-name"
                        placeholder={t.team.modal.firstNamePlaceholder}
                        className={INPUT_CLASS}
                        disabled={isBusy}
                        aria-invalid={!!fieldError('first_name')}
                        {...firstNameRegister}
                        ref={(el) => {
                          firstNameRef.current = el;
                          firstNameRegister.ref(el);
                        }}
                      />
                    </Field>
                    <Field
                      id={`${formId}-last_name`}
                      label={t.team.modal.lastName}
                      error={fieldError('last_name')}
                    >
                      <Input
                        id={`${formId}-last_name`}
                        autoComplete="family-name"
                        placeholder={t.team.modal.lastNamePlaceholder}
                        className={INPUT_CLASS}
                        disabled={isBusy}
                        aria-invalid={!!fieldError('last_name')}
                        {...mainForm.register('last_name')}
                      />
                    </Field>
                  </div>
                </div>
              </FormSection>

              <FormSection index="02" title={t.team.modal.sectionContact}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field id={`${formId}-email`} label={t.team.modal.email} error={fieldError('email')}>
                    <Input
                      id={`${formId}-email`}
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t.team.modal.emailPlaceholder}
                      className={INPUT_CLASS}
                      disabled={isBusy}
                      aria-invalid={!!fieldError('email')}
                      {...mainForm.register('email')}
                    />
                  </Field>
                  <Field id={`${formId}-phone`} label={t.team.modal.phone} error={fieldError('phone')}>
                    <PhoneInput
                      id={`${formId}-phone`}
                      value={mainForm.watch('phone')}
                      disabled={isBusy}
                      onChange={(value) =>
                        mainForm.setValue('phone', value, { shouldValidate: true, shouldDirty: true })
                      }
                      className="[&_button]:h-10 [&_button]:rounded-l-lg [&_input]:h-10 [&_input]:rounded-lg [&_input]:border-slate-200 [&_input]:dark:border-zinc-700 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[#64499D]/25 [&_input]:focus-visible:ring-offset-0"
                    />
                  </Field>
                  <Field
                    id={`${formId}-address`}
                    label={t.team.modal.addressLabel}
                    error={fieldError('address')}
                    className="sm:col-span-2"
                  >
                    <Input
                      id={`${formId}-address`}
                      autoComplete="street-address"
                      placeholder={t.team.modal.addressPlaceholder}
                      className={INPUT_CLASS}
                      disabled={isBusy}
                      aria-invalid={!!fieldError('address')}
                      {...mainForm.register('address')}
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection index="03" title={t.team.modal.sectionAccess} hint={t.team.modal.roleHint}>
                <RadioGroup
                  value={displayRole}
                  onValueChange={(value) => {
                    if (!value) return;
                    mainForm.setValue('role', value as API.Role, { shouldDirty: true });
                  }}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  aria-label={t.team.modal.selectRole}
                >
                  {ALL_ROLES.map((role) => {
                    const selected = displayRole === role;
                    return (
                      <div
                        key={role}
                        onClick={() => {
                          if (isBusy) return;
                          mainForm.setValue('role', role, { shouldDirty: true });
                        }}
                        className={cn(
                          'relative flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200',
                          'focus-within:ring-2 focus-within:ring-[#64499D]/30',
                          selected
                            ? 'border-[#64499D]/40 bg-[#F7F4FF] shadow-sm dark:border-[#8B6FD1]/40 dark:bg-[#64499D]/15'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
                        )}
                      >
                        <RadioGroupItem
                          id={`${formId}-role-${role}`}
                          value={role}
                          disabled={isBusy}
                          className="mt-0.5"
                          aria-describedby={`${formId}-role-${role}-desc`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor={`${formId}-role-${role}`}
                              className="cursor-pointer text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100"
                            >
                              {t.team.roles[role]}
                            </Label>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide',
                                selected
                                  ? 'bg-[#64499D]/12 text-[#64499D] dark:bg-[#8B6FD1]/20 dark:text-[#CFC2FF]'
                                  : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                              )}
                            >
                              {t.team.modal.roleLevels[role]}
                            </span>
                          </span>
                          <span
                            id={`${formId}-role-${role}-desc`}
                            className="mt-1 block text-[12px] font-normal leading-snug text-slate-500 dark:text-zinc-400"
                          >
                            {t.team.roleDescriptions[role]}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </RadioGroup>
              </FormSection>

              <FormSection index="04" title={t.team.modal.sectionPermissions}>
                <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => setShowPermissions((open) => !open)}
                    aria-expanded={showPermissions}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-start transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]/30"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800 dark:text-zinc-200">
                        {t.team.modal.advancedPermissions}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-slate-500 dark:text-zinc-400">
                        {t.team.modal.permissionsHint}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#64499D] dark:text-[#CFC2FF]">
                      {showPermissions ? t.team.modal.hidePermissions : t.team.modal.showPermissions}
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-200',
                          showPermissions && 'rotate-180'
                        )}
                      />
                    </span>
                  </button>
                  {showPermissions && (
                    <div className="border-t border-slate-200 px-3.5 pb-3 pt-2 duration-200 animate-in fade-in-0 slide-in-from-top-1 dark:border-zinc-800">
                      <div className="overflow-hidden rounded-lg">
                        <table className="w-full text-[12.5px]">
                          <caption className="sr-only">{t.team.modal.advancedPermissions}</caption>
                          <thead>
                            <tr className="text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                              <th className="pb-2 font-semibold">{t.team.modal.moduleColumn}</th>
                              <th className="pb-2 text-end font-semibold">{t.team.modal.accessLevel}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PERMISSION_MODULES.map((module, index) => {
                              const level = moduleAccess(rolePermissions, module.view, module.edit);
                              const label =
                                level === 'edit'
                                  ? t.team.modal.permEdit
                                  : level === 'view'
                                    ? t.team.modal.permView
                                    : t.team.modal.permNone;
                              return (
                                <tr
                                  key={module.key}
                                  className={cn(
                                    'border-t border-slate-100 dark:border-zinc-800/80',
                                    index === 0 && 'border-t-slate-200 dark:border-t-zinc-800'
                                  )}
                                >
                                  <td className="py-2 text-slate-700 dark:text-zinc-300">
                                    {t.team.modal.modules[module.key]}
                                  </td>
                                  <td className="py-2 text-end">
                                    <span
                                      className={cn(
                                        'inline-flex min-w-[4.5rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                        level === 'edit' &&
                                          'bg-[#64499D]/10 text-[#64499D] dark:bg-[#8B6FD1]/20 dark:text-[#CFC2FF]',
                                        level === 'view' &&
                                          'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
                                        level === 'none' && 'bg-transparent text-slate-400'
                                      )}
                                    >
                                      {label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection index="05" title={t.team.modal.sectionAccount}>
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
                  <SettingRow
                    id={`${formId}-is_active`}
                    title={t.team.modal.accountActive}
                    description={t.team.modal.accountActiveHint}
                  >
                    <Switch
                      id={`${formId}-is_active`}
                      checked={isActive}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        mainForm.setValue('is_active', checked, { shouldDirty: true })
                      }
                      className="data-[state=checked]:bg-[#64499D]"
                    />
                  </SettingRow>
                  <SettingRow
                    id={`${formId}-send_invite`}
                    title={t.team.modal.sendInviteNow}
                    description={t.team.modal.sendInviteHint}
                    className="border-t border-slate-200 dark:border-zinc-800"
                  >
                    <Switch
                      id={`${formId}-send_invite`}
                      checked={sendInvite}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        mainForm.setValue('send_invitation_email', checked, { shouldDirty: true })
                      }
                      className="data-[state=checked]:bg-[#64499D]"
                    />
                  </SettingRow>
                </div>
                {sendInvite ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => mainForm.setValue('send_invitation_email', false, { shouldDirty: true })}
                    className="mt-2 text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:underline dark:text-zinc-400"
                  >
                    {t.team.modal.sendLater}
                  </button>
                ) : null}
              </FormSection>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2.5 space-x-0 border-t border-slate-200 bg-white px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:space-x-0 md:px-7">
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.team.modal.creating}
                </>
              ) : submitPhase === 'success' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t.team.modal.createdTitle}
                </>
              ) : (
                t.team.modal.createMember
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
});

function FormSection({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-2.5">
        <span className="text-[11px] font-semibold tabular-nums tracking-[0.14em] text-[#64499D]/70 dark:text-[#CFC2FF]/70">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{title}</h3>
          {hint ? <p className="mt-0.5 text-[12px] text-slate-500 dark:text-zinc-400">{hint}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SettingRow({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-3.5 py-3', className)}>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[13px] font-medium text-slate-800 dark:text-zinc-200">
          {title}
        </Label>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

CabinetMemberCreateModal.displayName = 'CabinetMemberCreateModal';

export default CabinetMemberCreateModal;
