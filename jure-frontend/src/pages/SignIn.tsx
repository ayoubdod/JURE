import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Home, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiLoginUser } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';
import AuthShell from '@/components/landing/AuthShell';

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
  }, [searchParams, toast, navigate, t.auth.emailVerifiedTitle, t.auth.emailVerifiedDescription]);

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
    <AuthShell homeLabel={t.auth.backToHome}>
      <div className="w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            JURE
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.auth.signInTitle}
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t.auth.signInSubtitle}
          </p>
        </div>

        <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20 overflow-hidden">
          <CardHeader className="text-center space-y-1 pb-2 sr-only">
            <CardTitle>{t.auth.signInTitle}</CardTitle>
            <CardDescription>{t.auth.signInSubtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-200">{t.auth.emailOrPhoneLabel}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64499D]/60 dark:text-[#8B6FD1]" />
                  <Input
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    placeholder={t.auth.emailOrPhonePlaceholder}
                    {...register('email', {
                      required: t.auth.emailRequired,
                    })}
                    className="pl-10 h-11 bg-white/70 dark:bg-slate-900/50 border-[#64499D]/20 dark:border-[#8B6FD1]/30 focus-visible:ring-[#64499D]"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-200">{t.auth.passwordLabel}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64499D]/60 dark:text-[#8B6FD1]" />
                  <Input
                    type="password"
                    placeholder={t.auth.passwordPlaceholder}
                    {...register('password', {
                      required: 'Mot de passe requis',
                    })}
                    className="pl-10 h-11 bg-white/70 dark:bg-slate-900/50 border-[#64499D]/20 dark:border-[#8B6FD1]/30 focus-visible:ring-[#64499D]"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white font-semibold shadow-lg hover:shadow-[0_0_28px_-6px_rgba(100,73,157,0.55)] transition-all duration-300"
              >
                {t.auth.signInButton}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-sm text-center space-y-3">
              <Link
                to="/forgot-password"
                className="hover:underline text-[#64499D] dark:text-[#CFC2FF]"
              >
                {t.auth.forgotPassword}
              </Link>
              <div>
                <span className="text-slate-600 dark:text-slate-300">{t.auth.noAccount}{' '}</span>
                <Link
                  to="/signup"
                  className="font-medium hover:underline text-[#64499D] dark:text-[#CFC2FF]"
                >
                  {t.auth.signUp}
                </Link>
              </div>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="bg-[#64499D]/15 dark:bg-[#8B6FD1]/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-white/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400">
                    {t.auth.or}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center pt-1 sm:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-[#64499D] dark:hover:text-[#CFC2FF]"
              >
                <Home className="w-4 h-4" />
                {t.auth.backToHome}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} JURE. {t.auth.footerRights}
        </div>
      </div>
    </AuthShell>
  );
};

export default SignIn;
