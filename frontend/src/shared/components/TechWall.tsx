import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Timer,
  CreditCard,
  Grid,
  Gavel,
  QrCode,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export interface TechPanelItem {
  id: string;
  title: string;
  code: string;
  value: string;
  label: string;
  status: 'ONLINE' | 'ACTIVE' | 'LOCKED' | 'SYNCED' | 'STANDBY';
  category: string;
  icon: React.ReactNode;
  details?: string;
  metric?: string;
}

export interface TechWallProps {
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  items?: TechPanelItem[];
  sequenceInterval?: number; // ms between sequence step
  glowColor?: string;
  onItemClick?: (item: TechPanelItem) => void;
}

const DEFAULT_PANELS: TechPanelItem[] = [
  {
    id: 'p1',
    title: 'NHCE SILVER JUBILEE',
    code: 'SYS.25Y-ANNIV',
    value: '25 YEARS',
    label: 'Global Engineering Excellence',
    status: 'ONLINE',
    category: 'INSTITUTION',
    icon: <GraduationCap className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '1999–2026',
    details: 'Autonomous Institution Affiliated to VTU & AICTE Approved',
  },
  {
    id: 'p2',
    title: '48H HACKATHON CORE',
    code: 'ENG.48H-NONSTOP',
    value: '48:00:00',
    label: 'Dual Stage Countdown Clock',
    status: 'ACTIVE',
    category: 'TIMING',
    icon: <Timer className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '100% Sync',
    details: 'Round 1, Round 2 & Round 3 Real-time Judging Clocks',
  },
  {
    id: 'p3',
    title: 'GRAND CASH PRIZE POOL',
    code: 'FIN.POOL-INR',
    value: 'Rs. 23.75L',
    label: 'Award Pool Across 8 Tracks',
    status: 'ONLINE',
    category: 'AWARDS',
    icon: <CreditCard className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '8 Categories',
    details: 'Grand Champions, Track Winners & Innovation Impact Awards',
  },
  {
    id: 'p4',
    title: '8 SPECIALIZED THEMES',
    code: 'TRK.8-INNOV',
    value: '8 TRACKS',
    label: 'AI, FinTech, MedTech & More',
    status: 'ONLINE',
    category: 'DOMAINS',
    icon: <Grid className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '65+ Teams',
    details: 'AI/ML, FinTech, HealthTech, CyberSecurity, SpaceTech, AgriTech',
  },
  {
    id: 'p5',
    title: 'SPEED EVALUATION DESK',
    code: 'JUR.SPEED-EVAL',
    value: '3 REVIEWS',
    label: '5-Min Structured Judging',
    status: 'SYNCED',
    category: 'EVALUATION',
    icon: <Gavel className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '30 Pts/Rev',
    details: 'Whole Integer Scoring Sliders & Live Marksheet Matrix',
  },
  {
    id: 'p6',
    title: 'QR BADGE VERIFICATION',
    code: 'SEC.QR-TOKEN',
    value: 'ENCRYPTED',
    label: 'Speed Check-In & Badges',
    status: 'SYNCED',
    category: 'SECURITY',
    icon: <QrCode className="w-5 h-5 text-[#FFFFFF]" />,
    metric: '< 2 sec',
    details: 'Instant Attendance, Camera Scanner & Print Badges',
  },
];

