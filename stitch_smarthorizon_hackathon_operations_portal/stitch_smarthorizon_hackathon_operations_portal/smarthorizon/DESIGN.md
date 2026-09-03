---
name: SmartHorizon
colors:
  surface: '#f8f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#4f5f7b'
  on-secondary: '#ffffff'
  secondary-container: '#cdddff'
  on-secondary-container: '#51617e'
  tertiary: '#7b2600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a33500'
  on-tertiary-container: '#ffc6b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b7c7e8'
  on-secondary-fixed: '#091c35'
  on-secondary-fixed-variant: '#374763'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#812800'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  code:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 16px
  margin-desktop: 32px
  margin-mobile: 16px
---

## Brand & Style

The design system is engineered for high-stakes productivity and large-scale event coordination. It draws inspiration from industry-leading developer tools to provide a "utility-first" aesthetic that feels professional, calm, and exceptionally fast. The system prioritizes information density and functional clarity over decorative trends.

The visual style is a blend of **Corporate Modern** and **Systematic Minimalism**. It utilizes a structured grid, clear visual boundaries, and a restrained color palette to reduce cognitive load during complex hackathon management tasks. The interface should feel like a reliable instrument—precise, responsive, and authoritative.

## Colors

The color palette is anchored in high-contrast neutrals to ensure maximum legibility for data-heavy views. 

- **Primary:** A focused Deep Blue (#0052CC) used exclusively for primary actions, active states, and critical wayfinding.
- **Surface Strategy:** The system uses a tiered gray approach. The base background is pure white (#FFFFFF), while sidebars, headers, and secondary containers use #F6F8FA and #EBEDF0 to create subtle structural separation.
- **Functional Colors:** Success, Warning, and Error colors are desaturated to remain professional while providing clear status signals for project submissions and registration states.

## Typography

This design system utilizes **Inter** as a singular typeface to maintain a systematic and utilitarian feel. The hierarchy is tight, with small increments between levels to accommodate dense dashboards.

- **Headlines:** Use semi-bold weights with slight negative letter-spacing for a modern, "Linear-like" appearance.
- **Body:** The default body size is 14px (body-md) to allow for more content on screen. 13px (body-sm) is reserved for secondary metadata and table content.
- **Hierarchy:** Use color (text-secondary) rather than size to differentiate between primary content and supporting labels.

## Layout & Spacing

The layout follows a strict 8pt grid system. 

- **Desktop First:** The layout utilizes a fixed-width sidebar (256px) with a fluid content area. For extremely wide screens, content is capped at 1440px.
- **Density:** Padding within components is kept tight (8px or 12px) to support data-heavy tables and lists.
- **Navigation:** Use collapsible navigation groups in the sidebar to maximize vertical space. Headers should remain sticky during scroll to keep breadcrumbs and primary actions accessible.

## Elevation & Depth

Depth is used sparingly and functionally. 

- **Tonal Layers:** Elevation is primarily communicated through surface color changes (e.g., a gray sidebar against a white content area).
- **Shadows:** Use soft, multi-layered shadows for floating elements like drawers, modals, and dropdown menus. Avoid shadows on flat page cards; use subtle 1px borders (#D0D7DE) instead.
- **Interactive Depth:** Buttons use a very subtle inner shadow on "press" to provide tactile feedback without looking skeuomorphic.

## Shapes

The shape language is approachable yet professional.

- **Components:** Standard components like buttons and input fields use an 8px (rounded) radius.
- **Containers:** Larger containers, such as dashboard cards and side drawers, use a 12px or 16px radius (`rounded-lg` or `rounded-xl`) to soften the density of the information.
- **Interactive States:** Focus rings should follow the shape of the component with a 2px offset.

## Components

- **Buttons:** Primary buttons use a solid #0052CC background with white text. Secondary buttons use a white background with a subtle border. Tertiary buttons are ghost-style (text only) for low-priority actions.
- **Data Tables:** Tables must feature sticky headers with a subtle bottom border. Row hover states should use #F6F8FA. Cell padding should be 8px vertically for high density.
- **Side Drawers:** Used for project details or user profiles. They should slide from the right, overlaying content with a dim 20% opacity backdrop.
- **Filter Chips:** Small, 12px rounded components with a light gray background (#EBEDF0). Active states use a light blue tint.
- **Status Badges:** Use "Dot + Label" patterns. A small colored circle next to text (e.g., Green dot for "Approved") provides a clean, professional look.
- **Input Fields:** Use 1px borders with a default height of 36px. On focus, the border color changes to primary blue with a soft glow.