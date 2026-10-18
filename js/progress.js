// Sistem XP, tahap, lencana dan rekod kemajuan.
// Semua fungsi tulen (tidak menyentuh DOM) supaya boleh diuji di Node.

export const XP_PER_LEVEL = 150;

export const LEVEL_TITLES = [
  { min: 1, title: 'Peneroka Baru' },
  { min: 4, title: 'Pencari Ilmu' },
  { min: 7, title: 'Penyelesai Masalah' },
  { min: 10, title: 'Pemikir Hebat' },
  { min: 14, title: 'Cilikverse Master' },
];

export const MODULES = {
  robocilik: { id: 'robocilik', name: 'RoboCilik AI', icon: '🤖' },
  'bijak-wang': { id: 'bijak-wang', name: 'Bijak Wang Junior', icon: '💰' },
  'detektif-digital': { id: 'detektif-digital', name: 'Detektif Digital', icon: '🕵️' },
};

export function xpForResult({ stars = 0, firstTime = false } = {}) {
  return 15 + stars * 15 + (firstTime ? 20 : 0);
}

export function levelInfo(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) if (level >= t.min) title = t.title;
  return { level, title, into, need: XP_PER_LEVEL, pct: Math.round((into / XP_PER_LEVEL) * 100) };
}

// Fungsi pembantu untuk mengira bilangan permainan selesai dalam satu set id.
function countCompleted(state, ids) {
  return ids.filter((id) => state.completed && state.completed[id]).length;
}

const ids = (prefix, from, to) => {
  const out = [];
  for (let i = from; i <= to; i += 1) {
    if (typeof prefix === 'function') out.push(prefix(i));
    else out.push(`${prefix}${i}`);
  }
  return out;
};

export const ALL_GAME_IDS = [
  ...ids((i) => `rc-a${i}`, 1, 10),
  ...ids((i) => `rc-b${i}`, 1, 10),
  ...ids((i) => `rc-c${i}`, 1, 10),
  ...ids((i) => `bw-a${i}`, 1, 10),
  ...ids((i) => `bw-b${i}`, 1, 10),
  ...ids((i) => `bw-c${i}`, 1, 10),
  ...ids((i) => `dd-a${i}`, 1, 10),
  ...ids((i) => `dd-b${i}`, 1, 10),
  ...ids((i) => `dd-c${i}`, 1, 10),
];

export const BADGES = [
  {
    id: 'ahli-baru',
    name: 'Ahli Baru',
    icon: '🎉',
    desc: 'Selesaikan permainan pertama kamu.',
    test: (s) => Object.keys(s.completed || {}).length >= 1,
  },
  {
    id: 'junior-coder',
    name: 'Junior Coder',
    icon: '💻',
    desc: 'Selesaikan 5 permainan Asas Coding.',
    test: (s) => countCompleted(s, ids((i) => `rc-a${i}`, 1, 10)) >= 5,
  },
  {
    id: 'pakar-logik',
    name: 'Pakar Logik',
    icon: '🧠',
    desc: 'Selesaikan 5 permainan Logik & Penyelesaian Masalah.',
    test: (s) => countCompleted(s, ids((i) => `rc-b${i}`, 1, 10)) >= 5,
  },
  {
    id: 'robo-master',
    name: 'Robo Master',
    icon: '🤖',
    desc: 'Selesaikan kesemua 30 permainan RoboCilik AI.',
    test: (s) => countCompleted(s, ALL_GAME_IDS.filter((g) => g.startsWith('rc-'))) >= 30,
  },
  {
    id: 'bijak-mengira',
    name: 'Bijak Mengira',
    icon: '🪙',
    desc: 'Selesaikan 5 permainan Kenali Wang.',
    test: (s) => countCompleted(s, ids((i) => `bw-a${i}`, 1, 10)) >= 5,
  },
  {
    id: 'juara-simpanan',
    name: 'Juara Simpanan',
    icon: '🏦',
    desc: 'Selesaikan 5 permainan Simpanan & Keputusan Bijak.',
    test: (s) => countCompleted(s, ids((i) => `bw-c${i}`, 1, 10)) >= 5,
  },
  {
    id: 'pengurus-wang-junior',
    name: 'Pengurus Wang Junior',
    icon: '📒',
    desc: 'Selesaikan kesemua 30 permainan Bijak Wang Junior.',
    test: (s) => countCompleted(s, ALL_GAME_IDS.filter((g) => g.startsWith('bw-'))) >= 30,
  },
  {
    id: 'penjaga-privasi',
    name: 'Penjaga Privasi',
    icon: '🔒',
    desc: 'Selesaikan 5 permainan Keselamatan & Privasi.',
    test: (s) => countCompleted(s, ids((i) => `dd-a${i}`, 1, 10)) >= 5,
  },
  {
    id: 'detektif-fakta',
    name: 'Detektif Fakta',
    icon: '🔍',
    desc: 'Selesaikan 5 permainan Penipuan & Maklumat Palsu.',
    test: (s) => countCompleted(s, ids((i) => `dd-b${i}`, 1, 10)) >= 5,
  },
  {
    id: 'wira-digital',
    name: 'Wira Digital',
    icon: '🦸',
    desc: 'Selesaikan kesemua 30 permainan Detektif Digital.',
    test: (s) => countCompleted(s, ALL_GAME_IDS.filter((g) => g.startsWith('dd-'))) >= 30,
  },
  {
    id: 'bintang-cemerlang',
    name: 'Bintang Cemerlang',
    icon: '🌟',
    desc: 'Dapat 3 bintang dalam 10 permainan berbeza.',
    test: (s) =>
      Object.values(s.completed || {}).filter((c) => (c.stars || 0) >= 3).length >= 10,
  },
  {
    id: 'cilikverse-champion',
    name: 'Cilikverse Champion',
    icon: '🏆',
    desc: 'Selesaikan kesemua 90 permainan!',
    test: (s) => countCompleted(s, ALL_GAME_IDS) >= 90,
  },
];

