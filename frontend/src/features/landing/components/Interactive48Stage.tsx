import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, UploadCloud, Gavel, Trophy, ChevronDown } from 'lucide-react';
import { RevealOnScroll } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export interface StageStep {
  name: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
  detail: string;
}

const STAGES: StageStep[] = [
  {
    name: 'BUILD',
    badge: '00h - 36h',
    desc: '36-Hour Non-Stop Engineering Sprint',
    icon: <Code2 className="w-5 h-5 text-[#FFFFFF]" />,
    detail: 'Teams build functional software/hardware solutions with mentor guidance and live check-ins.',
  },
  {
    name: 'SUBMIT',
    badge: '36h - 38h',
    desc: 'Repository & Video Lock',
    icon: <UploadCloud className="w-5 h-5 text-[#FFFFFF]" />,
    detail: 'Automated GitHub repository commit lock, video walkthrough upload, and documentation submission.',
  },
  {
    name: 'JUDGE',
    badge: '38h - 44h',
    desc: '3-Round Speed Jury Evaluation',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
    detail: '5-minute speed pitching sessions evaluated across 8 structured rubric parameters.',
  },
  {
    name: 'WIN',
    badge: '44h - 48h',
    desc: 'Grand Finale & Ceremony',
    icon: <Trophy className="w-5 h-5 text-[#D4D4D4]" />,
    detail: 'Normalized score reveal, track champion announcements, and ₹23.75 Lakhs cash awards.',
  },
];

export const Interactive48Stage: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeStage, setActiveStage] = useState<number>(0);

  const progressPercent = ((activeStage) / (STAGES.length - 1)) * 100;

  return (
    <section className="py-20 bg-[#0E0E0E] border-y border-[#2B2B2B] text-center select-none relative overflow-hidden">
      <RevealOnScroll>
        <div className="max-w-6xl mx-auto px-6 space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181818] border border-[#2B2B2B] text-xs font-mono font-medium text-[#D4D4D4]">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span>48-HOUR SPRINT TIMELINE</span>
          </div>

          {/* Interactive Trigger Element */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            onMouseEnter={() => setIsExpanded(true)}
            className="cursor-pointer inline-block group relative py-2"
          >
            <div className="space-y-2">
              <h2 className="text-6xl sm:text-8xl md:text-9xl font-black font-syne tracking-tight leading-none text-[#FFFFFF] transition-transform duration-300 group-hover:scale-[1.01]">
                48 HOURS
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-mono font-medium text-[#B3B3B3] tracking-widest uppercase">
                <span>EXPLORE THE 48-HOUR SPRINT STAGES</span>
                <ChevronDown className={`w-4 h-4 text-[#D4D4D4] transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'translate-y-0.5'}`} />
              </div>
            </div>
          </div>

          {/* Expandable 4 Stages Timeline */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: MOTION_TOKENS.duration.standard, ease: MOTION_TOKENS.ease.smooth }}
                className="pt-6 overflow-hidden"
              >
                <div className="relative">
                  {/* Connecting Line Track */}
                  <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 bg-[#2B2B2B] -translate-y-1/2 z-0" />

                  {/* Animated Connecting Line Progress */}
                  <motion.div
                    className="hidden md:block absolute top-1/2 left-8 h-0.5 bg-[#FFFFFF] -translate-y-1/2 z-0 origin-left"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: MOTION_TOKENS.duration.standard, ease: MOTION_TOKENS.ease.smooth }}
                    style={{ maxWidth: 'calc(100% - 4rem)' }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    {STAGES.map((stg, idx) => {
                      const isSelected = activeStage === idx;
                      const isPassed = activeStage > idx;

                      return (
                        <motion.div
                          key={stg.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: idx * 0.08 }}
                          onMouseEnter={() => setActiveStage(idx)}
                          onClick={() => setActiveStage(idx)}
                          className={`p-6 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? 'bg-[#2B2B2B] border-[#FFFFFF] shadow-xl -translate-y-1 scale-[1.01] opacity-100'
                              : isPassed
                              ? 'bg-[#181818] border-[#555555] opacity-90'
                              : 'bg-[#181818] border-[#2B2B2B] opacity-70 hover:opacity-100 hover:border-[#555555]'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <motion.span
                              animate={{ scale: isSelected ? 1.05 : 1 }}
                              className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded border transition-colors ${
                                isSelected
                                  ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                                  : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                              }`}
                            >
                              {stg.badge}
                            </motion.span>
                            
                            <motion.div
                              animate={{
                                scale: isSelected ? 1.15 : 1,
                                y: isSelected ? -2 : 0,
                              }}
                              transition={MOTION_TOKENS.spring.bouncy}
                            >
                              {stg.icon}
                            </motion.div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs font-mono text-[#D4D4D4] font-medium block">
                              STAGE 0{idx + 1}
                            </span>
                            <h3 className="text-2xl font-bold font-outfit text-[#FFFFFF] tracking-tight">
                              {stg.name}
                            </h3>
                          </div>

                          <p className="text-xs text-[#B3B3B3] font-sans mt-2 leading-relaxed">
                            {stg.desc}
                          </p>

                          <div className="pt-3 mt-3 border-t border-[#2B2B2B]">
                            <p className="text-[11px] text-[#D4D4D4] font-sans leading-normal">
                              {stg.detail}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </RevealOnScroll>
    </section>
  );
};

export default Interactive48Stage;
