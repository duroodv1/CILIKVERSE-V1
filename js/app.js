// CILIKVERSE V.1 — logik aplikasi utama.
// Offline-first: semua data permainan dimuatkan daripada fail setempat.

import { Engine, getGame, howToFor, LEVELS } from './engine.js';
import '../modules/robocilik/robocilik.js';
import '../modules/bijak-wang/bijak-wang.js';
import '../modules/detektif-digital/detektif-digital.js';
import { Store, todayKey } from './storage.js';
import { Sound, initSoundFromSettings } from './audio.js';
import { Speech } from './speech.js';
import { openDemo } from './demo.js';
import { applyAccessibility, fontScaleLabel, prefersReducedMotion } from './accessibility.js';
import { Offline } from './offline.js';
import { Assistant } from './ai-assistant.js';
import { Router } from './navigation.js';
import {
  BADGES,
  MODULES,
  levelInfo,
  moduleStats,
  nextGame,
  recordResult,
} from './progress.js';
import { esc } from './shared.js';

const APP_VERSION = '1.1.4';
// Dedahkan objek suara untuk ujian automatik & penyahpepijatan (bukan data pengguna).
if (typeof window !== 'undefined') window.__CILIK_SPEECH = Speech;
const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
const modal = document.getElementById('modal');
const modalBox = document.getElementById('modal-box');
const toastEl = document.getElementById('toast');
const updateBanner = document.getElementById('update-banner');

let state = null;
let DATA = { games: [], faq: { items: [] } };
let parentUnlocked = false;
let toastTimer = null;

function speechVoiceOptions(selectedKey = String((state && state.settings && state.settings.speechVoice) || '')) {
  const voices = Speech.getMalayVoices();
  if (!voices.length) return '<option value="">Tiada suara Bahasa Melayu tersedia</option>';
  const hasSelected = voices.some((voice) => Speech.voiceKey(voice) === selectedKey);
  return (
    `<option value="" ${hasSelected ? '' : 'selected'}>Automatik (utamakan Melayu Malaysia)</option>` +
    voices
      .map((voice) => {
        const key = Speech.voiceKey(voice);
        const label = `${voice.name || 'Suara Melayu'} (${voice.lang || 'ms-MY'})`;
        return `<option value="${esc(key)}" ${key === selectedKey ? 'selected' : ''}>${esc(label)}</option>`;
      })
      .join('')
  );
}

function refreshSpeechControls() {
  const select = document.getElementById('speech-voice');
  if (select) {
    const voices = Speech.getMalayVoices();
    const selectedKey = String((state && state.settings && state.settings.speechVoice) || '');
    select.innerHTML = speechVoiceOptions(selectedKey);
    select.disabled = voices.length === 0;
    select.value = voices.some((voice) => Speech.voiceKey(voice) === selectedKey) ? selectedKey : '';
  }
  const status = document.getElementById('tts-state');
  if (status) status.textContent = Speech.statusText();
}

if (typeof window !== 'undefined') {
  window.addEventListener('cilikverse:voiceschanged', refreshSpeechControls);
}

const MODULE_DESC = {
  robocilik: 'Coding, logik, robotik dan pengenalan AI.',
  'bijak-wang': 'Wang Ringgit, bajet, simpanan dan keputusan bijak.',
  'detektif-digital': 'Privasi, penipuan digital dan etika dalam talian.',
};

const $ = (sel) => document.querySelector(sel);

function toast(msg, ms = 3200) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, ms);
}

function openModal(html) {
  modalBox.innerHTML = html;
  modal.hidden = false;
  const first = modalBox.querySelector('button, input, select');
  if (first) first.focus({ preventScroll: true });
}

function closeModal() {
  modal.hidden = true;
  modalBox.innerHTML = '';
}

function confirmDialog({ title, body, confirmLabel = 'Teruskan', danger = false, onConfirm }) {
  openModal(`
    <h3 id="modal-title">${esc(title)}</h3>
    <p>${body}</p>
    <div class="modal-actions">
      <button class="btn ghost" data-cancel>Batal</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirmLabel)}</button>
    </div>`);
  modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
  const ok = modalBox.querySelector('[data-ok]');
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try {
      await onConfirm();
    } finally {
      closeModal();
    }
  });
}

async function saveState(immediate = false) {
  await Store.save(state, immediate);
}

function starsHTML(n, cls = 'stars-mini') {
  return `<span class="${cls}" aria-label="${n} daripada 3 bintang">${[0, 1, 2]
    .map((i) => `<span class="${i < n ? 'on' : ''}">★</span>`)
    .join('')}</span>`;
}

function avatarEmoji(id) {
  const map = { cili: '🤖', bintang: '⭐', roket: '🚀', bulan: '🌙', hijau: '🌱', buku: '📚' };
  return map[id] || '🤖';
}

// Avatar CILI menggunakan illustrasi maskot sebenar; avatar lain menggunakan ikon.
function avatarHTML(id, size = 54) {
  if (id === 'cili') {
    return `<img src="./assets/images/cili-avatar-128.png" alt="Maskot CILI" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" />`;
  }
  return avatarEmoji(id);
}

const avatarButtonHTML = (a, active, cls = 'avatar-opt') => `
  <button type="button" class="${cls} ${active ? 'active' : ''}" data-avatar="${a}" aria-pressed="${active}" aria-label="Avatar ${
  a === 'cili' ? 'CILI robot' : a
}">${a === 'cili' ? '<img src="./assets/images/cili-avatar-64.png" alt="" width="42" height="42" />' : avatarEmoji(a)}</button>`;

function totalStars() {
  return Object.values(state.completed || {}).reduce((a, c) => a + (c.stars || 0), 0);
}

function level() {
  return levelInfo(state.xp || 0);
}

/* ---------------- Status & chrome ---------------- */

function aiLabel() {
  const st = Assistant.status();
  return st.label;
}

function updateChips() {
  const net = document.getElementById('net-chip');
  const ai = document.getElementById('ai-chip');
  const online = Offline.online();
  if (net) {
    net.innerHTML = online ? '🌐 <span>Online</span>' : '📴 <span>Offline</span>';
    net.classList.toggle('on', online);
    net.classList.toggle('off', !online);
    net.title = online ? 'Aplikasi berhubung dengan internet' : 'Tiada internet — permainan tetap berjalan';
  }
  if (ai) {
    const st = Assistant.status();
    ai.innerHTML = `🤖 <span>AI: ${esc(st.label)}</span>`;
    ai.classList.toggle('on', st.mode === 'cloud');
    ai.classList.toggle('off', st.mode !== 'cloud');
    ai.title = 'Pembantu CILI sentiasa boleh digunakan secara setempat';
  }
  ['home-net', 'home-ai', 'home-offline'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'home-net') {
      el.innerHTML = online ? '🌐 <span>Online</span>' : '📴 <span>Offline — permainan tetap berjalan</span>';
      el.classList.toggle('on', online);
      el.classList.toggle('off', !online);
    } else if (id === 'home-ai') {
      const st = Assistant.status();
      el.innerHTML = `🤖 <span>AI: ${esc(st.label)}</span>`;
      el.classList.toggle('on', st.mode === 'cloud');
      el.classList.toggle('off', st.mode !== 'cloud');
    } else {
      const ready = Offline.isDesktopShell || Offline.ready;
      el.innerHTML = ready
        ? '📦 <span>Sedia offline</span>'
        : '⏳ <span>Menyediakan cache offline…</span>';
      el.classList.toggle('on', ready);
      el.classList.toggle('off', !ready);
    }
  });
}

/* ---------------- Skrin masa ---------------- */

