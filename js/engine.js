// Enjin permainan CILIKVERSE.
// Menyokong 8 jenis interaksi: choice, sort, match, multi, groups, numpad, budget, code.
// Setiap pusingan disemak secara logik sebenar, diberi markah, dan permainan mempunyai
// keadaan tamat + cuba semula. Tiada kebergantungan rangkaian.

import { esc, starsFor, clamp } from './shared.js';
import { parseMap, runProgram } from './maze.js';
import { Speech, speechRoundLines } from './speech.js';
import { openDemo } from './demo.js';

const registry = new Map();

export function registerGame(def) {
  if (!def || !def.id) throw new Error('Definisi permainan tidak sah');
  registry.set(def.id, def);
}

export function getGame(id) {
  return registry.get(id) || null;
}

export function getAllGames() {
  return [...registry.values()];
}

const HOWTO = {
  choice: ['Baca soalan dengan teliti.', 'Pilih satu jawapan.', 'Tekan Semak.'],
  sort: ['Susun item menggunakan butang naik dan turun.', 'Tekan Semak apabila selesai.'],
  match: ['Pilih satu kad di sebelah kiri.', 'Kemudian pilih pasangannya di sebelah kanan.', 'Padanan yang betul akan dikunci.'],
  multi: ['Pilih semua jawapan yang betul.', 'Kamu boleh memilih lebih daripada satu jawapan.', 'Tekan Semak.'],
  groups: ['Pilih kumpulan yang betul untuk setiap item.', 'Semak pilihan kamu.', 'Tekan Semak.'],
  numpad: ['Taip jumlah menggunakan papan nombor.', 'Contoh: 3.50 bermaksud tiga ringgit lima puluh sen.', 'Tekan Semak.'],
  budget: ['Pilih barang yang kamu perlukan.', 'Pastikan jumlahnya tidak melebihi bajet.', 'Tekan Semak.'],
  code: [
    'Tekan arahan untuk menambahkannya ke dalam program.',
    'Robot bergerak satu petak bagi setiap arahan.',
    'Kutip semua bintang dan sampai ke bendera.',
    'Tekan Jalankan untuk melihat robot bergerak.',
  ],
};

export function howToFor(kind) {
  return HOWTO[kind] || HOWTO.choice;
}

// Tahap kesukaran yang boleh dipilih oleh kanak-kanak (atau ibu bapa/guru).
export const LEVELS = [
  { level: 1, name: 'Mudah', emoji: '🌱', desc: 'Langkah kecil, lebih banyak bantuan.' },
  { level: 2, name: 'Sederhana', emoji: '🌟', desc: 'Cabaran biasa untuk terus maju.' },
  { level: 3, name: 'Sukar', emoji: '🚀', desc: 'Cabaran tinggi untuk yang sudah mahir.' },
];

export function levelName(n) {
  const found = LEVELS.find((l) => l.level === Number(n));
  return found ? found.name : 'Mudah';
}

