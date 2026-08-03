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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-2xl mb-4 shadow-lg">
          <Building className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-slate-100 mb-2">
          Profil
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Présentez votre cabinet ou votre structure en ajoutant son nom et son identité visuelle
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="landing-glass border-0 shadow-none ring-1 ring-[#64499D]/12 dark:ring-[#8B6FD1]/20">
        <CardHeader className="bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#64499D]/15 dark:to-transparent rounded-t-lg border-b border-[#64499D]/10 dark:border-[#8B6FD1]/20">
          <CardTitle className="text-xl font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
            Identité du cabinet
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Phase 2 : Nom commercial et logo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Commercial Name */}
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                Nom commercial
              </h3>
              <div className="space-y-2">
                <Label htmlFor="trade_name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nom du cabinet ou de l'entreprise *
                </Label>
                <Input
                  id="trade_name"
                  {...register('trade_name', { required: true })}
                  placeholder="Ex : Cabinet Atlas"
                  className={`transition-all duration-200 focus:ring-2 focus:ring-[#64499D]/40 focus:border-[#64499D] border-gray-300 dark:border-slate-600 h-12 ${
                    errors.trade_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.trade_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.trade_name.message}</p>
                )}
              </div>
            </div>

            {/* Logo upload */}
            <div className="bg-gradient-to-r from-[#F4F1FF]/60 to-transparent dark:from-[#64499D]/10 dark:to-transparent rounded-xl p-6 border border-[#64499D]/15 dark:border-[#8B6FD1]/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1]" />
                Logo de votre structure (optionnel)
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
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
                    <div className="text-xs text-slate-500 dark:text-slate-400">
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
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-[#64499D]/10 dark:border-[#8B6FD1]/20">
              <Button 
                type="button"
                variant="outline"
                onClick={onPrev}
                className="order-2 sm:order-1 border-[#64499D]/30 text-[#64499D] dark:text-[#CFC2FF] hover:bg-[#64499D]/10 hover:border-[#64499D]/50 dark:hover:bg-[#64499D]/20 h-12 px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
              
              <Button 
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
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
        <div className="inline-flex items-center px-4 py-2 bg-[#F4F1FF]/80 dark:bg-[#64499D]/20 rounded-full ring-1 ring-[#64499D]/15 dark:ring-[#8B6FD1]/25">
          <div className="w-2 h-2 bg-[#64499D] rounded-full mr-2"></div>
          <span className="text-sm text-[#64499D] dark:text-[#CFC2FF] font-medium">
            Étape 2 sur 4 - Profil
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoStep;
