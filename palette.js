/* ═══════════════════════════════════════════════
   Palette Studio — photo → Blick paint matcher
   100% client-side. No upload leaves the browser.
   ═══════════════════════════════════════════════ */

const PS = {
  paints: [],          // {name, hex, family, id, rgb, lab}
  data: null,
  lastPixels: null,    // cached Lab pixels of current image
  count: 6,
};

/* ── Color math ──────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function rgbToLab([r, g, b]) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // linear sRGB -> XYZ (D65)
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// CIEDE2000
function deltaE00(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2;
  const avgL = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;
  const h = (x, y) => { let d = Math.atan2(y, x) * 180 / Math.PI; return d < 0 ? d + 360 : d; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else { let diff = h2p - h1p; if (diff > 180) diff -= 360; else if (diff < -180) diff += 360; dhp = diff; }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);
  let avghp;
  if (C1p * C2p === 0) avghp = h1p + h2p;
  else { let s = h1p + h2p; if (Math.abs(h1p - h2p) > 180) s += (s < 360 ? 360 : -360); avghp = s / 2; }
  const T = 1 - 0.17 * Math.cos((avghp - 30) * Math.PI / 180) + 0.24 * Math.cos((2 * avghp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * avghp + 6) * Math.PI / 180) - 0.20 * Math.cos((4 * avghp - 63) * Math.PI / 180);
  const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;
  const dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(2 * dTheta * Math.PI / 180);
  return Math.sqrt(
    Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH)
  );
}
function labToLch(lab) {
  const C = Math.hypot(lab[1], lab[2]);
  let H = Math.atan2(lab[2], lab[1]) * 180 / Math.PI;
  if (H < 0) H += 360;
  return [lab[0], C, H];
}
function hueDiff(h1, h2) { let d = Math.abs(h1 - h2) % 360; return d > 180 ? 360 - d : d; }
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

/* ── k-means (Lab) with k-means++ init ───────── */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kmeans(points, k, seed) {
  const rand = mulberry32(seed || 12345);
  const n = points.length;
  if (n <= k) return points.map(p => ({ lab: p, count: 1 }));
  // k-means++ init
  const centers = [points[Math.floor(rand() * n)]];
  while (centers.length < k) {
    const d2 = points.map(p => Math.min(...centers.map(c => sqDist(p, c))));
    const sum = d2.reduce((a, b) => a + b, 0);
    let r = rand() * sum, i = 0;
    while (r > d2[i] && i < n - 1) { r -= d2[i]; i++; }
    centers.push(points[i]);
  }
  let assign = new Array(n).fill(0);
  for (let iter = 0; iter < 14; iter++) {
    // assign
    let moved = false;
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const d = sqDist(points[i], centers[c]); if (d < bd) { bd = d; best = c; } }
      if (assign[i] !== best) { assign[i] = best; moved = true; }
    }
    // update
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { const a = assign[i], p = points[i]; sums[a][0] += p[0]; sums[a][1] += p[1]; sums[a][2] += p[2]; sums[a][3]++; }
    for (let c = 0; c < k; c++) if (sums[c][3]) centers[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    if (!moved && iter > 0) break;
  }
  const counts = new Array(k).fill(0);
  for (let i = 0; i < n; i++) counts[assign[i]]++;
  return centers.map((lab, i) => ({ lab, count: counts[i] })).filter(c => c.count > 0);
}
function sqDist(a, b) { return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; }

// Lab -> approx sRGB (for display of centroid). We instead keep nearest source pixel rgb.
function labToHexApprox(lab) {
  // invert via simple search is overkill; reconstruct through XYZ
  const [L, a, b] = lab;
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = t => { const t3 = t ** 3; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
  let x = 0.95047 * inv(fx), y = 1.0 * inv(fy), z = 1.08883 * inv(fz);
  let r = x * 3.2406 - y * 1.5372 - z * 0.4986;
  let g = -x * 0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 - y * 0.2040 + z * 1.0570;
  const lin = c => { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, c)) * 255; };
  return rgbToHex(lin(r), lin(g), lin(bl));
}

