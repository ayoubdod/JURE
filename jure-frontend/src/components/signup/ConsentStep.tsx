/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { apiRegisterUser } from '@/services/auth/api';
import { useNavigate } from 'react-router';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';
import SignupActions from './SignupActions';

interface ConsentStepProps {
  onNext: () => void;
  onPrev: () => void;
  setStep: (step: number) => void;
  form: UseFormReturn<SignUpData>;
}

const ConsentStep = ({ onNext, onPrev, setStep, form }: ConsentStepProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const s = t.auth.signup.consent;
  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);

  const { watch, setValue, formState: { errors }, trigger, setError, setFocus } = form;
  const watchedAcceptTerms = watch('accept_terms');
  const watchedAcceptDataProcessing = watch('accept_data_processing');

  const onSubmit = async () => {
    try {
      try {
        schemas.step5ValidationSchema.validateSync(form.getValues());
      } catch {
        trigger(Object.keys(schemas.step5ValidationSchema.fields) as (keyof SignUpData)[]);
        return;
      }

      const rawValues = form.getValues();

      toast({
        title: t.auth.signup.toasts.accountCreatedTitle,
        description: t.auth.signup.toasts.accountCreatedDescription,
      });

      await apiRegisterUser({
        accept_data_processing: rawValues.accept_data_processing || false,
        accept_terms: rawValues.accept_terms || false,
        first_name: rawValues.first_name || '',
        last_name: rawValues.last_name || '',
        country: rawValues.country || '',
        phone: rawValues.phone || '',
        email: rawValues.email || '',
        password1: rawValues.password1 || '',
        password2: rawValues.password2 || '',
        trade_name: rawValues.trade_name || '',
        logo: rawValues.logo || undefined,
        practice_type: rawValues.practice_type || '',
        jurisdiction: rawValues.jurisdiction || '',
        business_address: rawValues.business_address || '',
        team_size: rawValues.team_size || '',
        website: rawValues.website || undefined,
      })
        .then(() => {
          localStorage.setItem('pendingVerificationEmail', rawValues.email);
          navigate('/verify-email-waiting', {
            state: { email: rawValues.email },
          });
        })
        .catch((error) => {
          if (isAxiosError(error)) {
            const remoteValidation = getRemoteFieldsValidation(error);
            Object.keys(remoteValidation).forEach((key) => {
              setError(key as keyof SignUpData, { message: remoteValidation[key] });
            });
            if (Object.keys(remoteValidation).length > 0) {
              const firstErrorKey = Object.keys(remoteValidation)[0];
              if (firstErrorKey === 'jurisdiction') {
                setStep(1);
              } else if (firstErrorKey === 'practice_type') {
                setStep(2);
              } else if (Object.keys(schemas.step1ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(3);
              } else if (Object.keys(schemas.step2ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(4);
              } else if (Object.keys(schemas.step4ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(5);
              } else if (Object.keys(schemas.step5ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(6);
              }
              setFocus(firstErrorKey as keyof SignUpData);
            }
          }
          toast({
            title: t.auth.signup.toasts.errorTitle,
            description: (error as { message: string }).message || t.auth.signup.toasts.registrationError,
            variant: 'destructive',
          });
        });
    } catch (error) {
      if (error && typeof error === 'object' && 'inner' in error) {
        const validationError = error as { inner: Array<{ message: string }> };
        const errorMessage = validationError.inner.map((err) => err.message).join(', ');
        toast({
          title: t.auth.signup.toasts.errorTitle,
          description: errorMessage,
          variant: 'destructive',
        });
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast({
          title: t.auth.signup.toasts.errorTitle,
          description: (error as { message: string }).message,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-2.5">
      <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-zinc-800/60">
        <div className="flex items-start gap-3">
          <Checkbox
            id="accept_terms"
            checked={watchedAcceptTerms}
            onCheckedChange={(checked) => setValue('accept_terms', checked as boolean)}
            className="mt-0.5 data-[state=checked]:bg-[#64499D]"
          />
          <div className="flex-1">
            <Label htmlFor="accept_terms" className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
              {s.termsLabel}{' '}
              <a href="/terms" target="_blank" className="font-semibold text-[#64499D] hover:underline dark:text-[#CFC2FF]" rel="noreferrer">
                {s.termsLink}
              </a>{' '}
              ·{' '}
              <a href="/privacy" target="_blank" className="font-semibold text-[#64499D] hover:underline dark:text-[#CFC2FF]" rel="noreferrer">
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
            className="mt-0.5 data-[state=checked]:bg-[#64499D]"
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
        onNext={onSubmit}
        nextLabel={s.submit}
        onPrev={onPrev}
        backLabel={s.back}
        nextDisabled={!watchedAcceptTerms || !watchedAcceptDataProcessing}
      />
    </div>
  );
};

export default ConsentStep;
