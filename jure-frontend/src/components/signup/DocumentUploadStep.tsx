import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';
import { signupInputClass } from './signupUi';
import SignupActions from './SignupActions';
import SignupFieldRow from './SignupFieldRow';
import { cn } from '@/lib/utils';

interface OrganizationDetailsStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const OrganizationDetailsStep = ({ onNext, onPrev, form }: OrganizationDetailsStepProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.organization;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const { watch, setValue, register, formState: { errors }, trigger } = form;

  const employeeCountOptions = [
    { label: t.auth.signup.teamSizes.justMe, value: '1' },
    { label: t.auth.signup.teamSizes.twoToFive, value: '5' },
    { label: t.auth.signup.teamSizes.sixToTen, value: '10' },
    { label: t.auth.signup.teamSizes.elevenToTwenty, value: '20' },
    { label: t.auth.signup.teamSizes.twentyOneToFifty, value: '50' },
    { label: t.auth.signup.teamSizes.moreThanFifty, value: '100' },
  ];

  const onSubmit = async () => {
    try {
      schemas.step4ValidationSchema.validateSync(form.getValues());
      onNext();
    } catch {
      trigger(Object.keys(schemas.step4ValidationSchema.fields) as (keyof SignUpData)[]);
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.checkFields,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-2.5">
      <SignupFieldRow id="team_size" label={s.teamSize} error={errors.team_size?.message}>
        <Select value={watch('team_size')} onValueChange={(value) => setValue('team_size', value)}>
          <SelectTrigger className={cn(signupInputClass(!!errors.team_size), 'w-full justify-between')}>
            <SelectValue placeholder={s.teamPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {employeeCountOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SignupFieldRow>

      <SignupFieldRow id="website" label={s.website} error={errors.website?.message}>
        <Input
          id="website"
          {...register('website')}
          placeholder={s.websitePlaceholder}
          className={signupInputClass(!!errors.website)}
        />
      </SignupFieldRow>

      <SignupActions onNext={onSubmit} nextLabel={s.continue} onPrev={onPrev} backLabel={s.back} />
    </div>
  );
};

export default OrganizationDetailsStep;
