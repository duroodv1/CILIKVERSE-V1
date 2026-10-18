// Modul 1: RoboCilik AI — 30 permainan (coding, logik, robotik & AI).
// Semua penjana adalah tulen dan diuji di tests/run-tests.mjs.

import { registerGame } from '../../js/engine.js';
import {
  choiceRound,
  sortRound,
  matchRound,
  multiRound,
  groupsRound,
  codeRound,
  gridHTML,
  arrowsText,
  take,
} from '../../js/games-kit.js';
import { pick, ri, shuffle } from '../../js/shared.js';
import { parseMap, solveMaze, runProgram } from '../../js/maze.js';

const BADGE = 'RoboCilik AI';

// ---------- Peta labirin ----------
const MAP_EASY = [
  `S....
.#...
.#.#.
...#.
...G.`,
  `S.#..
.....
.#.#.
.#...
...G.`,
  `S....
###..
...*.
.#...
...G.`,
  `S..#.
.#...
.#.#.
...#.
..*G.`,
];

const MAP_MED = [
  `S.....
.###..
...#..
.#.#..
...#..
....G.`,
  `S.#...
..*#..
.#....
....#.
.#*...
.....G`,
  `S....#
.##..#
.....#
.###..
.....*
....G.`,
  `S...*.
.###..
.#...#
.#.#..
...#..
.....G`,
];

const MAP_HARD = [
  `S.#....
..#.###
..#...*
..#.#..
..#.#..
..#.#..
..#...G`,
  `S.....#
.####.#
.#....#
.#.##.#
.#.#..#
.#.#.*#
...#..G`,
  `S..#....
.#..#...
.#..#.#.
.#....#.
.#####.#
.......*
.#.#####
.#....G.`,
  `S...*...
.###....
...#..#.
.#.#..#.
.#....#.
.####.#.
.#.....*
.#....G.`,
];

// Kapal angkasa (corridor) untuk mod arahan minimum
const MAP_CORRIDOR = [
  `S.#..
..#..
..#..
..#..
..*.G`,
  `S.#...
..#.#.
..#.#.
..#...
..*..G`,
  `S....#
.###.#
.#...#
.#.###
.#....
.#..G.`,
  `S.#....
..#.##.
..#..#.
.##..#.
...#.#.
...#..G`,
];

// ---------- Pembantu ----------
function solvable(maps, minMoves = 2) {
  const list = shuffle(maps);
  for (const map of list) {
    let level;
    try {
      level = parseMap(map);
    } catch (e) {
      continue;
    }
    const sol = solveMaze(level);
    if (sol && sol.moves >= minMoves) return { map, level, sol };
  }
  return null;
}

function makeCode(maps, { prompt, optimal = false, slack = 1, explain = '', minMoves = 2 }) {
  const found = solvable(maps, minMoves);
  if (!found) throw new Error('Peta tidak sah untuk ' + prompt);
  return codeRound({
    prompt,
    map: found.map,
    maxCmds: found.sol.moves + (optimal ? 0 : slack),
    optimal,
    explain:
      explain ||
      `Laluan terbaik mengambil ${found.sol.moves} arahan. Kamu boleh guna sehingga ${
        found.sol.moves + (optimal ? 0 : slack)
      } arahan.`,
    hint: optimal ? 'Fikir laluan paling pendek: setiap langkah mesti menuju lebih dekat ke bendera atau bintang.' : '',
  });
}

function routeOptions(found, count = 4) {
  const level = found.level;
  const opts = [{ path: found.sol.path, ok: true }];
  const dirs = ['atas', 'kanan', 'bawah', 'kiri'];
  let guard = 0;
  while (opts.length < count && guard < 80) {
    guard += 1;
    const p = found.sol.path.slice();
    const mode = ri(0, 3);
    if (mode === 0 && p.length) p[ri(0, p.length - 1)] = pick(dirs);
    else if (mode === 1 && p.length) p.splice(ri(0, p.length), 0, pick(dirs));
    else if (mode === 2 && p.length > 1) p.pop();
    else if (p.length > 1) {
      const i = ri(0, p.length - 2);
      [p[i], p[i + 1]] = [p[i + 1], p[i]];
    }
    const res = runProgram(level, p);
    if (!res.success && p.length && !opts.some((o) => o.path.join() === p.join())) opts.push({ path: p, ok: false });
  }
  return opts.map((o) => ({ label: arrowsText(o.path), arrows: true }));
}

function routeChoice(maps, prompt, explain) {
  const found = solvable(maps);
  const options = routeOptions(found).map((o, i) => {
    const ok = i === 0;
    return { ...o, correct: ok };
  });
  // Pastikan jawapan betul ditandakan ikut laluan solver
  options.forEach((o) => (o.correct = o.label === arrowsText(found.sol.path)));
  return choiceRound({
    prompt,
    html: gridHTML(found.map, 'Peta robot'),
    options: shuffle(options),
    explain:
      explain ||
      `Laluan betul: ${arrowsText(found.sol.path)}. Setiap arahan menggerakkan robot satu kotak.`,
  });
}

