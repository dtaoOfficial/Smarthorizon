import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  tilt?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  glow = true,
  tilt = true,
  ...props
}) => {
  const { isLight } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      whileHover={
        tilt
          ? {
              y: -3,
              scale: 1.005,
              boxShadow: isLight
                ? glow ? '0 12px 30px rgba(30, 80, 120, 0.12)' : '0 8px 24px rgba(30, 80, 120, 0.08)'
                : glow ? '0 12px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.1)' : '0 10px 24px rgba(0, 0, 0, 0.6)',
              borderColor: isLight ? '#1687D9' : 'rgba(255, 255, 255, 0.3)',
            }
          : {
              y: -1,
              boxShadow: isLight ? '0 8px 20px rgba(30, 80, 120, 0.08)' : '0 8px 20px rgba(0, 0, 0, 0.6)',
            }
      }
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className={twMerge(`rounded-2xl p-6 shadow-xl relative overflow-hidden transition-colors duration-300 ${
        isLight
          ? 'bg-white border border-[#C8DCEB] text-[#0B2340]'
          : 'bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF]'
      }`, className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
