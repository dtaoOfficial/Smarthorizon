import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResponsiveTableContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  showControls?: boolean;
}

export const ResponsiveTableContainer: React.FC<ResponsiveTableContainerProps> = ({
  children,
  className = '',
  title,
  showControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = Math.max(containerRef.current.clientWidth * 0.6, 250);
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative w-full max-w-full overflow-hidden ${className}`}>
      {/* Scrollable Viewport Wrapper */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="w-full overflow-x-auto hide-scrollbar scroll-smooth touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>

      {/* Edge Gradients when scrollable */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-10 w-8 bg-gradient-to-r from-[#0E0E0E]/80 to-transparent pointer-events-none z-10" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-10 w-8 bg-gradient-to-l from-[#0E0E0E]/80 to-transparent pointer-events-none z-10" />
      )}

      {/* Horizontal Navigation Scroll Bar Controls */}
      {showControls && (canScrollLeft || canScrollRight) && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#0B1D32] border-t border-[#00C8FF]/20 text-xs font-mono text-[#B8C9D8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00C8FF] animate-pulse" />
            <span className="text-[11px] font-bold text-[#19D3FF] tracking-wider uppercase">
              {title ? `${title} — HORIZONTAL NAVIGATION` : 'MATRIX SCROLL NAVIGATION'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className={`p-1.5 rounded-sm border transition-all flex items-center justify-center ${
                canScrollLeft
                  ? 'bg-[#00C8FF] text-[#0E0E0E] border-[#00C8FF] hover:bg-[#19D3FF] cursor-pointer shadow-[0_0_10px_rgba(0,200,255,0.4)]'
                  : 'bg-[#08192B] text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Scroll Matrix Left (Previous Columns)"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </button>

            <span className="text-[10px] font-bold text-[#F5F9FC] px-1.5 py-0.5 rounded bg-[#102943] border border-[#00C8FF]/30">
              SWIPE / SCROLL
            </span>

            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className={`p-1.5 rounded-sm border transition-all flex items-center justify-center ${
                canScrollRight
                  ? 'bg-[#00C8FF] text-[#0E0E0E] border-[#00C8FF] hover:bg-[#19D3FF] cursor-pointer shadow-[0_0_10px_rgba(0,200,255,0.4)]'
                  : 'bg-[#08192B] text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Scroll Matrix Right (Next Columns)"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
