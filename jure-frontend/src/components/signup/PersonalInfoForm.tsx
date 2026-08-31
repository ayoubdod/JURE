import React, { useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PasswordRequirements } from './PasswordValidation';
import { Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '../ui/phone-input';
import { CountrySelect, CountrySelectProps } from '../ui/country-select';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';
import { signupInputClass } from './signupUi';
import SignupActions from './SignupActions';
import SignupFieldRow from './SignupFieldRow';

interface PersonalInfoFormProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoForm = ({ onNext, onPrev, form }: PersonalInfoFormProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.personal;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const { register, watch, setValue, formState: { errors }, trigger } = form;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    <div className="animate-fade-in space-y-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <SignupFieldRow id="first_name" label={s.firstName} error={errors.first_name?.message}>
          <Input id="first_name" {...register('first_name')} className={signupInputClass(!!errors.first_name)} />
        </SignupFieldRow>
        <SignupFieldRow id="last_name" label={s.lastName} error={errors.last_name?.message}>
          <Input id="last_name" {...register('last_name')} className={signupInputClass(!!errors.last_name)} />
        </SignupFieldRow>
      </div>

      <SignupFieldRow id="country" label={s.country} error={errors.country?.message}>
        <CountrySelect
          value={watch('country') as CountrySelectProps['value']}
          placeholder={s.countryPlaceholder}
          onChange={(value) => {
            setValue('country', value);
            trigger('country');
          }}
          className={`${signupInputClass(!!errors.country)} min-w-0 w-full justify-between overflow-hidden font-normal`}
        />
      </SignupFieldRow>

      <SignupFieldRow id="phone" label={s.phone} error={errors.phone?.message}>
        <div className={`flex w-full min-w-0 rounded-xl bg-slate-100 dark:bg-zinc-800 ${errors.phone ? 'ring-2 ring-red-400' : ''}`}>
          <PhoneInput
            id="phone"
            value={watch('phone')}
            onChange={(value) => {
              setValue('phone', value);
              trigger('phone');
            }}
            defaultCountry="MA"
            className="h-10 w-full min-w-0"
          />
        </div>
      </SignupFieldRow>

      <SignupFieldRow id="email" label={s.email} error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          placeholder={s.emailPlaceholder}
          {...register('email')}
          className={signupInputClass(!!errors.email)}
        />
      </SignupFieldRow>

      <SignupFieldRow id="password" label={s.password} error={errors.password1?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder={s.passwordPlaceholder}
            {...register('password1')}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            className={`${signupInputClass(!!errors.password1)} pe-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </SignupFieldRow>
      {(passwordFocused || errors.password1) && (
        <div className="ms-[7.375rem]">
          <PasswordRequirements />
        </div>
      )}

      <SignupFieldRow id="confirm_password" label={s.confirmPassword} error={errors.password2?.message}>
        <div className="relative">
          <Input
            id="confirm_password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={s.passwordPlaceholder}
            {...register('password2')}
            className={`${signupInputClass(!!errors.password2)} pe-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </SignupFieldRow>

      <SignupActions onNext={onSubmit} nextLabel={s.continue} onPrev={onPrev} backLabel={t.auth.signup.practice.back} />
    </div>
  );
};

export default PersonalInfoForm;
