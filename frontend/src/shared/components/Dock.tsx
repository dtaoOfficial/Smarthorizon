import React, { useRef, useState, useEffect, createContext, useContext } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, MotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DockContextType {
  mouseX: MotionValue<number>;
  magnification: number;
  distance: number;
  baseItemSize: number;
}

const DockContext = createContext<DockContextType | null>(null);

export interface DockProps {
  className?: string;
  magnification?: number;
  distance?: number;
  baseItemSize?: number;
  panelHeight?: number;
  children: React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({
  className = '',
  magnification = 62,
  distance = 140,
  baseItemSize = 48,
  panelHeight = 64,
  children,
}) => {
  const mouseX = useMotionValue(Infinity);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  };

  // Enable horizontal scrolling with vertical wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <DockContext.Provider value={{ mouseX, magnification, distance, baseItemSize }}>
      <div className={`relative flex items-center group/dock ${className}`}>
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={handleScrollLeft}
            className="absolute left-1 z-30 w-8 h-8 rounded-full bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] shadow-md flex items-center justify-center hover:bg-[#2B2B2B] transition-all"
            aria-label="Scroll dock left"
          >
            <ChevronLeft className="w-4 h-4 text-[#FFFFFF]" />
          </button>
        )}

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onWheel={handleWheel}
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-2 px-3.5 bg-[#181818]/90 backdrop-blur-xl border border-[#2B2B2B] rounded-3xl shadow-xl max-w-full"
          style={{ minHeight: panelHeight }}
        >
          {children}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            className="absolute right-1 z-30 w-8 h-8 rounded-full bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] shadow-md flex items-center justify-center hover:bg-[#2B2B2B] transition-all"
            aria-label="Scroll dock right"
          >
            <ChevronRight className="w-4 h-4 text-[#FFFFFF]" />
          </button>
        )}
      </div>
    </DockContext.Provider>
  );
};

export interface DockItemProps {
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  'aria-label'?: string;
}

export const DockItem: React.FC<DockItemProps> = ({
  className = '',
  onClick,
  isActive = false,
  badge,
  children,
  'aria-label': ariaLabel,
}) => {
  const context = useContext(DockContext);
  if (!context) throw new Error('DockItem must be used within a Dock');

  const { mouseX, magnification, distance, baseItemSize } = context;
  const itemRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const distanceFromMouse = useTransform(mouseX, (val) => {
    const bounds = itemRef.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(
    distanceFromMouse,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 180,
    damping: 14,
  });

  return (
    <div
      ref={itemRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-center shrink-0"
    >
      <motion.button
        type="button"
        style={{ width, height: width }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        aria-label={ariaLabel}
        className={`relative flex items-center justify-center rounded-2xl transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] ${
          isActive
            ? 'bg-[#FFFFFF] text-[#0E0E0E] border-2 border-[#FFFFFF] shadow-md'
            : 'bg-[#0E0E0E] hover:bg-[#2B2B2B] border border-[#2B2B2B] text-[#FFFFFF]'
        } ${className}`}
      >
        {/* Pass down isHovered and isActive */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { isHovered, isActive } as any);
          }
          return child;
        })}

        {/* Active Underdot Indicator */}
        {isActive && (
          <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#0E0E0E] shadow-sm" />
        )}

        {/* Optional Badge */}
        {badge !== undefined && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[#FFFFFF] text-[#0E0E0E] border border-[#0E0E0E] shadow-sm">
            {badge}
          </span>
        )}
      </motion.button>
    </div>
  );
};

export interface DockIconProps {
  className?: string;
  name?: string;
  children?: React.ReactNode;
  isActive?: boolean;
}

export const DockIcon: React.FC<DockIconProps> = ({
  className = '',
  children,
  isActive = false,
}) => {
  return (
    <div className={`flex items-center justify-center transition-transform ${className}`}>
      {children}
    </div>
  );
};

export interface DockLabelProps {
  className?: string;
  children: React.ReactNode;
  isHovered?: boolean;
  isActive?: boolean;
}

export const DockLabel: React.FC<DockLabelProps> = ({
  className = '',
  children,
  isHovered = false,
}) => {
  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: -45, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`absolute pointer-events-none z-40 whitespace-nowrap px-3 py-1 bg-[#181818] text-[#FFFFFF] font-mono text-xs font-bold border border-[#2B2B2B] rounded-xl shadow-lg ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
