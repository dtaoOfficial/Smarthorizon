import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  FileText,
  History,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { MOTION_TOKENS } from '../theme/motion';

export const BottomDock: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const location = useLocation();

  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });

  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  if (!user) return null;

  const isJudge = user.role === 'JUDGE';

  const getDockItems = () => {
    let items: { to: string; label: string; shortLabel: string; icon: React.ReactNode }[] = [];

    switch (user.role) {
      case 'STUDENT':
        items = [
          { to: '/dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/submission', label: 'Submit', shortLabel: 'Submit', icon: <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/timer', label: 'Timers', shortLabel: 'Timers', icon: <Timer className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/questions', label: 'Q&A', shortLabel: 'Q&A', icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/announcements', label: 'Broadcasts', shortLabel: 'Alerts', icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" /> },
        ];
        if (feedbackEnabled) {
          items.push({ to: '/feedback', label: 'Feedback', shortLabel: 'Feedback', icon: <Star className="w-4 h-4 sm:w-5 sm:h-5" /> });
        }
        break;

      case 'JUDGE':
        items = [
          { to: '/dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/reviews', label: 'Evaluations', shortLabel: 'Eval', icon: <Gavel className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/timer', label: 'Timers', shortLabel: 'Timers', icon: <Timer className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Ranks', icon: <Trophy className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/announcements', label: 'Broadcasts', shortLabel: 'Alerts', icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/history', label: 'Review Log', shortLabel: 'Log', icon: <History className="w-4 h-4 sm:w-5 sm:h-5" /> },
        ];
        if (feedbackEnabled) {
          items.push({ to: '/feedback', label: 'Feedback', shortLabel: 'Feedback', icon: <Star className="w-4 h-4 sm:w-5 sm:h-5" /> });
        }
        break;

      case 'ADMINISTRATOR':
        items = [
          { to: '/dashboard', label: 'Command', shortLabel: 'Cmd', icon: <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/submissions', label: 'Submissions', shortLabel: 'Subs', icon: <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/timer', label: 'Timers', shortLabel: 'Timers', icon: <Timer className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/teams', label: 'Teams', shortLabel: 'Teams', icon: <Users className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/checkin', label: 'Check-In', shortLabel: 'Check', icon: <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/judges', label: 'Judges', shortLabel: 'Judges', icon: <Award className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/criteria', label: 'Rubrics', shortLabel: 'Rubric', icon: <Gavel className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/questions', label: 'Support', shortLabel: 'Q&A', icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/announcements', label: 'Broadcasts', shortLabel: 'Alerts', icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Ranks', icon: <Trophy className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> },
        ];
        break;

      case 'CHECK_IN_ADMIN':
        items = [
          { to: '/checkin', label: 'Check-In', shortLabel: 'Check', icon: <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/questions', label: 'Support', shortLabel: 'Q&A', icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/announcements', label: 'Broadcasts', shortLabel: 'Alerts', icon: <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" /> },
          { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> },
        ];
        break;

      default:
        items = [];
        break;
    }

    return items;
  };

  const dockItems = getDockItems();

  return (
    <div className="fixed bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[98vw] sm:max-w-none select-none pb-[env(safe-area-inset-bottom)] px-1">
      <nav aria-label="Primary bottom navigation dock" className={`flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl backdrop-blur-md transition-colors duration-300 overflow-x-auto hide-scrollbar touch-pan-x max-w-[98vw] sm:max-w-none px-2 shadow-2xl ${
        isLight
          ? 'bg-white/90 border border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.12)]'
          : 'bg-[#181818]/90 border border-[#2B2B2B] shadow-2xl'
      }`}>
        {dockItems.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/dashboard' && (location.pathname === item.to || location.pathname.startsWith(item.to + '/')));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative px-2.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-colors duration-200 cursor-pointer flex flex-col sm:flex-row items-center gap-1 sm:gap-2 group min-w-[44px] min-h-[44px] justify-center"
            >
              {isActive && (
                <motion.div
                  layoutId="activeDockPill"
                  className={`absolute inset-0 rounded-xl z-0 ${
                    isLight
                      ? 'bg-[#EFF6FF] border border-[#BFDBFE] shadow-sm'
                      : 'bg-[#FFFFFF] border border-[#FFFFFF] shadow-md'
                  }`}
                  transition={MOTION_TOKENS.spring.snappy}
                />
              )}

              <motion.div
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18, ease: MOTION_TOKENS.ease.smooth }}
                className="relative z-10 flex flex-col sm:flex-row items-center gap-1 sm:gap-2"
              >
                <span className={`transition-colors duration-200 ${
                  isLight
                    ? isActive ? 'text-[#0B63B6]' : 'text-[#0B2340] group-hover:text-[#1687D9]'
                    : isActive ? 'text-[#0E0E0E]' : 'text-[#B3B3B3] group-hover:text-white'
                }`}>
                  {item.icon}
                </span>

                <span className={`text-[10px] sm:text-xs font-mono uppercase tracking-wider transition-colors duration-200 ${
                  isLight
                    ? isActive ? 'text-[#0B63B6] font-extrabold' : 'text-[#0B2340] font-bold group-hover:text-[#1687D9]'
                    : isActive ? 'text-[#0E0E0E] font-extrabold' : 'text-[#B3B3B3] font-bold group-hover:text-white'
                }`}>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomDock;
