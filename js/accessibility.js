// Kebolehcapaian: saiz teks, animasi berkurang, bunyi.
import { Sound } from './audio.js';

const FONT_STEPS = { normal: 'normal', large: 'large', xlarge: 'xlarge' };

export function applyAccessibility(settings, root = document.documentElement) {
  if (!settings) return;
  const scale = Number(settings.fontScale) || 1;
  let font = 'normal';
  if (scale >= 1.3) font = 'xlarge';
  else if (scale >= 1.1) font = 'large';
  root.setAttribute('data-font', FONT_STEPS[font]);
  root.classList.toggle('reduce-motion', !!settings.reduceMotion);
  Sound.setEnabled(!!settings.sound);
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

export function fontScaleLabel(scale) {
  if (scale >= 1.3) return 'Besar';
  if (scale >= 1.1) return 'Sederhana';
  return 'Biasa';
}

// Fokus ke elemen baharu selepas navigasi untuk pembaca skrin.
export function focusView() {
  const view = document.getElementById('view');
  if (view) view.focus({ preventScroll: true });
}
