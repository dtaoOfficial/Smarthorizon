import React, { useEffect, useRef } from 'react';

export interface CircuitBackgroundProps extends React.ComponentProps<'div'> {
  className?: string;
  children?: React.ReactNode;
}

export const CircuitBackground: React.FC<CircuitBackgroundProps> = ({
  className = '',
  children,
  ...props
}) => {
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!mediaQuery.matches || prefersReduced) return;

    let ticking = false;
    let mouseX = 50;
    let mouseY = 30;

    const updateLight = () => {
      if (lightRef.current) {
        lightRef.current.style.background = `
          radial-gradient(circle at ${mouseX}% ${mouseY}%, rgba(255, 255, 255, 0.04) 0%, transparent 35%),
          radial-gradient(circle at 80% 20%, rgba(212, 212, 212, 0.03) 0%, transparent 40%)
        `;
      }
      ticking = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = Math.round((e.clientX / window.innerWidth) * 100);
      mouseY = Math.round((e.clientY / window.innerHeight) * 100);

      if (!ticking) {
        requestAnimationFrame(updateLight);
        ticking = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-[#0E0E0E] text-[#FFFFFF] ${className}`} {...props}>
      {/* Structural Micro-Grid */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Subtle Monochrome Lighting (Hardware Accelerated DOM Ref Update) */}
      <div
        ref={lightRef}
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 45%)`,
          willChange: 'background',
        }}
      />

      {/* Minimal Structural Axis */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="80" x2="100%" y2="80" stroke="#2B2B2B" strokeWidth="1" strokeDasharray="6 6" />
        </svg>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default CircuitBackground;