function nextStepRound(maps, prompt) {
  const found = solvable(maps, 3);
  const path = found.sol.path;
  const k = ri(1, path.length - 1);
  const prefix = path.slice(0, k);
  const answer = path[k];
  const others = shuffle(['atas', 'kanan', 'bawah', 'kiri'].filter((d) => d !== answer)).slice(0, 3);
  return choiceRound({
    prompt: `${prompt} Robot sudah bergerak: ${arrowsText(prefix)}. Apakah arahan seterusnya?`,
    html: gridHTML(found.map, 'Peta robot'),
    correct: arrowsText([answer]),
    wrong: others.map((d) => arrowsText([d])),
    explain: `Seterusnya robot perlu bergerak ${arrowsText([answer])} untuk ikut laluan ke bendera.`,
  });
}

function bugFixRound(maps) {
  const found = solvable(maps, 3);
  const { level, sol } = found;
  const path = sol.path;
  const dirs = ['atas', 'kanan', 'bawah', 'kiri'];
  let bugIdx = -1;
  let mutated = null;
  for (let tries = 0; tries < 60 && bugIdx < 0; tries += 1) {
    const k = ri(0, path.length - 1);
    const before = runProgram(level, path.slice(0, k));
    // cari arah yang melanggar dinding dari kedudukan sebelum k
    const dir = pick(dirs.filter((d) => d !== path[k]));
    const testProg = path.slice(0, k).concat([dir]);
    const res = runProgram(level, testProg);
    if (res.hitWall && res.trace[res.trace.length - 1].blocked) {
      bugIdx = k;
      mutated = path.slice();
      mutated[k] = dir;
    } else if (before.success === false) {
      continue;
    }
  }
  if (bugIdx < 0) return nextStepRound(maps, 'Baiki program robot.');
  const options = mutated.map((d, i) => ({
    label: `Langkah ${i + 1}: ${arrowsText([d])}`,
    correct: i === bugIdx,
  }));
  const display = mutated.map((d, i) => `${i + 1}. ${arrowsText([d])}`).join('  |  ');
  return choiceRound({
    prompt: 'Robot melanggar dinding! Arahan pada langkah mana yang salah?',
    html: `${gridHTML(found.map, 'Peta robot')}<div class="code-display">${display}</div>`,
    options: shuffle(options),
    explain: `Langkah ${bugIdx + 1} sepatutnya ${arrowsText([path[bugIdx]])}. Itu yang menghalang robot.`,
  });
}

function fewestStepsRound(maps) {
  const found = solvable(maps, 3);
  const { level, sol } = found;
  const path = sol.path;
  const dirs = { atas: 'bawah', kanan: 'kiri', bawah: 'atas', kiri: 'kanan' };
  // cari tempat untuk menambah pusingan kecil (kanan-kiri) yang sah
  let longer = null;
  for (let attempt = 0; attempt < 40 && !longer; attempt += 1) {
    const k = ri(0, path.length - 1);
    const perp = shuffle(['atas', 'kanan', 'bawah', 'kiri'].filter((d) => d !== path[k] && d !== dirs[path[k]]))[0];
    const cand = path.slice();
    cand.splice(k, 0, perp, dirs[perp]);
    const res = runProgram(level, cand);
    if (res.success && cand.length > path.length) longer = cand;
  }
  if (!longer) longer = path.concat([dirs[path[path.length - 1]], path[path.length - 1]]);
  const short = path;
  return choiceRound({
    prompt: 'Dua laluan boleh sampai ke bendera. Pilih laluan yang menggunakan langkah PALING SEDIKIT.',
    html: gridHTML(found.map, 'Peta robot'),
    options: shuffle([
      { label: `${arrowsText(short)} (${short.length} langkah)`, correct: true },
      { label: `${arrowsText(longer)} (${longer.length} langkah)`, correct: false },
    ]),
    explain: `Laluan ${arrowsText(short)} hanya ${short.length} langkah. Laluan yang lebih panjang menggunakan lebih banyak arahan.`,
  });
}

// ---------- Kandungan logik ----------
const PATTERN_SHAPES = [
  { seq: ['🔴', '🔵', '🔴', '🔵'], next: '🔴', why: 'Corak berulang merah-biru.' },
  { seq: ['⭐', '⭐', '🌙', '⭐', '⭐'], next: '🌙', why: 'Dua bintang diikuti satu bulan.' },
  { seq: ['🟨', '🟩', '🟦', '🟨', '🟩'], next: '🟦', why: 'Tiga warna berulang.' },
  { seq: ['🚀', '🛰️', '🚀', '🛰️'], next: '🚀', why: 'Corak berulang roket-satelit.' },
  { seq: ['🍎', '🍎', '🍌', '🍎', '🍎'], next: '🍌', why: 'Dua epal diikuti satu pisang.' },
];

