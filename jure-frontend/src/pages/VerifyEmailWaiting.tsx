import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router';
import { apiResendVerificationEmail } from '@/services/auth/api';
import { useEmailVerificationStore } from '@/stores/emailVerificationStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Clock, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';

const VerifyEmailWaiting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const {
    email,
    timeLeft,
    isResending,
    canResend,
    setEmail,
    resetTimer,
    setIsResending,
    decrementTimeLeft,
  } = useEmailVerificationStore();

  // Initialiser l'email depuis l'état de navigation, l'URL ou le localStorage
  useEffect(() => {
    const emailFromState = (location.state as { email?: string })?.email;
    const emailFromUrl = searchParams.get('email');
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    const emailToUse = emailFromState || emailFromUrl || emailFromStorage;

    if (emailToUse) {
      setEmail(emailToUse);
      // Sauvegarder dans localStorage si venant de l'URL ou de l'état
      if (emailFromUrl || emailFromState) {
        localStorage.setItem('pendingVerificationEmail', emailToUse);
      }
    } else {
      // Aucun email trouvé, rediriger vers l'inscription ou afficher une erreur
      toast({
        title: 'Email non trouvé',
        description: 'Aucune vérification en attente trouvée.',
        variant: 'destructive',
      });
      navigate('/signup');
    }
  }, [location.state, searchParams, setEmail, navigate, toast]);

  // Gérer le compte à rebours
  useEffect(() => {
    if (timeLeft > 0 && !canResend) {
      const interval = setInterval(() => {
        decrementTimeLeft();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeLeft, canResend, decrementTimeLeft]);

  const handleResendEmail = async () => {
    if (!canResend || isResending || !email) return;

    setIsResending(true);
    try {
      await apiResendVerificationEmail({ email });

      toast({
        title: 'Email envoyé',
        description: 'Un nouvel email de vérification a été envoyé. Vérifiez votre boîte de réception.',
      });

      resetTimer();
    } catch (error) {
      let errorMessage = 'Échec de l\'envoi de l\'email de vérification. Veuillez réessayer.';

      if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object' && 'detail' in data) {
          errorMessage = String(data.detail);
        } else if (typeof data === 'object' && 'email' in data && Array.isArray(data.email)) {
          errorMessage = data.email[0] || errorMessage;
        }
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = () => {
    navigate('/signin');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">Vérifiez votre email</CardTitle>
            <CardDescription className="text-base">
              Un lien de vérification a été envoyé à
            </CardDescription>
            <p className="text-lg font-semibold break-all text-primary">
              {email}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Cliquez sur le lien de vérification dans votre email pour activer votre compte.
                Si vous ne voyez pas l'email, vérifiez votre dossier spam.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                variant="outline"
                className="w-full"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                J'ai vérifié mon email
              </Button>

              <Button
                onClick={handleResendEmail}
                disabled={!canResend || isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Renvoyer l'email de vérification
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Renvoyer dans {formatTime(timeLeft)}
                  </>
                )}
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link
                to="/signin"
                className="text-sm text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
              >
                Retour à la connexion
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailWaiting;

