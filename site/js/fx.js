// Interactions: nav, tabs, copy, confetti, magnetic buttons, drag sticker, vibe meter, reveals, share.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** @param {HTMLElement} toggle @param {HTMLElement} menu */
export function initNav(toggle, menu) {
  const setOpen = (/** @type {boolean} */ open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if (/** @type {HTMLElement} */ (e.target).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    const t = /** @type {Node} */ (e.target);
    if (!menu.contains(t) && !toggle.contains(t)) setOpen(false);
  });

  // Scroll spy: mark the section in view in the nav.
  const links = Array.from(menu.querySelectorAll('a.nav__link'));
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => {
          const match = l.getAttribute('href') === `#${entry.target.id}`;
          if (match) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach((l) => {
      const target = document.querySelector(l.getAttribute('href') || '');
      if (target) obs.observe(target);
    });
  }
}

/**
 * ARIA tabs for the buying steps, with Back / Next buttons.
 * @param {HTMLElement} root
 */
export function initSteps(root) {
  const tabs = /** @type {HTMLButtonElement[]} */ (Array.from(root.querySelectorAll('[role="tab"]')));
  const panels = /** @type {HTMLElement[]} */ (Array.from(root.querySelectorAll('[role="tabpanel"]')));
  const prev = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-step-prev]'));
  const next = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-step-next]'));
  const progress = root.querySelector('[data-step-progress]');
  let index = 0;

  const select = (/** @type {number} */ i, focus = false) => {
    index = Math.max(0, Math.min(tabs.length - 1, i));
    tabs.forEach((t, k) => {
      const on = k === index;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (progress) progress.textContent = `Step ${index + 1} of ${tabs.length}`;
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === tabs.length - 1;
    if (focus) tabs[index].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      const delta = map[/** @type {keyof typeof map} */ (e.key)];
      if (delta) { e.preventDefault(); select((index + delta + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    });
  });
  prev?.addEventListener('click', () => select(index - 1, true));
  next?.addEventListener('click', () => select(index + 1, true));
  select(0);
  return { select, current: () => index };
}

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Wire copy buttons: [data-copy-contract] copies the contract, [data-copy-link] copies the page URL.
 * @param {HTMLElement} copyStatus
 * @param {HTMLElement} linkStatus
 */
export function initCopy(copyStatus, linkStatus) {
  /** @param {HTMLButtonElement} btn @param {() => string} text @param {HTMLElement} status @param {string} what */
  const bind = (btn, text, status, what) => {
    const label = btn.textContent || 'Copy';
    btn.addEventListener('click', async () => {
      const ok = await copyText(text());
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      btn.setAttribute('aria-pressed', String(ok));
      status.textContent = ok ? `${what} copied to the clipboard.` : `Unable to copy the ${what.toLowerCase()}. Select it and copy it by hand.`;
      setTimeout(() => { btn.textContent = label; btn.removeAttribute('aria-pressed'); }, 2000);
    });
  };
  document.querySelectorAll('button[data-copy-contract]').forEach((b) => bind(/** @type {HTMLButtonElement} */ (b), () => document.querySelector('[data-contract]')?.textContent?.trim() || '', copyStatus, 'Contract address'));
  document.querySelectorAll('button[data-copy-link]').forEach((b) => bind(/** @type {HTMLButtonElement} */ (b), () => location.origin + location.pathname, linkStatus, 'Site link'));
}

/**
 * Confetti burst from the click position on any [data-confetti] element.
 * @param {HTMLElement} layer
 */
export function initConfetti(layer) {
  const colors = ['#7ed957', '#4f6cff', '#ffd23f', '#ffffff', '#ff7a1a'];
  document.addEventListener('click', (e) => {
    const el = /** @type {HTMLElement} */ (e.target).closest('[data-confetti]');
    if (!el || reduceMotion()) return;
    const rect = el.getBoundingClientRect();
    const ox = e.clientX || rect.left + rect.width / 2;
    const oy = e.clientY || rect.top + rect.height / 2;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('span');
      p.className = 'confetti';
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 220;
      p.style.left = `${ox}px`;
      p.style.top = `${oy}px`;
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist + 260}px`);
      p.style.setProperty('--tr', `${Math.round((Math.random() - 0.5) * 1080)}deg`);
      p.style.animationDelay = `${Math.random() * 120}ms`;
      frag.appendChild(p);
    }
    layer.appendChild(frag);
    setTimeout(() => { layer.querySelectorAll('.confetti').forEach((n) => n.remove()); }, 1400);
  });
}

/** Magnetic buttons: nudge toward a fine pointer within a short radius. */
export function initMagnetic() {
  if (!finePointer() || reduceMotion()) return;
  const els = /** @type {HTMLElement[]} */ (Array.from(document.querySelectorAll('[data-magnetic]')));
  els.forEach((el) => {
    const reset = () => { el.style.translate = ''; };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.translate = `${dx * 0.18}px ${dy * 0.18}px`;
    });
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
  });
}

/**
 * Draggable sticker: pointer drag plus arrow keys.
 * @param {HTMLElement} el
 */
export function initDragSticker(el) {
  let x = 0; let y = 0; let startX = 0; let startY = 0; let originX = 0; let originY = 0;
  const apply = () => {
    el.style.setProperty('--dx', `${x}px`);
    el.style.setProperty('--dy', `${y}px`);
  };
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    startX = e.clientX; startY = e.clientY; originX = x; originY = y;
    el.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 20)}deg`);
  });
  el.addEventListener('pointermove', (e) => {
    if (!el.classList.contains('is-dragging')) return;
    x = originX + (e.clientX - startX);
    y = originY + (e.clientY - startY);
    apply();
  });
  const end = () => el.classList.remove('is-dragging');
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 40 : 12;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[/** @type {keyof typeof map} */ (e.key)];
    if (!d) return;
    e.preventDefault();
    x += d[0]; y += d[1];
    apply();
  });
  return { position: () => ({ x, y }) };
}

