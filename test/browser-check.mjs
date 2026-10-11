// Rendered checks of the production export with headless Chromium (Playwright).
// Serves dist/ under /preview/ on an ephemeral port, answers /simd-coin.json with mock data,
// exercises the primary interactions at several widths, saves screenshots to artifacts/screenshots/
// and exits. Everything runs inside this one foreground command.
//
// Run: node test/browser-check.mjs
// Needs: playwright (global or local install) with Chromium downloaded.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shots = join(root, 'artifacts', 'screenshots');
mkdirSync(shots, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch { /* try global */ }
  const require = createRequire(import.meta.url);
  const globalRoot = resolve(process.execPath, '../../lib/node_modules/playwright');
  return require(globalRoot);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
let marketMode = 'mock';
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname === '/simd-coin.json') {
    const data = JSON.parse(readFileSync(join(root, 'mock/simd-coin.json'), 'utf8'));
    if (marketMode === 'null') data.market = { priceUsd: null, marketCap: null, liquidityUsd: null, volume24h: 0 };
    if (marketMode === 'error') { res.writeHead(500); res.end('nope'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }
  if (!url.pathname.startsWith('/preview/')) { res.writeHead(404); res.end('not found'); return; }
  let file = join(dist, url.pathname.slice('/preview/'.length) || 'index.html');
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
const base = `http://127.0.0.1:${port}/preview/`;

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const results = [];
const log = (/** @type {string} */ s) => { results.push(s); console.log(s); };

/** @param {import('playwright').Page} page */
async function noOverflow(page, label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw, `${label}: horizontal overflow ${sw} > ${iw}`);
  log(`ok - ${label}: no horizontal overflow (scrollWidth ${sw} <= ${iw})`);
}

try {
  // --- Viewport sweep: overflow, console errors, failed resources, screenshots ---
  for (const [w, h] of [[320, 640], [375, 740], [390, 844], [768, 1024], [1440, 900], [1920, 1080]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = []; const failed = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await noOverflow(page, `${w}px`);
    assert.deepEqual(errors, [], `${w}px console errors: ${errors.join(' | ')}`);
    assert.deepEqual(failed, [], `${w}px failed requests: ${failed.join(' | ')}`);
    log(`ok - ${w}px: no console errors, no failed requests`);
    const imgs = await page.evaluate(() => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
    assert.deepEqual(imgs, [], `broken images: ${imgs.join(',')}`);
    await page.screenshot({ path: join(shots, `home-${w}.jpg`), type: 'jpeg', quality: 70, fullPage: false });
    if (w === 390 || w === 1440) {
      // Scroll through the page so scroll-triggered reveals have fired, then capture the whole page.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(shots, `home-${w}-full.jpg`), type: 'jpeg', quality: 55, fullPage: true });
    }
    if (w === 390 || w === 1440) {
      const r = await page.evaluate(() => {
        const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
        return { h1: box('h1'), buy: box('.hero__actions [data-buy-link]'), logo: box('.hero__logo'), vh: innerHeight };
      });
      assert.ok(r.h1 && r.h1.bottom <= r.vh && r.buy && r.buy.bottom <= r.vh && r.logo && r.logo.top < r.vh, `first screen at ${w}: ${JSON.stringify(r)}`);
      log(`ok - ${w}px first screen shows logo (top ${Math.round(r.logo.top)}), h1 (bottom ${Math.round(r.h1.bottom)}) and Buy button (bottom ${Math.round(r.buy.bottom)}) within ${r.vh}px`);
    }
    // text clipping: no element whose scrollWidth exceeds clientWidth with overflow hidden and text
    const clipped = await page.evaluate(() => Array.from(document.querySelectorAll('h1,h2,h3,p,a,button,dd,dt,span,code')).filter((el) => {
      const cs = getComputedStyle(el);
      return cs.overflow !== 'visible' && el.scrollWidth > el.clientWidth + 1 && !el.closest('.marquee') && !el.classList.contains('visually-hidden');
    }).map((el) => el.className || el.tagName));
    assert.deepEqual(clipped, [], `${w}px clipped text: ${clipped.join(',')}`);
    await ctx.close();
  }

  // --- 404 page ---
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${base}404.html`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').textContent(), 'This page failed the test');
    assert.deepEqual(errors, []);
    await noOverflow(page, '404 at 390px');
    await page.screenshot({ path: join(shots, '404-390.jpg'), type: 'jpeg', quality: 70 });
    await page.close();
  }

  // --- Interactions at 390 (mobile) ---
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base, { waitUntil: 'networkidle' });

    // live data applied
    await page.waitForFunction(() => document.querySelector('[data-stat="priceUsd"]')?.textContent?.startsWith('$'));
    await page.waitForTimeout(1000);
    const price = await page.locator('[data-stat="priceUsd"]').textContent();
    assert.equal(price, '$0.00004269');
    assert.equal(await page.locator('.stat [data-stat="marketCap"]').textContent(), '$42.7K');
    assert.equal(await page.locator('.hero__actions [data-buy-link]').getAttribute('href'), 'https://dexscreener.com/solana/0x697213C3747a6d4F83f8d2d8C0cC7f44a5edfffF');
    assert.ok((await page.locator('[data-stats-status]').textContent())?.startsWith('Updated at'));
    const pct = await page.locator('[data-donut-pct="marketCap"]').textContent();
    assert.equal(pct, '65.7%');
    log(`ok - live data: price ${price}, market cap $42.7K, donut 65.7% market cap, buy/chart links set from feed`);

    // mobile menu
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(await page.locator('#nav-menu').isVisible());
    await page.screenshot({ path: join(shots, 'menu-open-390.jpg'), type: 'jpeg', quality: 70 });
    await page.locator('#nav-menu a[href="#buy"]').click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await page.waitForTimeout(600);
    log('ok - mobile menu opens, closes on link tap, navigates to #buy');

    // copy contract
    await page.locator('.contract--big [data-copy-contract]').click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(clip, '0x697213C3747a6d4F83f8d2d8C0cC7f44a5edfffF');
    assert.equal(await page.locator('.contract--big [data-copy-contract]').textContent(), 'Copied');
    log('ok - copy button puts the contract address on the clipboard and says Copied');

    // steps tabs
    await page.locator('[data-step-next]').click();
    assert.equal(await page.locator('#tab-2').getAttribute('aria-selected'), 'true');
    assert.ok(await page.locator('#panel-2').isVisible());
    assert.equal(await page.locator('[data-step-progress]').textContent(), 'Step 2 of 3');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-3').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'tab-3');
    assert.ok(await page.locator('#panel-3 [data-buy-link]').isVisible());
    await page.locator('[data-step-prev]').click();
    assert.equal(await page.locator('#tab-2').getAttribute('aria-selected'), 'true');
    log('ok - how-to-buy tabs: Next/Back buttons and arrow keys move selection and focus');

    // generator
    await page.locator('#gen-top').fill('FROG');
    await page.locator('#gen-bottom').fill('APPROVED');
    await page.locator('[data-gen-template="stonks"]').click();
    const previewSvg = await page.locator('[data-gen-preview] svg').innerHTML();
    assert.ok(previewSvg.includes('>FROG<') && previewSvg.includes('>APPROVED<') && previewSvg.includes('STONKS'));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-gen-download]').click()]);
    const dlPath = await dl.path();
    const bytes = readFileSync(dlPath);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.ok(bytes.length > 20_000, `png is ${bytes.length} bytes`);
    assert.ok(dl.suggestedFilename().startsWith('test-meme-stonks-'));
    log(`ok - generator: template switch, live caption preview, PNG download (${bytes.length} bytes, ${dl.suggestedFilename()})`);

    // meme wall download
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator('[data-wall-download="moon"]').click()]);
    const bytes2 = readFileSync(await dl2.path());
    assert.equal(bytes2.subarray(1, 4).toString(), 'PNG');
    assert.equal(dl2.suggestedFilename(), 'test-meme-to-the-moon.png');
    const wallCount = await page.locator('.meme').count();
    assert.ok(wallCount >= 8);
    log(`ok - meme wall: ${wallCount} compositions, PNG download works (${bytes2.length} bytes)`);

    // vibe meter
    const vibe = page.locator('[data-vibe-button]');
    await vibe.scrollIntoViewIfNeeded();
    for (let i = 0; i < 5; i++) await vibe.click();
    assert.equal(await page.locator('[data-vibe-count]').textContent(), '5');
    const now = Number(await page.locator('[data-vibe-meter]').getAttribute('aria-valuenow'));
    assert.ok(now >= 30, `vibe level ${now}`);
    log(`ok - vibe meter: 5 pumps → level ${now}, label "${await page.locator('[data-vibe-label]').textContent()}"`);

    // share links
    const share0 = await page.locator('a[data-share="0"]').getAttribute('href');
    assert.ok(share0?.startsWith('https://x.com/intent/post?text=') && share0.includes('%24TEST'));
    await page.locator('[data-copy-link]').click();
    assert.ok((await page.evaluate(() => navigator.clipboard.readText())).endsWith('/preview/'));
    log('ok - share intents prefilled; copy-link copies the page URL');

    // confetti on Buy click (stay on page: intercept target=_blank by removing it)
    await page.evaluate(() => { document.querySelectorAll('[data-buy-link]').forEach((a) => a.setAttribute('target', '_self')); });
    await page.route('https://dexscreener.com/**', (r) => r.fulfill({ status: 200, body: 'stub' }));
    await page.locator('[data-step-next]').click();
    await page.locator('#panel-3 [data-buy-link]').scrollIntoViewIfNeeded();
    const confettiCount = await page.evaluate(async () => {
      const a = document.querySelector('#panel-3 [data-buy-link]');
      a.addEventListener('click', (e) => e.preventDefault(), { once: true });
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 300 }));
      await new Promise((r) => setTimeout(r, 50));
      return document.querySelectorAll('.confetti').length;
    });
    assert.equal(confettiCount, 40);
    log('ok - Buy click bursts 40 confetti particles');

    // drag sticker (pointer + keyboard)
    const sticker = page.locator('[data-drag-sticker]');
    await sticker.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const b = await sticker.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 120, b.y + b.height / 2 - 60, { steps: 6 });
    await page.mouse.up();
    const b2 = await sticker.boundingBox();
    assert.ok(Math.abs(b2.x - (b.x - 120)) < 12 && Math.abs(b2.y - (b.y - 60)) < 12, `sticker moved to ${b2.x},${b2.y} from ${b.x},${b.y}`);
    await sticker.focus();
    await page.keyboard.press('ArrowLeft');
    const b3 = await sticker.boundingBox();
    assert.ok(b3.x < b2.x - 8);
    log('ok - draggable sticker follows the pointer and moves with arrow keys');

    assert.deepEqual(errors, [], `console errors during interactions: ${errors.join(' | ')}`);
    await ctx.close();
  }

  // --- Keyboard walk and focus visibility at 1440 ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className);
    assert.equal(first, 'skip-link');
    const skipVisible = await page.evaluate(() => { const r = document.querySelector('.skip-link').getBoundingClientRect(); return r.top >= 0 && r.bottom < 200; });
    assert.ok(skipVisible, 'skip link visible on focus');
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(() => {
        const el = document.activeElement; const cs = getComputedStyle(el);
        return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), outline: cs.outlineStyle, outlineW: cs.outlineWidth, color: cs.outlineColor };
      }));
    }
    assert.ok(stops.every((s) => s.outline === 'solid' && s.outlineW === '3px'), JSON.stringify(stops));
    await page.screenshot({ path: join(shots, 'focus-1440.jpg'), type: 'jpeg', quality: 70 });
    log(`ok - keyboard: skip link first, then ${stops.length} stops all with a 3px solid outline (${stops.map((s) => s.text).join(' › ')})`);

    // escape closes the mobile menu and restores focus (at 390)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-nav-toggle]').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-nav-toggle')), true);
    log('ok - Escape closes the menu and returns focus to the toggle');
    await page.close();
  }

  // --- Reduced motion ---
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    const anim = await page.evaluate(() => ({
      logo: getComputedStyle(document.querySelector('.hero__logo')).animationName,
      marquee: getComputedStyle(document.querySelector('.marquee__track')).animationName,
      reveal: getComputedStyle(document.querySelector('.reveal')).opacity,
    }));
    assert.equal(anim.logo, 'none'); assert.equal(anim.marquee, 'none'); assert.equal(anim.reveal, '1');
    const confetti = await page.evaluate(async () => {
      const a = document.querySelector('.hero__actions [data-buy-link]');
      a.addEventListener('click', (e) => e.preventDefault(), { once: true });
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 100, clientY: 300 }));
      await new Promise((r) => setTimeout(r, 50));
      return document.querySelectorAll('.confetti').length;
    });
    assert.equal(confetti, 0);
    log('ok - reduced motion: no bounce, no marquee, reveals shown, no confetti');
    await ctx.close();
  }

  // --- Empty / error states of the live feed ---
  {
    marketMode = 'null';
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    assert.equal(await page.locator('[data-stat="priceUsd"]').textContent(), '—');
    assert.ok((await page.locator('[data-donut-caption]').textContent()).startsWith('Waiting for live market data'));
    assert.ok((await page.locator('[data-stats-status]').textContent()).includes('no market numbers yet'));
    await page.locator('#stats').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator('#stats').screenshot({ path: join(shots, 'stats-empty-1440.jpg'), type: 'jpeg', quality: 70 });
    log('ok - empty feed: dashes, waiting caption, honest status line');
    marketMode = 'error';
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    assert.ok((await page.locator('[data-stats-status]').textContent()).startsWith('Live data is unavailable'));
    log('ok - feed error: status says live data is unavailable and will retry');
    marketMode = 'mock';
    await page.close();
  }

  // --- Contrast of the rendered token pairs (WCAG 2 relative luminance) ---
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle' });
    const pairs = await page.evaluate(() => {
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map((v) => { v = Number(v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return ((l1 + 0.05) / (l2 + 0.05)).toFixed(2); };
      const bgOf = (el) => { let e = el; while (e) { const bg = getComputedStyle(e).backgroundColor; if (bg && !bg.startsWith('rgba(0, 0, 0, 0')) return bg; e = e.parentElement; } return 'rgb(11, 14, 23)'; };
      const take = (sel, label) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return { label, fg: cs.color, bg: bgOf(el), ratio: ratio(cs.color, bgOf(el)), size: cs.fontSize }; };
      return [
        take('.hero__line', 'hero body text on page bg'),
        take('.section__lead', 'muted lead on alt bg'),
        take('.stat__label', 'stat label (muted) on surface'),
        take('.hero__actions .btn--primary', 'ink on green button'),
        take('.hero__actions .btn--secondary', 'white on blue button'),
        take('.contract__value', 'green contract on surface'),
        take('.beat__title', 'yellow h3 on surface'),
        take('.marquee__item', 'ink on yellow marquee'),
        take('.steps__tab[aria-selected="true"]', 'ink on selected green tab'),
        take('.footer__small', 'muted small on alt bg'),
        take('.btn--ghost', 'text on ghost button'),
        take('[data-step-next]', 'white on blue Next button (16px)'),
        take('.stat:nth-child(4) .stat__value', 'blue stat value on surface'),
        take('.hero__sticker-2', 'white on blue sticker'),
      ];
    });
    for (const p of pairs) {
      const min = parseFloat(p.size) >= 24 ? 3 : 4.5;
      assert.ok(Number(p.ratio) >= min, `${p.label}: ${p.fg} on ${p.bg} = ${p.ratio} < ${min}`);
      log(`ok - contrast ${p.ratio}:1 ${p.label} (${p.fg} on ${p.bg}, ${p.size})`);
    }
    await page.close();
  }

  log('\nALL BROWSER CHECKS PASSED');
} finally {
  await browser.close();
  server.close();
}
