import { applyIdentity, applyMarket, startLiveLoop, REFRESH_MS } from './coin.js';
import { initMemeWall, initGenerator } from './memes.js';
import { initNav, initSteps, initCopy, initConfetti, initMagnetic, initDragSticker, initVibe, initReveal, applyShareLinks } from './fx.js';

// Mark the document as scripted first: the scroll-reveal styles only hide content under .js,
// so a page without scripts shows every section.
document.documentElement.classList.add('js');

const SITE_URL = 'https://testtest.si-md.xyz/';

/** @template {Element} T @param {string} sel @returns {T} */
const $ = (sel) => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return /** @type {T} */ (el);
};

function main() {
  initNav($('[data-nav-toggle]'), $('[data-nav-menu]'));
  initSteps($('.steps'));
  initCopy($('[data-copy-status]'), $('[data-link-status]'));
  initConfetti($('[data-confetti-layer]'));
  initMagnetic();
  initDragSticker($('[data-drag-sticker]'));
  initVibe({
    button: $('[data-vibe-button]'),
    meter: $('[data-vibe-meter]'),
    fill: $('[data-vibe-fill]'),
    count: $('[data-vibe-count]'),
    label: $('[data-vibe-label]'),
  });
  initMemeWall($('[data-meme-wall]'));
  initGenerator({
    templates: $('[data-gen-templates]'),
    top: $('[data-gen-top]'),
    bottom: $('[data-gen-bottom]'),
    preview: $('[data-gen-preview]'),
    download: $('[data-gen-download]'),
    reset: $('[data-gen-reset]'),
    status: $('[data-gen-status]'),
  });
  initReveal();
  applyShareLinks('TEST', SITE_URL);

  const status = $('[data-stats-status]');
  const seconds = Math.round(REFRESH_MS / 1000);
  startLiveLoop(
    (coin) => {
      applyIdentity(coin);
      applyMarket(coin);
      applyShareLinks(coin.symbol || 'TEST', SITE_URL);
      const m = coin.market;
      const hasNumbers = [m.priceUsd, m.marketCap, m.volume24h, m.liquidityUsd].some((v) => typeof v === 'number' && Number.isFinite(v));
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      status.textContent = hasNumbers
        ? `Updated at ${time}. Refreshes every ${seconds} seconds.`
        : `Feed reached at ${time}, but it has no market numbers yet. Refreshes every ${seconds} seconds.`;
    },
    () => {
      status.textContent = `Live data is unavailable right now. Trying again in ${seconds} seconds.`;
    },
  );
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
else main();
