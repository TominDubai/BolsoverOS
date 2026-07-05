---
name: BolsoverOS
description: A personal construction-business operating system — deep-space dark UI with a neon-punch accent
colors:
  deep-space: "#1a1a2e"
  deep-space-mid: "#16213e"
  deep-space-deep: "#0f3460"
  neon-punch: "#e94560"
  neon-punch-bright: "#ff6b81"
  ink-bright: "#eeeeee"
  ink-soft: "#aaaabb"
  ink-faint: "#666677"
  window-surface: "#1e1e2e"
  window-header: "#2a2a3e"
  window-border: "#333350"
  success-green: "#22c55e"
  warning-amber: "#f59e0b"
  danger-red: "#ef4444"
  info-blue: "#3b82f6"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.5px"
rounded:
  sm: "6px"
  md: "10px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.neon-punch}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.neon-punch-bright}"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    height: "28px"
    padding: "0 12px"
  button-ghost-hover:
    backgroundColor: "rgba(255, 255, 255, 0.12)"
    textColor: "{colors.ink-bright}"
  button-outline-accent:
    backgroundColor: "rgba(233, 69, 96, 0.15)"
    textColor: "{colors.neon-punch}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 14px"
  button-outline-accent-hover:
    backgroundColor: "{colors.neon-punch}"
    textColor: "#ffffff"
  input:
    backgroundColor: "rgba(0, 0, 0, 0.3)"
    textColor: "{colors.ink-bright}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 10px"
  chip-filter:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.ink-soft}"
    rounded: "12px"
    padding: "4px 10px"
  chip-filter-active:
    backgroundColor: "{colors.neon-punch}"
    textColor: "#ffffff"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "rgba(233, 69, 96, 0.15)"
    textColor: "{colors.neon-punch}"
  card:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: BolsoverOS

## 1. Overview

**Creative North Star: "The Personal OS"**

BolsoverOS is one person's operating system for running a construction contracting business — and it looks like it. The desktop-OS metaphor is the identity: a fixed sidebar dock of apps, window-chrome headers, a viewport that never scrolls as a page (only panels scroll internally). Everything renders on a Deep Space navy field, and one color — Neon Punch coral — does all the talking: it marks the active app, the primary action, and nothing else. The result should feel like a contemporary product someone chose to craft for themselves, not software a business was forced to buy.

The system explicitly rejects boring enterprise software (gray form walls, cramped bureaucratic tables) and the generic SaaS admin template (identical stat-card grids, purple gradients, dashboard clichés). It is fun and design-driven in the Notion/Craft sense — personality lives in tactile details and glanceable state, never in decoration that slows work down. Density is earned: tables and schedules run tight; everything else breathes.

**Key Characteristics:**
- Full-viewport app shell; panels scroll, the page never does
- Flat surfaces stacked by tonal layering (2–6% white tints), not shadows
- One accent (Neon Punch) reserved for action and selection
- Bright pastel data chips as the deliberate spark of color on the dark field
- One type family at a tight scale; uppercase micro-labels structure every panel

## 2. Colors

A committed dark field with a single hot accent and a disciplined semantic vocabulary.

