import React from 'react';
import { motion } from 'framer-motion';

export const HeroHudOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden hidden lg:block">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hud-line-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#D4D4D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Connector Path 1: Status Beacon to Main Headline */}
        <motion.path
          d="M 140 85 L 240 85 L 280 130"
          stroke="url(#hud-line-glow)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />
        <circle cx="280" cy="130" r="3" fill="#FFFFFF" />

        {/* Connector Path 2: 48H Radial Ring to Hackathon Logo */}
        <motion.path
          d="M 680 160 L 780 160 L 820 220"
          stroke="url(#hud-line-glow)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />
        <circle cx="820" cy="220" r="3" fill="#D4D4D4" />

        {/* Connector Path 3: Telemetry Panel to 2026 Visual Anchor */}
        <motion.path
          d="M 320 380 L 420 380 L 460 320"
          stroke="url(#hud-line-glow)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        />
        <circle cx="460" cy="320" r="3" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const Radial48Ring: React.FC = () => {
  return (
    <div className="relative inline-flex items-center justify-center p-3 rounded-full bg-[#181818]/90 border border-[#2B2B2B] shadow-xl font-mono text-center select-none backdrop-blur-md">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="#2B2B2B"
          strokeWidth="6"
          fill="none"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeDasharray="264"
          strokeDashoffset="66"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: 264 }}
          animate={{ strokeDashoffset: 66 }}
          transition={{ duration: 1.2, delay: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-black font-mono text-white leading-none">48H</span>
        <span className="text-[8px] font-bold text-[#D4D4D4] uppercase tracking-widest mt-0.5">BUILD</span>
      </div>
    </div>
  );
};
