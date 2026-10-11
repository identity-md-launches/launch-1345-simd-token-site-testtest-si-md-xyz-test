// Meme wall and meme generator: SVG compositions built from the logo,
// exported to PNG through an off-screen canvas on demand.

const LOGO_SRC = './assets/logo.png';
const FONT_SRC = './assets/luckiest-guy-latin.woff2';
const SIZE = 600;

const C = {
  ink: '#0b0e17',
  green: '#7ed957',
  greenDark: '#3f9a24',
  blue: '#4f6cff',
  blueDark: '#1f2a4a',
  yellow: '#ffd23f',
  white: '#ffffff',
  surface: '#161d33',
  flame: '#ff7a1a',
  flameDark: '#d63a0f',
};

const FONT = "'Luckiest Guy', Impact, 'Arial Black', sans-serif";

/** @param {string} s */
export const esc = (s) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));

/**
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} [fill]
 * @param {string} [extra]
 */
const word = (text, x, y, size, fill = C.white, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" fill="${fill}" stroke="${C.ink}" stroke-width="${Math.max(4, size / 9)}" paint-order="stroke" stroke-linejoin="round" ${extra}>${esc(text)}</text>`;

/**
 * @param {string} href
 * @param {number} x
 * @param {number} y
 * @param {number} h
 * @param {string} [extra]
 */
const logo = (href, x, y, h, extra = '') => {
  const w = Math.round(h * (99 / 134));
  return `<image href="${href}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" ${extra}/>`;
};

/**
 * A word baked into a template, in the top or bottom caption slot.
 * A typed caption in the same slot replaces it, so text never prints over text.
 * @typedef {object} SlotWord
 * @property {string} text
 * @property {number} y   baseline in the 600×600 view box
 * @property {number} size font size
 * @property {string} [fill]
 */

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} name
 * @property {(href: string) => string} draw  artwork only, no lettering
 * @property {{ top?: SlotWord, bottom?: SlotWord }} words
 */

