import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Building2 } from 'lucide-react';
import { RevealOnScroll, MagneticButton } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

export const InteractiveLocation: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section id="location" className="py-24 max-w-7xl mx-auto px-6 text-left select-none">
      <RevealOnScroll>
        <div className="p-8 sm:p-12 rounded-2xl bg-[#181818] border border-[#2B2B2B] shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Details */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#0E0E0E] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
                VENUE & LOCATION
              </span>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black font-outfit text-[#FFFFFF] tracking-tight uppercase">
                  NHCE CAMPUS, BENGALURU
                </h2>
                <p className="text-sm sm:text-base text-[#B3B3B3] font-sans leading-relaxed">
                  New Horizon College of Engineering, Outer Ring Road, Near Marathahalli, Bellandur Post, Bengaluru, Karnataka 560103, India.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <MagneticButton
                  onClick={() => window.open('https://maps.google.com/?q=New+Horizon+College+of+Engineering+Bengaluru', '_blank')}
                  className="px-6 py-3 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-xs hover:bg-[#D4D4D4] transition-all shadow-md flex items-center gap-2 group cursor-pointer"
                >
                  <span>OPEN LOCATION</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </MagneticButton>
              </div>
            </div>

            {/* Right Stylized Map */}
            <div className="lg:col-span-6">
              <motion.div
                whileHover={{ scale: 1.01 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => window.open('https://maps.google.com/?q=New+Horizon+College+of+Engineering+Bengaluru', '_blank')}
                className="p-6 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] shadow-2xl relative overflow-hidden group cursor-pointer"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-[#2B2B2B] text-xs font-mono mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FFFFFF]" />
                    <span className="font-bold text-[#FFFFFF] uppercase">
                      {isHovered ? 'NEW HORIZON COLLEGE OF ENGINEERING BENGALURU, INDIA' : 'NHCE CAMPUS BENGALURU'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#FFFFFF] font-bold bg-[#2B2B2B] px-2 py-0.5 rounded border border-[#555555]">
                    EVENT VENUE
                  </span>
                </div>

                {/* SVG Graphic */}
                <div className="relative h-56 w-full rounded-lg bg-[#181818] border border-[#2B2B2B] overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="mapGridMonochrome" width="24" height="24" patternUnits="userSpaceOnUse">
                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#mapGridMonochrome)" />
                    
                    {/* Stylized Route Path */}
                    <path
                      d="M 0 100 Q 150 120, 300 80 T 600 110"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="2.5"
                    />
                    
                    <motion.path
                      d="M 120 0 L 120 220"
                      fill="none"
                      stroke="rgba(212, 212, 212, 0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: isHovered ? [0, -8] : 0 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    />
                  </svg>

                  <div className="relative z-10 text-center space-y-2">
                    <div className="relative inline-block">
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                        className="relative flex h-8 w-8 mx-auto"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFFFFF] opacity-75" />
                        <span className="relative inline-flex rounded-full h-8 w-8 bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-sm items-center justify-center shadow-lg">
                          <Building2 className="w-4 h-4 text-[#0E0E0E]" />
                        </span>
                      </motion.span>
                    </div>

                    <div className="bg-[#0E0E0E]/95 px-4 py-2 rounded-lg border border-[#2B2B2B] shadow-xl backdrop-blur-md">
                      <h3 className="text-sm font-bold font-outfit text-[#FFFFFF]">New Horizon College of Engineering</h3>
                      <span className="text-[11px] font-mono text-[#D4D4D4] block mt-0.5">
                        {isHovered ? 'Outer Ring Road, Marathahalli, Bengaluru' : 'Tap to Open Map'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
};

export default InteractiveLocation;
