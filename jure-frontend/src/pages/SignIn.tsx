import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiLoginUser } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { stampLastActivity } from '@/utils/idleSession';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';
import AuthSplitShell from '@/components/landing/AuthSplitShell';

interface SignInFormData {
  email: string;
  password: string;
}

const fieldClass =
  'h-11 rounded-xl border border-slate-200 bg-white px-3 text-[14px] shadow-none placeholder:text-slate-400 focus-visible:border-[#64499D] focus-visible:ring-2 focus-visible:ring-[#64499D]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100';

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useAppTranslation();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast({
        title: t.auth.emailVerifiedTitle,
        description: t.auth.emailVerifiedDescription,
      });
      navigate('/signin', { replace: true });
    }
  }, [searchParams, toast, navigate, t.auth.emailVerifiedTitle, t.auth.emailVerifiedDescription]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('jure-session-replaced') === '1') {
        sessionStorage.removeItem('jure-session-replaced');
        toast({
          title: t.sessionReplaced.title,
          description: t.sessionReplaced.description,
          variant: 'destructive',
        });
      }
    } catch {
      // ignore
    }
  }, [toast, t.sessionReplaced.title, t.sessionReplaced.description]);

  const getLoginErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error) || error.response?.status !== 400) return t.auth.loginErrorDescription;
    const data = error.response?.data;
    const nonField = data?.non_field_errors?.[0];
    if (typeof nonField === 'string') {
      if (nonField.includes("E-mail is not verified.") || nonField.includes("L'e-mail n'est pas vérifié.")) return t.auth.loginUnverifiedDescription;
      if (nonField.includes("Phone is not verified.")) return t.auth.loginPhoneUnverifiedDescription;
      if (nonField.includes("User account is disabled.")) return t.auth.loginAccountDisabledDescription;
      if (nonField.includes("Unable to log in with provided credentials.")) return t.auth.loginInvalidCredentialsDescription;
      return nonField;
    }
    const emailErr = data?.email?.[0];
    if (typeof emailErr === 'string') return emailErr;
    return t.auth.loginErrorDescription;
  };

  const onSubmit = async (data: SignInFormData) => {
    try {
      const res = await apiLoginUser(data);
      useUserStore.setState({
        accessToken: res.data.access,
        refreshToken: res.data.refresh,
        user: res.data.user,
        isLoggedIn: true,
      });
      stampLastActivity();
      toast({ title: t.auth.loginSuccessTitle, description: t.auth.loginSuccessDescription });
      navigate('/dashboard');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const msg = error.response?.data?.non_field_errors?.[0];
        const isEmailUnverified = typeof msg === 'string' && (msg.includes("E-mail is not verified.") || msg.includes("L'e-mail n'est pas vérifié."));
        if (isEmailUnverified) {
          localStorage.setItem('pendingVerificationEmail', data.email);
          toast({
            title: t.auth.loginUnverifiedTitle,
            description: t.auth.loginUnverifiedDescription,
            variant: 'destructive',
          });
          navigate('/verify-email-waiting', { state: { email: data.email } });
          return;
        }
      }
      toast({
        title: t.auth.loginErrorTitle,
        description: getLoginErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthSplitShell
      eyebrow={t.auth.signInHeroEyebrow}
      heading={t.auth.signInHeroTitle}
      footer={t.auth.signInHeroFooter}
    >
      <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white">
        {t.auth.signInTitle}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t.auth.signInSubtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email" className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
            {t.auth.emailOrPhoneLabel}
          </Label>
          <Input
            id="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder={t.auth.emailOrPhonePlaceholder}
            {...register('email', { required: t.auth.emailRequired })}
            className={`${fieldClass} mt-1.5`}
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              {t.auth.passwordLabel}
            </Label>
            <Link to="/forgot-password" className="text-xs font-medium text-[#64499D] hover:underline dark:text-[#CFC2FF]">
              {t.auth.forgotPassword}
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t.auth.passwordPlaceholder}
              {...register('password', { required: t.auth.passwordLabel })}
              className={`${fieldClass} pe-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={t.auth.passwordLabel}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-[#64499D] text-[15px] font-semibold text-white shadow-none hover:bg-[#4D3680]"
        >
          {t.auth.signInButton}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        {t.auth.noAccount}{' '}
        <Link to="/signup" className="font-semibold text-[#64499D] hover:underline dark:text-[#CFC2FF]">
          {t.auth.signUp}
        </Link>
      </p>
    </AuthSplitShell>
  );
};

export default SignIn;
