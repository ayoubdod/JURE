import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Home, Mail, Lock, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiLoginUser } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import clsx from 'clsx';
import { useTheme } from '@/hooks/useTheme';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';

interface SignInFormData {
  email: string;
  password: string;
}

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeChoice } = useTheme();
  const isDarkMode = themeChoice === 'dark' || (themeChoice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const { t } = useAppTranslation();

  // Handle verified parameter
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast({
        title: t.auth.emailVerifiedTitle,
        description: t.auth.emailVerifiedDescription,
      });
      // Clean URL
      navigate('/signin', { replace: true });
    }
  }, [searchParams, toast, navigate]);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">

      <div className="w-full max-w-md">
        {/* Logo + language */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            <img
              src="./public/images/Jure logo.png"
              alt="Jure logo"
              className="w-22 h-20 mx-auto object-contain"
            />
          </div>
          <div className="ml-4">
            <LangSwitcher />
          </div>
        </div>

        <Card className="rounded-xl shadow-xl bg-card text-card-foreground">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">{t.auth.signInTitle}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t.auth.signInSubtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t.auth.emailOrPhoneLabel}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder={t.auth.emailOrPhonePlaceholder}
                    {...register('email', {
                      required: t.auth.emailRequired,
                    })}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label>{t.auth.passwordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder={t.auth.passwordPlaceholder}
                    {...register('password', {
                      required: 'Mot de passe requis',
                    })}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#64499d] hover:bg-gradient-to-r hover:from-[#64499d] hover:to-[#8a6ccf] text-white font-semibold transition-colors duration-300"
              >
                {t.auth.signInButton}
                <ArrowRight className="h-4 w-4" />
              </Button>

            </form>

            <div className="text-sm text-center space-y-2">
              <Link
                to="/forgot-password"
                className="hover:underline text-primary"
              >
                {t.auth.forgotPassword}
              </Link>
              <div>
                {t.auth.noAccount}{' '}
                <Link
                  to="/signup"
                  className="font-medium hover:underline text-primary"
                >
                  {t.auth.signUp}
                </Link>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className={clsx('px-2', isDarkMode ? 'bg-[#181b23] text-gray-400' : 'bg-white text-gray-500')}>
                      {t.auth.or}
                    </span>
                  </div>
                </div>
                {/* <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-3">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
                  Continuer avec Google
                </Button> */}
              </div>
            </div>

            <div className="text-center pt-4">
              <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                <Home className="w-4 h-4" />
                {t.auth.backToHome}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
          © 2025 Jure. {t.auth.footerRights}
        </div>
      </div>
    </div>
  );
};

export default SignIn;
