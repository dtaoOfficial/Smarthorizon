import React, { useState, useEffect } from 'react';

export const CountdownTimer: React.FC = () => {
  const targetDate = new Date('2026-09-03T09:00:00+05:30').getTime();
  const endDate = new Date('2026-09-05T09:00:00+05:30').getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: 'COUNTDOWN', // 'COUNTDOWN' | 'ACTIVE' | 'FINISHED'
    progress: 0,
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();

      if (now < targetDate) {
        const diff = targetDate - now;
        const totalDuration = 30 * 24 * 3600 * 1000; // approximate preparation window
        const progress = Math.min(100, Math.max(15, 100 - Math.floor((diff / totalDuration) * 100)));

        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          status: 'COUNTDOWN',
          progress,
        });
      } else if (now >= targetDate && now <= endDate) {
        const elapsed = now - targetDate;
        const total = endDate - targetDate;
        const progress = Math.min(100, Math.floor((elapsed / total) * 100));

        const diff = endDate - now;
        setTimeLeft({
          days: 0,
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          status: 'ACTIVE',
          progress,
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: 'FINISHED',
          progress: 100,
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, endDate]);

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-[#181818] border border-[#2B2B2B] shadow-xl backdrop-blur-md relative overflow-hidden select-none font-mono">
      {/* Header Phase Status */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2B2B2B] text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#FFFFFF]" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFFFFF]" />
          </span>
          <span className="text-[#FFFFFF] font-bold tracking-wider uppercase text-[11px]">
            {timeLeft.status === 'COUNTDOWN' && 'STAGE: COUNTDOWN TO GRAND FINALE'}
            {timeLeft.status === 'ACTIVE' && 'STAGE: 48-HOUR HACKATHON IN PROGRESS'}
            {timeLeft.status === 'FINISHED' && 'STAGE: HACKATHON COMPLETE // RESULTS PUBLISHED'}
          </span>
        </div>
        <span className="text-[#D4D4D4] font-bold text-[10px] uppercase tracking-widest bg-[#0E0E0E] px-2.5 py-0.5 rounded border border-[#2B2B2B] hidden sm:inline">
          OFFICIAL SYSTEM CLOCK
        </span>
      </div>

      {/* Timer Digits */}
      <div className="grid grid-cols-4 gap-3 text-center my-4 font-mono">
        <div className="p-3.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-inner hover:border-[#555555] transition-colors">
          <span className="text-2xl sm:text-4xl font-extrabold text-[#FFFFFF] block tracking-tight">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-[#B3B3B3] uppercase font-bold tracking-wider block mt-1">DAYS</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-inner hover:border-[#555555] transition-colors">
          <span className="text-2xl sm:text-4xl font-extrabold text-[#FFFFFF] block tracking-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-[#B3B3B3] uppercase font-bold tracking-wider block mt-1">HOURS</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-inner hover:border-[#555555] transition-colors">
          <span className="text-2xl sm:text-4xl font-extrabold text-[#FFFFFF] block tracking-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-[#B3B3B3] uppercase font-bold tracking-wider block mt-1">MINUTES</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-inner hover:border-[#555555] transition-colors">
          <span className="text-2xl sm:text-4xl font-extrabold text-[#FFFFFF] block tracking-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-[#B3B3B3] uppercase font-bold tracking-wider block mt-1">SECONDS</span>
        </div>
      </div>

      {/* Readiness Progress Bar */}
      <div className="mt-4 pt-3 border-t border-[#2B2B2B] flex flex-col gap-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-[#B3B3B3] font-bold">
          <span>READINESS MATRIX</span>
          <span className="text-[#FFFFFF]">{timeLeft.progress}% PREPARED</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#0E0E0E] overflow-hidden border border-[#2B2B2B]">
          <div
            className="h-full bg-[#FFFFFF] rounded-full transition-all duration-500"
            style={{ width: `${timeLeft.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
