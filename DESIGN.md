# TEST ($TEST) design system

Extracted from the final source: `site/css/styles.css` (tokens, components, motion), `site/index.html` and `site/404.html` (markup patterns), `site/js/memes.js` (SVG colour constants). Rendered behaviour was confirmed with the headless Chromium run recorded in `artifacts/validation.md`.

## Overview

Audience: the TEST meme-coin community, mostly on phones. The site is a single dark page with a loud three-colour palette pulled from the logo (frog green, shirt blue, a yellow contrast colour), a chunky display face for every heading and button, thick dark outlines, hard offset "sticker" shadows, halftone and grain textures, and stickers rotated a few degrees. Density is generous: every section is a stack of outlined cards with 24 px internal padding and 32 px or more between groups.

System-wide rules: tokens only (no raw colours in components), one display font for headings and buttons, one text font for copy, one mono font for numbers and the contract, the six-step type scale, the 4 px spacing scale, concentric radii, and the sticker shadow on every outlined card. One page arrangement, not a rule: the hero's two-column grid with the logo on the trailing side, and the marquee directly under it.

## Colors

Defined once in `:root` in `site/css/styles.css`. Primitives are named by hue and never used in components; components use the semantic tokens.

| Token | Value | Job |
| --- | --- | --- |
| `--color-bg` | `--navy-950` `#0b0e17` | page background |
| `--color-bg-alt` | `--navy-900` `#10152a` | alternate section background (`.section--alt`, footer) |
| `--color-surface` | `--navy-800` `#161d33` | cards, panels, ghost buttons |
| `--color-surface-2` | `--navy-700` `#1f2a4a` | tabs at rest, donut track, neutral button fill, ghost button hover |
| `--color-border` | `--navy-600` `#2c3a63` | structural borders on inputs, ghost buttons, dashed fact cards, hover fill |
| `--color-text` | `--gray-200` `#f3f5fa` | primary text |
| `--color-text-muted` | `--gray-400` `#b7c0d6` | labels, captions, leads, status lines |
| `--color-ink` | `--navy-950` | text on green and yellow fills; SVG outlines |
| `--color-outline` | `--navy-950` | 3 px outlines and the offset sticker shadow |
| `--color-green` / `-hover` / `-active` | `#7ed957` / `#5fc43b` / `#3f9a24` | primary action fill, ticker badge, selected tab, price and contract value, donut "market cap" |
| `--color-blue` / `-hover` / `-active` | `#3a52d6` / `#4f6cff` / `#2e42b0` | secondary action fill, blue sticker, donut "liquidity"; the hover value also colours the liquidity stat |
| `--color-yellow` / `-hover` | `#ffd23f` / `#f5c21b` | contrast colour: stickers, marquee, h3 headings, drag sticker, donut "24h volume", pressed state |
| `--color-focus` | `--yellow-400` | focus ring |
| `--white` | `#ffffff` | hero and section titles, text on blue |

Measured in the browser on the final export (WCAG 2 ratios): text on page background 17.67:1, muted text on alt background 10.58:1, muted labels on surface 9.16:1, ink on green 10.97:1, white on blue 6.25:1, yellow headings on surface 11.56:1, ink on yellow 13.35:1, green contract value on its translucent surface 11.95:1, blue stat value on surface 3.91:1 (52 px display text only). The blue fill was darkened from `#4f6cff` to `#3a52d6` during review so 16 px white labels pass 4.5:1.

Gradients: hero and CTA backgrounds use `radial-gradient` with `color-mix(in oklab, …)` tints of blue and green over `--color-bg`; the vibe meter fill is `linear-gradient(in oklch 90deg, blue, green, yellow)`. The SVG meme templates in `site/js/memes.js` carry the same hex values as constants because exported PNGs cannot read CSS variables.

Theme: dark only (`color-scheme: dark`). No light theme exists.

## Typography

Self-hosted latin subsets of three Google Fonts, in `site/assets/*.woff2`, declared with `@font-face` at the top of `styles.css` with `font-display: swap`. The two main faces are preloaded from `index.html`.

| Token | Family | Files | Use |
| --- | --- | --- | --- |
| `--font-display` | Luckiest Guy 400, fallback Impact, Arial Black | `luckiest-guy-latin.woff2` | h1–h3, buttons, stickers, marquee, stat values, meme text (also embedded in exported PNGs) |
| `--font-text` | Space Grotesk variable 300–700, fallback system-ui | `space-grotesk-latin-var.woff2` | body, nav, tabs, labels (weights 400 and 700 used) |
| `--font-mono` | Space Mono 400 and 700 | `space-mono-latin-400/700.woff2` | contract address, ticker badge, status lines, step counter, generator inputs |