/* ── Load paint data ─────────────────────────── */
async function loadPaints() {
  const res = await fetch('data/paints/watercolor.json');
  PS.data = await res.json();
  PS.paints = PS.data.colors.map(c => {
    const rgb = hexToRgb(c.hex);
    const lab = rgbToLab(rgb);
    return { ...c, rgb, lab, lch: labToLch(lab) };
  });
}
function paintByName(name) {
  const n = name.toLowerCase();
  return PS.paints.find(p => p.name.toLowerCase() === n);
}
function buyUrl(paint) {
  // Per-color Blick search (swap to CJ/Blick affiliate deep link on launch)
  const q = encodeURIComponent(`Winsor Newton Professional Watercolour ${paint.name}`);
  return `https://www.dickblick.com/search/?q=${q}`;
}

/* ── Image → palette ─────────────────────────── */
function imageToLabPixels(img) {
  const max = 160;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const labs = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue; // skip transparent
    labs.push(rgbToLab([d[i], d[i + 1], d[i + 2]]));
  }
  return labs;
}

/* Watercolor-aware match: a photo color is usually a *tint* (pigment + water),
   so lightness is freely adjustable. For colors with real chroma we match by HUE
   (which tube, diluted, gives this color); for near-neutrals we use full ΔE so
   greys/earths/blacks match properly. */
const NEUTRAL_C = 6;
function matchPaint(lab) {
  const [L, C, H] = labToLch(lab);
  const neutral = C < NEUTRAL_C;
  let best = null, bd = Infinity, bestHue = 999;
  for (const p of PS.paints) {
    const [Lp, Cp, Hp] = p.lch;
    let d;
    if (neutral) {
      // near-neutral target: nearest by ΔE, but discourage vivid tubes
      d = deltaE00(lab, p.lab) + (Cp > 18 ? (Cp - 18) * 0.6 : 0);
    } else {
      const dH = hueDiff(H, Hp);
      const tubeNeutralPenalty = Cp < 10 ? 45 : 0; // a grey tube can't make a vivid hue
      d = dH * 2.2 + Math.abs(C - Cp) * 0.30 + Math.abs(L - Lp) * 0.12 + tubeNeutralPenalty;
      if (d < bd) bestHue = dH;
    }
    if (d < bd) { bd = d; best = p; }
  }
  return { paint: best, neutral, score: bd, dE: deltaE00(lab, best.lab), dH: bestHue };
}
function closenessLabel(m) {
  if (m.neutral) {
    if (m.dE < 10) return ['Neutral match', 'ps-tag--good'];
    return ['Closest neutral', 'ps-tag--approx'];
  }
  if (m.dH < 10) return ['Strong hue match', 'ps-tag--great'];
  if (m.dH < 26) return ['Good hue match', 'ps-tag--good'];
  return ['Closest available', 'ps-tag--approx'];
}

/* ── Mixing kit (photo-aware split-primary) ──── */
function buildMixingKit(palette) {
  // palette: [{rgb,hex,weight}]
  const base = ['New Gamboge', 'Winsor Lemon', 'Scarlet Lake', 'Permanent Rose', 'French Ultramarine', 'Winsor Blue (Green Shade)'];
  const kit = [];
  const add = (name, role) => { const p = paintByName(name); if (p && !kit.find(k => k.paint.name === p.name)) kit.push({ paint: p, role }); };
  add('New Gamboge', 'Warm yellow'); add('Winsor Lemon', 'Cool yellow');
  add('Scarlet Lake', 'Warm red'); add('Permanent Rose', 'Cool red');
  add('French Ultramarine', 'Warm blue'); add('Winsor Blue (Green Shade)', 'Cool blue');

  // analyze palette character
  let earth = 0, dark = 0, green = 0, sat = 0;
  palette.forEach(c => {
    const [hh, s, l] = rgbToHsl(c.rgb); sat += s;
    if (s < 0.45 && hh >= 18 && hh <= 55 && l < 0.6) earth++;       // browns/ochres
    if (l < 0.22) dark++;                                            // deep darks
    if (hh >= 70 && hh <= 165 && s > 0.15) green++;                  // greens
  });
  if (earth > 0) { add('Burnt Sienna', 'Earth — warm brown'); add('Yellow Ochre Light', 'Earth — ochre'); }
  if (dark > 0) add('Paynes Grey', 'Deep neutral / shadow');
  if (green >= 2) add('Permanent Sap Green', 'Convenience green');
  add('Chinese White', 'White (optional — or use the paper)');
  return kit;
}

