import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Code2, Gavel, UploadCloud, Medal, Trophy } from 'lucide-react';

export interface TimelineStage {
  step: string;
  time: string;
  title: string;
  subtitle: string;
  detail: string;
  icon: React.ReactNode;
}

const STAGES: TimelineStage[] = [
  {
    step: '01',
    time: '00h – 08h',
    title: 'IDEATE & ARCHITECT',
    subtitle: 'Problem Breakdown & Stack Selection',
    detail: 'Teams check in via encrypted QR badge, unpack track problem statements, initialize Git repos, and map system architecture.',
    icon: <Brain className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '02',
    time: '08h – 24h',
    title: 'BUILD PHASE',
    subtitle: 'Non-stop Sprint & Prototype Coding',
    detail: 'Core development phase. Mentors conduct desk check-ins while teams build MVP features, API endpoints, and hardware integrations.',
    icon: <Code2 className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '03',
    time: '24h – 36h',
    title: 'MID-EVALUATION & TEST',
    subtitle: 'Jury Round 1 & Stress Testing',
    detail: 'Round 1 judging begins! Expert juries evaluate preliminary architecture, code repository commits, and early demo readiness.',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '04',
    time: '36h – 42h',
    title: 'FREEZE & SUBMIT',
    subtitle: 'Repository Lock & Deck Upload',
    detail: 'Final commit freeze. Teams lock public GitHub repos, upload live demo links, presentation decks, and video walkthroughs.',
    icon: <UploadCloud className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '05',
    time: '42h – 46h',
    title: 'FINAL SPEED JUDGING',
    subtitle: '5-Min Jury Pitches (Round 2 & 3)',
    detail: 'Jury panels evaluate top contending teams in 5-minute structured pitches across 8 criteria rubrics on official marksheets.',
    icon: <Medal className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '06',
    time: '48h',
    title: 'GRAND FINALE & AWARDS',
    subtitle: 'Leaderboard Unfreeze & Cash Prizes',
    detail: 'Official leaderboard lock lifted. Rs. 23.75L cash prizes awarded to Grand Champions, Track Winners, and Innovation Impact teams!',
    icon: <Trophy className="w-5 h-5 text-[#FFFFFF]" />,
  },
];

export const JourneyTimeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section className="py-24 max-w-6xl mx-auto px-6 text-left select-none">
      <div className="text-center space-y-2 mb-16 font-mono">
        <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-full border border-[#2B2B2B]">
          48-HOUR MISSION CHRONOLOGY
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
          The 48-Hour Hackathon Journey
        </h2>
        <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl mx-auto font-sans">
          From venue QR check-in to the Grand Finale ceremony—explore the 6 milestone phases of Smart Horizon 2026.
        </p>
      </div>

      {/* Interactive Timeline Stepper */}
      <div className="relative font-mono">
        {/* Background Connecting Line */}
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-[#2B2B2B] -translate-y-1/2 rounded-full pointer-events-none">
          <div
            className="h-full bg-[#FFFFFF] rounded-full transition-all duration-500"
            style={{ width: `${((activeStep + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        {/* Timeline Milestone Nodes */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
          {STAGES.map((stage, idx) => {
            const isActive = activeStep === idx;

            return (
              <motion.button
                key={stage.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                onMouseEnter={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[140px] ${
                  isActive
                    ? 'bg-[#2B2B2B] border-[#555555] shadow-xl ring-2 ring-[#555555]/40 scale-105 z-20 text-[#FFFFFF]'
                    : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] text-[#B3B3B3]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded border ${
                        isActive
                          ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                          : 'bg-[#0E0E0E] text-[#D4D4D4] border-[#2B2B2B]'
                      }`}
                    >
                      {stage.step}
                    </span>
                    {stage.icon}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#FFFFFF] block">
                    {stage.time}
                  </span>
                  <h4 className="text-xs font-bold font-outfit text-[#FFFFFF] mt-1 leading-snug">
                    {stage.title}
                  </h4>
                </div>

                <span className="text-[9px] font-mono text-[#B3B3B3] block mt-2">
                  {stage.subtitle}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Stage Inspector Box */}
        <div className="mt-8 p-6 rounded-2xl bg-[#181818] border-2 border-[#555555] shadow-2xl backdrop-blur-xl relative overflow-hidden text-[#FFFFFF]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2B2B2B] pb-4 mb-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center shadow-md shrink-0">
                {STAGES[activeStep].icon}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest block">
                  PHASE {STAGES[activeStep].step} &bull; {STAGES[activeStep].time}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold font-outfit text-[#FFFFFF]">
                  {STAGES[activeStep].title}
                </h3>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#0E0E0E] text-[#D4D4D4] border border-[#2B2B2B]">
              {STAGES[activeStep].subtitle}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#D4D4D4] leading-relaxed font-sans">
            {STAGES[activeStep].detail}
          </p>
        </div>
      </div>
    </section>
  );
};
