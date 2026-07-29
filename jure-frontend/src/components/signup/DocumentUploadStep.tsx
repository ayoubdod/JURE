import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Globe, ArrowLeft, ArrowRight } from 'lucide-react';
import { signupValidationSchema, step4ValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';

// Type for the complete signup form
const employeeCountOptions = [
  { label: '1 (juste moi)', value: '1' },
  { label: '2-5 collaborateurs', value: '5' },
  { label: '6-10 collaborateurs', value: '10' },
  { label: '11-20 collaborateurs', value: '20' },
  { label: '21-50 collaborateurs', value: '50' },
  { label: 'Plus de 50 collaborateurs', value: '100' },
];

type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface OrganizationDetailsStepProps {
  onNext: () => void;
  onPrev: () => void;
  form: UseFormReturn<SignUpData>;
}

const OrganizationDetailsStep = ({ onNext, onPrev, form }: OrganizationDetailsStepProps) => {
  const { toast } = useToast();
  const { watch, setValue, register, formState: { errors }, trigger } = form;

  const onSubmit = async () => {
    try {
      step4ValidationSchema.validateSync(form.getValues());
      onNext();
    } catch (error) {
      trigger(Object.keys(step4ValidationSchema.fields) as (keyof SignUpData)[]);
      toast({
        title: 'Erreur',
        description: 'Veuillez vérifier les informations saisies.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Détails de l'organisation
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Indiquez la taille de votre équipe et partagez votre présence en ligne
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg border-b border-purple-100">
          <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Votre organisation
          </CardTitle>
          <CardDescription className="text-purple-700">
            Étape 4 : Nombre de collaborateurs et site web
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Team Size */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Taille de l'équipe
              </h3>
              <div className="space-y-2">
                <Label htmlFor="team_size" className="text-sm font-medium text-gray-700">
                  Nombre de collaborateurs *
                </Label>
                <Select
                  value={watch('team_size')}
                  onValueChange={(value) => setValue('team_size', value)}
                >
                  <SelectTrigger
                    className={`h-12 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.team_size ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                    }`}
                  >
                    <SelectValue placeholder="Sélectionnez la taille de votre équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeCountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_size && (
                  <p className="text-sm text-red-600 mt-1">{errors.team_size.message}</p>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Présence en ligne
              </h3>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                  Site web (optionnel)
                </Label>
                <Input
                  id="website"
                  {...register('website')}
                  placeholder="https://www.votre-site.com"
                  className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                    errors.website ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors.website && (
                  <p className="text-sm text-red-600 mt-1">{errors.website.message}</p>
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
            Étape 4 sur 4 - Détails de l'organisation
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailsStep;