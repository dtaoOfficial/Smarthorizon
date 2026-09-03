import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { twMerge } from 'tailwind-merge';

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: string;
  glow?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  glow = false,
  className = '',
  onClick,
  ...props
}) => {
  const { isLight } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return isLight 
          ? 'bg-[#1687D9] text-white font-mono font-bold shadow-sm hover:bg-[#0B63B6] border border-[#1687D9]' 
          : 'bg-[#1687D9] text-white font-mono font-bold shadow-sm hover:bg-[#0B63B6] border border-[#1687D9]';
      case 'secondary':
        return isLight
          ? 'bg-[#EFF6FF] text-[#0B63B6] font-mono font-bold shadow-sm border border-[#BFDBFE] hover:bg-[#DBEAFE] hover:text-[#0B2340]'
          : 'bg-[#2B2B2B] text-[#FFFFFF] font-mono font-bold shadow-sm border border-[#555555] hover:bg-[#333333] hover:text-[#FFFFFF]';
      case 'outline':
        return isLight
          ? 'bg-white text-[#0B2340] font-mono font-bold shadow-sm border border-[#C8DCEB] hover:border-[#1687D9] hover:bg-[#F5FAFE]'
          : 'bg-[#181818] text-[#FFFFFF] font-mono font-bold shadow-sm border border-[#2B2B2B] hover:border-[#555555] hover:bg-[#222222]';
      case 'ghost':
        return isLight
          ? 'bg-transparent text-[#0B63B6] font-mono font-bold hover:text-[#0B2340] hover:bg-[#EFF6FF]'
          : 'bg-transparent text-[#D4D4D4] font-mono font-bold hover:text-[#FFFFFF] hover:bg-[#2B2B2B]';
      case 'danger':
        return isLight
          ? 'bg-rose-50 text-rose-800 font-mono font-bold shadow-sm border border-rose-200 hover:bg-rose-100'
          : 'bg-rose-900/30 text-rose-400 font-mono font-bold shadow-sm border border-rose-900/50 hover:bg-rose-900/50';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs rounded-lg gap-1.5';
      case 'md':
        return 'px-4 py-2 text-xs rounded-lg gap-2';
      case 'lg':
        return 'px-6 py-2.5 text-sm rounded-lg gap-2.5';
    }
  };

  return (
    <motion.button
      whileHover={{
        scale: 1.02,
        y: -1,
      }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 28 }}
      onClick={handleClick}
      className={twMerge(`relative overflow-hidden inline-flex items-center justify-center cursor-pointer select-none transition-all ${getVariantStyles()} ${getSizeStyles()}`, className)}
      {...props}
    >
      <span className="tracking-wider">{children}</span>
    </motion.button>
  );
};
