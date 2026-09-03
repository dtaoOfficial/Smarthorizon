import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD_MS = 14 * 60 * 1000; // Warning appears at 14 minutes (60s countdown)
const STORAGE_KEY = 'smarthorizon_last_activity_time';

export const SessionInactivityModal: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const resetActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Only run for participant / student users
  const isParticipant = user?.role === 'STUDENT';

  useEffect(() => {
    if (!isParticipant) {
      setShowWarning(false);
      return;
    }

    // Set initial activity time if not set or expired
    const currentStored = localStorage.getItem(STORAGE_KEY);
    if (!currentStored || Date.now() - parseInt(currentStored, 10) >= INACTIVITY_LIMIT_MS) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    // Event handler to update activity time (throttled)
    let lastUpdate = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle activity writes to localStorage to once every 2 seconds
      if (now - lastUpdate > 2000) {
        lastUpdate = now;
        localStorage.setItem(STORAGE_KEY, String(now));
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check timer every second
    const timerInterval = setInterval(() => {
      const storedTimeStr = localStorage.getItem(STORAGE_KEY);
      const lastActivityTime = storedTimeStr ? parseInt(storedTimeStr, 10) : Date.now();
      const elapsed = Date.now() - lastActivityTime;

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        // 15 Minutes reached -> Logout
        clearInterval(timerInterval);
        sessionStorage.setItem('inactivity_reason', 'Your session expired due to 15 minutes of inactivity. Please sign in again.');
        logout().finally(() => {
          navigate('/landing', { replace: true });
        });
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        // Warning state (last 60 seconds)
        const remaining = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(timerInterval);
    };
  }, [isParticipant, logout, navigate]);

  if (!isParticipant || !showWarning) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center"
        >
          {/* Decorative backdrop glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1 shadow-glow-sm">
              <span className="material-symbols-outlined text-3xl animate-pulse">timer</span>
            </div>

            <h3 className="text-2xl font-black font-display text-white tracking-tight">
              Inactivity Session Warning
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Hey <span className="text-amber-300 font-bold">{user.name}</span>, you have been inactive on the portal. For participant security, your session will automatically timeout in:
            </p>

            {/* Countdown Badge */}
            <div className="py-3 px-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl inline-block my-2">
              <span className="text-3xl font-mono font-black text-amber-400 tracking-wider">
                00:{secondsRemaining.toString().padStart(2, '0')}
              </span>
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                Seconds remaining
              </span>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem('inactivity_reason', 'You signed out of your session.');
                  logout().finally(() => navigate('/landing', { replace: true }));
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl border border-slate-700 text-xs transition-all"
              >
                Sign Out Now
              </button>

              <button
                type="button"
                onClick={resetActivity}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 rounded-xl shadow-glow-sm text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">touch_app</span>
                Stay Logged In
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
