import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { apiGetMe } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import LogoLoading from '@/components/common/LogoLoading';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';
import {
  clearSessionValidationCache,
  getValidationPromise,
  isSessionValidated,
  setSessionValidated,
  setValidationPromise,
} from '@/utils/sessionValidationCache';
import { homePathForUser, isPortalClient } from '@/utils/portalAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  /** When set, restrict to portal clients or cabinet staff. */
  audience?: 'client' | 'staff';
}

const validateSession = (
  setUser: (user: API.User) => void,
  onInvalid: () => void,
): Promise<boolean> => {
  if (isSessionValidated()) {
    return Promise.resolve(true);
  }
  const existing = getValidationPromise();
  if (existing) {
    return existing;
  }

  const validationPromise = apiGetMe()
    .then((response) => {
      setUser(response.data);
      setSessionValidated(true);
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

const ProtectedRoute = ({
  children,
  requireAuth = true,
  audience,
}: ProtectedRouteProps) => {
  const { isLoggedIn, logout, setUser, user } = useUserStore();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useAppTranslation();

  const [isResolving, setIsResolving] = useState(
    Boolean(requireAuth && isLoggedIn && !isSessionValidated())
  );

  useEffect(() => {
    if (!requireAuth || !isLoggedIn) {
      if (!isLoggedIn) clearSessionValidationCache();
      setIsResolving(false);
      return;
    }

    let cancelled = false;
    setIsResolving(true);

    validateSession(setUser, logout).then((ok) => {
      if (cancelled) return;
      if (!ok) {
        toast({
          title: t.sessionExpired.title,
          description: t.sessionExpired.description,
          variant: 'destructive',
        });
      }
      setIsResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    requireAuth,
    isLoggedIn,
    logout,
    setUser,
    toast,
    t.sessionExpired.title,
    t.sessionExpired.description,
  ]);

  // Block only when we believe we are logged in but have not confirmed the cookie session yet.
  if (requireAuth && isLoggedIn && isResolving && !isSessionValidated()) {
    return <LogoLoading />;
  }

  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!requireAuth && isLoggedIn) {
    return <Navigate to={homePathForUser(user)} replace />;
  }

  if (requireAuth && audience === 'client' && user && !isPortalClient(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAuth && audience === 'staff' && user && isPortalClient(user)) {
    return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
