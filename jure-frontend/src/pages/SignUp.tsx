import React, { useMemo, useRef, useState } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import PersonalInfoStep from '@/components/signup/PersonalInfoStep';
import ProfessionalInfoStep from '@/components/signup/ProfessionalInfoStep';
import OrganizationDetailsStep from '@/components/signup/DocumentUploadStep';
import ConsentStep from '@/components/signup/ConsentStep';
import JurisdictionStep from '@/components/signup/JurisdictionStep';
import PracticeTypeStep from '@/components/signup/PracticeTypeStep';
import VerificationPending from '@/components/signup/VerificationPending';
import SignupShell from '@/components/signup/SignupShell';
import { createSignupStepSchemas, type SignUpData } from '@/schemas/signupValidation';
import { cn } from '@/lib/utils';
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
      business_address: '',
      team_size: '',
      website: '',
      jurisdiction: '',
      practice_type: '',
      accept_terms: false,
      accept_data_processing: false,
    },
    mode: 'onChange',
  });

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const steps = [
    { number: 1, ...t.auth.signup.steps.jurisdiction },
    { number: 2, ...t.auth.signup.steps.practice },
    { number: 3, ...t.auth.signup.steps.personal },
    { number: 4, ...t.auth.signup.steps.profile },
    { number: 5, ...t.auth.signup.steps.organization },
    { number: 6, ...t.auth.signup.steps.consent },
  ];

  return (
    <SignupShell currentStep={currentStep} steps={steps}>
      <div className={cn(currentStep === 1 ? '' : 'hidden')}>
        <JurisdictionStep onNext={nextStep} form={mainForm} />
      </div>
      <div className={cn(currentStep === 2 ? '' : 'hidden')}>
        <PracticeTypeStep onNext={nextStep} onPrev={prevStep} form={mainForm} />
      </div>
      <div className={cn(currentStep === 3 ? '' : 'hidden')}>
        <PersonalInfoStep onNext={nextStep} onPrev={prevStep} form={mainForm} />
      </div>
      <div className={cn(currentStep === 4 ? '' : 'hidden')}>
        <ProfessionalInfoStep onNext={nextStep} onPrev={prevStep} form={mainForm} />
      </div>
      <div className={cn(currentStep === 5 ? '' : 'hidden')}>
        <OrganizationDetailsStep onNext={nextStep} onPrev={prevStep} form={mainForm} />
      </div>
      <div className={cn(currentStep === 6 ? '' : 'hidden')}>
        <ConsentStep
          onNext={() => setCurrentStep(7)}
          onPrev={prevStep}
          setStep={setCurrentStep}
          form={mainForm}
        />
      </div>
      <div className={cn(currentStep === 7 ? '' : 'hidden')}>
        <VerificationPending />
      </div>
    </SignupShell>
  );
};

export default SignUp;