/**
 * Vibe meter: each click pumps the level; it slowly decays.
 * @param {{ button: HTMLButtonElement, meter: HTMLElement, fill: HTMLElement, count: HTMLElement, label: HTMLElement }} ui
 */
export function initVibe(ui) {
  let level = 0; let pumps = 0;
  const labelFor = (/** @type {number} */ l) => (l === 0 ? 'vibe is resting' : l < 30 ? 'vibe is warming up' : l < 60 ? 'vibe is vibing' : l < 95 ? 'vibe is pumping' : 'maximum vibe reached');
  const render = () => {
    ui.fill.style.width = `${level}%`;
    ui.fill.classList.toggle('is-hot', level >= 60);
    ui.meter.setAttribute('aria-valuenow', String(Math.round(level)));
    ui.meter.setAttribute('aria-valuetext', `${Math.round(level)} percent, ${labelFor(level)}`);
    ui.count.textContent = String(pumps);
    ui.label.textContent = labelFor(level);
  };
  ui.button.addEventListener('click', () => {
    pumps += 1;
    level = Math.min(100, level + 9);
    render();
  });
  window.setInterval(() => {
    if (level > 0) { level = Math.max(0, level - 1.5); render(); }
  }, 400);
  render();
  return { state: () => ({ level, pumps }) };
}

/** Scroll-triggered reveals. */
export function initReveal() {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window) || reduceMotion()) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  els.forEach((el) => obs.observe(el));
}

/**
 * Share intents on X with three prefilled posts.
 * @param {string} symbol
 * @param {string} url
 */
export function applyShareLinks(symbol, url) {
  const texts = [
    `Running the test with $${symbol}. One frog, one server room, everyone pressing run together.`,
    `Frog approved. $${symbol} is exactly what it says: the test. No promises, just green monitors.`,
    `Green monitors only. $${symbol} is the control group of the whole chain. Not financial advice.`,
  ];
  document.querySelectorAll('a[data-share]').forEach((a) => {
    const i = Number(/** @type {HTMLElement} */ (a).dataset.share) || 0;
    const href = `https://x.com/intent/post?text=${encodeURIComponent(texts[i] || texts[0])}&url=${encodeURIComponent(url)}`;
    a.setAttribute('href', href);
  });
}
