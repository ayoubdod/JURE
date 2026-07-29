import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import PersonalInfoStep from '@/components/signup/PersonalInfoStep';
import ProfessionalInfoStep from '@/components/signup/ProfessionalInfoStep';
import QualificationsStep from '@/components/signup/FirmInfoStep';
import OrganizationDetailsStep from '@/components/signup/DocumentUploadStep';
import ConsentStep from '@/components/signup/ConsentStep';
import VerificationPending from '@/components/signup/VerificationPending';
import { signupValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';
import { cn } from '@/lib/utils';

// Type for the complete signup form
export type SignUpData = yup.InferType<typeof signupValidationSchema>;

const SignUp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Centralized form using react-hook-form
  const mainForm = useForm<SignUpData>({
    resolver: yupResolver(signupValidationSchema),
    defaultValues: {
      // Step 1: Personal Info
      first_name: '',
      last_name: '',
      country: '',
      phone: '',
      email: '',
      password1: '',
      password2: '',
      
      // Step 2: Profile
      trade_name: '',
      logo: null,

      // Step 3: Structure & Address
      structure_type: '',
      business_address: '',

      // Step 4: Organization Details
      team_size: '',
      website: '',

      // Step 5: Consent
      accept_terms: false,
      accept_data_processing: false,
    },
    mode: 'onChange',
  });

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

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
    nextStep(); // Go to verification pending
  };

  const steps = [
    { number: 1, title: 'Détails personnels', description: 'Vos informations de base' },
    { number: 2, title: 'Profil', description: 'Nom commercial et identité visuelle' },
    { number: 3, title: 'Qualifications professionnelles', description: 'Type de structure et adresse' },
    { number: 4, title: 'Organisation', description: 'Équipe et présence en ligne' },
    { number: 5, title: 'Consentement', description: 'Conditions d’utilisation et confidentialité' },
  ];

  const renderStep = () => {
    return (
      <>
        {/* Step 1: Personal Info */}
        <div className={cn(currentStep === 1 ? '' : 'hidden')}>
          <PersonalInfoStep
            onNext={handleStep1Complete}
            form={mainForm}
          />
        </div>

        {/* Step 2: Profile */}
        <div className={cn(currentStep === 2 ? '' : 'hidden')}>
          <ProfessionalInfoStep
            onNext={handleStep2Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        {/* Step 3: Qualifications & Address */}
        <div className={cn(currentStep === 3 ? '' : 'hidden')}>
          <QualificationsStep
            onNext={handleStep3Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        {/* Step 4: Organization Details */}
        <div className={cn(currentStep === 4 ? '' : 'hidden')}>
          <OrganizationDetailsStep
            onNext={handleStep4Complete}
            onPrev={prevStep}
            form={mainForm}
          />
        </div>

        {/* Step 5: Consent */}
        <div className={cn(currentStep === 5 ? '' : 'hidden')}>
          <ConsentStep
            onNext={handleConsentComplete}
            onPrev={prevStep}
            setStep={setCurrentStep}
            form={mainForm}
          />
        </div>

        {/* Step 6: Verification Pending */}
        <div className={cn(currentStep === 6 ? '' : 'hidden')}>
          <VerificationPending />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        {currentStep <= 5 && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep >= step.number 
                      ? 'bg-purple-600 border-purple-600 text-white' 
                      : 'border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > step.number ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.number ? 'bg-purple-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            {currentStep <= 5 && (
              <div className="text-center mt-4">
                <h1 className="text-2xl font-bold text-gray-900">{steps[currentStep - 1]?.title}</h1>
                <p className="text-gray-600">{steps[currentStep - 1]?.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Step Content */}
        <div className="max-w-5xl mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default SignUp;