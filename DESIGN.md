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
| `text-xs` | 12 | Meta, eyebrow, code chip, table-header label (minimum legible size) |

**Treatments.**

- Serif (Cormorant) for **structural headings** (H1–H3), product names, hero ledes, pull-quotes. H4 and below are **sans (DM Sans)**.
- Tracking is **tight on display** (`-0.02em`) and **wide on eyebrows / labels** (`+0.14em`). This contrast is the system's signature.
- Eyebrow = `text-xs font-medium uppercase tracking-[0.14em] text-ink-mute` (utility class `.t-eyebrow`). Place it 6 px above an H1 with `forest-700` colour for editorial emphasis.

**Minimum font size: 12 px (`text-xs`).** Anything smaller (10.5 px, 11 px, 11.5 px tokens) is banned — even for "eyebrow" stress. Use letter-spacing for typographic emphasis instead of shrinking.

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
`font-mono text-xs px-1.5 py-[3px] rounded-sm bg-bone-200 text-ink-soft`. Variant `--dep` swaps to `bg-forest-100 text-forest-800`.

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

## 9 · Accessibility

**Target: WCAG 2.1 AA + 2.2 AA.** Every new screen and component must meet the rules below. Treat this section as mandatory, not aspirational.

### 9.1 · Semantic HTML first, ARIA second

Use the native element for the job before reaching for `role=`/`aria-`. The decision tree:

- Navigation that changes URL → `<a>` / `<Link>` (react-router-dom). **Never** a `<button>` that calls `history.push`. Right-click, `Cmd+click`, "open in new tab" must work.
- Action that mutates state → `<button type='button'>`. Inside `<form>` → `<button type='submit'>`.
- Group of selectable items → `<ul role='list'><li>` (the list role survives Bootstrap reset).
- Section with a heading → `<section aria-labelledby='…-heading'>`.
- Time stamp → `<time dateTime='YYYY-MM-DD'>`.
- Progress → `<progress>` or `role='progressbar'` with `aria-valuenow/min/max`.

ARIA is for the residual cases where no element fits. Wrong ARIA is worse than no ARIA.

### 9.2 · Required structure per screen

Every top-level screen must include:

```jsx
<main id='main-content' tabIndex='-1' className='focus:outline-none'>
  <nav aria-label='Breadcrumb'>
    <ol>…<li aria-current='page'>{leaf}</li></ol>
  </nav>
  <h1>{screen title}</h1>
  <section aria-labelledby='…-heading'>
    <h2 id='…-heading' className='sr-only'>{section name}</h2>
    …
  </section>
</main>
```

- Exactly **one `<h1>`** per screen.
- Heading levels do not skip (`h1 → h2 → h3`). Use `sr-only` h2/h3 to label sections that have no visible heading.
- Skip-link target (`<main id='main-content' tabIndex='-1'>`) is present on every screen. The `<a href='#main-content'>Skip to main content</a>` lives in `Header.jsx` — don't duplicate it.
- Breadcrumb is `<nav aria-label='Breadcrumb'><ol>` (not `<div>` + spans). Last crumb gets `aria-current='page'`.

### 9.3 · Interactive controls

| Rule | Why |
|---|---|
| Every button/link has an **accessible name** — visible text **or** `aria-label`. Never both with conflicting content. | WCAG 4.1.2 |
| Icon-only control → `<Button aria-label='…'>` (icon is `aria-hidden`). | WCAG 4.1.2 |
| Toggle button (filter, pin, etc.) → `aria-pressed={active}`. | WCAG 4.1.2 |
| Switch → `<Toggle aria-label={…}>` with `role='switch'` (already set by component). | WCAG 4.1.2 |
| Disclosure / dropdown trigger → `aria-haspopup`, `aria-expanded`, `aria-controls={panelId}`. Panel has `id={panelId}`. `Escape` closes the panel and returns focus to the trigger. | WAI-ARIA APG |
| Expand/collapse row → trigger has `aria-expanded` + `aria-controls`; expanded panel has `id`, `role='region'`, `aria-labelledby={titleId}`. | WCAG 1.3.1 |
| Active nav link → `aria-current='page'`. | WCAG 2.4.8 |
| No `<div role='button'>` wrapping other interactive elements. **Buttons cannot nest buttons / inputs / links.** Split the affordance into siblings instead. | ARIA spec |
| Minimum **touch target 24 × 24 px** (WCAG 2.2 AA, criterion 2.5.8). Pad the hit area on the element itself, not via `margin`. | WCAG 2.5.8 |
| **Visible focus** on every interactive element: `focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2`. Don't strip the outline without a replacement. | WCAG 2.4.7 |
| `disabled` attribute styles via `disabled:bg-bone-200 disabled:text-ink-soft disabled:border-line-soft`. **Never** `disabled:opacity-50` — it tanks contrast. | WCAG 1.4.11 |

