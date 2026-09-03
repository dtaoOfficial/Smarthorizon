import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { TrackProvider } from './context/TrackContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { Layout } from './shared/layouts/Layout';
import { Login } from './features/auth/pages/Login';
import { LandingPage } from './features/landing/pages/LandingPage';
import { Dashboard } from './features/dashboard/pages/Dashboard';
import { CheckInPortal } from './features/checkin/pages/CheckInPortal';
import { TeamManagement } from './features/teams/pages/TeamManagement';
import { JudgeCoordination } from './features/judges/pages/JudgeCoordination';
import { TeamReviews } from './features/reviews/pages/TeamReviews';
import { ReviewHistory } from './features/reviews/pages/ReviewHistory';
import { JudgingCriteria } from './features/criteria/pages/JudgingCriteria';
import { QuestionsConsole } from './features/questions/pages/QuestionsConsole';
import { AnnouncementsPanel } from './features/announcements/pages/AnnouncementsPanel';
import { ReportsPanel } from './features/reports/pages/ReportsPanel';
import { Leaderboards } from './features/reports/pages/Leaderboards';
import { TimerConsole } from './features/timer/pages/TimerConsole';

import { ToastProvider } from './context/ToastContext';

import { FeedbackPage } from './features/feedback/pages/FeedbackPage';
import { StudentSubmissionPage } from './features/submissions/pages/StudentSubmissionPage';
import { AdminSubmissionsPanel } from './features/submissions/pages/AdminSubmissionsPanel';
import { DataEntryTerminal } from './features/dashboard/components/DataEntryTerminal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <TrackProvider>
                <NotificationProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />

                {/* Guarded application routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/timer" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE', 'STUDENT']}>
                      <TimerConsole />
                    </ProtectedRoute>
                  } />
                  <Route path="/teams" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                      <TeamManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/checkin" element={<CheckInPortal />} />
                  <Route path="/judges" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                      <JudgeCoordination />
                    </ProtectedRoute>
                  } />
                  <Route path="/criteria" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                      <JudgingCriteria />
                    </ProtectedRoute>
                  } />
                  <Route
                    path="/questions"
                    element={
                      <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'CHECK_IN_ADMIN', 'STUDENT']}>
                        <QuestionsConsole />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/announcements" element={<AnnouncementsPanel />} />
                  <Route path="/reports" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'CHECK_IN_ADMIN']}>
                      <ReportsPanel />
                    </ProtectedRoute>
                  } />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                        <Leaderboards />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/reviews" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                      <TeamReviews />
                    </ProtectedRoute>
                  } />
                  <Route path="/reviews/:teamId" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                      <TeamReviews />
                    </ProtectedRoute>
                  } />
                  <Route path="/history" element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'JUDGE']}>
                      <ReviewHistory />
                    </ProtectedRoute>
                  } />
                  <Route path="/feedback" element={<FeedbackPage />} />

                  {/* Submission System Routes */}
                  <Route
                    path="/submission"
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <StudentSubmissionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submissions"
                    element={
                      <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                        <AdminSubmissionsPanel />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>

                {/* Standalone Admin Routes (No Layout) */}
                <Route
                  path="/admin/data-entry"
                  element={
                    <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'DATA_ENTRY']}>
                      <DataEntryTerminal />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </NotificationProvider>
          </TrackProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
  </QueryClientProvider>
  );
};

export default App;


