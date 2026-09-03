import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { BottomDock } from '../components/BottomDock';
import { ForcePasswordChangeModal } from '../../features/auth/components/ForcePasswordChangeModal';
import { SessionInactivityModal } from '../../features/auth/components/SessionInactivityModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MOTION_TOKENS } from '../theme/motion';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isLight } = useTheme();

  return (
    <div className={`flex flex-col min-h-screen w-full selection:bg-sky-200 relative overflow-x-hidden transition-colors duration-300 ${
      isLight
        ? 'bg-[#EAF6FF] text-[#0B2340]'
        : 'bg-[#0E0E0E] text-[#FFFFFF] selection:bg-[#2B2B2B] selection:text-[#FFFFFF]'
    }`}>
      {/* Forced Password Change Modal for initial student login */}
      <ForcePasswordChangeModal />

      {/* 15-Minute Participant Inactivity Timeout Modal */}
      <SessionInactivityModal />

      {/* Top Navbar Header */}
      <Header sidebarOpen={false} setSidebarOpen={() => {}} />

      {/* Main viewport area - Expands horizontally to full width */}
      <div className={`flex-1 flex flex-col min-w-0 z-10 ${isLight ? 'bg-[#EAF6FF]' : 'bg-[#0E0E0E]'}`}>
        {/* Dynamic page content container with generous bottom padding so bottom dock never obscures content */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-64 sm:pb-80 md:pb-96">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
          {/* Scroll clearance spacer so user can comfortably scroll elements well above the bottom dock */}
          <div className="h-16 sm:h-24 w-full pointer-events-none" aria-hidden="true" />
        </main>
      </div>

      {/* Persistent Floating Bottom Dock Navigation */}
      <BottomDock />
    </div>
  );
};

export default Layout;