/* ── Run ─────────────────────────────────────── */
function analyze(img) {
  const status = document.getElementById('ps-status');
  status.textContent = 'Reading colors…';
  PS.lastPixels = imageToLabPixels(img);
  render();
}
function render() {
  if (!PS.lastPixels) return;
  const status = document.getElementById('ps-status');
  const k = PS.count;
  const clusters = kmeans(PS.lastPixels, k, PS.lastPixels.length).sort((a, b) => b.count - a.count);
  const total = clusters.reduce((s, c) => s + c.count, 0);
  const palette = clusters.map(c => {
    const hex = labToHexApprox(c.lab);
    return { lab: c.lab, rgb: hexToRgb(hex), hex, weight: c.count / total };
  });
  // matches
  const matches = palette.map(p => ({ ...p, ...matchPaint(p.lab) }));
  // render palette strip
  document.getElementById('ps-palette').innerHTML = palette.map(p =>
    `<div class="ps-chip" style="background:${p.hex}" title="${p.hex} · ${Math.round(p.weight * 100)}%">
       <span>${Math.round(p.weight * 100)}%</span></div>`).join('');
  // render matched cards
  document.getElementById('ps-matches').innerHTML = matches.map(m => {
    const [label, cls] = closenessLabel(m);
    return `<a class="ps-card" href="${buyUrl(m.paint)}" target="_blank" rel="sponsored noopener">
      <div class="ps-card__swatches">
        <span class="ps-card__from" style="background:${m.hex}" title="From your photo"></span>
        <span class="ps-card__arrow">→</span>
        <span class="ps-card__to" style="background:${m.paint.hex}" title="${m.paint.hex}"></span>
      </div>
      <div class="ps-card__body">
        <span class="ps-card__name">${m.paint.name}</span>
        <span class="ps-tag ${cls}">${label}</span>
      </div>
      <span class="ps-card__buy">Shop at Blick →</span>
    </a>`;
  }).join('');
  // mixing kit
  const kit = buildMixingKit(palette);
  document.getElementById('ps-kit').innerHTML = kit.map(item =>
    `<a class="ps-kit-card" href="${buyUrl(item.paint)}" target="_blank" rel="sponsored noopener">
       <span class="ps-kit-card__swatch" style="background:${item.paint.hex}"></span>
       <span class="ps-kit-card__name">${item.paint.name}</span>
       <span class="ps-kit-card__role">${item.role}</span>
     </a>`).join('');
  status.textContent = `${PS.paints.length} Winsor & Newton colors searched · matched ${palette.length}`;
  document.getElementById('ps-result').hidden = false;
}

/* ── File handling ───────────────────────────── */
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      document.getElementById('ps-image').src = img.src;
      analyze(img);
      document.getElementById('ps-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadPaints();
  const drop = document.getElementById('ps-drop');
  const input = document.getElementById('ps-file');
  const slider = document.getElementById('ps-count');
  const sliderVal = document.getElementById('ps-count-val');

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', e => handleFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('ps-drop--over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('ps-drop--over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  slider.addEventListener('input', () => {
    PS.count = parseInt(slider.value, 10);
    sliderVal.textContent = PS.count;
    if (PS.lastPixels) render();
  });
});