const MYSTERY = [
  {
    clues: ['Ia digunakan untuk mengira.', 'Ia ada butang dan skrin.', 'Ia boleh membantu menyelesaikan operasi matematik.'],
    answer: 'Kalkulator',
    wrong: ['Bantal', 'Kasut', 'Payung'],
    why: 'Petunjuk mengarah kepada alat mengira, iaitu kalkulator.',
  },
  {
    clues: ['Ia ada roda.', 'Ia membawa orang ke tempat lain.', 'Ia memerlukan bahan api atau bateri.'],
    answer: 'Kereta',
    wrong: ['Buku', 'Kerusi', 'Cawan'],
    why: 'Kereta ada roda, membawa orang dan perlukan tenaga.',
  },
  {
    clues: ['Ia hidup di dalam air.', 'Ia bernafas dengan insang.', 'Ia boleh berenang.'],
    answer: 'Ikan',
    wrong: ['Kucing', 'Burung', 'Semut'],
    why: 'Ikan hidup dalam air dan bernafas dengan insang.',
  },
  {
    clues: ['Ia digunakan setiap hari.', 'Ia menyimpan tulisan dan gambar.', 'Ia boleh dihubungi melalui internet.'],
    answer: 'Telefon pintar',
    wrong: ['Sudu', 'Bola sepak', 'Beg plastik'],
    why: 'Telefon pintar menyimpan data dan boleh berhubung melalui internet.',
  },
  {
    clues: ['Ia membantu kita melihat dalam gelap.', 'Ia menggunakan bateri.', 'Ia kecil dan boleh dibawa.'],
    answer: 'Lampu suluh',
    wrong: ['Cermin', 'Bantal', 'Roti'],
    why: 'Lampu suluh kecil, menggunakan bateri dan menerangi tempat gelap.',
  },
];

const PROBLEM_SOLUTION = [
  { id: 'p1', left: 'Robot tidak bergerak', right: 'Periksa bateri dan sambungan motor' },
  { id: 'p2', left: 'Robot sentiasa langgar dinding', right: 'Tambah sensor jarak' },
  { id: 'p3', left: 'Program berulang terlalu panjang', right: 'Gunakan gelung berulang' },
  { id: 'p4', left: 'Robot tidak mengenal warna', right: 'Tambah sensor warna' },
  { id: 'p5', left: 'Robot berhenti tiba-tiba', right: 'Semak kod dan kuasa bateri' },
  { id: 'p6', left: 'Robot bergerak ke arah salah', right: 'Betulkan urutan arahan' },
  { id: 'p7', left: 'Robot terlanggar halangan kecil', right: 'Pasang sensor sentuh' },
  { id: 'p8', left: 'Robot tidak sampai ke destinasi', right: 'Semak laluan dalam program' },
];

const ODD_SETS = [
  { items: ['🐶', '🐱', '🐰', '🚗'], odd: '🚗', why: 'Kereta bukan haiwan.' },
  { items: ['🍎', '🍌', '🥕', '🪑'], odd: '🪑', why: 'Kerusi bukan makanan.' },
  { items: ['🔴', '🟠', '🟡', '⬛'], odd: '⬛', why: 'Hitam bukan warna pelangi yang terang seperti yang lain.' },
  { items: ['🚲', '🛵', '🚗', '🍰'], odd: '🍰', why: 'Kek bukan kenderaan.' },
  { items: ['✏️', '🖍️', '🖊️', '🧦'], odd: '🧦', why: 'Stoking bukan alat menulis.' },
  { items: ['3', '6', '9', '10'], odd: '10', why: '10 bukan gandaan 3.' },
  { items: ['🌞', '🌝', '⭐', '🥦'], odd: '🥦', why: 'Brokoli bukan objek di langit.' },
];

const AI_EXAMPLES = [
  { label: 'Mencadangkan video yang kamu suka', correct: true },
  { label: 'Mengenal suara apabila kamu bercakap dengan pembantu telefon', correct: true },
  { label: 'Menapis mesej spam secara automatik', correct: true },
  { label: 'Menukar tulisan tangan kepada teks', correct: true },
  { label: 'Mengira 2 + 2 dengan kalkulator biasa', correct: false },
  { label: 'Menyalakan lampu dengan suis dinding', correct: false },
  { label: 'Membuka pintu dengan kunci besi', correct: false },
  { label: 'Menulis nama dengan pensel', correct: false },
];

const SENSOR_CASES = [
  { situ: 'Robot perlu berhenti sebelum terlanggar dinding.', ans: 'Sensor jarak', wrong: ['Sensor warna', 'Sensor bunyi'], why: 'Sensor jarak mengukur jarak halangan.' },
  { situ: 'Robot perlu mengesan cahaya dalam bilik gelap.', ans: 'Sensor cahaya', wrong: ['Sensor jarak', 'Sensor suhu'], why: 'Sensor cahaya mengesan keamatan cahaya.' },
  { situ: 'Robot perlu mengukur suhu air.', ans: 'Sensor suhu', wrong: ['Sensor sentuh', 'Sensor cahaya'], why: 'Sensor suhu mengukur haba.' },
  { situ: 'Robot perlu mengesan warna bola.', ans: 'Sensor warna', wrong: ['Sensor jarak', 'Sensor bunyi'], why: 'Sensor warna mengenal warna.' },
  { situ: 'Robot perlu bertindak apabila tersentuh.', ans: 'Sensor sentuh', wrong: ['Sensor suhu', 'Sensor cahaya'], why: 'Sensor sentuh mengesan sentuhan.' },
  { situ: 'Robot perlu mengikuti garisan hitam di lantai.', ans: 'Sensor garis', wrong: ['Sensor bunyi', 'Sensor suhu'], why: 'Sensor garis mengesan garisan.' },
];

