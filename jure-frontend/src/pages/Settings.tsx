import React, { useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import {
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Monitor,
  Cpu,
  Users,
  Keyboard,
  Loader2,
  Settings2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiChangePassword } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import RoleManagement from '@/components/role/RoleManagement';
import { useAppTranslation } from '@/i18n';
import { Languages } from '@/utils/constants';
import { useShortcuts } from '@/context/ShortcutsContext';
import ShortcutLibrary from '@/components/shortcuts/ShortcutLibrary';
import type { Lang } from '@/i18n/types';

type NotificationKey = 'email' | 'push' | 'sms' | 'desktop';

type SecurityFormData = {
  old_password: string;
  new_password1: string;
  new_password2: string;
};

const ThemeOption = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

type ThemeChoice = (typeof ThemeOption)[keyof typeof ThemeOption];

const INPUT_CLASS =
  'h-10 rounded-lg border-slate-200 bg-white text-[13.5px] shadow-none transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950 focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 focus-visible:border-[#64499D]';

const PRIMARY_BTN =
  'h-10 min-w-[132px] bg-[#64499D] px-4 text-white hover:bg-[#4D3680] dark:bg-[#7C6BB8] dark:hover:bg-[#8B6FD1]';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useUserStore();

  const [activeSection, setActiveSection] = useState<
    'notifications' | 'security' | 'appearance' | 'language' | 'data' | 'roles' | 'shortcuts'
  >('notifications');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { themeChoice, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    email: true,
    push: false,
    sms: true,
    desktop: true,
  });
  const { lang, setLang, t, tf } = useAppTranslation();
  const { showHintsOnButtons, setShowHintsOnButtons } = useShortcuts();

  const securitySchema = useMemo(
    () =>
      yup.object({
        old_password: yup.string().required(t.settings.validation.currentPasswordRequired),
        new_password1: yup
          .string()
          .required(t.settings.validation.newPasswordRequired)
          .min(8, t.validation.passwordTooShort)
          .matches(/^(?=.*[a-z])(?=.*\d)/, t.validation.passwordTooShort),
        new_password2: yup
          .string()
          .required(t.settings.validation.confirmPasswordRequired)
          .oneOf([yup.ref('new_password1')], t.settings.validation.passwordsMustMatch),
      }),
    [t]
  );

  const securityForm = useForm<SecurityFormData>({
    resolver: yupResolver(securitySchema) as never,
    defaultValues: {
      old_password: '',
      new_password1: '',
      new_password2: '',
    },
  });

  const settingSections = useMemo(
    () => [
      { id: 'notifications' as const, label: t.settings.nav.notifications, icon: Bell, description: t.settings.nav.notificationsDesc },
      { id: 'security' as const, label: t.settings.nav.security, icon: Shield, description: t.settings.nav.securityDesc },
      { id: 'appearance' as const, label: t.settings.nav.appearance, icon: Palette, description: t.settings.nav.appearanceDesc },
      { id: 'language' as const, label: t.settings.nav.language, icon: Globe, description: t.settings.nav.languageDesc },
      { id: 'data' as const, label: t.settings.nav.data, icon: Database, description: t.settings.nav.dataDesc },
      { id: 'roles' as const, label: t.settings.nav.roles, icon: Users, description: t.settings.nav.rolesDesc },
      { id: 'shortcuts' as const, label: t.settings.nav.shortcuts, icon: Keyboard, description: t.settings.nav.shortcutsDesc },
    ],
    [t]
  );

  const handleSecuritySubmit = async (data: SecurityFormData) => {
    try {
      await apiChangePassword(data as API.ChangePasswordForm);
      toast({
        title: t.settings.toasts.passwordChangedTitle,
        description: t.settings.toasts.passwordChangedDesc,
      });
      securityForm.reset({ old_password: '', new_password1: '', new_password2: '' });
      logout();
      navigate('/signin');
    } catch (error) {
      if (isAxiosError(error)) {
        const remoteValidation = getRemoteFieldsValidation(error);
        Object.keys(remoteValidation).forEach((key) => {
          securityForm.setError(key as keyof API.ChangePasswordForm, { message: remoteValidation[key] });
        });
      }
      toast({
        title: t.settings.toasts.updateFailedTitle,
        description: t.settings.toasts.securityUpdateFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const handleNotificationToggle = async (type: NotificationKey, value: boolean) => {
    if ((type === 'desktop' || type === 'push') && value) {
      const { requestCallNotificationPermission, setCallNotifyEnabled, getNotificationPermission } =
        await import('@/utils/incomingCallNotify');
      const perm = await requestCallNotificationPermission();
      if (perm === 'denied' || perm === 'unsupported') {
        toast({
          title: t.settings.toasts.notificationUpdatedTitle,
          description:
            perm === 'unsupported'
              ? 'Notifications are not supported in this browser.'
              : 'Notification permission was blocked. Enable it in your browser settings.',
          variant: 'destructive',
        });
        setNotifications((prev) => ({ ...prev, [type]: false }));
        return;
      }
      setCallNotifyEnabled(true);
      void getNotificationPermission();
    }
    if ((type === 'desktop' || type === 'push') && !value) {
      const { setCallNotifyEnabled } = await import('@/utils/incomingCallNotify');
      setCallNotifyEnabled(false);
    }
    setNotifications((prev) => {
      const typeLabel =
        type === 'email'
          ? t.settings.notifEmailTitle
          : type === 'push'
            ? t.settings.notifPushTitle
            : type === 'sms'
              ? t.settings.notifSmsTitle
              : t.settings.notifDesktopTitle;
      toast({
        title: t.settings.toasts.notificationUpdatedTitle,
        description: tf(t.settings.toasts.notificationUpdatedDesc, {
          type: typeLabel,
          state: value ? t.settings.toasts.notificationEnabled : t.settings.toasts.notificationDisabled,
        }),
      });
      return { ...prev, [type]: value };
    });
  };

  const PasswordField = ({
    id,
    label,
    placeholder,
    register,
    error,
    visible,
    onToggle,
    hint,
  }: {
    id: keyof SecurityFormData;
    label: string;
    placeholder: string;
    register: ReturnType<typeof securityForm.register>;
    error?: string;
    visible: boolean;
    onToggle: () => void;
    hint?: string;
  }) => (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          {...register}
          aria-invalid={!!error}
          className={cn(INPUT_CLASS, 'pe-10', error && 'border-destructive focus-visible:ring-destructive')}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-zinc-200"
          aria-label={visible ? t.settings.hidePassword : t.settings.showPassword}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );

  const renderNotificationSettings = () => (
    <FormSection title={t.settings.sectionPreferences} hint={t.settings.notificationsDescription}>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
        {([
          ['email', t.settings.notifEmailTitle, t.settings.notifEmailDesc, Mail],
          ['push', t.settings.notifPushTitle, t.settings.notifPushDesc, Bell],
          ['sms', t.settings.notifSmsTitle, t.settings.notifSmsDesc, Phone],
          ['desktop', t.settings.notifDesktopTitle, t.settings.notifDesktopDesc, Monitor],
        ] as const).map(([key, title, desc], index) => (
          <SettingRow
            key={key}
            id={`notif-${key}`}
            title={title}
            description={desc}
            className={index > 0 ? 'border-t border-slate-200 dark:border-zinc-800' : undefined}
          >
            <Switch
              id={`notif-${key}`}
              checked={notifications[key]}
              onCheckedChange={(value) => handleNotificationToggle(key, value)}
              className="data-[state=checked]:bg-[#64499D]"
            />
          </SettingRow>
        ))}
      </div>
    </FormSection>
  );

  const renderSecuritySettings = () => (
    <FormSection title={t.settings.sectionSecurity} hint={t.settings.securityDescription}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordField
          id="old_password"
          label={t.settings.currentPassword}
          placeholder={t.settings.currentPasswordPlaceholder}
          register={securityForm.register('old_password')}
          error={securityForm.formState.errors.old_password?.message}
          visible={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
        <div className="hidden sm:block" />
        <PasswordField
          id="new_password1"
          label={t.settings.newPassword}
          placeholder={t.settings.newPasswordPlaceholder}
          register={securityForm.register('new_password1')}
          error={securityForm.formState.errors.new_password1?.message}
          visible={showNewPassword}
          onToggle={() => setShowNewPassword((v) => !v)}
          hint={t.settings.passwordHint}
        />
        <PasswordField
          id="new_password2"
          label={t.settings.confirmPassword}
          placeholder={t.settings.confirmPasswordPlaceholder}
          register={securityForm.register('new_password2')}
          error={securityForm.formState.errors.new_password2?.message}
          visible={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((v) => !v)}
        />
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
        <SettingRow id="two-factor" title={t.settings.twoFactorTitle} description={t.settings.twoFactorDesc}>
          <Switch id="two-factor" disabled checked={false} className="data-[state=checked]:bg-[#64499D]" />
        </SettingRow>
      </div>
    </FormSection>
  );

  const renderAppearance = () => (
    <FormSection title={t.settings.sectionPreferences} hint={t.settings.appearanceDescription}>
      <div
        className="inline-flex w-full flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto"
        role="radiogroup"
        aria-label={t.settings.appearanceTitle}
      >
        {([
          { id: 'light' as const, title: t.settings.themeLight },
          { id: 'dark' as const, title: t.settings.themeDark },
          { id: 'system' as const, title: t.settings.themeSystem },
        ] as { id: ThemeChoice; title: string }[]).map(({ id, title }) => {
          const active = themeChoice === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-[#64499D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white'
              )}
            >
              {title}
            </button>
          );
        })}
      </div>
    </FormSection>
  );

  const renderLanguage = () => (
    <FormSection title={t.settings.sectionPreferences} hint={t.settings.languageSectionDescription}>
      <div className="inline-flex w-full flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto">
        {Languages.options.map((option) => {
          const code = option.value as Lang;
          const active = code === lang;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-[#64499D] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white'
              )}
            >
              {t.common.languageNames[code]}
            </button>
          );
        })}
      </div>
    </FormSection>
  );

  const renderData = () => (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
      <Database className="mx-auto mb-3 h-6 w-6 text-[#64499D]" />
      <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">{t.settings.dataRoadmapTitle}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{t.settings.dataRoadmapDesc}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 h-8"
        onClick={() =>
          toast({
            title: t.settings.toasts.exportRequestTitle,
            description: t.settings.toasts.exportRequestDesc,
          })
        }
      >
        {t.settings.requestHelp}
      </Button>
    </div>
  );

  const renderKeyboard = () => (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
        <SettingRow
          id="shortcut-hints"
          title={t.settings.keyboardShowOnButtonsTitle}
          description={t.settings.keyboardShowOnButtonsDesc}
        >
          <Switch
            id="shortcut-hints"
            checked={showHintsOnButtons}
            onCheckedChange={setShowHintsOnButtons}
            className="data-[state=checked]:bg-[#64499D]"
          />
        </SettingRow>
      </div>
      <FormSection title={t.settings.keyboardLibraryTitle} hint={t.settings.keyboardLibraryDescription}>
        <ShortcutLibrary
          searchable
          searchPlaceholder={t.settings.keyboardSearchPlaceholder}
          emptyLabel={t.settings.keyboardEmpty}
        />
      </FormSection>
    </div>
  );

  const showSecurityFooter = activeSection === 'security';
  const showNotifFooter = activeSection === 'notifications';

  return (
    <div className="mx-auto max-w-[1100px] pb-28">
      <header className="relative mb-6 overflow-hidden rounded-[20px] border border-[#64499D]/15 bg-gradient-to-br from-[#3E2D71] via-[#64499D] to-[#6D54B5] px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              <Settings2 className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{t.sidebar.settings}</p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-tight sm:text-[22px]">{t.settings.pageTitle}</h1>
              <p className="mt-1 max-w-xl text-[13px] leading-snug text-white/80">{t.settings.pageSubtitle}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard/account')}
            className="h-8 shrink-0 bg-white text-[#64499D] hover:bg-white/90"
          >
            {t.sidebar.account}
          </Button>
        </div>
      </header>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as typeof activeSection)}
        className="flex flex-col gap-6 lg:flex-row"
      >
        <TabsList className="flex h-auto w-full flex-row items-stretch justify-start gap-1 self-start overflow-x-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 lg:sticky lg:top-4 lg:w-[220px] lg:flex-col lg:overflow-visible dark:border-zinc-800 dark:bg-zinc-950">
          {settingSections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  'h-auto min-w-[8.5rem] w-auto flex-none items-center justify-start gap-2 rounded-xl px-3 py-2 text-left text-[13px] shadow-none lg:w-full',
                  active
                    ? 'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF]'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{section.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <TabsContent value="notifications" className="mt-0">{renderNotificationSettings()}</TabsContent>
          <TabsContent value="security" className="mt-0">{renderSecuritySettings()}</TabsContent>
          <TabsContent value="appearance" className="mt-0">{renderAppearance()}</TabsContent>
          <TabsContent value="language" className="mt-0">{renderLanguage()}</TabsContent>
          <TabsContent value="data" className="mt-0">{renderData()}</TabsContent>
          <TabsContent value="roles" className="mt-0"><RoleManagement /></TabsContent>
          <TabsContent value="shortcuts" className="mt-0">{renderKeyboard()}</TabsContent>
        </div>
      </Tabs>

      {(showSecurityFooter || showNotifFooter) && (
        <div className="sticky bottom-0 z-20 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-0">
          <div className="mx-auto flex max-w-[1100px] items-center justify-end gap-2.5">
            {showSecurityFooter && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-slate-200 px-4 dark:border-zinc-700"
                  onClick={() => securityForm.reset({ old_password: '', new_password1: '', new_password2: '' })}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  type="button"
                  className={PRIMARY_BTN}
                  disabled={securityForm.formState.isSubmitting}
                  onClick={() => void securityForm.handleSubmit(handleSecuritySubmit)()}
                >
                  {securityForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {securityForm.formState.isSubmitting ? t.common.saving : t.settings.updatePassword}
                </Button>
              </>
            )}
            {showNotifFooter && (
              <Button
                type="button"
                className={PRIMARY_BTN}
                onClick={() =>
                  toast({
                    title: t.settings.toasts.preferencesSavedTitle,
                    description: t.settings.toasts.preferencesSavedDesc,
                  })
                }
              >
                {t.settings.savePreferences}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="border-b border-slate-200 pb-2 dark:border-zinc-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">
          {title}
        </h2>
        {hint ? <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
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
      ) : hint ? (
        <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
          {id === 'new_password1' ? <Cpu className="h-3.5 w-3.5" /> : null}
          {hint}
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

export default Settings;
