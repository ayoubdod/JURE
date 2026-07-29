import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { apiConfirmEmail } from '@/services/auth/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = searchParams.get('key') || searchParams.get('token');

    if (!token) {
      setError('Token de vérification manquant');
      setIsLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        await apiConfirmEmail({ key: token });

        // Nettoyer le stockage local
        localStorage.removeItem('pendingVerificationEmail');

        toast({
          title: 'Email vérifié avec succès',
          description: 'Votre compte a été activé. Vous pouvez maintenant vous connecter.',
        });

        // Rediriger vers la connexion avec message de succès
        navigate('/signin?verified=true');
      } catch (error: unknown) {
        let errorMessage = 'La vérification a échoué. Le lien peut être invalide ou expiré.';
        
        if (isAxiosError(error) && error.response?.data) {
          const data = error.response.data;
          if (typeof data === 'object' && 'detail' in data) {
            errorMessage = String(data.detail);
          } else if (typeof data === 'object' && 'non_field_errors' in data && Array.isArray(data.non_field_errors)) {
            errorMessage = data.non_field_errors[0] || errorMessage;
          }
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <CardTitle className="text-xl mb-2">Vérification de votre email...</CardTitle>
                <CardDescription>
                  Veuillez patienter pendant que nous vérifions votre compte.
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const pendingEmail = localStorage.getItem('pendingVerificationEmail');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Échec de la vérification</CardTitle>
            <CardDescription className="text-center">
              Une erreur s'est produite lors de la vérification de votre email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {pendingEmail && (
              <Button
                onClick={() => navigate('/verify-email-waiting', { state: { email: pendingEmail } })}
                variant="outline"
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                Renvoyer l'email de vérification
              </Button>
            )}
            <Button
              onClick={() => navigate('/signin')}
              className="w-full"
            >
              Retour à la connexion
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default VerifyEmail;