Six-step scale: `--text-xs` 13 px (captions, labels, status), `--text-base` 16 px (body, controls, inputs), `--text-md` 20 px (leads, hero line, buttons, sticker text), `--text-lg` 28 px (h3, large buttons), `--text-xl` `clamp(2rem, 1.2rem + 3.5vw, 3.25rem)` (section h2, stat values), `--text-display` `clamp(2.75rem, 1.25rem + 6vw, 5.5rem)` (hero h1, 404 code). Headings descend h1 → h2 → h3 by scale step.

Line heights: `--leading-tight` 1.05 on headings and 1 on buttons; `--leading-body` 1.55 on text. Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. Letter-spacing: −0.01em on the hero title, +0.02em on display-font buttons and fact labels. Measure caps: hero line 44ch, leads 60ch, donut caption 36ch, footer small 60ch. Changing values (stats, percentages, counters, step progress) use `font-variant-numeric: tabular-nums`. The contract value is written as two 21-character halves around a `<wbr>` (in the markup and again by `coin.js applyIdentity`), so when one line cannot hold the 42 characters it breaks into two even lines instead of orphaning the last glyph; `overflow-wrap: anywhere` remains as the fallback below that and `user-select: all` selects the whole address. Inputs are 16 px so iOS does not zoom. Font smoothing is set once on `html`. Display-font headings and buttons carry hard text shadows (`4px 4px 0 outline, 8px 8px 0 blue` on h1; `3px 3px 0 outline, 6px 6px 0 green` on h2).

## Layout

