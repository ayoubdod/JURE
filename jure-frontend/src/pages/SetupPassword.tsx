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
      setSuccessMessage('Password set successfully. You can now sign in.');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        setErrorMessage(typeof detail === 'string' ? detail : detail?.[0] || 'An error occurred.');
      } else {
        setErrorMessage('An error occurred. Please try again.');
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
                src="/images/Jure logo.png"
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
              <CardTitle className="text-2xl">Setup Password</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Invalid or missing link. Please use the link from your invitation email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="text-center pt-4">
                <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                  <Home className="w-4 h-4" />
                  Back to home
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            © 2025 Jure. All rights reserved.
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
              src="/images/Jure logo.png"
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
            <CardTitle className="text-2xl">Setup Password</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Set your password to complete your account setup
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
                <Label>New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    })}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label>Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === watch('password') || 'Passwords do not match',
                    })}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
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
                {isSubmitting ? 'Setting...' : 'Set password'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-center pt-4">
              <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                <Home className="w-4 h-4" />
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
          © 2025 Jure. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
