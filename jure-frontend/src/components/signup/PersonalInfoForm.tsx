import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router';
import { PasswordRequirements } from './PasswordValidation';
import { User, Phone, Mail, Lock, MapPin, LogIn, Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '../ui/phone-input';
import { CountrySelect, CountrySelectProps } from '../ui/country-select';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';

interface PersonalInfoFormProps {
  onNext: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoForm = ({ onNext, form }: PersonalInfoFormProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.personal;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);

  const { register, watch, setValue, formState: { errors }, trigger } = form;

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const onSubmit = async () => {
    try {
      try {
        schemas.step1ValidationSchema.validateSync(form.getValues());
        onNext();
      } catch {
        trigger(Object.keys(schemas.step1ValidationSchema.fields) as (keyof SignUpData)[]);
      }
    } catch {
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.validationError,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl mb-4 shadow-lg">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-slate-100 mb-2">
          {s.headerTitle}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {s.headerSubtitle}
        </p>
      </div>

      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent rounded-t-lg border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <CardTitle className="text-xl font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
            {s.cardTitle}
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {s.cardDescription}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.identitySection}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.firstName}
                  </Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 ${
                      errors.first_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.lastName}
                  </Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 ${
                      errors.last_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.contactSection}
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.country}
                  </Label>
                  <CountrySelect
                    value={watch('country') as CountrySelectProps['value']}
                    onChange={(value) => {
                      setValue('country', value);
                      trigger('country');
                    }}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.phone}
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={watch('phone')}
                    onChange={(value) => {
                      setValue('phone', value);
                      trigger('phone');
                    }}
                    defaultCountry="MA"
                    className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 ${
                      errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.email}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={s.emailPlaceholder}
                    {...register('email')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.securitySection}
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.password}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={s.passwordPlaceholder}
                      {...register('password1')}
                      className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 pr-12 ${
                        errors.password1 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordRequirements />
                  {errors.password1 && (
                    <p className="text-sm text-red-600 mt-1">{errors.password1.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    {s.confirmPassword}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={s.passwordPlaceholder}
                      {...register('password2')}
                      className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-slate-300 dark:border-slate-600 dark:border-slate-600 h-12 pr-12 ${
                        errors.password2 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password2 && (
                    <p className="text-sm text-red-600 mt-1">{errors.password2.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[#64499D]/10 dark:border-[#8B6FD1]/20">
              <div className="order-2 sm:order-1">
                <Link
                  to="/signin"
                  className="inline-flex items-center text-sm text-[#64499D] dark:text-[#CFC2FF] hover:text-[#4D3680] dark:hover:text-[#E9E0FF] font-medium transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {s.alreadyHaveAccount} {s.signIn}
                </Link>
              </div>

              <Button
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
              >
                {s.continue}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <div className="inline-flex items-center px-4 py-2 bg-[#F4F1FF]/80 dark:bg-[#64499D]/20 rounded-full ring-1 ring-[#64499D]/15 dark:ring-[#8B6FD1]/25">
          <div className="w-2 h-2 bg-[#64499D] rounded-full mr-2"></div>
          <span className="text-sm text-[#64499D] dark:text-[#CFC2FF] font-medium">
            {s.stepIndicator}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;
