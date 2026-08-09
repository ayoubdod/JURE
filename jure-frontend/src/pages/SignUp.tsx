import React, { useMemo, useRef, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import PersonalInfoStep from '@/components/signup/PersonalInfoStep';
import ProfessionalInfoStep from '@/components/signup/ProfessionalInfoStep';
import QualificationsStep from '@/components/signup/FirmInfoStep';
import OrganizationDetailsStep from '@/components/signup/DocumentUploadStep';
import ConsentStep from '@/components/signup/ConsentStep';
import VerificationPending from '@/components/signup/VerificationPending';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { cn } from '@/lib/utils';
import AuthShell from '@/components/landing/AuthShell';
import { Check } from 'lucide-react';
import { useAppTranslation } from '@/i18n';

export type { SignUpData };

const SignUp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { t } = useAppTranslation();

  const schemas = useMemo(() => createSignupStepSchemas(t.auth.signup), [t]);
  const schemaRef = useRef(schemas.signupValidationSchema);
  schemaRef.current = schemas.signupValidationSchema;

  const mainForm = useForm<SignUpData>({
    resolver: ((values, context, options) =>
      yupResolver(schemaRef.current)(values, context, options)) as unknown as Resolver<SignUpData>,
    defaultValues: {
      first_name: '',
      last_name: '',
      country: '',
      phone: '',
      email: '',
      password1: '',
      password2: '',
      trade_name: '',
      logo: null,
      structure_type: '',
      business_address: '',
      team_size: '',
      website: '',
      accept_terms: false,
      accept_data_processing: false,
    },
    mode: 'onChange',
  });

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleStep1Complete = () => {
    nextStep();
  };

  const handleStep2Complete = () => {
    nextStep();
  };

  const handleStep3Complete = () => {
    nextStep();
  };

  const handleStep4Complete = () => {
    nextStep();
  };

  const handleConsentComplete = () => {
    nextStep();
  };

  const steps = [
    { number: 1, ...t.auth.signup.steps.personal },
    { number: 2, ...t.auth.signup.steps.profile },
    { number: 3, ...t.auth.signup.steps.qualifications },
    { number: 4, ...t.auth.signup.steps.organization },
    { number: 5, ...t.auth.signup.steps.consent },
  ];

  const renderStep = () => {
    return (
      <>
        <div className={cn(currentStep === 1 ? '' : 'hidden')}>
          <PersonalInfoStep onNext={handleStep1Complete} form={mainForm} />
        </div>

        <div className={cn(currentStep === 2 ? '' : 'hidden')}>
          <ProfessionalInfoStep
            onNext={handleStep2Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        <div className={cn(currentStep === 3 ? '' : 'hidden')}>
          <QualificationsStep
            onNext={handleStep3Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        <div className={cn(currentStep === 4 ? '' : 'hidden')}>
          <OrganizationDetailsStep
            onNext={handleStep4Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        <div className={cn(currentStep === 5 ? '' : 'hidden')}>
          <ConsentStep
            onNext={handleConsentComplete}
            onPrev={prevStep}
            setStep={setCurrentStep}
            form={mainForm}
          />
        </div>

        <div className={cn(currentStep === 6 ? '' : 'hidden')}>
          <VerificationPending />
        </div>
      </>
    );
  };

  return (
    <AuthShell wide homeLabel={t.auth.backToHome}>
      {currentStep <= 5 && (
        <div className="mb-8">
          <div className="landing-glass rounded-2xl px-4 sm:px-6 py-5">
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center shrink-0">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 text-sm font-semibold transition-all',
                      currentStep > step.number
                        ? 'bg-[#64499D] border-[#64499D] text-white shadow-[0_0_16px_-4px_rgba(100,73,157,0.7)]'
                        : currentStep === step.number
                          ? 'bg-gradient-to-br from-[#64499D] to-[#4D3680] border-transparent text-white shadow-[0_0_20px_-4px_rgba(100,73,157,0.65)]'
                          : 'border-[#64499D]/25 dark:border-[#8B6FD1]/30 text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-6 sm:w-10 md:w-14 h-0.5 mx-1 sm:mx-2 rounded-full',
                        currentStep > step.number
                          ? 'bg-[#64499D]'
                          : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                  {steps[currentStep - 1]?.title}
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                {steps[currentStep - 1]?.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">{renderStep()}</div>
    </AuthShell>
  );
};

export default SignUp;