/** @type {Template[]} */
export const TEMPLATES = [
  {
    id: 'gm',
    name: 'GM',
    draw: (h) => {
      const rays = Array.from({ length: 16 }, (_, i) => `<polygon points="300,300 ${300 + 700 * Math.cos((i / 16) * Math.PI * 2)},${300 + 700 * Math.sin((i / 16) * Math.PI * 2)} ${300 + 700 * Math.cos(((i + 0.5) / 16) * Math.PI * 2)},${300 + 700 * Math.sin(((i + 0.5) / 16) * Math.PI * 2)}" fill="${C.yellow}" opacity=".55"/>`).join('');
      return `<rect width="600" height="600" fill="${C.green}"/>${rays}<circle cx="300" cy="330" r="150" fill="${C.yellow}" stroke="${C.ink}" stroke-width="8"/>${logo(h, 300, 340, 300)}`;
    },
    words: { top: { text: 'GM', y: 120, size: 120 } },
  },
  {
    id: 'wagmi',
    name: 'WAGMI',
    draw: (h) => {
      const pts = Array.from({ length: 24 }, (_, i) => { const r = i % 2 ? 190 : 240; const a = (i / 24) * Math.PI * 2; return `${300 + r * Math.cos(a)},${300 + r * Math.sin(a)}`; }).join(' ');
      return `<rect width="600" height="600" fill="${C.blue}"/><polygon points="${pts}" fill="${C.yellow}" stroke="${C.ink}" stroke-width="8"/>${logo(h, 300, 310, 260)}`;
    },
    words: { bottom: { text: 'WAGMI', y: 560, size: 96 } },
  },
  {
    id: 'diamond',
    name: 'Diamond hands',
    draw: (h) => {
      const dia = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) => `<polygon points="${x},${y - s} ${x + s * 0.8},${y - s * 0.3} ${x},${y + s} ${x - s * 0.8},${y - s * 0.3}" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/><polygon points="${x - s * 0.8},${y - s * 0.3} ${x + s * 0.8},${y - s * 0.3} ${x},${y + s}" fill="${C.blue}" opacity=".5"/>`;
      return `<rect width="600" height="600" fill="${C.surface}"/>${dia(90, 140, 60)}${dia(510, 120, 50)}${dia(80, 470, 45)}${dia(520, 460, 65)}<circle cx="300" cy="320" r="180" fill="${C.blue}" stroke="${C.ink}" stroke-width="8"/>${logo(h, 300, 320, 280)}`;
    },
    words: { top: { text: 'DIAMOND', y: 90, size: 76 }, bottom: { text: 'HANDS', y: 570, size: 76 } },
  },
  {
    id: 'moon',
    name: 'To the moon',
    draw: (h) => {
      const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 600}" r="${2 + (i % 3)}" fill="${C.white}" opacity=".9"/>`).join('');
      return `<rect width="600" height="600" fill="${C.ink}"/>${stars}<circle cx="470" cy="130" r="80" fill="${C.yellow}" stroke="${C.ink}" stroke-width="6"/><circle cx="440" cy="110" r="14" fill="${C.ink}" opacity=".2"/><circle cx="500" cy="160" r="20" fill="${C.ink}" opacity=".2"/><path d="M60 560 L300 220 L330 240 L120 580 Z" fill="${C.flame}" stroke="${C.ink}" stroke-width="6"/>${logo(h, 320, 300, 240, 'transform="rotate(25 320 300)"')}`;
    },
    words: { bottom: { text: 'TO THE MOON', y: 540, size: 72 } },
  },
  {
    id: 'server',
    name: 'Run the test',
    draw: (h) => {
      const grid = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        grid.push(`<rect x="${30 + c * 185}" y="${30 + r * 160}" width="170" height="145" rx="10" fill="${C.greenDark}" stroke="${C.ink}" stroke-width="5"/>`);
        grid.push(logo(h, 115 + c * 185, 102 + r * 160, 120));
      }
      return `<rect width="600" height="600" fill="${C.surface}"/>${grid.join('')}<rect x="0" y="500" width="600" height="100" fill="${C.green}" stroke="${C.ink}" stroke-width="6"/>`;
    },
    words: { bottom: { text: 'RUN THE TEST', y: 572, size: 64, fill: C.ink } },
  },
  {
    id: 'fine',
    name: 'This is fine',
    draw: (h) => {
      const flames = Array.from({ length: 9 }, (_, i) => `<path d="M${i * 70} 600 Q${i * 70 + 20} ${420 + (i % 2) * 50} ${i * 70 + 40} ${380 + (i % 3) * 30} Q${i * 70 + 60} ${470} ${i * 70 + 80} 600 Z" fill="${i % 2 ? C.flame : C.flameDark}" stroke="${C.ink}" stroke-width="5"/>`).join('');
      return `<rect width="600" height="600" fill="${C.flameDark}"/><rect width="600" height="360" fill="${C.blueDark}"/>${flames}<rect x="150" y="300" width="300" height="60" rx="12" fill="${C.yellow}" stroke="${C.ink}" stroke-width="6"/>${logo(h, 300, 240, 260)}`;
    },
    words: { top: { text: 'THIS IS FINE', y: 90, size: 80 } },
  },
  {
    id: 'stickers',
    name: 'Sticker sheet',
    draw: (h) => {
      const spots = [[120, 130, -15], [300, 110, 8], [480, 140, 20], [110, 330, 12], [300, 330, -6], [490, 340, -18], [200, 510, 22], [410, 505, -10]];
      return `<rect width="600" height="600" fill="${C.yellow}"/>${spots.map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><circle cx="${x}" cy="${y}" r="78" fill="${C.white}" stroke="${C.ink}" stroke-width="6"/>${logo(h, x, y, 120)}</g>`).join('')}`;
    },
    words: { bottom: { text: '$TEST', y: 580, size: 56, fill: C.ink } },
  },
  {
    id: 'poster',
    name: 'Halftone poster',
    draw: (h) => `<defs><pattern id="ht" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3" fill="${C.ink}" opacity=".35"/></pattern></defs><rect width="600" height="600" fill="${C.green}"/><rect width="600" height="600" fill="url(#ht)"/><rect x="40" y="40" width="520" height="520" rx="24" fill="none" stroke="${C.ink}" stroke-width="10"/>${logo(h, 300, 290, 380)}<rect x="60" y="470" width="480" height="90" rx="16" fill="${C.ink}"/>`,
    words: { bottom: { text: '$TEST', y: 540, size: 80, fill: C.yellow } },
  },
  {
    id: 'stonks',
    name: 'Stonks',
    draw: (h) => `<rect width="600" height="600" fill="${C.blueDark}"/><g stroke="${C.ink}" stroke-width="2" opacity=".25">${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="600" y2="${i * 60}"/><line x1="${i * 60}" y1="0" x2="${i * 60}" y2="600"/>`).join('')}</g><polyline points="40,520 140,470 200,500 290,380 350,420 430,260 500,300 560,120" fill="none" stroke="${C.green}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/><polygon points="560,120 500,130 545,185" fill="${C.green}" stroke="${C.ink}" stroke-width="4"/>${logo(h, 190, 230, 280)}`,
    words: { bottom: { text: 'STONKS', y: 570, size: 90 } },
  },
];

/**
 * @param {Template} t
 * @param {string} href
 * @param {{ top?: string, bottom?: string }} [caption]
 * @param {string} [fontCss]
 */
export function renderSvg(t, href, caption = {}, fontCss = '') {
  const sizeFor = (/** @type {string} */ s) => Math.max(30, Math.min(64, Math.round(1100 / Math.max(10, s.length))));
  /**
   * One caption slot: a typed caption replaces the template word that lives there;
   * with nothing typed the template word is drawn as on the wall.
   * @param {'top' | 'bottom'} slot
   */
  const slotText = (slot) => {
    const typed = (caption[slot] || '').trim();
    const w = t.words[slot];
    if (!typed) return w ? word(w.text, 300, w.y, w.size, w.fill) : '';
    const size = Math.min(sizeFor(typed), w ? w.size : 64);
    const y = w ? w.y : slot === 'top' ? 20 + size : 580;
    return word(typed, 300, y, size, w ? w.fill : C.white);
  };
  const captions = slotText('top') + slotText('bottom');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${esc(t.name)} meme with the TEST logo">${fontCss ? `<style>${fontCss}</style>` : ''}${t.draw(href)}${captions}</svg>`;
}

