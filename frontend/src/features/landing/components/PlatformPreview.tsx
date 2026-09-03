import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Gavel, ShieldCheck, Trophy, CheckCircle2 } from 'lucide-react';

export interface PreviewModule {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  highlights: string[];
  metrics: { label: string; val: string }[];
}

const MODULES: PreviewModule[] = [
  {
    id: 'team',
    title: 'TEAM & SUBMISSION PORTAL',
    subtitle: 'Roster Management & QR Ticket Badges',
    badge: 'STUDENT WORKSPACE',
    icon: <Users className="w-5 h-5 text-[#FFFFFF]" />,
    highlights: [
      'Encrypted team QR check-in ticket badge generation',
      'Git repository link verification & commit tracking',
      'Integrated technical Q&A ticket support desk',
      'Team member role assignments (Leader + up to 4 Members)',
    ],
    metrics: [
      { label: 'Max Team Size', val: '5 Members' },
      { label: 'Badge Scanning', val: 'Instant QR' },
    ],
  },
  {
    id: 'judge',
    title: 'JUDGE EVALUATION CONSOLE',
    subtitle: '5-Min Speed Reviews & Whole Integer Rubrics',
    badge: 'JURY WORKSPACE',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
    highlights: [
      '3-Round structured evaluation marksheets (30 pts each)',
      'Whole Integer scoring sliders (1–5 scale per criteria)',
      'Track-wise & problem-statement assigned team roster',
      'Real-time draft & submit status validation controls',
    ],
    metrics: [
      { label: 'Evaluation Time', val: '5 Mins / Pitch' },
      { label: 'Score Scale', val: 'Whole Integers' },
    ],
  },
  {
    id: 'admin',
    title: 'COMMAND & CONTROL CENTER',
    subtitle: 'Event Operations, QR Check-in & Audit Logs',
    badge: 'ORGANIZER WORKSPACE',
    icon: <ShieldCheck className="w-5 h-5 text-[#FFFFFF]" />,
    highlights: [
      'Fast-track QR scanner for desk check-in clerks',
      'Global announcement broadcasting & target filtering',
      'Leaderboard lock/unfreeze controls for prize reveals',
      'Instant CSV & official PDF marksheet telemetry exports',
    ],
    metrics: [
      { label: 'Check-in Speed', val: '< 2 Seconds' },
      { label: 'Leaderboard Lock', val: '1-Click Freeze' },
    ],
  },
  {
    id: 'leaderboard',
    title: 'LIVE THEME STANDINGS MATRIX',
    subtitle: 'Theme-Wise Standings & Score Normalization',
    badge: 'PUBLIC RANKINGS',
    icon: <Trophy className="w-5 h-5 text-[#FFFFFF]" />,
    highlights: [
      'Automatic score normalization across judges & tracks',
      'Theme-wise leaderboards across all 8 innovation tracks',
      'Top 10 privacy mode during active judging rounds',
      'Grand Champion & Track Winner calculation algorithms',
    ],
    metrics: [
      { label: 'Tracks Evaluated', val: '8 Themes' },
      { label: 'Public Audit', val: 'Normalized Scores' },
    ],
  },
];

export const PlatformPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('team');
  const activeModule = MODULES.find((m) => m.id === activeTab) || MODULES[0];

  return (
    <section className="py-24 max-w-6xl mx-auto px-6 text-left select-none text-[#FFFFFF]">
      <div className="text-center space-y-2 mb-12 font-mono">
        <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-full border border-[#2B2B2B]">
          OPERATING SYSTEM CAPABILITIES
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
          The Hackathon Operating System
        </h2>
        <p className="text-xs sm:text-sm text-[#B3B3B3] max-w-xl mx-auto font-sans">
          Explore the unified platform connecting participants, domain expert juries, and event organizers.
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 font-mono">
        {MODULES.map((mod) => {
          const isActive = activeTab === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveTab(mod.id)}
              onMouseEnter={() => setActiveTab(mod.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 flex items-center gap-3 ${
                isActive
                  ? 'bg-[#2B2B2B] border-[#555555] shadow-xl text-[#FFFFFF]'
                  : 'bg-[#181818] border-[#2B2B2B] text-[#B3B3B3] hover:border-[#555555] hover:text-[#FFFFFF]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isActive
                    ? 'bg-[#FFFFFF] border-[#FFFFFF] text-[#0E0E0E]'
                    : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                }`}
              >
                {mod.icon}
              </div>
              <span className="text-xs font-bold font-mono uppercase tracking-wider">
                {mod.title.split(' ')[0]} {mod.title.split(' ')[1] || ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Single Interactive Preview Display Area */}
      <div className="rounded-2xl bg-[#181818] border-2 border-[#555555] p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden text-[#FFFFFF]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center font-mono"
          >
            {/* Module Information Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-[#2B2B2B] bg-[#0E0E0E] text-[#FFFFFF] tracking-widest inline-block">
                  {activeModule.badge}
                </span>

                <h3 className="text-2xl sm:text-3xl font-extrabold font-outfit text-[#FFFFFF]">
                  {activeModule.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#B3B3B3] font-mono">
                  {activeModule.subtitle}
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2.5 pt-2">
                {activeModule.highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-xs sm:text-sm text-[#D4D4D4] font-sans">
                    <CheckCircle2 className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Metric Badges */}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-[#2B2B2B]">
                {activeModule.metrics.map((m) => (
                  <div key={m.label} className="p-3 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] font-mono">
                    <span className="text-[9px] text-[#B3B3B3] block uppercase font-bold">{m.label}</span>
                    <span className="text-sm font-extrabold text-[#FFFFFF]">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Module Interface Panel Mockup */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-inner font-mono text-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#2B2B2B]">
                <span className="text-[10px] font-bold text-[#FFFFFF] uppercase">
                  SYS.UI // {activeModule.id.toUpperCase()}_CONSOLE
                </span>
                <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-3 rounded-xl bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                  <span className="text-[#D4D4D4]">ACTIVE SESSION</span>
                  <span className="text-[#FFFFFF] font-bold">CONNECTED</span>
                </div>

                <div className="p-3 rounded-xl bg-[#181818] border border-[#2B2B2B] space-y-1">
                  <span className="text-[10px] text-[#B3B3B3] block">AUTHENTICATION TOKEN</span>
                  <span className="text-[#FFFFFF] font-extrabold text-[11px] block truncate">
                    SH26-JWT-BEARER-AUTH-ACTIVE
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#181818] border border-[#2B2B2B] space-y-1">
                  <span className="text-[10px] text-[#B3B3B3] block">MODULE READINESS</span>
                  <div className="flex items-center gap-2">
                    <div className="w-full h-1.5 rounded-full bg-[#0E0E0E] overflow-hidden border border-[#2B2B2B]">
                      <div className="h-full bg-[#FFFFFF] rounded-full w-full" />
                    </div>
                    <span className="text-[#FFFFFF] font-bold text-[10px]">100%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
