import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { useAppTranslation } from '@/i18n';
import SignupActions from './SignupActions';

interface ConsentStepProps {
  onNext: () => void;
  onPrev: () => void;
  setStep: (step: number) => void;
  form: UseFormReturn<SignUpData>;
}

const ConsentStep = ({ onNext, onPrev, form }: ConsentStepProps) => {
  const { t } = useAppTranslation();
  const s = t.auth.signup.consent;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);

  const { watch, setValue, formState: { errors }, trigger } = form;
  const watchedAcceptTerms = watch('accept_terms');
  const watchedAcceptDataProcessing = watch('accept_data_processing');

  const onContinue = () => {
    try {
      schemas.step5ValidationSchema.validateSync(form.getValues());
    } catch {
      void trigger(Object.keys(schemas.step5ValidationSchema.fields) as (keyof SignUpData)[]);
      return;
    }
    onNext();
  };

  return (
    <div className="animate-fade-in space-y-2.5">
      <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-zinc-800/60">
        <div className="flex items-start gap-3">
          <Checkbox
            id="accept_terms"
            checked={watchedAcceptTerms}
            onCheckedChange={(checked) => setValue('accept_terms', checked as boolean)}
            className="mt-0.5 data-[state=checked]:bg-[#2949e8]"
          />
          <div className="flex-1">
            <Label htmlFor="accept_terms" className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              {s.termsLabel}{' '}
              <a href="/terms" target="_blank" className="font-semibold text-[#2949e8] hover:underline dark:text-[#b968ff]" rel="noreferrer">
                {s.termsLink}
              </a>{' '}
              ·{' '}
              <a href="/privacy" target="_blank" className="font-semibold text-[#2949e8] hover:underline dark:text-[#b968ff]" rel="noreferrer">
                {s.privacyLink}
              </a>{' '}
              *
            </Label>
            {errors.accept_terms && (
              <p className="mt-1 text-sm text-red-600">{errors.accept_terms.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="accept_data_processing"
            checked={watchedAcceptDataProcessing}
            onCheckedChange={(checked) => setValue('accept_data_processing', checked as boolean)}
            className="mt-0.5 data-[state=checked]:bg-[#2949e8]"
          />
          <div className="flex-1">
            <Label htmlFor="accept_data_processing" className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              {s.dataProcessingLabel} *
            </Label>
            {errors.accept_data_processing && (
              <p className="mt-1 text-sm text-red-600">{errors.accept_data_processing.message}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t.auth.signup.verification.reviewBody}
      </p>

      <SignupActions
        onNext={onContinue}
        nextLabel={t.auth.signup.organization.continue}
        onPrev={onPrev}
        backLabel={s.back}
        nextDisabled={!watchedAcceptTerms || !watchedAcceptDataProcessing}
      />
    </div>
  );
};

export default ConsentStep;
