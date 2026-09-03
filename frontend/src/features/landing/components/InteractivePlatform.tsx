import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Gavel, LayoutDashboard, Trophy, Plus, Check } from 'lucide-react';
import { RevealOnScroll } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export interface PlatformCapability {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
  hotspots: { title: string; desc: string; top: string; left: string }[];
  features: string[];
}

const CAPABILITIES: PlatformCapability[] = [
  {
    id: 'team',
    title: 'TEAM PORTAL',
    badge: 'PARTICIPANT WORKSPACE',
    desc: 'Participants manage team rosters, access track announcements, submit GitHub repositories, view desk numbers, and receive instant feedback.',
    icon: <Users className="w-5 h-5 text-[#FFFFFF]" />,
    hotspots: [
      {
        title: 'Team Workspace & Submissions',
        desc: 'Teams submit projects, access announcements and track evaluations.',
        top: '25%',
        left: '25%',
      },
      {
        title: 'Encrypted QR Ticket Badge',
        desc: 'Encrypted QR badge for instantaneous venue entry & desk verification.',
        top: '60%',
        left: '70%',
      },
    ],
    features: ['Encrypted QR Desk Pass', 'GitHub Repository Sync', 'Live Q&A Helpdesk', 'Mentor Check-in Logs'],
  },
  {
    id: 'judge',
    title: 'JUDGE CONSOLE',
    badge: 'EVALUATION INTERFACE',
    desc: 'Judges access assigned team rosters, score teams on a 100-mark structured rubric, monitor pitch countdowns, and submit confidential scores.',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
    hotspots: [
      {
        title: 'Jury Evaluation Matrix',
        desc: 'Judges evaluate assigned teams across review rounds.',
        top: '30%',
        left: '30%',
      },
      {
        title: '5-Minute Pitch Timer',
        desc: 'Strict 5-minute round timers ensure equal evaluation windows.',
        top: '65%',
        left: '75%',
      },
    ],
    features: ['100-Mark Rubric Grid', '3-Round Evaluation Marksheets', '5-Minute Round Timer', 'Confidential Jury Notes'],
  },
  {
    id: 'admin',
    title: 'ADMIN COMMAND CENTER',
    badge: 'OPERATIONS DASHBOARD',
    desc: 'Organizers manage teams, judges, desk assignments, track progress, broadcast announcements, and control public leaderboard visibility.',
    icon: <LayoutDashboard className="w-5 h-5 text-[#FFFFFF]" />,
    hotspots: [
      {
        title: 'Command & Control Operations',
        desc: 'Organizers manage teams, judges, assignments and operations.',
        top: '25%',
        left: '60%',
      },
      {
        title: 'Leaderboard Lock / Unfreeze',
        desc: 'Privacy mode during active evaluation rounds with one-click unfreeze reveal.',
        top: '70%',
        left: '30%',
      },
    ],
    features: ['Leaderboard Lock / Unfreeze', 'Judge Desk Allocations', 'SQLite WAL Audit Logs', 'Instant Announcements'],
  },
  {
    id: 'leaderboard',
    title: 'LEADERBOARD',
    badge: 'RANKING INTERFACE',
    desc: 'Live normalized score rankings across all 8 challenge tracks, with lock privacy controls during evaluation and reveal for the Grand Finale.',
    icon: <Trophy className="w-5 h-5 text-[#D4D4D4]" />,
    hotspots: [
      {
        title: 'Normalized Score Standings',
        desc: 'Real-time normalized standings with lock/unfreeze controls.',
        top: '35%',
        left: '50%',
      },
      {
        title: 'Score Normalization Algorithm',
        desc: 'Eliminates judge bias by scaling scores across track rosters.',
        top: '70%',
        left: '75%',
      },
    ],
    features: ['Score Normalization Algorithm', 'Track-by-Track Filter', 'Privacy Lock Mode', 'Public Reveal Standings'],
  },
];

