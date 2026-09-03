import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CalendarCheck, Code2, Cpu, UploadCloud, Trophy } from 'lucide-react';
import { RevealOnScroll } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export interface TimelineMilestone {
  date: string;
  stage: string;
  time: string;
  title: string;
  description: string;
  highlights: string[];
  icon: React.ReactNode;
}

const MILESTONES: TimelineMilestone[] = [
  {
    date: 'SEPT 3',
    stage: 'OPENING',
    time: '08:00 AM – 10:00 AM',
    title: 'Grand Inauguration & Key Distribution',
    description: 'Check-in at NHCE Auditorium, team badge verification, domain track assignment, and orientation by key organizers.',
    highlights: ['Desk Check-in & Badge Issuance', 'Keynote Address & Guidelines', 'Wi-Fi & Resource Activation'],
    icon: <CalendarCheck className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    date: 'SEPT 3',
    stage: 'BUILD',
    time: '10:00 AM – ONGOING',
    title: '48-Hour Engineering Hack Sprint',
    description: 'Non-stop hacking across 8 challenge domains. Round 1 mentor check-in begins with technical architecture reviews.',
    highlights: ['Round 1 Mentor Reviews', 'API Credentials Provisioning', 'Midnight Engineering Support'],
    icon: <Code2 className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    date: 'SEPT 4',
    stage: 'HACK',
    time: 'ALL DAY SPRINT',
    title: 'Midway Prototype & Round 2 Progress Review',
    description: 'Jury members conduct midway progress check on working prototypes and core implementation progress at hacker bays.',
    highlights: ['Round 2 Jury Desk Visits', 'Prototype Verification', 'Jury Marksheet Sync'],
    icon: <Cpu className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    date: 'SEPT 5',
    stage: 'SUBMIT',
    time: '08:00 AM DEADLINE',
    title: 'Repository Lock & Demo Upload',
    description: 'Automated GitHub repository commit lock. Teams finalize video walkthrough links, slide decks, and README files.',
    highlights: ['Automated Repo Locking', 'Video Demo & Pitch Deck Sync', 'Final Code Verification'],
    icon: <UploadCloud className="w-4 h-4 text-[#FFFFFF]" />,
  },
  {
    date: 'SEPT 5',
    stage: 'GRAND FINALE',
    time: '02:00 PM – 05:00 PM',
    title: 'Final Jury Pitch & Rs. 23.75L Awards',
    description: 'Top domain finalist pitches on main auditorium stage, score unfreeze reveal, and trophy presentation ceremony.',
    highlights: ['Top Track Finalist Pitches', 'Normalized Score Unfreeze', 'Award & Trophy Presentation'],
    icon: <Trophy className="w-4 h-4 text-[#D4D4D4]" />,
  },
];

export const EventTimeline: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 70%', 'end 70%'],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section ref={sectionRef} id="timeline" className="py-24 max-w-7xl mx-auto px-6 text-left select-none">
      <RevealOnScroll>
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
            CHRONOLOGICAL HACKATHON SCHEDULE
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-outfit text-[#FFFFFF] tracking-tight uppercase">
            Event Timeline & Milestones
          </h2>
          <p className="text-sm text-[#B3B3B3] max-w-2xl mx-auto font-sans leading-relaxed">
            From registration opening on September 3rd to the Grand Finale award ceremony on September 5th.
          </p>
        </div>
      </RevealOnScroll>

      <div className="relative max-w-4xl mx-auto">
        {/* Timeline Track Line (Background) */}
        <div className="absolute top-4 bottom-4 left-4 sm:left-1/2 w-0.5 bg-[#2B2B2B] -translate-x-1/2 z-0" />

        {/* Timeline Progress Line (Scroll-Linked Reveal) */}
        <motion.div
          className="absolute top-4 left-4 sm:left-1/2 w-0.5 bg-[#FFFFFF] -translate-x-1/2 z-0 origin-top"
          style={{ height: lineHeight, willChange: 'height' }}
        />

        <div className="space-y-12 relative z-10">
          {MILESTONES.map((item, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <motion.div
                key={item.stage}
                initial={{ opacity: 0, x: isEven ? -24 : 24, y: 12 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  duration: MOTION_TOKENS.duration.reveal,
                  delay: idx * 0.08,
                  ease: MOTION_TOKENS.ease.smooth,
                }}
                className={`flex flex-col sm:flex-row items-start ${
                  isEven ? 'sm:flex-row-reverse' : ''
                } gap-6 sm:gap-12 relative group`}
              >
                <div className="w-full sm:w-1/2 pl-10 sm:pl-0">
                  <motion.div
                    whileHover={{ y: -3, scale: 1.005 }}
                    transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
                    className="p-6 sm:p-7 rounded-xl border bg-[#181818] border-[#2B2B2B] group-hover:border-[#555555] transition-colors duration-300 shadow-xl relative text-left"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] px-2.5 py-0.5 rounded border border-[#555555]">
                        {item.date}
                      </span>
                      <span className="text-[11px] font-mono text-[#B3B3B3] font-bold">
                        {item.time}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-[#D4D4D4] font-bold block mb-1">
                      {item.stage}
                    </span>

                    <h3 className="text-xl font-bold font-outfit text-[#FFFFFF] group-hover:text-[#D4D4D4] transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#B3B3B3] font-sans mt-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-4 mt-4 border-t border-[#2B2B2B] space-y-1.5">
                      {item.highlights.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-[11px] font-mono text-[#D4D4D4]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Interactive Timeline Node */}
                <div className="absolute left-4 sm:left-1/2 top-6 -translate-x-1/2 z-20 flex items-center justify-center">
                  <motion.div
                    whileInView={{ scale: [0.8, 1.15, 1] }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    className="w-9 h-9 rounded-full bg-[#0E0E0E] border-2 border-[#FFFFFF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
                  >
                    {item.icon}
                  </motion.div>
                </div>

                <div className="hidden sm:block w-1/2" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EventTimeline;
