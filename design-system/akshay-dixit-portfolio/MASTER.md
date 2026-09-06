# Akshay Dixit Portfolio — Design System (MASTER)

Source of truth: [`assets/css/main.css`](../../assets/css/main.css). This document explains
the tokens; the CSS is authoritative if the two ever disagree.

Style: **Minimalism & Swiss Style**, applied to a dark industrial / field-engineering
identity ("FIELD-GRADE"). Zero external fonts, zero CDNs, zero JS frameworks — everything is
CSP `'self'`-safe by construction.

## How this was derived

Generated via `ui-ux-pro-max` (`"engineering portfolio minimal dark content-first"
--design-system --variance 3 --motion 3 --density 5`), then corrected against this project's
actual constraints. Two of the tool's raw outputs were **rejected**, not applied:

- Palette (`#FAFAFA` background, `#2563EB` accent) — light-only, and would have discarded the
  amber/cyan field identity. Replaced with a two-theme palette derived from the existing dark
  tokens, contrast-verified against WCAG 2.2 AA for every text/UI pairing.
- Typography (Archivo / Space Grotesk via Google Fonts) — blocked by `font-src 'self'` and
  contrary to the site's deliberate zero-dependency system-font stack.

Style selection (Minimalism & Swiss), the pattern (Hero → Value → Features → CTA → Footer),
and the Subtle scroll-reveal motion spec were adopted as-is.

## Themes

Two themes, switched via `[data-theme]` on `<html>`, set pre-paint by `assets/js/theme.js`
(default: OS preference via `prefers-color-scheme`, overridable and remembered via
`localStorage`). Dark is the default identity; light is a derived, equally-verified theme —
not an afterthought.

**Fill vs. Ink split** is the mechanism that keeps the brand identical across themes:
- `--sig-fill` / `--sig2-fill` + `--on-sig` — the amber/cyan used as a solid **background**
  (buttons, badges). Same hex in both themes; only ever paired with `--on-sig` text, so
  contrast never needs to change.
- `--sig-ink` / `--sig2-ink` / `--sig3-ink` / `--danger-ink` — the same hues used as
  **foreground text on the canvas**. These *do* change per theme (darkened in light mode)
  because text-on-canvas contrast is a different, stricter check than fill-with-paired-label.

| Token | Dark | Light | Verified |
|---|---|---|---|
| `--bg` / `--bg-1` / `--bg-2` / `--bg-3` | `#06080b … #131923` | `#fbfaf8 … #e8e7e2` (warm off-white) | surface ramp |
| `--ink` | `#e8edf4` | `#14171c` | 17.0 / 14.5:1 vs worst surface |
| `--ink-2` | `#a3b0c2` | `#454f5c` | 8.0+ :1 |
| `--ink-3` | `#7b8998` | `#5c6774` | 4.5+ :1 vs worst surface (`--bg-3`) |
| `--ink-4` | `#768390` | `#5f6976` | 4.5+ :1 (footer/dim text) |
| `--sig-ink` (amber text) | `#ffb347` | `#985900` | 4.5+ :1 |
| `--sig2-ink` (cyan text) | `#4dd8c0` | `#197465` | 4.5+ :1 |
| `--sig3-ink` (blue text) | `#7c9cff` | `#1d54ff` | 4.5+ :1 |
| `--danger-ink` | `#ff6b6b` | `#d20000` | 4.5+ :1 |
| `--sig-mid` (gradient-text midpoint) | `#ffd08a` | `#a76400` | 4.5+ :1 — a literal copy of the fill's hue is **not** safe here; it must clear text contrast independently |
| `--line-int` (interactive borders, `.btn`/`.nav__cta`/`.nav__burger`) | `#586678` | `#7f858c` | 3.0+ :1 (WCAG 1.4.11) |
| `--line` (decorative dividers/card edges) | `#1c2430` | `#e0ded8` | not held to 3:1 — decorative, not a control boundary |
| `--focus` | `var(--sig2-ink)` | `var(--sig2-ink)` | ring color, both themes |

Contrast is checked against **`--bg-3`**, the lightest (light theme) / darkest (dark theme)
surface any given ink token actually sits on — not against the page canvas, which
understates the real risk on raised cards and tiles.

**Diagrams are a deliberate exception.** `.blueprint` (the architecture-diagram frame used in
all four case studies) and its `.d-*` SVG tokens are **fixed dark in both themes** — a
"technical panel reads like terminal output" choice, the same pattern as code blocks staying
dark on light-mode documentation sites. This avoids re-deriving contrast for hand-positioned
SVG coordinates on every diagram, and gives the diagrams a consistent, recognizable frame
regardless of site theme.

## Scales

All four were extracted from values already in use, not invented — this is a *rename and
constrain*, not a redesign.

- **Type** (`--fs-1..9`, 12–46px) — collapses 23 ad-hoc sizes. Nothing renders below 12px
  (WCAG minimum-size guidance); five components that did (`.eyebrow`, `.case-meta dt`,
  `.callout__t`, table headers, `.foot__col h5`) were raised to `--fs-1`.
- **Spacing** (`--sp-1..11`, 4–104px) — density: standard (mid dial).
- **Radius** (`--r-1..3`, `--r`, `--r-lg`, `--r-pill`) — collapses 9 loose values.
- **Motion** (`--dur-1..3`, 150/250/350ms) + `--ease` — collapses 7 loose durations. Theme
  transitions use `--dur-2`; both respect `prefers-reduced-motion` via the existing global
  reset.

## Accessibility fixes bundled with the theme layer

Building the light theme meant tokenizing every color anyway, so these verified WCAG 2.2 AA
failures were fixed in the same pass rather than carried into a second theme:

- `:focus-visible` added to nine interactive selectors that had none (`.nav__links a`,
  `.nav__cta`, `.nav__burger`, `.theme-toggle`, `.case-card`, `.tile--link`, `.foot__col a`,
  `.proj__link`, `.crumb a`, `.storelinks a`) — previously only `.btn`/`.skip` had a ring.
  2.4.7.
- `scroll-padding-top: 74px` on `<html>` — the 62px sticky nav could otherwise cover a
  focused in-page anchor. 2.4.11.
- `.nav__burger` 38×34 → 44×44; `.crumb a` given hit-area padding. 2.5.8.
- Persistent underline on `.proj__link` and inline `.prose a` links — color was the only
  affordance before. 1.4.1.
- Comparison-table verdict labels (`.v-win`/`.v-mid`/`.v-low`) were raw hex text colors,
  invisible in light mode at ~1.8:1 — converted to the themed ink tokens.

## Retrieval

For any new page or component in this project: read this file first. There is currently no
per-page override in `pages/` — if one is added later, it takes precedence over this file for
that page only.
