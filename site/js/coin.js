// Live coin data: fetch, format and apply to the page.

/**
 * @typedef {object} Market
 * @property {number | null} priceUsd
 * @property {number | null} marketCap
 * @property {number | null} liquidityUsd
 * @property {number | null} volume24h
 */

/**
 * @typedef {object} CoinData
 * @property {string} name
 * @property {string} symbol
 * @property {string} token
 * @property {string} chain
 * @property {string} chainName
 * @property {string} logo
 * @property {string | null} x
 * @property {string | null} telegram
 * @property {string} chartUrl
 * @property {string} buyUrl
 * @property {Market} market
 */

export const COIN_JSON_URL = '/simd-coin.json';
export const REFRESH_MS = 30_000;

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @type {Record<string, string>} */
const NATIVE_COIN = {
  solana: 'SOL', sol: 'SOL',
  bsc: 'BNB', bnb: 'BNB', binance: 'BNB',
  ethereum: 'ETH', eth: 'ETH', base: 'ETH', arbitrum: 'ETH', optimism: 'ETH', blast: 'ETH', linea: 'ETH', zksync: 'ETH',
  polygon: 'POL', avalanche: 'AVAX', avax: 'AVAX', fantom: 'FTM', tron: 'TRX', sui: 'SUI', ton: 'TON',
};

/**
 * @param {Pick<CoinData, 'chain' | 'chainName'>} coin
 * @returns {string}
 */
export function nativeCoin(coin) {
  const key = String(coin.chain || coin.chainName || '').toLowerCase().replace(/[^a-z]/g, '');
  return NATIVE_COIN[key] || `the native coin of ${coin.chainName || 'the chain'}`;
}

/**
 * @param {number | null | undefined} value
 * @param {string} format
 * @returns {string}
 */
export function formatNumber(value, format) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (format === 'price') {
    if (value === 0) return '$0';
    if (value >= 1) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    return `$${value.toLocaleString('en-US', { maximumSignificantDigits: 4 })}`;
  }
  if (format === 'pct') return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  // usd compact
  const abs = Math.abs(value);
  const opts = abs >= 1000
    ? { notation: /** @type {const} */ ('compact'), maximumFractionDigits: 1 }
    : { maximumFractionDigits: 2 };
  return `$${value.toLocaleString('en-US', opts)}`;
}

/**
 * Animate a numeric element from its last value to the new one.
 * @param {HTMLElement} el
 * @param {number | null} value
 * @param {string} format
 */
export function tweenValue(el, value, format) {
  const from = Number(el.dataset.current);
  el.classList.toggle('is-empty', value === null);
  if (value === null || !Number.isFinite(from) || reduceMotion() || from === value) {
    el.textContent = formatNumber(value, format);
    el.dataset.current = value === null ? '' : String(value);
    return;
  }
  const start = performance.now();
  const duration = 800;
  const step = (/** @type {number} */ now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = from + (value - from) * eased;
    el.textContent = formatNumber(v, format);
    if (t < 1) requestAnimationFrame(step);
    else el.dataset.current = String(value);
  };
  requestAnimationFrame(step);
}

/**
 * @returns {Promise<CoinData>}
 */
export async function fetchCoin() {
  const tryUrls = [COIN_JSON_URL, './simd-coin.json'];
  /** @type {unknown} */
  let lastError = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = /** @type {CoinData} */ (await res.json());
      if (!data || typeof data !== 'object' || !data.token) throw new Error('Unexpected payload');
      data.market = data.market || { priceUsd: null, marketCap: null, liquidityUsd: null, volume24h: null };
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Live data unavailable');
}

/**
 * @param {string} selector
 * @param {(el: HTMLElement) => void} fn
 */
const each = (selector, fn) => document.querySelectorAll(selector).forEach((el) => fn(/** @type {HTMLElement} */ (el)));

/**
 * Apply identity fields and links. Market numbers are applied separately.
 * @param {CoinData} coin
 */
export function applyIdentity(coin) {
  const symbol = coin.symbol || 'TEST';
  each('[data-symbol-tag]', (el) => { el.textContent = `$${symbol}`; });
  each('[data-chain-name]', (el) => { el.textContent = coin.chainName || coin.chain || 'the chain'; });
  each('[data-native-coin]', (el) => { el.textContent = nativeCoin(coin); });
  each('[data-contract]', (el) => {
    // Break the 42-character address at its midpoint when one line cannot hold it,
    // instead of orphaning the last glyph. textContent and the copy button keep all 42 characters.
    const mid = Math.ceil(coin.token.length / 2);
    el.replaceChildren(document.createTextNode(coin.token.slice(0, mid)), document.createElement('wbr'), document.createTextNode(coin.token.slice(mid)));
  });
  if (coin.buyUrl) each('a[data-buy-link]', (el) => { el.setAttribute('href', coin.buyUrl); });
  if (coin.chartUrl) each('a[data-chart-link]', (el) => { el.setAttribute('href', coin.chartUrl); });
  const x = document.querySelector('a[data-x-link]');
  if (x && coin.x) { x.setAttribute('href', coin.x); x.removeAttribute('hidden'); }
  const tg = document.querySelector('a[data-telegram-link]');
  if (tg && coin.telegram) { tg.setAttribute('href', coin.telegram); tg.removeAttribute('hidden'); }
}

/**
 * @param {CoinData} coin
 */
export function applyMarket(coin) {
  const m = coin.market;
  each('[data-stat]', (el) => {
    const key = /** @type {keyof Market} */ (el.dataset.stat);
    const raw = m[key];
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    tweenValue(el, value, el.dataset.format || 'usd');
  });
  applyDonut(coin);
}

const CIRC = 2 * Math.PI * 80; // donut radius 80 → 502.65

/**
 * @param {CoinData} coin
 */
export function applyDonut(coin) {
  const m = coin.market;
  /** @type {Array<keyof Market>} */
  const keys = ['marketCap', 'liquidityUsd', 'volume24h'];
  const vals = keys.map((k) => (typeof m[k] === 'number' && Number.isFinite(m[k]) ? Math.max(0, /** @type {number} */ (m[k])) : 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const caption = document.querySelector('[data-donut-caption]');
  let offset = 0;
  keys.forEach((key, i) => {
    const seg = /** @type {SVGCircleElement | null} */ (document.querySelector(`[data-donut-seg="${key}"]`));
    const pct = total > 0 ? (vals[i] / total) * 100 : 0;
    const len = (pct / 100) * CIRC;
    if (seg) {
      seg.style.strokeDasharray = `${len} ${CIRC - len}`;
      seg.style.strokeDashoffset = `${-offset}`;
    }
    offset += len;
  });
  if (caption) {
    caption.textContent = total > 0
      ? 'Market cap, liquidity and 24h volume from the live feed.'
      : 'Waiting for live market data. The donut fills in as soon as the feed reports numbers.';
  }
}

/**
 * Start the live loop: fetch now, then every 30 seconds.
 * @param {(coin: CoinData) => void} onData
 * @param {(err: Error) => void} onError
 * @returns {() => void} stop
 */
export function startLiveLoop(onData, onError) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      onData(await fetchCoin());
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };
  tick();
  const id = window.setInterval(tick, REFRESH_MS);
  return () => { stopped = true; window.clearInterval(id); };
}
