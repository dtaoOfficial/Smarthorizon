---
name: interaction-motion
description: >-
  Interaction design, micro-interaction feedback, and motion animation guidelines using Framer Motion.
  Use this skill to design intentional, premium micro-animations, page transitions, hover states, scroll triggers, and prefers-reduced-motion support.
---

# Interaction & Motion Design Principles

## 1. Core Motion Philosophy

- **Purposeful & Engineered**: Motion should provide tactile feedback, guide user attention, or reveal structural information.
- **No Endless Looping Distractions**: Avoid floating ambient items, continuous bouncing badges, or endless particle engines.
- **Snappy Easing**: Use spring physics (`damping: 25, stiffness: 300`) or clean cubic-bezier easing (`easeOut`, `cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 2. Micro-Interactions Standard

- **Buttons**:
  - `whileHover={{ y: -2, scale: 1.01 }}`
  - `whileTap={{ y: 0, scale: 0.98 }}`
  - Arrow icons shift +3px to +4px on hover (`group-hover:translate-x-1`).
- **Cards & Interactive Containers**:
  - Border opacity increases from `0.15` to `0.40`.
  - Subtle vertical lift (`y: -4px`) or subtle scale change (`scale: 1.01`).
- **Tabs & Selectors**:
  - Smooth layout animation (`layoutId="activeTab"`) for active indicators.
  - Tab content transition using Framer Motion `AnimatePresence` mode `wait` (`opacity: 0, y: 10` -> `opacity: 1, y: 0`).

---

## 3. Accessibility & Reduced Motion

- Always honor `prefers-reduced-motion`:
```tsx
import { useReducedMotion } from 'framer-motion';
const shouldReduceMotion = useReducedMotion();
```
- Disable cursor parallax and spring shifts when `shouldReduceMotion` is true.
