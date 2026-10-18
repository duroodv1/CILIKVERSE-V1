// Kit pembina pusingan (round) untuk penjana permainan.
// Semua fungsi tulen: boleh diuji di Node tanpa DOM.

import { rnd, shuffle, senToText } from './shared.js';

// Ambil satu item daripada kumpulan tanpa ulangan dalam sesi yang sama.
export function take(ctx, pool, key = 'default') {
  if (!ctx) return pool[Math.floor(rnd() * pool.length)];
  if (!ctx.used) ctx.used = new Set();
  const k = (item) => key + '::' + (typeof item === 'object' ? item.id || item.label || item.prompt : item);
  let avail = pool.filter((p) => !ctx.used.has(k(p)));
  if (!avail.length) {
    pool.forEach((p) => ctx.used.delete(k(p)));
    avail = pool.slice();
  }
  const item = avail[Math.floor(rnd() * avail.length)];
  ctx.used.add(k(item));
  return item;
}

export function choiceRound({ prompt, correct, wrong = [], explain = '', options = null, html = null, hint = '' }) {
  let opts;
  if (options) {
    opts = options;
  } else {
    opts = [{ label: correct, correct: true }, ...wrong.map((w) => ({ label: w, correct: false }))];
  }
  return {
    kind: 'choice',
    prompt,
    options: shuffle(opts).map((o) => ({ ...o })),
    explain,
    html,
    hint,
  };
}

export function sortRound({ prompt, items, answer = null, explain = '', hint = '' }) {
  const order = answer || items.map((i) => i.id);
  return { kind: 'sort', prompt, items: shuffle(items), answer: order, explain, hint };
}

export function matchRound({ prompt, pairs, explain = '', hint = '' }) {
  const left = pairs.map((p) => ({ id: p.id, label: p.left, html: p.leftHtml }));
  const right = shuffle(pairs.map((p) => ({ match: p.id, label: p.right, html: p.rightHtml })));
  return { kind: 'match', prompt, left, right, explain, hint };
}

export function multiRound({ prompt, items, explain = '', hint = '', min = null }) {
  return { kind: 'multi', prompt, items: shuffle(items.map((i) => ({ ...i }))), explain, hint, min };
}

export function groupsRound({ prompt, groups, items, explain = '', hint = '' }) {
  return {
    kind: 'groups',
    prompt,
    groups,
    items: shuffle(items.map((i) => ({ ...i }))),
    explain,
    hint,
  };
}

export function numpadRound({ prompt, answer, explain = '', hint = '', html = null, prefix = 'RM' }) {
  return { kind: 'numpad', prompt, answer, explain, hint, html, prefix };
}

export function budgetRound({
  prompt,
  budget,
  items,
  explain = '',
  hint = '',
  unit = 'RM',
  format = 'money',
  mustIncludeNeeds = true,
}) {
  return {
    kind: 'budget',
    prompt,
    budget,
    items,
    explain,
    hint,
    unit,
    format,
    mustIncludeNeeds,
  };
}

export function codeRound({ prompt, map, maxCmds, optimal = false, explain = '', hint = '' }) {
  return { kind: 'code', prompt, map, maxCmds, optimal, explain, hint };
}

// ---- Paparan grid mini (bukan interaktif) ----
export function gridHTML(map, label = 'Peta') {
  const rows = String(map)
    .trim()
    .split('\n')
    .map((r) => r.trim());
  const cols = Math.max(...rows.map((r) => r.length));
  const cells = [];
  rows.forEach((row) => {
    for (let x = 0; x < cols; x += 1) {
      const ch = row[x] || '.';
      const cls = ch === '#' ? 'wall' : ch === 'G' ? 'goal' : ch === '*' ? 'star' : ch === 'S' ? 'start' : 'floor';
      const icon = ch === '#' ? '' : ch === 'G' ? '🏁' : ch === '*' ? '⭐' : ch === 'S' ? '🤖' : '';
      cells.push(`<span class="mg-cell ${cls}">${icon}</span>`);
    }
  });
  return `<div class="mini-grid" style="--cols:${cols}" role="img" aria-label="${label}">${cells.join('')}</div>`;
}

