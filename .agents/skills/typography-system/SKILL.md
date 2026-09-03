---
name: typography-system
description: >-
  Editorial and technical typography system heuristics for web design.
  Use this skill to establish responsive type scales, font pairings, letter spacing (tracking), line heights, x-height balance, and semantic uppercase vs sentence case rules.
---

# Typography System Guidelines

## 1. Typeface Roles & Pairing Architecture

| Role | Font Family | Character & Purpose | Usage Guidelines |
| :--- | :--- | :--- | :--- |
| **Display / Hero Headline** | `Syne` / `Space Grotesk` / `Outfit` | Bold, architectural, contemporary, high visual impact | Display scale (48px–96px). Tight line-height (0.95–1.05), tracking (-0.03em). |
| **Section Headings** | `Plus Jakarta Sans` / `Outfit` | Clean, modern, highly legible sans-serif | Heading scale (20px–36px). SemiBold to Black weights. Sentence case or uppercase badges. |
| **Body / Paragraphs** | `Plus Jakarta Sans` / `Inter` | Exceptional legibility, generous x-height, neutral tone | Body scale (14px–16px). Line height 1.6, weight 400/500. Avoid pure white on black (use `#E2E8F0`). |
| **Technical / Monospace** | `JetBrains Mono` | Precise, engineered, structural technical data | Micro labels (11px–13px), registration IDs, dates, time badges. Uppercase with tracking (+0.05em to +0.1em). |

---

## 2. Responsive Type Scale (Clamp-based)

```css
/* Display XL (Hero Headline) */
font-size: clamp(2.5rem, 5vw + 1rem, 5.5rem); /* 40px to 88px */

/* Section Title H2 */
font-size: clamp(1.75rem, 3vw + 0.75rem, 3rem); /* 28px to 48px */

/* Subsection Title H3 */
font-size: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem); /* 20px to 28px */

/* Body Regular */
font-size: clamp(0.875rem, 0.25vw + 0.8rem, 1rem); /* 14px to 16px */

/* Technical Micro Label */
font-size: 0.75rem; /* 12px */
letter-spacing: 0.08em;
text-transform: uppercase;
```

---

## 3. Typographic Rules of Engagement

1. **Do NOT default to uppercase for everything**: Reserved for technical badges, tags, numbers, and short editorial category labels. Main subheads and body copy should use crisp sentence case.
2. **Never use monospace for long text**: Monospace is for timestamps, data tokens, track IDs, numbers, and code metadata.
3. **Contrast through weight and tracking**: Pair thin/light micro-labels with black/heavy display text to create architectural contrast.
4. **Numeral Design**: Large prize amounts (e.g. ₹23,75,000) should use tabular or bold display numerals for maximum visual presence.
