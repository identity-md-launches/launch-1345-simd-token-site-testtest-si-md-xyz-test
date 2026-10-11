# TEST ($TEST) website

The community website of TEST ($TEST), published at https://testtest.si-md.xyz. Built by the Identity.md swarm on si-md.xyz. Not financial advice.

- Source: `site/` (plain HTML, CSS and ES modules, no framework). `site/index.html` runs as-is from any static server.
- Production export: `dist/` (committed; the publisher serves it without rebuilding). Vite copies the source, bundles the modules into one file and keeps every asset URL relative (`./assets/...`), so the export works at a gateway subpath or an ENS name.
- Design system: `DESIGN.md`. Validation record: `artifacts/validation.md`.

## Install

```sh
npm install
```

Node 20 or newer. Dependencies are Vite, TypeScript and `@types/node` only (dev). The site itself has no runtime dependencies.

## Preview

```sh
npm run dev        # dev server with hot reload at http://localhost:5173/
npm run preview    # serves the built dist/ at http://localhost:4173/
```

Both servers answer `/simd-coin.json` with `mock/simd-coin.json`, which mirrors the shape the host returns in production (`{name, symbol, token, chain, chainName, logo, x, telegram, chartUrl, buyUrl, market: {...}}`). Edit the mock to try other values; set `market` fields to `null` to see the empty state. The mock is never copied into `dist/`.

## Rebuild

```sh
npm run typecheck   # tsc --noEmit over site/js (JSDoc-typed, checkJs) and the config/test files
npm run build       # vite build → dist/
npm run check       # typecheck + build + node test/check-interactions.mjs
```

Rebuild after any change under `site/` and commit `dist/` together with the source.

## Validate

```sh
node test/check-interactions.mjs   # static checks of dist/ and unit checks of the formatting/SVG logic
node test/browser-check.mjs        # headless Chromium: viewports, interactions, downloads, keyboard, contrast
```

The browser check needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`, or a global install). It starts a throwaway server inside the same process, serves `dist/` under `/preview/`, answers `/simd-coin.json` with the mock, and writes screenshots to `artifacts/screenshots/`.

Results of the last run on the final export (2026-10-11, second revision after review):

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no errors |
| `npm run build` | exit 0, `dist/` 200 KB, 11 files |
| `node test/check-interactions.mjs` | 14 checks passed |
| `node test/browser-check.mjs` | 55 checks passed, `ALL BROWSER CHECKS PASSED` |

What the browser run covered: 320, 375, 390, 768, 1440 and 1920 px with no horizontal overflow, no console errors, no failed requests, no broken images and no clipped text; first screen at 390 and 1440 shows the logo, headline and Buy button; mobile menu open/close/Escape with focus return; contract copy to the clipboard; how-to-buy tabs with Next/Back and arrow keys; meme generator preview and PNG download; meme wall PNG download; vibe meter; share intents and copy link; confetti on Buy; draggable sticker by pointer and keyboard; keyboard walk with a visible 3 px focus ring on 14 stops; reduced-motion mode; live-feed empty, zero-volume and error states; 14 rendered contrast pairs (lowest 3.91:1 on 52 px display text, every pair under 24 px at 6.25:1 or better); the regressions from the review: generator captions replace the template word on all 9 templates with no overlapping text, disabled Back/Next look disabled, at 360/390/414 on a 2x screen the drag sticker stays clear of the contract card and its Copy button and the address breaks into two even halves at most, and with scripts disabled every section is visible; from the second review: the Follow on X and Join the Telegram links are not drawn before the feed answers, nor with a feed whose `x` and `telegram` are null (what the host returns for this label today), at 1440 and 390, X shows only with its URL, and no visible link has `href="#"`. Findings, fixes and limitations are listed in `artifacts/validation.md`.

## Publish

Hosting is handled by the network: the committed `dist/` is pinned and named after the job completes. Do not run a publish command from this repository. If you host it yourself, upload the contents of `dist/` to any static host and serve `/simd-coin.json` on the same origin; `dist/404.html` is the not-found page.

## Live data contract

`site/js/coin.js` fetches `/simd-coin.json` (falling back to `./simd-coin.json`) on load and every 30 seconds. It writes name, ticker, chain name, native coin, contract address, Buy and Chart links, the optional X and Telegram links, the four stats (animated between values), and the tokenomics donut, which draws market cap, liquidity and 24h volume as arcs proportional to their sum (no percentage is printed). Missing numbers render as a dash; a reported zero renders as "$0" and counts as a number for the status line, which says "no market numbers yet" only when every value is missing. The contract address is written as two text nodes around a `<wbr>` at its midpoint so a narrow line breaks evenly; `textContent` and the copy button carry the full 42 characters.

## Layout of the repository

```
site/            source (index.html, 404.html, css/styles.css, js/*.js, assets/)
dist/            production export (committed)
mock/            simd-coin.json used by dev/preview/test servers only
test/            check-interactions.mjs, browser-check.mjs (test/scratch is throwaway)
artifacts/       validation.md (committed); the browser run writes screenshots/ here (not committed)
DESIGN.md        design system documentation
vite.config.ts   root=site, base=./, stable asset names, mock JSON middleware
```
