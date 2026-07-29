import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { signupValidationSchema, step3ValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';

// Type for the complete signup form
type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface FirmInfoStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const structureTypeOptions = [
  'Cabinet d\'avocat',
  'Société d\'avocat',
  'Société privée',
  'Association',
  'Administration publique',
  'Autre',
];

const FirmInfoStep = ({ onNext, onPrev, form }: FirmInfoStepProps) => {
  const { toast } = useToast();
  
  // Use the passed form instead of creating a new one
  const { register, watch, setValue, formState: { errors }, trigger } = form;

  const onSubmit = async () => {
    try {
      step3ValidationSchema.validateSync(form.getValues());
      onNext();
    } catch (error) {
      trigger(Object.keys(step3ValidationSchema.fields) as (keyof SignUpData)[]);
      toast({
        title: "Erreur",
        description: "Veuillez vérifier les informations saisies.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
          <Building className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Qualifications professionnelles
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choisissez votre type de structure et renseignez votre adresse professionnelle
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg border-b border-purple-100">
          <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Type de structure
          </CardTitle>
          <CardDescription className="text-purple-700">
            Étape 3 : Votre forme d’exercice et votre localisation
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Structure Type */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                Type de structure
              </h3>
              <div className="space-y-2">
                <Label htmlFor="structure_type" className="text-sm font-medium text-gray-700">
                  Type de structure *
                </Label>
                <Select
                  value={watch('structure_type')}
                  onValueChange={(value) => setValue('structure_type', value)}
                >
                  <SelectTrigger
                    className={`h-12 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.structure_type ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez votre type de structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {structureTypeOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.structure_type && (
                  <p className="text-sm text-red-600 mt-1">{errors.structure_type.message}</p>
                )}
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Adresse professionnelle
              </h3>
              <div className="space-y-2">
                <Label htmlFor="business_address" className="text-sm font-medium text-gray-700">
                  Adresse complète *
                </Label>
                <Textarea
                  id="business_address"
                  {...register('business_address')}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 min-h-[100px] ${
                    errors.business_address ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Adresse complète de votre cabinet ou structure"
                />
                {errors.business_address && (
                  <p className="text-sm text-red-600 mt-1">{errors.business_address.message}</p>
                )}
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
            Étape 3 sur 4 - Qualifications professionnelles
          </span>
        </div>
      </div>
    </div>
  );
};

export default FirmInfoStep;