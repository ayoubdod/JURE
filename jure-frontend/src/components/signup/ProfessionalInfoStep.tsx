import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';
import { signupInputClass, signupTextareaClass } from './signupUi';
import SignupActions from './SignupActions';
import SignupFieldRow from './SignupFieldRow';

interface ProfessionalInfoStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const ProfessionalInfoStep = ({ onNext, onPrev, form }: ProfessionalInfoStepProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.profile;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const { register, watch, setValue, formState: { errors }, trigger } = form;
  const logoFile = watch('logo') as File | null;
  const { ref: logoRef, name: logoFieldName } = register('logo');

  const onSubmit = async () => {
    try {
      try {
        schemas.step2ValidationSchema.validateSync(form.getValues());
        onNext();
      } catch {
        trigger(Object.keys(schemas.step2ValidationSchema.fields) as (keyof SignUpData)[]);
      }
    } catch {
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.validationError,
        variant: 'destructive',
      });
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setValue('logo', file, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="animate-fade-in space-y-2.5">
      <SignupFieldRow id="trade_name" label={s.tradeName} error={errors.trade_name?.message}>
        <Input
          id="trade_name"
          {...register('trade_name', { required: true })}
          placeholder={s.tradeNamePlaceholder}
          className={signupInputClass(!!errors.trade_name)}
        />
      </SignupFieldRow>

      <SignupFieldRow id="business_address" label={s.address} error={errors.business_address?.message} align="start">
        <Textarea
          id="business_address"
          {...register('business_address')}
          placeholder={s.addressPlaceholder}
          className={`${signupTextareaClass(!!errors.business_address)} min-h-[72px]`}
        />
      </SignupFieldRow>

      <SignupFieldRow id="logo" label={s.logoSection} error={errors.logo?.message as string | undefined}>
        <div className="min-w-0 flex-1">
          <Input
            id="logo"
            type="file"
            accept="image/png,image/jpeg"
            name={logoFieldName}
            ref={logoRef}
            onChange={handleLogoChange}
            className={`${signupInputClass()} cursor-pointer file:me-3 file:border-0 file:bg-transparent file:text-sm file:font-medium`}
          />
          {logoFile && (
            <p className="mt-1 truncate text-xs text-slate-400">
              {s.logoSelected}: {logoFile.name} — {(logoFile.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </SignupFieldRow>

      <SignupActions onNext={onSubmit} nextLabel={s.continue} onPrev={onPrev} backLabel={s.back} />
    </div>
  );
};

export default ProfessionalInfoStep;
