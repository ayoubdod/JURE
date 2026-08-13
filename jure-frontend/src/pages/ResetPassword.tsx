import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Home, Lock, ArrowRight, Sun, Moon, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiResetPasswordConfirm } from '@/services/auth/api';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';
import clsx from 'clsx';

interface ResetPasswordFormData {
  new_password1: string;
  new_password2: string;
}

const ResetPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, apiError } = useAppTranslation();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark'
  );
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const token = searchParams.get('token');
  const uuid = searchParams.get('uuid');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !uuid) {
      toast({
        title: t.common.error,
        description: t.auth.resetInvalidTokenDescription,
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiResetPasswordConfirm({
        new_password1: data.new_password1,
        new_password2: data.new_password2,
        token: token,
        uuid: uuid,
      });

      toast({
        title: t.auth.resetSuccessTitle,
        description: t.auth.resetSuccessDescription,
      });

      navigate('/signin');
    } catch (error) {
      let errorMessage = t.auth.resetErrorDescription;
      if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') errorMessage = apiError(data, errorMessage);
        else {
          const msg = data?.token?.[0] ?? data?.uid?.[0] ?? data?.non_field_errors?.[0] ?? data?.detail;
          if (typeof msg === 'string') errorMessage = apiError(msg, errorMessage);
        }
      }
      toast({
        title: t.common.error,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const shell = (body: React.ReactNode) => (
    <div className={clsx('min-h-screen flex items-center justify-center p-4', isDarkMode ? 'bg-[#0f1117]' : 'bg-white dark:bg-slate-950')}>
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <LangSwitcher />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label={t.common.toggleTheme}
        >
          {isDarkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-slate-800 dark:text-slate-100" />}
        </Button>
      </div>
      {body}
    </div>
  );

  if (!token || !uuid) {
    return shell(
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <img
            src="/images/jure-logo.png"
            alt="Jure logo"
            className="w-22 h-20 mx-auto object-contain"
          />
        </div>

        <Card className={clsx('rounded-xl shadow-xl', isDarkMode ? 'bg-[#181b23] text-white' : 'bg-white dark:bg-slate-950 text-black')}>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">{t.auth.resetInvalidTokenTitle}</CardTitle>
            <CardDescription className={clsx('text-sm', isDarkMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400')}>
              {t.auth.resetInvalidTokenDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <p className={clsx('text-sm', isDarkMode ? 'text-red-400' : 'text-red-600')}>
              {t.auth.resetRequestNewLink}
            </p>

            <Link
              to="/forgot-password"
              className={clsx('inline-flex items-center gap-2 hover:underline', isDarkMode ? 'text-purple-300' : 'text-purple-600')}
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t.auth.resetRequestNewLink}
            </Link>

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
    );
  }

  return shell(
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <img
          src="/images/jure-logo.png"
          alt="Jure logo"
          className="w-22 h-20 mx-auto object-contain"
        />
      </div>

      <Card className={clsx('rounded-xl shadow-xl', isDarkMode ? 'bg-[#181b23] text-white' : 'bg-white dark:bg-slate-950 text-black')}>
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">{t.auth.resetTitle}</CardTitle>
          <CardDescription className={clsx('text-sm', isDarkMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400')}>
            {t.auth.resetSubtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>{t.auth.resetNewPasswordLabel}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type={showPassword1 ? 'text' : 'password'}
                  placeholder={t.auth.resetNewPasswordLabel}
                  {...register('new_password1', {
                    required: t.validation.required,
                    minLength: {
                      value: 8,
                      message: t.validation.passwordTooShort,
                    },
                  })}
                  className="ps-10 pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword1(!showPassword1)}
                >
                  {showPassword1 ? (
                    <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  )}
                </Button>
              </div>
              {errors.new_password1 && (
                <p className="text-sm text-red-500 mt-1">{errors.new_password1.message}</p>
              )}
            </div>

            <div>
              <Label>{t.auth.resetConfirmPasswordLabel}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type={showPassword2 ? 'text' : 'password'}
                  placeholder={t.auth.resetConfirmPasswordLabel}
                  {...register('new_password2', {
                    required: t.validation.required,
                    validate: (value) =>
                      value === watch('new_password1') || t.validation.passwordsDoNotMatch,
                  })}
                  className="ps-10 pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword2(!showPassword2)}
                >
                  {showPassword2 ? (
                    <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  )}
                </Button>
              </div>
              {errors.new_password2 && (
                <p className="text-sm text-red-500 mt-1">{errors.new_password2.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#64499d] hover:bg-gradient-to-r hover:from-[#64499d] hover:to-[#8a6ccf] text-white font-semibold transition-colors duration-300"
            >
              {isSubmitting ? t.auth.resetSubmitting : t.auth.resetSubmit}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </form>

          <div className="text-sm text-center space-y-2">
            <Link
              to="/signin"
              className={clsx('inline-flex items-center gap-2 hover:underline', isDarkMode ? 'text-purple-300' : 'text-purple-600')}
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t.auth.forgotBackToSignIn}
            </Link>
          </div>

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
  );
};

export default ResetPassword;
