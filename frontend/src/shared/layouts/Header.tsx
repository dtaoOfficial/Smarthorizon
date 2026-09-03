import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  QrCode,
  Star,
  UploadCloud,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { useTrack } from '../../context/TrackContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationCenter } from '../components/NotificationCenter';
import { QrScannerModal } from '../components/QrScannerModal';
import { AccessDeniedModal } from '../components/AccessDeniedModal';
import { api } from '../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandLogo } from '../components/BrandLogo';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const queryClient = useQueryClient();
  const { selectedTrackId, selectedTrackName, tracks, setSelectedTrackId } = useTrack();
  const { user } = useAuth();
  const { isLight, studentTheme, toggleStudentTheme } = useTheme();
  const navigate = useNavigate();

  const isJudge = user?.role === 'JUDGE';

  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });

  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  const [trackDropdownOpen, setTrackDropdownOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trackRef.current && !trackRef.current.contains(event.target as Node)) {
        setTrackDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScan = async (code: string) => {
    setScanError(null);
    try {
      const res = await api.post('/reviews/scan', { code });
      if (res.success) {
        setScannerOpen(false);
        navigate(`/reviews/${res.team.id}`, {
          state: {
            fromQrScan: true,
            qrScanTimestamp: res.qrScanTimestamp,
            reviewStartTimestamp: res.reviewStartTimestamp,
          },
        });
      }
    } catch (err: any) {
      if (err.status === 403) {
        setScannerOpen(false);
        setAccessDeniedOpen(true);
      } else {
        setScanError(err.message || 'QR Scan failed validation.');
      }
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-40 flex flex-col w-full backdrop-blur-md select-none transition-colors duration-300 ${
        isLight
          ? 'bg-white/95 border-b border-[#C8DCEB] text-[#0B2340] shadow-sm'
          : 'bg-[#0E0E0E]/95 border-b border-[#2B2B2B] text-[#B3B3B3] shadow-md'
      }`}>
        {/* MAIN TOP COMMAND NAVBAR */}
        <div className="flex justify-between items-center h-14 px-4 lg:px-6">
          {/* Left Section: System Status Readout + Track Dropdown */}
          <div className="flex items-center gap-3 lg:gap-5">
            {/* Brand Logo */}
            <div className="flex items-center gap-2">
              <BrandLogo variant="navbar" className="h-7 cursor-pointer" onClick={() => navigate('/landing')} />
            </div>

            {/* System Status Indicators */}
            <div className={`hidden xl:flex items-center gap-3 font-mono text-[11px] border-r pr-4 ${isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'}`}>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                isLight
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                  : 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLight ? 'bg-[#1D4ED8]' : 'bg-[#FFFFFF]'}`} />
                <span className="font-bold tracking-wider">SYS // ONLINE</span>
              </div>
              <span className={isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}>|</span>
              <span className={`font-bold tracking-wider ${isLight ? 'text-[#0B2340]' : 'text-[#D4D4D4]'}`}>EVENT: SH26</span>
            </div>

            {/* Track Selector Dropdown */}
            <div className="relative" ref={trackRef}>
              <button
                onClick={() => setTrackDropdownOpen(!trackDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-all group ${
                  isLight
                    ? 'bg-[#F5FAFE] border-[#C8DCEB] hover:border-[#1687D9] text-[#0B2340]'
                    : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] text-[#FFFFFF]'
                }`}
              >
                <span className={isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}>TRK:</span>
                <span className={`font-bold truncate max-w-[130px] sm:max-w-[190px] ${isLight ? 'text-[#0B2340]' : 'text-[#D4D4D4]'}`}>
                  {selectedTrackName}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform group-hover:rotate-180 ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`} />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {trackDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute left-0 mt-2 w-64 border rounded shadow-2xl z-50 py-1.5 overflow-hidden font-mono text-xs ${
                      isLight
                        ? 'bg-white border-[#C8DCEB] text-[#0B2340]'
                        : 'bg-[#181818] border-[#555555] text-white shadow-2xl'
                    }`}
                  >
                    <div className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-extrabold border-b ${
                      isLight ? 'text-[#52677D] border-[#C8DCEB]' : 'text-[#E5E5E5] border-[#2B2B2B]'
                    }`}>
                      // FILTER EVENT TRACK
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTrackId(null);
                        setTrackDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between ${
                        isLight
                          ? selectedTrackId === null ? 'text-[#0B2340] font-extrabold bg-[#EFF6FF] border-l-2 border-[#1687D9]' : 'text-[#52677D] hover:bg-[#F5FAFE]'
                          : selectedTrackId === null ? 'text-[#0E0E0E] font-extrabold bg-[#FFFFFF] border-l-2 border-white' : 'text-[#D4D4D4] font-bold hover:bg-[#2B2B2B] hover:text-white'
                      }`}
                    >
                      <span>ALL EVENT TRACKS</span>
                      {selectedTrackId === null && <Check className={`w-4 h-4 ${isLight ? 'text-[#1687D9]' : 'text-[#0E0E0E]'}`} />}
                    </button>
                    <div className={`h-px my-1 ${isLight ? 'bg-[#C8DCEB]' : 'bg-[#2B2B2B]'}`} />
                    {tracks.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setSelectedTrackId(track.id);
                          setTrackDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center justify-between ${
                          isLight
                            ? selectedTrackId === track.id ? 'text-[#0B2340] font-extrabold bg-[#EFF6FF] border-l-2 border-[#1687D9]' : 'text-[#52677D] hover:bg-[#F5FAFE]'
                            : selectedTrackId === track.id ? 'text-[#0E0E0E] font-extrabold bg-[#FFFFFF] border-l-2 border-white' : 'text-[#D4D4D4] font-bold hover:bg-[#2B2B2B] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{track.name}</span>
                        {selectedTrackId === track.id && <Check className={`w-4 h-4 ${isLight ? 'text-[#1687D9]' : 'text-[#0E0E0E]'}`} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Section: Actions + Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Student Theme Toggle Button (Light Mode / Dark Mode) */}
            {user?.role === 'STUDENT' && (
              <button
                onClick={toggleStudentTheme}
                title="Toggle Light / Dark Student Theme"
                className={`px-3 py-1.5 rounded transition-all text-xs font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
                  studentTheme === 'light'
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1687D9] hover:bg-[#DBEAFE]'
                    : 'bg-[#2B2B2B] border-[#555555] text-white hover:bg-[#555555]'
                }`}
              >
                {studentTheme === 'light' ? (
                  <>
                    <Sun className="w-4 h-4 text-[#1687D9]" />
                    <span className="hidden sm:inline">LIGHT MODE</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-white" />
                    <span className="hidden sm:inline">DARK MODE</span>
                  </>
                )}
              </button>
            )}

            {/* Quick QR Scanner */}
            {(user?.role === 'ADMINISTRATOR' || user?.role === 'CHECK_IN_ADMIN' || user?.role === 'JUDGE') && (
              <button
                onClick={() => {
                  setScannerOpen(true);
                  setScanError(null);
                }}
                className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded border font-mono text-xs font-extrabold transition-all shadow-sm min-w-[36px] min-h-[36px] justify-center ${
                  isLight
                    ? 'bg-[#1687D9] text-white border-[#1687D9] hover:bg-[#0B63B6]'
                    : 'bg-[#FFFFFF] border-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4]'
                }`}
                title="Scan Team QR Badge"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">SCAN QR</span>
              </button>
            )}

            {/* Admin Discretion Feedback Toggle */}
            {user?.role === 'ADMINISTRATOR' ? (
              <button
                onClick={async () => {
                  try {
                    const res: any = await api.post('/feedback/toggle', { enabled: !feedbackEnabled });
                    if (res.success) {
                      queryClient.invalidateQueries({ queryKey: ['feedback-status'] });
                    }
                  } catch (err: any) {
                    console.error('Toggle feedback error:', err);
                  }
                }}
                title="Admin Discretion Toggle: Enable/Disable Feedback Tab for Students & Judges"
                className={`px-3 py-1.5 rounded text-xs font-mono font-extrabold flex items-center gap-1.5 border transition-all ${
                  feedbackEnabled
                    ? isLight ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]' : 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                    : isLight ? 'bg-[#F5FAFE] text-[#52677D] border-[#C8DCEB]' : 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${feedbackEnabled ? (isLight ? 'bg-[#0B63B6] animate-pulse' : 'bg-[#0E0E0E] animate-pulse') : 'bg-[#B3B3B3]'}`} />
                <span className="hidden sm:inline">FEEDBACK: {feedbackEnabled ? 'ENABLED' : 'OFF'}</span>
              </button>
            ) : feedbackEnabled ? (
              <button
                onClick={() => navigate('/feedback')}
                title="Event Feedback"
                className={`px-3 py-1.5 rounded transition-colors text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  isLight
                    ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] hover:bg-[#EFF6FF]'
                    : 'border-[#555555] bg-[#2B2B2B] text-white hover:bg-[#555555]'
                }`}
              >
                <Star className="w-4 h-4" />
                <span className="hidden md:inline">FEEDBACK</span>
              </button>
            ) : null}

            {/* Quick Nav to Landing Page */}
            <button
              onClick={() => navigate('/landing')}
              title="View Landing Page"
              className={`px-3 py-1.5 rounded transition-colors text-xs font-mono font-bold flex items-center gap-1.5 border ${
                isLight
                  ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] hover:bg-[#EFF6FF]'
                  : 'border-[#555555] bg-[#2B2B2B] text-[#E5E5E5] hover:text-white hover:bg-[#555555]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden md:inline">LANDING</span>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Profile System Pill */}
            {user && (
              <div className={`hidden md:flex items-center gap-2 pl-2 border-l font-mono text-xs ${
                isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'
              }`}>
                <div className={`w-7 h-7 rounded border font-bold flex items-center justify-center text-xs ${
                  isLight
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                    : 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF]'
                }`}>
                  {user.name.charAt(0)}
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-xs font-bold font-sans leading-tight ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>{user.name}</span>
                  <span className={`text-[9px] font-mono uppercase tracking-wider ${isLight ? 'text-[#52677D]' : 'text-[#D4D4D4]'}`}>{user.role}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* QR Modals */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        scanError={scanError}
        setScanError={setScanError}
      />

      <AccessDeniedModal
        isOpen={accessDeniedOpen}
        onClose={() => setAccessDeniedOpen(false)}
      />
    </>
  );
};

export default Header;
