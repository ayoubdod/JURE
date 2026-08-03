import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Phone,
  Save,
  Upload,
  Eye,
  EyeOff,
  Monitor,
  CheckCircle2,
  Cpu,
  Users,
  Building2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { apiChangePassword, apiUpdateUser, apiUpdateUserImage, apiUpdateCabinet } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import RoleManagement from '@/components/role/RoleManagement';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';
import { Languages } from '@/utils/constants';

type NotificationKey = 'email' | 'push' | 'sms' | 'desktop';

const profileSchema = yup.object({
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup.string().email('Invalid email address').optional(),
  phone: yup
    .string()
    .required('Phone number is required')
    .min(10, 'Please enter a valid phone number'),
  bio: yup.string().max(500, 'Bio must be less than 500 characters'),
});

const securitySchema = yup.object({
  old_password: yup.string().required('Current password is required'),
  new_password1: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*\d)/, 'Password must contain at least one lowercase letter and one number'),
  new_password2: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('new_password1')], 'Passwords must match'),
});

const cabinetSchema = yup.object({
  trade_name: yup.string().min(2, 'Trade name must be at least 2 characters'),
  firm_name: yup.string().min(2, 'Firm name must be at least 2 characters'),
  structure_type: yup.string(),
  business_address: yup.string(),
  team_size: yup.string(),
  website: yup.string().test('url', 'Please enter a valid URL', (value) => {
    if (!value || value.trim() === '') return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }),
  logo: yup.mixed<File>().optional(),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;
type SecurityFormData = yup.InferType<typeof securitySchema>;
type CabinetFormData = yup.InferType<typeof cabinetSchema>;

const ThemeOption = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

type ThemeChoice = typeof ThemeOption[keyof typeof ThemeOption];

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useUserStore();

  const [activeSection, setActiveSection] = useState<
    'profile' | 'notifications' | 'security' | 'appearance' | 'language' | 'data' | 'roles'
  >('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoIsUploading, setPhotoIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.image || '');
  const { themeChoice, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    email: true,
    push: false,
    sms: true,
    desktop: true,
  });
  const [logoIsUploading, setLogoIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(user?.logo || '');
  const { lang, t } = useAppTranslation();

  const profileForm = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
      setPhotoUrl(user.image || '');
    }
  }, [user, profileForm]);

  const securityForm = useForm<SecurityFormData>({
    resolver: yupResolver(securitySchema),
    defaultValues: {
      old_password: '',
      new_password1: '',
      new_password2: '',
    },
  });

  const cabinetForm = useForm<CabinetFormData>({
    resolver: yupResolver(cabinetSchema),
    defaultValues: {
      trade_name: user?.trade_name || '',
      firm_name: user?.firm_name || '',
      structure_type: user?.structure_type || '',
      business_address: user?.business_address || '',
      team_size: user?.team_size || '',
      website: user?.website || '',
    },
  });

  useEffect(() => {
    if (user) {
      cabinetForm.reset({
        trade_name: user.trade_name || '',
        firm_name: user.firm_name || '',
        structure_type: user.structure_type || '',
        business_address: user.business_address || '',
        team_size: user.team_size || '',
        website: user.website || '',
      });
      setLogoUrl(user.logo || '');
    }
  }, [user, cabinetForm]);

  const initials = useMemo(() => {
    const first = user?.first_name?.[0] ?? '';
    const last = user?.last_name?.[0] ?? '';
    const composed = `${first}${last}`.trim();
    return composed ? composed.toUpperCase() : 'U';
  }, [user?.first_name, user?.last_name]);

  const settingSections = useMemo(
    () => [
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        description: 'Personal details & bio',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        description: 'When we reach out',
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        description: 'Passwords & privacy',
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
        description: 'Look & feel',
      },
      {
        id: 'language',
        label: 'Language',
        icon: Globe,
        description: 'Localization',
      },
      {
        id: 'data',
        label: 'Data',
        icon: Database,
        description: 'Export & cleanup',
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        icon: Users,
        description: 'Team access control',
      },
    ] as const,
    []
  );

  const handleProfileSubmit = async (data: ProfileFormData) => {
    const { email, ...updateData } = data;
    try {
      const response = await apiUpdateUser(updateData);
      useUserStore.setState({ user: response.data });
      toast({
        title: 'Profile updated',
        description: 'Your profile settings were saved successfully.',
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const remoteValidation = getRemoteFieldsValidation(error);
        Object.keys(remoteValidation).forEach((key) => {
          profileForm.setError(key as keyof API.UserUpdateForm, { message: remoteValidation[key] });
        });
      }
      toast({
        title: 'Update failed',
        description: 'We could not save your profile right now.',
        variant: 'destructive',
      });
    }
  };

  const handleCabinetInfoSubmit = async (data: CabinetFormData) => {
    try {
      const { firm_name: _firmName, ...cabinetPayload } = data;
      const response = await apiUpdateCabinet(cabinetPayload);
      const cabinet = response.data;
      const logoVersion = cabinet.logo ? Date.now() : undefined;
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            trade_name: cabinet.trade_name ?? user.trade_name,
            structure_type: cabinet.structure_type ?? user.structure_type,
            business_address: cabinet.business_address ?? user.business_address,
            team_size:
              cabinet.team_size != null ? String(cabinet.team_size) : user.team_size,
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
        title: 'Cabinet information updated',
        description: 'Your organization details were saved successfully.',
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: 'Access denied',
            description: 'Only the cabinet owner can update organization details.',
            variant: 'destructive',
          });
          return;
        }
        if (status === 404) {
          toast({
            title: 'Not found',
            description: 'Cabinet not found. Please contact support.',
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
        title: 'Update failed',
        description: 'We could not save your cabinet information right now.',
        variant: 'destructive',
      });
    }
  };

  const handleSecuritySubmit = async (data: SecurityFormData) => {
    try {
      await apiChangePassword(data as API.ChangePasswordForm);
      toast({
        title: 'Password changed',
        description: 'Please sign in again with your new password.',
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
        title: 'Update failed',
        description: 'We could not update your security settings.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadPhoto = async (file: File) => {
    const maxSize = 5 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > maxSize) {
      toast({
        title: 'Invalid file',
        description: 'Use JPG/PNG/GIF/WebP up to 5MB.',
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
        title: 'Photo updated',
        description: 'Your profile picture looks great.',
      });
    } catch (error) {
      setPhotoUrl(user?.image || '');
      toast({
        title: 'Upload failed',
        description: 'We could not upload that photo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setPhotoIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(preview), 3000);
    }
  };

  const handleNotificationToggle = (type: NotificationKey, value: boolean) => {
    setNotifications((prev) => {
      toast({
        title: 'Notification updated',
        description: `${type} notifications ${value ? 'enabled' : 'disabled'}.`,
      });
      return { ...prev, [type]: value };
    });
  };

  const handleUploadLogo = async (file: File) => {
    const maxSize = 2 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > maxSize) {
      toast({
        title: 'Invalid file',
        description: 'Use JPG/PNG/GIF/WebP up to 2MB.',
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
      const newLogoUrl = updatedUser.logo ? `${updatedUser.logo}${updatedUser.logo.includes('?') ? '&' : '?'}t=${logoVersion}` : '';
      setLogoUrl(newLogoUrl);
      toast({
        title: 'Logo updated',
        description: 'Your cabinet logo has been updated successfully.',
      });
    } catch (error) {
      setLogoUrl(user?.logo || '');
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 403) {
          toast({
            title: 'Access denied',
            description: 'Only the cabinet owner can update the logo.',
            variant: 'destructive',
          });
          return;
        }
        if (status === 404) {
          toast({
            title: 'Not found',
            description: 'Cabinet not found. Please contact support.',
            variant: 'destructive',
          });
          return;
        }
      }
      toast({
        title: 'Upload failed',
        description: 'We could not upload that logo. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLogoIsUploading(false);
      setTimeout(() => URL.revokeObjectURL(preview), 3000);
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Let teammates know who you are and how to reach you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
              <Avatar className="h-24 w-24 border-4 border-white shadow-sm ring-4 ring-jure-100 dark:border-slate-900">
                <AvatarImage src={photoUrl} alt="Profile" />
                <AvatarFallback className="bg-jure-600 text-lg font-semibold text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <label className="relative flex justify-center">
                  <input
                    type="file"
                    disabled={photoIsUploading}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleUploadPhoto(file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={photoIsUploading}>
                    <Upload className="h-4 w-4" />
                    {photoIsUploading ? 'Uploading…' : 'Change photo'}
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP — up to 5MB.</p>
              </div>
            </div>

            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    type="text"
                    {...profileForm.register('first_name')}
                    aria-invalid={!!profileForm.formState.errors.first_name}
                    className={cn(
                      profileForm.formState.errors.first_name &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  <FieldError msg={profileForm.formState.errors.first_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    {...profileForm.register('last_name')}
                    aria-invalid={!!profileForm.formState.errors.last_name}
                    className={cn(
                      profileForm.formState.errors.last_name && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  <FieldError msg={profileForm.formState.errors.last_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register('email')}
                    disabled
                    className="cursor-not-allowed bg-muted text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email can't be edited — contact support if something looks wrong.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div
                    className={cn(
                      'rounded-lg border border-input bg-background p-1',
                      profileForm.formState.errors.phone && 'border-destructive ring-1 ring-destructive/20'
                    )}
                  >
                    <PhoneInput
                      id="phone"
                      value={profileForm.watch('phone')}
                      onChange={(value) => profileForm.setValue('phone', value || '', { shouldValidate: true })}
                      defaultCountry="US"
                      placeholder="Enter phone number"
                      className="w-full"
                    />
                  </div>
                  <FieldError msg={profileForm.formState.errors.phone?.message} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  {...profileForm.register('bio')}
                  aria-invalid={!!profileForm.formState.errors.bio}
                  className={cn(
                    'resize-none',
                    profileForm.formState.errors.bio && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Share a short intro so colleagues know how you support clients."
                />
                <FieldError msg={profileForm.formState.errors.bio?.message} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">Changes sync instantly across the workspace.</p>
                <Button
                  type="submit"
                  className="bg-jure-600 text-white hover:bg-jure-700"
                  disabled={profileForm.formState.isSubmitting}
                >
                  <Save className="h-4 w-4" />
                  {profileForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Organization Details */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Manage your cabinet or organization information and branding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[240px,1fr]">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
              {logoUrl ? (
                <img
                  key={logoUrl}
                  src={logoUrl}
                  alt="Cabinet logo"
                  className="h-24 w-24 rounded-lg object-contain border-4 border-white shadow-sm ring-4 ring-jure-100 dark:border-slate-900"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg border-4 border-white shadow-sm ring-4 ring-jure-100 dark:border-slate-900 bg-muted flex items-center justify-center">
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <label className="relative flex justify-center">
                  <input
                    type="file"
                    disabled={logoIsUploading}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleUploadLogo(file);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={logoIsUploading}>
                    <Upload className="h-4 w-4" />
                    {logoIsUploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP — up to 2MB.</p>
              </div>
            </div>

            <form onSubmit={cabinetForm.handleSubmit(handleCabinetInfoSubmit)} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trade_name">Trade Name</Label>
                  <Input
                    id="trade_name"
                    type="text"
                    {...cabinetForm.register('trade_name')}
                    aria-invalid={!!cabinetForm.formState.errors.trade_name}
                    className={cn(
                      cabinetForm.formState.errors.trade_name &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    placeholder="Cabinet name"
                  />
                  <FieldError msg={cabinetForm.formState.errors.trade_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firm_name">Firm Name</Label>
                  <Input
                    id="firm_name"
                    type="text"
                    {...cabinetForm.register('firm_name')}
                    aria-invalid={!!cabinetForm.formState.errors.firm_name}
                    className={cn(
                      cabinetForm.formState.errors.firm_name &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    placeholder="Firm name"
                  />
                  <FieldError msg={cabinetForm.formState.errors.firm_name?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="structure_type">Structure Type</Label>
                  <Input
                    id="structure_type"
                    type="text"
                    {...cabinetForm.register('structure_type')}
                    aria-invalid={!!cabinetForm.formState.errors.structure_type}
                    className={cn(
                      cabinetForm.formState.errors.structure_type &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    placeholder="e.g., LLC, Partnership"
                  />
                  <FieldError msg={cabinetForm.formState.errors.structure_type?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_size">Team Size</Label>
                  <Input
                    id="team_size"
                    type="text"
                    {...cabinetForm.register('team_size')}
                    aria-invalid={!!cabinetForm.formState.errors.team_size}
                    className={cn(
                      cabinetForm.formState.errors.team_size &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    placeholder="e.g., 1-10, 11-50"
                  />
                  <FieldError msg={cabinetForm.formState.errors.team_size?.message} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  rows={3}
                  {...cabinetForm.register('business_address')}
                  aria-invalid={!!cabinetForm.formState.errors.business_address}
                  className={cn(
                    'resize-none',
                    cabinetForm.formState.errors.business_address && 'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="Enter your business address"
                />
                <FieldError msg={cabinetForm.formState.errors.business_address?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  {...cabinetForm.register('website')}
                  aria-invalid={!!cabinetForm.formState.errors.website}
                  className={cn(
                    cabinetForm.formState.errors.website &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                  placeholder="https://example.com"
                />
                <FieldError msg={cabinetForm.formState.errors.website?.message} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">Changes sync instantly across the workspace.</p>
                <Button
                  type="submit"
                  className="bg-jure-600 text-white hover:bg-jure-700"
                  disabled={cabinetForm.formState.isSubmitting}
                >
                  <Save className="h-4 w-4" />
                  {cabinetForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotificationSettings = () => (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Select how we reach you when something changes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {([
          ['email', 'Email notifications', 'Receive summaries, updates, and billing alerts.', Mail],
          ['push', 'Push notifications', 'Get instant updates on urgent case activity.', Bell],
          ['sms', 'SMS notifications', 'Receive text messages for high-priority events.', Phone],
          ['desktop', 'Desktop notifications', 'Show desktop alerts when the app is open.', Monitor],
        ] as const).map(([key, title, desc, Icon]) => {
          const typedKey = key as NotificationKey;
          return (
            <Card key={key} className="border border-border/60 bg-muted/10 shadow-none">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-1 rounded-md bg-jure-50 p-2 text-jure-600 dark:bg-jure-600/10 dark:text-jure-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={notifications[typedKey]}
                  onCheckedChange={(value) => handleNotificationToggle(typedKey, value)}
                  aria-label={title}
                  className="ml-auto"
                />
              </CardContent>
            </Card>
          );
        })}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span>Weekly summaries keep everyone aligned.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({
                title: 'Digest enabled',
                description: 'You will receive a weekly summary every Monday.',
              })
            }
          >
            Enable digest
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">Fine-tune alerts per project inside workspace settings.</p>
          <Button
            onClick={() =>
              toast({
                title: 'Preferences saved',
                description: 'Your notification preferences were updated.',
              })
            }
            className="bg-jure-600 text-white hover:bg-jure-700"
          >
            <Save className="h-4 w-4" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Security & privacy</CardTitle>
        <CardDescription>Update your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={securityForm.handleSubmit(handleSecuritySubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="old_password">Current password</Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showPassword ? 'text' : 'password'}
                {...securityForm.register('old_password')}
                aria-invalid={!!securityForm.formState.errors.old_password}
                className={cn(
                  'pr-10',
                  securityForm.formState.errors.old_password &&
                    'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError msg={securityForm.formState.errors.old_password?.message} />
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="new_password1">New password</Label>
            <div className="relative">
              <Input
                id="new_password1"
                type={showNewPassword ? 'text' : 'password'}
                {...securityForm.register('new_password1')}
                aria-invalid={!!securityForm.formState.errors.new_password1}
                className={cn(
                  'pr-10',
                  securityForm.formState.errors.new_password1 &&
                    'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="Create a new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError msg={securityForm.formState.errors.new_password1?.message} />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              Use at least 8 characters, including letters and numbers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password2">Confirm new password</Label>
            <div className="relative">
              <Input
                id="new_password2"
                type={showConfirmPassword ? 'text' : 'password'}
                {...securityForm.register('new_password2')}
                aria-invalid={!!securityForm.formState.errors.new_password2}
                className={cn(
                  'pr-10',
                  securityForm.formState.errors.new_password2 &&
                    'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="Retype the new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError msg={securityForm.formState.errors.new_password2?.message} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="h-4 w-4" />
              Two-factor authentication is coming soon for extra protection.
            </div>
            <Button
              type="submit"
              disabled={securityForm.formState.isSubmitting}
              className="bg-jure-600 text-white hover:bg-jure-700"
            >
              <Save className="h-4 w-4" />
              {securityForm.formState.isSubmitting ? 'Updating…' : 'Update security'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderAppearance = () => (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose a visual style that feels comfortable all day long.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {([
          { id: 'light', title: 'Light theme', desc: 'Bright surfaces and crisp contrast.' },
          { id: 'dark', title: 'Dark theme', desc: 'Dim surfaces suited for late hours.' },
          { id: 'system', title: 'Match system', desc: 'Follow your device appearance.' },
        ] as { id: ThemeChoice; title: string; desc: string }[]).map(({ id, title, desc }) => {
          const active = themeChoice === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                'group h-full rounded-2xl border p-5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-jure-400',
                active
                  ? 'border-jure-300 bg-jure-50 shadow-[0_0_0_4px_rgba(100,73,157,0.08)] dark:bg-jure-600/20'
                  : 'border-border/70 hover:border-jure-300 hover:bg-muted/40'
              )}
              aria-pressed={active}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                </div>
                {active ? (
                  <CheckCircle2 className="h-5 w-5 text-jure-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border" />
                )}
              </div>
              <div className="mt-4 h-20 rounded-lg border border-dashed border-border/80 bg-gradient-to-br from-background to-muted/40 dark:from-slate-900 dark:to-slate-950" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );

  const renderLanguage = () => {
    const currentName = t.common.languageNames[lang];

    return (
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>{t.settings.languageSectionTitle}</CardTitle>
          <CardDescription>{t.settings.languageSectionDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-jure-50 p-3 text-jure-600 dark:bg-jure-600/10 dark:text-jure-200">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t.settings.languageCurrentLabel(currentName)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settings.languageHint}
                </p>
              </div>
            </div>
            <LangSwitcher />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            {Languages.options.map(option => (
              <div
                key={option.value}
                className={cn(
                  'rounded-xl border px-4 py-3 flex flex-col gap-1',
                  option.value === lang
                    ? 'border-jure-300 bg-jure-50 text-foreground'
                    : 'border-border bg-background'
                )}
              >
                <span className="font-medium">
                  {t.common.languageNames[option.value as typeof lang]}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {option.country}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderData = () => (
    <Card className="border border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Data management</CardTitle>
        <CardDescription>Control what you keep, download, or remove from Jure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
          <Database className="mx-auto mb-3 h-6 w-6 text-jure-500" />
          <p className="text-sm font-medium text-foreground">Self-serve exports are on the roadmap.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We're adding secure exports, retention policies, and redaction shortly. Let us know what you need first.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">Our team can assist with structured exports today.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast({
                title: 'Request sent',
                description: 'A support specialist will reach out about your data export.',
              })
            }
          >
            Request help
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-16">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-jure-700 via-jure-600 to-jure-500 text-white shadow-lg">
        <div className="absolute inset-0 opacity-60 mix-blend-overlay">
          <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 right-[-40px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
              Account
            </span>
            <div>
              <h1 className="text-3xl font-semibold md:text-4xl">Settings & Preferences</h1>
              <p className="mt-2 text-sm text-white/80">
                Tailor Jure to match how your team collaborates. Personalize your profile, tighten security,
                and choose the updates you care about most.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate('/profile')}
                className="bg-white text-jure-700 hover:bg-white/90"
              >
                View profile
              </Button>
              <Button
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() =>
                  toast({
                    title: 'Need a hand?',
                    description: 'Our support team will follow up shortly.',
                  })
                }
              >
                Contact support
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-5 text-left shadow-inner backdrop-blur">
            <Avatar className="h-14 w-14 border-4 border-white/40">
              <AvatarImage src={photoUrl} alt="Profile" />
              <AvatarFallback className="bg-jure-500 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">
                {user?.first_name || user?.last_name
                  ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
                  : 'Your account'}
              </p>
              <p className="text-xs text-white/70">{user?.email || 'No email on file yet'}</p>
              <p className="mt-1 text-xs text-white/70">Signed in • {user ? 'Active now' : 'Offline'}</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as typeof activeSection)}
        className="flex flex-col gap-6 lg:flex-row"
      >
        <TabsList className="flex h-auto w-full flex-row gap-2 overflow-x-auto rounded-3xl border border-border/60 bg-background/60 p-3 sm:p-4 lg:w-[260px] lg:flex-col lg:overflow-visible scrollbar-thin">
          {settingSections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  'h-auto min-w-[9.5rem] sm:min-w-0 w-auto sm:w-full flex-none flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition-all lg:flex-none',
                  active
                    ? 'border-jure-300 bg-jure-50 text-jure-700 shadow-sm ring-2 ring-jure-200 dark:bg-jure-600/15 dark:text-jure-100'
                    : 'border-transparent bg-transparent text-muted-foreground hover:border-jure-200 hover:bg-muted/40'
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border bg-white',
                      active ? 'border-jure-200 text-jure-600' : 'border-border text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 space-y-10">
          <TabsContent value="profile">{renderProfileSettings()}</TabsContent>
          <TabsContent value="notifications">{renderNotificationSettings()}</TabsContent>
          <TabsContent value="security">{renderSecuritySettings()}</TabsContent>
          <TabsContent value="appearance">{renderAppearance()}</TabsContent>
          <TabsContent value="language">{renderLanguage()}</TabsContent>
          <TabsContent value="data">{renderData()}</TabsContent>
          <TabsContent value="roles"><RoleManagement /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