### 9.4 · Forms

- Every input has a **label**. Either the `<TextInput label='…' hideLabel?>` component (which generates `<label for>`), or a `<label htmlFor={id}>` wrapper. `placeholder` is **not** a label.
- Required indicator: visible asterisk **plus** `aria-label='required'` on the asterisk OR `aria-required='true'` on the input.
- Error messages: render inside a `<div role='alert'>` next to the input; reference via `aria-describedby={errorId}`; set `aria-invalid='true'` on the input.
- Validation hints: `aria-describedby={hintId}`.
- Submit button must be reachable via Tab and submit on `Enter`.

### 9.5 · Icons

- All SVG icons in `components/Icons.jsx` default to `aria-hidden='true' focusable='false'`. Don't override unless the icon is the **only** carrier of meaning (then add `aria-label` on the icon and `role='img'`).
- Decorative dots, divider lines, separator dots — `aria-hidden='true'`.

### 9.6 · Live regions & status

| Situation | Markup |
|---|---|
| Error message (critical) | `<div role='alert'>…</div>` or `<Message variant='danger'>` (auto-sets `role='alert'`) |
| Empty state / success / informational update | `<div role='status'>…</div>` or `<Message variant='success'/'info'>` (auto-sets `role='status'`) |
| Counter / footer that changes on filter / search | `<p role='status' aria-live='polite' aria-atomic='true'>` |
| Async loading region | `aria-busy={loading}` on the container |
| Loader spinner | `<Loader />` (already has `role='status'` + `sr-only` text) |

Don't overuse `aria-live='assertive'`. Reserve for actual errors or interruptions.

### 9.7 · Motion

- All transitions use the three durations / two eases declared in §6. No bouncy springs.
- Global `prefers-reduced-motion: reduce` rule in `tailwind.input.css` collapses everything to `0.01ms`. **Don't override it** in component CSS. If a transition is essential to communicate state, use a non-motion fallback (colour shift, opacity step).

### 9.8 · Colour & contrast

- Body text on `bone-100` / `bone-50` ≥ **4.5 : 1** (`ink`, `ink-soft`). `ink-mute` is for ≥ 18 px text or non-essential meta.
- UI components (borders, icons, indicators) ≥ **3 : 1**.
- Status meaning is never colour-only — pair colour with a text label or icon (status pills already do: dot + word).
- Disabled state is exempt from text-contrast (WCAG 1.4.3 note) but **must still look disabled** — use the disabled palette from §9.3.

### 9.9 · Anti-patterns (forbidden)

- `<div role='button' onClick onKeyDown>` wrapping interactive children.
- `<button>` that calls `history.push` for navigation (use `<Link>`).
- `placeholder` as the only label.
- Custom focus styles that lower the outline contrast below 3 : 1.
- `disabled:opacity-50` (kills contrast).
- Font sizes below 12 px (`text-xs`).
- Touch targets below 24 × 24 px.
- Removing the `aria-hidden` default from icons "to give the screen reader more context" — fix the parent control's name instead.
- Toast / modal / dropdown without `Escape` handler.
- `aria-live='assertive'` for non-critical updates.

### 9.10 · Before-merge checklist

For any PR that touches a screen or component, verify:

- [ ] Keyboard-only walkthrough: Tab through every interactive control. Focus is visible at every step. No keyboard traps. `Escape` closes any opened popover/menu/modal.
- [ ] Screen-reader pass with VoiceOver (`Cmd+F5` on macOS): every control announces its name, role, and state. No mystery "button", "edit", "image" with empty names.
- [ ] All form inputs have labels. Errors are announced.
- [ ] All interactive elements ≥ 24 × 24 px hit area.
- [ ] No new font sizes below 12 px.
- [ ] No new icon usages without `aria-hidden` or a meaningful `aria-label`.
- [ ] No `role='button'` on non-`<button>` elements unless impossible to use a real button.
- [ ] Run `npm run tailwind:build` if `tailwind.input.css` was touched.

Reference implementation: `screens/FeatureListScreen.jsx` + `components/Header.jsx` + `components/Form.jsx` were rebuilt to these rules — use them as the model when writing a new screen.

---