export const InteractivePlatform: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('team');
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  const activeCapability = CAPABILITIES.find((c) => c.id === activeTabId) || CAPABILITIES[0];

  return (
    <section id="platform" className="py-24 max-w-7xl mx-auto px-6 text-left select-none">
      <RevealOnScroll>
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
            THE HACKATHON OPERATING SYSTEM
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-outfit text-[#FFFFFF] tracking-tight uppercase">
            The Smart Horizon Platform
          </h2>
          <p className="text-sm text-[#B3B3B3] max-w-2xl mx-auto font-sans leading-relaxed">
            Smart Horizon is a production hackathon operations portal built for high-stakes engineering events. Select a role preview below.
          </p>
        </div>
      </RevealOnScroll>

      {/* Role Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10 relative z-10">
        {CAPABILITIES.map((cap) => {
          const isActive = cap.id === activeTabId;

          return (
            <button
              key={cap.id}
              type="button"
              onClick={() => {
                setActiveTabId(cap.id);
                setActiveHotspot(null);
              }}
              className={`relative px-5 py-3 rounded-xl border text-xs font-mono font-bold tracking-wider transition-colors duration-200 flex items-center gap-2.5 cursor-pointer ${
                isActive
                  ? 'border-[#FFFFFF] text-[#FFFFFF] shadow-lg'
                  : 'bg-[#181818]/80 border-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF] hover:border-[#555555]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activePlatformRoleTab"
                  className="absolute inset-0 bg-[#2B2B2B] rounded-xl z-0"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {cap.icon}
                <span>{cap.title}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview Container */}
      <div className="p-6 sm:p-10 rounded-2xl bg-[#181818] border border-[#2B2B2B] shadow-2xl relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCapability.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: MOTION_TOKENS.duration.standard, ease: MOTION_TOKENS.ease.smooth }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Left Info */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] px-3.5 py-1 rounded border border-[#555555] inline-block">
                {activeCapability.badge}
              </span>

              <h3 className="text-2xl sm:text-3xl font-black font-outfit text-[#FFFFFF]">
                {activeCapability.title}
              </h3>

              <p className="text-sm text-[#B3B3B3] leading-relaxed font-sans">
                {activeCapability.desc}
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-wider block">
                  CAPABILITY HIGHLIGHTS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeCapability.features.map((feat, featIdx) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: featIdx * 0.05 }}
                      className="p-2.5 rounded-lg bg-[#0E0E0E] border border-[#2B2B2B] text-xs font-mono text-[#D4D4D4] flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Product Preview UI */}
            <div className="lg:col-span-7">
              <div className="relative rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] p-6 shadow-2xl min-h-[340px] flex flex-col justify-between overflow-hidden">
                {/* Header Bar */}
                <div className="flex justify-between items-center pb-4 border-b border-[#2B2B2B] text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FFFFFF]" />
                    <span className="font-bold text-[#FFFFFF] uppercase">SMART HORIZON OS // {activeCapability.title}</span>
                  </div>
                  <span className="text-[10px] text-[#FFFFFF] font-bold bg-[#181818] px-2 py-0.5 rounded border border-[#555555]">
                    OPERATIONAL
                  </span>
                </div>

                {/* Role Specific Authentic Interface View */}
                {activeCapability.id === 'team' && (
                  <div className="py-6 space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-lg bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <div>
                        <span className="text-[#B3B3B3] block text-[11px]">TEAM IDENTIFIER</span>
                        <span className="text-[#FFFFFF] font-bold">TEAM SH-2026-042 &bull; Agentic Vision</span>
                      </div>
                      <span className="text-xs text-[#FFFFFF] bg-[#0E0E0E] px-2.5 py-1 rounded border border-[#555555] font-bold">DESK B-14</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B]">
                        <span className="text-[10px] text-[#B3B3B3] block">ASSIGNED TRACK</span>
                        <span className="text-xs text-[#FFFFFF] font-bold">AI & Machine Learning</span>
                      </div>
                      <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B]">
                        <span className="text-[10px] text-[#B3B3B3] block">REPO SYNC STATUS</span>
                        <span className="text-xs text-[#FFFFFF] font-bold">VERIFIED (main@8a9c)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeCapability.id === 'judge' && (
                  <div className="py-6 space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-lg bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <div>
                        <span className="text-[#B3B3B3] block text-[11px]">JURY PANEL MEMBER</span>
                        <span className="text-[#FFFFFF] font-bold">JUDGE J-08 &bull; Track 01 Evaluator</span>
                      </div>
                      <span className="text-xs text-[#FFFFFF] bg-[#0E0E0E] px-2.5 py-1 rounded border border-[#555555] font-bold">ROUND 2 ACTIVE</span>
                    </div>
                    <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <span className="text-xs text-[#D4D4D4]">PITCH TIMER COUNTDOWN</span>
                      <span className="text-sm font-bold text-[#FFFFFF]">04:18 REMAINING</span>
                    </div>
                  </div>
                )}

                {activeCapability.id === 'admin' && (
                  <div className="py-6 space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-lg bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <div>
                        <span className="text-[#B3B3B3] block text-[11px]">COMMAND SYSTEM</span>
                        <span className="text-[#FFFFFF] font-bold">SUPERADMIN &bull; Hackathon Ops Center</span>
                      </div>
                      <span className="text-xs text-[#FFFFFF] bg-[#0E0E0E] px-2.5 py-1 rounded border border-[#555555] font-bold">65 TEAMS LOADED</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B]">
                        <span className="text-[10px] text-[#B3B3B3] block">LEADERBOARD MODE</span>
                        <span className="text-xs text-[#FFFFFF] font-bold">LOCKED (ROUND 2)</span>
                      </div>
                      <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B]">
                        <span className="text-[10px] text-[#B3B3B3] block">SYSTEM WAL LOG</span>
                        <span className="text-xs text-[#FFFFFF] font-bold">AUDIT READY</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeCapability.id === 'leaderboard' && (
                  <div className="py-6 space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-lg bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <div>
                        <span className="text-[#B3B3B3] block text-[11px]">PUBLIC RANKING SYSTEM</span>
                        <span className="text-[#FFFFFF] font-bold">NORMALIZED TRACK STANDINGS</span>
                      </div>
                      <span className="text-xs text-[#FFFFFF] bg-[#0E0E0E] px-2.5 py-1 rounded border border-[#555555] font-bold">8 TRACKS SYNCED</span>
                    </div>
                    <div className="p-3 rounded bg-[#181818] border border-[#2B2B2B] flex justify-between items-center">
                      <span className="text-xs text-[#D4D4D4]">TOP SCORE (TRACK 01)</span>
                      <span className="text-sm font-bold text-[#FFFFFF]">94.8 / 100.0</span>
                    </div>
                  </div>
                )}

                {/* Hotspot Interactions */}
                {activeCapability.hotspots.map((hs, hsIdx) => {
                  const isHsActive = activeHotspot === `${activeCapability.id}-${hsIdx}`;

                  return (
                    <div
                      key={hs.title}
                      className="absolute z-30"
                      style={{ top: hs.top, left: hs.left }}
                    >
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveHotspot(isHsActive ? null : `${activeCapability.id}-${hsIdx}`)}
                        className="w-7 h-7 rounded-full bg-[#FFFFFF] text-[#0E0E0E] flex items-center justify-center font-bold shadow-xl border-2 border-[#0E0E0E] cursor-pointer"
                      >
                        {isHsActive ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </motion.button>

                      <AnimatePresence>
                        {isHsActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 6 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-8 top-0 w-64 p-3.5 rounded-lg bg-[#0E0E0E] border border-[#555555] shadow-2xl text-xs font-sans z-40"
                          >
                            <h4 className="font-bold text-[#FFFFFF] font-outfit">{hs.title}</h4>
                            <p className="text-[11px] text-[#B3B3B3] mt-1 leading-relaxed">{hs.desc}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default InteractivePlatform;