const AI_STATEMENTS = [
  { text: 'AI boleh belajar daripada data.', truth: true, why: 'AI dilatih menggunakan data untuk mengenal corak.' },
  { text: 'AI sentiasa memberikan jawapan yang betul.', truth: false, why: 'AI boleh tersalah kerana ia belajar daripada data yang mungkin tidak lengkap.' },
  { text: 'Robot mesti ada program untuk bergerak.', truth: true, why: 'Program ialah arahan untuk robot bertindak.' },
  { text: 'AI mempunyai perasaan seperti manusia.', truth: false, why: 'AI meniru corak, bukan mempunyai perasaan.' },
  { text: 'AI boleh membantu manusia membuat kerja berulang.', truth: true, why: 'Automasi membantu kerja berulang.' },
  { text: 'Semua robot berbentuk seperti manusia.', truth: false, why: 'Robot boleh berbentuk apa sahaja mengikut tugas.' },
  { text: 'Data yang berkualiti membantu AI belajar dengan lebih baik.', truth: true, why: 'Data yang betul dan pelbagai menghasilkan model lebih baik.' },
];

const AUTOMATION = [
  { label: 'Menyiram pokok secara automatik mengikut jadual', correct: true },
  { label: 'Menapis e-mel spam', correct: true },
  { label: 'Menyalakan lampu taman pada waktu malam', correct: true },
  { label: 'Menyusun blok mengikut warna di kilang', correct: true },
  { label: 'Memujuk rakan yang sedih', correct: false },
  { label: 'Menulis puisi tentang perasaan sendiri', correct: false },
  { label: 'Menjaga kanak-kanak kecil', correct: false },
  { label: 'Membuat keputusan moral yang sukar', correct: false },
];

// ---------- Pusingan campuran (Cabaran) ----------
function robotMixRound(ctx) {
  const kindPick = take(ctx, ['route', 'pattern', 'sensor', 'groups']);
  if (kindPick === 'pattern') return patternRound(ctx);
  if (kindPick === 'sensor') return sensorRound(ctx);
  if (kindPick === 'groups') return machineHumanRound(ctx);
  return routeChoice(MAP_EASY, 'Pilih urutan arah yang membawa robot ke bendera.');
}

// ---------- Generator permainan ----------
function patternRound(ctx) {
  const s = take(ctx, PATTERN_SHAPES);
  return choiceRound({
    prompt: `Apakah item seterusnya? ${s.seq.join(' ')} ❓`,
    correct: s.next,
    wrong: shuffle(['🔺', '🟣', '🍀', '🚗'].filter((x) => x !== s.next)).slice(0, 3),
    explain: s.why,
  });
}

function sensorRound(ctx) {
  const c = take(ctx, SENSOR_CASES);
  return choiceRound({ prompt: c.situ + ' Sensor apa yang sesuai?', correct: c.ans, wrong: c.wrong, explain: c.why });
}

function machineHumanRound(ctx) {
  const pool = [
    { label: 'Mengira jumlah surat', group: 'mesin' },
    { label: 'Menghiburkan kawan yang sedih', group: 'manusia' },
    { label: 'Mengulang kerja yang sama seribu kali', group: 'mesin' },
    { label: 'Memilih hadiah untuk ibu', group: 'manusia' },
    { label: 'Menyusun fail mengikut nama', group: 'mesin' },
    { label: 'Menjaga kanak-kanak kecil', group: 'manusia' },
    { label: 'Menapis gambar yang tidak sesuai', group: 'mesin' },
    { label: 'Membuat keputusan moral', group: 'manusia' },
  ];
  return groupsRound({
    prompt: 'Tugasan mana sesuai untuk mesin, dan mana perlukan manusia?',
    groups: [
      { id: 'mesin', label: 'Mesin' },
      { id: 'manusia', label: 'Manusia' },
    ],
    items: shuffle(pool).slice(0, 4),
    explain: 'Mesin hebat untuk kerja berulang. Manusia lebih baik untuk empati, kreativiti dan keputusan moral.',
  });
}

// ====== Kategori A: Asas Coding ======
registerGame({
  id: 'rc-a1',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'code',
  generate: (level) =>
    makeCode(level >= 3 ? MAP_MED : MAP_EASY, {
      prompt: 'Susun arahan supaya CILI sampai ke bendera 🏁. Kutip bintang jika ada.',
      slack: level >= 2 ? 1 : 2,
    }),
});

registerGame({
  id: 'rc-a2',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level) =>
    routeChoice(level >= 2 ? MAP_MED : MAP_EASY, 'Pilih urutan arah yang membawa robot ke bendera 🏁.'),
});

registerGame({
  id: 'rc-a3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const modes = ['arrow', 'complete', 'translate'];
    const mode = take(ctx, modes, 'a3mode');
    if (mode === 'complete') return nextStepRound(MAP_EASY, 'Lengkapkan program robot.');
    if (mode === 'translate')
      return choiceRound({
        prompt: 'Arahan "bawah" bermaksud robot bergerak ke arah mana?',
        correct: '↓ Bawah',
        wrong: ['↑ Atas', '→ Kanan', '← Kiri'],
        explain: 'Anak panah ↓ menunjukkan arah bawah.',
      });
    return routeChoice(MAP_EASY, 'Gabungkan anak panah yang betul untuk membawa robot ke bendera.');
  },
});

