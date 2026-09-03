import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Code2, UploadCloud, Gavel, Trophy } from 'lucide-react';

export interface StepItem {
  num: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    num: '01',
    name: 'REGISTER',
    desc: 'Form team of 2-5, select your innovation track, and receive your encrypted QR ticket badge.',
    icon: <UserPlus className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    num: '02',
    name: 'BUILD',
    desc: '48 hours non-stop sprint. Initialize public Git repo, code your MVP, and receive mentor check-ins.',
    icon: <Code2 className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    num: '03',
    name: 'SUBMIT',
    desc: 'Upload live demo link, public GitHub repository URL, and pitch deck before commit freeze.',
    icon: <UploadCloud className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    num: '04',
    name: 'EVALUATE',
    desc: 'Pitch live to domain expert juries in 5-minute speed evaluation rounds across 8 rubric criteria.',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    num: '05',
    name: 'WIN',
    desc: 'Leaderboard unfreeze ceremony. Rs. 23.75L cash prizes awarded to Grand Champions & Track Winners!',
    icon: <Trophy className="w-5 h-5 text-[#FFFFFF]" />,
  },
];

export const HowItWorksFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section className="py-20 max-w-6xl mx-auto px-6 text-left select-none">
      <div className="text-center space-y-2 mb-14 font-mono">
        <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-full border border-[#2B2B2B]">
          PARTICIPATION WORKFLOW
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
          How It Works: 5 Steps to Victory
        </h2>
        <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl mx-auto font-sans">
          Hover or tap any stage to inspect the participation requirements and milestone criteria.
        </p>
      </div>

      {/* 5-Step Connected Flow Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative font-mono">
        {/* Subtle Connecting Line */}
        <div className="hidden sm:block absolute top-1/2 left-4 right-4 h-0.5 bg-[#2B2B2B] -translate-y-1/2 pointer-events-none z-0" />

        {STEPS.map((step, idx) => {
          const isActive = activeStep === idx;
          return (
            <motion.button
              key={step.num}
              type="button"
              onClick={() => setActiveStep(idx)}
              onMouseEnter={() => setActiveStep(idx)}
              className={`relative z-10 p-5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[160px] ${
                isActive
                  ? 'bg-[#2B2B2B] border-[#555555] shadow-xl ring-2 ring-[#555555]/30 scale-105'
                  : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span
                    className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded border ${
                      isActive ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]' : 'bg-[#0E0E0E] text-[#D4D4D4] border-[#2B2B2B]'
                    }`}
                  >
                    STEP {step.num}
                  </span>
                  {step.icon}
                </div>

                <h3 className="text-sm font-extrabold font-outfit text-[#FFFFFF] tracking-wider">
                  {step.name}
                </h3>
              </div>

              <p className="text-xs text-[#B3B3B3] font-sans leading-relaxed mt-2">
                {step.desc}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
