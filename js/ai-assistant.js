// Pembantu pembelajaran CILI.
// - Sentiasa menyediakan bantuan setempat (FAQ + petunjuk) tanpa internet.
// - AI awan adalah PILIHAN sahaja: tiada kunci API dalam aplikasi, had harian,
//   dan perlu dikonfigurasi oleh ibu bapa melalui backend sendiri (lihat worker/).
// - Tiada nama profil atau rekod kemajuan dihantar kepada penyedia AI.

import { esc } from './shared.js';
import { Store, todayKey } from './storage.js';
import { howToFor } from './engine.js';

export const CLOUD_DAILY_LIMIT = 15;

const UNSAFE_REPLY = [
  /https?:\/\//i,
  /www\./i,
  /<script/i,
  /klik pautan (ini|tersebut)/i,
];

const PERSONAL_RE =
  /(\b\d{7,}\b)|([\w.+-]+@[\w-]+\.[\w.]+)|(nombor (telefon|kad|bank) saya)|(alamat (rumah|sekolah) saya)/i;

const WELCOME = `<strong>Hai! Saya CILI 🤖</strong><br>Saya boleh memberi <em>petunjuk</em> untuk permainan dan menjelaskan konsep coding, wang dan keselamatan digital. Cuba tanya soalan seperti "Bagaimana mengira baki wang?"`;

