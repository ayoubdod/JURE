/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ShieldCheck, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { signupValidationSchema, step1ValidationSchema ,step2ValidationSchema, step3ValidationSchema,step4ValidationSchema,step5ValidationSchema} from '@/schemas/signupValidation';
import * as yup from 'yup';
import { apiRegisterUser } from '@/services/auth/api';
import { useNavigate } from 'react-router';
import { getRemoteFieldsValidation } from '@/utils/functions';
import { isAxiosError } from 'axios';

// Type for the complete signup form
type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface ConsentStepProps {
  onNext: () => void;
  onPrev: () => void;
  setStep: (step: number) => void;
  form: UseFormReturn<SignUpData>;
}

const ConsentStep = ({ onNext, onPrev, setStep, form }: ConsentStepProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use the passed form instead of creating a new one
  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger, setError, setFocus } = form;
  const watchedAcceptTerms = watch('accept_terms');
  const watchedAcceptDataProcessing = watch('accept_data_processing');

  const onSubmit = async () => {
    try {
      // Validate the current step fields
      try {
        step5ValidationSchema.validateSync(form.getValues())
      } catch (error) {
        trigger(Object.keys(step5ValidationSchema.fields) as (keyof SignUpData)[])
        return;
      }
        
      const rawValues = form.getValues();
      // const payload = {
      //   first_name: rawValues.first_name,
      //   last_name: rawValues.last_name,
      //   country: rawValues.country,
      //   phone: rawValues.phone,
      //   email: rawValues.email,
      //   password1: rawValues.password1,
      //   password2: rawValues.password2,
      //   trade_name: rawValues.trade_name,
      //   logo: rawValues.logo ?? undefined,
      //   structure_type: rawValues.structure_type,
      //   business_address: rawValues.business_address,
      //   team_size: rawValues.team_size,
      //   website: rawValues.website ?? undefined,
      //   accept_terms: !!rawValues.accept_terms,
      //   accept_data_processing: !!rawValues.accept_data_processing,
      // };

      // const formPayload = new FormData();
      // Object.entries(payload).forEach(([key, value]) => {
      //   if (value === undefined || value === null) return;
      //   if (value instanceof File) {
      //     formPayload.append(key, value);
      //   } else {
      //     formPayload.append(key, value as string);
      //   }
      // });

      toast({
        title: "Compte créé avec succès",
        description: "Vos données ont été soumises pour validation. Veuillez vérifier votre email.",
      });

      await apiRegisterUser({
        accept_data_processing:rawValues.accept_data_processing || false,
        accept_terms:rawValues.accept_terms || false,
        first_name:rawValues.first_name || '',
        last_name:rawValues.last_name || '',
        country:rawValues.country || '',
        phone:rawValues.phone || '',
        email:rawValues.email || '',
        password1:rawValues.password1 || '',
        password2:rawValues.password2 || '',
        trade_name:rawValues.trade_name || '',
        logo:rawValues.logo || undefined,
        structure_type:rawValues.structure_type || '',
        business_address:rawValues.business_address || '',
        team_size:rawValues.team_size || '',
        website:rawValues.website,
      })
        .then((response) => {
          // Sauvegarder l'email dans localStorage
          localStorage.setItem('pendingVerificationEmail', rawValues.email);
          
          // Rediriger vers la page d'attente de vérification
          navigate('/verify-email-waiting', { 
            state: { email: rawValues.email } 
          });
        })
        .catch((error) => {
          if (isAxiosError(error)) {
            const remoteValidation = getRemoteFieldsValidation(error);
            Object.keys(remoteValidation).forEach((key) => {
              setError(key as keyof SignUpData, { message: remoteValidation[key] });
            });
            if (Object.keys(remoteValidation).length > 0) {
              const firstErrorKey = Object.keys(remoteValidation)[0];
              if (Object.keys(step1ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(1);
              } else if (Object.keys(step2ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(2);
              } else if (Object.keys(step3ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(3);
              } else if (Object.keys(step4ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(4);
              } else if (Object.keys(step5ValidationSchema.fields).includes(firstErrorKey)) {
                setStep(5);
              }
              setFocus(firstErrorKey as keyof SignUpData);
            }
          }
          toast({
            title: "Erreur de validation",
            description: (error as { message: string }).message,
            variant: "destructive",
          });
        });
    } catch (error) {
      if (error && typeof error === 'object' && 'inner' in error) {
        // Multiple validation errors
        const validationError = error as { inner: Array<{ message: string }> };
        const errorMessage = validationError.inner.map(err => err.message).join(', ');
        toast({
          title: "Erreurs de validation",
          description: errorMessage,
          variant: "destructive"
        });
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast({
          title: "Erreur de validation",
          description: (error as { message: string }).message,
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Finalisation de l'inscription
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Acceptez les conditions pour finaliser la création de votre compte
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg border-b border-purple-100">
          <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Consentement & RGPD / Loi 09-08
          </CardTitle>
          <CardDescription className="text-purple-700">
            Dernière étape : Acceptez les conditions d'utilisation
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Consent Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Acceptation des conditions
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    id="accept_terms"
                    checked={watchedAcceptTerms}
                    onCheckedChange={(checked) => setValue('accept_terms', checked as boolean)}
                    className="mt-0.5 data-[state=checked]:bg-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="accept_terms" className="text-sm font-medium text-gray-700">
                      J'accepte les{' '}
                      <a href="/terms" target="_blank" className="text-purple-600 hover:underline font-semibold">
                        Conditions Générales d'Utilisation
                      </a>{' '}
                      et la{' '}
                      <a href="/privacy" target="_blank" className="text-purple-600 hover:underline font-semibold">
                        Politique de Confidentialité
                      </a>{' '}
                      de Jure *
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Checkbox
                    id="accept_data_processing"
                    checked={watchedAcceptDataProcessing}
                    onCheckedChange={(checked) => setValue('accept_data_processing', checked as boolean)}
                    className="mt-0.5 data-[state=checked]:bg-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="accept_data_processing" className="text-sm font-medium text-gray-700">
                      Je consens au traitement de mes données personnelles conformément à la loi 09-08 
                      relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel *
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Rights Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Vos droits RGPD
              </h3>
              
              <div className="space-y-3">
                <p className="text-gray-700 text-sm">
                  Conformément à la réglementation en vigueur, vous disposez des droits suivants :
                </p>
                <ul className="text-gray-700 text-sm space-y-2 pl-5 list-disc">
                  <li>Droit d'accès à vos données personnelles</li>
                  <li>Droit de rectification de vos données</li>
                  <li>Droit à l'effacement de vos données</li>
                  <li>Droit à la portabilité de vos données</li>
                  <li>Droit d'opposition au traitement</li>
                </ul>
                <p className="text-sm mt-3">
                  <a 
                    href="/data-rights" 
                    target="_blank" 
                    className="text-purple-600 hover:underline font-medium inline-flex items-center"
                  >
                    En savoir plus sur vos droits <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
                  </a>
                </p>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-r from-yellow-50/50 to-transparent rounded-xl p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-yellow-600" />
                Information importante
              </h3>
              <p className="text-yellow-700 text-sm">
                Une fois votre inscription soumise, nos équipes examineront vos documents. 
                Vous recevrez un email de confirmation dans un délai maximum de 48 heures.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={onPrev}
                className="order-2 sm:order-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 h-12 px-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              
              <Button 
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
                disabled={!watchedAcceptTerms || !watchedAcceptDataProcessing}
              >
                Créer mon compte
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
            Étape 5 sur 5 - Finalisation
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConsentStep;