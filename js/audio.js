// Bunyi ringan menggunakan Web Audio API (tiada fail audio luaran, berfungsi offline).
let ctx = null;
let enabled = true;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', gain = 0.08, delay = 0) {
  const a = ac();
  if (!a || !enabled) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = a.currentTime + delay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const Sound = {
  setEnabled(v) {
    enabled = !!v;
  },
  isEnabled() {
    return enabled;
  },
  click() {
    tone(520, 0.06, 'triangle', 0.05);
  },
  select() {
    tone(620, 0.07, 'sine', 0.06);
  },
  correct() {
    tone(660, 0.1, 'sine', 0.07);
    tone(880, 0.14, 'sine', 0.06, 0.09);
  },
  // Bunyi lembut "cuba lagi" — bukan buzzer menghukum.
  wrong() {
    tone(392, 0.12, 'sine', 0.05);
    tone(330, 0.16, 'sine', 0.045, 0.1);
  },
  star() {
    tone(880, 0.09, 'sine', 0.06);
    tone(1175, 0.09, 'sine', 0.055, 0.08);
    tone(1568, 0.16, 'sine', 0.05, 0.16);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.11));
  },
  // Bunyi langkah robot
  step() {
    tone(300, 0.05, 'square', 0.03);
  },
  bump() {
    tone(120, 0.12, 'square', 0.05);
  },
};

export function initSoundFromSettings(settings) {
  enabled = !!(settings && settings.sound);
}
