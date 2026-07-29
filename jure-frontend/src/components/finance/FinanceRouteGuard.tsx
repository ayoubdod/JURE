import React from 'react';
import { Navigate } from 'react-router';
import LogoLoading from '@/components/common/LogoLoading';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';

type Props = { children: React.ReactNode };

export const FinanceRouteGuard: React.FC<Props> = ({ children }) => {
  const { authorized, loading } = useFinanceAccess();
  if (loading) {
    return <LogoLoading />;
  }
  if (!authorized) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
