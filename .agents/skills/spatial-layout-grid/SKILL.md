---
name: spatial-layout-grid
description: >-
  Spatial composition, grid systems, and layout rhythm heuristics for web pages.
  Use this skill to design 12-column layouts, asymmetric hero compositions, deliberate whitespace systems, and varied section rhythm without repeating identical card blocks.
---

# Spatial Layout & Grid System

## 1. Grid & Container Architecture

- **Max Content Width**: `1280px` (`max-w-7xl`).
- **Page Gutters**: `px-4` on mobile, `px-8` on tablet, `px-12` on desktop.
- **Section Spacing**: `py-16` (mobile) to `py-28` (desktop). Never cram sections together.
- **12-Column Grid**: Use 12-column grid systems (`grid grid-cols-12`) with explicit column spans (`lg:col-span-7`, `lg:col-span-5`) for asymmetric balance.

---

## 2. Asymmetric & Editorial Composition Patterns

| Section Type | Preferred Layout Pattern | Structural Intent |
| :--- | :--- | :--- |
| **Hero Section** | Asymmetric 7/5 Split (Left heavy type + Right brand anchor asset) | Creates strong reading entry line and visual balance |
| **48-Hour Sprint** | Horizontal Expandable Timeline Stage Bar | Timeline feel rather than generic grid |
| **Challenge Domains** | Large Typographic Interactive List (Desktop) / Vertical Accordion (Mobile) | High-end editorial list feel with interactive depth |
| **Prize Pool** | Oversized Numerical Centerpiece + 3-Column Sequential Breakdown | Draws immediate attention to ₹23.75L prize scale |
| **Platform Preview** | Role Selector Tabs + Interactive Product Interface View + Hotspot Overlays | Demonstrates operational tool capability |
| **Event Timeline** | Vertical Timeline Axis with Alternating Content Nodes | Chronological event storytelling |

---

## 3. Spacing Rhythms & Negative Space

- **Macro Whitespace**: High distance between major sections (80px–112px) signals topic shifts.
- **Micro Whitespace**: Tight grouping between titles, subtitles, and badges (8px–16px) establishes strong semantic relationship.
- **Rhythm Variety**: Alternate dark navy base section, slightly elevated surface section, full-bleed CTA section.
