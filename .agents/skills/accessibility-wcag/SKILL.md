---
name: accessibility-wcag
description: >-
  Accessibility (WCAG 2.1 AA) guidelines, keyboard focus, screen reader landmarks, and contrast standards.
  Use this skill to audit web components for visible focus rings, aria labels, semantic HTML elements, screen reader support, and color contrast compliance.
---

# Accessibility (WCAG 2.1 AA) Guidelines

## 1. Semantic HTML Structure

- Use proper landmark tags: `<nav>`, `<main>`, `<section>`, `<footer>`.
- Maintain logical heading hierarchy (`<h1>` once per page, followed by `<h2>`, `<h3>`).
- Use `<button type="button">` for interactive triggers instead of plain `<div>` or `<span>`.

---

## 2. Keyboard & Focus Management

- Ensure all interactive elements have visible focus indicators (`focus-visible:ring-2 focus-visible:ring-[#00C8FF] focus-visible:outline-none`).
- Mobile menu drawer must support `Esc` key closing and aria expanded attributes (`aria-expanded={isOpen}`).

---

## 3. Contrast & Screen Readers

- Minimum contrast ratio 4.5:1 for body text, 3:1 for large display titles.
- Alt text on all brand images and institutional logos (`alt="New Horizon College of Engineering"`).
- Provide text alternatives for visual indicators.
