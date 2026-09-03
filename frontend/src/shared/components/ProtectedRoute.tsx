import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMINISTRATOR' | 'CHECK_IN_ADMIN' | 'JUDGE' | 'STUDENT' | 'DATA_ENTRY')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-body-md text-on-surface-variant animate-pulse">
          Validating credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and store source URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // User is logged in but does not have the required permissions
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-error text-[64px] mb-4">
          gpp_bad
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-black mb-2">
          Access Denied
        </h1>
        <p className="font-body-md text-on-surface-variant max-w-md mb-6">
          You do not have the required privileges to view this section. If you believe this is an error, please contact your Hackathon Administrator.
        </p>
        <button
          onClick={() => window.history.back()}
          className="bg-primary text-on-primary font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

