import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import PersonalInfoForm from './PersonalInfoForm';
import type { SignUpData } from '@/schemas/signupValidation';

interface PersonalInfoStepProps {
  onNext: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoStep = ({ onNext, form }: PersonalInfoStepProps) => {
  return (
    <div className="w-full h-full min-h-[600px]">
      <PersonalInfoForm onNext={onNext} form={form} />
    </div>
  );
};

export default PersonalInfoStep;
