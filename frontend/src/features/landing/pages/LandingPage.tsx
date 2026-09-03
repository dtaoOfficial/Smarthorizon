import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, Trophy, Rocket, Menu, X, Phone } from 'lucide-react';
import { CircuitBackground } from '../../../shared/components/CircuitBackground';
import { BrandLogo } from '../../../shared/components/BrandLogo';

import { useSmoothScroll } from '../../../shared/hooks/useSmoothScroll';
import { MagneticButton, RevealOnScroll, HoverCard, StaggerContainer, StaggerItem } from '../../../shared/components/MotionPrimitives';
import { MOTION_TOKENS } from '../../../shared/theme/motion';

import { Interactive48Stage } from '../components/Interactive48Stage';
import { InteractiveDomains } from '../components/InteractiveDomains';
import { PrizePoolBreakdown } from '../components/PrizePoolBreakdown';
import { EventTimeline } from '../components/EventTimeline';
import { InteractivePlatform } from '../components/InteractivePlatform';
import { InteractiveLocation } from '../components/InteractiveLocation';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const heroRef = useRef<HTMLElement>(null);

  // Initialize desktop momentum smooth scrolling
  useSmoothScroll(true);

  // Scroll-linked handoff transition (Hero -> 48-Hour Section)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.965]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  // Subtle pointer depth (Desktop fine-pointer only, max 3.5px)
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 25 };
  const mouseX = useSpring(rawMouseX, springConfig);
  const mouseY = useSpring(rawMouseY, springConfig);

  useEffect(() => {
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDesktop || prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 4;
      const normY = (e.clientY / window.innerHeight - 0.5) * 4;
      rawMouseX.set(normX);
      rawMouseY.set(normY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [rawMouseX, rawMouseY]);

  // Active section scroll tracking (optimized to update state ONLY when section changes)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const sections = ['hero', 'challenges', 'prizes', 'timeline', 'platform', 'location'];
        const scrollPos = window.scrollY + 220;

        for (const sec of sections) {
          const el = document.getElementById(sec);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPos >= top && scrollPos < top + height) {
              setActiveSection((prev) => (prev !== sec ? sec : prev));
              break;
            }
          }
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <CircuitBackground className="relative min-h-screen text-[#FFFFFF] font-sans overflow-x-hidden select-none">
      
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#2B2B2B] bg-[#0E0E0E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <BrandLogo variant="navbar" />
            <span className="hidden sm:block text-xs font-mono font-bold text-[#D4D4D4] tracking-wider">
              NHCE 25TH SILVER JUBILEE
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs font-mono font-bold tracking-wider">
            {[
              { id: 'hero', label: 'ABOUT' },
              { id: 'challenges', label: 'CHALLENGES' },
              { id: 'prizes', label: 'PRIZES' },
              { id: 'timeline', label: 'TIMELINE' },
              { id: 'platform', label: 'PLATFORM' },
              { id: 'location', label: 'LOCATION' },
            ].map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => scrollToSection(nav.id)}
                className={`relative py-1 transition-colors duration-200 cursor-pointer ${
                  activeSection === nav.id ? 'text-[#FFFFFF]' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'
                }`}
              >
                {nav.label}
                {activeSection === nav.id && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFFFFF]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <MagneticButton
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-xs hover:bg-[#D4D4D4] transition-colors shadow-sm cursor-pointer"
            >
              PORTAL LOGIN
            </MagneticButton>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg border border-[#2B2B2B] bg-[#181818] text-[#FFFFFF]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-16 z-40 max-w-7xl mx-6 p-4 rounded-xl border border-[#2B2B2B] bg-[#181818] shadow-2xl space-y-3 font-mono text-xs">
          {[
            { id: 'hero', label: 'ABOUT' },
            { id: 'challenges', label: 'CHALLENGES' },
            { id: 'prizes', label: 'PRIZES' },
            { id: 'timeline', label: 'TIMELINE' },
            { id: 'platform', label: 'PLATFORM' },
            { id: 'location', label: 'LOCATION' },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => scrollToSection(nav.id)}
              className={`block w-full text-left py-2.5 px-3 rounded-lg ${
                activeSection === nav.id ? 'bg-[#2B2B2B] text-[#FFFFFF] font-bold' : 'text-[#B3B3B3]'
              }`}
            >
              {nav.label}
            </button>
          ))}
          <div className="pt-2 border-t border-[#2B2B2B] flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
              className="w-full py-3 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] font-bold text-center"
            >
              ENTER PLATFORM
            </button>
            
          </div>
        </div>
      )}

      {/* 2. EDITORIAL HERO SECTION */}
      <main ref={heroRef} id="hero" className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="space-y-8 max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Tagline (Hierarchical Entrance Step 1 & 2) */}
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: MOTION_TOKENS.ease.smooth }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#181818] border border-[#2B2B2B] text-xs font-mono font-bold text-[#D4D4D4]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
              <span>SILVER JUBILEE YEAR CELEBRATIONS</span>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: MOTION_TOKENS.ease.smooth }}
              className="text-xs sm:text-sm font-mono font-semibold text-[#B3B3B3] tracking-wider uppercase block pt-1"
            >
              NEW HORIZON COLLEGE OF ENGINEERING &bull; 25 YEARS OF GLOBAL LEARNING
            </motion.p>
          </div>

          {/* Headline Subhead (Hierarchical Entrance Step 3 & 4) */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: MOTION_TOKENS.ease.smooth }}
              style={{ x: mouseX, y: mouseY, willChange: 'transform' }}
            >
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-syne tracking-tight text-[#FFFFFF] uppercase leading-tight max-w-4xl mx-auto">
                SMART HORIZON INTERNATIONAL HACKATHON{' '}
                <motion.span
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.4, ease: MOTION_TOKENS.ease.smooth }}
                  className="text-[#D4D4D4] inline-block"
                >
                  2026
                </motion.span>
              </h1>
            </motion.div>

            {/* Hierarchical Entrance Step 5 */}
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.48, ease: MOTION_TOKENS.ease.smooth }}
              className="text-xl sm:text-3xl font-extrabold font-outfit text-[#D4D4D4] tracking-tight uppercase pt-2"
            >
              48-Hour International Engineering Hackathon
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.54, ease: MOTION_TOKENS.ease.smooth }}
              className="text-sm sm:text-base text-[#B3B3B3] font-sans leading-relaxed max-w-2xl mx-auto pt-2"
            >
              September 3rd – 5th, 2026 &bull; NHCE Campus, Bengaluru, India &bull; ₹23,75,000 Cash Prize Pool Across 8 Innovation Tracks.
            </motion.p>
          </div>

          {/* Action Buttons (Hierarchical Entrance Step 6) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.62, ease: MOTION_TOKENS.ease.smooth }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <MagneticButton
              onClick={() => navigate('/login')}
              className="px-7 py-3.5 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-sm hover:bg-[#D4D4D4] transition-all shadow-lg flex items-center gap-2.5 group cursor-pointer"
            >
              <span>ENTER PLATFORM PORTAL</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>

            <MagneticButton
              onClick={() => navigate('/leaderboard')}
              className="px-6 py-3.5 rounded-lg border border-[#2B2B2B] bg-[#181818] text-[#FFFFFF] font-mono font-bold text-sm hover:border-[#555555] transition-all shadow-md flex items-center gap-2 group cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#D4D4D4]" />
              <span>View Leaderboard</span>
            </MagneticButton>
          </motion.div>
        </motion.div>
      </main>

      {/* 3. INTERACTIVE "48 HOURS" SPRINT STAGE */}
      <Interactive48Stage />

      {/* 4. INTERACTIVE CHALLENGE DOMAINS */}
      <InteractiveDomains />

      {/* 5. INTERACTIVE PRIZE POOL ₹23,75,000 */}
      <div className="bg-[#181818]/60 border-y border-[#2B2B2B]">
        <PrizePoolBreakdown />
      </div>

      {/* 6. INTERACTIVE EVENT TIMELINE */}
      <EventTimeline />

      {/* 7. INTERACTIVE SMART HORIZON OPERATING SYSTEM PLATFORM PREVIEW */}
      <InteractivePlatform />

      {/* 8. INSTITUTIONAL AFFILIATIONS & APPROVALS */}
      <section className="py-20 max-w-7xl mx-auto px-6 text-left">
        <RevealOnScroll>
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-mono font-bold text-[#D4D4D4] uppercase tracking-widest bg-[#181818] px-3.5 py-1 rounded-md border border-[#2B2B2B] inline-block">
              ORGANIZING BODIES & APPROVALS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-outfit text-[#FFFFFF]">
              Institutional Leadership & Affiliations
            </h2>
          </div>
        </RevealOnScroll>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StaggerItem>
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
              className="p-6 space-y-3 rounded-xl bg-[#181818] border border-[#2B2B2B] hover:border-[#555555] shadow-md flex flex-col justify-between h-full transition-colors duration-300"
            >
              <BrandLogo partner="iic" variant="hero" className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h3 className="text-base font-bold font-outfit text-[#FFFFFF]">Institution's Innovation Council</h3>
                <p className="text-xs text-[#B3B3B3] leading-relaxed mt-1">
                  Established under the Ministry of Education (MoE), Innovation Cell to foster innovation.
                </p>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
              className="p-6 space-y-3 rounded-xl bg-[#181818] border border-[#555555] shadow-md flex flex-col justify-between h-full transition-colors duration-300"
            >
              <BrandLogo partner="nhce" variant="hero" className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h3 className="text-base font-bold font-outfit text-[#FFFFFF]">NHCE Silver Jubilee</h3>
                <p className="text-xs text-[#B3B3B3] leading-relaxed mt-1">
                  Celebrating 25 Years of Global Learning & Engineering Excellence at New Horizon College of Engineering.
                </p>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
              className="p-6 space-y-3 rounded-xl bg-[#181818] border border-[#2B2B2B] hover:border-[#555555] shadow-md flex flex-col justify-between h-full transition-colors duration-300"
            >
              <BrandLogo partner="aicte" variant="hero" className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h3 className="text-base font-bold font-outfit text-[#FFFFFF]">AICTE Approved</h3>
                <p className="text-xs text-[#B3B3B3] leading-relaxed mt-1">
                  Recognized by the All India Council for Technical Education.
                </p>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2, ease: MOTION_TOKENS.ease.smooth }}
              className="p-6 space-y-3 rounded-xl bg-[#181818] border border-[#2B2B2B] hover:border-[#555555] shadow-md flex flex-col justify-between h-full transition-colors duration-300"
            >
              <BrandLogo partner="vtu" variant="hero" className="transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h3 className="text-base font-bold font-outfit text-[#FFFFFF]">VTU Affiliated</h3>
                <p className="text-xs text-[#B3B3B3] leading-relaxed mt-1">
                  Affiliated to Visvesvaraya Technological University (VTU), Belagavi, Karnataka.
                </p>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* 9. INTERACTIVE LOCATION & VENUE MAP */}
      <InteractiveLocation />

      {/* 10. FINAL CTA & FOOTER */}
      <section className="py-24 bg-[#181818] border-t border-[#2B2B2B] text-center space-y-6 relative overflow-hidden">
        <RevealOnScroll>
          <div className="max-w-3xl mx-auto px-6 space-y-4">
            <motion.h2
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, ease: MOTION_TOKENS.ease.smooth }}
              className="text-4xl sm:text-6xl font-black font-syne text-[#FFFFFF] uppercase tracking-tight"
            >
              Ready To Build At Smart Horizon 2026?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.15, ease: MOTION_TOKENS.ease.smooth }}
              className="text-sm sm:text-base text-[#B3B3B3] font-sans"
            >
              Join international student engineering teams in Bengaluru, India for 48 hours of high-stakes building and ₹23.75 Lakhs in awards.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: 0.3, ease: MOTION_TOKENS.ease.smooth }}
              className="pt-4 flex justify-center"
            >
              <MagneticButton
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] font-mono font-bold text-sm hover:bg-[#D4D4D4] transition-colors duration-200 shadow-lg flex items-center gap-3 cursor-pointer group"
              >
                <span>ENTER PLATFORM PORTAL</span>
                <Rocket className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </MagneticButton>
            </motion.div>
          </div>
        </RevealOnScroll>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#2B2B2B] py-10 bg-[#0E0E0E] text-center text-xs font-mono text-[#B3B3B3] space-y-6">
        <StaggerContainer className="flex justify-center items-center gap-6 flex-wrap pb-2">
          <StaggerItem>
            <motion.div whileHover={{ opacity: 1, scale: 1.04 }} transition={{ duration: 0.2 }}>
              <BrandLogo partner="iic" variant="footer" />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ opacity: 1, scale: 1.04 }} transition={{ duration: 0.2 }}>
              <BrandLogo partner="nhce" variant="footer" />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ opacity: 1, scale: 1.04 }} transition={{ duration: 0.2 }}>
              <BrandLogo partner="aicte" variant="footer" />
            </motion.div>
          </StaggerItem>
          <StaggerItem>
            <motion.div whileHover={{ opacity: 1, scale: 1.04 }} transition={{ duration: 0.2 }}>
              <BrandLogo partner="vtu" variant="footer" />
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* EVENT COORDINATOR CONTACTS */}
        <div className="pt-4 border-t border-[#2B2B2B] max-w-4xl mx-auto px-6">
          <span className="text-[11px] font-mono font-bold text-[#FFFFFF] uppercase tracking-widest block mb-4">
            EVENT & STUDENT COORDINATOR CONTACTS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            {[
              { name: 'Mr. Yashaswi Suprabhat', phone: '8125644388' },
              { name: 'Mr. Nishant', phone: '7349300883' },
              { name: 'Mr. IKSHITH KUMAR S', phone: '9360334880' },
              { name: 'Mr. Vinayaka', phone: '9353643928' },
            ].map((contact) => (
              <a
                key={contact.phone}
                href={`tel:${contact.phone}`}
                className="p-3.5 rounded-xl bg-[#181818] border border-[#2B2B2B] hover:border-[#555555] transition-all flex flex-col justify-between group"
              >
                <span className="text-xs font-bold text-[#FFFFFF] font-sans group-hover:text-[#D4D4D4]">
                  {contact.name}
                </span>
                <span className="text-xs font-mono font-semibold text-[#B3B3B3] flex items-center gap-1.5 mt-1.5">
                  <Phone className="w-3 h-3 text-[#FFFFFF]" />
                  <span>+91 {contact.phone}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-1 pt-2"
        >
          <p>Smart Horizon 2026 International Hackathon &bull; Silver Jubilee Year Celebrations</p>
          <p className="text-[11px] text-[#B3B3B3]">New Horizon College of Engineering, Outer Ring Road, Marathahalli, Bengaluru, Karnataka</p>
        </motion.div>
      </footer>
    </CircuitBackground>
  );
};

export default LandingPage;


