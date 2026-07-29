import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router';
import { validatePassword, PasswordRequirements } from './PasswordValidation';
import { User, Phone, Mail, Lock, MapPin, LogIn, Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '../ui/phone-input';
import { CountrySelect, CountrySelectProps } from '../ui/country-select';
import { signupValidationSchema, step1ValidationSchema } from '@/schemas/signupValidation';
import * as yup from 'yup';

// Type for the complete signup form
type SignUpData = yup.InferType<typeof signupValidationSchema>;

interface PersonalInfoFormProps {
  onNext: () => void;
  form: UseFormReturn<SignUpData>;
}

const PersonalInfoForm = ({ onNext, form }: PersonalInfoFormProps) => {
  const { toast } = useToast();
  
  // Use the passed form instead of creating a new one
  const { register, watch, setValue, formState: { errors }, trigger } = form;
  const watchedPassword = watch('password1');
  const watchedConfirmPassword = watch('password2');
  
  // State for password visibility
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const onSubmit = async () => {
    try {
      // Validate the current step fields
      try {
        step1ValidationSchema.validateSync(form.getValues())
        onNext();
      } catch (error) {
        trigger(Object.keys(step1ValidationSchema.fields) as (keyof SignUpData)[])
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la validation",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl mb-4 shadow-lg">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Informations personnelles
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Créez votre compte en remplissant les informations ci-dessous
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-t-lg border-b border-purple-100">
          <CardTitle className="text-xl text-purple-800 flex items-center gap-2">
            <User className="w-5 h-5" />
            Détails personnels
          </CardTitle>
          <CardDescription className="text-purple-700">
            Phase 1 : Vos informations de base pour créer votre compte
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            {/* Name Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Identité
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    Nom *
                  </Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                      errors.first_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    Prénom *
                  </Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                      errors.last_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Coordonnées
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Pays *
                  </Label>
                  <CountrySelect 
                    value={watch('country') as CountrySelectProps['value']}
                    onChange={(value) => {
                      setValue('country', value)
                      trigger('country')
                    }}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-600" />
                    Numéro de téléphone *
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={watch('phone')}
                    onChange={(value) => {
                      setValue('phone', value)
                      trigger('phone')
                    }}
                    defaultCountry='MA'
                    className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                      errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 ${
                      errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="bg-gradient-to-r from-purple-50/50 to-transparent rounded-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-600" />
                Sécurité du compte
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    Créer mot de passe *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register('password1')}
                      className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 pr-12 ${
                        errors.password1 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <PasswordRequirements />
                  {errors.password1 && (
                    <p className="text-sm text-red-600 mt-1">{errors.password1.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    Confirmer mot de passe *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      {...register('password2')}
                      className={`transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 h-12 pr-12 ${
                        errors.password2 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password2 && (
                    <p className="text-sm text-red-600 mt-1">{errors.password2.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="order-2 sm:order-1">
                <Link 
                  to="/signin" 
                  className="inline-flex items-center text-sm text-purple-700 hover:text-purple-800 font-medium transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Déjà un compte ? Se connecter
                </Link>
              </div>
              
              <Button
                onClick={onSubmit}
                className="order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8"
              >
                Continuer
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
            Étape 1 sur 5 - Informations personnelles
          </span>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;