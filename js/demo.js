// Contoh demonstrasi untuk setiap jenis permainan (untuk kanak-kanak PPKI).
// Demonstrasi memainkan satu contoh pendek dengan teks, sorotan visual dan pertuturan Melayu.
import { esc } from './shared.js';
import { parseMap } from './maze.js';
import { Speech, speechRoundLines } from './speech.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KIND_TITLE = {
  choice: 'Pilih Satu Jawapan',
  sort: 'Susun Mengikut Urutan',
  match: 'Padankan Pasangan',
  multi: 'Pilih Semua yang Betul',
  groups: 'Masukkan ke Kumpulan',
  numpad: 'Taip Jumlah Wang',
  budget: 'Pilih Dalam Bajet',
  code: 'Susun Arahan Robot',
};

function demoRound(def, level = 1) {
  const ctx = { used: new Set() };
  if (def.type === 'mixed') return def.generate(level, ctx).rounds[0];
  return def.generate(level, ctx);
}

export function openDemo({ def, meta, level = 1, reduceMotion = false, onClose }) {
  // Bersihkan overlay & pendengar lama (jika ada) sebelum membuka yang baharu.
  if (typeof window !== 'undefined' && window.__demoCleanup) {
    try {
      window.__demoCleanup();
    } catch (e) {
      /* abaikan */
    }
  }
  const old = document.getElementById('demo-overlay');
  if (old) old.remove();

  let cancelled = false;
  const speed = reduceMotion ? 0.55 : 1;
  const wait = (ms) => sleep(Math.max(120, ms * speed));

  const overlay = document.createElement('div');
  overlay.className = 'demo-overlay';
  overlay.id = 'demo-overlay';
  overlay.innerHTML = `
    <div class="demo-card" role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <div class="demo-head">
        <div>
          <span class="chip chip-demo">👀 Contoh Demonstrasi</span>
          <h2 id="demo-title">${esc(meta.title)}</h2>
        </div>
        <button class="icon-btn" data-demo-close aria-label="Tutup contoh">✕</button>
      </div>
      <div class="demo-stage" data-stage></div>
      <div class="demo-say" data-say aria-live="polite">
        <span class="demo-say-ico" aria-hidden="true">🤖</span>
        <p data-say-text>Tekan “Main Contoh” untuk melihat cara bermain.</p>
      </div>
      <div class="demo-actions">
        <button class="btn primary" data-demo-play>▶ Main Contoh</button>
        <button class="btn ghost" data-demo-again>🔁 Ulang Contoh</button>
        <button class="btn ghost" data-demo-skip>Tutup</button>
      </div>
      <p class="tiny">Contoh ini hanya demonstrasi. Ia tidak mengira markah.</p>
    </div>`;
  document.body.appendChild(overlay);

  const stage = overlay.querySelector('[data-stage]');
  const sayText = overlay.querySelector('[data-say-text]');
  sayText.textContent = '';
  let round = null;
  try {
    round = demoRound(def, level);
  } catch (e) {
    stage.innerHTML = '<p class="tiny">Contoh tidak tersedia untuk permainan ini.</p>';
  }

  // Teks demo kekal kelihatan; jika suara Melayu tersedia, setiap langkah turut dibacakan.
  const say = async (text, ms = 2200) => {
    if (cancelled) return;
    sayText.textContent = text;
    const spoken = await Speech.speak(text);
    if (cancelled) return;
    if (!spoken) await wait(ms);
    else await wait(140);
  }; 
  const mark = (el, cls = 'demo-hi') => {
    if (!el || cancelled) return;
    el.classList.add(cls);
  };
  const clearMarks = (root, cls = 'demo-hi') => {
    if (!root) return;
    root.querySelectorAll('.' + cls).forEach((x) => x.classList.remove(cls));
  };

  function renderChoice() {
    stage.innerHTML = `
      <p class="demo-q">${esc(round.prompt)}</p>
      <div class="demo-options">
        ${round.options
          .map(
            (o, i) =>
              `<div class="demo-opt" data-i="${i}"><span class="demo-opt-letter">${String.fromCharCode(
                65 + i
              )}</span><span>${o.html || esc(o.label)}</span></div>`
          )
          .join('')}
      </div>`;
    const opts = [...stage.querySelectorAll('.demo-opt')];
    const correctIdx = round.options.findIndex((o) => o.correct);
    return [
      () => say('Langkah satu. Baca soalan dengan teliti.'),
      () => say('Langkah dua. Dengar semua pilihan jawapan.'),
      async () => {
        const wrong = opts.findIndex((o, i) => i !== correctIdx);
        if (wrong >= 0) {
          mark(opts[wrong]);
          await say('Pilihan ini kurang tepat.');
          clearMarks(stage);
        }
      },
      async () => {
        mark(opts[correctIdx]);
        await say('Pilihan ini betul. Tekan pilihan, kemudian tekan Semak.');
      },
      () => say('Bagus! Kamu sudah tahu cara menjawab. Cuba permainan sebenar ya!'),
    ];
  }

  function renderNumpad() {
    const text = (round.answer / 100).toFixed(2);
    stage.innerHTML = `
      <p class="demo-q">${esc(round.prompt)}</p>
      <div class="amount-display demo-amount" data-amount>RM 0.00</div>
      <div class="demo-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, '⌫']
        .map((k) => `<span>${k}</span>`)
        .join('')}</div>`;
    const amount = stage.querySelector('[data-amount]');
    return [
      () => say('Langkah satu. Kira jumlah wang dengan teliti.'),
      () => say('Langkah dua. Tekan nombor pada papan kekunci.'),
      async () => {
        let typed = '';
        for (const ch of text) {
          typed += ch;
          amount.textContent = 'RM ' + typed;
          await wait(320);
        }
        await say('Selepas menaip, tekan Semak.');
      },
      () => say('Betul! Jawapannya ' + (round.answer / 100).toFixed(2) + ' ringgit.'),
    ];
  }

  function renderSort() {
    const items = round.items.map((it) => ({ ...it }));
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p><div class="demo-sort" data-sort>
      ${items.map((it, i) => `<div class="demo-sort-row" data-id="${esc(it.id)}"><b>${i + 1}</b><span>${esc(
      it.label || ''
    )}</span><em>↕</em></div>`).join('')}</div>`;
    const order = round.answer;
    return [
      () => say('Langkah satu. Baca semua item.'),
      () => say('Langkah dua. Tekan anak panah untuk menaikkan atau menurunkan item.'),
      async () => {
        for (let i = 0; i < order.length; i += 1) {
          const row = stage.querySelector(`.demo-sort-row[data-id="${order[i]}"]`);
          if (row) {
            mark(row);
            await wait(500);
          }
        }
        await say('Susunan yang betul ialah: ' + order.map((id) => (items.find((x) => x.id === id) || {}).label).join(', kemudian '));
      },
      () => say('Bagus! Susunan sudah betul.'),
    ];
  }

  function renderMatch() {
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p>
      <div class="demo-match">
        <div class="demo-col">${round.left
          .map((l) => `<div class="demo-card-s" data-left="${esc(l.id)}">${l.html || esc(l.label)}</div>`)
          .join('')}</div>
        <div class="demo-col">${round.right
          .map((r) => `<div class="demo-card-s" data-right="${esc(r.match)}">${r.html || esc(r.label)}</div>`)
          .join('')}</div>
      </div>`;
    const pairs = round.left.map((l) => l.id);
    return [
      () => say('Langkah satu. Tekan satu kad di sebelah kiri.'),
      () => say('Langkah dua. Tekan pasangannya di sebelah kanan.'),
      async () => {
        for (const id of pairs) {
          const l = stage.querySelector(`[data-left="${id}"]`);
          const r = stage.querySelector(`[data-right="${id}"]`);
          if (l) mark(l);
          if (r) mark(r);
          await wait(700);
        }
        await say('Pasangan yang betul akan bertukar menjadi hijau.');
      },
      () => say('Hebat! Semua kad sudah berpasangan.'),
    ];
  }

  function renderMulti() {
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p>
      <div class="demo-options tight">
        ${round.items
          .map(
            (it, i) =>
              `<div class="demo-opt" data-i="${i}"><span class="demo-tick">✓</span><span>${it.html || esc(it.label)}</span></div>`
          )
          .join('')}
      </div>`;
    const cards = [...stage.querySelectorAll('.demo-opt')];
    return [
      () => say('Langkah satu. Anda boleh pilih lebih daripada satu jawapan.'),
      async () => {
        for (let i = 0; i < round.items.length; i += 1) {
          if (round.items[i].correct) {
            cards[i].classList.add('demo-on');
            await wait(650);
          }
        }
        await say('Pilih semua jawapan yang betul, kemudian tekan Semak.');
      },
      () => say('Bagus! Kamu telah memilih jawapan yang betul.'),
    ];
  }

  function renderGroups() {
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p>
      <div class="demo-groups">
        ${round.items
          .map(
            (it, i) => `<div class="demo-group-row" data-i="${i}"><span>${it.html || esc(it.label)}</span>
            <span class="demo-gbtns">${round.groups
              .map((g) => `<b data-g="${esc(g.id)}">${esc(g.label)}</b>`)
              .join('')}</span></div>`
          )
          .join('')}
      </div>`;
    return [
      () => say('Langkah satu. Baca item dan pilihan kumpulan.'),
      async () => {
        for (let i = 0; i < round.items.length; i += 1) {
          const row = stage.querySelector(`.demo-group-row[data-i="${i}"]`);
          const btn = row && row.querySelector(`[data-g="${round.items[i].group}"]`);
          if (btn) {
            btn.classList.add('demo-on');
            await wait(650);
          }
        }
        await say('Setiap item mesti dimasukkan ke kumpulan yang betul.');
      },
      () => say('Syabas! Semua item sudah dikelaskan.'),
    ];
  }

  function renderBudget() {
    const money = round.format !== 'minutes';
    const fmt = (v) => (money ? 'RM' + (v / 100).toFixed(2) : v + ' minit');
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p>
      <p class="demo-budget">Bajet: <b>${fmt(round.budget)}</b></p>
      <div class="demo-options tight">
        ${round.items
          .map(
            (it, i) =>
              `<div class="demo-opt" data-i="${i}">${it.emoji || '🛒'} <span>${esc(it.label)}</span>
               <em class="demo-price">${fmt(it.price)}</em>${it.need ? '<span class="chip">Perlu</span>' : ''}</div>`
          )
          .join('')}
      </div>`;
    const cards = [...stage.querySelectorAll('.demo-opt')];
    let total = 0;
    return [
      () => say('Langkah satu. Baca bajet yang diberi.'),
      async () => {
        for (let i = 0; i < round.items.length; i += 1) {
          const it = round.items[i];
          if (it.need) {
            cards[i].classList.add('demo-on');
            total += it.price;
            await wait(550);
          }
        }
        await say('Pilih semua barang keperluan dahulu. Jumlahnya ' + fmt(total) + '.');
      },
      async () => {
        for (let i = 0; i < round.items.length; i += 1) {
          const it = round.items[i];
          if (!it.need && total + it.price <= round.budget) {
            cards[i].classList.add('demo-on');
            total += it.price;
            await wait(450);
          }
        }
        await say('Pastikan jumlah tidak melebihi bajet. Kemudian tekan Semak.');
      },
      () => say('Pandai! Kamu boleh merancang perbelanjaan.'),
    ];
  }

  function renderCode() {
    let level;
    try {
      level = parseMap(round.map, { maxCmds: round.maxCmds });
    } catch (e) {
      stage.innerHTML = '<p class="tiny">Contoh tidak tersedia.</p>';
      return [() => say('Cuba permainan sebenar untuk melihat labirin.')];
    }
    const cells = [];
    for (let y = 0; y < level.rows; y += 1) {
      for (let x = 0; x < level.cols; x += 1) {
        const isWall = level.walls.some(([wx, wy]) => wx === x && wy === y);
        const isGoal = level.goal[0] === x && level.goal[1] === y;
        const isStart = level.start[0] === x && level.start[1] === y;
        const hasStar = level.stars.some(([sx, sy]) => sx === x && sy === y);
        cells.push(
          `<div class="maze-cell ${isWall ? 'wall' : 'floor'}" data-x="${x}" data-y="${y}">${
            isWall ? '' : isGoal ? '🏁' : ''.concat(hasStar ? '⭐' : '')
          }${isStart ? '<span class="mz-robot" data-robot>🤖</span>' : ''}</div>`
        );
      }
    }
    stage.innerHTML = `<p class="demo-q">${esc(round.prompt)}</p>
      <div class="demo-code">
        <div class="maze" style="--cols:${level.cols}">${cells.join('')}</div>
        <div class="demo-program" data-prog><span class="tiny">Belum ada arahan.</span></div>
      </div>`;
    const prog = stage.querySelector('[data-prog]');
    const path = awaitPath(level);
    return [
      () => say('Langkah satu. Lihat kedudukan robot dan bendera.'),
      () => say('Langkah dua. Tekan anak panah untuk menambah arahan.'),
      async () => {
        prog.innerHTML = '';
        for (const dir of path) {
          const chip = document.createElement('span');
          chip.className = 'prog-chip';
          chip.textContent = { atas: '↑ Atas', kiri: '← Kiri', bawah: '↓ Bawah', kanan: '→ Kanan' }[dir];
          prog.appendChild(chip);
          await wait(400);
        }
        await say('Kemudian tekan Jalankan. Robot akan bergerak mengikut arahan.');
      },
      async () => {
        let x = level.start[0];
        let y = level.start[1];
        const robot = stage.querySelector('[data-robot]');
        for (const dir of path) {
          const d = { atas: [0, -1], kanan: [1, 0], bawah: [0, 1], kiri: [-1, 0] }[dir];
          x += d[0];
          y += d[1];
          const cell = stage.querySelector(`[data-x="${x}"][data-y="${y}"]`);
          if (cell && robot) cell.appendChild(robot);
          await wait(420);
        }
        await say('Robot sampai ke bendera. Syabas!');
      },
    ];
  }

  function awaitPath(level) {
    // Laluan ringkas untuk demonstrasi: BFS mudah (sama seperti penyelesai permainan).
    const dirs = [
      { dx: 0, dy: -1, name: 'atas' },
      { dx: 1, dy: 0, name: 'kanan' },
      { dx: 0, dy: 1, name: 'bawah' },
      { dx: -1, dy: 0, name: 'kiri' },
    ];
    const total = level.stars.length;
    const allMask = (1 << total) - 1;
    const start = `${level.start[0]},${level.start[1]},0`;
    const q = [{ x: level.start[0], y: level.start[1], m: 0, p: [] }];
    const seen = new Set([start]);
    while (q.length) {
      const c = q.shift();
      if (c.x === level.goal[0] && c.y === level.goal[1] && c.m === allMask) return c.p;
      for (const d of dirs) {
        const nx = c.x + d.dx;
        const ny = c.y + d.dy;
        if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
        if (level.walls.some(([wx, wy]) => wx === nx && wy === ny)) continue;
        let m = c.m;
        const si = level.stars.findIndex(([sx, sy]) => sx === nx && sy === ny);
        if (si >= 0) m |= 1 << si;
        const k = `${nx},${ny},${m}`;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny, m, p: [...c.p, d.name] });
      }
    }
    return [];
  }

  let steps = [];
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    cancelled = false;
    Speech.stop();
    clearMarks(stage, 'demo-hi');
    clearMarks(stage, 'demo-on');
    try {
      const kind = round ? round.kind : 'choice';
      const render = {
        choice: renderChoice,
        numpad: renderNumpad,
        sort: renderSort,
        match: renderMatch,
        multi: renderMulti,
        groups: renderGroups,
        budget: renderBudget,
        code: renderCode,
      }[kind];
      if (!render) {
        stage.innerHTML = `<p class="demo-q">${esc(round ? round.prompt : '')}</p>`;
        steps = [() => say('Cuba permainan sebenar ya!')];
      } else {
        steps = render();
        for (const line of speechRoundLines(round)) {
          if (cancelled) return;
          await say(line, 1300);
        }
      }
      const stepsNow = steps;
      for (const s of stepsNow) {
        if (cancelled) return;
        await s();
        await wait(400);
      }
      if (!cancelled) await say('Itulah caranya. Sekarang cuba sendiri! 💪');
    } catch (e) {
      console.error('Demo gagal:', e);
      sayText.textContent = 'Contoh tidak dapat dimainkan sepenuhnya. Kamu masih boleh cuba permainan sebenar.';
    } finally {
      running = false;
    }
  }

  const escClose = (e) => {
    if (e.key === 'Escape') close();
  };
  const close = () => {
    cancelled = true;
    running = false;
    Speech.stop();
    document.removeEventListener('keydown', escClose);
    overlay.remove();
    if (onClose) onClose();
    if (typeof window !== 'undefined') window.__demoCleanup = null;
  };
  if (typeof window !== 'undefined') window.__demoCleanup = close;
  overlay.querySelector('[data-demo-close]').addEventListener('click', close);
  overlay.querySelector('[data-demo-skip]').addEventListener('click', close);
  overlay.querySelector('[data-demo-play]').addEventListener('click', run);
  overlay.querySelector('[data-demo-again]').addEventListener('click', () => {
    cancelled = true;
    Speech.stop();
    setTimeout(() => {
      cancelled = false;
      run();
    }, 250);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', escClose);

  overlay.querySelector('[data-demo-play]').focus();
  return { close, run, overlay };
}
