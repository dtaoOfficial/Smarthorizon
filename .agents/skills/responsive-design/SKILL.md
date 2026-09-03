---
name: responsive-design
description: >-
  Responsive design strategy, viewport adaptation, and mobile-first touch ergonomics guidelines.
  Use this skill to ensure flawless layout adaptation across mobile (320px+), tablet (768px+), desktop (1024px+), and ultra-wide displays without horizontal overflow or touch defects.
---

# Responsive Design & Mobile Ergonomics

## 1. Viewport Adaptation Matrix

- **Mobile (< 768px)**:
  - Cursor-based parallax & mouse lighting disabled.
  - Hover states replaced by clear tap targets (`min-h-[44px]`).
  - Complex horizontal lists transform into vertical accordions or swipe cards.
  - Compact sticky top navigation bar with mobile drawer toggle.
  - No horizontal scrollbar (`overflow-x-hidden` on outer shell).

- **Tablet (768px – 1024px)**:
  - 2-column grid adaptations.
  - Font scale adjusts via CSS `clamp()`.

- **Desktop (> 1024px)**:
  - Full 12-column grid layout.
  - Subtle mouse movement interaction enabled.
  - Interactive hover state expansion enabled.

---

## 2. Touch & Tap Guidelines

1. **Touch Targets**: Buttons, tabs, links, and accordion headers must have at least 44x44px touch target area.
2. **Hover Fallback**: Any desktop hover preview (e.g. platform preview hotspots, challenge domains) MUST have an explicit tap/click toggle for touch devices.
3. **Typography**: Ensure minimum font size of 12px for micro-labels on mobile.
