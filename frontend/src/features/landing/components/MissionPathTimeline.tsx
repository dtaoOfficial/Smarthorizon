import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Brain, Code2, UploadCloud, Gavel, Trophy } from 'lucide-react';

export interface MissionStage {
  step: string;
  time: string;
  name: string;
  subtitle: string;
  desc: string;
  icon: React.ReactNode;
}

const MISSION_STAGES: MissionStage[] = [
  {
    step: '01',
    time: '00h',
    name: 'REGISTER',
    subtitle: 'Team Registration & QR Badge Issuance',
    desc: 'Form teams of 2–5 members, select your innovation track, and receive unique encrypted QR ticket badges for venue check-in desks.',
    icon: <UserPlus className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '02',
    time: '04h',
    name: 'IDEATE',
    subtitle: 'Problem Statement Unpacking & Architecture',
    desc: 'Unpack domain problem statements, initialize public GitHub code repositories, and finalize technical architecture.',
    icon: <Brain className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '03',
    time: '24h',
    name: 'BUILD',
    subtitle: '48-Hour Sprint & Mentor Reviews',
    desc: 'Non-stop hacking sprint! Build core MVP components, integrate APIs/hardware sensors, and complete Round 1 mentor check-ins.',
    icon: <Code2 className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '04',
    time: '36h',
    name: 'SUBMIT',
    subtitle: 'Commit Freeze & Project Submission',
    desc: 'Lock public GitHub repositories, record product demo video links, and upload final presentation slide decks.',
    icon: <UploadCloud className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '05',
    time: '42h',
    name: 'EVALUATE',
    subtitle: '5-Min Speed Jury Pitching (Rounds 2 & 3)',
    desc: 'Present live demos to expert juries in 5-minute speed pitching sessions scored across 8 structured rubric criteria.',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    step: '06',
    time: '48h',
    name: 'WIN',
    subtitle: 'Grand Finale Ceremony & Rs. 23.75L Awards',
    desc: 'Leaderboard freeze is lifted! Grand Champions, 1st Runner-up, Best All-Girls Team, and 8 Track Winners are crowned.',
    icon: <Trophy className="w-5 h-5 text-[#FFFFFF]" />,
  },
];

export const MissionPathTimeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section className="py-24 max-w-6xl mx-auto px-6 text-left select-none relative">
      {/* Section Header */}
      <div className="text-center space-y-2 mb-16 font-mono">
        <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-full border border-[#2B2B2B]">
          DIGITAL MISSION PATH
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
          The 48-Hour Mission Progression
        </h2>
        <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl mx-auto font-sans">
          Hover or tap any stage to inspect participation requirements, jury evaluation rounds, and milestone checkpoints.
        </p>
      </div>

      {/* SVG Connecting Path Backbone */}
      <div className="relative font-mono">
        <div className="hidden md:block absolute top-1/2 left-4 right-4 h-1 bg-[#2B2B2B] -translate-y-1/2 rounded-full pointer-events-none">
          <motion.div
            className="h-full bg-[#FFFFFF] rounded-full"
            animate={{ width: `${((activeStep + 1) / MISSION_STAGES.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Mission Nodes */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
          {MISSION_STAGES.map((stage, idx) => {
            const isActive = activeStep === idx;

            return (
              <motion.button
                key={stage.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                onMouseEnter={() => setActiveStep(idx)}
                whileHover={{ y: -3 }}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between min-h-[150px] ${
                  isActive
                    ? 'bg-[#2B2B2B] border-[#555555] shadow-xl ring-2 ring-[#555555]/40 scale-105 z-20 text-[#FFFFFF]'
                    : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] text-[#B3B3B3]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded border ${
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

                  <h3 className="text-xs font-bold font-outfit text-[#FFFFFF] mt-1 leading-snug">
                    {stage.name}
                  </h3>
                </div>

                <span className="text-[9px] font-mono text-[#B3B3B3] block mt-2 truncate">
                  {stage.subtitle}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Stage Detail Inspector */}
        <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-[#181818] border-2 border-[#555555] shadow-2xl backdrop-blur-xl relative overflow-hidden text-[#FFFFFF]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2B2B2B] pb-4 mb-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center font-extrabold shadow-md shrink-0">
                {MISSION_STAGES[activeStep].icon}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest block">
                  STAGE {MISSION_STAGES[activeStep].step} &bull; T+{MISSION_STAGES[activeStep].time}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold font-outfit text-[#FFFFFF]">
                  {MISSION_STAGES[activeStep].name}: {MISSION_STAGES[activeStep].subtitle}
                </h3>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#0E0E0E] text-[#D4D4D4] border border-[#2B2B2B]">
              MISSION MILESTONE #{MISSION_STAGES[activeStep].step}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#D4D4D4] leading-relaxed font-sans">
            {MISSION_STAGES[activeStep].desc}
          </p>
        </div>
      </div>
    </section>
  );
};