export const TechWall: React.FC<TechWallProps> = ({
  className = '',
  title = 'SMART HORIZON TELEMETRY WALL',
  subtitle = 'Real-time operational system status, dual-clock countdowns, evaluation speed matrix & infrastructure stats.',
  badge = 'LIVE SYSTEM TELEMETRY',
  items = DEFAULT_PANELS,
  sequenceInterval = 3000,
  glowColor = '#FFFFFF',
  onItemClick,
}) => {
  const [activeSequenceIndex, setActiveSequenceIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance highlight sequence
  useEffect(() => {
    if (isPaused || items.length === 0) return;

    const interval = setInterval(() => {
      setActiveSequenceIndex((prev) => (prev + 1) % items.length);
    }, sequenceInterval);

    return () => clearInterval(interval);
  }, [isPaused, items.length, sequenceInterval]);

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[#2B2B2B] bg-[#181818] p-6 sm:p-10 shadow-xl select-none text-[#FFFFFF] ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        setHoveredIndex(null);
      }}
    >
      {/* Decorative Technical Headers */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 border-b border-[#2B2B2B] pb-6 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#0E0E0E] text-[#FFFFFF] border border-[#2B2B2B] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-ping" />
              {badge}
            </span>
            <span className="text-[10px] font-mono text-[#B3B3B3] hidden sm:inline">
              SYS.V2.6 // SEQUENCE_ACTIVE: [{activeSequenceIndex + 1}/{items.length}]
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#B3B3B3] font-sans mt-1 max-w-2xl">
            {subtitle}
          </p>
        </div>

        {/* Status Indicator Bar */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#0E0E0E] px-3 py-1.5 rounded-xl border border-[#2B2B2B] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold text-[11px]">ALL SYSTEMS ONLINE</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-[#B3B3B3]">
            <span>SEQ-SPEED:</span>
            <strong className="text-[#FFFFFF]">{sequenceInterval}ms</strong>
          </div>
        </div>
      </div>

      {/* THE WALL GRID */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 font-mono">
        {items.map((item, idx) => {
          const isLitInSequence = activeSequenceIndex === idx;
          const isUserHovered = hoveredIndex === idx;
          const isActive = isUserHovered || (!isPaused && isLitInSequence);

          return (
            <motion.div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              onMouseEnter={() => setHoveredIndex(idx)}
              animate={{
                scale: isActive ? 1.02 : 1,
                y: isActive ? -4 : 0,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`relative rounded-xl p-5 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[170px] ${
                isActive
                  ? 'bg-[#2B2B2B] border-[#555555] shadow-xl'
                  : 'bg-[#0E0E0E] hover:bg-[#2B2B2B]/60 border-[#2B2B2B] shadow-sm'
              }`}
            >
              {/* Technical Circuit Corner Bracket */}
              <div
                className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 transition-colors ${
                  isActive ? 'border-[#FFFFFF]' : 'border-[#2B2B2B]'
                }`}
              />
              <div
                className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 transition-colors ${
                  isActive ? 'border-[#FFFFFF]' : 'border-[#2B2B2B]'
                }`}
              />

              {/* Panel Top Row: Code & Category */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#FFFFFF] text-[#0E0E0E]'
                          : 'bg-[#181818] text-[#FFFFFF] border border-[#2B2B2B]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#B3B3B3] block">
                        {item.code}
                      </span>
                      <span className="text-[9px] font-mono uppercase text-[#FFFFFF] font-semibold">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold tracking-wider border ${
                      item.status === 'ACTIVE'
                        ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                        : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Panel Title & Main Metric Readout */}
                <h3 className="text-sm font-bold font-outfit text-[#FFFFFF] leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#B3B3B3] font-sans mt-0.5 leading-relaxed">
                  {item.label}
                </p>
              </div>

              {/* Panel Bottom Row: Prominent Value & Mini Telemetry */}
              <div className="pt-3 mt-3 border-t border-[#2B2B2B] flex justify-between items-end font-mono">
                <div>
                  <span className="text-[9px] text-[#B3B3B3] block font-sans">TELEMETRY</span>
                  <span className="text-base font-extrabold text-[#FFFFFF] tracking-tight">
                    {item.value}
                  </span>
                </div>

                {item.metric && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                        : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]'
                    }`}
                  >
                    {item.metric}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Mission Control Sequence Progress Bar */}
      <div className="relative z-10 mt-8 pt-6 border-t border-[#2B2B2B] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#B3B3B3]">ACTIVE TELEMETRY SEQUENCE:</span>
          <div className="flex items-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSequenceIndex(i)}
                aria-label={`Jump to panel ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  activeSequenceIndex === i
                    ? 'w-6 bg-[#FFFFFF] shadow-sm'
                    : 'w-2 bg-[#2B2B2B] hover:bg-[#555555]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#B3B3B3]">
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>48H REALTIME PULSE</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>SMARTHORIZON CERTIFIED</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default TechWall;
