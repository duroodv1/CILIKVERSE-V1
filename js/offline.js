// Pengurusan offline: service worker, pemasangan PWA, status rangkaian dan kemas kini.
// Tidak memadam data kemajuan pengguna. Kemas kini hanya membersihkan cache lama.

let deferredPrompt = null;
let registration = null;
let reloading = false;
let callbacks = {};
let ready = false;
let isFileProtocol = false;

export const Offline = {
  get ready() {
    return ready;
  },
  get installAvailable() {
    return !!deferredPrompt;
  },
  get isDesktopShell() {
    return isFileProtocol || (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent || ''));
  },

  init(opts = {}) {
    callbacks = opts;
    if (typeof window === 'undefined') return;
    isFileProtocol = location.protocol === 'file:';

    const updateNet = () => {
      if (callbacks.onNet) callbacks.onNet(this.online());
      if (callbacks.onUpdateChips) callbacks.onUpdateChips();
    };
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (callbacks.onInstall) callbacks.onInstall(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (callbacks.onInstall) callbacks.onInstall(false);
      if (callbacks.onToast) callbacks.onToast('CILIKVERSE dipasang! Buka dari menu aplikasi kamu.');
    });

    // Desktop shell (Electron) atau pelayar tanpa service worker: aplikasi
    // sudah setempat, jadi fungsi offline tersedia.
    if (isFileProtocol || !('serviceWorker' in navigator)) {
      ready = true;
      if (callbacks.onReady) callbacks.onReady(true);
      return;
    }

    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker
      .register('./service-worker.js', { scope: './' })
      .then((reg) => {
        registration = reg;
        // Hanya tawarkan kemas kini jika aplikasi memang sudah dikawal versi lama.
        if (hadController && reg.waiting) this.notifyUpdate();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) this.notifyUpdate();
          });
        });
        navigator.serviceWorker.ready.then(async () => {
          ready = true;
          if (callbacks.onReady) callbacks.onReady(true);
          if (callbacks.onUpdateChips) callbacks.onUpdateChips();
        });
        // Semak kemas kini secara lembut (tidak menyekat permainan).
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {
        ready = false;
        if (callbacks.onReady) callbacks.onReady(false);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  },

  online() {
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  },

  notifyUpdate() {
    if (callbacks.onUpdateAvailable) callbacks.onUpdateAvailable();
  },

  applyUpdate() {
    if (!registration) return false;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
    location.reload();
    return true;
  },

  checkUpdate() {
    if (registration) return registration.update().catch(() => {});
    return Promise.resolve();
  },

  async install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (callbacks.onInstall) callbacks.onInstall(false);
      return choice && choice.outcome === 'accepted';
    } catch (e) {
      return false;
    }
  },

  async cacheInfo() {
    if (isFileProtocol) return { ready: true, note: 'Aplikasi desktop setempat' };
    if (!('caches' in window)) return { ready: false, note: 'Cache tidak disokong' };
    try {
      const keys = await caches.keys();
      const ours = keys.filter((k) => k.startsWith('cilikverse-'));
      return { ready: ours.length > 0, keys: ours };
    } catch (e) {
      return { ready: false, note: 'Cache tidak dapat dibaca' };
    }
  },
};
