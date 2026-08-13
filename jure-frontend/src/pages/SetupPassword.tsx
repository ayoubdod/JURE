import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Home, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiSetupPassword } from '@/services/auth/api';
import clsx from 'clsx';
import { useTheme } from '@/hooks/useTheme';
import { isAxiosError } from 'axios';
import LangSwitcher from '@/components/common/LangSwitcher';
import { useAppTranslation } from '@/i18n';

interface SetupPasswordFormData {
  password: string;
  confirmPassword: string;
}

const SetupPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SetupPasswordFormData>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { themeChoice } = useTheme();
  const { t, apiError } = useAppTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDarkMode = themeChoice === 'dark' || (themeChoice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const token = searchParams.get('token');

  const onSubmit = async (data: SetupPasswordFormData) => {
    if (!token) return;
    setErrorMessage(null);

    try {
      await apiSetupPassword({ token, password: data.password });
      setSuccessMessage(t.auth.setupSuccess);
      setTimeout(() => navigate('/signin'), 2000);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        const raw = typeof detail === 'string' ? detail : detail?.[0];
        setErrorMessage(apiError(raw, t.auth.setupError));
      } else {
        setErrorMessage(t.auth.setupError);
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <img
                src="/images/jure-logo.png"
                alt="Jure logo"
                className="w-22 h-20 mx-auto object-contain"
              />
            </div>
            <div className="ms-4">
              <LangSwitcher />
            </div>
          </div>

          <Card className="rounded-xl shadow-xl bg-card text-card-foreground">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">{t.auth.setupTitle}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t.auth.setupInvalidLink}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="text-center pt-4">
                <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400')}>
                  <Home className="w-4 h-4" />
                  {t.auth.backToHome}
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500')}>
            © {new Date().getFullYear()} Jure. {t.auth.footerRights}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            <img
              src="/images/jure-logo.png"
              alt="Jure logo"
              className="w-22 h-20 mx-auto object-contain"
            />
          </div>
          <div className="ms-4">
            <LangSwitcher />
          </div>
        </div>

        <Card className="rounded-xl shadow-xl bg-card text-card-foreground">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">{t.auth.setupTitle}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t.auth.setupSubtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {successMessage && (
              <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
            )}

            {errorMessage && (
              <p className="text-sm text-red-500 dark:text-red-400">{errorMessage}</p>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t.auth.resetNewPasswordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.auth.resetNewPasswordLabel}
                    {...register('password', {
                      required: t.validation.required,
                      minLength: { value: 8, message: t.validation.passwordTooShort },
                    })}
                    className="ps-10 pe-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label>{t.auth.resetConfirmPasswordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t.auth.resetConfirmPasswordLabel}
                    {...register('confirmPassword', {
                      required: t.validation.required,
                      validate: (value) => value === watch('password') || t.validation.passwordsDoNotMatch,
                    })}
                    className="ps-10 pe-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#6D54B5] hover:bg-[#5a4699] text-white font-semibold transition-colors duration-300"
              >
                {isSubmitting ? t.auth.setupSubmitting : t.auth.setupSubmit}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </form>

            <div className="text-center pt-4">
              <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400')}>
                <Home className="w-4 h-4" />
                {t.auth.backToHome}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500')}>
          © {new Date().getFullYear()} Jure. {t.auth.footerRights}
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
