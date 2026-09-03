---
name: color-design-tokens
description: >-
  Color architecture and CSS design token system guidelines for web applications.
  Use this skill to define background, surface, text, border, and accent color roles, WCAG contrast levels, and CSS variables for brand-consistent design engineering.
---

# Color System & Design Tokens

## 1. Brand Palette Definition

Smart Horizon 2026 branding balances deep engineering foundation colors with vivid accents celebrating the **NHCE 25th Silver Jubilee Year**:

- **Foundation Background (`#030712`)**: Deep rich dark navy base (95% black with subtle deep blue tint).
- **Elevated Surface (`#081325`)**: Dark obsidian surface for structural cards and panels.
- **Card Container (`#0D1F38`)**: Slightly lighter container background for interactive surfaces.
- **Primary Text (`#F8FAFC`)**: High-legibility crisp off-white for primary headlines.
- **Secondary Text (`#94A3B8`)**: Soft slate blue for body copy and subheads.
- **Muted Text (`#64748B`)**: Muted steel for secondary metadata.
- **Primary Accent (`#0284C7` / `#00C8FF`)**: Precision cyan/sky for primary call-to-actions and track highlights.
- **Secondary Jubilee Accent (`#EAB308` / `#FFB21A`)**: Warm gold for Silver Jubilee celebrations, cash prize pool, and major achievements.
- **Subtle Border (`rgba(56, 189, 248, 0.18)`)**: Low-opacity sky border line for precise architectural containment.

---

## 2. CSS Design Tokens Standard

```css
:root {
  --color-bg-base: #030712;
  --color-bg-surface: #081325;
  --color-bg-elevated: #0d1f38;
  --color-border-subtle: rgba(56, 189, 248, 0.15);
  --color-border-hover: rgba(56, 189, 248, 0.40);
  
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  
  --color-accent-cyan: #00c8ff;
  --color-accent-blue: #2563eb;
  --color-accent-gold: #ffb21a;
  
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;
}
```

---

## 3. Usage & Hierarchy Rules

1. **Background Contrast**: Surface elements must have clear contrast against base backgrounds without relying on neon borders.
2. **Accent Discipline**: Accent colors (`cyan` & `gold`) are reserved for focal points, CTA buttons, active state indicators, and key numbers. They must NOT be painted indiscriminately across background cards.
3. **WCAG Compliance**: All text on dark backgrounds must meet WCAG 2.1 AA ratio (minimum 4.5:1 contrast).