function screenInfo() {
  const day = todayKey();
  if (!state.screen || state.screen.day !== day) {
    state.screen = { day, minutes: 0, bonus: 0 };
    saveState();
  }
  const limit = Number(state.settings.dailyLimitMin) || 0;
  const bonus = Number(state.screen.bonus) || 0;
  const used = Math.round((Number(state.screen.minutes) || 0) * 10) / 10;
  return { day, used, limit, bonus, locked: limit > 0 && used >= limit + bonus };
}

function showScreenLock() {
  openModal(`
    <h3 id="modal-title">⏰ Masa skrin hari ini sudah tamat</h3>
    <p>Rehatkan mata dan lakukan aktiviti lain. Ibu bapa boleh melanjutkan masa dalam Kawasan Ibu Bapa.</p>
    <div class="modal-actions">
      <button class="btn ghost" data-close-modal>Faham</button>
      <button class="btn primary" data-parent>Kawasan Ibu Bapa</button>
    </div>`);
  modalBox.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  modalBox.querySelector('[data-parent]').addEventListener('click', () => {
    closeModal();
    Router.go('parent');
  });
}

/* ---------------- Onboarding ---------------- */

function renderOnboarding() {
  topbar.hidden = true;
  const avatars = ['cili', 'bintang', 'roket', 'bulan', 'hijau', 'buku'];
  view.className = 'onboarding';
  view.innerHTML = `
    <div class="onboard">
      <img class="logo-big" src="./assets/icons/icon-512.png" alt="Logo CILIKVERSE" width="132" height="132" />
      <h1>CILIKVERSE <span style="color:var(--brand)">V.1</span></h1>
      <p class="tagline">Belajar • Berfikir • Bijak Bertindak</p>
      <p class="scope-label">Aplikasi Pendidikan Interaktif untuk Kanak-kanak PPKI 9–12</p>
      <img class="result-mascot" src="./assets/images/cili-mascot-360.png" alt="Maskot CILI, robot comel pembantu pembelajaran" width="140" height="140" style="width:140px;height:140px" />
      <p>Hai! Saya <strong>CILI</strong> 🤖 Selamat datang! Cipta profil ringkas menggunakan <strong>nama panggilan sahaja</strong>. Tiada e-mel, nombor telefon atau akaun media sosial diperlukan.</p>
      <form id="onboard-form">
        <div class="field">
          <label for="nick">Nama panggilan</label>
          <input id="nick" name="nick" maxlength="16" minlength="2" required placeholder="Contoh: Ali, Mala, Cilik88" autocomplete="off" />
          <span class="hint">Jangan guna nama penuh, alamat atau nombor telefon.</span>
        </div>
        <div class="field">
          <label>Pilih avatar</label>
          <div class="avatar-picker" id="avatar-picker">
            ${avatars.map((a, i) => avatarButtonHTML(a, i === 0)).join('')}
          </div>
        </div>
        <div class="privacy-note">
          🔒 Kemajuan disimpan dalam peranti ini sahaja. Semua permainan boleh dimainkan tanpa internet selepas aplikasi dimuatkan.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button class="btn primary" type="submit" style="flex:1;min-width:170px">Mula Belajar</button>
          <button class="btn ghost" type="button" id="guest-btn" style="flex:1;min-width:170px">Teruskan sebagai Tetamu</button>
        </div>
      </form>
      <p class="tiny" style="margin-top:14px">Dengan meneruskan, kamu bersetuju bermain dengan bimbingan ibu bapa atau penjaga.</p>
    </div>`;

  let avatar = 'cili';
  view.querySelectorAll('[data-avatar]').forEach((b) =>
    b.addEventListener('click', () => {
      avatar = b.dataset.avatar;
      view.querySelectorAll('[data-avatar]').forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
    })
  );

  const create = async (name) => {
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    if (clean.length < 2) {
      toast('Sila masukkan nama panggilan sekurang-kurangnya 2 huruf.');
      return;
    }
    state.profile = { name: clean, avatar };
    await saveState(true);
    toast(`Selamat datang, ${clean}! 🎉`);
    Router.go('home');
  };

  view.querySelector('#onboard-form').addEventListener('submit', (e) => {
    e.preventDefault();
    create(view.querySelector('#nick').value);
  });
  view.querySelector('#guest-btn').addEventListener('click', () => create('Kawan'));
}

/* ---------------- Halaman utama ---------------- */

function renderHome() {
  topbar.hidden = false;
  const s = screenInfo();
  const lvl = level();
  const badges = Object.keys(state.badges || {}).length;
  const next = nextGame(state, DATA.games);
  const lockedBanner = s.locked
    ? `<div class="offline-note" style="background:var(--bad-warn,#fff4dc);border-color:#f0dcb0;color:#6b4600">⏰ Masa skrin hari ini sudah tamat. Ibu bapa boleh melanjutkan dalam
       <button class="btn small ghost" data-go="parent" style="margin-left:6px">Kawasan Ibu Bapa</button></div>`
    : '';

  view.className = 'home';
  view.innerHTML = `
    <section class="hero">
      <div class="hero-top">
        <img class="hero-logo" src="./assets/icons/icon-512.png" alt="Logo CILIKVERSE" width="96" height="96" />
        <div>
          <h1 class="hero-title">CILIKVERSE <span>V.1</span></h1>
          <p class="tagline">“Belajar • Berfikir • Bijak Bertindak”</p>
          <p class="scope-label">Aplikasi Pendidikan Interaktif untuk Kanak-kanak PPKI 9–12</p>
        </div>
      </div>
      <p class="hero-desc">90 permainan mini tentang coding, wang dan keselamatan digital — dengan arahan bersuara, contoh demonstrasi dan tahap kesukaran.</p>
      <div class="status-row">
        <span class="status-chip ${Offline.online() ? 'on' : 'off'}" id="home-net"></span>
        <span class="status-chip off" id="home-ai"></span>
        <span class="status-chip" id="home-offline"></span>
      </div>
      <div class="profile-row">
        <span class="avatar" aria-hidden="true">${avatarHTML(state.profile.avatar, 44)}</span>
        <div class="profile-info">
          <div class="profile-name">${esc(state.profile.name || 'Pemain')}</div>
          <div class="profile-level">Tahap ${lvl.level} • ${esc(lvl.title)}</div>
          <div class="xp-bar" role="progressbar" aria-label="XP ke tahap seterusnya" aria-valuenow="${lvl.into}" aria-valuemin="0" aria-valuemax="${lvl.need}"><i style="width:${lvl.pct}%"></i></div>
        </div>
        <div class="profile-stats">
          <div><strong>${state.xp || 0}</strong>XP</div>
          <div><strong>${badges}/${BADGES.length}</strong>Lencana</div>
          <div><strong>${totalStars()}</strong>Bintang</div>
        </div>
        <button class="btn ghost small" data-go="settings">Tukar profil</button>
      </div>
    </section>

    ${lockedBanner}

    <div class="section-head">
      <h2>Pilih dunia pembelajaran</h2>
      <p>${DATA.games.length} permainan mini • 3 modul</p>
    </div>
    <div class="module-grid">
      ${renderModuleCards()}
    </div>

    <div class="quick-actions">
      <button class="action-card" data-go="game/${esc(next ? next.id : 'rc-a1')}">
        <span class="ico">▶️</span>
        <span>Teruskan Pembelajaran<small>${next ? esc(next.title) : 'Mula bermain'}</small></span>
      </button>
      <button class="action-card" data-go="rewards">
        <span class="ico">🏅</span>
        <span>Koleksi Ganjaran<small>Lencana, XP dan bintang</small></span>
      </button>
      <button class="action-card" data-go="settings">
        <span class="ico">⚙️</span>
        <span>Tetapan<small>Bunyi, suara, saiz teks, AI dan data</small></span>
      </button>
      <button class="action-card" data-go="parent">
        <span class="ico">👨‍👩‍👧</span>
        <span>Kawasan Ibu Bapa<small>Masa skrin, AI dan sandaran</small></span>
      </button>
      <button class="action-card" data-go="help">
        <span class="ico">❓</span>
        <span>Soalan Lazim<small>Petunjuk dan panduan offline</small></span>
      </button>
      ${
        Offline.installAvailable
          ? `<button class="action-card" data-action="install"><span class="ico">📲</span><span>Pasang Aplikasi<small>Pasang pada peranti ini</small></span></button>`
          : `<button class="action-card" data-go="help"><span class="ico">📲</span><span>Pasang Aplikasi<small>Lihat cara memasang PWA</small></span></button>`
      }
    </div>

    <div class="cili-greet">
      <img src="./assets/images/cili-avatar-128.png" alt="Maskot CILI" width="74" height="74" />
      <div class="who">
        <strong>Hai, saya CILI!</strong>
        <span>Tekan butang 💡 dalam permainan untuk petunjuk, atau tanya saya di penjuru kanan bawah. Saya sentiasa boleh membantu tanpa internet.</span>
      </div>
      <button class="btn ghost small" data-open-assistant>Tanya CILI</button>
    </div>

    <div class="offline-note">
      ✅ Semua 90 permainan, markah, XP dan kemajuan berfungsi <strong>tanpa internet</strong> selepas aplikasi dimuatkan. AI ialah ciri pilihan sahaja.
    </div>
    <p class="tiny" style="margin-top:14px">CILIKVERSE V.${APP_VERSION.split('.')[0]} — versi ${APP_VERSION} • Bahasa Melayu • PPKI 9–12 tahun • Tiada pembelian dalam aplikasi</p>
  `;
  bindNav();
  updateChips();
}