// Pujian positif — tiada hukuman, tiada kata negatif.
const PRAISE = [
  'Hebat! Kamu berjaya.',
  'Syabas! Kamu berusaha dengan baik.',
  'Bagus! Kamu semakin pandai.',
  'Tepat sekali. Teruskan usaha.',
  'Pandai! Teruskan mencuba.',
];
const ENCOURAGE = [
  'Tak mengapa. Cuba lagi.',
  'Hampir betul. Cuba sekali lagi.',
  'Usaha yang baik. Teruskan mencuba.',
  'Tak mengapa. Kita belajar daripada cubaan.',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const plain = (v) =>
  String(v || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

const safe = (o) => (o && o.html ? o.html : esc(o && o.label != null ? o.label : ''));

class Session {
  constructor(opts) {
    this.opts = opts;
    this.host = opts.host;
    this.meta = opts.meta;
    this.def = opts.def;
    this.level = clamp(Number(opts.level) || 1, 1, 3);
    this.state = opts.state;
    this.audio = opts.audio;
    this.reduceMotion = !!opts.reduceMotion;
    this.tts = opts.tts !== false;
    this.started = false;
    this.autoSpeak = opts.autoSpeak !== false;
    this.praiseLogged = [];
    this.lastFeedbackPromise = Promise.resolve(false);
    this.idx = 0;
    this.scores = [];
    this.finished = false;
    this.round = null;
    this.checkFn = null;
    this.checked = false;
    this.showingResult = false;
    this.codeTimer = null;
    this.buildRounds();
    // Rujukan sesi pada elemen host (digunakan oleh ujian automatik dan penyahpepijatan).
    this.host.__session = this;
    this.renderStart();
  }

  buildRounds() {
    const ctx = { used: new Set() };
    let rounds = [];
    if (this.def.type === 'mixed') {
      const inst = this.def.generate(this.level, ctx);
      rounds = inst.rounds;
    } else {
      // Tahap menambah/mengurangkan bilangan pusingan supaya setiap permainan
      // (termasuk yang menggunakan bank soalan tetap) benar-benar berbeza kesukarannya.
      const base = this.def.rounds || 5;
      const n = Math.max(2, Math.min(6, base + (this.level - 2)));
      for (let i = 0; i < n; i += 1) rounds.push(this.def.generate(this.level, ctx));
    }
    if (!rounds || !rounds.length) throw new Error('Tiada pusingan dijana untuk ' + this.def.id);
    this.rounds = rounds;
  }

  // ---------- SKRIN MULA (sebelum pusingan pertama) ----------
  renderStart() {
    const { host, meta } = this;
    this.started = false;
    const lvl = this.level;
    host.innerHTML = `
      <div class="game-wrap start-wrap">
        <div class="game-top">
          <button class="icon-btn" data-act="exit" aria-label="Kembali" title="Kembali">←</button>
          <div class="game-prog">
            <div class="bar"><i style="width:0%"></i></div>
            <span class="prog-txt">Belum bermain</span>
          </div>
          <span class="level-chip" data-level-chip>${LEVELS[lvl - 1].emoji} ${LEVELS[lvl - 1].name}</span>
        </div>
        <div class="start-card">
          <div class="start-top">
            <img class="start-mascot" src="./assets/images/cili-mascot-360.png" alt="Maskot CILI" width="96" height="96" />
            <div>
              <span class="chip chip-mod">${esc(this.def.badgeLabel || '')} • ${this.rounds.length} pusingan</span>
              <h1 class="start-title">${esc(meta.title)}</h1>
              <p class="start-instr">${esc(meta.instructions)}</p>
            </div>
          </div>

          <div class="start-howto">
            <strong>🎯 Cara main:</strong>
            <ul>${howToFor(meta.type).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>

          <fieldset class="diff-box">
            <legend>Pilih tahap kesukaran</legend>
            <div class="diff-seg" role="group" aria-label="Tahap kesukaran">
              ${LEVELS.map(
                (l) => `
                <button type="button" class="diff-btn ${l.level === lvl ? 'active' : ''}" data-diff="${l.level}"
                  aria-pressed="${l.level === lvl}">
                  <span class="diff-emoji" aria-hidden="true">${l.emoji}</span>
                  <strong>${l.name}</strong>
                  <span class="diff-desc">${l.desc}</span>
                  ${l.level === lvl ? '<span class="diff-tick">✓ Dipilih</span>' : ''}
                </button>`
              ).join('')}
            </div>
            <p class="tiny">Boleh tukar tahap bila-bila masa sebelum mula. Ibu bapa/guru juga boleh membantu memilih.</p>
          </fieldset>

          <div class="start-actions">
            <button class="btn primary big" data-start>▶ Mula</button>
            <button class="btn ghost" data-start-demo>👀 Tunjuk Cara</button>
            <button class="btn ghost" data-start-say>🔊 Dengar Arahan</button>
          </div>
          <p class="tiny start-tip">💡 Tekan <strong>Mula</strong> apabila sudah bersedia. Tiada had masa dan kamu boleh cuba semula.</p>
          <p class="tiny" data-voice-note hidden></p>
        </div>
      </div>`;

    this.updateVoiceNote();
    host.querySelector('[data-act="exit"]').addEventListener('click', () => this.opts.onExit());
    host.querySelectorAll('[data-diff]').forEach((b) =>
      b.addEventListener('click', () => {
        const n = Number(b.dataset.diff);
        if (n === this.level) return;
        this.setLevel(n);
      })
    );
    host.querySelector('[data-start]').addEventListener('click', () => this.begin());
    host.querySelector('[data-start-demo]').addEventListener('click', () => this.showDemo());
    host.querySelector('[data-start-say]').addEventListener('click', () => {
      this.audio && this.audio.click();
      const note = this.host.querySelector('[data-voice-note]');
      if (!this.tts) {
        if (note) {
          note.hidden = false;
          note.textContent = '🔇 Suara dimatikan. Ibu bapa boleh menghidupkannya dalam Tetapan → Suara arahan.';
        }
        return;
      }
      if (note) note.hidden = true;
      this.say(this.startSpeech(true)).then((ok) => {
        if (!ok) this.updateVoiceNote();
      });
    });
  }

  startSpeech(withHowTo = false) {
    const lvl = LEVELS[this.level - 1];
    let text = `Selamat datang ke permainan ${this.meta.title}. Tahap ${lvl.name}. ${this.meta.instructions}`;
    if (withHowTo) text += ' Cara main: ' + howToFor(this.meta.type).join(' ');
    text += ' Tekan Mula untuk bermain.';
    return text;
  }

  updateVoiceNote() {
    const note = this.host.querySelector('[data-voice-note]');
    if (!note) return;
    if (this.tts && !Speech.hasMalayVoice()) {
      note.hidden = false;
      note.textContent = `${Speech.statusText()} Arahan bertulis masih tersedia.`;
    } else {
      note.hidden = true;
    }
  }

  begin() {
    this.audio && this.audio.select();
    this.started = true;
    this.renderShell();
    this.showRound(0);
    if (this.autoSpeak && this.tts) {
      setTimeout(async () => {
        if (!this.started || this.finished) return;
        await this.speakGameInstructions();
        if (this.started && !this.finished) await this.speakRoundContent();
      }, 380);
    }
  }

  setLevel(n) {
    this.level = clamp(Number(n) || 1, 1, 3);
    this.buildRounds();
    this.praiseLogged = [];
    if (this.opts.onLevelChange) {
      try {
        this.opts.onLevelChange(this.level);
      } catch (e) {
        /* abaikan */
      }
    }
    this.audio && this.audio.click();
    this.renderStart();
    const chip = this.host.querySelector('[data-level-chip]');
    if (chip) chip.textContent = `${LEVELS[this.level - 1].emoji} ${LEVELS[this.level - 1].name}`;
  }

  // ---------- AUDIO ARAHAN & JAWAPAN ----------
  say(text, opts = {}) {
    if (!this.tts) return Promise.resolve(false);
    return Speech.speak(text, opts);
  }

  speakGameInstructions() {
    const text = `${this.meta.instructions} Cara main: ${howToFor(this.meta.type).join(' ')}`;
    return this.say(text);
  }

  async speakRoundContent() {
    if (!this.tts || !Speech.enabled || !Speech.hasMalayVoice()) return false;
    const lines = speechRoundLines(this.round);
    if (!lines.length) return false;
    return this.say(lines.join(' ').slice(0, 500));
  }

  speakFeedback(kind, reveal = '', explain = '') {
    if (!this.started) return Promise.resolve(false);
    let text;
    if (kind === 'correct') text = pick(PRAISE);
    else if (kind === 'partial') text = 'Bagus, hampir betul! Teruskan usaha.';
    else text = pick(ENCOURAGE);
    // Pujian/galakan dibacakan; jawapan sebenar dan penerangan kekal pada skrin sahaja.
    this.praiseLogged.push({ kind, text });
    if (this.praiseLogged.length > 50) this.praiseLogged.shift();
    return this.say(text);
  }

  replayRound() {
    if (!this.started || this.finished || this.running || this.showingResult) return;
    this.audio && this.audio.click();
    Speech.stop();
    this.showRound(this.idx);
    this.speakRoundContent();
  }

  showDemo() {
    Speech.stop();
    this.audio && this.audio.click();
    openDemo({
      def: this.def,
      meta: this.meta,
      level: this.level,
      reduceMotion: this.reduceMotion,
      onClose: () => {
        if (this.started && !this.finished) {
          const first = this.host.querySelector('[data-act="say"]');
          if (first) first.focus({ preventScroll: true });
        }
      },
    });
  }

  renderShell() {
    const { host, meta } = this;
    host.innerHTML = `
      <div class="game-wrap">
        <div class="game-top">
          <button class="icon-btn" data-act="exit" aria-label="Keluar dari permainan" title="Keluar">←</button>
          <div class="game-prog">
            <div class="bar"><i data-prog style="width:0%"></i></div>
            <span class="prog-txt" data-progtxt>Pusingan 1/${this.rounds.length}</span>
          </div>
          <button class="icon-btn" data-act="hint" aria-label="Petunjuk" title="Petunjuk">💡</button>
        </div>
        <div class="game-head">
          <span class="chip chip-mod">${esc(this.def.badgeLabel || '')}</span>
          <span class="level-chip" data-level-chip>${LEVELS[this.level - 1].emoji} ${LEVELS[this.level - 1].name}</span>
          <h2 class="game-title">${esc(meta.title)}</h2>
          <p class="game-instr">${esc(meta.instructions)}</p>
        </div>
        <div class="game-tools" role="group" aria-label="Bantuan audio dan contoh">
          <button type="button" class="tool-btn" data-act="say">🔊 Arahan &amp; Soalan</button>
          <button type="button" class="tool-btn" data-act="demo">👀 Tunjuk Cara</button>
          <button type="button" class="tool-btn" data-act="replay">🔁 Ulang</button>
        </div>
        <p class="tiny" data-voice-note hidden></p>
        <div class="hint-box" data-hint hidden></div>
        <div class="round-area" data-round tabindex="-1"></div>
        <div class="feedback" data-fb hidden aria-live="polite"></div>
        <div class="game-actions">
          <button class="btn ghost" data-act="exit2">Keluar</button>
          <button class="btn primary" data-act="check" data-check>Semak</button>
          <button class="btn primary" data-act="next" data-next hidden>Seterusnya →</button>
        </div>
        <div class="game-foot">
          <span data-score>Markah: 0%</span>
          <span>•</span>
          <span data-roundscore>0/${this.rounds.length} betul</span>
        </div>
      </div>`;
    this.updateVoiceNote();
    this.$ = (sel) => host.querySelector(sel);
    this.roundBox = this.$('[data-round]');
    this.fb = this.$('[data-fb]');

    host.querySelector('[data-act="exit"]').addEventListener('click', () => this.requestExit());
    host.querySelector('[data-act="exit2"]').addEventListener('click', () => this.requestExit());
    host.querySelector('[data-act="hint"]').addEventListener('click', () => this.toggleHint());
    host.querySelector('[data-act="check"]').addEventListener('click', () => this.check());
    host.querySelector('[data-act="next"]').addEventListener('click', () => this.next());
    host.querySelector('[data-act="say"]').addEventListener('click', () => {
      this.audio && this.audio.click();
      if (!this.tts) {
        this.fb.hidden = false;
        this.fb.className = 'feedback hintish';
        this.fb.innerHTML = '<strong>🔇 Suara dimatikan. Ibu bapa boleh menghidupkannya dalam Tetapan → Suara arahan.</strong>';
        return;
      }
      this.speakGameInstructions().then(async (ok) => {
        if (ok && this.started && !this.finished) await this.speakRoundContent();
        else this.updateVoiceNote();
      });
    });
    host.querySelector('[data-act="demo"]').addEventListener('click', () => this.showDemo());
    host.querySelector('[data-act="replay"]').addEventListener('click', () => this.replayRound());
  }

  toggleHint() {
    const box = this.$('[data-hint]');
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    const bits = [this.meta.hint, this.round && this.round.hint].filter(Boolean);
    box.innerHTML = `<strong>💡 Petunjuk CILI:</strong> ${esc(bits.join(' '))}`;
    box.hidden = false;
    this.audio && this.audio.click();
  }

  requestExit() {
    if (this.cleanupHandlers) this.cleanupHandlers();
    if (this.codeTimer) clearTimeout(this.codeTimer);
    if (this.finished || this.idx === 0) {
      this.started = false;
      Speech.stop();
      return this.opts.onExit();
    }
    const overlay = h('div', 'modal-overlay');
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="exit-title">
        <h3 id="exit-title">Keluar sekarang?</h3>
        <p>Markah pusingan ini belum disimpan. Kamu boleh cuba semula nanti.</p>
        <div class="modal-actions">
          <button class="btn ghost" data-no>Terus Bermain</button>
          <button class="btn danger" data-yes>Keluar</button>
        </div>
      </div>`;
    this.host.appendChild(overlay);
    overlay.querySelector('[data-no]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-yes]').addEventListener('click', () => {
      this.started = false;
      Speech.stop();
      overlay.remove();
      this.opts.onExit();
    });
    overlay.querySelector('[data-no]').focus();
  }

  showRound(i) {
    if (this.cleanupHandlers) this.cleanupHandlers();
    if (this.codeTimer) clearTimeout(this.codeTimer);
    this.idx = i;
    this.round = this.rounds[i];
    this.checked = false;
    this.checkFn = null;
    this.attempts = 0;
    this.fb.hidden = true;
    this.fb.className = 'feedback';
    this.$('[data-next]').hidden = true;
    const check = this.$('[data-check]');
    check.hidden = false;
    check.disabled = false;
    check.textContent = this.round.kind === 'code' ? '▶ Jalankan' : 'Semak';
    this.$('[data-hint]').setAttribute('aria-label', 'Petunjuk');
    const pct = Math.round((this.scores.reduce((a, b) => a + b, 0) / this.rounds.length) * 100);
    this.$('[data-prog]').style.width = `${(i / this.rounds.length) * 100}%`;
    this.$('[data-progtxt]').textContent = `Pusingan ${i + 1}/${this.rounds.length}`;
    this.$('[data-score]').textContent = `Markah: ${pct}%`;
    const correct = this.scores.filter((s) => s >= 0.999).length;
    this.$('[data-roundscore]').textContent = `${correct}/${this.rounds.length} tepat`;
    this.roundBox.innerHTML = '';
    this.roundBox.focus({ preventScroll: true });

    const fn = {
      choice: () => this.renderChoice(),
      sort: () => this.renderSort(),
      match: () => this.renderMatch(),
      multi: () => this.renderMulti(),
      groups: () => this.renderGroups(),
      numpad: () => this.renderNumpad(),
      budget: () => this.renderBudget(),
      code: () => this.renderCode(),
    }[this.round.kind];
    if (!fn) {
      this.roundBox.innerHTML = '<p>Jenis permainan tidak dikenali.</p>';
      return;
    }
    fn.call(this);
  }

  prompt(extra = '') {
    return `<p class="round-prompt">${esc(this.round.prompt)}</p>${extra}`;
  }

  // ---------- CHOICE ----------
  renderChoice() {
    const r = this.round;
    this.roundBox.innerHTML = `${this.prompt(r.html || '')}
      <div class="choices" role="group" aria-label="Pilihan jawapan">
        ${r.options
          .map(
            (o, i) =>
              `<button class="choice-btn" data-i="${i}" type="button"><span class="choice-letter">${String.fromCharCode(
                65 + i
              )}</span><span class="choice-body">${safe(o)}</span></button>`
          )
          .join('')}
      </div>`;
    let sel = null;
    const btns = [...this.roundBox.querySelectorAll('.choice-btn')];
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked && this.checked !== 'pending') return;
        btns.forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        sel = Number(b.dataset.i);
        this.audio && this.audio.select();
      })
    );
    this.checkFn = () => {
      if (sel == null) return { needSelect: 'Pilih satu jawapan dahulu.' };
      this.checked = true;
      const opt = r.options[sel];
      btns.forEach((b, i) => {
        b.classList.add('locked');
        if (r.options[i].correct) b.classList.add('correct');
        if (i === sel && !opt.correct) b.classList.add('wrong');
      });
      const correctText = (r.options.find((o) => o.correct) || {}).label || '';
      return {
        correct: !!opt.correct,
        fraction: opt.correct ? 1 : 0,
        reveal: r.options.find((o) => o.correct)?.html || esc(correctText),
      };
    };
  }

  // ---------- NUMPAD ----------
  renderNumpad() {
    const r = this.round;
    this.roundBox.innerHTML = `${this.prompt(r.html || '')}
      <div class="numpad-wrap">
        <div class="amount-display" data-display aria-live="polite">RM <span>0.00</span></div>
        <div class="numpad" role="group" aria-label="Papan kekunci angka">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}
          <button type="button" data-k=".">.</button>
          <button type="button" data-k="0">0</button>
          <button type="button" data-k="back" aria-label="Hapus satu">⌫</button>
        </div>
      </div>`;
    let input = '';
    const disp = this.roundBox.querySelector('[data-display] span');
    const update = () => {
      disp.textContent = input === '' ? '0.00' : input;
    };
    const press = (k) => {
      if (this.checked) return;
      if (k === 'back') input = input.slice(0, -1);
      else if (k === '.') {
        if (!input.includes('.')) input = (input || '0') + '.';
      } else if (input.replace('.', '').length < 7) input += k;
      if (input.replace('.', '').length > 1 && input.startsWith('0') && !input.startsWith('0.'))
        input = input.replace(/^0+/, '');
      update();
      this.audio && this.audio.click();
    };
    this.roundBox.querySelectorAll('[data-k]').forEach((b) =>
      b.addEventListener('click', () => press(b.dataset.k))
    );
    const keyHandler = (e) => {
      if (this.checked) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === '.') press('.');
      else if (e.key === 'Backspace') {
        e.preventDefault();
        press('back');
      }
    };
    document.addEventListener('keydown', keyHandler);
    this.cleanupHandlers = () => document.removeEventListener('keydown', keyHandler);

    this.checkFn = () => {
      if (!input || Number(input) === 0) return { needSelect: 'Taip jumlah wang dahulu.' };
      this.checked = true;
      const sen = Math.round(Number(input) * 100);
      const correct = sen === r.answer;
      return {
        correct,
        fraction: correct ? 1 : 0,
        reveal: r.prefix + (r.answer / 100).toFixed(2),
      };
    };
  }

  // ---------- SORT ----------
  renderSort() {
    const r = this.round;
    const items = r.items.map((it) => ({ ...it }));
    this.roundBox.innerHTML = `${this.prompt()}<div class="sort-list" data-list></div>`;
    const list = this.roundBox.querySelector('[data-list]');
    const draw = () => {
      list.innerHTML = items
        .map(
          (it, i) => `
        <div class="sort-row" data-id="${esc(it.id)}">
          <span class="sort-num">${i + 1}</span>
          <span class="sort-lab">${safe(it)}</span>
          <span class="sort-btns">
            <button type="button" data-up="${i}" aria-label="Naikkan ${esc(it.label || '')}" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" data-down="${i}" aria-label="Turunkan ${esc(it.label || '')}" ${
              i === items.length - 1 ? 'disabled' : ''
            }>↓</button>
          </span>
        </div>`
        )
        .join('');
      list.querySelectorAll('[data-up]').forEach((b) =>
        b.addEventListener('click', () => {
          if (this.checked) return;
          const i = Number(b.dataset.up);
          if (i > 0) {
            [items[i - 1], items[i]] = [items[i], items[i - 1]];
            this.audio && this.audio.click();
            draw();
          }
        })
      );
      list.querySelectorAll('[data-down]').forEach((b) =>
        b.addEventListener('click', () => {
          if (this.checked) return;
          const i = Number(b.dataset.down);
          if (i < items.length - 1) {
            [items[i + 1], items[i]] = [items[i], items[i + 1]];
            this.audio && this.audio.click();
            draw();
          }
        })
      );
    };
    draw();
    this.checkFn = () => {
      this.checked = true;
      const current = items.map((i) => i.id);
      const correct = current.length === r.answer.length && current.every((v, i) => v === r.answer[i]);
      list.querySelectorAll('.sort-row').forEach((row, i) => {
        row.classList.add(row.dataset.id === r.answer[i] ? 'correct' : 'wrong');
      });
      return {
        correct,
        fraction: correct ? 1 : 0,
        reveal: r.answer
          .map((id) => {
            const it = r.items.find((x) => x.id === id);
            return it ? esc(it.label || '') : '';
          })
          .join(' → '),
      };
    };
  }

  // ---------- MATCH ----------
  renderMatch() {
    const r = this.round;
    let selLeft = null;
    const matched = new Set();
    let mistakes = 0;
    this.roundBox.innerHTML = `${this.prompt()}
      <div class="match-wrap">
        <div class="match-col" data-left>
          <p class="col-title">Kad</p>
          ${r.left
            .map(
              (l) => `<button type="button" class="match-card" data-id="${esc(l.id)}" data-side="l">${safe(l)}</button>`
            )
            .join('')}
        </div>
        <div class="match-col" data-right>
          <p class="col-title">Padanan</p>
          ${r.right
            .map(
              (rr, i) =>
                `<button type="button" class="match-card" data-match="${esc(rr.match)}" data-side="r" data-i="${i}">${safe(
                  rr
                )}</button>`
            )
            .join('')}
        </div>
      </div>
      <p class="match-status" data-mstatus>Padanan: 0/${r.left.length}</p>`;

    const leftBtns = [...this.roundBox.querySelectorAll('[data-side="l"]')];
    const rightBtns = [...this.roundBox.querySelectorAll('[data-side="r"]')];
    const status = this.roundBox.querySelector('[data-mstatus]');

    const finishRound = (fraction) => {
      this.checked = true;
      this.scores[this.idx] = Math.max(this.scores[this.idx] || 0, fraction);
      this.audio && (fraction >= 1 ? this.audio.correct() : this.audio.click());
      this.showFeedback(fraction >= 0.999 ? 'correct' : 'partial', fraction, r.explain, '');
      this.$('[data-check]').hidden = true;
      this.$('[data-next]').hidden = false;
      this.$('[data-next]').textContent =
        this.idx + 1 >= this.rounds.length ? 'Lihat Keputusan →' : 'Seterusnya →';
    };

    leftBtns.forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked || b.classList.contains('done')) return;
        leftBtns.forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        selLeft = b;
        this.audio && this.audio.select();
      })
    );
    rightBtns.forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked || b.classList.contains('done')) return;
        if (!selLeft) {
          status.textContent = 'Pilih kad di sebelah kiri dahulu.';
          return;
        }
        if (b.dataset.match === selLeft.dataset.id) {
          b.classList.add('done', 'correct');
          selLeft.classList.add('done', 'correct');
          selLeft.classList.remove('selected');
          matched.add(b.dataset.match);
          selLeft = null;
          status.textContent = `Padanan: ${matched.size}/${r.left.length}`;
          this.audio && this.audio.correct();
          if (matched.size === r.left.length) {
            setTimeout(() => finishRound(mistakes === 0 ? 1 : mistakes < r.left.length ? 0.6 : 0.3), 250);
          }
        } else {
          mistakes += 1;
          b.classList.add('wrong');
          selLeft.classList.add('wrong');
          const cur = selLeft;
          setTimeout(() => {
            b.classList.remove('wrong');
            cur.classList.remove('wrong');
          }, 550);
          this.audio && this.audio.wrong();
          status.textContent = 'Bukan padanan yang betul. Cuba lagi.';
        }
      })
    );
    this.checkFn = null;
    this.$('[data-check]').hidden = true;
  }

  // ---------- MULTI ----------
  renderMulti() {
    const r = this.round;
    this.roundBox.innerHTML = `${this.prompt()}
      <div class="multi-grid" role="group" aria-label="Pilih semua jawapan betul">
        ${r.items
          .map(
            (it, i) =>
              `<button type="button" class="multi-card" data-i="${i}" aria-pressed="false"><span class="tick">✓</span>${safe(
                it
              )}</button>`
          )
          .join('')}
      </div>
      <p class="tiny">Pilih semua yang betul, kemudian tekan Semak.</p>`;
    const btns = [...this.roundBox.querySelectorAll('.multi-card')];
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked) return;
        b.classList.toggle('selected');
        b.setAttribute('aria-pressed', b.classList.contains('selected') ? 'true' : 'false');
        this.audio && this.audio.select();
      })
    );
    this.checkFn = () => {
      const selected = btns.map((b) => b.classList.contains('selected'));
      if (!selected.some(Boolean)) return { needSelect: 'Pilih sekurang-kurangnya satu jawapan.' };
      this.checked = true;
      const correct = r.items.every((it, i) => !!it.correct === selected[i]);
      btns.forEach((b, i) => {
        b.classList.add('locked');
        if (r.items[i].correct) b.classList.add('correct');
        else if (selected[i]) b.classList.add('wrong');
      });
      return { correct, fraction: correct ? 1 : 0, reveal: '' };
    };
  }

  // ---------- GROUPS ----------
  renderGroups() {
    const r = this.round;
    this.roundBox.innerHTML = `${this.prompt()}
      <div class="groups-head">${r.groups.map((g) => `<span class="group-pill">${esc(g.label)}</span>`).join('')}</div>
      <div class="groups-list">
        ${r.items
          .map(
            (it, i) => `
          <div class="group-row" data-item="${i}">
            <span class="group-lab">${safe(it)}</span>
            <span class="group-btns">
              ${r.groups
                .map(
                  (g) =>
                    `<button type="button" data-g="${esc(g.id)}" data-i="${i}" aria-pressed="false">${esc(g.label)}</button>`
                )
                .join('')}
            </span>
          </div>`
          )
          .join('')}
      </div>`;
    const chosen = new Array(r.items.length).fill(null);
    this.roundBox.querySelectorAll('.group-btns button').forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked) return;
        const i = Number(b.dataset.i);
        chosen[i] = b.dataset.g;
        this.roundBox
          .querySelectorAll(`.group-row[data-item="${i}"] button`)
          .forEach((x) => {
            x.classList.toggle('selected', x === b);
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
        this.audio && this.audio.select();
      })
    );
    this.checkFn = () => {
      if (chosen.some((c) => !c)) return { needSelect: 'Tetapkan kumpulan untuk setiap item dahulu.' };
      this.checked = true;
      let ok = true;
      r.items.forEach((it, i) => {
        const row = this.roundBox.querySelector(`.group-row[data-item="${i}"]`);
        const good = chosen[i] === it.group;
        ok = ok && good;
        row.classList.add(good ? 'correct' : 'wrong');
        const btns = row.querySelectorAll('button');
        btns.forEach((b) => {
          if (b.dataset.g === it.group) b.classList.add('show-correct');
          if (b.classList.contains('selected') && !good) b.classList.add('wrong');
        });
      });
      return { correct: ok, fraction: ok ? 1 : 0, reveal: '' };
    };
  }

  // ---------- BUDGET ----------
  renderBudget() {
    const r = this.round;
    const money = r.format !== 'minutes';
    const fmt = (v) => (money ? `RM${(v / 100).toFixed(2)}` : `${v} minit`);
    this.roundBox.innerHTML = `${this.prompt()}
      <div class="budget-bar" data-bbar>
        <span>Bajet: <strong>${fmt(r.budget)}</strong></span>
        <span data-total>Digunakan: <strong>RM0.00</strong></span>
      </div>
      <div class="budget-grid">
        ${r.items
          .map(
            (it, i) => `
          <button type="button" class="budget-item" data-i="${i}" aria-pressed="false">
            <span class="budget-emoji">${it.emoji || '🛒'}</span>
            <span class="budget-name">${esc(it.label)}</span>
            <span class="budget-price">${fmt(it.price)}${it.need ? ' • Perlu' : ''}</span>
            <span class="budget-tick">✓</span>
          </button>`
          )
          .join('')}
      </div>
      <p class="tiny">${esc(
        r.mustIncludeNeeds ? 'Semua barang berlabel "Perlu" mesti dipilih.' : 'Pilih barang pilihan kamu.'
      )}</p>`;
    const btns = [...this.roundBox.querySelectorAll('.budget-item')];
    const totalEl = this.roundBox.querySelector('[data-total]');
    const bar = this.roundBox.querySelector('[data-bbar]');
    const totals = () => btns.reduce((sum, b, i) => (b.classList.contains('selected') ? sum + r.items[i].price : sum), 0);
    const update = () => {
      const t = totals();
      totalEl.innerHTML = `Digunakan: <strong>${fmt(t)}</strong>`;
      bar.classList.toggle('over', t > r.budget);
    };
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        if (this.checked) return;
        b.classList.toggle('selected');
        b.setAttribute('aria-pressed', b.classList.contains('selected') ? 'true' : 'false');
        this.audio && this.audio.select();
        update();
      })
    );
    update();
    this.checkFn = () => {
      const t = totals();
      const needsOk = !r.mustIncludeNeeds || r.items.every((it, i) => !it.need || btns[i].classList.contains('selected'));
      if (t === 0 && r.mustIncludeNeeds) return { needSelect: 'Pilih barang keperluan dahulu.' };
      this.checked = true;
      const within = t <= r.budget;
      const correct = within && needsOk;
      btns.forEach((b, i) => {
        b.classList.add('locked');
        if (r.items[i].need) b.classList.add('need-mark');
      });
      return {
        correct,
        fraction: correct ? 1 : 0,
        reveal: correct ? '' : !within ? `Jumlah ${fmt(t)} melebihi bajet ${fmt(r.budget)}.` : 'Ada barang keperluan yang belum dipilih.',
      };
    };
  }

  // ---------- CODE / MAZE ----------
  renderCode() {
    const r = this.round;
    let level;
    try {
      level = parseMap(r.map, { maxCmds: r.maxCmds, optimal: r.optimal });
    } catch (e) {
      this.roundBox.innerHTML = '<p>Peta tidak sah.</p>';
      return;
    }
    this.program = [];
    const cells = [];
    for (let y = 0; y < level.rows; y += 1) {
      for (let x = 0; x < level.cols; x += 1) {
        const isWall = level.walls.some(([wx, wy]) => wx === x && wy === y);
        const isGoal = level.goal[0] === x && level.goal[1] === y;
        const starIdx = level.stars.findIndex(([sx, sy]) => sx === x && sy === y);
        const isStart = level.start[0] === x && level.start[1] === y;
        cells.push(
          `<div class="maze-cell ${isWall ? 'wall' : 'floor'}" data-x="${x}" data-y="${y}" ${
            isWall ? 'aria-hidden="true"' : ''
          }>${isGoal ? '<span class="mz-goal">🏁</span>' : ''}${
            starIdx >= 0 ? `<span class="mz-star" data-star="${starIdx}">⭐</span>` : ''
          }${isStart ? '<span class="mz-robot" data-robot>🤖</span>' : ''}</div>`
        );
      }
    }

    this.roundBox.innerHTML = `${this.prompt()}
      <div class="maze-wrap">
        <div class="maze" data-maze style="--cols:${level.cols}" role="img" aria-label="Labirin robot ${level.cols} kali ${level.rows}">${cells.join(
          ''
        )}</div>
        <div class="code-panel">
          <div class="code-meta">
            <span>Arahan: <strong data-count>0</strong>/${level.maxCmds}</span>
            ${r.optimal ? '<span class="chip chip-warn">Mod minimum</span>' : ''}
          </div>
          <div class="program" data-program aria-live="polite"><span class="prog-empty">Belum ada arahan.</span></div>
          <div class="code-actions">
            <button type="button" class="cmd" data-cmd="atas">↑ Atas</button>
            <button type="button" class="cmd" data-cmd="kiri">← Kiri</button>
            <button type="button" class="cmd" data-cmd="bawah">↓ Bawah</button>
            <button type="button" class="cmd" data-cmd="kanan">→ Kanan</button>
          </div>
          <div class="code-actions secondary">
            <button type="button" class="btn tiny-btn" data-undo>⌫ Hapus</button>
            <button type="button" class="btn tiny-btn" data-clear>Kosongkan</button>
          </div>
          <p class="tiny">Kekunci anak panah papan kekunci juga boleh digunakan.</p>
        </div>
      </div>
      <p class="code-status" data-cstatus aria-live="polite"></p>`;

    const mazeEl = this.roundBox.querySelector('[data-maze]');
    const progEl = this.roundBox.querySelector('[data-program]');
    const countEl = this.roundBox.querySelector('[data-count]');
    const st = this.roundBox.querySelector('[data-cstatus]');
    const robot = () => mazeEl.querySelector('[data-robot]');
    const place = (x, y) => {
      const cell = mazeEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      const rb = robot();
      if (cell && rb) cell.appendChild(rb);
    };

    const drawProgram = () => {
      countEl.textContent = this.program.length;
      countEl.parentElement.classList.toggle('over-limit', this.program.length > level.maxCmds);
      if (!this.program.length) {
        progEl.innerHTML = '<span class="prog-empty">Belum ada arahan.</span>';
      } else {
        progEl.innerHTML = this.program
          .map(
            (c, i) =>
              `<span class="prog-chip">${i + 1}. ${
                { atas: '↑', kiri: '←', bawah: '↓', kanan: '→' }[c]
              }</span>`
          )
          .join('');
      }
    };
    const addCmd = (c) => {
      if (this.checked || this.running) return;
      if (this.program.length >= 30) return;
      this.program.push(c);
      this.audio && this.audio.click();
      drawProgram();
    };

    this.roundBox.querySelectorAll('[data-cmd]').forEach((b) =>
      b.addEventListener('click', () => addCmd(b.dataset.cmd))
    );
    this.roundBox.querySelector('[data-undo]').addEventListener('click', () => {
      if (this.checked || this.running) return;
      this.program.pop();
      drawProgram();
    });
    this.roundBox.querySelector('[data-clear]').addEventListener('click', () => {
      if (this.checked || this.running) return;
      this.program = [];
      drawProgram();
    });

    const keyHandler = (e) => {
      if (this.checked || this.running) return;
      const map = { ArrowUp: 'atas', ArrowLeft: 'kiri', ArrowDown: 'bawah', ArrowRight: 'kanan' };
      if (map[e.key]) {
        e.preventDefault();
        addCmd(map[e.key]);
      }
    };
    document.addEventListener('keydown', keyHandler);
    this.cleanupHandlers = () => document.removeEventListener('keydown', keyHandler);

    const resetStars = () => {
      mazeEl.querySelectorAll('.mz-star').forEach((s) => (s.style.display = ''));
    };
    this._resetStars = resetStars;

    this.checkFn = () => {
      if (this.running) return { stop: true };
      if (!this.program.length) return { needSelect: 'Tambah sekurang-kurangnya satu arahan.' };
      this.running = true;
      this.$('[data-check]').disabled = true;
      const result = runProgram(level, this.program);
      const startX = level.start[0];
      const startY = level.start[1];
      const positions = [{ x: startX, y: startY }];
      result.trace.forEach((t) => {
        if (!t.blocked) positions.push({ x: t.x, y: t.y });
      });
      st.textContent = 'Robot sedang bergerak...';
      resetStars();
      let step = 0;
      const stepMs = this.reduceMotion ? 0 : 170;
      const run = () => {
        if (step >= positions.length) {
          this.running = false;
          this.$('[data-check]').disabled = false;
          this.finishCodeRun(result, level, st);
          return;
        }
        const p = positions[step];
        place(p.x, p.y);
        const star = mazeEl.querySelector(`[data-x="${p.x}"][data-y="${p.y}"] .mz-star`);
        if (star) star.style.display = 'none';
        if (step > 0) this.audio && this.audio.step();
        step += 1;
        if (stepMs === 0) run();
        else {
          clearTimeout(this.codeTimer);
          this.codeTimer = setTimeout(run, stepMs);
        }
      };
      run();
      return { stop: true };
    };
  }

  finishCodeRun(result, level, st) {
    this.attempts = (this.attempts || 0) + 1;
    if (result.success) {
      this.checked = true;
      const fraction = this.attempts === 1 ? 1 : this.attempts === 2 ? 0.7 : 0.5;
      this.scores[this.idx] = Math.max(this.scores[this.idx] || 0, fraction);
      st.textContent = '';
      this.audio && this.audio.correct();
      this.showFeedback(fraction >= 0.999 ? 'correct' : 'partial', fraction, this.round.explain, '', true);
      this.$('[data-check]').hidden = true;
      this.$('[data-next]').hidden = false;
      this.$('[data-next]').textContent =
        this.idx + 1 >= this.rounds.length ? 'Lihat Keputusan →' : 'Seterusnya →';
      // tunjuk semula bintang yang sudah dikutip
    } else {
      let reasons = [];
      if (result.hitWall) reasons.push('Robot melanggar dinding 🧱');
      if (result.outOfSteps) reasons.push(`Arahan melebihi had (${level.maxCmds})`);
      if (!result.atGoal) reasons.push('Robot belum sampai ke bendera 🏁');
      if (result.collected.length < level.stars.length) reasons.push('Masih ada bintang ⭐ yang belum dikutip');
      st.textContent = 'Cuba lagi! ' + reasons.join('. ') + '.';
      st.classList.add('try-again');
      setTimeout(() => st.classList.remove('try-again'), 900);
      this.audio && this.audio.bump();
      // reset posisi dan bintang
      if (this._resetStars) this._resetStars();
      const startCell = this.roundBox.querySelector(`[data-x="${level.start[0]}"][data-y="${level.start[1]}"]`);
      const rb = this.roundBox.querySelector('[data-robot]');
      if (startCell && rb) startCell.appendChild(rb);
    }
  }

  // ---------- Semakan & maklum balas ----------
  check() {
    if (this.checked || this.showingResult || this.running) return;
    if (!this.checkFn) return;
    const res = this.checkFn();
    if (!res || res.stop) return;
    if (res.needSelect) {
      const fb = this.fb;
      fb.hidden = false;
      fb.className = 'feedback hintish';
      fb.innerHTML = `<strong>🙂 ${esc(res.needSelect)}</strong>`;
      return;
    }
    // Simpan markah terbaik sahaja — mengulang tidak pernah menurunkan markah.
    this.scores[this.idx] = Math.max(this.scores[this.idx] || 0, res.fraction);
    if (res.correct) this.audio && this.audio.correct();
    else this.audio && this.audio.wrong();
    this.showFeedback(res.correct ? 'correct' : 'wrong', res.fraction, res.explain, res.reveal);
    this.$('[data-check]').hidden = true;
    this.$('[data-next]').hidden = false;
    this.$('[data-next]').textContent =
      this.idx + 1 >= this.rounds.length ? 'Lihat Keputusan →' : 'Seterusnya →';
    this.updateScoreLine();
  }

  showFeedback(kind, fraction, explain = '', reveal = '', isCode = false) {
    const fb = this.fb;
    fb.hidden = false;
    fb.className = `feedback ${kind}`;
    let title =
      kind === 'correct'
        ? '🌟 Hebat! Betul!'
        : kind === 'partial'
        ? '👏 Bagus! Hampir tepat!'
        : '💪 Cuba lagi, kamu boleh!';
    if (isCode && fraction < 1) title = '👏 Misi berjaya! Teruskan usaha!';
    const praise = kind === 'correct' ? pick(PRAISE) : kind === 'partial' ? 'Kerja bagus!' : 'Jangan risau, ini cara kita belajar.';
    let body = `<p class="fb-praise">${esc(praise)}</p>`;
    if (kind !== 'correct' && reveal) {
      body += `<p class="reveal"><strong>Jawapan yang betul:</strong> ${reveal}</p>`;
    }
    if (explain) body += `<p class="explain">${esc(explain)}</p>`;
    fb.innerHTML = `<div class="fb-head"><span>${title}</span>${
      fraction > 0 && fraction < 1 ? `<span class="fb-pts">+${Math.round(fraction * 100)}%</span>` : ''
    }</div>${body}`;
    this.updateScoreLine();
    // Pujian/galakan dibacakan; jawapan dan penerangan dipaparkan sebagai teks.
    this.lastFeedbackPromise = this.speakFeedback(kind, reveal, explain || '');
  }

  updateScoreLine() {
    const pct = Math.round((this.scores.reduce((a, b) => a + b, 0) / this.rounds.length) * 100);
    this.$('[data-score]').textContent = `Markah: ${pct}%`;
    const correct = this.scores.filter((s) => s >= 0.999).length;
    this.$('[data-roundscore]').textContent = `${correct}/${this.rounds.length} tepat`;
    this.$('[data-prog]').style.width = `${((this.idx + 1) / this.rounds.length) * 100}%`;
  }

  async next() {
    if (this.cleanupHandlers) this.cleanupHandlers();
    if (this.lastFeedbackPromise) await this.lastFeedbackPromise;
    if (this.idx + 1 >= this.rounds.length) {
      this.finish();
      return;
    }
    this.showRound(this.idx + 1);
    this.lastFeedbackPromise = this.speakRoundContent();
  }

  finish() {
    this.finished = true;
    if (this.cleanupHandlers) this.cleanupHandlers();
    const pct = Math.round((this.scores.reduce((a, b) => a + b, 0) / this.rounds.length) * 100);
    const stars = starsFor(pct, 50);
    const correctCount = this.scores.filter((s) => s >= 0.999).length;
    this.audio && (stars > 0 ? this.audio.win() : this.audio.click());
    let outcome = { xpGained: 0, newBadges: [], level: 1 };
    try {
      outcome = this.opts.onFinish(this.def.id, {
        pct,
        stars,
        correct: correctCount,
        rounds: this.rounds.length,
      }) || outcome;
    } catch (e) {
      console.error('Gagal menyimpan keputusan', e);
    }
    const starHTML = [0, 1, 2]
      .map((i) => `<span class="big-star ${i < stars ? 'on' : ''}" aria-hidden="true">★</span>`)
      .join('');
    const badgeHTML = (outcome.newBadges || [])
      .map((b) => `<div class="badge-pop"><span class="badge-ico">${b.icon}</span><div><strong>${esc(b.name)}</strong><br><span class="tiny">${esc(b.desc)}</span></div></div>`)
      .join('');
    this.host.innerHTML = `
      <div class="result-wrap">
        <div class="result-card">
          <img class="result-mascot" src="./assets/images/cili-mascot-360.png" alt="Maskot CILI" width="132" height="132" />
          <h2>${pct >= 50 ? 'Syabas, hebat!' : 'Usaha yang bagus!'}</h2>
          <div class="big-stars" aria-label="${stars} daripada 3 bintang">${starHTML}</div>
          <p class="result-score">${pct}% • ${correctCount}/${this.rounds.length} tepat</p>
          <p class="result-level">Tahap ${LEVELS[this.level - 1].emoji} ${levelName(this.level)}</p>
          <p class="result-xp">+${outcome.xpGained || 0} XP</p>
          ${badgeHTML ? `<div class="badge-list">${badgeHTML}</div>` : ''}
          <p class="tiny">${pct >= 50 ? 'Kamu sudah tunjukkan usaha yang hebat. Teruskan! 🌟' : 'Setiap cubaan membuat kamu lebih pandai. Jom cuba lagi! 💪'}</p>
          <div class="result-actions">
            <button class="btn primary" data-again>🔁 Ulang Permainan</button>
            <button class="btn ghost" data-change-level>🌱 Tukar Tahap</button>
            <button class="btn ghost" data-back>Kembali</button>
          </div>
        </div>
      </div>`;
    this.host.querySelector('[data-again]').addEventListener('click', () => {
      Speech.stop();
      new Session({ ...this.opts });
    });
    this.host.querySelector('[data-change-level]').addEventListener('click', () => {
      Speech.stop();
      new Session({ ...this.opts });
    });
    this.host.querySelector('[data-back]').addEventListener('click', () => {
      Speech.stop();
      this.opts.onExit();
    });

    const resultLines = [
      `Keputusan. Markah ${pct} peratus.`,
      `${correctCount} daripada ${this.rounds.length} tepat.`,
      `Anda memperoleh ${stars} bintang dan ${outcome.xpGained || 0} XP.`,
    ];
    const badgeNames = (outcome.newBadges || []).map((badge) => plain(badge.name)).filter(Boolean);
    if (badgeNames.length) resultLines.push(`Lencana baharu: ${badgeNames.join(', ')}.`);
    resultLines.push(pct >= 50 ? 'Syabas, teruskan usaha!' : 'Usaha yang baik. Cuba lagi apabila bersedia.');
    if (this.tts) this.resultSpeechPromise = this.say(resultLines.join(' '));
  }
}

export const Engine = {
  play(opts) {
    return new Session(opts);
  },
};