### Primary
- **Neon Punch** (#e94560): The voice of the interface. Primary buttons, active nav item, focused input borders, clickable references, the logo. At 8–15% opacity it becomes the selection tint (active nav background, clickable-row hover). Brightens to **Neon Punch Bright** (#ff6b81) on hover.

### Neutral
- **Deep Space** (#1a1a2e): The body background — the space every panel floats in.
- **Window Surface** (#1e1e2e): Sidebar and window-body surface, one tonal step up.
- **Window Header** (#2a2a3e): Toolbars, table headers, form headers/footers — the chrome layer.
- **Window Border** (#333350): The 1px seam between every structural region.
- **Ink Bright** (#eeeeee): Primary text — headings, values, anything the eye must land on.
- **Ink Soft** (#aaaabb): Secondary text — table cells, nav labels, supporting copy.
- **Ink Faint** (#666677): Tertiary only — micro-labels, timestamps, placeholders. ~3.4:1 against Deep Space, below AA for body text; never use it for text the user must read to act.

### Tertiary
- **Semantic states**: Success (#22c55e), Warning (#f59e0b), Danger (#ef4444), Info (#3b82f6). Used at full strength for text/icons and at 8–15% opacity for their background tints. Project-hub cards each own one of these as a `--hub-accent`.
- **Pastel data chips**: Status and trade badges use light pastel backgrounds with dark saturated text (e.g. #dcfce7/#166534 for accepted, #dbeafe/#1e40af for enquiry). They are intentionally the brightest things on screen — pipeline state should be readable across the room.

### Named Rules
**The One Voice Rule.** Neon Punch is the only brand accent and appears on well under 10% of any screen. If two unrelated things on one panel are coral, one of them is wrong.

**The Chips-Are-Data Rule.** Bright pastel chips are reserved for data classification (status, trade). Never use the pastel treatment for buttons, headers, or decoration — their rarity is what makes state legible at a glance.

## 3. Typography

**Display Font:** System sans (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
**Body Font:** Same family — one voice throughout
**Label/Mono Font:** "SF Mono", "Cascadia Code", "Fira Code" for tabular/code contexts

**Character:** Native, quick, and invisible — the OS metaphor extends to the type. Hierarchy is built from weight and micro-scale steps, not font changes.

### Hierarchy
- **Display** (700, 28px, 1.2): Stat-card values only — the numbers Tom scans first.
- **Headline** (600, 16–18px, 1.3): Window/detail/form titles, the sidebar wordmark.
- **Title** (600, 13–14px, 1.4): Section headings inside panels and cards.
- **Body** (400–500, 12–13px, 1.5): Table cells, form values, nav items, general copy.
- **Label** (500, 10–11px, 0.5px tracking, UPPERCASE): Table column headers, field labels, section micro-headers — the connective tissue of every panel.

### Named Rules
**The One Family Rule.** No display fonts, no webfonts, no pairing. The system stack at five weights is the entire typographic palette.

**The Uppercase-Is-Structure Rule.** Uppercase tracked micro-labels mark structure (columns, field names, section headers) — never emphasis. Emphasis is weight (600–700) in Ink Bright.

## 4. Elevation

Flat by doctrine. Depth is communicated tonally: each structural layer is a slightly lighter tint of the one beneath it (Deep Space → 2% white panel → 3–4% white card → 6% white hover). Borders (1px Window Border or 4–6% white) do the separating; light does the lifting. Real shadows exist only where something truly floats above the workspace.

### Shadow Vocabulary
- **Floating window** (`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)`): Modals, floating windows, the login card — true overlays only.
- **Raised control** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`): Popovers, dropdown menus.

### Named Rules
**The Tonal Ladder Rule.** To raise a surface, add 2–3% white tint — never a shadow. Hover states climb exactly one rung (e.g. 3% → 6%). Shadows are reserved for elements that overlap other content.

## 5. Components

Tactile and confident: compact controls with instant (150ms) feedback and unmistakable hover states — nothing bounces, nothing lingers.

### Buttons
- **Shape:** Gently rounded (6px), compact heights (28–32px)
- **Primary (Save/Send):** Solid Neon Punch, white 600-weight text, 0 20px padding; hover brightens to Neon Punch Bright
- **Accent outline (Import/New):** 15% Neon Punch tint with coral text and 1px coral border; hover fills solid — a satisfying "charge up" for secondary-but-branded actions
- **Ghost (Edit/Back):** 6% white tint, Ink Soft text; hover doubles the tint and brightens text
- **Disabled:** 60% opacity, not-allowed cursor
- **Focus:** Must gain a visible ring (2px Neon Punch outline, 2px offset) — currently missing; add wherever touched

### Chips
- **Status/trade badges:** Pill (10px radius), 2px 8px padding, 10–11px 500-weight; pastel background + dark saturated text per the Chips-Are-Data Rule
- **Filter chips:** 12px radius, 6% white tint, Ink Soft text; selected = solid Neon Punch with white text

### Cards / Containers
- **Corner Style:** 10px radius
- **Background:** 2–3% white tint over Deep Space
- **Shadow Strategy:** None — tonal layering plus a 1px 6% white border (see Elevation)
- **Hover (interactive cards):** Climb to 6% tint; clickable client cards also take a Neon Punch border
- **Internal Padding:** 16px

### Inputs / Fields
- **Style:** Inset look — 30% black fill, 1px Window Border, 6px radius, 36px height (32px in toolbars)
- **Focus:** Border snaps to Neon Punch (150ms)
- **Labels:** 12px 500-weight Ink Faint above the field, 4px gap
- **Error:** Coral-red text on 10% red tint, rounded 6px

### Navigation
- **Sidebar dock (240px):** App icons + 13px labels; default Ink Soft on transparent; hover 6% white tint + Ink Bright; active 15% Neon Punch tint + coral text — the strongest selection signal in the app
- **Table headers:** Sticky, Window Header background, uppercase Label type in Ink Faint

### Tables (signature component)
The workhorse of every app: 13px body on generous 10px 12px cell padding, hairline 4% white row separators, sticky uppercase header, 3% white row hover. Clickable rows hover coral (8% Neon Punch) with coral 500-weight reference links. Money and totals right-align in a 2px Window Border-topped footer row.

## 6. Do's and Don'ts

### Do:
- **Do** keep Neon Punch scarce — primary action, active selection, focus, and clickable references only (The One Voice Rule).
- **Do** climb the tonal ladder for depth: +2–3% white tint per layer, borders for seams, shadows only for true overlays.
- **Do** give every interactive element all its states: default, hover, focus-visible, active, disabled, loading, error — and use skeleton rows, not centered spinners, for loading tables.
- **Do** write empty states that teach ("No RFQs yet — accept a quote to generate one"), never a bare "nothing here".
- **Do** keep uppercase 0.5px-tracked micro-labels as the structural grammar of panels.
- **Do** respect `prefers-reduced-motion` on every transition and keep motion 150–250ms, ease-out, state-driven.

### Don't:
- **Don't** drift toward "boring enterprise software" — gray form walls, cramped bureaucratic tables (PRODUCT.md anti-reference).
- **Don't** build the "generic SaaS admin template" — identical stat-card grids, purple gradients, stock dashboard clichés (PRODUCT.md anti-reference).
- **Don't** let fun tip into toy-like: no bounce easing, no confetti, no mascots — this runs real money.
- **Don't** use Ink Faint (#666677) for any text the user must read to act; it fails AA body contrast on Deep Space. Promote to Ink Soft.
- **Don't** add new colored side-stripes: `border-left: 3px` accents (currently on hub cards) are a legacy deviation — migrate to full 1px borders + background tints when those cards are next touched.
- **Don't** spread glassmorphism: the login card's blur is the app's single glass moment; workspace surfaces stay opaque.
- **Don't** use pastel chip styling on anything that isn't a data classification.
- **Don't** introduce webfonts, display faces, or a second family — The One Family Rule.
