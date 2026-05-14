# ProShop — Design Spec

A single-document reference for the redesigned ProShop frontend. Read this top-to-bottom once before you start coding; after that, jump to whichever section you need.

The system pairs **ProShop's existing IA** (the same routes, the same data, the same admin labels) with **The Sill's editorial aesthetic** (cream surfaces, forest-green ink, generous serif headlines, hairline rules, restrained colour). The result is a small, considered electronics shop that doesn't feel like Bootstrap.

> **Sources of truth**
> - Source repo: <https://github.com/MaximMatsuk/proshop_mern> (branch `master`)
> - Aesthetic reference: <https://www.thesill.com/>
> - First redesigned surface: `ui_kits/proshop/FeatureListScreen.html`

---

## 1 · Identity

**Tagline (working):** *Considered things, well kept.*

**Voice.** Confident, plain, lightly technical. Sentences are short. No marketing buzzwords ("revolutionize," "next-gen," "AI-powered" — all banned). No exclamation marks. Em-dashes over semicolons.

**Pronouns.** The shop talks to **you** ("Your cart is quiet"). The brand talks about **we** sparingly ("We'll never share it"). Never first-person singular.

**Casing.** Sentence case for headings, buttons, nav, table headers. *Feature flags*, not *Feature Flags*. UPPERCASE only as a typographic device — eyebrow labels, table headers, status pills — never as English casing.

**Glyphs.** Em-dash `—`, middle-dot `·`, real ellipsis `…`, curly quotes. **No emoji.** No unicode-as-icon. Straight quotes only inside `<code>`.

**Example before / after (Feature flags page):**

| Original | Redesign |
|---|---|
| `# Feature Flags` + refresh button | *Internal · Release management* / **Feature flags** / "Toggle, roll out, and roll back experiments across the shop. Changes propagate within a minute; dependent flags follow their parent." |
| Bootstrap `Badge variant="warning"` → "Testing" | Muted caution pill with a dot: ● *Testing* (`bg-caution-100 text-caution-700`) |
| `<i class="fas fa-sync">` | Inline Lucide-style SVG, stroke 1.5, currentColor |

---

## 2 · Logo

A thin-stroke **microchip die** — eight pins, a centered contact dot — paired with the Cormorant wordmark. This is the brand mark; do not swap.

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
  <rect x="6" y="6" width="12" height="12" rx="1.5"/>
  <path d="M9 3 V6 M15 3 V6 M9 18 V21 M15 18 V21 M3 9 H6 M3 15 H6 M18 9 H21 M18 15 H21"/>
  <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
</svg>
```

- Mark colour: `forest-700` on cream, `bone-50` on forest.
- Stroke `1.4` at 24 px; drop to `1.2` for the standalone mark at 56+ px.
- Wordmark: **Cormorant Garamond 500**, tracking `-0.01em`, gap `12px` from the mark.
- Alternates: a power-glyph (receipts, packing slips) and a `</>` code-tag (developer-facing surfaces). Never invent new alternates.

---

## 3 · Colour

All colours live as CSS custom properties — see *§ 9 Implementation*.

### Bone (the canvas)
Warm, paper-like; never `#FFFFFF`.

| Token | Hex | Use |
|---|---|---|
| `bone-50` | `#FBF8F2` | Modals, sheets, table wrapper, cart drawer |
| `bone-100` | `#F6F1E7` | **Default page background** |
| `bone-200` | `#EDE5D4` | Hover wash, table header strip, sunken |
| `bone-300` | `#DCD0B8` | Heavier dividers, decorative |

### Forest (the brand)

| Token | Hex | Use |
|---|---|---|
| `forest-900` | `#0E2A21` | — (reserved) |
| `forest-800` | `#143A2C` | Heading ink, primary-button hover, dark surface |
| `forest-700` | `#1F5240` | **Primary brand**, links, primary button, active state |
| `forest-600` | `#2E6B55` | Secondary brand emphasis |
| `forest-500` | `#5A8A77` | Decorative (progress fills, illustration) |
| `forest-300` | `#A9C2B5` | Soft accent |
| `forest-100` | `#DCE7E0` | Brand-tint badge, hover wash on cream |

### Clay (single warm accent — used sparingly)

| Token | Hex | Use |
|---|---|---|
| `clay-700` | `#B5613D` | Destructive link text ("Remove") |
| `clay-500` | `#C97B5B` | Star ratings, sale tags |
| `clay-200` | `#EFD3C2` | — |
| `clay-100` | `#F7E6D9` | — |

> At most **one** clay element per screen. The clay is jewellery, not paint.

### Ink (neutrals on cream)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#1A1F1B` | Body |
| `ink-soft` | `#4A524C` | Secondary copy, captions |
| `ink-mute` | `#7B847E` | Metadata, breadcrumbs, eyebrow labels |
| `ink-faint` | `#B0B6AF` | Placeholders, disabled |
| `line` | `#D9CFC2` | Default hairline |
| `line-soft` | `#E7DECC` | Lighter hairline |

