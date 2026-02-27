
import React from 'react';
import { useSimpleAuth } from '../context/SimpleAuthContext';
import SimpleLogin from '../pages/SimpleLogin';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { isAuthenticated, session } = useSimpleAuth();

  // If we are checking session (could be slight delay on mount if using complex storage)
  // For localStorage it's instant, but we guard against mount flickers
  if (!isAuthenticated) {
    return <SimpleLogin />;
  }

  return <>{children}</>;
};

export default AdminGuard;
