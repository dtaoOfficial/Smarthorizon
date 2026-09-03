---
name: visual-qa-critique
description: >-
  Visual QA and screenshot design review critique workflow for web interfaces.
  Use this skill to perform systematic design evaluations, inspect rendered build output across viewports, critique typography/hierarchy/spacing/alignment/contrast, and eliminate visual defects before declaring task completion.
---

# Visual QA & Design Critique Workflow

## 1. The 15-Point Design Review Checklist

| # | Critique Domain | Evaluation Criteria | Pass Threshold |
| :--- | :--- | :--- | :--- |
| **1** | **Brand Authenticity** | Does the interface reflect official NHCE Silver Jubilee branding and international hackathon scale? | High Credibility |
| **2** | **Hero Composition** | Is there a single, high-impact hero composition with clear focal point and no template clutter? | Art-directed |
| **3** | **Typographic Hierarchy** | Is scale contrast dramatic (display vs body vs technical micro)? | Crisp Contrast |
| **4** | **Color Harmony** | Is the color palette restrained with purposeful accent usage? | Balanced |
| **5** | **Anti-AI-Slop** | Are generic cyan wallpaper blurs, glowing pill cards, and fake HUDs eliminated? | Zero Slop |
| **6** | **Spatial Rhythm** | Is spacing proportional and varied down the page? | Engineered |
| **7** | **Grid Alignment** | Are baseline alignment lines clean across columns? | Aligned |
| **8** | **Button Hierarchy** | Are primary vs secondary CTAs visually clear? | Distinct |
| **9** | **Domain Interactive Section** | Does hovering/tapping 8 challenge tracks provide rich information expansion? | Engaging |
| **10** | **Prize Pool Counter** | Does ₹23,75,000 count up once and display clean sequential award cards? | Premium |
| **11** | **Platform Preview** | Do role tabs transition smoothly with clear hotspots and realistic UI data? | Operational |
| **12** | **Location Section** | Is the NHCE campus map clean, stylized, and clickable? | Functional |
| **13** | **Responsive Adaptation** | Does layout adapt cleanly from 320px mobile up to 1440px desktop without horizontal scroll? | Flawless |
| **14** | **Motion Engineering** | Is motion subtle, performant, and respectful of reduced motion? | Smooth 60fps |
| **15** | **Build & Runtime Verification** | Does `npm run build` compile cleanly without TypeScript or Vite errors? | Zero Errors |

---

## 2. Iterative Design Critique Protocol

1. Run frontend server / build verification.
2. Render page at realistic desktop (1280px) and mobile (375px) viewports.
3. Compare visual result against the 15-point critique checklist.
4. Refine typography, spacing, colors, or structural alignment.
5. Re-render and verify until human senior designer standards are achieved.
