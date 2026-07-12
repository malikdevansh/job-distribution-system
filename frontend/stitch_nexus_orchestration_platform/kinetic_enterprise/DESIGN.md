---
name: Kinetic Enterprise
colors:
  surface: '#FFFFFF'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  surface-secondary: '#F5F7FA'
  border: '#E5E7EB'
  success: '#22C55E'
  warning: '#F59E0B'
  danger: '#EF4444'
  info: '#0EA5E9'
  text-primary: '#111827'
  text-secondary: '#6B7280'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1440px
---

## Brand & Style

This design system is engineered for high-stakes enterprise infrastructure, specifically distributed job scheduling. It adopts a **Minimalist / Corporate Modern** aesthetic that prioritizes clarity, precision, and executive-level elegance. Inspired by the utility of developer tools and the polish of premium SaaS interfaces, the style emphasizes high-density information without visual clutter.

The brand personality is authoritative yet approachable—functioning as a reliable "silent partner" in the engineering stack. The UI evokes a sense of "controlled power" through generous whitespace, razor-sharp alignment, and a restrained use of color that highlights critical status changes and actionable data. It follows a logic of functional beauty where every pixel serves a purpose in the user's workflow.

## Colors

The palette is anchored in a sophisticated range of cool grays and crisp whites to create a layered "paper-on-paper" effect. 

- **Primary Utility:** The primary blue is used strictly for main actions and indicative focus states, ensuring it doesn't overwhelm the data.
- **Semantic Logic:** Status colors (Success, Warning, Danger) are used at high-saturation for small-scale indicators (pills, dots) and as subtle, low-opacity washes for background alerts. 
- **Neutral Hierarchy:** `#FAFBFC` provides the canvas, while `#FFFFFF` is reserved for interactive cards and input surfaces to create a natural "lift" from the background.
- **Borders:** The `#E5E7EB` border color is the primary tool for structural definition, replacing heavy shadows.

## Typography

This system utilizes **Inter** for all UI elements to maintain a systematic, neutral, and highly legible appearance. 

- **Scale:** A tight typographic scale ensures that high-density data tables remain readable.
- **Contrast:** Hierarchy is established through weight shifts (Medium 500 to Semi-Bold 600) rather than drastic size changes.
- **Utility:** A specialized `label-sm` role is used for metadata and table headers, employing uppercase and increased letter spacing for a professional, "dashboard-grade" feel.
- **Monospace:** **JetBrains Mono** is introduced for job payloads, logs, and ID strings to provide the technical precision required for a developer-centric platform.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main content area is contained within a 1440px max-width wrapper, centered on the screen, while the side navigation remains fixed.

- **Grid:** A 12-column grid is used for dashboard layouts, typically splitting into 4-column widgets or 6-column split views.
- **Density:** The system uses a strict 4px baseline grid. Padding in data tables is compressed (8px-12px) to allow for more rows above the fold, while page headers and marketing-adjacent sections use more generous spacing (48px-64px).
- **Breakpoints:**
  - **Desktop (1024px+):** Full sidebar, 32px margins.
  - **Tablet (768px-1023px):** Collapsed sidebar (icons only), 24px margins.
  - **Mobile (<767px):** Single column, bottom-sheet menus, 16px margins.

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Tiers:**
  - **Level 0 (Background):** `#FAFBFC` - The lowest layer.
  - **Level 1 (Cards/Sidebar):** `#FFFFFF` - Used for the primary workspace. Defined by a 1px border of `#E5E7EB`.
  - **Level 2 (Popovers/Modals):** `#FFFFFF` with an **Ambient Shadow**. The shadow is a dual-layer: `0 4px 6px -1px rgba(0,0,0,0.05)` and `0 10px 15px -3px rgba(0,0,0,0.1)`.
- **Transitions:** Hover states on interactive cards should not lift the element via shadow; instead, the border color should darken to `#D1D5DB` or the background should shift to `#F9FAFB`.

## Shapes

The shape language is "Soft-Modern," utilizing a consistent **8px (0.5rem)** radius for standard components like buttons, input fields, and small cards. 

- **Large Containers:** Modals and main dashboard widgets use `rounded-lg` (16px) to feel more substantial.
- **Status Pills:** Use a full "Pill" radius (999px) to distinguish them from interactive buttons.
- **Consistency:** All nested elements (like inner images or child containers) must follow the parent's corner radius minus the padding to maintain geometric harmony.

## Components

- **Buttons:** Primary buttons use a solid `#2563EB` fill with white text. Secondary buttons use a white fill with a `#E5E7EB` border. Ghost buttons are reserved for tertiary actions like "Cancel."
- **Data Tables:** The core of the system. Use `label-sm` for headers with a subtle bottom border. Rows should have a subtle hover state (`#F9FAFB`). Use status pills for job states (e.g., "Running," "Failed").
- **Status Pills:** High-contrast text on a low-opacity background of the same hue (e.g., Success: `#DCFCE7` background, `#166534` text).
- **Input Fields:** 1px border (`#E5E7EB`) that transitions to the primary blue on focus with a 2px outer "halo" (10% opacity blue).
- **Job Timeline/Gantt:** Horizontal bars using semantic colors, with thin vertical markers for "current time" and "trigger points."
- **Code Blocks:** Dark themed (`#0B0C0E`) or very light gray (`#F5F7FA`) with `code-sm` typography and a "copy" button in the top right.