// Rekod keputusan permainan. Mengubah state secara langsung dan mengembalikan ringkasan.
export function recordResult(state, gameId, { stars = 0, scorePct = 0, correct = 0, wrong = 0 } = {}) {
  if (!state.completed) state.completed = {};
  const prev = state.completed[gameId];
  const firstTime = !prev;
  const best = Math.max(prev ? prev.best || 0 : 0, Math.round(scorePct));
  const bestStars = Math.max(prev ? prev.stars || 0 : 0, stars);
  state.completed[gameId] = {
    stars: bestStars,
    best,
    plays: (prev ? prev.plays || 0 : 0) + 1,
    last: new Date().toISOString(),
  };
  if (!state.stats) state.stats = { gamesPlayed: 0, correct: 0, wrong: 0 };
  state.stats.gamesPlayed += 1;
  state.stats.correct += correct;
  state.stats.wrong += wrong;

  const xpGained = xpForResult({ stars, firstTime });
  state.xp = (state.xp || 0) + xpGained;

  const newBadges = [];
  if (!state.badges) state.badges = {};
  for (const b of BADGES) {
    if (!state.badges[b.id]) {
      let ok = false;
      try {
        ok = b.test(state);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        state.badges[b.id] = new Date().toISOString();
        newBadges.push(b);
      }
    }
  }
  return { xpGained, stars: bestStars, best, firstTime, newBadges };
}

export function badgeById(id) {
  return BADGES.find((b) => b.id === id);
}

export function moduleGameIds(moduleId) {
  const p = { robocilik: 'rc-', 'bijak-wang': 'bw-', 'detektif-digital': 'dd-' }[moduleId];
  return p ? ALL_GAME_IDS.filter((g) => g.startsWith(p)) : [];
}

export function moduleStats(state, moduleId) {
  const gids = moduleGameIds(moduleId);
  let done = 0;
  let stars = 0;
  gids.forEach((g) => {
    const c = state.completed && state.completed[g];
    if (c) {
      done += 1;
      stars += c.stars || 0;
    }
  });
  return { total: gids.length, done, stars, maxStars: gids.length * 3, pct: Math.round((done / gids.length) * 100) };
}

// Cadangan "Teruskan Pembelajaran": permainan seterusnya yang belum diselesaikan.
export function nextGame(state, games) {
  for (const g of games) {
    if (!(state.completed && state.completed[g.id])) return g;
  }
  return games[0] || null;
}
