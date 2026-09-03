import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  Clock,
  Activity,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

interface TimerConfig {
  hackathonTitle: string;
  hackathonEndTime: string;
  reviewRoundName: string;
  reviewRoundEndTime: string;
  soundEnabled: boolean;
}

export const TimerConsole: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const queryClient = useQueryClient();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const isJudge = user?.role === 'JUDGE';

  // Fetch timer config from API
  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ['timer-config'],
    queryFn: () => api.get('/timer'),
    refetchInterval: user?.role === 'ADMINISTRATOR' ? false : 10000, // Sync every 10 seconds for non-admins to stay updated
  });

  // Local state for admin editing (fallback to default if loading)
  const [config, setConfig] = useState<TimerConfig>({
    hackathonTitle: 'SMARTHORIZON 2026 // 48-HOUR HACKATHON',
    hackathonEndTime: new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16),
    reviewRoundName: 'Round 2: Mid-Evaluation Prototype Assessment',
    reviewRoundEndTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    soundEnabled: true,
  });

  // Update local state when server config changes
  useEffect(() => {
    if (serverConfig) {
      setConfig(serverConfig);
    }
  }, [serverConfig]);

  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: TimerConfig) => api.post('/timer', newConfig),
    onSuccess: (data) => {
      queryClient.setQueryData(['timer-config'], data.config);
    },
  });

  const handleConfigChange = (newConfig: Partial<TimerConfig>, autoSave = false) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (autoSave && user?.role === 'ADMINISTRATOR') {
      updateConfigMutation.mutate(updated);
    }
  };

  const handleSaveConfig = () => {
    if (user?.role === 'ADMINISTRATOR') {
      updateConfigMutation.mutate(config);
    }
  };

  // Live Timer Computations
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 100);
    return () => clearInterval(interval);
  }, []);

  const getRemainingTime = (targetIso: string) => {
    const target = new Date(targetIso).getTime();
    const diff = Math.max(0, target - now.getTime());

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const tenths = Math.floor((diff % 1000) / 100);

    return { hours, minutes, seconds, tenths, diff };
  };

  const hackathonTimer = getRemainingTime(config.hackathonEndTime);
  const roundTimer = getRemainingTime(config.reviewRoundEndTime);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Total durations for progress bars
  const totalHackathonDuration = 48 * 60 * 60 * 1000;
  const hackathonProgressPercent = Math.min(
    100,
    Math.max(0, ((totalHackathonDuration - hackathonTimer.diff) / totalHackathonDuration) * 100)
  );

  const totalRoundDuration = 2 * 60 * 60 * 1000;
  const roundProgressPercent = Math.min(
    100,
    Math.max(0, ((totalRoundDuration - roundTimer.diff) / totalRoundDuration) * 100)
  );

  const { hours: hackathonHours, minutes: hackathonMinutes, seconds: hackathonSeconds, tenths: hackathonTenths } = hackathonTimer;
  const { hours: roundHours, minutes: roundMinutes, seconds: roundSeconds, tenths: roundTenths } = roundTimer;

  return (
    <div className={`space-y-6 text-left select-none max-w-7xl mx-auto font-sans transition-colors duration-300 ${
      isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
    }`}>
      {/* FULLSCREEN STAGE BROADCAST OVERLAY */}
      {isFullScreen && (
        <div className={`fixed inset-0 z-50 p-6 flex flex-col justify-between select-none ${
          isLight ? 'bg-[#EAF6FF] text-[#0B2340]' : 'bg-[#0E0E0E] text-[#FFFFFF]'
        }`}>
          {/* Fullscreen Header */}
          <div className={`flex justify-between items-center border-b pb-4 ${
            isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'
          }`}>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#1687D9] animate-ping" />
              <div>
                <span className={`text-xs font-mono font-bold uppercase tracking-wider block ${
                  isLight ? 'text-[#0B63B6]' : 'text-[#D4D4D4]'
                }`}>
                  {config.hackathonTitle}
                </span>
                <h1 className="text-xl font-mono font-extrabold tracking-tight">VENUE STAGE CONTROL BOARD</h1>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono">
              <button
                onClick={() => handleConfigChange({ soundEnabled: !config.soundEnabled }, true)}
                className={`p-3 rounded border transition-colors ${
                  isJudge
                    ? config.soundEnabled
                      ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                      : 'bg-white text-[#52677D] border-[#C8DCEB]'
                    : config.soundEnabled
                      ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                      : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]'
                }`}
                title="Toggle Audio Notifications"
              >
                {config.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <AnimatedButton
                onClick={() => setIsFullScreen(false)}
                variant="outline"
                size="md"
                className={isLight ? 'bg-white text-[#0B2340] border-[#C8DCEB]' : 'bg-[#181818] text-[#FFFFFF] border-[#2B2B2B]'}
              >
                EXIT FULL SCREEN
              </AnimatedButton>
            </div>
          </div>

          {/* Fullscreen Dual Clock Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-auto max-w-7xl mx-auto w-full">
            {/* Clock 1: Hackathon End */}
            <div className={`relative p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 ${
              isJudge
                ? 'bg-white border border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                : 'bg-[#181818] border border-[#2B2B2B] shadow-2xl'
            }`}>
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1687D9] animate-ping" />
                <span className={`text-xs font-mono font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
                }`}>
                  CLOCK 01: HACKATHON REMAINING TIME
                </span>
              </div>

              <div className="pt-6">
                <div className={`font-mono text-6xl sm:text-7xl xl:text-8xl font-black tracking-tighter flex items-baseline justify-center gap-1 sm:gap-2 ${
                  isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
                }`}>
                  <span>{pad(hackathonHours)}</span>
                  <span className="animate-pulse">:</span>
                  <span>{pad(hackathonMinutes)}</span>
                  <span className="animate-pulse">:</span>
                  <span>{pad(hackathonSeconds)}</span>
                  <span className={`text-2xl sm:text-3xl font-bold ml-1 font-mono ${
                    isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'
                  }`}>
                    .{hackathonTenths}
                  </span>
                </div>
                <div className={`flex justify-center gap-10 sm:gap-14 font-mono text-xs font-bold uppercase tracking-widest mt-2 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  <span>HOURS</span>
                  <span>MINUTES</span>
                  <span>SECONDS</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={`w-full rounded-full h-3 border p-0.5 overflow-hidden ${
                isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
              }`}>
                <motion.div
                  className={`h-full rounded-full ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`}
                  animate={{ width: `${hackathonProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Clock 2: Current Review Round */}
            <div className={`relative p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 ${
              isJudge
                ? 'bg-white border border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                : 'bg-[#181818] border border-[#2B2B2B] shadow-2xl'
            }`}>
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1687D9] animate-ping" />
                <span className={`text-xs font-mono font-extrabold uppercase tracking-wider ${
                  isLight ? 'text-[#0B2340]' : 'text-[#D4D4D4]'
                }`}>
                  CLOCK 02: ACTIVE REVIEW ROUND TIMER
                </span>
              </div>

              <div className="pt-6">
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded inline-block mb-3 uppercase border ${
                  isJudge
                    ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                    : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                }`}>
                  {config.reviewRoundName}
                </span>

                <div className={`font-mono text-6xl sm:text-7xl xl:text-8xl font-black tracking-tighter flex items-baseline justify-center gap-1 sm:gap-2 ${
                  isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
                }`}>
                  <span>{pad(roundHours)}</span>
                  <span className="animate-pulse">:</span>
                  <span>{pad(roundMinutes)}</span>
                  <span className="animate-pulse">:</span>
                  <span>{pad(roundSeconds)}</span>
                  <span className={`text-2xl sm:text-3xl font-bold ml-1 font-mono ${
                    isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'
                  }`}>
                    .{roundTenths}
                  </span>
                </div>
                <div className={`flex justify-center gap-10 sm:gap-14 font-mono text-xs font-bold uppercase tracking-widest mt-2 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  <span>HOURS</span>
                  <span>MINUTES</span>
                  <span>SECONDS</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={`w-full rounded-full h-3 border p-0.5 overflow-hidden ${
                isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
              }`}>
                <motion.div
                  className={`h-full rounded-full ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`}
                  animate={{ width: `${roundProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Fullscreen Footer */}
          <div className={`flex justify-between items-center border-t pt-4 font-mono text-xs ${
            isLight ? 'border-[#C8DCEB] text-[#52677D]' : 'border-[#2B2B2B] text-[#B3B3B3]'
          }`}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-pulse" />
              VENUE BROADCAST MODE ACTIVE &bull; STAGE DISPLAY LOCK ENABLED
            </span>
            <span>SMART HORIZON 2026 &bull; NHCE CAMPUS BENGALURU</span>
          </div>
        </div>
      )}

      {/* REGULAR DASHBOARD TIMER CONSOLE VIEW */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl font-mono border ${
        isJudge
          ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-ping" />
            <span className={`font-bold tracking-wider ${isLight ? 'text-[#0B63B6]' : 'text-[#FFFFFF]'}`}>
              SYS // STAGE COUNTDOWN COMMAND
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight ${
            isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
          }`}>
            STAGE TIMERS & STAGE CONTROL
          </h1>
          <p className={`text-xs mt-0.5 font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
            REAL-TIME DUAL CLOCKS FOR MAIN VENUE BROADCASTS, JUDGING ROUNDS & STAGE COUNTDOWNS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AnimatedButton
            onClick={() => setIsFullScreen(true)}
            variant="primary"
            size="md"
            className={isLight ? 'bg-[#1687D9] text-white font-bold hover:bg-[#0B63B6]' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]'}
          >
            LAUNCH FULL SCREEN
          </AnimatedButton>
        </div>
      </div>

      {/* MAIN DUAL CLOCKS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
        {/* Clock 1: Hackathon End */}
        <div className={`p-6 rounded-2xl space-y-6 text-center relative overflow-hidden border ${
          isJudge
            ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
            : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
        }`}>
          <div className={`flex justify-between items-center border-b pb-4 ${
            isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1687D9] animate-ping" />
              <h3 className={`text-sm font-bold uppercase ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                HACKATHON END COUNTDOWN
              </h3>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${
              isJudge
                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}>
              48H NON-STOP
            </span>
          </div>

          <div className="py-2">
            <div className={`font-mono text-5xl sm:text-6xl font-black tracking-tight flex items-baseline justify-center gap-1 sm:gap-2 ${
              isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
            }`}>
              <span>{pad(hackathonHours)}</span>
              <span className="animate-pulse">:</span>
              <span>{pad(hackathonMinutes)}</span>
              <span className="animate-pulse">:</span>
              <span>{pad(hackathonSeconds)}</span>
              <span className={`text-xl sm:text-2xl font-bold ml-1 font-mono ${
                isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'
              }`}>
                .{hackathonTenths}
              </span>
            </div>
            <div className={`flex justify-center gap-8 sm:gap-12 font-mono text-[11px] font-bold uppercase tracking-widest mt-2 ${
              isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
            }`}>
              <span>HOURS</span>
              <span>MINUTES</span>
              <span>SECONDS</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className={`flex justify-between text-[11px] font-mono ${isLight ? 'text-[#52677D]' : 'text-[#D4D4D4]'}`}>
              <span>ELAPSED</span>
              <span className={`font-bold ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                {hackathonProgressPercent.toFixed(1)}%
              </span>
            </div>
            <div className={`w-full rounded-full h-2.5 border p-0.5 overflow-hidden ${
              isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
            }`}>
              <motion.div
                className={`h-full rounded-full ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`}
                animate={{ width: `${hackathonProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Clock 2: Active Review Round Timer */}
        <div className={`p-6 rounded-2xl space-y-6 text-center relative overflow-hidden border ${
          isJudge
            ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
            : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
        }`}>
          <div className={`flex justify-between items-center border-b pb-4 ${
            isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'
          }`}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1687D9] animate-ping" />
              <h3 className={`text-sm font-bold uppercase ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                REVIEW ROUND COUNTDOWN
              </h3>
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded border ${
              isJudge
                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                : 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]'
            }`}>
              ACTIVE ROUND
            </span>
          </div>

          <div className="py-1">
            <span className={`text-xs font-bold font-mono px-3 py-1 rounded inline-block mb-3 uppercase border ${
              isJudge
                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}>
              {config.reviewRoundName}
            </span>

            <div className={`font-mono text-5xl sm:text-6xl font-black tracking-tight flex items-baseline justify-center gap-1 sm:gap-2 ${
              isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
            }`}>
              <span>{pad(roundHours)}</span>
              <span className="animate-pulse">:</span>
              <span>{pad(roundMinutes)}</span>
              <span className="animate-pulse">:</span>
              <span>{pad(roundSeconds)}</span>
              <span className={`text-xl sm:text-2xl font-bold ml-1 font-mono ${
                isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'
              }`}>
                .{roundTenths}
              </span>
            </div>
            <div className={`flex justify-center gap-8 sm:gap-12 font-mono text-[11px] font-bold uppercase tracking-widest mt-2 ${
              isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
            }`}>
              <span>HOURS</span>
              <span>MINUTES</span>
              <span>SECONDS</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className={`flex justify-between text-[11px] font-mono ${isLight ? 'text-[#52677D]' : 'text-[#D4D4D4]'}`}>
              <span>ROUND COMPLETION</span>
              <span className={`font-bold ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                {roundProgressPercent.toFixed(1)}%
              </span>
            </div>
            <div className={`w-full rounded-full h-2.5 border p-0.5 overflow-hidden ${
              isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
            }`}>
              <motion.div
                className={`h-full rounded-full ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`}
                animate={{ width: `${roundProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CLOCK CONFIGURATION CONTROLS */}
      {user?.role === 'ADMINISTRATOR' && (
        <div className={`p-6 rounded-2xl space-y-6 font-mono border ${
          isJudge
            ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
            : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
        }`}>
          <div className={`flex justify-between items-center border-b pb-4 ${
            isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'
          }`}>
            <div className="flex items-center gap-3">
              <Settings className={`w-5 h-5 ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`} />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                STAGE CLOCK CONFIGURATION CONTROLS
              </h3>
            </div>
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded border font-bold uppercase ${
              isJudge
                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}>
              SYS // ADMIN EXCLUSIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-mono font-bold uppercase mb-1 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  HACKATHON MAIN TITLE
                </label>
                <input
                  type="text"
                  value={config.hackathonTitle}
                  onChange={(e) => handleConfigChange({ hackathonTitle: e.target.value })}
                  className={`w-full h-10 px-4 rounded-xl text-xs font-mono focus:outline-none border ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-mono font-bold uppercase mb-1 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  HACKATHON END DATE & TIME
                </label>
                <input
                  type="datetime-local"
                  value={config.hackathonEndTime}
                  onChange={(e) => handleConfigChange({ hackathonEndTime: e.target.value })}
                  className={`w-full h-10 px-4 rounded-xl text-xs font-mono focus:outline-none border ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-mono font-bold uppercase mb-1 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  ACTIVE REVIEW ROUND NAME
                </label>
                <input
                  type="text"
                  value={config.reviewRoundName}
                  onChange={(e) => handleConfigChange({ reviewRoundName: e.target.value })}
                  className={`w-full h-10 px-4 rounded-xl text-xs font-mono focus:outline-none border ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-mono font-bold uppercase mb-1 ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  REVIEW ROUND TARGET END TIME
                </label>
                <input
                  type="datetime-local"
                  value={config.reviewRoundEndTime}
                  onChange={(e) => handleConfigChange({ reviewRoundEndTime: e.target.value })}
                  className={`w-full h-10 px-4 rounded-xl text-xs font-mono focus:outline-none border ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                  }`}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 mt-2 border-t border-[#2B2B2B]">
            <AnimatedButton variant="primary" size="md" onClick={handleSaveConfig} className={`font-bold font-mono px-8 py-3 ${isLight ? 'bg-[#1687D9] text-white hover:bg-[#0B63B6]' : 'bg-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4]'}`}>
              SAVE STAGE TIMERS
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerConsole;







