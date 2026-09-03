---
name: component-design-system
description: >-
  Component design system architecture and React component refactoring guidelines.
  Use this skill to design modular, reusable UI components (Buttons, Navigation, Cards, Section Headers, Tabs) while preserving application state, routing, and backend integrations.
---

# Component Architecture & Design System

## 1. Component Taxonomy & Variant Matrix

### A. Primary & Secondary Buttons (`AnimatedButton.tsx` / `Button.tsx`)
- **Primary**: Deep navy background with cyan accent border, solid engineered fill, subtle hover lift, arrow icon translation (+4px).
- **Secondary**: Elevated surface background (`#081325`), subtle sky border, crisp text.
- **Gold/Jubilee**: Dark amber base with gold border and text (`#FFB21A`), reserved for prize pool and leaderboard achievements.

### B. Navigation Bar (`Navbar.tsx`)
- Fixed/sticky backdrop blur container with subtle bottom border (`rgba(56, 189, 248, 0.15)`).
- Active link tracking with animated layout underline indicator.
- Compact mobile drawer toggle with clear accessibility aria attributes.

### C. Section Headers (`SectionHeader.tsx`)
- Uniform editorial section header pattern:
  - Technical category badge (uppercase, background pill, subtle border).
  - Main section headline (display typography, sentence/uppercase, bold).
  - Explanatory subtitle (secondary slate text, max-w-2xl).

---

## 2. Preservation of Core Logic & API Integration

- **Never break business logic**: Ensure all routing (`/login`, `/leaderboard`, `/dashboard`), API calls (`/api/auth`, `/api/teams`), and state handlers are preserved intact.
- **Component Refactoring**: Refactor presentational markup and styling classes while passing identical props and click handlers.