registerGame({
  id: 'rc-a4',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'choice',
  generate: (level) => bugFixRound(level >= 2 ? MAP_MED : MAP_EASY),
});

registerGame({
  id: 'rc-a5',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'sort',
  generate: (level, ctx) => {
    const pools = [
      {
        prompt: 'Susun langkah membersihkan gigi mengikut urutan yang betul.',
        items: [
          { id: 's1', label: 'Ambil berus gigi dan ubat gigi' },
          { id: 's2', label: 'Basahkan berus gigi' },
          { id: 's3', label: 'Gosok gigi dengan gerakan membulat' },
          { id: 's4', label: 'Berkumur dan bilas' },
        ],
        why: 'Kita perlu sediakan alat dahulu, baru gosok dan bilas.',
      },
      {
        prompt: 'Susun langkah membuat sandwic mengikut urutan yang betul.',
        items: [
          { id: 's1', label: 'Ambil dua keping roti' },
          { id: 's2', label: 'Sapu jem pada roti' },
          { id: 's3', label: 'Letak roti kedua di atas' },
          { id: 's4', label: 'Potong sandwic' },
        ],
        why: 'Sediakan roti, sapu jem, tutup dan potong.',
      },
      {
        prompt: 'Susun langkah robot menyiapkan misi mengikut urutan program.',
        items: [
          { id: 's1', label: 'Mulakan program' },
          { id: 's2', label: 'Baca sensor jarak' },
          { id: 's3', label: 'Bergerak ke hadapan' },
          { id: 's4', label: 'Berhenti di destinasi' },
        ],
        why: 'Program bermula, membaca sensor, bergerak, kemudian berhenti.',
      },
      {
        prompt: 'Susun langkah meminjam buku di perpustakaan.',
        items: [
          { id: 's1', label: 'Cari buku di rak' },
          { id: 's2', label: 'Bawa buku ke kaunter' },
          { id: 's3', label: 'Tunjukkan kad perpustakaan' },
          { id: 's4', label: 'Bawa buku pulang' },
        ],
        why: 'Cari dahulu, kemudian proses pinjaman di kaunter.',
      },
      {
        prompt: 'Susun langkah membuat air limau.',
        items: [
          { id: 's1', label: 'Potong limau' },
          { id: 's2', label: 'Perah jus ke dalam gelas' },
          { id: 's3', label: 'Tambah air dan gula' },
          { id: 's4', label: 'Kacau dan hidangkan' },
        ],
        why: 'Potong, perah, campur, kacau.',
      },
    ];
    const p = take(ctx, pools);
    return sortRound({ prompt: p.prompt, items: p.items, explain: p.why });
  },
});

registerGame({
  id: 'rc-a6',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const dir = pick([
      ['kanan', '→'],
      ['bawah', '↓'],
      ['kiri', '←'],
      ['atas', '↑'],
    ]);
    const n = ri(2, 4 + Math.min(level, 2));
    const seq = Array(n).fill(dir[1]).join(' ');
    return choiceRound({
      prompt: `Robot bergerak: ${seq}. Bagaimana menulis arahan ini dengan kod berulang?`,
      correct: `Ulang ${n} kali: ${dir[0]}`,
      wrong: [
        `Ulang ${n + 1} kali: ${dir[0]}`,
        `Ulang ${n} kali: ${pick(['kanan', 'bawah', 'kiri', 'atas'].filter((d) => d !== dir[0]))}`,
        `Ulang 1 kali: ${dir[0]}`,
      ],
      explain: `Arahan yang sama diulang ${n} kali, jadi tulis "Ulang ${n} kali: ${dir[0]}".`,
    });
  },
});

registerGame({
  id: 'rc-a7',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'code',
  generate: (level) =>
    makeCode(level >= 2 ? MAP_MED : MAP_EASY, {
      prompt: 'Bantu robot keluar dari labirin dan sampai ke pintu keluar 🏁.',
      slack: 2,
    }),
});

registerGame({
  id: 'rc-a8',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'JIKA sensor mengesan dinding, MAKA robot perlu buat apa?',
        correct: 'Berhenti dan pusing',
        wrong: ['Terus bergerak laju', 'Padamkan lampu', 'Bunyi loceng'],
        why: 'Syarat "dinding" bermaksud robot perlu berhenti dan pusing untuk elak langgar.',
      },
      {
        prompt: 'JIKA bateri kurang daripada 10%, MAKA robot perlu…',
        correct: 'Kembali ke tempat cas',
        wrong: ['Berlari lebih laju', 'Menari', 'Berhenti selama-lamanya'],
        why: 'Bateri lemah bermaksud robot perlu dicas semula.',
      },
      {
        prompt: 'JIKA pintu terbuka, MAKA…',
        correct: 'Robot masuk ke bilik',
        wrong: ['Robot tidur', 'Robot menyanyi', 'Robot menutup lampu'],
        why: 'Apabila pintu terbuka, tindakan yang sesuai ialah masuk.',
      },
      {
        prompt: 'JIKA hujan, MAKA perlindungan yang betul ialah…',
        correct: 'Guna payung',
        wrong: ['Guna cermin mata hitam', 'Guna selimut', 'Guna penyapu'],
        why: 'Payung melindungi kita daripada hujan.',
      },
      {
        prompt: 'DALAM permainan, JIKA jawapan betul MAKA markah…',
        correct: 'Bertambah',
        wrong: ['Berkurang', 'Kekal', 'Hilang'],
        why: 'Jawapan betul menambah markah.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'rc-a9',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'code',
  generate: (level) =>
    makeCode(level >= 2 ? MAP_MED : MAP_EASY, {
      prompt: 'Kutip semua bintang ⭐ dan sampai ke bendera 🏁. Jangan lupa bintang!',
      slack: 2,
    }),
});

registerGame({
  id: 'rc-a10',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'code',
  generate: (level) =>
    makeCode(level >= 2 ? MAP_MED : MAP_CORRIDOR, {
      prompt: 'Cabaran pengatur cara: selesaikan misi dengan BILANGAN ARAHAN MINIMUM.',
      optimal: true,
      explain: 'Kamu berjaya menggunakan laluan paling pendek. Tiada langkah yang membazir!',
      minMoves: 3,
    }),
});

// ====== Kategori B: Logik & Penyelesaian Masalah ======
registerGame({
  id: 'rc-b1',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const mode = take(ctx, ['num', 'shape', 'num2'], 'b1mode');
    if (mode !== 'shape') {
      const start = ri(1, 5 + level * 2);
      const step = ri(2, 5);
      const len = 4;
      const seq = Array.from({ length: len }, (_, i) => start + i * step);
      const next = start + len * step;
      const opts = shuffle([next, next + step, next - 1, next + step * 2].filter((v, i, a) => a.indexOf(v) === i));
      return choiceRound({
        prompt: `Lengkapkan corak nombor: ${seq.join(', ')}, ❓`,
        options: opts.map((v) => ({ label: String(v), correct: v === next })),
        explain: `Setiap nombor bertambah ${step}. Jadi jawapannya ${next}.`,
      });
    }
    return patternRound(ctx);
  },
});

registerGame({
  id: 'rc-b2',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'sort',
  generate: (level, ctx) => {
    const pools = [
      {
        prompt: 'Susun haiwan daripada paling RINGAN kepada paling BERAT.',
        items: [
          { id: 'a', label: 'Semut (ringan)', value: 1 },
          { id: 'b', label: 'Kucing', value: 4 },
          { id: 'c', label: 'Kanak-kanak', value: 30 },
          { id: 'd', label: 'Gajah', value: 3000 },
        ],
      },
      {
        prompt: 'Susun objek daripada paling KECIL kepada paling BESAR.',
        items: [
          { id: 'a', label: 'Biji kacang', value: 1 },
          { id: 'b', label: 'Guli', value: 2 },
          { id: 'c', label: 'Bola sepak', value: 3 },
          { id: 'd', label: 'Bas sekolah', value: 4 },
        ],
      },
      {
        prompt: 'Susun kenderaan daripada paling LAMBAT kepada paling LAJU.',
        items: [
          { id: 'a', label: 'Basikal', value: 1 },
          { id: 'b', label: 'Kereta', value: 2 },
          { id: 'c', label: 'Kereta api laju', value: 3 },
          { id: 'd', label: 'Kapal terbang', value: 4 },
        ],
      },
      {
        prompt: 'Susun nombor daripada KECIL kepada BESAR.',
        items: [
          { id: 'a', label: '18', value: 18 },
          { id: 'b', label: '27', value: 27 },
          { id: 'c', label: '75', value: 75 },
          { id: 'd', label: '102', value: 102 },
        ],
      },
      {
        prompt: 'Susun langkah hari persekolahan dari awal hingga akhir.',
        items: [
          { id: 'a', label: 'Bangun dan bersiap', value: 1 },
          { id: 'b', label: 'Belajar di sekolah', value: 2 },
          { id: 'c', label: 'Balik ke rumah', value: 3 },
          { id: 'd', label: 'Tidur malam', value: 4 },
        ],
      },
    ];
    const p = take(ctx, pools);
    const answer = [...p.items].sort((a, b) => a.value - b.value).map((i) => i.id);
    return sortRound({
      prompt: p.prompt,
      items: p.items,
      answer,
      explain: 'Susunan betul mengikut peraturan yang diberi: ' + p.items.sort((a, b) => a.value - b.value).map((i) => i.label).join(' → '),
    });
  },
});

registerGame({
  id: 'rc-b3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const type = take(ctx, ['arith', 'arith', 'geo']);
    if (type === 'geo') {
      const start = ri(1, 3);
      const ratio = ri(2, 3);
      const seq = Array.from({ length: 4 }, (_, i) => start * Math.pow(ratio, i));
      const next = start * Math.pow(ratio, 4);
      return choiceRound({
        prompt: `Apakah nombor seterusnya? ${seq.join(', ')}, ❓`,
        correct: String(next),
        wrong: [String(next + ratio), String(next * ratio), String(next - 1)].filter((v) => v !== String(next)),
        explain: `Setiap nombor didarab ${ratio}. Jawapannya ${next}.`,
      });
    }
    const start = ri(2, 10);
    const step = ri(2, 9);
    const seq = Array.from({ length: 5 }, (_, i) => start + i * step);
    const next = start + 5 * step;
    return choiceRound({
      prompt: `Apakah nombor seterusnya? ${seq.join(', ')}, ❓`,
      correct: String(next),
      wrong: [String(next + step), String(next - 1), String(next + 2)].filter((v) => v !== String(next)),
      explain: `Corak bertambah ${step}. Jawapannya ${next}.`,
    });
  },
});

