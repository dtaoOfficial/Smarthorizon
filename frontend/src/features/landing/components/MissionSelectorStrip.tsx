import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Grid, Timer, Terminal, Trophy, ArrowRight } from 'lucide-react';

export interface SelectorTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge: string;
  heading: string;
  text: string;
  actionText: string;
  actionRoute: string;
}

const TABS: SelectorTab[] = [
  {
    id: 'event',
    label: 'THE EVENT',
    icon: <Sparkles className="w-4 h-4 text-[#FFFFFF]" />,
    badge: 'SILVER JUBILEE CELEBRATIONS',
    heading: '48-Hour Flagship International Hackathon',
    text: 'Hosted by New Horizon College of Engineering in collaboration with MoE Institution Innovation Council (IIC), AICTE, and VTU. Bringing together 65+ teams across 8 innovation tracks.',
    actionText: 'EXPLORE EVENT DETAILS',
    actionRoute: '/login',
  },
  {
    id: 'challenges',
    label: 'CHALLENGES',
    icon: <Grid className="w-4 h-4 text-[#FFFFFF]" />,
    badge: '8 INNOVATION TRACKS',
    heading: 'Specialized Problem Statements & Rubrics',
    text: 'Compete across AI & ML, FinTech, MedTech, Cybersecurity, Smart City, SpaceTech, Precision Agriculture, and Open Innovation with track-specific jury rosters.',
    actionText: 'VIEW ALL 8 TRACKS',
    actionRoute: '/login',
  },
  {
    id: 'timing',
    label: '48 HOURS',
    icon: <Timer className="w-4 h-4 text-[#FFFFFF]" />,
    badge: 'NON-STOP SPRINT',
    heading: '48-Hour High-Stakes Build Window',
    text: 'From fast-track QR venue check-in at 00h to commit freeze, 5-minute speed jury evaluations, and the Grand Finale prize ceremony at 48h.',
    actionText: 'VIEW MISSION TIMELINE',
    actionRoute: '/login',
  },
  {
    id: 'platform',
    label: 'THE PLATFORM',
    icon: <Terminal className="w-4 h-4 text-[#FFFFFF]" />,
    badge: 'DIGITAL OPERATING SYSTEM',
    heading: 'Unified Hackathon Operations Portal',
    text: 'Custom-built platform providing student QR badges, 3-round speed evaluation marksheets, organizer support desk, and live audit telemetry.',
    actionText: 'ENTER PLATFORM PORTAL',
    actionRoute: '/login',
  },
  {
    id: 'leaderboard',
    label: 'LEADERBOARD',
    icon: <Trophy className="w-4 h-4 text-[#FFFFFF]" />,
    badge: 'REAL-TIME STANDINGS',
    heading: 'Normalized Theme Rankings & Awards',
    text: 'Automatic score normalization across tracks with lockable privacy mode during active jury evaluations and public unfreeze reveal.',
    actionText: 'PUBLIC LEADERBOARD',
    actionRoute: '/leaderboard',
  },
];

export interface MissionSelectorStripProps {
  onNavigate: (route: string) => void;
}

export const MissionSelectorStrip: React.FC<MissionSelectorStripProps> = ({ onNavigate }) => {
  const [activeTabId, setActiveTabId] = useState<string>('event');
  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  return (
    <section className="py-12 max-w-6xl mx-auto px-6 text-left select-none text-[#FFFFFF]">
      {/* Strip Header */}
      <div className="flex items-center gap-2 mb-4 font-mono text-xs">
        <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
        <span className="font-bold uppercase tracking-widest text-[11px] text-[#FFFFFF]">
          EXPLORE SMART HORIZON OS // SELECTOR
        </span>
      </div>

      {/* Horizontal Swipeable Tab Buttons */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 hide-scrollbar font-mono">
        {TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              onMouseEnter={() => setActiveTabId(tab.id)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider shrink-0 transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF] shadow-xl'
                  : 'bg-[#181818] border-[#2B2B2B] text-[#B3B3B3] hover:border-[#555555] hover:text-[#FFFFFF]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Preview Card */}
      <div className="mt-4 p-6 sm:p-8 rounded-2xl bg-[#181818] border-2 border-[#555555] shadow-2xl backdrop-blur-xl relative overflow-hidden text-[#FFFFFF]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 font-mono"
          >
            <div className="space-y-3 max-w-3xl">
              <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-[#2B2B2B] bg-[#0E0E0E] text-[#FFFFFF] tracking-widest inline-block">
                {activeTab.badge}
              </span>

              <h3 className="text-xl sm:text-2xl font-extrabold font-outfit text-[#FFFFFF]">
                {activeTab.heading}
              </h3>

              <p className="text-xs sm:text-sm text-[#D4D4D4] leading-relaxed font-sans">
                {activeTab.text}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(activeTab.actionRoute)}
              className="px-5 py-2.5 rounded-xl bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-xs shrink-0 hover:bg-[#D4D4D4] transition-all shadow-md flex items-center gap-2 group"
            >
              <span>{activeTab.actionText}</span>
              <ArrowRight className="w-4 h-4 text-[#0E0E0E] group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