### Semantic — desaturated

Each pair is `bg-{tone}-100` + `text-{tone}-700`. Solid `{tone}-500` is only used inside small dots and progress fills.

| Tone | 100 (bg) | 500 | 700 (fg) | Status word |
|---|---|---|---|---|
| Positive | `#DCEBDF` | `#3F8C5C` | `#2C6B45` | Enabled · Delivered · Live |
| Caution | `#F3E3C0` | `#C28A2C` | `#8A5A14` | Testing · Pending · Holding |
| Critical | `#F2D9D9` | `#B14242` | `#8A2A2A` | Disabled · Failed · Out of stock |
| Info | `#DDE6F1` | `#4E78A8` | `#2A4F7A` | In review · Draft |

---

## 4 · Type

**Stack.**
- Display — **Cormorant Garamond** 500
- Body — **DM Sans** 400 / 500
- Mono — **JetBrains Mono** 400 / 500

Loaded from Google Fonts (OFL — production-safe). The trio is the brand pair; do not swap.

**Scale.**

| Token | px | Where |
|---|---|---|
| `text-5xl` | 84 | Hero on home (`Considered things…`) |
| `text-4xl` | 60 | H1 — *Feature flags* |
| `text-3xl` | 44 | H2 |
| `text-2xl` | 32 | H3 — section heads |
| `text-xl` | 24 | Pull-quote, product name |
| `text-lg` | 20 | H4 (sans, for density) |
| `text-md` | 17 | Body-lg (hero lede) |
| `text-base` | 15 | **Body default** |
| `text-sm` | 13 | Small / secondary |
| `text-xs` | 12 | Meta |
| — | 11 | Eyebrow / table-header label |

**Treatments.**

- Serif (Cormorant) for **structural headings** (H1–H3), product names, hero ledes, pull-quotes. H4 and below are **sans (DM Sans)**.
- Tracking is **tight on display** (`-0.02em`) and **wide on eyebrows / labels** (`+0.14em`). This contrast is the system's signature.
- Eyebrow = `text-xs font-medium uppercase tracking-[0.14em] text-ink-mute`. Place it 6 px above an H1 with `forest-700` colour for editorial emphasis.

**Numerics.** Always `font-feature-settings: 'tnum'` on numeric columns and prices.

---

## 5 · Spacing & layout

- **4-px base**, 9 stops: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96` → `space-1`…`space-9`.
- Inline default gap: `space-4` (16).
- Component padding: `space-5` (24) on at least one axis.
- Section gutter: `space-6` (32). Between large sections: `space-9` (96).
- Page container: **max-width `1240px`**, centered, **`space-6` (32) horizontal padding**.
- Header is **sticky** at top, height `76px`, with a hairline `line-soft` divider.
- Prefer **flex/grid + gap** over margin spacing. Sibling components never accumulate vertical margins.

---

## 6 · Shape, shadow, motion

### Radii

| Token | px | Use |
|---|---|---|
| `radius-sm` | 2 | Hairline boxes, code chips |
| `radius-md` | 4 | Inputs, cards |
| `radius-lg` | 8 | Surfaces, photography tiles, hero card |
| `radius-pill` | 999 | Buttons, chips, inputs, toggles |

Never use 16+ px radius on solid blocks — it reads "consumer SaaS."

### Shadows
All shadows are **cool forest-tinted** (`rgba(20, 58, 44, …)`), never plain grey. The base page has no shadow.

```css
--shadow-1: 0 1px 0 rgba(20, 58, 44, 0.04);            /* hairline lift */
--shadow-2: 0 8px 24px -12px rgba(20, 58, 44, 0.18),
            0 2px 6px -2px rgba(20, 58, 44, 0.06);       /* menu, popover */
--shadow-3: 0 24px 56px -20px rgba(20, 58, 44, 0.22),
            0 4px 12px -4px rgba(20, 58, 44, 0.08);      /* modal */