function renderModuleCards() {
  return Object.values(MODULES)
    .map((m) => {
      const st = moduleStats(state, m.id);
      return `<button class="module-card ${m.id === 'robocilik' ? 'rc' : m.id === 'bijak-wang' ? 'bw' : 'dd'}" data-go="module/${m.id}">
        <span class="module-emoji" aria-hidden="true">${m.icon}</span>
        <h3>${esc(m.name)}</h3>
        <p>${esc(MODULE_DESC[m.id])}</p>
        <span class="module-progress">
          <span class="bar"><i style="width:${st.pct}%"></i></span>
          <span>${st.done}/${st.total} selesai • ${st.stars}/${st.maxStars} ⭐</span>
        </span>
        <span class="go">Main →</span>
      </button>`;
    })
    .join('');
}

/* ---------------- Halaman modul ---------------- */

function renderModule(moduleId) {
  const mod = MODULES[moduleId];
  if (!mod) {
    Router.replace('home');
    return;
  }
  topbar.hidden = false;
  const games = DATA.games.filter((g) => g.module === moduleId);
  const st = moduleStats(state, moduleId);
  const cls = moduleId === 'robocilik' ? 'rc' : moduleId === 'bijak-wang' ? 'bw' : 'dd';
  const cats = [...new Set(games.map((g) => g.category))];

  view.className = 'module-page';
  view.innerHTML = `
    <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
    <section class="module-hero ${cls}">
      <span class="big-emoji" aria-hidden="true">${mod.icon}</span>
      <div>
        <h1>${esc(mod.name)}</h1>
        <p>${esc(MODULE_DESC[moduleId])}</p>
      </div>
      <div class="hero-meta">
        <div><strong>${st.done}/${st.total}</strong>Selesai</div>
        <div><strong>${st.stars}</strong>Bintang</div>
        <div><strong>${st.pct}%</strong>Kemajuan</div>
      </div>
    </section>
    ${cats
      .map((cat) => {
        const list = games.filter((g) => g.category === cat);
        return `<section class="cat-section">
          <div class="cat-head">
            <h2>${esc(cat)}</h2>
            <span class="cat-pill">${list.length} permainan</span>
          </div>
          <div class="game-grid">
            ${list
              .map((g) => {
                const done = state.completed[g.id];
                return `<button class="game-card ${done ? 'done' : ''}" data-go="game/${g.id}" title="${esc(
                  g.instructions
                )}">
                  <span class="game-num">${done ? '✓' : g.num}</span>
                  <span class="game-name">${esc(g.title)}</span>
                  ${starsHTML(done ? done.stars : 0)}
                </button>`;
              })
              .join('')}
          </div>
        </section>`;
      })
      .join('')}
    <div class="offline-note">📚 Modul ini boleh dimainkan tanpa internet. Petunjuk tersedia dalam setiap permainan.</div>
  `;
  bindNav();
}

/* ---------------- Pra-permainan ---------------- */

function renderPregame(gameId) {
  const meta = DATA.games.find((g) => g.id === gameId);
  const def = getGame(gameId);
  if (!meta || !def) {
    Router.replace('home');
    return;
  }
  if (screenInfo().locked) {
    history.replaceState(null, '', '#/home');
    renderHome();
    showScreenLock();
    return;
  }
  topbar.hidden = false;
  const done = state.completed[gameId];
  const mod = MODULES[meta.module];
  const safety =
    meta.module === 'bijak-wang'
      ? '💡 Semua wang dalam permainan ini ialah simulasi pendidikan. Jangan masukkan maklumat bank, kad atau akaun sebenar.'
      : meta.module === 'detektif-digital'
      ? '🛡️ Semua contoh penipuan adalah simulasi selamat. Jangan cuba pautan sebenar. Jika ragu-ragu, beritahu orang dewasa yang dipercayai.'
      : '🤖 Cuba fikir satu langkah pada satu masa. Kamu boleh cuba semula tanpa had.';

  Assistant.setContext(meta);

  const recommended = Math.min(3, 1 + ((done && done.stars >= 2 ? 1 : 0) + (done && done.stars >= 3 ? 1 : 0)));
  let pickedLevel = [1, 2, 3].includes(Number(state.settings.difficulty))
    ? Number(state.settings.difficulty)
    : recommended;

  view.className = 'pregame-page';
  view.innerHTML = `
    <div class="pregame">
      <p class="crumb">${esc(mod.name)} • ${esc(meta.category)} • Permainan ${meta.num}/90</p>
      <h1>${esc(meta.title)}</h1>
      <p class="instr">${esc(meta.instructions)}</p>
      <h3 style="font-size:1rem;margin-top:18px">Cara main</h3>
      <ul class="howto-list">${howToFor(meta.type).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="hint-preview">💡 <strong>Petunjuk:</strong> ${esc(meta.hint)}</div>
      <p class="tiny" style="margin-bottom:16px">${esc(safety)}</p>
      ${
        done
          ? `<p class="tiny">Rekod terbaik kamu: ${starsHTML(done.stars)} • ${done.best}% markah</p>`
          : '<p class="tiny">Belum dimainkan. Cuba sekarang!</p>'
      }
      <fieldset class="diff-box pregame-diff">
        <legend>Pilih tahap kesukaran</legend>
        <div class="diff-seg" role="group" aria-label="Tahap kesukaran">
          ${LEVELS.map(
            (l) => `
            <button type="button" class="diff-btn ${l.level === pickedLevel ? 'active' : ''}" data-pick-diff="${l.level}"
              aria-pressed="${l.level === pickedLevel}">
              <span class="diff-emoji" aria-hidden="true">${l.emoji}</span>
              <strong>${l.name}</strong>
              <span class="diff-desc">${l.desc}</span>
              ${l.level === pickedLevel ? '<span class="diff-tick">✓ Dipilih</span>' : ''}
              ${l.level === recommended && l.level !== pickedLevel ? '<span class="diff-reco">Disyorkan</span>' : ''}
            </button>`
          ).join('')}
        </div>
      </fieldset>
      <div class="pregame-actions">
        <button class="btn primary" id="pregame-start" style="flex:1;min-width:180px">Mula Main ▶</button>
        <button class="btn ghost" id="pregame-demo" style="flex:1;min-width:140px">👀 Tunjuk Cara</button>
        <button class="btn ghost" data-go="module/${meta.module}" style="flex:1;min-width:120px">Kembali</button>
      </div>
      <p class="tiny" style="margin-top:10px">Tekan <strong>Mula Main</strong> untuk membuka skrin permainan. Kamu boleh mendengar arahan, melihat contoh dan menukar tahap di sana.</p>
    </div>`;
  bindNav();

  view.querySelectorAll('[data-pick-diff]').forEach((b) =>
    b.addEventListener('click', () => {
      pickedLevel = Number(b.dataset.pickDiff);
      view.querySelectorAll('[data-pick-diff]').forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        const tick = x.querySelector('.diff-tick');
        if (x === b && !tick) {
          const t = document.createElement('span');
          t.className = 'diff-tick';
          t.textContent = '✓ Dipilih';
          x.appendChild(t);
        } else if (x !== b && tick) {
          tick.remove();
        }
      });
      Sound.click();
    })
  );
  view.querySelector('#pregame-start').addEventListener('click', async () => {
    state.settings.difficulty = pickedLevel;
    await saveState(true);
    Sound.select();
    Router.go(`play/${meta.id}?level=${pickedLevel}`);
  });
  view.querySelector('#pregame-demo').addEventListener('click', () => {
    openDemo({
      def,
      meta,
      level: pickedLevel,
      reduceMotion: !!state.settings.reduceMotion || prefersReducedMotion(),
    });
  });
}

