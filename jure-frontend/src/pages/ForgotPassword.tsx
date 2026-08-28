import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Home, Mail, ArrowRight, Sun, Moon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiResetPassword } from '@/services/auth/api';
import { useAppTranslation } from '@/i18n';
import LangSwitcher from '@/components/common/LangSwitcher';
import { AuroraPage } from '@/components/common/AuroraBackground';
import clsx from 'clsx';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await apiResetPassword(data);

      toast({
        title: t.auth.forgotEmailSentTitle,
        description: t.auth.forgotEmailSentDescription,
      });

      navigate('/signin');
    } catch {
      toast({
        title: t.common.error,
        description: t.auth.forgotSendErrorDescription,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuroraPage className="flex items-center justify-center p-4">
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
            <CardTitle className="text-2xl">{t.auth.forgotTitle}</CardTitle>
            <CardDescription className={clsx('text-sm', isDarkMode ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400')}>
              {t.auth.forgotSubtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t.auth.emailLabel}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="email"
                    placeholder={t.auth.emailPlaceholder}
                    {...register('email', {
                      required: t.validation.required,
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t.validation.invalidEmail,
                      },
                    })}
                    className="ps-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#64499d] hover:bg-gradient-to-r hover:from-[#64499d] hover:to-[#8a6ccf] text-white font-semibold transition-colors duration-300"
              >
                {isSubmitting ? t.auth.forgotSending : t.auth.forgotSubmit}
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
    </AuroraPage>
  );
};

export default ForgotPassword;
