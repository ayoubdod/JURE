import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building, Image as ImageIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { signupValidationSchema, step2ValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';

// Type for the complete signup form
type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface ProfessionalInfoStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const ProfessionalInfoStep = ({ onNext, onPrev, form }: ProfessionalInfoStepProps) => {
  const { toast } = useToast();
  
  const { register, watch, setValue, formState: { errors }, trigger } = form;
  const logoFile = watch('logo') as File | null;
  const {
    ref: logoRef,
    name: logoFieldName,
  } = register('logo');

  const onSubmit = async () => {
    try {
      // Validate the current step fields
      try {
        step2ValidationSchema.validateSync(form.getValues())
        onNext();
      } catch (error) {
        trigger(Object.keys(step2ValidationSchema.fields) as (keyof SignUpData)[])
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la validation",
        variant: "destructive"
      });
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setValue('logo', file, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
          <Building className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Profil
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Présentez votre cabinet ou votre structure en ajoutant son nom et son identité visuelle
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg border-b border-purple-100">
          <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Identité du cabinet
          </CardTitle>
          <CardDescription className="text-purple-700">
            Phase 2 : Nom commercial et logo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Commercial Name */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                Nom commercial
              </h3>
              <div className="space-y-2">
                <Label htmlFor="trade_name" className="text-sm font-medium text-gray-700">
                  Nom du cabinet ou de l'entreprise *
                </Label>
                <Input
                  id="trade_name"
                  {...register('trade_name', { required: true })}
                  placeholder="Ex : Cabinet Atlas"
                  className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                    errors.trade_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.trade_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.trade_name.message}</p>
                )}
              </div>
            </div>

            {/* Logo upload */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                Logo de votre structure (optionnel)
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ajoutez un logo pour personnaliser votre espace. Formats acceptés : JPG, PNG (max 2 MB).
                </p>

                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    name={logoFieldName}
                    ref={logoRef}
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  {logoFile && (
                    <div className="text-xs text-gray-500">
                      {logoFile.name} — {(logoFile.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                  {errors.logo && (
                    <p className="text-xs text-red-600">{errors.logo.message as string}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={onPrev}
                className="order-2 sm:order-1 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 h-12 px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
              
              <Button 
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <div className="text-center mt-6">
        <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full">
          <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
          <span className="text-sm text-purple-700 font-medium">
            Étape 2 sur 4 - Profil
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoStep;