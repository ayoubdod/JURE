import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { apiGetMe } from '@/services/auth/api';
import useUserStore from '@/stores/userStore';
import { useToast } from '@/hooks/use-toast';
import LogoLoading from '@/components/common/LogoLoading';
import { devError } from '@/utils/devLog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, isLoggedIn, accessToken, logout, setUser } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  // Function to validate user session
  const validateUserSession = () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsValidating(true);
    apiGetMe()
      .then((response) => {
        setUser(response.data);
        
      })
      .catch((error) => {
        devError('Session validation failed:', error);
        logout();
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsValidating(false);
        setIsLoading(false);
      });
  };

  // Validate session on route change
  useEffect(() => {
    validateUserSession();
  }, [location.pathname]);

  // Show loading state while validating
  if (isLoading || isValidating) {
    return <LogoLoading />;
  }

  // If route requires auth but user is not logged in
  if (requireAuth && !isLoggedIn) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // If route is for non-authenticated users but user is logged in
  if (!requireAuth && isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 