/* ---------------- Bermain ---------------- */

function renderPlay(gameId, query = {}) {
  const meta = DATA.games.find((g) => g.id === gameId);
  const def = getGame(gameId);
  if (!meta || !def) {
    Router.replace('home');
    return;
  }
  if (screenInfo().locked) {
    history.replaceState(null, '', '#/home');
    renderHome();
    showScreenLock();
    return;
  }
  topbar.hidden = true;
  Assistant.setContext(meta);
  const bestStars = (state.completed[gameId] && state.completed[gameId].stars) || 0;
  const recommended = Math.min(3, 1 + (bestStars >= 2 ? 1 : 0) + (bestStars >= 3 ? 1 : 0));
  const picked = Number(query.level) || Number(state.settings.difficulty) || 0;
  const level = [1, 2, 3].includes(picked) ? picked : recommended;

  view.className = 'play-page';
  view.innerHTML = '';
  try {
    Engine.play({
      host: view,
      meta,
      def,
      level,
      state,
      audio: Sound,
      tts: state.settings.sound !== false && state.settings.tts !== false,
      autoSpeak: true,
      reduceMotion: !!state.settings.reduceMotion || prefersReducedMotion(),
      onLevelChange: (lvl) => {
        state.settings.difficulty = lvl;
        saveState();
      },
      onExit: () => {
        Assistant.setContext(null);
        Router.go('module/' + meta.module);
      },
      onFinish: (id, res) => {
        const outcome = recordResult(state, id, {
          stars: res.stars,
          scorePct: res.pct,
          correct: res.correct,
          wrong: Math.max(0, res.rounds - res.correct),
        });
        saveState(true);
        if (outcome.newBadges && outcome.newBadges.length) {
          toast(`Lencana baharu: ${outcome.newBadges.map((b) => b.name).join(', ')} 🏅`, 4500);
        }
        const s = screenInfo();
        if (s.locked) {
          setTimeout(() => toast('Masa skrin hari ini sudah tamat. Ibu bapa boleh melanjutkan masa.', 5000), 1600);
        }
        return { xpGained: outcome.xpGained, newBadges: outcome.newBadges };
      },
    });
  } catch (e) {
    console.error(e);
    topbar.hidden = false;
    view.innerHTML = `<div class="pregame"><h1>Maaf, berlaku masalah</h1>
      <p>Permainan tidak dapat dimulakan. Cuba semula atau pilih permainan lain.</p>
      <div class="error-box">${esc(e.message || String(e))}</div>
      <div class="pregame-actions" style="margin-top:14px">
        <button class="btn primary" data-go="play/${gameId}">Cuba Lagi</button>
        <button class="btn ghost" data-go="module/${meta.module}">Kembali</button>
      </div></div>`;
    bindNav();
  }
}

/* ---------------- Ganjaran ---------------- */

function renderRewards() {
  topbar.hidden = false;
  const lvl = level();
  view.className = 'rewards-page';
  view.innerHTML = `
    <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
    <h1>🏅 Koleksi Ganjaran</h1>
    <p class="tiny">Ganjaran pendidikan sahaja — tiada pembelian, tiada kotak berbayar dan tiada wang sebenar.</p>

    <section class="panel" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <span class="avatar" style="background:#eef6ff" aria-hidden="true">${avatarHTML(state.profile.avatar, 44)}</span>
      <div style="flex:1;min-width:200px">
        <h2 style="margin:0">Tahap ${lvl.level} — ${esc(lvl.title)}</h2>
        <p class="tiny" style="margin:2px 0 6px">${state.xp || 0} XP • ${lvl.into}/${lvl.need} XP ke tahap seterusnya</p>
        <div class="xp-bar" style="background:#e7f0fa"><i style="width:${lvl.pct}%"></i></div>
      </div>
      <div style="text-align:center"><strong style="font-size:1.5rem">${totalStars()}</strong><br><span class="tiny">Bintang</span></div>
      <div style="text-align:center"><strong style="font-size:1.5rem">${Object.keys(state.badges || {}).length}/${BADGES.length}</strong><br><span class="tiny">Lencana</span></div>
    </section>

    <div class="section-head"><h2>Kemajuan modul</h2></div>
    <div class="module-grid">
      ${Object.values(MODULES)
        .map((m) => {
          const st = moduleStats(state, m.id);
          return `<button class="module-card ${m.id === 'robocilik' ? 'rc' : m.id === 'bijak-wang' ? 'bw' : 'dd'}" data-go="module/${m.id}">
            <span class="module-emoji">${m.icon}</span>
            <h3>${esc(m.name)}</h3>
            <span class="module-progress"><span class="bar"><i style="width:${st.pct}%"></i></span>
            <span>${st.done}/${st.total} permainan • ${st.stars}/${st.maxStars} ⭐</span></span>
            <span class="go">Lihat →</span>
          </button>`;
        })
        .join('')}
    </div>

    <div class="section-head"><h2>Lencana</h2><p>${Object.keys(state.badges || {}).length} daripada ${BADGES.length} dibuka</p></div>
    <div class="badge-grid">
      ${BADGES.map((b) => {
        const when = state.badges && state.badges[b.id];
        return `<div class="badge-card ${when ? '' : 'locked'}">
          <span class="ico" aria-hidden="true">${when ? b.icon : '🔒'}</span>
          <div>
            <h3>${esc(b.name)}</h3>
            <p>${esc(b.desc)}</p>
            ${when ? `<span class="when">Dibuka ${formatDate(when)}</span>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
    <p class="tiny" style="margin-top:18px">📌 Tip: main permainan yang belum selesai untuk membuka lencana seterusnya.</p>
  `;
  bindNav();
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(iso).slice(0, 10);
  }
}

/* ---------------- Tetapan ---------------- */

function switchHTML(id, checked, label) {
  return `<button class="switch" id="${id}" role="switch" aria-checked="${checked ? 'true' : 'false'}" aria-label="${esc(
    label
  )}"></button>`;
}

function bindSwitch(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', async () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    el.setAttribute('aria-checked', next ? 'true' : 'false');
    await onChange(next);
    updateChips();
  });
}

