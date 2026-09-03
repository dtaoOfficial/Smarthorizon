import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AdminDashboard } from '../components/AdminDashboard';
import { JudgeDashboard } from '../components/JudgeDashboard';
import { StudentDashboard } from '../components/StudentDashboard';

export const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-on-surface-variant text-body-md animate-pulse">
          Resolving workspace context...
        </p>
      </div>
    );
  }

  if (!user) return null;

  // Render role-specific dashboard component
  switch (user.role) {
    case 'ADMINISTRATOR':
      return <AdminDashboard />;
    case 'CHECK_IN_ADMIN':
      return <Navigate to="/checkin" replace />;
    case 'DATA_ENTRY':
      return <Navigate to="/admin/data-entry" replace />;
    case 'JUDGE':
      return <JudgeDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    default:
      return (
        <div className="p-6 bg-error-container text-on-error-container rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error">gpp_bad</span>
          <span>Role resolution error. Please contact the administrator.</span>
        </div>
      );
  }
};

export default Dashboard;

