/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ShieldCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { apiRegisterUser } from '@/services/auth/api';
import { useNavigate } from 'react-router';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';

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
        structure_type: rawValues.structure_type || '',
        business_address: rawValues.business_address || '',
        team_size: rawValues.team_size || '',
        website: rawValues.website,
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
              if (Object.keys(schemas.step1ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(1);
              } else if (Object.keys(schemas.step2ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(2);
              } else if (Object.keys(schemas.step3ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(3);
              } else if (Object.keys(schemas.step4ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(4);
              } else if (Object.keys(schemas.step5ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(5);
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl mb-4 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-slate-100 mb-2">
          {s.headerTitle}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">{s.headerSubtitle}</p>
      </div>

      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent rounded-t-lg border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <CardTitle className="text-xl font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
            {s.cardTitle}
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">{s.cardDescription}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                {s.cardTitle}
              </h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    id="accept_terms"
                    checked={watchedAcceptTerms}
                    onCheckedChange={(checked) => setValue('accept_terms', checked as boolean)}
                    className="mt-0.5 data-[state=checked]:bg-[#64499D]"
                  />
                  <div className="flex-1">
                    <Label htmlFor="accept_terms" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {s.termsLabel}{' '}
                      <a href="/terms" target="_blank" className="text-[#64499D] dark:text-[#CFC2FF] hover:underline font-semibold" rel="noreferrer">
                        {s.termsLink}
                      </a>{' '}
                      ·{' '}
                      <a href="/privacy" target="_blank" className="text-[#64499D] dark:text-[#CFC2FF] hover:underline font-semibold" rel="noreferrer">
                        {s.privacyLink}
                      </a>{' '}
                      *
                    </Label>
                    {errors.accept_terms && (
                      <p className="text-sm text-red-600 mt-1">{errors.accept_terms.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Checkbox
                    id="accept_data_processing"
                    checked={watchedAcceptDataProcessing}
                    onCheckedChange={(checked) => setValue('accept_data_processing', checked as boolean)}
                    className="mt-0.5 data-[state=checked]:bg-[#64499D]"
                  />
                  <div className="flex-1">
                    <Label htmlFor="accept_data_processing" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {s.dataProcessingLabel} *
                    </Label>
                    {errors.accept_data_processing && (
                      <p className="text-sm text-red-600 mt-1">{errors.accept_data_processing.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-500/10 dark:to-transparent rounded-xl p-6 border border-amber-200/80 dark:border-amber-500/30">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                {t.auth.signup.verification.reviewTitle}
              </h3>
              <p className="text-amber-700 dark:text-amber-300/90 text-sm">
                {t.auth.signup.verification.reviewBody}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[#64499D]/10 dark:border-[#8B6FD1]/20">
              <Button
                type="button"
                variant="outline"
                onClick={onPrev}
                className="order-2 sm:order-1 border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 hover:border-[#64499D]/50 dark:hover:bg-[#64499D]/20 transition-all duration-200 h-12 px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {s.back}
              </Button>

              <Button
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
                disabled={!watchedAcceptTerms || !watchedAcceptDataProcessing}
              >
                {s.submit}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <div className="inline-flex items-center px-4 py-2 bg-[#F4F1FF]/80 dark:bg-[#64499D]/20 rounded-full ring-1 ring-[#64499D]/15 dark:ring-[#8B6FD1]/25">
          <div className="w-2 h-2 bg-[#64499D] rounded-full mr-2"></div>
          <span className="text-sm text-[#64499D] dark:text-[#CFC2FF] font-medium">{s.stepIndicator}</span>
        </div>
      </div>
    </div>
  );
};

export default ConsentStep;
