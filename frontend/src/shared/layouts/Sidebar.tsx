import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UploadCloud,
  Timer,
  Users,
  UserCheck,
  Award,
  Gavel,
  MessageSquare,
  Megaphone,
  Trophy,
  BarChart3,
  FileText,
  History,
  Star,
  ChevronLeft,
  X,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/services/api';
import { BrandLogo } from '../components/BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isCollapsed: externalCollapsed, setIsCollapsed: externalSetCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setIsCollapsed = externalSetCollapsed || setInternalCollapsed;

  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });

  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  const handleLogout = async () => {
    await logout();
    navigate('/landing');
  };

  if (!user) return null;

  const getNavItems = () => {
    let items: { to: string; label: string; icon: React.ReactNode; code: string }[] = [];

    switch (user.role) {
      case 'ADMINISTRATOR':
        items = [
          { to: '/dashboard', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" />, code: 'CMD' },
          { to: '/submissions', label: 'Submissions', icon: <UploadCloud className="w-4 h-4" />, code: 'SUB' },
          { to: '/timer', label: 'Stage Timers', icon: <Timer className="w-4 h-4" />, code: 'TMR' },
          { to: '/teams', label: 'Teams & Members', icon: <Users className="w-4 h-4" />, code: 'TMS' },
          { to: '/checkin', label: 'Check-In Portal', icon: <UserCheck className="w-4 h-4" />, code: 'CHK' },
          { to: '/judges', label: 'Judge Console', icon: <Award className="w-4 h-4" />, code: 'JDG' },
          { to: '/criteria', label: 'Judging Rubrics', icon: <Gavel className="w-4 h-4" />, code: 'RBC' },
          { to: '/questions', label: 'Support Desk', icon: <MessageSquare className="w-4 h-4" />, code: 'SUP' },
          { to: '/announcements', label: 'Broadcasts', icon: <Megaphone className="w-4 h-4" />, code: 'BCST' },
          { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" />, code: 'LDR' },
          { to: '/reports?tab=feedback', label: 'Feedback Data', icon: <BarChart3 className="w-4 h-4" />, code: 'FDB' },
          { to: '/reports', label: 'Reports & Audits', icon: <FileText className="w-4 h-4" />, code: 'AUD' },
        ];
        break;
      case 'CHECK_IN_ADMIN':
        items = [
          { to: '/checkin', label: 'Check-In Portal', icon: <UserCheck className="w-4 h-4" />, code: 'CHK' },
          { to: '/questions', label: 'Support Desk', icon: <MessageSquare className="w-4 h-4" />, code: 'SUP' },
          { to: '/announcements', label: 'Broadcasts', icon: <Megaphone className="w-4 h-4" />, code: 'BCST' },
          { to: '/reports', label: 'Reports & Audits', icon: <FileText className="w-4 h-4" />, code: 'AUD' },
        ];
        break;
      case 'JUDGE':
        items = [
          { to: '/dashboard', label: 'Judge Console', icon: <LayoutDashboard className="w-4 h-4" />, code: 'CONSOLE' },
          { to: '/timer', label: 'Stage Timers', icon: <Timer className="w-4 h-4" />, code: 'TIMERS' },
          { to: '/reviews', label: 'Evaluation Deck', icon: <Gavel className="w-4 h-4" />, code: 'EVAL' },
          { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" />, code: 'ARENA' },
          { to: '/history', label: 'Review Log', icon: <History className="w-4 h-4" />, code: 'LOG' },
        ];
        break;
      case 'STUDENT':
        items = [
          { to: '/dashboard', label: 'Team Control Deck', icon: <LayoutDashboard className="w-4 h-4" />, code: 'DECK' },
          { to: '/submission', label: 'Project Submission', icon: <UploadCloud className="w-4 h-4" />, code: 'SUBMIT' },
          { to: '/timer', label: 'Stage Timers', icon: <Timer className="w-4 h-4" />, code: 'STAGE' },
          { to: '/questions', label: 'Support & Q&A', icon: <MessageSquare className="w-4 h-4" />, code: 'DESK' },
          { to: '/announcements', label: 'Broadcasts', icon: <Megaphone className="w-4 h-4" />, code: 'ALERTS' },
          { to: '/feedback', label: 'Submit Feedback', icon: <Star className="w-4 h-4" />, code: 'FEEDBACK' },
        ];
        break;
      default:
        items = [];
        break;
    }

    if (user.role !== 'ADMINISTRATOR' && user.role !== 'CHECK_IN_ADMIN' && !feedbackEnabled) {
      items = items.filter(item => item.to !== '/feedback');
    }

    return items;
  };

  const navItems = getNavItems();

  const roleTag: Record<string, { label: string; color: string }> = {
    ADMINISTRATOR: { label: 'SYS // ADMIN', color: 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]' },
    CHECK_IN_ADMIN: { label: 'CHK // ADMIN', color: 'bg-[#2B2B2B] text-[#00C8FF] border-[#555555]' },
    JUDGE: { label: 'SYS // JUDGE', color: 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]' },
    STUDENT: { label: 'SYS // TEAM', color: 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]' },
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <motion.aside
        animate={{
          width: isCollapsed ? 76 : 260,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className={`fixed lg:sticky top-0 h-screen z-50 bg-[#181818] border-r border-[#2B2B2B] flex flex-col py-5 select-none transition-transform duration-300 shadow-xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header / Branding */}
        <div className="px-4 mb-5 flex items-center justify-between">
          <div
            onClick={() => navigate('/landing')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden group"
          >
            <BrandLogo variant="sidebar" />

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col text-left overflow-hidden"
                >
                  <span className="font-extrabold text-sm tracking-wider font-mono text-[#FFFFFF] whitespace-nowrap flex items-center gap-1.5">
                    SMART<span className="text-[#D4D4D4]">HORIZON</span>
                    <span className="text-[9px] px-1 py-0.2 bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] rounded font-mono">OS</span>
                  </span>
                  <span className="text-[9px] font-mono text-[#B3B3B3] uppercase tracking-widest truncate">
                    COMMAND RAIL // SH26
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded border border-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] transition-all"
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-[#B3B3B3] hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Separator Line */}
        <div className="px-4 mb-3">
          <div className="h-px bg-[#2B2B2B]" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2 rounded font-mono text-xs transition-all duration-200 group ${
                  isActive
                    ? 'text-[#FFFFFF] font-bold bg-[#2B2B2B] border border-[#FFFFFF]/40'
                    : 'text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B]/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveLine"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute left-0 top-1 bottom-1 w-1 bg-[#FFFFFF] rounded-r"
                    />
                  )}

                  <span className={`shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-[#FFFFFF]' : 'text-[#B3B3B3]'}`}>
                    {item.icon}
                  </span>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex items-center justify-between w-full overflow-hidden whitespace-nowrap"
                      >
                        <span className="truncate tracking-wide">{item.label}</span>
                        <span className={`text-[9px] font-mono px-1 rounded ml-1 ${
                          isActive ? 'text-[#FFFFFF] bg-[#0E0E0E]' : 'text-[#B3B3B3] group-hover:text-[#FFFFFF]'
                        }`}>
                          {item.code}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="px-2.5 mt-auto pt-3 border-t border-[#2B2B2B] space-y-2">
          <div
            className={`flex items-center gap-2.5 p-2 rounded bg-[#0E0E0E] border border-[#2B2B2B] ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] font-bold flex items-center justify-center text-xs shrink-0 font-mono">
              {user.name.charAt(0)}
            </div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col min-w-0"
                >
                  <span className="text-xs font-bold text-[#FFFFFF] truncate font-sans">
                    {user.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold tracking-wider mt-0.5 border w-fit ${
                      roleTag[user.role]?.color || 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                    }`}
                  >
                    {roleTag[user.role]?.label || user.role}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-mono font-bold text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] transition-all ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Disconnect Session"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>DISCONNECT</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
