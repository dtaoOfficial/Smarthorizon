import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, Bot, CreditCard, Stethoscope, Shield, Building2, Rocket, Sprout, Cpu } from 'lucide-react';
import { RevealOnScroll } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export interface DomainTrack {
  id: string;
  num: string;
  name: string;
  tagline: string;
  desc: string;
  prize: string;
  tags: string[];
  icon: React.ReactNode;
}

const DOMAIN_TRACKS: DomainTrack[] = [
  {
    id: 'ai',
    num: '01',
    name: 'AI & Machine Learning',
    tagline: 'Autonomous Agents, LLM Fine-Tuning & Edge Vision',
    desc: 'Build next-generation artificial intelligence applications focused on agentic workflows, multi-modal reasoning, real-time computer vision, and privacy-preserving federated machine learning.',
    prize: 'Rs. 3,50,000 Pool',
    tags: ['PyTorch', 'LangChain', 'OpenCV', 'Transformers'],
    icon: <Bot className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'fintech',
    num: '02',
    name: 'FinTech & Blockchain',
    tagline: 'Zero-Knowledge Payments & DeFi Protocols',
    desc: 'Engineer secure financial infrastructure, zero-knowledge compliance verification systems, automated smart contract auditing tools, and high-throughput cross-border settlement channels.',
    prize: 'Rs. 3,00,000 Pool',
    tags: ['Solidity', 'Web3.js', 'Rust', 'ZK-Proofs'],
    icon: <CreditCard className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'healthcare',
    num: '03',
    name: 'Healthcare & MedTech',
    tagline: 'AI Diagnostics & Remote Patient Telemetry',
    desc: 'Develop clinical decision support systems, secure patient medical record vaults, automated genomic signal processing, and low-latency remote health telemetry monitors.',
    prize: 'Rs. 3,00,000 Pool',
    tags: ['HL7/FHIR', 'TensorFlow', 'IoT Sensors', 'DICOM'],
    icon: <Stethoscope className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'cybersecurity',
    num: '04',
    name: 'Cybersecurity & Privacy',
    tagline: 'Zero Trust Architecture & Threat Intelligence',
    desc: 'Architect proactive intrusion detection engines, eBPF kernel monitors, post-quantum encryption key exchanges, and automated vulnerability scanning pipelines.',
    prize: 'Rs. 3,00,000 Pool',
    tags: ['eBPF', 'Zero-Trust', 'Crypto', 'Rust'],
    icon: <Shield className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'smartcity',
    num: '05',
    name: 'Smart City & Energy',
    tagline: 'IoT Grid Control & Urban Analytics',
    desc: 'Construct intelligent traffic management algorithms, distributed renewable energy grid controllers, municipal waste telemetry systems, and smart water grid analytics.',
    prize: 'Rs. 2,75,000 Pool',
    tags: ['MQTT', 'GIS Maps', 'Edge Computing', 'InfluxDB'],
    icon: <Building2 className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'spacetech',
    num: '06',
    name: 'SpaceTech & Satellite',
    tagline: 'Orbital Telemetry & Remote Sensing',
    desc: 'Process satellite remote sensing imagery, model orbital satellite propagation paths, build software-defined radio (SDR) ground station controllers, and space situational awareness feeds.',
    prize: 'Rs. 2,50,000 Pool',
    tags: ['Cesium', 'Telemetry', 'SDR', 'Python'],
    icon: <Rocket className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'agriculture',
    num: '07',
    name: 'Precision Agriculture',
    tagline: 'Drone Crop Diagnostics & Supply Chain Traceability',
    desc: 'Deploy autonomous drone multispectral crop health analyzers, LoRaWAN soil moisture irrigation grids, and farm-to-table supply chain provenance trackers.',
    prize: 'Rs. 2,50,000 Pool',
    tags: ['Drone AI', 'Spectral Data', 'LoRaWAN', 'IoT'],
    icon: <Sprout className="w-5 h-5 text-[#FFFFFF]" />,
  },
  {
    id: 'open',
    num: '08',
    name: 'Open Innovation & DeepTech',
    tagline: 'Cross-Domain Breakthroughs & Robotics',
    desc: 'Unleash technical creativity across quantum algorithms, bio-inspired computing, autonomous robotics hardware, and breakthrough developer tooling.',
    prize: 'Rs. 3,50,000 Pool',
    tags: ['Quantum', 'Robotics', 'DeepTech', 'C++'],
    icon: <Cpu className="w-5 h-5 text-[#FFFFFF]" />,
  },
];