```

### Borders
Always **1 px**, hairline, in `line` or `line-soft`. Never thicker. Forest borders only on focus/active inputs.

### Motion
Two eases. Three durations. Nothing else.

```css
--ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);  /* snappy reveals */
--ease-in:  cubic-bezier(0.6, 0, 0.8, 0.2);  /* subtle exits */
--dur-fast: 140ms;  /* hover colours */
--dur-base: 220ms;  /* drawers, modals */
--dur-slow: 360ms;  /* image scale on hover */
```

No bounces. No springs. A leaf doesn't bounce; neither does a chip.

### States
- **Hover** buttons → background shifts one step (`forest-700` → `forest-800`; ghost → `bone-200`). Never alter scale or shadow on hover.
- **Hover** table rows → background lifts to `bone-100` (one step lighter than the wrap surface).
- **Hover** nav links → colour to `forest-700`. No underline (underline reserved for inline links inside copy).
- **Press / active** → `translateY(1px)`. No colour change. No scale.
- **Focus** → 2-px `forest-500` outline at 2-px offset.

### Transparency & blur
Only used in two places:
1. Cart-drawer scrim: `rgba(20, 58, 44, 0.22)`.
2. Hero photo caption: `rgba(251, 248, 242, 0.92)` with `backdrop-filter: blur(6px)`.

Nowhere else.

---

## 7 · Components

### Button
Pill, 1-px hairline, four weights.

| Variant | Background | Foreground | Border | Hover |
|---|---|---|---|---|
| `primary` | `forest-700` | `bone-50` | same | bg → `forest-800` |
| `secondary` | transparent | `forest-800` | `forest-800` | bg → `forest-100` |
| `ghost` | transparent | `ink` | `line` | bg → `bone-200` |
| `danger` | transparent | `critical-700` | `critical-500` | bg → `critical-100` |

Sizes: `sm` 32 px / `md` 40 px / `lg` 48 px. Padding scales 14 / 18 / 26.

### Badge / status pill
`px-2.5 py-0.5 rounded-full text-xs font-medium leading-none`. 6-px coloured dot before the text. Six tones: neutral, positive, caution, critical, info, brand.

### Code chip
`font-mono text-[11.5px] px-1.5 py-[3px] rounded-sm bg-bone-200 text-ink-soft`. Variant `--dep` swaps to `bg-forest-100 text-forest-800`.

### Segment tag
Hairline pill: `border border-line rounded-full px-2 py-[3px] text-xs text-ink-soft`. Always transparent background.

### Input
Pill, 40 px tall. `bg-bone-50 border border-line px-4 rounded-full`. Focus border → `forest-700`. Eyebrow label above.

### Toggle
34 × 20 px track, 16 × 16 px thumb. Off: `bone-300`. On: `forest-700`. Animates `220ms ease-out`.

### Table
Wrap = `bone-50` surface with 1-px `line-soft` border, 8-px radius.
- Header row: `bg-bone-100`, padding `14 16`, type = `eyebrow` (11 px uppercase tracking-wider `ink-mute`).
- Body rows: `padding 18 16`, vertical-align top, hairline bottom border.
- Row hover: `bg-bone-100`.
- First column: extra `padding-left 24`.
- Numeric cells: `tnum` always.

### Header (nav)
Sticky, 76 px tall, `bone-100` with hairline bottom. Grid `auto 1fr auto`: wordmark, search (pill `420 px max`), nav links. Cart count is a 18 × 18 forest pill with bone text.

### Cart drawer
420-px wide, slides in from right over a forest-tinted scrim. Inner gap `14 px`. Footer pinned with subtotal + primary CTA.

### Empty state
Centered. Pull-quote (`text-2xl serif italic forest-800`) over a `text-sm ink-soft` line. No illustration.

### Hero (product / home)
Two-column grid `1fr 1fr`, gap `space-7`. Photography is a 4:5 rounded-lg tile. Caption strip is the only place glass is allowed.

---

## 8 · Iconography

The original repo uses **Font Awesome**. This system substitutes **inline SVG in the Lucide style**: stroke `1.4–1.6`, `viewBox="0 0 24 24"`, single colour (inherits `currentColor`).

Inventory: `search`, `cart`, `user`, `refresh`, `check`, `x`, `chevron`, `dots`, `filter`, `external`, `plus`, `heart`, `star`. New icons stay in this style — same stroke, same viewBox, no fills (except the contact dot in the logo and the star fill at value ≥ threshold).

**Unicode glyphs allowed as type, not as icons:** `·` (middle dot) for breadcrumbs and metadata separators.

**No emoji anywhere.**

---

## 9 · Implementation

This system is published two ways:

1. **HTML + vanilla CSS** (the live one in this repo) — `colors_and_type.css` + `ui_kits/proshop/proshop.css`.
2. **React + Tailwind** — see `migration/` for a drop-in port: a `tailwind.config.js` that maps every token, a `globals.css` with the CSS-variable layer + font import, and converted components.

Use whichever fits your codebase. Both produce identical output.

For the existing CRA-based `proshop_mern` repo, the Tailwind port (`migration/`) is the path of least resistance — see `migration/README.md` for a step-by-step.

---

## 10 · Open questions for the brand owner

1. **Photography.** Six demo product images came with the repo seed. Real product photography in the same light-cream-background style will tighten the home page meaningfully.
2. **Clay accent.** Currently used for ratings + "Remove" links only. If you want a stronger warm direction (sale tags everywhere, terracotta CTAs), say so — it's a one-line palette swap.
3. **Density.** The current admin table runs at `18 × 16` row padding. Some teams prefer denser tables (`10 × 12`). I can ship a `compact` variant if useful.
