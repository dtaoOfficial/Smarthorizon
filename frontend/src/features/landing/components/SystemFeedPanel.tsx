import React from 'react';
import { motion } from 'framer-motion';

export const SystemFeedPanel: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-md mx-auto p-4 rounded-2xl bg-[#181818] border border-[#2B2B2B] shadow-xl backdrop-blur-md font-mono text-xs select-none relative overflow-hidden text-[#FFFFFF]"
    >
      {/* Terminal Top Accent */}
      <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-[#2B2B2B]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFFFFF] animate-ping" />
          <span className="text-[#FFFFFF] font-extrabold tracking-wider text-[11px]">
            SMART HORIZON OS // TELEMETRY
          </span>
        </div>
        <span className="text-[10px] text-[#B3B3B3] font-bold">V2.6_ACTIVE</span>
      </div>

      {/* Telemetry Rows */}
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B]">
          <span className="text-[#D4D4D4] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" /> REGISTRATION
          </span>
          <span className="text-[#FFFFFF] font-extrabold tracking-wide">OPEN // ACTIVE</span>
        </div>

        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B]">
          <span className="text-[#D4D4D4] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" /> ENROLLED TEAMS
          </span>
          <span className="text-[#FFFFFF] font-extrabold">65+ VERIFIED</span>
        </div>

        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B]">
          <span className="text-[#D4D4D4] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" /> TRACK DOMAINS
          </span>
          <span className="text-[#FFFFFF] font-extrabold">8 TRACKS</span>
        </div>

        <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B]">
          <span className="text-[#D4D4D4] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF]" /> GRAND PRIZE POOL
          </span>
          <span className="text-[#FFFFFF] font-extrabold">Rs. 23.75L CASH</span>
        </div>
      </div>
    </motion.div>
  );
};
