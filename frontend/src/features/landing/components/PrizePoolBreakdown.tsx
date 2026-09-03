import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Trophy, Medal, Award, Lightbulb, Sparkles } from 'lucide-react';
import { RevealOnScroll } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export interface AwardCategory {
  title: string;
  amount: string;
  desc: string;
  badge: string;
  icon: React.ReactNode;
  gold?: boolean;
}

const AWARD_CATEGORIES: AwardCategory[] = [
  {
    title: 'GRAND CHAMPIONS',
    amount: '₹5,00,000',
    desc: 'Overall Highest Ranked Team across all 8 Innovation Tracks',
    badge: 'OVERALL WINNER',
    icon: <Trophy className="w-6 h-6 text-[#FFFFFF]" />,
    gold: true,
  },
  {
    title: 'FIRST RUNNER-UP',
    amount: '₹3,00,000',
    desc: 'Overall Second Ranked Team across the Hackathon',
    badge: 'RUNNER-UP',
    icon: <Medal className="w-6 h-6 text-[#D4D4D4]" />,
  },
  {
    title: '8 SPECIALIZED THEME CHAMPIONS',
    amount: '₹1,50,000 Each',
    desc: 'Top Scoring Team in Each of the 8 Individual Innovation Domains (₹12,00,000 Total)',
    badge: '8 SPECIALIZED THEMES',
    icon: <Award className="w-6 h-6 text-[#D4D4D4]" />,
  },
  {
    title: 'BEST ALL-GIRLS TEAM',
    amount: '₹1,50,000',
    desc: 'Special Recognition Award for Highest Scoring All-Women Engineering Team',
    badge: 'SPECIAL AWARD',
    icon: <Sparkles className="w-6 h-6 text-[#D4D4D4]" />,
  },
  {
    title: 'INNOVATION IMPACT AWARD',
    amount: '₹1,00,000',
    desc: 'Highest Jury Score in Real-World Applicability & Originality',
    badge: 'INNOVATION IMPACT',
    icon: <Lightbulb className="w-6 h-6 text-[#D4D4D4]" />,
  },
];

export const PrizePoolBreakdown: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [displayCount, setDisplayCount] = useState<number>(0);

  const targetAmount = 2375000;

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const duration = 1800; // 1.8s eased count up

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easedProgress * targetAmount);
      setDisplayCount(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayCount(targetAmount);
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView]);

  const formattedAmount = '₹' + displayCount.toLocaleString('en-IN');

  return (
    <section id="prizes" ref={containerRef} className="py-24 max-w-7xl mx-auto px-6 text-left select-none relative">
      <RevealOnScroll>
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
            REWARD POOL ALLOCATION
          </span>

          <h2 className="text-4xl sm:text-6xl font-black font-outfit text-[#FFFFFF] tracking-tight uppercase leading-none">
            GRAND PRIZE POOL
          </h2>

          {/* Large Number Highlight */}
          <div className="pt-2">
            <span className="text-5xl sm:text-7xl md:text-8xl font-black font-syne text-[#FFFFFF] block tracking-tight">
              {formattedAmount}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-[#B3B3B3] tracking-widest uppercase block mt-2">
              RS. 23.75 LAKHS TOTAL CASH AWARDS ACROSS 8 SPECIALIZED THEMES
            </span>
          </div>
        </div>
      </RevealOnScroll>

      {/* Award Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AWARD_CATEGORIES.map((award, idx) => {
          const isGold = award.gold;

          return (
            <motion.div
              key={award.title}
              initial={{
                opacity: 0,
                y: isGold ? 28 : 20,
                scale: isGold ? 0.96 : 1,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: MOTION_TOKENS.duration.reveal,
                delay: idx * 0.08,
                ease: MOTION_TOKENS.ease.smooth,
              }}
              whileHover={{ y: -4, scale: 1.01 }}
              className={`p-7 rounded-xl border text-left flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
                isGold
                  ? 'bg-[#2B2B2B] border-[#FFFFFF] shadow-xl md:col-span-2 lg:col-span-1'
                  : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span
                    className={`text-[10px] font-mono font-bold px-3 py-1 rounded border ${
                      isGold
                        ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                        : 'bg-[#0E0E0E] text-[#D4D4D4] border-[#2B2B2B]'
                    }`}
                  >
                    {award.badge}
                  </span>
                  
                  <motion.div whileHover={{ scale: 1.15, rotate: 5 }}>
                    {award.icon}
                  </motion.div>
                </div>

                <h3 className="text-lg font-bold font-outfit text-[#FFFFFF]">{award.title}</h3>
                <p className="text-xs text-[#B3B3B3] mt-2 font-sans leading-relaxed">{award.desc}</p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#2B2B2B]">
                <span className="text-2xl font-black font-outfit block text-[#FFFFFF]">
                  {award.amount}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default PrizePoolBreakdown;
