import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Building2, Landmark } from 'lucide-react';
import {
  PRACTICE_TYPE_VALUES,
  createSignupStepSchemas,
  type SignUpData,
} from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';
import { signupChoiceClass } from './signupUi';
import SignupActions from './SignupActions';

interface PracticeTypeStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const PracticeTypeStep = ({ onNext, onPrev, form }: PracticeTypeStepProps) => {
  const { toast } = useToast();
  const { t } = useAppTranslation();
  const s = t.auth.signup.practice;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const selected = form.watch('practice_type');

  const options = [
    {
      value: PRACTICE_TYPE_VALUES[0],
      title: t.auth.signup.practiceTypes.lawOffice,
      description: s.lawOfficeHint,
      icon: Landmark,
    },
    {
      value: PRACTICE_TYPE_VALUES[1],
      title: t.auth.signup.practiceTypes.lawFirm,
      description: s.lawFirmHint,
      icon: Building2,
    },
  ] as const;

  const onSubmit = async () => {
    try {
      schemas.stepPracticeSchema.validateSync(form.getValues());
      onNext();
    } catch {
      form.trigger('practice_type');
      toast({
        title: t.auth.signup.toasts.errorTitle,
        description: t.auth.signup.toasts.checkFields,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const active = selected === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => form.setValue('practice_type', opt.value, { shouldValidate: true })}
              className={signupChoiceClass(active)}
            >
              <Icon className="mb-3 h-7 w-7 text-[#64499D] dark:text-[#CFC2FF]" />
              <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{opt.title}</div>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{opt.description}</p>
            </button>
          );
        })}
      </div>

      {form.formState.errors.practice_type && (
        <p className="mt-3 text-center text-sm text-red-600">{form.formState.errors.practice_type.message}</p>
      )}

      <SignupActions
        onNext={onSubmit}
        nextLabel={s.continue}
        onPrev={onPrev}
        backLabel={s.back}
        nextDisabled={!selected}
      />
    </div>
  );
};

export default PracticeTypeStep;
