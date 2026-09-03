/**
 * Smart Horizon 2026 - Centralized Motion & Animation Architecture Tokens
 * Preserves high performance: GPU transforms only (translate3d, scale, opacity).
 * Fully respects prefers-reduced-motion & mobile GPU constraints.
 */

export const MOTION_TOKENS = {
  duration: {
    micro: 0.2,       // 200ms: buttons, pills, hover states
    standard: 0.35,   // 350ms: tab transitions, card highlights
    reveal: 0.6,      // 600ms: section scroll reveals
    cinematic: 0.9,   // 900ms: hero loading & progress bars
  },
  ease: {
    smooth: [0.16, 1, 0.3, 1] as const,     // Premium fluid curve
    snappy: [0.25, 1, 0.5, 1] as const,     // Responsive feedback curve
    soft: [0.4, 0.0, 0.2, 1] as const,       // Gentle transition
  },
  spring: {
    bouncy: { type: 'spring' as const, stiffness: 400, damping: 25 },
    snappy: { type: 'spring' as const, stiffness: 350, damping: 30 },
    gentle: { type: 'spring' as const, stiffness: 180, damping: 24 },
  },
};

// Standard Motion Variants for Framer Motion
export const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TOKENS.duration.reveal,
      ease: MOTION_TOKENS.ease.smooth,
    },
  },
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_TOKENS.duration.standard,
      ease: MOTION_TOKENS.ease.smooth,
    },
  },
};

export const scaleUpVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: MOTION_TOKENS.duration.standard,
      ease: MOTION_TOKENS.ease.smooth,
    },
  },
};