function renderSettings() {
  topbar.hidden = false;
  const st = Assistant.status();
  const avatars = ['cili', 'bintang', 'roket', 'bulan', 'hijau', 'buku'];
  view.className = 'settings-page';
  view.innerHTML = `
    <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
    <h1>⚙️ Tetapan</h1>

    <section class="panel">
      <h2>Profil pemain</h2>
      <div class="field">
        <label for="set-name">Nama panggilan (bukan nama penuh)</label>
        <input id="set-name" maxlength="16" value="${esc(state.profile.name || '')}" autocomplete="off" />
        <span class="hint">Nama ini disimpan dalam peranti sahaja.</span>
      </div>
      <div class="field">
        <label>Avatar</label>
        <div class="avatar-picker" id="set-avatars" style="justify-content:flex-start">
          ${avatars.map((a) => avatarButtonHTML(a, state.profile.avatar === a)).join('')}
        </div>
      </div>
      <button class="btn primary small" id="save-profile">Simpan Profil</button>
    </section>

    <section class="panel">
      <h2>Bunyi & paparan</h2>
      <div class="setting-row">
        <div class="lbl"><strong>Bunyi</strong><span>Bunyi butang, jawapan dan kemenangan.</span></div>
        ${switchHTML('sw-sound', state.settings.sound, 'Bunyi')}
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Suara arahan</strong><span>Baca arahan, pilihan dan jawapan dengan lantang. Suara Bahasa Melayu sahaja; suara Indonesia tidak digunakan.</span></div>
        ${switchHTML('sw-tts', state.settings.tts, 'Suara arahan')}
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Suara Bahasa Melayu</strong><span>Pilih suara yang paling jelas pada peranti ini. Automatik mengutamakan Melayu Malaysia.</span></div>
        <div class="field" style="margin:0;min-width:220px">
          <label for="speech-voice">Pilihan suara</label>
          <select id="speech-voice" aria-label="Pilih suara Bahasa Melayu" ${Speech.getMalayVoices().length ? '' : 'disabled'}>${speechVoiceOptions()}</select>
        </div>
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Laju suara</strong><span>Pilih kelajuan bacaan yang selesa.</span></div>
        <div class="seg" id="speech-seg">
          <button data-rate="0.8" class="${Number(state.settings.speechRate) < 0.88 ? 'active' : ''}">Perlahan</button>
          <button data-rate="0.92" class="${Number(state.settings.speechRate) >= 0.88 && Number(state.settings.speechRate) <= 1 ? 'active' : ''}">Biasa</button>
          <button data-rate="1.1" class="${Number(state.settings.speechRate) > 1 ? 'active' : ''}">Laju</button>
        </div>
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Uji suara</strong><span id="tts-state">${esc(Speech.statusText())}</span></div>
        <button class="btn small ghost" id="tts-test">🔊 Cuba suara</button>
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Animasi dikurangkan</strong><span>Kurangkan gerakan untuk pengalaman lebih tenang.</span></div>
        ${switchHTML('sw-motion', state.settings.reduceMotion, 'Animasi dikurangkan')}
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Saiz teks</strong><span>Semasa: ${fontScaleLabel(state.settings.fontScale)}</span></div>
        <div class="seg" id="font-seg">
          <button data-scale="1" class="${state.settings.fontScale <= 1 ? 'active' : ''}">Biasa</button>
          <button data-scale="1.15" class="${state.settings.fontScale > 1 && state.settings.fontScale < 1.3 ? 'active' : ''}">Sederhana</button>
          <button data-scale="1.3" class="${state.settings.fontScale >= 1.3 ? 'active' : ''}">Besar</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Pembantu AI (pilihan)</h2>
      <div class="setting-row">
        <div class="lbl"><strong>Benarkan AI awan</strong><span>Status: ${esc(st.label)}. Pembantu setempat CILI sentiasa tersedia tanpa internet.</span></div>
        ${switchHTML('sw-ai', state.settings.aiEnabled, 'Benarkan AI awan')}
      </div>
      <p class="tiny" style="margin-top:8px">
        AI awan hanya berfungsi jika ibu bapa mengkonfigurasi backend sendiri dalam Kawasan Ibu Bapa. Tiada kunci API disimpan dalam aplikasi.
        AI tidak menerima nama profil atau rekod kemajuan. Jika tiada internet, aplikasi menggunakan FAQ dan petunjuk setempat.
      </p>
      <button class="btn ghost small" data-go="parent">Tetapan AI dalam Kawasan Ibu Bapa →</button>
    </section>

    <section class="panel">
      <h2>Aplikasi & storan</h2>
      <div class="setting-row">
        <div class="lbl"><strong>Versi aplikasi</strong><span>CILIKVERSE V.1 • ${APP_VERSION}</span></div>
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Mod offline</strong><span id="cache-state">${Offline.isDesktopShell ? 'Aplikasi desktop setempat' : Offline.ready ? 'Cache offline aktif' : 'Cache sedang disediakan'}</span></div>
        <button class="btn small ghost" id="cache-check">Semak cache</button>
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Pasang aplikasi</strong><span>${
          Offline.installAvailable
            ? 'Boleh dipasang pada peranti ini.'
            : 'Gunakan menu pelayar: "Install app" / "Pasang aplikasi".'
        }</span></div>
        ${Offline.installAvailable ? '<button class="btn small primary" id="install-now">Pasang</button>' : ''}
      </div>
      <div class="setting-row">
        <div class="lbl"><strong>Kemas kini</strong><span>Semak versi baharu tanpa memadam kemajuan.</span></div>
        <button class="btn small ghost" id="check-update">Semak</button>
      </div>
      <button class="btn ghost small" data-go="parent">Sandaran & reset dalam Kawasan Ibu Bapa →</button>
    </section>

    <section class="panel">
      <h2>Bantuan & privasi</h2>
      <p class="tiny">Tiada data kanak-kanak dihantar ke pelayan. Kemajuan disimpan dalam peranti ini. Semua transaksi wang ialah simulasi. Tiada pautan luar yang diperlukan untuk bermain.</p>
      <button class="btn ghost small" data-go="help">Buka Soalan Lazim →</button>
    </section>
  `;
  bindNav();

  bindSwitch('sw-sound', async (v) => {
    state.settings.sound = v;
    Sound.setEnabled(v);
    Speech.setEnabled(v && state.settings.tts !== false);
    if (v) Sound.click();
    await saveState();
  });
  const speechVoiceSelect = view.querySelector('#speech-voice');
  speechVoiceSelect.addEventListener('change', async () => {
    state.settings.speechVoice = speechVoiceSelect.value;
    Speech.setVoice(speechVoiceSelect.value);
    await saveState();
    refreshSpeechControls();
    toast(Speech.hasMalayVoice() ? 'Suara Melayu dikemas kini. Tekan “Cuba suara” untuk mendengarnya.' : Speech.statusText());
  });

  bindSwitch('sw-tts', async (v) => {
    state.settings.tts = v;
    Speech.setEnabled(v && state.settings.sound !== false);
    await saveState();
    if (!v) {
      toast('Suara arahan dimatikan. Bunyi butang tetap berfungsi.');
    } else if (!Speech.hasMalayVoice()) {
      toast(Speech.statusText());
    } else {
      Speech.speak('Selamat datang ke CILIKVERSE. Pilih modul dan tekan Mula Belajar.');
      toast('Suara arahan dihidupkan.');
    }
  });
  view.querySelectorAll('#speech-seg button').forEach((b) =>
    b.addEventListener('click', async () => {
      state.settings.speechRate = Number(b.dataset.rate);
      Speech.setRate(state.settings.speechRate);
      await saveState();
      renderSettings();
      Speech.speak('Ini contoh bacaan. Pilih kelajuan yang paling selesa.');
    })
  );
  view.querySelector('#tts-test').addEventListener('click', () => {
    if (!Speech.available()) {
      toast('Peranti atau pelayar ini tidak menyokong bacaan suara.');
      return;
    }
    if (state.settings.sound === false || state.settings.tts === false) {
      toast('Hidupkan Bunyi dan Suara arahan dahulu.');
      return;
    }
    if (!Speech.hasMalayVoice()) {
      toast(Speech.statusText());
      return;
    }
    Speech.speak('Sebut nilai wang ini: RM1.00, RM2.00, RM5.00, RM10 dan RM50.00. Nilai sen: RM1.50, RM0.20, RM0.10, RM0.05 dan RM0.01. Kemudian tekan Semak.');
  });
  bindSwitch('sw-motion', async (v) => {
    state.settings.reduceMotion = v;
    applyAccessibility(state.settings);
    await saveState();
  });
  bindSwitch('sw-ai', async (v) => {
    state.settings.aiEnabled = v;
    Assistant.refreshStatus();
    await saveState();
    toast(v ? 'AI awan dibenarkan (jika dikonfigurasi).' : 'AI awan dimatikan. Bantuan setempat masih berfungsi.');
  });

  view.querySelectorAll('#font-seg button').forEach((b) =>
    b.addEventListener('click', async () => {
      state.settings.fontScale = Number(b.dataset.scale);
      applyAccessibility(state.settings);
      await saveState();
      renderSettings();
    })
  );

  let avatar = state.profile.avatar;
  view.querySelectorAll('#set-avatars [data-avatar]').forEach((b) =>
    b.addEventListener('click', () => {
      avatar = b.dataset.avatar;
      view.querySelectorAll('#set-avatars [data-avatar]').forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
    })
  );
  view.querySelector('#save-profile').addEventListener('click', async () => {
    const name = view.querySelector('#set-name').value.trim().replace(/\s+/g, ' ').slice(0, 16);
    if (name.length < 2) {
      toast('Nama panggilan terlalu pendek.');
      return;
    }
    state.profile = { ...state.profile, name, avatar };
    await saveState(true);
    toast('Profil disimpan.');
    renderSettings();
  });

  const cacheBtn = document.getElementById('cache-check');
  if (cacheBtn)
    cacheBtn.addEventListener('click', async () => {
      const info = await Offline.cacheInfo();
      const el = document.getElementById('cache-state');
      if (info.ready) {
        el.textContent = `Cache offline aktif (${info.keys ? (await caches.keys()).filter((k) => k.startsWith('cilikverse-')).join(', ') : 'versi semasa'})`;
        toast('✅ Fail teras telah dicache. Permainan boleh dimainkan tanpa internet.');
      } else {
        el.textContent = 'Cache belum siap';
        toast('⚠️ Cache belum lengkap. Buka aplikasi sekali dengan internet, kemudian semak semula.');
      }
    });

  const installBtn = document.getElementById('install-now');
  if (installBtn)
    installBtn.addEventListener('click', async () => {
      const ok = await Offline.install();
      if (!ok) toast('Pemasangan tidak diteruskan. Gunakan menu pelayar untuk memasang.');
    });
  document.getElementById('check-update').addEventListener('click', async () => {
    await Offline.checkUpdate();
    if (!updateBanner.hidden) toast('Versi baharu ditemui. Tekan "Muat semula" untuk mengemas kini.');
    else toast('Aplikasi sudah menggunakan versi terbaru yang tersedia.');
  });
}

