import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import PersonalInfoForm from './PersonalInfoForm';
import { signupValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';

// Type for the complete signup form
type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface PersonalInfoStepProps {
  onNext: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoStep = ({ onNext, form }: PersonalInfoStepProps) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      {/* Google / divider reserved for future use */}
      <PersonalInfoForm 
        onNext={onNext}
        form={form}
      />
    </div>
  );
};

export default PersonalInfoStep;
