import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Home, Lock, ArrowRight, Sun, Moon, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiResetPasswordConfirm } from '@/services/auth/api';
import clsx from 'clsx';

interface ResetPasswordFormData {
  new_password1: string;
  new_password2: string;
}

const ResetPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDarkMode, setIsDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark'
  );
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const token = searchParams.get('token');
  const uuid = searchParams.get('uuid');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !uuid) {
      toast({
        title: 'Erreur',
        description: 'Token de réinitialisation invalide ou manquant. Veuillez demander un nouveau lien.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiResetPasswordConfirm({
        new_password1: data.new_password1,
        new_password2: data.new_password2,
        token: token,
        uuid: uuid,
      });
      
      toast({ 
        title: 'Succès', 
        description: 'Votre mot de passe a été réinitialisé avec succès.' 
      });
      
      navigate('/signin');
    } catch (error) {
      let errorMessage = 'Impossible de réinitialiser le mot de passe. Veuillez vérifier votre lien et réessayer.';
      if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') errorMessage = data;
        else {
          const msg = data?.token?.[0] ?? data?.uid?.[0] ?? data?.non_field_errors?.[0] ?? data?.detail;
          if (typeof msg === 'string') errorMessage = msg;
        }
      }
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // If no token or uuid is provided, show error
  if (!token || !uuid) {
    return (
      <div className={clsx('min-h-screen flex items-center justify-center p-4', isDarkMode ? 'bg-[#0f1117]' : 'bg-white')}>
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-gray-800" />}
          </Button>
        </div>

        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/images/Jure logo.png"
              alt="Jure logo"
              className="w-22 h-20 mx-auto object-contain"
            />
          </div>

          <Card className={clsx('rounded-xl shadow-xl', isDarkMode ? 'bg-[#181b23] text-white' : 'bg-white text-black')}>
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">Réinitialisation du mot de passe</CardTitle>
              <CardDescription className={clsx('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                Token de réinitialisation invalide ou manquant
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <p className={clsx('text-sm', isDarkMode ? 'text-red-400' : 'text-red-600')}>
                Veuillez demander un nouveau lien de réinitialisation.
              </p>

              <Link
                to="/forgot-password"
                className={clsx('inline-flex items-center gap-2 hover:underline', isDarkMode ? 'text-purple-300' : 'text-purple-600')}
              >
                <ArrowLeft className="w-4 h-4" />
                Demander un nouveau lien
              </Link>

              <div className="text-center pt-4">
                <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                  <Home className="w-4 h-4" />
                  Retour à l'accueil
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            © 2025 Jure. Tous droits réservés.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen flex items-center justify-center p-4', isDarkMode ? 'bg-[#0f1117]' : 'bg-white')}>
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-gray-800" />}
        </Button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/images/Jure logo.png"
            alt="Jure logo"
            className="w-22 h-20 mx-auto object-contain"
          />
        </div>

        <Card className={clsx('rounded-xl shadow-xl', isDarkMode ? 'bg-[#181b23] text-white' : 'bg-white text-black')}>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
            <CardDescription className={clsx('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              Entrez votre nouveau mot de passe
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword1 ? "text" : "password"}
                    placeholder="Nouveau mot de passe"
                    {...register('new_password1', {
                      required: 'Le mot de passe est requis',
                      minLength: {
                        value: 8,
                        message: 'Le mot de passe doit contenir au moins 8 caractères'
                      }
                    })}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword1(!showPassword1)}
                  >
                    {showPassword1 ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.new_password1 && (
                  <p className="text-sm text-red-500 mt-1">{errors.new_password1.message}</p>
                )}
              </div>

              <div>
                <Label>Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword2 ? "text" : "password"}
                    placeholder="Confirmer le mot de passe"
                    {...register('new_password2', {
                      required: 'La confirmation du mot de passe est requise',
                      validate: (value) => {
                        const password1 = watch('new_password1');
                        return value === password1 || 'Les mots de passe ne correspondent pas';
                      }
                    })}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword2(!showPassword2)}
                  >
                    {showPassword2 ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.new_password2 && (
                  <p className="text-sm text-red-500 mt-1">{errors.new_password2.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#64499d] hover:bg-gradient-to-r hover:from-[#64499d] hover:to-[#8a6ccf] text-white font-semibold transition-colors duration-300"
              >
                {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="text-sm text-center space-y-2">
              <Link
                to="/signin"
                className={clsx('inline-flex items-center gap-2 hover:underline', isDarkMode ? 'text-purple-300' : 'text-purple-600')}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>

            <div className="text-center pt-4">
              <Link to="/" className={clsx('inline-flex items-center gap-1 text-sm hover:underline', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className={clsx('text-center mt-6 text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
          © 2025 Jure. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 