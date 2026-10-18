// Lapisan storan setempat: IndexedDB (utama) dengan sandaran localStorage.
// Menyimpan profil, kemajuan, lencana dan tetapan. Tiada data dihantar ke pelayan.

const DB_NAME = 'cilikverse-db';
const DB_VERSION = 1;
const STORE = 'state';
const KEY = 'main';
const LS_KEY = 'cilikverse-state';
export const SCHEMA_VERSION = 1;

let db = null;
let memory = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB tidak tersedia'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB'));
  });
}

function idbGet() {
  return openDB().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readonly');
        const rq = tx.objectStore(STORE).get(KEY);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => reject(rq.error);
      })
  );
}

function idbPut(value) {
  return openDB().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function idbClear() {
  return openDB().then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    profile: { name: '', avatar: 'cili' },
    xp: 0,
    completed: {}, // gameId -> { stars, best, plays, last }
    badges: {}, // badgeId -> timestamp ISO
    settings: {
      sound: true,
      tts: true,
      speechRate: 0.92,
      speechVoice: '',
      difficulty: 0,
      reduceMotion: false,
      fontScale: 1,
      aiEnabled: true,
      dailyLimitMin: 0,
      parentPinHash: null,
    },
    screen: { day: '', minutes: 0 },
    ai: { day: '', usesToday: 0, totalUses: 0 },
    stats: { gamesPlayed: 0, correct: 0, wrong: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Migrasi data lama supaya kemajuan tidak hilang selepas kemas kini.
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return defaultState();
  const base = defaultState();
  let s = { ...base, ...raw };
  if (!s.schema || s.schema < 1) {
    // Masa depan: tambah migrasi dari versi lama di sini.
    s.schema = SCHEMA_VERSION;
  }
  s.schema = SCHEMA_VERSION;
  s.profile = { ...base.profile, ...(raw.profile || {}) };
  s.settings = { ...base.settings, ...(raw.settings || {}) };
  s.completed = raw.completed && typeof raw.completed === 'object' ? raw.completed : {};
  s.badges = raw.badges && typeof raw.badges === 'object' ? raw.badges : {};
  s.screen = { ...base.screen, ...(raw.screen || {}) };
  s.ai = { ...base.ai, ...(raw.ai || {}) };
  s.stats = { ...base.stats, ...(raw.stats || {}) };
  if (s.profile.name && s.profile.name.length > 16) s.profile.name = s.profile.name.slice(0, 16);
  return s;
}

let saveTimer = null;
let pendingState = null;

export const Store = {
  async load() {
    if (memory) return memory;
    let raw = null;
    try {
      raw = await idbGet();
    } catch (e) {
      // fallback
      try {
        raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      } catch (e2) {
        raw = null;
      }
    }
    if (!raw) {
      try {
        raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      } catch (e) {
        raw = null;
      }
    }
    memory = migrate(raw);
    return memory;
  },

  // Simpan tak segerak (debounce 150ms) supaya tidak membebankan permainan.
  save(state, immediate = false) {
    memory = state;
    state.updatedAt = new Date().toISOString();
    pendingState = state;
    if (immediate) return Store.flush();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Store.flush();
    }, 150);
    return Promise.resolve(true);
  },

  async flush() {
    if (!pendingState) return true;
    const s = pendingState;
    pendingState = null;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    let ok = false;
    try {
      await idbPut(s);
      ok = true;
    } catch (e) {
      ok = false;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      ok = true;
    } catch (e) {
      // storan penuh
    }
    return ok;
  },

  async reset() {
    memory = defaultState();
    pendingState = null;
    try {
      await idbClear();
      await idbPut(memory);
    } catch (e) {
      /* abaikan */
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(memory));
    } catch (e) {
      /* abaikan */
    }
    return memory;
  },

  async exportJSON() {
    const s = memory || (await Store.load());
    return JSON.stringify(
      { app: 'CILIKVERSE V.1', exportedAt: new Date().toISOString(), state: s },
      null,
      2
    );
  },

  async importJSON(text) {
    const parsed = JSON.parse(text);
    const raw = parsed && parsed.state ? parsed.state : parsed;
    if (!raw || typeof raw !== 'object' || !('completed' in raw)) {
      throw new Error('Fail sandaran tidak sah.');
    }
    const s = migrate(raw);
    memory = s;
    await Store.flush();
    await idbPut(s).catch(() => {});
    return s;
  },

  get memory() {
    return memory;
  },

  // Semak sama ada storan setempat benar-benar berfungsi.
  async healthCheck() {
    const probe = { ...(memory || defaultState()), probe: Date.now() };
    try {
      await idbPut(probe);
      const back = await idbGet();
      return !!(back && back.probe === probe.probe);
    } catch (e) {
      try {
        localStorage.setItem('cilikverse-probe', String(probe.probe));
        const ok = localStorage.getItem('cilikverse-probe') === String(probe.probe);
        localStorage.removeItem('cilikverse-probe');
        return ok;
      } catch (e2) {
        return false;
      }
    }
  },
};

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
