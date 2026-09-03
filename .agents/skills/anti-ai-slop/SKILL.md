---
name: anti-ai-slop
description: >-
  Strict anti-AI-slop design heuristics and audit checklist for web interfaces.
  Use this skill to detect and eliminate stereotypical AI-generated web designs (excessive cyan/purple gradients, generic glassmorphism, floating HUD cards, uniform rounded rectangles, repetitive layout structures).
---

# Anti-AI-Slop Frontend Audit & Heuristics

## The "AI Slop" Signature & How To Fix It

| AI Slop Symptom | Root Cause | Human Senior Designer Solution |
| :--- | :--- | :--- |
| **Cyan/Purple Glow Everywhere** | Defaulting to generic "cyberpunk/tech" prompt preset | Use architectural dark navy `#030712`, clean crisp white text `#F8FAFC`, precise gold `#EAB308` or electric cobalt `#2563EB` accents sparingly. |
| **Identical Rounded Card Grids** | Repeating `rounded-2xl border bg-slate-900` | Mix full-width editorial bands, 2-column asymmetric splits, borderless typographic lists, and horizontal timelines. |
| **Fake Live Telemetry / Floating HUDs** | Adding decorative noise to fill blank space | Remove all fake metrics, fake terminal feeds, and floating HUDs. Replace with real platform capability walkthroughs. |
| **Generic Inter Font Typography** | Relying on default font stack without character | Pair distinct display typography (e.g., `Syne` or `Outfit` or `Space Grotesk`) with crisp body and technical mono typography (`JetBrains Mono`). |
| **Pill Buttons Everywhere** | Generic component library defaults | Design crisp, angular or subtly rounded engineered buttons with high-contrast hover states and typography. |
| **Predictable Hero Layout** | Centered title + subhead + 2 buttons + floating card | Use asymmetric left-aligned oversized title, structured date/location bar, official logo integration, and strong vertical baseline anchors. |

---

## Anti-AI-Slop Quality Gate Questions

Before finalizing any frontend interface, answer these 5 critical questions:

1. **"Would a senior human designer at an top-tier design agency ship this exact layout?"**
   - If it looks like a 2023 AI-generated v0/Tailwind template, redesign it.
2. **"Does every visual element serve a structural or semantic purpose?"**
   - If an element is purely a glowing circle or background blur spot, delete it.
3. **"Is there deliberate scale contrast and typographic weight distribution?"**
   - Headings should feel massive and architectural; body text readable; tags precise.
4. **"Are section structures varied down the page?"**
   - Section 1 (Hero): Asymmetric 7/5 grid.
   - Section 2 (48h Sprint): Minimal horizontal timeline reveal.
   - Section 3 (Domains): Editorial typographic hover list / accordion.
   - Section 4 (Prize Pool): Massive numeric stat with clean breakdown grid.
   - Section 5 (Platform): Tabbed product workspace preview with functional hotspots.
   - Section 6 (Timeline): Vertical milestone axis.
   - Section 7 (Venue): Architectural map illustration.
5. **"Is the color palette restrained?"**
   - Maximum 1 primary background shade, 1 elevated surface shade, 1 primary text, 1 secondary text, and 2 purpose-driven accent colors.