export const InteractiveDomains: React.FC = () => {
  const [activeTrackId, setActiveTrackId] = useState<string>('ai');

  return (
    <section id="challenges" className="py-24 max-w-7xl mx-auto px-6 text-left select-none">
      <RevealOnScroll>
        {/* Header */}
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
            8 INNOVATION TRACKS
          </span>
          <h2 className="text-3xl sm:text-5xl font-black font-outfit text-[#FFFFFF] tracking-tight uppercase">
            Explore Challenge Domains
          </h2>
          <p className="text-sm text-[#B3B3B3] max-w-2xl mx-auto font-sans leading-relaxed">
            Hover over or tap any domain to inspect problem statement scope, technology stacks, and allocated track prizes.
          </p>
        </div>
      </RevealOnScroll>

      {/* Interactive Accordion List */}
      <div className="space-y-3">
        {DOMAIN_TRACKS.map((track) => {
          const isActive = activeTrackId === track.id;

          return (
            <motion.div
              key={track.id}
              onClick={() => setActiveTrackId(track.id)}
              onMouseEnter={() => setActiveTrackId(track.id)}
              className={`p-6 sm:p-7 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-[#181818] border-[#FFFFFF] shadow-xl scale-[1.005] opacity-100'
                  : 'bg-[#0E0E0E]/60 border-[#2B2B2B] hover:border-[#555555] opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4 sm:gap-6">
                  <span
                    className={`font-mono font-black text-2xl sm:text-3xl transition-colors duration-200 ${
                      isActive ? 'text-[#FFFFFF]' : 'text-[#B3B3B3]'
                    }`}
                  >
                    {track.num}
                  </span>

                  <div>
                    <h3
                      className={`font-bold font-outfit tracking-tight transition-all duration-200 ${
                        isActive
                          ? 'text-2xl sm:text-3xl text-[#FFFFFF]'
                          : 'text-lg sm:text-xl text-[#D4D4D4]'
                      }`}
                    >
                      {track.name}
                    </h3>
                    <span className="text-xs font-mono text-[#B3B3B3] font-medium block mt-0.5">
                      {track.tagline}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-auto">
                  <span className="text-xs font-mono font-semibold text-[#FFFFFF] bg-[#2B2B2B] px-3 py-1 rounded border border-[#555555]">
                    {track.prize}
                  </span>

                  <ChevronRight
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isActive ? 'rotate-90 text-[#FFFFFF]' : 'text-[#B3B3B3]'
                    }`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: MOTION_TOKENS.duration.standard, ease: MOTION_TOKENS.ease.smooth }}
                    className="pt-6 mt-6 border-t border-[#2B2B2B] space-y-4"
                  >
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.05 }}
                      className="text-xs sm:text-sm text-[#D4D4D4] leading-relaxed font-sans max-w-4xl"
                    >
                      {track.desc}
                    </motion.p>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {track.tags.map((tag, tagIdx) => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 + tagIdx * 0.04 }}
                            className="text-xs font-mono font-semibold px-3 py-1 rounded bg-[#0E0E0E] text-[#D4D4D4] border border-[#2B2B2B]"
                          >
                            {tag}
                          </motion.span>
                        ))}
                      </div>

                      <motion.button
                        type="button"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = '/login';
                        }}
                        className="text-xs font-mono font-bold text-[#FFFFFF] hover:text-[#D4D4D4] flex items-center gap-1.5 group cursor-pointer"
                      >
                        <span>REGISTER FOR THIS TRACK</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default InteractiveDomains;
