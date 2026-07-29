
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleSignUpButton from './GoogleSignUpButton';
import FormDivider from './FormDivider';
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
    <div className="w-full h-full">
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl h-full min-h-[600px] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-2xl text-slate-900">Informations personnelles</CardTitle>
              <CardDescription className="text-slate-600">
                Créez votre compte professionnel Jure
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-8 space-y-6 overflow-y-auto">
          {/* <GoogleSignUpButton /> */}
          {/* <FormDivider /> */}
          <PersonalInfoForm 
            onNext={onNext}
            form={form}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalInfoStep;