Spacing scale (4 px base): `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 24, `-6` 32, `-7` 48, `-8` 64, `-9` 96 px. Within a group use `--space-2`/`-3`; between groups `--space-5`/`-6`; between sections `--space-8` (mobile) and `--space-9` (≥ 48rem). Buttons sit 12–16 px apart.

Container: `.container` = `min(100% − 32px, 72rem)`, widening the margins to 32 px at ≥ 48rem. Sections (`.section`) carry `scroll-margin-top: var(--nav-h)` (4 rem) for the sticky nav.

Breakpoints come from content, in rem: 36rem (stats and facts go to two columns, meme wall to two), 48rem (hero becomes a 7fr/5fr grid with the logo trailing and drops the extra bottom band, beats three columns, steps tabs three columns, donut/generator/CTA two columns, the big contract block becomes an inline label / address / button row), 64rem (nav shows its inline list and hides the toggle, meme wall three columns, facts four columns, the hero contract block becomes an inline row too; between 48rem and 64rem the hero copy column is too narrow for it and the address would split into four pieces). Stats stay a 2×2 grid at every desktop width so long prices do not wrap. Logical properties (`inset-inline`, `padding-inline`, `margin-block`) are used throughout.

Overflow: `body { overflow-x: clip }`; the hero and marquee clip their own decorations; checked with no horizontal scroll at 320–1920 px. The draggable sticker is absolutely positioned 16 px from the hero's bottom-right corner and may be dragged anywhere by the reader. Below 48rem the hero's bottom padding is `calc(var(--space-8) + 7rem)` so the sticker rests in a band of its own under the contract card and never covers the card or its Copy button.

## Elevation & Depth

Flat, outlined surfaces. Depth comes from the hard offset shadow `--shadow-sticker: 6px 6px 0 var(--color-outline)` on cards, buttons, stickers and the mobile menu, which collapses to `2px 2px 0` on press. Ghost buttons and inputs have no shadow and a `--color-border` border instead. `--shadow-card` (soft layered shadow) is defined but currently unused. Stacking: grain overlay z 50 (pointer-events none), confetti layer z 60, sticky header z 40, skip link z 100, drag sticker z 3 inside the hero. The sticky header is a translucent `color-mix` of the page background with `backdrop-filter: blur(12px)`.

## Shapes

Radii: `--radius-sm` 8 px (inputs, small buttons, nav links, ticker badge, beat art), `--radius-md` 16 px (buttons, contract block, tabs, meme art inside cards), `--radius-lg` 24 px (cards: beats, stats, steps, donut, memes, generator, CTA; large buttons), `--radius-pill` (stickers, chips, vibe meter). Concentric rule: card 24 px with 12–24 px padding wraps inner 16 px or 8 px elements. Every outlined element uses `--outline-w` 3 px solid `--color-outline`; secondary structure uses 2 px solid or dashed `--color-border`. Stickers and the step counter are rotated −8° to +8°.

## Components

- Buttons `.btn` (`styles.css`, "Buttons"): variants `--primary` (green, the one filled action per view), `--secondary` (blue), `--ghost` (surface with border, for copy/reset/back), sizes `--sm` (40 px min height, 16 px text) and `--lg` (56 px, 28 px text), `--block`. States: hover fill via `--btn-bg-hover` only under `@media (hover: hover)`, active `scale(0.96)` with the shadow collapsing, `:disabled` at 45 % opacity with `cursor: not-allowed`, no shadow, no hover fill and no wobble (Back on step 1, Next on step 3), `aria-pressed="true"` turns yellow (used after Copy), `aria-busy` while exporting PNGs. Links styled as buttons keep `<a href>`; actions are `<button type="button">`. `data-confetti` adds a burst on click; `data-magnetic` adds the pointer nudge on fine pointers.
- Stickers `.sticker` with `--blue`/`--green`: pill badges with outline and shadow, decorative (`aria-hidden`).
- Sticky nav `.site-header > .nav` (`index.html` header): brand link, `.nav__toggle` with `aria-expanded`/`aria-controls`, `.nav__menu` dropdown below 64rem that opens with `.is-open`, closes on link tap, outside click or Escape (focus returns to the toggle), inline list above 64rem. Scroll spy sets `aria-current="true"` on the link of the section in view (`site/js/fx.js initNav`).
- Contract block `.contract` with `--hero` and `--big`: label, `<code data-contract>`, copy button; copy feedback is the button label "Copied" plus a visually hidden `role="status"` line.
- Stat card `.stat` inside `<dl class="stats">`: `dt` label, `dd[data-stat][data-format]` value tweened by `coin.js tweenValue`; `.is-empty` mutes a dash.
- Steps `.steps` (`fx.js initSteps`): ARIA tabs (`role="tablist"`, roving tabindex, arrow/Home/End keys), panels with `hidden`, Back/Next buttons that disable at the ends, progress text.
- Donut `.donut`: SVG rings (`stroke-dasharray` animated 900 ms) whose arcs are proportional to market cap, liquidity and 24h volume; the legend is three plain rows (swatch, name, value) separated by 2 px `--color-border` dividers, with no fill of their own and no percentage, so the chart is not read as an allocation; the caption names the three numbers or states the waiting state.
- Meme card `.meme` and generator `.gen` (`site/js/memes.js`): 9 templates in `TEMPLATES`, each an artwork `draw()` plus a `words` field holding its own lettering in a `top` or `bottom` slot; `renderSvg()` draws a typed caption in the slot and leaves out the template word that lives there, so text never prints over text (the wall, which passes no caption, shows the template words); `renderSvg()` for the inline preview, `exportPng()` for download (inlines the logo and display font, draws through a canvas). Chips `.gen__chip` use `aria-pressed`. Fields `.field` pair a visible `<label for>` with a 16 px mono input.
- Vibe meter `.vibe`: button plus `role="meter"` bar with `aria-valuenow`/`aria-valuetext`, label text changes with the level, `.is-hot` shimmer above 60.
- Drag sticker `.drag-sticker`: `role="img"` with `tabindex="0"`, pointer capture drag, arrow keys move it 12 px (40 px with Shift), position in `--dx`/`--dy`.
- Marquee `.marquee` (decorative, `aria-hidden`, two copies of the track for a seamless loop).
- Footer `.footer`: the required attribution line and the disclaimer.
- Reveal `.reveal` (`fx.js initReveal`): `main.js` first adds a `js` class to `<html>`, and only `.js .reveal` starts hidden; IntersectionObserver adds `.is-visible`. Without scripts, without motion preference or without observer support the content is simply shown.

## Motion

All animation lives inside `@media (prefers-reduced-motion: no-preference)`: hero logo bounce (1.6 s alternate) with its ground shadow, marquee (28 s linear), sticker wiggle, 600 ms reveal translate with 100–240 ms staggers (scoped to `.js .reveal`), button/sticker hover wobble, confetti (1.1 s), vibe shimmer. Under `reduce`, scroll behaviour is instant, transitions are removed, the donut snaps, confetti and magnetic nudges are skipped in JS. Easing token `--ease-out: cubic-bezier(0.2, 0, 0, 1)`; durations `--dur-fast` 150 ms (colour/transform on controls) and `--dur-base` 300 ms. Transitions name their properties.

## Do's and Don'ts

- Start a new section with `<section class="section" aria-labelledby>` → `.container` → `.section__head` (h2 `.section__title` + `.section__lead`) → outlined cards (`border: var(--outline-w) solid var(--color-outline); border-radius: var(--radius-lg); box-shadow: var(--shadow-sticker); background: var(--color-surface)`). Alternate `.section--alt` for the background rhythm.
- One green `.btn--primary` per view; blue for the secondary action; ghost for utilities. Put the colour on the fill, never on the label.
- Use semantic colour tokens; never reach for `--green-400` or a hex in a component. If a role is missing, add a token.
- Keep headings in the display face and copy in Space Grotesk; numbers that change use the mono face or `tabular-nums`.
- Do not add a wallet connection, forms that send data, trackers, team, roadmap dates, audits or return promises; the footer line is required.
- Every number comes from `/simd-coin.json`. Do not hard-code a price or market cap.
- New motion goes inside the `no-preference` media block and gets a static cue as well.
- Recipe for another page: copy `site/404.html` (header, grain, footer already wired), link `./css/styles.css`, add sections as above, keep asset URLs relative (`./assets/...`), add the file to `rollupOptions.input` in `vite.config.ts`, rebuild.
