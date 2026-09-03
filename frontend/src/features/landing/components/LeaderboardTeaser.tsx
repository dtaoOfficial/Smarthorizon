import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowUpRight } from 'lucide-react';

export interface LeaderboardTeaserProps {
  onNavigate: () => void;
}

export const LeaderboardTeaser: React.FC<LeaderboardTeaserProps> = ({ onNavigate }) => {
  return (
    <motion.button
      type="button"
      onClick={onNavigate}
      whileHover={{ scale: 1.02, borderColor: '#FFFFFF' }}
      className="p-4 rounded-2xl bg-[#181818] border border-[#2B2B2B] shadow-xl backdrop-blur-md text-left font-mono select-none transition-all group w-full max-w-sm text-[#FFFFFF]"
    >
      <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#2B2B2B] text-xs">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFFFFF] group-hover:rotate-12 transition-transform" />
          <span className="text-[#FFFFFF] font-extrabold text-[11px] tracking-wider uppercase">
            LIVE LEADERBOARD TEASER
          </span>
        </div>
        <ArrowUpRight className="w-4 h-4 text-[#FFFFFF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-center items-center p-4 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-center">
            <div>
              <span className="text-[#FFFFFF] font-extrabold text-[10px] block">LEADERBOARD UNAVAILABLE</span>
              <span className="text-[#B3B3B3] text-[9px] mt-1 block">Results will appear after evaluations are submitted.</span>
            </div>
        </div>
      </div>
    </motion.button>
  );
};