/* ---------------- Kawasan ibu bapa ---------------- */

async function hashPin(pin) {
  const text = 'cilikverse-parent:' + pin;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 0;
    for (let i = 0; i < text.length; i += 1) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return 'fallback-' + (h >>> 0).toString(16);
  }
}

function renderParent() {
  topbar.hidden = false;
  const hasPin = !!state.settings.parentPinHash;
  view.className = 'parent-page';
  if (!parentUnlocked) {
    view.innerHTML = `
      <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
      <div class="pregame" style="max-width:560px">
        <h1>👨‍👩‍👧 Kawasan Ibu Bapa</h1>
        <p class="tiny">Kawasan ini mengawal AI, masa skrin dan data kemajuan. PIN hanyalah penghalang mudah untuk kanak-kanak — ia bukan keselamatan setaraf akaun profesional. Jangan gunakan PIN bank atau PIN penting yang lain.</p>
        ${
          hasPin
            ? `<form id="pin-form">
                <div class="field"><label for="pin">Masukkan PIN 4 digit</label>
                <input id="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" style="letter-spacing:8px;max-width:200px" />
                </div>
                <button class="btn primary" type="submit">Buka</button>
              </form>
              <p class="tiny" id="pin-err" style="color:var(--bad)"></p>`
            : `<p>Belum ada PIN. Anda boleh menetapkan PIN dalam kawasan ini, atau teruskan tanpa PIN.</p>
               <button class="btn primary" id="no-pin-enter">Teruskan tanpa PIN</button>`
        }
      </div>`;
    bindNav();
    if (hasPin) {
      view.querySelector('#pin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = view.querySelector('#pin').value;
        const hash = await hashPin(pin);
        if (hash === state.settings.parentPinHash) {
          parentUnlocked = true;
          renderParent();
        } else {
          view.querySelector('#pin-err').textContent = 'PIN tidak betul. Cuba lagi.';
        }
      });
    } else {
      view.querySelector('#no-pin-enter').addEventListener('click', () => {
        parentUnlocked = true;
        renderParent();
      });
    }
    return;
  }

  const s = screenInfo();
  const used = Math.round(s.used);
  view.innerHTML = `
    <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
    <h1>👨‍👩‍👧 Kawasan Ibu Bapa</h1>
    <p class="tiny">Semua tetapan di sini disimpan dalam peranti ini sahaja.</p>

    <section class="panel">
      <h2>⏰ Masa skrin</h2>
      <p class="tiny">Hari ini: <strong>${used} minit</strong>${s.limit ? ` daripada had ${s.limit} minit` : ' (tiada had)'}${s.bonus ? ` + ${s.bonus} minit lanjutan` : ''}</p>
      <div class="field">
        <label for="limit">Had harian</label>
        <select id="limit">
          ${[0, 15, 30, 45, 60, 90, 120]
            .map((v) => `<option value="${v}" ${s.limit === v ? 'selected' : ''}>${v === 0 ? 'Tiada had' : v + ' minit'}</option>`)
            .join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary small" id="save-limit">Simpan had</button>
        ${s.locked ? '<button class="btn ghost small" id="extend">Lanjutkan 15 minit</button>' : ''}
      </div>
    </section>

    <section class="panel">
      <h2>🤖 AI pilihan</h2>
      <div class="setting-row">
        <div class="lbl"><strong>Benarkan AI awan</strong><span>Jika dimatikan, hanya bantuan setempat digunakan.</span></div>
        ${switchHTML('sw-parent-ai', state.settings.aiEnabled, 'Benarkan AI awan')}
      </div>
      <div class="field" style="margin-top:12px">
        <label for="ai-endpoint">URL backend AI (pilihan)</label>
        <input id="ai-endpoint" type="url" placeholder="https://contoh-worker.workers.dev/cilik" value="${esc(
          state.settings.aiEndpoint || ''
        )}" />
        <span class="hint">Mesti URL HTTPS milik anda sendiri (cloud function/Worker). Tiada kunci API boleh dimasukkan di sini. Kosongkan untuk mematikan AI awan.</span>
      </div>
      <p class="tiny">Had ${15} soalan AI awan sehari. Apabila had habis atau tiada internet, CILI beralih automatik kepada bantuan setempat. Aliran data: soalan + topik umum sahaja; tiada nama profil atau kemajuan dihantar. Semak dasar privasi penyedia AI anda sebelum mengaktifkan. Lihat <code>docs/AI-SETUP.md</code> dalam pakej aplikasi.</p>
      <button class="btn primary small" id="save-ai">Simpan tetapan AI</button>
    </section>

    <section class="panel">
      <h2>🔐 PIN ibu bapa</h2>
      <p class="tiny">PIN menghalang kanak-kanak menukar tetapan secara tidak sengaja. Ia bukan sistem keselamatan profesional dan mudah dipintas jika peranti dikongsi. Jangan gunakan PIN penting.</p>
      <div class="field">
        <label for="new-pin">${hasPin ? 'Tukar PIN (4 digit)' : 'Tetapkan PIN (4 digit)'}</label>
        <input id="new-pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="••••" style="letter-spacing:8px;max-width:160px" />
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary small" id="save-pin">${hasPin ? 'Tukar PIN' : 'Tetapkan PIN'}</button>
        ${hasPin ? '<button class="btn danger small" id="remove-pin">Buang PIN</button>' : ''}
      </div>
    </section>

    <section class="panel">
      <h2>💾 Data & sandaran</h2>
      <p class="tiny">Kemajuan boleh disandarkan ke fail dan dipulihkan kemudian. Fail sandaran mengandungi nama panggilan, markah dan tetapan — simpan dengan selamat.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary small" id="export-btn">Sandarkan kemajuan</button>
        <button class="btn ghost small" id="import-btn">Pulihkan daripada fail</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden />
      </div>
      <p class="tiny" id="storage-result" style="margin-top:10px"></p>
      <div class="setting-row" style="margin-top:10px">
        <div class="lbl"><strong>Semak storan</strong><span>Pastikan kemajuan benar-benar dapat disimpan pada peranti.</span></div>
        <button class="btn ghost small" id="health-btn">Semak</button>
      </div>
      <div class="error-box" style="margin-top:18px">
        <strong>⚠️ Zon bahaya: Reset kemajuan</strong>
        <p style="margin:6px 0 10px;color:inherit">Semua markah, XP, lencana, profil dan tetapan akan dipadam dari peranti ini. Tindakan ini tidak boleh dibatalkan.</p>
        <button class="btn danger small" id="reset-btn">Reset semua kemajuan…</button>
      </div>
    </section>

    <section class="panel">
      <h2>ℹ️ Maklumat</h2>
      <p class="meta-list">
        Versi aplikasi: <code>CILIKVERSE V.1 (${APP_VERSION})</code><br>
        Storan: IndexedDB dengan sandaran localStorage<br>
        Offline: ${Offline.isDesktopShell ? 'ya (aplikasi desktop)' : Offline.ready ? 'cache aktif' : 'sedang disediakan'}<br>
        AI awan: ${state.settings.aiEndpoint ? (state.settings.aiEnabled ? 'dikonfigurasi' : 'dikonfigurasi tetapi dimatikan') : 'tidak dikonfigurasi (bantuan setempat digunakan)'}<br>
        Lencana dibuka: ${Object.keys(state.badges || {}).length}/${BADGES.length}
      </p>
      <button class="btn ghost small" data-go="help">Buka panduan ibu bapa →</button>
    </section>
  `;
  bindNav();

  bindSwitch('sw-parent-ai', async (v) => {
    state.settings.aiEnabled = v;
    Assistant.refreshStatus();
    await saveState();
    renderParent();
  });

  view.querySelector('#save-limit').addEventListener('click', async () => {
    state.settings.dailyLimitMin = Number(view.querySelector('#limit').value) || 0;
    await saveState(true);
    toast('Had masa skrin disimpan.');
    renderParent();
  });
  const extend = view.querySelector('#extend');
  if (extend)
    extend.addEventListener('click', async () => {
      state.screen.bonus = (Number(state.screen.bonus) || 0) + 15;
      await saveState(true);
      toast('Masa skrin dilanjutkan 15 minit.');
      renderParent();
    });

  view.querySelector('#save-ai').addEventListener('click', async () => {
    const url = view.querySelector('#ai-endpoint').value.trim();
    if (url) {
      try {
        const u = new URL(url);
        const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
        if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) {
          toast('URL mesti menggunakan HTTPS (atau localhost untuk ujian).');
          return;
        }
      } catch (e) {
        toast('URL tidak sah.');
        return;
      }
    }
    state.settings.aiEndpoint = url || null;
    await saveState(true);
    Assistant.refreshStatus();
    toast(url ? 'Endpoint AI disimpan. Had 15 soalan/hari.' : 'AI awan dimatikan; bantuan setempat digunakan.');
    renderParent();
  });

  view.querySelector('#save-pin').addEventListener('click', async () => {
    const pin = view.querySelector('#new-pin').value;
    if (!/^\d{4}$/.test(pin)) {
      toast('PIN mesti tepat 4 digit.');
      return;
    }
    state.settings.parentPinHash = await hashPin(pin);
    await saveState(true);
    toast('PIN disimpan.');
    renderParent();
  });
  const rmPin = view.querySelector('#remove-pin');
  if (rmPin)
    rmPin.addEventListener('click', () => {
      confirmDialog({
        title: 'Buang PIN?',
        body: 'Kawasan ibu bapa akan boleh dibuka tanpa PIN.',
        confirmLabel: 'Buang PIN',
        danger: true,
        onConfirm: async () => {
          state.settings.parentPinHash = null;
          await saveState(true);
          toast('PIN dibuang.');
          renderParent();
        },
      });
    });

  view.querySelector('#export-btn').addEventListener('click', async () => {
    try {
      const json = await Store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cilikverse-sandaran-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('Fail sandaran dimuat turun.');
    } catch (e) {
      toast('Gagal mencipta sandaran.');
    }
  });
  view.querySelector('#import-btn').addEventListener('click', () => view.querySelector('#import-file').click());
  view.querySelector('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      state = await Store.importJSON(text);
      initSoundFromSettings(state.settings);
      Speech.init(state.settings);
      applyAccessibility(state.settings);
      toast('Kemajuan berjaya dipulihkan.');
      renderParent();
    } catch (err) {
      toast('Fail sandaran tidak sah. Kemajuan semasa tidak diubah.');
    }
    e.target.value = '';
  });
  view.querySelector('#health-btn').addEventListener('click', async () => {
    const ok = await Store.healthCheck();
    view.querySelector('#storage-result').textContent = ok
      ? '✅ Storan berfungsi: kemajuan boleh disimpan pada peranti ini.'
      : '⚠️ Storan tidak dapat ditulis. Kemajuan mungkin hilang selepas aplikasi ditutup. Cuba gunakan pelayar lain atau kosongkan ruang storan.';
  });
  view.querySelector('#reset-btn').addEventListener('click', () => {
    openModal(`
      <h3 id="modal-title">⚠️ Reset semua kemajuan?</h3>
      <p>Semua markah, XP, lencana, profil dan tetapan akan dipadam. Tindakan ini <strong>tidak boleh dibatalkan</strong>.</p>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:.85rem;margin:10px 0">
        <input type="checkbox" id="reset-check" style="margin-top:3px" />
        <span>Saya faham dan mahu memadam semua data kemajuan dalam peranti ini.</span>
      </label>
      <div class="modal-actions">
        <button class="btn ghost" data-cancel>Batal</button>
        <button class="btn danger" data-ok disabled>Reset Sekarang</button>
      </div>`);
    const check = modalBox.querySelector('#reset-check');
    const ok = modalBox.querySelector('[data-ok]');
    check.addEventListener('change', () => (ok.disabled = !check.checked));
    modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
    ok.addEventListener('click', async () => {
      state = await Store.reset();
      parentUnlocked = false;
      initSoundFromSettings(state.settings);
      Speech.init(state.settings);
      applyAccessibility(state.settings);
      closeModal();
      toast('Semua kemajuan telah dipadam.');
      Router.go('home');
    });
  });
}