registerGame({
  id: 'rc-b4',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level, ctx) => {
    const m = take(ctx, MYSTERY);
    return choiceRound({
      prompt: `Kotak Misteri 🔮: ${m.clues.join(' ')} Apakah objek itu?`,
      correct: m.answer,
      wrong: m.wrong,
      explain: m.why,
    });
  },
});

registerGame({
  id: 'rc-b5',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level, ctx) => {
    const found = solvable(level >= 2 ? MAP_MED : MAP_EASY, 2);
    const bad = (() => {
      const dirs = ['atas', 'kanan', 'bawah', 'kiri'];
      for (let i = 0; i < 50; i += 1) {
        const p = shuffle(dirs).slice(0, 3);
        if (!runProgram(found.level, p).success) return p;
      }
      return ['atas', 'atas', 'atas'];
    })();
    return choiceRound({
      prompt: 'Pilih laluan SELAMAT yang sampai ke bendera tanpa melanggar dinding.',
      html: gridHTML(found.map, 'Peta berhalangan'),
      options: shuffle([
        { label: `${arrowsText(found.sol.path)} (selamat)`, correct: true },
        { label: `${arrowsText(bad)} (bahaya)`, correct: false },
        { label: `${arrowsText([found.sol.path[0], found.sol.path[0], 'kiri', 'atas'])} (ada halangan)`, correct: false },
      ]),
      explain: `Laluan selamat ialah ${arrowsText(found.sol.path)}. Laluan lain melanggar dinding atau tersasar.`,
    });
  },
});

registerGame({
  id: 'rc-b6',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'match',
  generate: (level, ctx) => {
    const pairs = shuffle(PROBLEM_SOLUTION).slice(0, 4);
    return matchRound({
      prompt: 'Padankan masalah robot dengan penyelesaian yang sesuai.',
      pairs: pairs.map((p) => ({ id: p.id, left: p.left, right: p.right })),
      explain: 'Setiap masalah ada penyelesaian yang sesuai. Fikirkan punca masalah dahulu.',
    });
  },
});

registerGame({
  id: 'rc-b7',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const s = take(ctx, ODD_SETS);
    return choiceRound({
      prompt: `Detektif Corak 🔎: ${s.items.join('  ')} — Mana satu yang TIDAK sepadan?`,
      correct: s.odd,
      wrong: s.items.filter((i) => i !== s.odd),
      explain: s.why,
    });
  },
});

registerGame({
  id: 'rc-b8',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level, ctx) => fewestStepsRound(level >= 2 ? MAP_MED : MAP_EASY),
});

registerGame({
  id: 'rc-b9',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'code',
  generate: (level) =>
    makeCode(level >= 2 ? MAP_MED : MAP_EASY, {
      prompt: 'Robot penghantar perlu menghantar bungkusan ke bendera 🏁. Rancang laluannya.',
      slack: 2,
    }),
});

registerGame({
  id: 'rc-b10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      routeChoice(MAP_MED, 'Misi 1: Pilih laluan robot yang betul.'),
      patternRound(ctx),
      (() => {
        const pairs = shuffle(PROBLEM_SOLUTION).slice(0, 4);
        return matchRound({
          prompt: 'Misi 2: Padankan masalah dengan penyelesaian.',
          pairs: pairs.map((p) => ({ id: p.id, left: p.left, right: p.right })),
          explain: 'Selesaikan masalah dengan punca yang tepat.',
        });
      })(),
      (() => {
        const s = take(ctx, ODD_SETS);
        return choiceRound({
          prompt: `Misi 3: Cari yang tidak sepadan: ${s.items.join('  ')}`,
          correct: s.odd,
          wrong: s.items.filter((i) => i !== s.odd),
          explain: s.why,
        });
      })(),
      sortRound({
        prompt: 'Misi akhir: Susun langkah menyelesaikan masalah mengikut urutan.',
        items: [
          { id: 'm1', label: 'Kenal pasti masalah' },
          { id: 'm2', label: 'Fikirkan pilihan penyelesaian' },
          { id: 'm3', label: 'Pilih penyelesaian terbaik' },
          { id: 'm4', label: 'Uji dan semak hasilnya' },
        ],
        explain: 'Penyelesaian masalah bermula dengan mengenal pasti masalah, kemudian mencuba dan menyemak.',
      }),
    ];
    return { rounds };
  },
});

// ====== Kategori C: Robotik & Pengenalan AI ======
registerGame({
  id: 'rc-c1',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'match',
  generate: (level, ctx) => {
    const pool = [
      { id: 'm', left: 'Motor', right: 'Menggerakkan roda robot' },
      { id: 's', left: 'Sensor', right: 'Mengesan keadaan sekeliling' },
      { id: 'b', left: 'Bateri', right: 'Membekalkan tenaga elektrik' },
      { id: 'o', left: 'Pengawal (otak)', right: 'Memproses arahan program' },
      { id: 'c', left: 'Kamera', right: 'Melihat dan merakam gambar' },
      { id: 'sp', left: 'Pembesar suara', right: 'Mengeluarkan bunyi' },
      { id: 'r', left: 'Rangka', right: 'Menjadi badan dan sokongan robot' },
      { id: 'w', left: 'Roda', right: 'Membolehkan robot bergerak' },
    ];
    const pairs = shuffle(pool).slice(0, 4);
    return matchRound({ prompt: 'Padankan bahagian robot dengan fungsinya.', pairs, explain: 'Setiap bahagian robot ada fungsi khusus.' });
  },
});

