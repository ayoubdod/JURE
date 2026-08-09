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
import { useAppTranslation } from '@/i18n';

const VerifyEmailWaiting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, tf, apiError } = useAppTranslation();

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

  useEffect(() => {
    const emailFromState = (location.state as { email?: string })?.email;
    const emailFromUrl = searchParams.get('email');
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    const emailToUse = emailFromState || emailFromUrl || emailFromStorage;

    if (emailToUse) {
      setEmail(emailToUse);
      if (emailFromUrl || emailFromState) {
        localStorage.setItem('pendingVerificationEmail', emailToUse);
      }
    } else {
      toast({
        title: t.auth.verifyWaitingEmailMissingTitle,
        description: t.auth.verifyWaitingEmailMissingDescription,
        variant: 'destructive',
      });
      navigate('/signup');
    }
  }, [location.state, searchParams, setEmail, navigate, toast, t]);

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
        title: t.auth.verifyWaitingResendSuccessTitle,
        description: t.auth.verifyWaitingResendSuccessDescription,
      });

      resetTimer();
    } catch (error) {
      let errorMessage = t.auth.verifyWaitingResendError;

      if (isAxiosError(error) && error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object' && 'detail' in data) {
          errorMessage = apiError(String(data.detail), errorMessage);
        } else if (typeof data === 'object' && 'email' in data && Array.isArray(data.email)) {
          errorMessage = apiError(data.email[0], errorMessage);
        }
      }

      toast({
        title: t.common.error,
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
            <CardTitle className="text-3xl">{t.auth.verifyWaitingTitle}</CardTitle>
            <CardDescription className="text-base">
              {t.auth.verifyWaitingSentTo}
            </CardDescription>
            <p className="text-lg font-semibold break-all text-primary">
              {email}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t.auth.verifyWaitingInboxHint}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                variant="outline"
                className="w-full"
              >
                <CheckCircle2 className="me-2 h-4 w-4" />
                {t.auth.verifyWaitingChecked}
              </Button>

              <Button
                onClick={handleResendEmail}
                disabled={!canResend || isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t.auth.verifyWaitingResending}
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="me-2 h-4 w-4" />
                    {t.auth.verifyResend}
                  </>
                ) : (
                  <>
                    <Clock className="me-2 h-4 w-4" />
                    {tf(t.auth.verifyWaitingResendIn, { time: formatTime(timeLeft) })}
                  </>
                )}
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link
                to="/signin"
                className="text-sm text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
              >
                {t.auth.forgotBackToSignIn}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailWaiting;
