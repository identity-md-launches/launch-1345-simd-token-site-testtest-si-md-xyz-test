// Node-side checks for the exported site and the pure logic behind its interactions.
// Run: node test/check-interactions.mjs   (after `npm run build`)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
let passed = 0;
/** @param {string} name @param {() => void | Promise<void>} fn */
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// Minimal browser globals so the modules can be imported in Node.
globalThis.window = /** @type {any} */ ({ matchMedia: () => ({ matches: false }) });

const { formatNumber, nativeCoin } = await import('../site/js/coin.js');
const { TEMPLATES, renderSvg, esc } = await import('../site/js/memes.js');

await check('dist/index.html and dist/404.html exist', () => {
  assert.ok(existsSync(join(dist, 'index.html')));
  assert.ok(existsSync(join(dist, '404.html')));
});

const html = readFileSync(join(dist, 'index.html'), 'utf8');

await check('head meta: title, favicon, description, canonical, og and twitter tags', () => {
  for (const needle of [
    '<title>', 'rel="icon"', 'name="description"', 'rel="canonical"',
    'property="og:title"', 'property="og:description"', 'property="og:image"',
    'name="twitter:card" content="summary_large_image"', 'name="twitter:image"',
  ]) assert.ok(html.includes(needle), `missing ${needle}`);
});

await check('all local asset URLs are relative and resolve inside dist/', () => {
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  const local = refs.filter((r) => !/^(https?:|#|mailto:)/.test(r));
  assert.ok(local.length > 0);
  for (const r of local) {
    assert.ok(r.startsWith('./'), `not relative: ${r}`);
    assert.ok(existsSync(join(dist, r)), `missing asset: ${r}`);
  }
  const css = readFileSync(join(dist, 'assets/styles.css'), 'utf8');
  for (const m of css.matchAll(/url\((['"]?)(\.\/[^)'"]+)\1\)/g)) assert.ok(existsSync(join(dist, 'assets', m[2])), `missing css asset ${m[2]}`);
});

await check('required copy: footer line, contract, no wallet/tracker scripts', () => {
  assert.ok(html.includes('Website built by the'));
  assert.ok(html.includes('Identity.md swarm on si-md.xyz'));
  assert.ok(html.includes('not financial advice'));
  assert.equal((html.match(/0x697213C3747a6d4F83f8d2d8C0cC7f44a5edfffF/g) || []).length >= 2, true);
  assert.ok(!/gtag|googletagmanager|analytics|wagmi|rainbowkit|<form/i.test(html));
});

await check('page has one h1, eight sections with headings, skip link and main landmark', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok((html.match(/<section\b/g) || []).length >= 8);
  assert.ok(html.includes('class="skip-link"'));
  assert.ok(html.includes('<main id="main"'));
});

await check('live data: code fetches /simd-coin.json and refreshes every 30 s', () => {
  const js = readFileSync(join(dist, 'assets/index.js'), 'utf8');
  assert.ok(js.includes('/simd-coin.json'));
  assert.ok(js.includes('3e4') || js.includes('30000') || js.includes('30_000'));
  assert.ok(!existsSync(join(dist, 'simd-coin.json')), 'mock data must not ship in dist');
});

await check('formatNumber handles null, small prices and compact USD', () => {
  assert.equal(formatNumber(null, 'usd'), '—');
  assert.equal(formatNumber(0.00004269, 'price'), '$0.00004269');
  assert.equal(formatNumber(1234.5, 'price'), '$1,234.5');
  assert.equal(formatNumber(42690, 'usd'), '$42.7K');
  assert.equal(formatNumber(950, 'usd'), '$950');
  assert.equal(formatNumber(33.333, 'pct'), '33.3%');
});

await check('nativeCoin maps known chains and falls back to a sentence', () => {
  assert.equal(nativeCoin({ chain: 'solana', chainName: 'Solana' }), 'SOL');
  assert.equal(nativeCoin({ chain: 'bsc', chainName: 'BNB Chain' }), 'BNB');
  assert.equal(nativeCoin({ chain: 'weird', chainName: 'Weird Chain' }), 'the native coin of Weird Chain');
});

await check('meme wall has at least 8 templates, each a valid SVG using the logo', () => {
  assert.ok(TEMPLATES.length >= 8);
  const ids = new Set(TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, TEMPLATES.length);
  for (const t of TEMPLATES) {
    const svg = renderSvg(t, './assets/logo.png');
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('./assets/logo.png'));
    assert.ok(svg.endsWith('</svg>'));
  }
});

await check('generator captions are escaped so user text cannot inject markup', () => {
  const svg = renderSvg(TEMPLATES[0], 'x.png', { top: '<img src=x onerror=alert(1)>', bottom: 'A & B "C"' });
  assert.ok(!svg.includes('<img'));
  assert.ok(svg.includes('&lt;img'));
  assert.ok(svg.includes('A &amp; B &quot;C&quot;'));
  assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
});

await check('dist has no node_modules, maps or mock files and stays small', () => {
  let total = 0;
  const walk = (/** @type {string} */ d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const s = statSync(p);
      if (s.isDirectory()) { assert.notEqual(f, 'node_modules'); walk(p); } else { total += s.size; assert.ok(!f.endsWith('.map')); }
    }
  };
  walk(dist);
  assert.ok(total < 1_000_000, `dist is ${total} bytes`);
});

console.log(`\n${passed} checks passed`);