export const Assistant = {
  faq: [],
  games: [],
  contextGame: null,
  messages: 0,
  initialized: false,
  cloudBusy: false,

  init({ faq, games, getState, toast }) {
    this.faq = (faq && faq.items) || [];
    this.games = games || [];
    this.getState = getState;
    this.toast = toast || (() => {});
    if (this.initialized) return;
    this.initialized = true;

    this.panel = document.getElementById('assistant-panel');
    this.log = document.getElementById('assistant-log');
    this.form = document.getElementById('assistant-form');
    this.input = document.getElementById('assistant-input');
    this.fab = document.getElementById('assistant-fab');
    this.statusEl = document.getElementById('assistant-status');
    this.quick = document.getElementById('assistant-quick');

    this.fab.addEventListener('click', () => this.toggle());
    document.getElementById('assistant-close').addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = this.input.value.trim();
      if (!q) return;
      this.input.value = '';
      this.ask(q);
    });

    const quickQ = [
      'Bagaimana mengira baki wang?',
      'Apakah maksud coding?',
      'Bagaimana mengenali mesej penipuan?',
      'Mengapa perlu menjaga maklumat peribadi?',
    ];
    this.quick.innerHTML = quickQ.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    this.quick.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => this.ask(b.dataset.q))
    );

    this.log.innerHTML = '';
    this.addBot(WELCOME, false);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.hidden) this.close();
    });
  },

  setContext(meta) {
    this.contextGame = meta || null;
    this.refreshStatus();
  },

  status() {
    const s = this.getState && this.getState();
    const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (!s) return { mode: 'local', label: 'Teman setempat' };
    if (!s.settings.aiEnabled) return { mode: 'off', label: 'Dimatikan' };
    if (s.settings.aiEndpoint) {
      if (!online) return { mode: 'cloud-offline', label: 'Tidak tersedia (offline)' };
      const used = s.ai && s.ai.day === todayKey() ? s.ai.usesToday : 0;
      if (used >= CLOUD_DAILY_LIMIT) return { mode: 'cloud-limit', label: 'Had AI hari ini dicapai' };
      return { mode: 'cloud', label: 'Tersedia (awan)' };
    }
    return { mode: 'local', label: 'Teman setempat' };
  },

  refreshStatus() {
    if (!this.statusEl) return;
    const st = this.status();
    const map = {
      cloud: 'AI awan sedia • had ' + CLOUD_DAILY_LIMIT + ' soalan/hari',
      off: 'AI awan dimatikan • bantuan setempat masih aktif',
      'cloud-offline': 'Tiada internet • menggunakan jawapan setempat',
      'cloud-limit': 'Had AI hari ini habis • menggunakan jawapan setempat',
      local: 'Teman setempat • berfungsi tanpa internet',
    };
    this.statusEl.textContent = map[st.mode] || map.local;
  },

  toggle() {
    if (this.panel.hidden) this.open();
    else this.close();
  },

  open() {
    this.panel.hidden = false;
    this.refreshStatus();
    this.input.focus();
  },

  close() {
    this.panel.hidden = true;
    this.fab.focus();
  },

  addBot(html, reportable = true, source = 'Teman setempat') {
    const el = document.createElement('div');
    el.className = 'msg bot';
    el.innerHTML = `<div class="msg-body">${html}</div><div class="tiny" style="margin-top:6px;opacity:.7">${
      source === 'cloud' ? 'AI awan (pilihan)' : 'Jawapan setempat'
    }</div>`;
    if (reportable) {
      const btn = document.createElement('button');
      btn.className = 'report-link';
      btn.type = 'button';
      btn.textContent = 'Laporkan jawapan tidak sesuai';
      btn.addEventListener('click', () => {
        try {
          localStorage.setItem('cilikverse-last-report', new Date().toISOString());
        } catch (e) {
          /* abaikan */
        }
        this.toast('Terima kasih. Laporan disimpan pada peranti ini untuk semakan ibu bapa.');
      });
      el.appendChild(btn);
    }
    this.log.appendChild(el);
    this.log.scrollTop = this.log.scrollHeight;
  },

  addUser(text) {
    const el = document.createElement('div');
    el.className = 'msg user';
    el.textContent = text;
    this.log.appendChild(el);
    this.log.scrollTop = this.log.scrollHeight;
  },

  addTyping() {
    const el = document.createElement('div');
    el.className = 'msg bot typing';
    el.id = 'assistant-typing';
    el.textContent = 'CILI sedang berfikir…';
    this.log.appendChild(el);
    this.log.scrollTop = this.log.scrollHeight;
  },

  removeTyping() {
    const t = document.getElementById('assistant-typing');
    if (t) t.remove();
  },

  localAnswer(question) {
    const ql = question.toLowerCase();
    const ctx = this.contextGame;
    const asksHelp = /(permainan ini|macam mana|bagaimana.*(main|selesai|jawab)|buntu|petunjuk|hint|stuck)/i.test(ql);

    if (ctx && asksHelp) {
      const howto = howToFor(ctx.type).map((x) => `<li>${esc(x)}</li>`).join('');
      return `<strong>Petunjuk untuk "${esc(ctx.title)}"</strong><br>
        <span>${esc(ctx.instructions)}</span>
        <ul class="howto-inline">${howto}</ul>
        <span>💡 ${esc(ctx.hint || '')}</span><br>
        <em>Cuba dahulu — kamu boleh tekan "Ulang Permainan" jika perlu.</em>`;
    }

    let best = null;
    let bestScore = 0;
    for (const item of this.faq) {
      let score = 0;
      for (const k of item.keywords || []) {
        if (ql.includes(k.toLowerCase())) score += k.split(' ').length * 2;
      }
      const qWords = String(item.q || '').toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      for (const w of qWords) if (ql.includes(w)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (best && bestScore >= 2) {
      return `<strong>${esc(best.q)}</strong><br>${esc(best.a)}`;
    }

    const tips = [
      'Bagaimana mengira baki wang?',
      'Apakah maksud coding?',
      'Bagaimana mengenali mesej penipuan?',
      'Mengapa perlu menjaga maklumat peribadi?',
    ];
    return `Saya belum pasti maksud soalan itu. Cuba tanya dengan lebih khusus, contohnya: <em>"${esc(
      tips[(this.messages = (this.messages + 1) % tips.length)]
    )}"</em>.<br><br>Jika ini tentang keselamatan, berhenti berinteraksi dan beritahu ibu bapa atau guru.`;
  },

  async ask(question) {
    const q = String(question || '').trim().slice(0, 200);
    if (!q) return;
    this.addUser(q);
    const state = this.getState && this.getState();
    this.refreshStatus();

    // Perlindungan privasi: jangan proses maklumat peribadi.
    if (PERSONAL_RE.test(q)) {
      this.addBot(
        'Saya tidak memerlukan maklumat peribadi seperti nombor telefon, alamat atau e-mel. Sila jangan taip maklumat itu di sini. Jika seseorang meminta maklumat tersebut, berhenti dan beritahu ibu bapa atau penjaga.',
        false
      );
      return;
    }

    const st = this.status();
    if (st.mode === 'cloud' && state) {
      this.addTyping();
      this.cloudBusy = true;
      try {
        const answer = await this.callCloud(q, state);
        this.removeTyping();
        this.cloudBusy = false;
        if (answer && answer.ok) {
          this.addBot(answer.text, true, 'cloud');
          return;
        }
        if (answer && answer.limited) {
          this.addBot(
            `Had AI percuma hari ini (${CLOUD_DAILY_LIMIT} soalan) telah dicapai. Ini jawapan setempat: <br><br>${this.localAnswer(q)}`,
            false
          );
          return;
        }
        this.addBot(
          `AI awan tidak dapat dihubungi. Ini jawapan setempat: <br><br>${this.localAnswer(q)}`,
          false
        );
        return;
      } catch (e) {
        this.removeTyping();
        this.cloudBusy = false;
        this.addBot(`AI awan tidak tersedia sekarang. Ini jawapan setempat: <br><br>${this.localAnswer(q)}`, false);
        return;
      }
    }

    if (st.mode === 'cloud-limit') {
      this.addBot(
        `<em>Had AI percuma hari ini (${CLOUD_DAILY_LIMIT} soalan) telah dicapai.</em><br><br>${this.localAnswer(q)}`,
        false
      );
      return;
    }
    if (st.mode === 'cloud-offline') {
      this.addBot(
        `<em>Tiada internet sekarang — menggunakan bantuan setempat.</em><br><br>${this.localAnswer(q)}`,
        false
      );
      return;
    }
    if (st.mode === 'off') {
      this.addBot(
        `<em>AI awan dimatikan oleh ibu bapa. Bantuan setempat masih aktif.</em><br><br>${this.localAnswer(q)}`,
        false
      );
      return;
    }

    this.addBot(this.localAnswer(q), false);
  },

  async callCloud(question, state) {
    const endpoint = String(state.settings.aiEndpoint || '').trim();
    if (!endpoint) return null;
    let url;
    try {
      url = new URL(endpoint);
      const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    } catch (e) {
      return null;
    }

    const day = todayKey();
    if (!state.ai || state.ai.day !== day) state.ai = { day, usesToday: 0, totalUses: state.ai?.totalUses || 0 };
    if (state.ai.usesToday >= CLOUD_DAILY_LIMIT) return { limited: true };
    state.ai.usesToday += 1;
    state.ai.totalUses = (state.ai.totalUses || 0) + 1;
    Store.save(state);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: {
            ageGroup: '9-12',
            language: 'ms',
            topic: this.contextGame ? this.contextGame.module : 'umum',
          },
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return { ok: false };
      const data = await res.json();
      let text = String(data.answer || '').trim();
      if (!text) return { ok: false };
      // Penapisan: buang HTML, pautan dan kandungan tidak sesuai.
      text = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/https?:\/\/\S+/gi, '[pautan dibuang]')
        .slice(0, 900);
      for (const re of UNSAFE_REPLY) if (re.test(text)) return { ok: false };
      if (/bunuh|dadah|senjata|kad kredit|password sebenar/i.test(text)) return { ok: false };
      return { ok: true, text: esc(text).replace(/\n/g, '<br>') };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false };
    }
  },
};
