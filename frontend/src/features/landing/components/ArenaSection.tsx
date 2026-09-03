import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export const ArenaSection: React.FC = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6 text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-[#181818] text-[#FFFFFF] border border-[#2B2B2B] tracking-widest uppercase shadow-sm">
          <Zap className="w-3.5 h-3.5 text-[#FFFFFF]" /> THE COMPETITION ARENA
        </span>

        {/* Oversized Staggered Typography Statement */}
        <div className="pt-6 font-outfit font-black tracking-tight leading-none text-[#FFFFFF] text-4xl sm:text-6xl md:text-7xl space-y-2 uppercase">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[#FFFFFF]"
          >
            48 HOURS.
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-[#D4D4D4]"
          >
            8 DOMAINS.
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-[#FFFFFF] underline decoration-[#2B2B2B]"
          >
            ONE WINNER.
          </motion.div>
        </div>

        <p className="max-w-2xl mx-auto pt-6 text-sm sm:text-base text-[#B3B3B3] font-sans leading-relaxed">
          High-stakes international engineering hackathon. Prototype under pressure, pitch to domain expert juries, and claim your place on the global leaderboard.
        </p>
      </motion.div>
    </section>
  );
};
