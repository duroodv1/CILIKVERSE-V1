// Utiliti bersama untuk semua permainan.
// Fail ini tidak menyentuh DOM semasa diimport, jadi ia juga boleh diuji di Node.

let SEED = 1;

export function setSeed(s) {
  SEED = (Number(s) >>> 0) || 1;
}

// Penjana nombor pseudo-rawak berbenih (deterministik untuk ujian).
export function rnd() {
  SEED |= 0;
  SEED = (SEED + 0x6d2b79f5) | 0;
  let t = Math.imul(SEED ^ (SEED >>> 15), 1 | SEED);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pilih `n` item unik daripada senarai.
export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

export function rm(min, max) {
  const ringgit = ri(min, max);
  return ringgit;
}

export function senToText(sen) {
  const r = Math.floor(sen / 100);
  const s = sen % 100;
  return `RM${r}.${String(s).padStart(2, '0')}`;
}

export function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Pemarkahan seragam: 3 bintang untuk 100%, 2 bintang untuk >= 70%, 1 untuk lulus.
export function starsFor(pct, pass = 60) {
  if (pct >= 95) return 3;
  if (pct >= pass + 15) return 2;
  if (pct >= pass) return 1;
  return 0;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// Cari indeks terdekat dalam senarai angka kepada nilai sasaran.
export function nearestIdx(values, target) {
  let best = 0;
  let bestD = Infinity;
  values.forEach((v, i) => {
    const d = Math.abs(v - target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