registerGame({
  id: 'rc-c2',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const pool = [
      { label: 'Badan robot', correct: true },
      { label: 'Pengawal (otak)', correct: true },
      { label: 'Motor dan roda', correct: true },
      { label: 'Sensor jarak', correct: true },
      { label: 'Bateri', correct: true },
      { label: 'Bantal sofa', correct: false },
      { label: 'Cawan kaca', correct: false },
      { label: 'Daun pisang', correct: false },
    ];
    return multiRound({
      prompt: 'Pilih SEMUA komponen yang diperlukan untuk membina robot mudah.',
      items: shuffle(pool).slice(0, 6),
      explain: 'Robot mudah perlukan badan, pengawal, motor/roda, sensor dan sumber tenaga.',
    });
  },
});

registerGame({
  id: 'rc-c3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => sensorRound(ctx),
});

registerGame({
  id: 'rc-c4',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level, ctx) => nextStepRound(MAP_EASY, 'Kawal robot mengikut arahan yang diberi.'),
});

registerGame({
  id: 'rc-c5',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => machineHumanRound(ctx),
});

registerGame({
  id: 'rc-c6',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const items = take(ctx, AI_EXAMPLES);
    // ambil 2 contoh betul + 2 salah secara rawak
    const trues = shuffle(AI_EXAMPLES.filter((i) => i.correct)).slice(0, 2);
    const falses = shuffle(AI_EXAMPLES.filter((i) => !i.correct)).slice(0, 2);
    return multiRound({
      prompt: 'Pilih SEMUA contoh yang menggunakan kecerdasan buatan (AI).',
      items: shuffle([...trues, ...falses]),
      explain: 'AI digunakan apabila sistem belajar daripada data untuk mengecam, mencadang atau membuat keputusan.',
    });
  },
});

registerGame({
  id: 'rc-c7',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const cats = {
      haiwan: ['🐱', '🐶', '🐦', '🐟', '🐰'],
      kenderaan: ['🚗', '🚲', '✈️', '🚌', '🛵'],
      buah: ['🍎', '🍌', '🍇', '🍉', '🍓'],
    };
    const names = Object.keys(cats);
    const chosen = shuffle(names).slice(0, 2);
    const items = [];
    chosen.forEach((c) => {
      shuffle(cats[c]).slice(0, 2).forEach((emoji, i) => items.push({ id: c + i + emoji, label: emoji, group: c }));
    });
    return groupsRound({
      prompt: 'Robot belajar daripada contoh. Kumpulkan gambar ini ke kategori yang betul.',
      groups: chosen.map((c) => ({ id: c, label: c[0].toUpperCase() + c.slice(1) })),
      items: shuffle(items),
      explain: 'Kumpulan contoh yang betul membantu robot mengenal corak.',
    });
  },
});

registerGame({
  id: 'rc-c8',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const s = take(ctx, AI_STATEMENTS);
    return choiceRound({
      prompt: `Betul atau salah? "${s.text}"`,
      correct: 'Betul',
      wrong: ['Salah'],
      explain: s.why,
      options: shuffle([
        { label: 'Betul', correct: s.truth },
        { label: 'Salah', correct: !s.truth },
      ]),
    });
  },
});

registerGame({
  id: 'rc-c9',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const trues = shuffle(AUTOMATION.filter((i) => i.correct)).slice(0, 2);
    const falses = shuffle(AUTOMATION.filter((i) => !i.correct)).slice(0, 2);
    return multiRound({
      prompt: 'Pilih SEMUA tugasan yang boleh diautomasikan dengan selamat.',
      items: shuffle([...trues, ...falses]),
      explain: 'Kerja berulang dan jelas boleh diautomasikan. Kerja yang perlukan empati dan penilaian manusia tidak sesuai.',
    });
  },
});

registerGame({
  id: 'rc-c10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      robotMixRound(ctx),
      sensorRound(ctx),
      (() => {
        const pairs = shuffle([
          { id: 'm', left: 'Motor', right: 'Menggerakkan roda' },
          { id: 's', left: 'Sensor', right: 'Mengesan persekitaran' },
          { id: 'b', left: 'Bateri', right: 'Membekalkan tenaga' },
          { id: 'o', left: 'Pengawal', right: 'Memproses program' },
        ]);
        return matchRound({ prompt: 'Cabaran: Padankan bahagian robot dengan fungsinya.', pairs, explain: 'Bahagian robot bekerjasama.' });
      })(),
      (() => {
        const s = take(ctx, AI_STATEMENTS);
        return choiceRound({
          prompt: `Cabaran AI: "${s.text}" — Betul atau salah?`,
          options: shuffle([{ label: 'Betul', correct: s.truth }, { label: 'Salah', correct: !s.truth }]),
          explain: s.why,
        });
      })(),
      machineHumanRound(ctx),
    ];
    return { rounds };
  },
});
