---
target: dashboard
total_score: 18
p0_count: 2
p1_count: 2
timestamp: 2026-07-05T12-34-30Z
slug: js-apps-dashboard-js
---
# Design Critique: BolsoverOS Dashboard

Method: dual-agent (A: design-review agent · B: detector agent). Browser overlay evidence skipped — auth-gated surface, no credentials; source-based review.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Text-string loader; failed queries silently render AED 0 as real (`res.data || []`, dashboard.js:51–56) |
| 2 | Match System / Real World | 2 | "Monthly Revenue" = all invoices incl. cancelled by created_at; `Invoice #<UUID>` exposes DB ids |
| 3 | User Control and Freedom | 2 | Dead end — zero click handlers, no refresh, no drill-through |
| 4 | Consistency and Standards | 2 | Emoji vs SVG icons; #28c840 vs system #22c55e; coral link styling on non-links |
| 5 | Error Prevention | 2 | Silent-failure zeros are a decision hazard on money figures |
| 6 | Recognition Rather Than Recall | 3 | Labeled chips good; deadline invoices omit client/project |
| 7 | Flexibility and Efficiency | 1 | Zero keyboard shortcuts anywhere; user-select:none blocks copying amounts |
| 8 | Aesthetic and Minimalist Design | 2 | 11 undifferentiated blocks; banned stat-grid; rainbow funnel |
| 9 | Error Recovery | 1 | One failed query kills all 7 widgets, raw err.message, no retry (Promise.all) |
| 10 | Help and Documentation | 1 | No tooltips; ambiguous money definitions unexplained |
| **Total** | | **18/40** | **Poor — dragged by interactivity/recovery, not visual craft** |

## Anti-Patterns Verdict

Template-stock by over-familiarity: the exact "generic SaaS admin template" PRODUCT.md rejects — banned hero-metric stat grid ×4, seven same-chrome panels in uniform 1fr/1fr, activity feed at bottom. Personal-OS identity invisible. Funnel rainbow (incl. purple) breaks the One Voice Rule and encodes nothing.

Detector: 35 findings, all style.css; JS/HTML markup clean (exit 0). Agrees: side-tab .hub-card 3px stripe (style.css:1576, legacy-flagged; renders in Projects app); off-system green #28c840 (:872–873). Caught extra: radius drift 3/4/8/12/20px at ten locations; undocumented #ff6b6b, #eab308, #60a5fa. False positives discounted: progress-fill width transitions (2), shadow alpha blacks (8), macOS traffic-light logout colors, 2 login-screen findings out of scope.

## What's Working

1. "Needs Attention" is the correct primitive — quantified, money-attached rollups; best copy in the app.
2. Chart discipline — destroyCharts lifecycle, dark-tuned grids, K/M ticks, coral-on-navy.
3. Domain-native formatting — AED short-form, en-GB dates, relative dates, 24-status chip vocabulary.

## Priority Issues

- **[P0] Dashboard is 100% inert.** No click handlers; hover states + .ref-link styling imply clickability (false affordance). Fix: wire rows via sessionStorage + Router.navigate pattern (attention → filtered invoices; project → detail; deadline → invoice/task). Command: /impeccable harden.
- **[P0] Money can silently be wrong.** Failed queries → zeros rendered as real; "Monthly Revenue" includes cancelled invoices by created_at (dashboard.js:237–240); payments fetched and discarded (dashboard.js:48). Fix: Promise.allSettled + per-widget errors; exclude cancelled; relabel "Invoiced" or compute from payments. Command: /impeccable harden.
- **[P1] Stat row is the banned template and cries wolf.** Amber fires whenever any invoice unpaid (dashboard.js:134) = permanent alarm; "Completed / All time" vanity card. Fix: asymmetric state-of-the-business strip; amber only when overdue > 0. Command: /impeccable layout or /impeccable shape.
- **[P1] Accessibility floor.** #667 (~3.4:1) on .stat-label, .dash-table th (10px), chart ticks (Chart.defaults.color='#667'); canvases lack aria-label/fallback; zero :focus-visible and zero prefers-reduced-motion in 1,928 lines; user-select:none. Fix: promote to #aab, chart aria-labels, global 2px coral focus ring, reduced-motion block, allow selection. Command: /impeccable audit.
- **[P2] All-or-nothing loading/failure.** Text loader instead of mandated skeletons; no retry. Fix: allSettled + per-section skeletons + per-widget retry. Command: /impeccable harden.

## Persona Red Flags

Alex (power user / Tom): zero keydown listeners in codebase; no Cmd+1–9, no palette, no refresh key; overdue-invoice action costs 3+ interactions; cannot copy amounts (user-select:none, style.css:36).

Sam (accessibility): no focusable elements on dashboard; sidebar buttons lack focus indicator; six AA contrast failures (#667 on navy); Chart.js canvases are screen-reader black holes; emoji icons announced verbosely, no aria-hidden.

## Minor Observations

- Chart.defaults mutated globally each load (dashboard.js:33–38).
- Dead fetch: paymentsRes unused.
- schedule_tasks unbounded; projects select('*').
- Unescaped innerHTML interpolation (notes/task/client names) — XSS surface.
- Total-outstanding attention item suppressed exactly when overdue exists (dashboard.js:95).
- Radius drift at ten locations; #ff6b6b/#eab308/#60a5fa undocumented.
- ⏸️ "blocked" reads less severe than 🔴 "behind".
- No @media queries; repeat(4,1fr) crushes at narrow widths.

## Questions to Consider

1. Is the dashboard answering "how is the business?" or "what do I do next?" A ranked clickable action queue with charts demoted might beat all seven widgets.
2. The dashboard is the *desktop* of the OS metaphor — vital-signs status bar, notification center, Cmd+K launcher?
3. What's new since yesterday? Diff-first ("since you last looked: …") would make 250 morning opens deliver news, not a re-read.