/* ---------------- Bantuan ---------------- */

function renderHelp() {
  topbar.hidden = false;
  view.className = 'help-page';
  const faq = DATA.faq.items || [];
  view.innerHTML = `
    <p><button class="btn ghost small" data-go="home">← Halaman Utama</button></p>
    <h1>❓ Soalan Lazim & Bantuan</h1>

    <section class="panel">
      <h2>Bermain tanpa internet</h2>
      <p>Selepas aplikasi dibuka sekali, fail teras dan semua permainan disimpan dalam cache peranti. Kamu boleh menutup internet dan terus bermain. Status "Sedia offline" pada halaman utama menunjukkan cache sudah lengkap.</p>
      <p class="tiny">Nota jujur: jika ini kali pertama membuka aplikasi dan cache belum siap, sambungan internet diperlukan sekali untuk memuatkan fail.</p>
    </section>

    <section class="panel">
      <h2>Pasang aplikasi (PWA)</h2>
      <ul class="howto-list">
        <li><strong>Windows (Edge/Chrome):</strong> buka menu pelayar → "App" / "Aplikasi" → "Install this site as an app".</li>
        <li><strong>Android (Chrome):</strong> menu ⋮ → "Add to Home screen" / "Install app".</li>
        <li><strong>iPhone/iPad (Safari):</strong> butang Kongsi → "Add to Home Screen".</li>
        <li>Selepas dipasang, ikon CILIKVERSE muncul seperti aplikasi biasa dan boleh dibuka tanpa internet.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Keselamatan kanak-kanak</h2>
      <ul class="howto-list">
        <li>Gunakan nama panggilan sahaja. Jangan beri nama penuh, alamat atau nombor telefon.</li>
        <li>Aplikasi tidak meminta kata laluan, nombor kad atau maklumat bank sebenar.</li>
        <li>Semua wang dalam Bijak Wang Junior ialah simulasi pendidikan.</li>
        <li>Jika seseorang dalam talian membuatkan kamu tidak selamat: berhenti, simpan bukti dan beritahu ibu bapa, guru atau penjaga. Talian kecemasan Malaysia: <strong>999</strong>.</li>
        <li>AI (jika diaktifkan) boleh tersalah dan tidak menggantikan bimbingan orang dewasa.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Soalan lazim</h2>
      ${faq
        .map(
          (f) => `<details style="border-bottom:1px solid #edf3fa;padding:10px 0">
            <summary style="font-weight:800;cursor:pointer">${esc(f.q)}</summary>
            <p style="margin:8px 0 0;font-size:.9rem">${esc(f.a)}</p>
          </details>`
        )
        .join('')}
    </section>

    <section class="panel">
      <h2>Untuk ibu bapa & guru</h2>
      <p class="tiny">Kemajuan disimpan setempat (IndexedDB). Gunakan Kawasan Ibu Bapa untuk menetapkan had masa skrin, mengawal AI, membuat sandaran dan mereset data. Tiada iklan, tiada pembelian dalam aplikasi dan tiada pendaftaran akaun.</p>
      <button class="btn ghost small" data-go="parent">Buka Kawasan Ibu Bapa</button>
    </section>
  `;
  bindNav();
}

