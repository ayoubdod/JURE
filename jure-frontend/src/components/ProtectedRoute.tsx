import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { apiGetMe } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import LogoLoading from '@/components/common/LogoLoading';
import { devError } from '@/utils/devLog';
import {
  clearSessionValidationCache,
  getValidatedToken,
  getValidationPromise,
  setValidatedToken,
  setValidationPromise,
} from '@/utils/sessionValidationCache';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const validateSession = (
  accessToken: string,
  setUser: (user: API.User) => void,
  onInvalid: () => void,
): Promise<boolean> => {
  if (getValidatedToken() === accessToken) {
    return Promise.resolve(true);
  }
  const existing = getValidationPromise();
  if (existing) {
    return existing;
  }

  const validationPromise = apiGetMe()
    .then((response) => {
      setUser(response.data);
      setValidatedToken(accessToken);
      return true;
    })
    .catch((error) => {
      devError('Session validation failed:', error);
      clearSessionValidationCache();
      onInvalid();
      return false;
    })
    .finally(() => {
      setValidationPromise(null);
    });

  setValidationPromise(validationPromise);
  return validationPromise;
};

const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { isLoggedIn, accessToken, logout, setUser } = useUserStore();
  const location = useLocation();
  const { toast } = useToast();

  // Persisted session → render immediately; never block in-app navigation.
  const hasCachedSession = Boolean(accessToken && isLoggedIn);
  // Cold start with token but no hydrated user yet → show loader once.
  const needsBlockingValidation = Boolean(accessToken && !isLoggedIn);
  const [isResolving, setIsResolving] = useState(needsBlockingValidation);

  useEffect(() => {
    if (!accessToken) {
      clearSessionValidationCache();
      setIsResolving(false);
      return;
    }

    let cancelled = false;

    if (!hasCachedSession) {
      setIsResolving(true);
    }

    validateSession(accessToken, setUser, logout).then((ok) => {
      if (cancelled) return;
      if (!ok) {
        toast({
          title: 'Session expirée',
          description: 'Votre session a expiré. Veuillez vous reconnecter.',
          variant: 'destructive',
        });
      }
      setIsResolving(false);
    });

    return () => {
      cancelled = true;
    };
    // Validate on token change only — not on every pathname (that caused the slow clicks).
  }, [accessToken, hasCachedSession, logout, setUser, toast]);

  if (isResolving && needsBlockingValidation) {
    return <LogoLoading />;
  }

  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!requireAuth && isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
