import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  CreditCard,
  HeartPulse,
  Shield,
  Building2,
  Rocket,
  Sprout,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export interface DomainItem {
  num: string;
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  prize: string;
  tags: string[];
}

const DOMAINS: DomainItem[] = [
  {
    num: '01',
    id: 'ai',
    name: 'AI & Machine Learning',
    desc: 'Generative AI, Autonomous Agentic Workflows, LLM Fine-Tuning, Computer Vision & Edge AI.',
    icon: <Bot className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 3,50,000 Pool',
    tags: ['PyTorch', 'LangChain', 'OpenCV'],
  },
  {
    num: '02',
    id: 'fintech',
    name: 'FinTech & Blockchain',
    desc: 'DeFi Protocols, Zero-Knowledge Auditing, Smart Contracts & High-Frequency Payment Systems.',
    icon: <CreditCard className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 3,00,000 Pool',
    tags: ['Solidity', 'Web3.js', 'Rust'],
  },
  {
    num: '03',
    id: 'healthcare',
    name: 'Healthcare & MedTech',
    desc: 'AI Diagnostics, Patient Telemetry Vaults, Remote Health Monitoring & Genomic Computing.',
    icon: <HeartPulse className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 3,00,000 Pool',
    tags: ['HL7/FHIR', 'TensorFlow', 'IoT'],
  },
  {
    num: '04',
    id: 'cybersecurity',
    name: 'Cybersecurity & Privacy',
    desc: 'Zero Trust Architecture, Threat Intelligence, Encrypted Storage & Post-Quantum Security.',
    icon: <Shield className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 3,00,000 Pool',
    tags: ['eBPF', 'Zero-Trust', 'Crypto'],
  },
  {
    num: '05',
    id: 'smartcity',
    name: 'Smart City & Energy',
    desc: 'IoT Grid Control, Urban Traffic Optimization, Renewable Energy Telemetry & Smart Infrastructure.',
    icon: <Building2 className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 2,75,000 Pool',
    tags: ['MQTT', 'GIS Maps', 'Edge Computing'],
  },
  {
    num: '06',
    id: 'spacetech',
    name: 'SpaceTech & Satellite',
    desc: 'Satellite Telemetry Processing, Orbital Propagation, Ground Station Control & Earth Observation.',
    icon: <Rocket className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 2,50,000 Pool',
    tags: ['Cesium', 'Telemetry', 'SDR'],
  },
  {
    num: '07',
    id: 'agriculture',
    name: 'Precision Agriculture',
    desc: 'Drone Crop Diagnostics, Automated Irrigation Grids & Agricultural Supply Chain Traceability.',
    icon: <Sprout className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 2,50,000 Pool',
    tags: ['Drone AI', 'Spectral Data', 'LoRaWAN'],
  },
  {
    num: '08',
    id: 'open',
    name: 'Open Innovation & DeepTech',
    desc: 'Cross-Domain Breakthroughs, Quantum Algorithms, Advanced Robotics & Next-Gen Software.',
    icon: <Cpu className="w-5 h-5 text-[#FFFFFF]" />,
    prize: 'Rs. 3,50,000 Pool',
    tags: ['Quantum', 'Robotics', 'DeepTech'],
  },
];

export const DomainsGrid: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  return (
    <section className="py-24 max-w-7xl mx-auto px-6 text-left select-none">
      {/* Section Header */}
      <div className="text-center space-y-3 mb-16 font-mono">
        <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-widest bg-[#181818] px-4 py-1.5 rounded-full border border-[#2B2B2B] inline-block">
          CHALLENGE CATEGORIES
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight uppercase">
          8 Specialized Innovation Tracks
        </h2>
        <p className="text-sm text-[#B3B3B3] max-w-2xl mx-auto font-sans leading-relaxed">
          Select a domain track to explore problem statement focus areas, technology stacks, and dedicated jury allocations.
        </p>
      </div>

      {/* 8 Track Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
        {DOMAINS.map((domain) => {
          const isHovered = activeDomain === domain.id;

          return (
            <motion.div
              key={domain.id}
              onClick={() => setActiveDomain(domain.id === activeDomain ? null : domain.id)}
              onMouseEnter={() => setActiveDomain(domain.id)}
              onMouseLeave={() => setActiveDomain(null)}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[250px] relative ${
                isHovered
                  ? 'bg-[#2B2B2B] border-[#555555] shadow-xl'
                  : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] shadow-md'
              }`}
            >
              <div>
                {/* Top Row: Track Number & Icon */}
                <div className="flex justify-between items-center mb-4">
                  <span
                    className={`font-mono font-extrabold text-2xl tracking-tight transition-colors ${
                      isHovered ? 'text-[#FFFFFF]' : 'text-[#B3B3B3]'
                    }`}
                  >
                    {domain.num}
                  </span>

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shadow-sm ${
                      isHovered
                        ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                        : 'bg-[#0E0E0E] text-[#FFFFFF] border-[#2B2B2B]'
                    }`}
                  >
                    {domain.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold font-outfit text-[#FFFFFF] leading-snug">
                  {domain.name}
                </h3>

                <p className="text-xs text-[#B3B3B3] leading-relaxed mt-2 font-sans">
                  {domain.desc}
                </p>
              </div>

              {/* Bottom Row: Tech Tags & Prize */}
              <div className="pt-4 mt-4 border-t border-[#2B2B2B] space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {domain.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0E0E0E] text-[#D4D4D4] border border-[#2B2B2B]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-sans">
                  <span className="font-bold text-[#FFFFFF] font-mono">{domain.prize}</span>
                  <div
                    className={`flex items-center gap-1 font-mono text-[11px] font-bold transition-all ${
                      isHovered ? 'text-[#FFFFFF]' : 'text-[#D4D4D4]'
                    }`}
                  >
                    <span>EXPLORE TRACK</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Accent Corner Bar */}
              {isHovered && (
                <div className="absolute top-0 inset-x-0 h-1 bg-[#FFFFFF] transition-all" />
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
