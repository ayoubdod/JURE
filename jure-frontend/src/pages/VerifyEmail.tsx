import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { apiConfirmEmail } from '@/services/auth/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, XCircle, ArrowRight, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isAxiosError } from 'axios';
import { useAppTranslation } from '@/i18n';
import { AuroraPage } from '@/components/common/AuroraBackground';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t, apiError } = useAppTranslation();

  useEffect(() => {
    const token = searchParams.get('key') || searchParams.get('token');

    if (!token) {
      setError(t.auth.verifyMissingToken);
      setIsLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        await apiConfirmEmail({ key: token });
        localStorage.removeItem('pendingVerificationEmail');

        toast({
          title: t.auth.verifySuccessTitle,
          description: t.auth.verifySuccessDescription,
        });

        navigate('/signin?verified=true');
      } catch (err: unknown) {
        let errorMessage = t.auth.verifyFailedDefault;

        if (isAxiosError(err) && err.response?.data) {
          const data = err.response.data;
          if (typeof data === 'object' && 'detail' in data) {
            errorMessage = apiError(String(data.detail), errorMessage);
          } else if (typeof data === 'object' && 'non_field_errors' in data && Array.isArray(data.non_field_errors)) {
            errorMessage = apiError(data.non_field_errors[0], errorMessage);
          }
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for token
  }, [searchParams, navigate, toast]);

  if (isLoading) {
    return (
      <AuroraPage className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <CardTitle className="text-xl mb-2">{t.auth.verifyLoadingTitle}</CardTitle>
                <CardDescription>
                  {t.auth.verifyLoadingDescription}
                </CardDescription>
              </div>
            </div>
          </CardContent>
        </Card>
      </AuroraPage>
    );
  }

  if (error) {
    const pendingEmail = localStorage.getItem('pendingVerificationEmail');

    return (
      <AuroraPage className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">{t.auth.verifyFailureTitle}</CardTitle>
            <CardDescription className="text-center">
              {t.auth.verifyFailureDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>{t.common.error}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {pendingEmail && (
              <Button
                onClick={() => navigate('/verify-email-waiting', { state: { email: pendingEmail } })}
                variant="outline"
                className="w-full"
              >
                <Mail className="me-2 h-4 w-4" />
                {t.auth.verifyResend}
              </Button>
            )}
            <Button
              onClick={() => navigate('/signin')}
              className="w-full"
            >
              {t.auth.forgotBackToSignIn}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
            </Button>
          </CardContent>
        </Card>
      </AuroraPage>
    );
  }

  return null;
};

export default VerifyEmail;