export function arrowsText(path) {
  const m = { atas: '↑', kanan: '→', bawah: '↓', kiri: '←' };
  return path.map((p) => m[p] || p).join(' ');
}

// ---- Visual wang Ringgit Malaysia (CSS, tiada imej luar) ----
const NOTE_COLORS = {
  10000: 'purple',
  5000: 'green',
  2000: 'blue',
  1000: 'red',
  500: 'teal',
};
const COIN_COLORS = {
  100: 'gold',
  50: 'silver',
  20: 'gold2',
  10: 'silver2',
  5: 'copper',
  1: 'copper2',
};

export function moneyHTML(sen) {
  const txt = senToText(sen);
  if (sen >= 500) {
    return `<span class="money note note-${NOTE_COLORS[sen] || 'teal'}" aria-label="${txt}">${txt}</span>`;
  }
  return `<span class="money coin coin-${COIN_COLORS[sen] || 'gold'}" aria-label="${txt}">${txt}</span>`;
}

export function moneySumHTML(list) {
  return `<span class="money-row">${list.map((s) => moneyHTML(s)).join('')}</span>`;
}

// Item wang untuk jenis multi (pilih kombinasi bayaran).
export function moneyItem(sen, correct = false) {
  return {
    html: moneyHTML(sen),
    label: senToText(sen),
    correct,
    value: sen,
  };
}

export const NOTES = [10000, 5000, 2000, 1000, 500];
export const COINS = [100, 50, 20, 10, 5];
export const ALL_MONEY = [...NOTES, ...COINS];

export function pickMoney(list, n) {
  return shuffle(list).slice(0, n);
}

export function moneyPool(minSen, maxSen, count, list = ALL_MONEY) {
  const pool = [];
  for (let i = 0; i < count; i += 1) {
    const v = list[Math.floor(rnd() * list.length)];
    if (v >= minSen && v <= maxSen) pool.push(v);
  }
  return pool;
}

// Kira laluan langkah (untuk paparan petunjuk).
export function listToText(arr) {
  return arr.join(' → ');
}

// Bantu pilih subset wang yang menjumlahkan jumlah sasaran (untuk jawapan multi).
export function subsetSum(list, target, maxLen = 4) {
  const cand = list.filter((v) => v <= target);
  const out = [];
  function dfs(start, remaining, acc) {
    if (remaining === 0 && acc.length) {
      out.push(acc.slice());
      return true;
    }
    if (acc.length >= maxLen) return false;
    for (let i = start; i < cand.length; i += 1) {
      if (cand[i] > remaining) continue;
      acc.push(cand[i]);
      if (dfs(i, remaining - cand[i], acc)) return true;
      acc.pop();
    }
    return false;
  }
  dfs(0, target, []);
  return out[0] || null;
}

// Hasilkan pilihan wang yang menjumlah tepat (untuk pilih gabungan).
export function makeExactChange(target) {
  const combos = [];
  const notes = [10000, 5000, 2000, 1000, 500, 100, 50, 20, 10, 5];
  // cuba gabungan kecil (1-3 keping) yang menjumlah tepat
  for (const a of notes) {
    if (a === target) combos.push([a]);
    for (const b of notes) {
      if (a + b === target && a >= b) combos.push([a, b]);
      for (const c of notes) {
        if (a + b + c === target && a >= b && b >= c) combos.push([a, b, c]);
      }
    }
  }
  const uniq = new Map();
  combos.forEach((c) => {
    const k = c.join(',');
    if (!uniq.has(k)) uniq.set(k, c);
  });
  return [...uniq.values()][Math.floor(rnd() * uniq.size)] || [target];
}
