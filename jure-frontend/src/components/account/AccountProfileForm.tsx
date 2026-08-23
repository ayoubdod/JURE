import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { isAxiosError } from 'axios';
import { Building2, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiUpdateUser, apiUpdateUserImage, apiUpdateCabinet } from '@/services/auth/api';
import { apiGetMyCabinetMember } from '@/services/cabinet-member/api';
import useUserStore from '@/stores/userStore';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';
import { PRACTICE_TYPE_VALUES } from '@/schemas/signupValidation';
import {
  ACCOUNT_INPUT_CLASS,
  ACCOUNT_PRIMARY_BTN,
  Field,
  FormSection,
} from './formUi';

const TEAM_SIZE_BUCKETS = [1, 5, 10, 20, 50, 100] as const;

function normalizeTeamSize(value?: string | number | null) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const match = TEAM_SIZE_BUCKETS.find((bucket) => n <= bucket);
  return String(match ?? 100);
}

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  bio?: string;
};

type CabinetFormData = {
  trade_name?: string;
  practice_type?: string;
  business_address?: string;
  team_size?: string;
  website?: string;
  logo?: File;
};

export default function AccountProfileForm() {
  const { toast } = useToast();
  const { user } = useUserStore();
  const { t } = useAppTranslation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [photoIsUploading, setPhotoIsUploading] = useState(false);
  const [photoDragging, setPhotoDragging] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.image || '');
  const [logoIsUploading, setLogoIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(user?.logo || '');
  const [member, setMember] = useState<API.CabinetMember | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetMyCabinetMember()
      .then((res) => {
        if (!cancelled) setMember(res.data);
      })
      .catch(() => {
        if (!cancelled) setMember(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const profileSchema = useMemo(
    () =>
      yup.object({
        first_name: yup
          .string()
          .required(t.settings.validation.firstNameRequired)
          .min(2, t.settings.validation.firstNameMin),
        last_name: yup
          .string()
          .required(t.settings.validation.lastNameRequired)
          .min(2, t.settings.validation.lastNameMin),
        email: yup.string().email(t.validation.invalidEmail).optional(),
        phone: yup
          .string()
          .required(t.settings.validation.phoneRequired)
          .min(10, t.settings.validation.phoneInvalid),
        bio: yup.string().max(500, t.settings.validation.bioMax),
      }),
    [t]
  );

  const cabinetSchema = useMemo(
    () =>
      yup.object({
        trade_name: yup.string().min(2, t.settings.validation.tradeNameMin),
        practice_type: yup.string().oneOf([...PRACTICE_TYPE_VALUES, '']).optional(),
        business_address: yup.string(),
        team_size: yup.string(),
        website: yup.string().test('url', t.settings.validation.invalidUrl, (value) => {
          if (!value || value.trim() === '') return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        }),
        logo: yup.mixed<File>().optional(),
      }),
    [t]
  );

  const profileForm = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema) as never,
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    },
  });

  const cabinetForm = useForm<CabinetFormData>({
    resolver: yupResolver(cabinetSchema) as never,
    defaultValues: {
      trade_name: user?.trade_name || '',
      practice_type: user?.practice_type || '',
      business_address: user?.business_address || '',
      team_size: normalizeTeamSize(user?.team_size),
      website: user?.website || '',
    },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    cabinetForm.reset({
      trade_name: user.trade_name || '',
      practice_type: user.practice_type || '',
      business_address: user.business_address || '',
      team_size: normalizeTeamSize(user.team_size),
      website: user.website || '',
    });
    setPhotoUrl(user.image || '');
    setLogoUrl(user.logo || '');
  }, [user, profileForm, cabinetForm]);

  const initials = useMemo(() => {
    const first = user?.first_name?.[0] ?? '';
    const last = user?.last_name?.[0] ?? '';
    const composed = `${first}${last}`.trim();
    return composed ? composed.toUpperCase() : 'U';
  }, [user?.first_name, user?.last_name]);

  const displayName =
    user?.first_name || user?.last_name
      ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
      : t.settings.yourAccount;

  const roleLabel = member?.role ? t.team.roles[member.role] : null;
  const isActive = member?.is_active ?? true;

  const handleProfileSubmit = async (data: ProfileFormData) => {
    const { email: _email, ...updateData } = data;
    try {
      const response = await apiUpdateUser(updateData);
      useUserStore.setState({ user: response.data });
      toast({
        title: t.settings.toasts.profileUpdatedTitle,
        description: t.settings.toasts.profileUpdatedDesc,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const remoteValidation = getRemoteFieldsValidation(error);
        Object.keys(remoteValidation).forEach((key) => {
          profileForm.setError(key as keyof API.UserUpdateForm, { message: remoteValidation[key] });
        });
      }
      toast({
        title: t.settings.toasts.updateFailedTitle,
        description: t.settings.toasts.profileUpdateFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const handleCabinetInfoSubmit = async (data: CabinetFormData) => {
    try {
      const cabinetPayload: API.CabinetUpdateForm = {
        trade_name: data.trade_name,
        business_address: data.business_address,
        team_size: data.team_size,
        website: data.website,
        ...(data.practice_type ? { practice_type: data.practice_type } : {}),
      };
      const response = await apiUpdateCabinet(cabinetPayload);
      const cabinet = response.data;
      const logoVersion = cabinet.logo ? Date.now() : undefined;
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            trade_name: cabinet.trade_name ?? user.trade_name,
            practice_type: cabinet.practice_type ?? user.practice_type,
            business_address: cabinet.business_address ?? user.business_address,
            team_size: cabinet.team_size != null ? String(cabinet.team_size) : user.team_size,
            website: cabinet.website ?? user.website,
            logo: cabinet.logo ?? user.logo,
            ...(logoVersion && { logo_version: logoVersion }),
          },
        });
      }
      if (cabinet.logo) {
        const cacheBust = `${cabinet.logo}${cabinet.logo.includes('?') ? '&' : '?'}t=${logoVersion}`;
        setLogoUrl(cacheBust);
      }
      toast({
        title: t.settings.toasts.cabinetUpdatedTitle,
        description: t.settings.toasts.cabinetUpdatedDesc,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: t.settings.toasts.accessDeniedTitle,
            description: t.settings.toasts.accessDeniedDesc,
            variant: 'destructive',
          });
          return;
        }
        if (status === 404) {
          toast({
            title: t.settings.toasts.notFoundTitle,
            description: t.settings.toasts.cabinetNotFoundDesc,
            variant: 'destructive',
          });
          return;
        }
        const remoteValidation = getRemoteFieldsValidation(error);
        Object.keys(remoteValidation).forEach((key) => {
          cabinetForm.setError(key as keyof API.CabinetUpdateForm, { message: remoteValidation[key] });
        });
      }
      toast({
        title: t.settings.toasts.updateFailedTitle,
        description: t.settings.toasts.cabinetUpdateFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const handleUploadPhoto = async (file: File) => {
    const maxSize = 5 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > maxSize) {
      toast({
        title: t.settings.toasts.invalidFileTitle,
        description: t.settings.toasts.invalidPhotoDesc,
        variant: 'destructive',
      });
      return;
    }

    setPhotoIsUploading(true);
    const preview = URL.createObjectURL(file);
    setPhotoUrl(preview);

    try {
      const response = await apiUpdateUserImage(file);
      useUserStore.setState({ user: response.data });
      setPhotoUrl(response.data.image);
      toast({
        title: t.settings.toasts.photoUpdatedTitle,
        description: t.settings.toasts.photoUpdatedDesc,
      });
    } catch {
      setPhotoUrl(user?.image || '');
      toast({
        title: t.settings.toasts.uploadFailedTitle,
        description: t.settings.toasts.photoUploadFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setPhotoIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(preview), 3000);
    }
  };

  const handleUploadLogo = async (file: File) => {
    const maxSize = 2 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > maxSize) {
      toast({
        title: t.settings.toasts.invalidFileTitle,
        description: t.settings.toasts.invalidLogoDesc,
        variant: 'destructive',
      });
      return;
    }

    setLogoIsUploading(true);
    const preview = URL.createObjectURL(file);
    setLogoUrl(preview);

    try {
      const response = await apiUpdateCabinet({ logo: file });
      const updatedUser = response.data;
      const logoVersion = Date.now();
      useUserStore.setState({
        user: { ...updatedUser, logo_version: logoVersion },
      });
      const newLogoUrl = updatedUser.logo
        ? `${updatedUser.logo}${updatedUser.logo.includes('?') ? '&' : '?'}t=${logoVersion}`
        : '';
      setLogoUrl(newLogoUrl);
      toast({
        title: t.settings.toasts.logoUpdatedTitle,
        description: t.settings.toasts.logoUpdatedDesc,
      });
    } catch (error) {
      setLogoUrl(user?.logo || '');
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: t.settings.toasts.accessDeniedTitle,
            description: t.settings.toasts.accessDeniedDesc,
            variant: 'destructive',
          });
          return;
        }
        if (status === 404) {
          toast({
            title: t.settings.toasts.notFoundTitle,
            description: t.settings.toasts.cabinetNotFoundDesc,
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: t.settings.toasts.uploadFailedTitle,
        description: t.settings.toasts.logoUploadFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setLogoIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(preview), 3000);
    }
  };

  const resetForms = () => {
    profileForm.reset({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    });
    cabinetForm.reset({
      trade_name: user?.trade_name || '',
      practice_type: user?.practice_type || '',
      business_address: user?.business_address || '',
      team_size: normalizeTeamSize(user?.team_size),
      website: user?.website || '',
    });
  };

  const save = async () => {
    const profileDirty = profileForm.formState.isDirty;
    const cabinetDirty = cabinetForm.formState.isDirty;
    if (profileDirty) {
      const valid = await profileForm.trigger();
      if (!valid) return;
      await profileForm.handleSubmit(handleProfileSubmit)();
    }
    if (cabinetDirty) {
      const valid = await cabinetForm.trigger();
      if (!valid) return;
      await cabinetForm.handleSubmit(handleCabinetInfoSubmit)();
    }
    if (!profileDirty && !cabinetDirty) {
      await profileForm.handleSubmit(handleProfileSubmit)();
    }
  };

  const acceptPhotoFile = (file?: File) => {
    if (file) void handleUploadPhoto(file);
  };

  const saving = profileForm.formState.isSubmitting || cabinetForm.formState.isSubmitting;

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-4">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={photoIsUploading}
            onChange={(event) => {
              acceptPhotoFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setPhotoDragging(true);
            }}
            onDragLeave={() => setPhotoDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setPhotoDragging(false);
              acceptPhotoFile(e.dataTransfer.files?.[0]);
            }}
            disabled={photoIsUploading}
            aria-label={photoUrl ? t.settings.changePhoto : t.settings.photoAdd}
            className={cn(
              'group relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full',
              'bg-[#F7F4FF] text-[#64499D] ring-1 ring-[#64499D]/15 transition-all duration-200',
              'hover:ring-[#64499D]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64499D]',
              'dark:bg-[#64499D]/20 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/30',
              photoDragging && 'ring-2 ring-[#64499D]'
            )}
          >
            <Avatar className="h-full w-full">
              <AvatarImage src={photoUrl} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-transparent text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100">
              {photoIsUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>
          <div className="mt-3 text-center">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-zinc-50">{displayName}</p>
            {roleLabel && (
              <p className="mt-0.5 text-[13px] font-medium text-[#64499D] dark:text-[#CFC2FF]">{roleLabel}</p>
            )}
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F7F4FF] px-2.5 py-0.5 text-[11px] font-medium text-[#64499D] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:text-[#CFC2FF] dark:ring-[#8B6FD1]/30">
              <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
              {isActive ? t.team.status.active : t.team.status.inactive}
            </p>
            <p className="mt-2 truncate text-[12px] text-slate-500 dark:text-zinc-400">
              {user?.email || t.settings.noEmail}
            </p>
          </div>
          <div className="mt-4 space-y-1.5 text-center">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoIsUploading}
              className="text-[13px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
            >
              {photoIsUploading ? t.settings.uploading : photoUrl ? t.settings.changePhoto : t.settings.photoAdd}
            </button>
            <p className="text-[11px] text-slate-400">{t.settings.photoDropHint}</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-8 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <FormSection title={t.settings.sectionPersonal}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first_name" label={t.settings.firstName} error={profileForm.formState.errors.first_name?.message}>
                <Input id="first_name" className={ACCOUNT_INPUT_CLASS} {...profileForm.register('first_name')} />
              </Field>
              <Field id="last_name" label={t.settings.lastName} error={profileForm.formState.errors.last_name?.message}>
                <Input id="last_name" className={ACCOUNT_INPUT_CLASS} {...profileForm.register('last_name')} />
              </Field>
              <Field id="email" label={t.settings.email} hint={t.settings.emailLockedHint}>
                <Input
                  id="email"
                  type="email"
                  {...profileForm.register('email')}
                  disabled
                  className={cn(ACCOUNT_INPUT_CLASS, 'cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-zinc-900')}
                />
              </Field>
              <Field id="phone" label={t.settings.phone} error={profileForm.formState.errors.phone?.message}>
                <PhoneInput
                  id="phone"
                  value={profileForm.watch('phone')}
                  onChange={(value) =>
                    profileForm.setValue('phone', value || '', { shouldValidate: true, shouldDirty: true })
                  }
                  defaultCountry="US"
                  placeholder={t.settings.phonePlaceholder}
                  className="[&_button]:h-10 [&_button]:rounded-l-lg [&_input]:h-10 [&_input]:rounded-lg [&_input]:border-slate-200 [&_input]:dark:border-zinc-700 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[#64499D]/25 [&_input]:focus-visible:ring-offset-0"
                />
              </Field>
              <Field id="bio" label={t.settings.bio} error={profileForm.formState.errors.bio?.message} className="sm:col-span-2">
                <Textarea
                  id="bio"
                  rows={4}
                  {...profileForm.register('bio')}
                  placeholder={t.settings.bioPlaceholder}
                  className="resize-none rounded-lg border-slate-200 text-[13.5px] shadow-none focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 dark:border-zinc-700"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title={t.settings.sectionOrganization} hint={t.settings.organizationDescription}>
            <div className="mb-4 flex items-center gap-3.5">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={logoIsUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUploadLogo(file);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoIsUploading}
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F7F4FF] ring-1 ring-[#64499D]/15 dark:bg-[#64499D]/20 dark:ring-[#8B6FD1]/30"
                aria-label={logoUrl ? t.settings.changeLogo : t.settings.uploadLogo}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={t.settings.logoAlt} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-[#64499D] dark:text-[#CFC2FF]" />
                )}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoIsUploading}
                  className="text-[13px] font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]"
                >
                  {logoIsUploading ? t.settings.uploading : logoUrl ? t.settings.changeLogo : t.settings.uploadLogo}
                </button>
                <p className="mt-0.5 text-[12px] text-slate-400">{t.settings.logoHint}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="jurisdiction" label={t.settings.jurisdiction} hint={t.settings.jurisdictionLockedHint}>
                <Input
                  id="jurisdiction"
                  className={cn(ACCOUNT_INPUT_CLASS, 'cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-zinc-900')}
                  value={user?.jurisdiction?.name || user?.jurisdiction?.code || '—'}
                  disabled
                  readOnly
                />
              </Field>
              <Field id="practice_type" label={t.settings.practiceType} error={cabinetForm.formState.errors.practice_type?.message}>
                <Select
                  value={cabinetForm.watch('practice_type') || undefined}
                  onValueChange={(value) =>
                    cabinetForm.setValue('practice_type', value, { shouldDirty: true, shouldValidate: true })
                  }
                >
                  <SelectTrigger id="practice_type" className={cn(ACCOUNT_INPUT_CLASS, 'w-full justify-between')}>
                    <SelectValue placeholder={t.auth.signup.practice.headerTitle} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PRACTICE_TYPE_VALUES[0]}>{t.auth.signup.practiceTypes.lawOffice}</SelectItem>
                    <SelectItem value={PRACTICE_TYPE_VALUES[1]}>{t.auth.signup.practiceTypes.lawFirm}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="trade_name" label={t.settings.tradeName} error={cabinetForm.formState.errors.trade_name?.message}>
                <Input id="trade_name" className={ACCOUNT_INPUT_CLASS} placeholder={t.settings.tradeNamePlaceholder} {...cabinetForm.register('trade_name')} />
              </Field>
              <Field id="team_size" label={t.settings.teamSize} error={cabinetForm.formState.errors.team_size?.message}>
                <Select
                  value={cabinetForm.watch('team_size') || undefined}
                  onValueChange={(value) =>
                    cabinetForm.setValue('team_size', value, { shouldDirty: true, shouldValidate: true })
                  }
                >
                  <SelectTrigger id="team_size" className={cn(ACCOUNT_INPUT_CLASS, 'w-full justify-between')}>
                    <SelectValue placeholder={t.auth.signup.organization.teamPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.auth.signup.teamSizes.justMe}</SelectItem>
                    <SelectItem value="5">{t.auth.signup.teamSizes.twoToFive}</SelectItem>
                    <SelectItem value="10">{t.auth.signup.teamSizes.sixToTen}</SelectItem>
                    <SelectItem value="20">{t.auth.signup.teamSizes.elevenToTwenty}</SelectItem>
                    <SelectItem value="50">{t.auth.signup.teamSizes.twentyOneToFifty}</SelectItem>
                    <SelectItem value="100">{t.auth.signup.teamSizes.moreThanFifty}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="business_address" label={t.settings.businessAddress} error={cabinetForm.formState.errors.business_address?.message} className="sm:col-span-2">
                <Textarea
                  id="business_address"
                  rows={3}
                  placeholder={t.settings.businessAddressPlaceholder}
                  className="resize-none rounded-lg border-slate-200 text-[13.5px] shadow-none focus-visible:ring-2 focus-visible:ring-[#64499D]/25 focus-visible:ring-offset-0 dark:border-zinc-700"
                  {...cabinetForm.register('business_address')}
                />
              </Field>
              <Field id="website" label={t.settings.website} error={cabinetForm.formState.errors.website?.message} className="sm:col-span-2">
                <Input id="website" type="url" className={ACCOUNT_INPUT_CLASS} placeholder={t.settings.websitePlaceholder} {...cabinetForm.register('website')} />
              </Field>
            </div>
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-0">
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" className="h-10 border-slate-200 px-4 dark:border-zinc-700" onClick={resetForms}>
            {t.common.cancel}
          </Button>
          <Button type="button" className={ACCOUNT_PRIMARY_BTN} disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? t.common.saving : t.settings.saveChanges}
          </Button>
        </div>
      </div>
    </>
  );
}
