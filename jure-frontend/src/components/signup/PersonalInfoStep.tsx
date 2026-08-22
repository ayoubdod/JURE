import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import PersonalInfoForm from './PersonalInfoForm';
import type { SignUpData } from '@/schemas/signupValidation';

interface PersonalInfoStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoStep = ({ onNext, onPrev, form }: PersonalInfoStepProps) => {
  return <PersonalInfoForm onNext={onNext} onPrev={onPrev} form={form} />;
};

export default PersonalInfoStep;