/* ---------------- Navigasi & acara global ---------------- */

function bindNav() {
  view.querySelectorAll('[data-go]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', () => Router.go(el.dataset.go));
  });
  view.querySelectorAll('[data-action="install"]').forEach((el) =>
    el.addEventListener('click', () => Offline.install())
  );
  view.querySelectorAll('[data-open-assistant]').forEach((el) =>
    el.addEventListener('click', () => Assistant.open())
  );
}

function setupChrome() {
  document.getElementById('brand-home').addEventListener('click', () => Router.go('home'));

  document.getElementById('update-btn').addEventListener('click', () => {
    const ok = Offline.applyUpdate();
    if (!ok) location.reload();
  });
  document.getElementById('update-dismiss').addEventListener('click', () => {
    updateBanner.hidden = true;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal && modalBox.querySelector('[data-cancel]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      if (modalBox.querySelector('[data-cancel]') || modalBox.querySelector('[data-close-modal]')) closeModal();
    }
  });

  Offline.init({
    onNet: () => updateChips(),
    onUpdateChips: () => updateChips(),
    onReady: () => updateChips(),
    onInstall: () => {
      if (Router.current.name === 'home') renderHome();
      updateChips();
    },
    onToast: (m) => toast(m),
    onUpdateAvailable: () => {
      updateBanner.hidden = false;
    },
  });

  Assistant.init({
    faq: DATA.faq,
    games: DATA.games,
    getState: () => state,
    toast,
  });

  // Kira masa skrin: +0.5 minit setiap 30 saat aplikasi aktif.
  setInterval(() => {
    if (document.hidden) return;
    if (!state || !state.profile || !state.profile.name) return;
    const before = screenInfo();
    state.screen.minutes = Math.round(((Number(state.screen.minutes) || 0) + 0.5) * 10) / 10;
    saveState();
    const after = screenInfo();
    if (!before.locked && after.locked) {
      toast('Masa skrin hari ini sudah tamat. Ibu bapa boleh melanjutkan dalam Kawasan Ibu Bapa.', 5000);
      if (Router.current.name !== 'play') renderRoute(Router.current);
    }
  }, 30000);

  // Pastikan tulisan terakhir tidak hilang apabila tab ditutup.
  const flush = () => {
    if (state) Store.flush();
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
}

/* ---------------- Penghala ---------------- */

function renderRoute(route) {
  if (!state) return;
  updateChips();
  if (route.name !== 'parent') parentUnlocked = false;
  if (route.name !== 'game' && route.name !== 'play') Assistant.setContext(null);

  if (!state.profile.name) {
    renderOnboarding();
    return;
  }
  switch (route.name) {
    case 'home':
      renderHome();
      break;
    case 'module':
      renderModule(route.param);
      break;
    case 'game':
      renderPregame(route.param);
      break;
    case 'play':
      renderPlay(route.param, route.query || {});
      break;
    case 'rewards':
      renderRewards();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'parent':
      renderParent();
      break;
    case 'help':
      renderHelp();
      break;
    default:
      Router.replace('home');
  }
}

/* ---------------- Permulaan ---------------- */

async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Gagal memuatkan ${path} (${res.status})`);
  return res.json();
}

async function boot() {
  try {
    state = await Store.load();
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    initSoundFromSettings(state.settings);
    Speech.init(state.settings);
    applyAccessibility(state.settings);
    const [games, faq] = await Promise.all([fetchJSON('./data/games.json'), fetchJSON('./data/faq.json')]);
    DATA = { games: games.games || [], faq };
    if (!DATA.games.length) throw new Error('Tiada data permainan.');
    setupChrome();
    Router.onRoute(renderRoute);
    Router.start();
  } catch (e) {
    console.error(e);
    const offlineHint = navigator.onLine === false;
    view.innerHTML = `
      <div class="boot">
        <img src="./assets/icons/icon-192.png" alt="" width="72" height="72" style="border-radius:16px" />
        <h1>CILIKVERSE V.1</h1>
        <p>${
          offlineHint
            ? 'Aplikasi belum selesai menyimpan fail untuk kegunaan offline. Sambungkan internet sekali, buka semula aplikasi, kemudian semua permainan boleh dimainkan tanpa internet.'
            : 'Aplikasi tidak dapat dimulakan.'
        }</p>
        <div class="error-box">${esc(e.message || String(e))}</div>
        <p style="margin-top:14px"><button class="btn primary" onclick="location.reload()">Cuba Lagi</button></p>
        <p class="tiny">Jika masalah berterusan, pastikan semua fail projek dimuat naik dengan lengkap (termasuk folder data, js dan css).</p>
      </div>`;
  }
}

boot();