/** @type {Promise<string> | null} */
let logoDataUrl = null;
/** @type {Promise<string> | null} */
let fontDataUrl = null;

/** @param {string} url */
async function toDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unable to load ${url}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Unable to read ${url}`));
    r.readAsDataURL(blob);
  });
}

/**
 * Serialize an SVG composition (with inlined logo and font) and rasterize it to a PNG blob.
 * Canvas is used only for this export step, as the brief allows.
 * @param {Template} t
 * @param {{ top?: string, bottom?: string }} [caption]
 * @param {number} [scale]
 * @returns {Promise<Blob>}
 */
export async function exportPng(t, caption = {}, scale = 2) {
  logoDataUrl = logoDataUrl || toDataUrl(LOGO_SRC);
  fontDataUrl = fontDataUrl || toDataUrl(FONT_SRC).catch(() => '');
  const [href, font] = await Promise.all([logoDataUrl, fontDataUrl]);
  const fontCss = font ? `@font-face{font-family:'Luckiest Guy';src:url(${font}) format('woff2');}` : '';
  const svg = renderSvg(t, href, caption, fontCss);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(undefined);
      img.onerror = () => reject(new Error('Unable to render the meme'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = SIZE * scale;
    canvas.height = SIZE * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to encode the PNG'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** @param {string} s */
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * Build the meme wall.
 * @param {HTMLElement} list
 */
export function initMemeWall(list) {
  list.innerHTML = TEMPLATES.map((t, i) => `
    <li class="meme" style="--i:${i}">
      <div class="meme__art">${renderSvg(t, LOGO_SRC)}</div>
      <div class="meme__foot">
        <span class="meme__name">${esc(t.name)}</span>
        <button class="btn btn--ghost btn--sm" type="button" data-wall-download="${t.id}">Download PNG</button>
      </div>
    </li>`).join('');
  list.addEventListener('click', async (e) => {
    const btn = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-wall-download]'));
    if (!btn) return;
    const t = TEMPLATES.find((x) => x.id === btn.dataset.wallDownload);
    if (!t) return;
    const label = btn.textContent;
    btn.textContent = 'Preparing…';
    btn.setAttribute('aria-busy', 'true');
    try {
      downloadBlob(await exportPng(t), `test-meme-${slug(t.name)}.png`);
      btn.textContent = 'Downloaded';
    } catch (err) {
      btn.textContent = 'Download failed. Try again';
    } finally {
      btn.removeAttribute('aria-busy');
      setTimeout(() => { btn.textContent = label; }, 2200);
    }
  });
}

/**
 * Meme generator: template chips, top/bottom text, live preview, PNG download.
 * @param {{ templates: HTMLElement, top: HTMLInputElement, bottom: HTMLInputElement, preview: HTMLElement, download: HTMLButtonElement, reset: HTMLButtonElement, status: HTMLElement }} ui
 */
export function initGenerator(ui) {
  let current = TEMPLATES[0];
  const defaults = { top: ui.top.value, bottom: ui.bottom.value };

  ui.templates.innerHTML = TEMPLATES.map((t) => `<button class="gen__chip" type="button" aria-pressed="${t === current}" data-gen-template="${t.id}">${esc(t.name)}</button>`).join('');

  const render = () => {
    ui.preview.innerHTML = renderSvg(current, LOGO_SRC, { top: ui.top.value.toUpperCase(), bottom: ui.bottom.value.toUpperCase() });
    ui.preview.setAttribute('aria-label', `Meme preview: ${current.name} template, top text “${ui.top.value}”, bottom text “${ui.bottom.value}”`);
  };

  ui.templates.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-gen-template]'));
    if (!chip) return;
    const t = TEMPLATES.find((x) => x.id === chip.dataset.genTemplate);
    if (!t) return;
    current = t;
    ui.templates.querySelectorAll('[data-gen-template]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    render();
  });
  ui.top.addEventListener('input', render);
  ui.bottom.addEventListener('input', render);
  ui.reset.addEventListener('click', () => { ui.top.value = defaults.top; ui.bottom.value = defaults.bottom; render(); ui.top.focus(); });
  ui.download.addEventListener('click', async () => {
    ui.status.textContent = 'Preparing your PNG…';
    ui.download.setAttribute('aria-busy', 'true');
    try {
      const blob = await exportPng(current, { top: ui.top.value.toUpperCase(), bottom: ui.bottom.value.toUpperCase() });
      downloadBlob(blob, `test-meme-${slug(current.name)}-${Date.now()}.png`);
      ui.status.textContent = 'PNG downloaded. Post it.';
    } catch (err) {
      ui.status.textContent = 'Unable to create the PNG. Reload the page and try again.';
    } finally {
      ui.download.removeAttribute('aria-busy');
    }
  });
  render();
  return { render, getTemplate: () => current };
}
