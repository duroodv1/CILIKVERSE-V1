// Modul 2: Bijak Wang Junior — 30 permainan literasi kewangan (RM, simulasi maya).
// Tiada imej babi digunakan di mana-mana. Semua transaksi adalah simulasi pendidikan.

import { registerGame } from '../../js/engine.js';
import {
  choiceRound,
  sortRound,
  matchRound,
  multiRound,
  groupsRound,
  numpadRound,
  budgetRound,
  moneyHTML,
  moneySumHTML,
  moneyItem,
  pickMoney,
  makeExactChange,
  take,
} from '../../js/games-kit.js';
import { ri, pick, shuffle, senToText, sample } from '../../js/shared.js';

const BADGE = 'Bijak Wang Junior';
const rm = (sen) => senToText(sen);
const coins = [100, 50, 20, 10, 5];
const notes = [100, 500, 1000, 2000, 5000, 10000];

function moneyVisual(list) {
  return `<div class="money-visual">${list.map((s) => moneyHTML(s)).join('')}</div>`;
}

function moneyChoice({ question, sen, explain, pool = [...notes, ...coins] }) {
  const wrongs = sample(pool.filter((v) => v !== sen), 3);
  return choiceRound({
    prompt: question,
    html: moneyVisual([sen]),
    options: shuffle([
      { label: rm(sen), correct: true },
      ...wrongs.map((w) => ({ label: rm(w), correct: false })),
    ]),
    explain,
  });
}

// Jumlah tepat dengan satu-satunya kombinasi sah (disemak melalui subset-sum).
function exactMoneyRound({ targetText, maxItems = 3, prompt }) {
  const denoms = [1000, 500, 200, 100, 50, 20, 10, 5];
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const combo = sample(denoms, ri(2, maxItems));
    const target = combo.reduce((a, b) => a + b, 0);
    if (target < 10 || target > 3000) continue;
    const decoyPool = denoms.filter((v) => !combo.includes(v));
    const decoys = sample(decoyPool, 2);
    const all = [...combo, ...decoys];
    // pastikan hanya subset jawapan yang menjumlah tepat
    let solutions = 0;
    const n = all.length;
    for (let mask = 1; mask < 1 << n; mask += 1) {
      let sum = 0;
      for (let i = 0; i < n; i += 1) if (mask & (1 << i)) sum += all[i];
      if (sum === target) solutions += 1;
    }
    if (solutions !== 1) continue;
    const items = shuffle(all.map((v, i) => moneyItem(v, i < combo.length)));
    return multiRound({
      prompt: prompt || `Pilih wang yang jumlahnya TEPAT ${rm(target)}.`,
      items,
      explain: `Gabungan yang betul: ${combo.map(rm).join(' + ')} = ${rm(target)}.`,
    });
  }
  const combo = [500, 200, 50];
  return multiRound({
    prompt: prompt || 'Pilih wang yang jumlahnya TEPAT RM7.50.',
    items: shuffle([500, 200, 50, 1000, 100].map((v, i) => moneyItem(v, i < 3))),
    explain: 'RM5.00 + RM2.00 + RM0.50 = RM7.50.',
  });
}

function budgetRoundFor(items, budget, explain, prompt) {
  return budgetRound({ prompt, budget, items, explain });
}

// ====== Kategori A: Kenali Wang ======
registerGame({
  id: 'bw-a1',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      { sen: 500, name: 'RM5' },
      { sen: 1000, name: 'RM10' },
      { sen: 2000, name: 'RM20' },
      { sen: 5000, name: 'RM50' },
      { sen: 10000, name: 'RM100' },
      { sen: 100, name: 'RM1' },
      { sen: 50, name: '50 sen' },
      { sen: 20, name: '20 sen' },
      { sen: 10, name: '10 sen' },
      { sen: 5, name: '5 sen' },
    ];
    const item = take(ctx, pool);
    const wrongs = sample(pool.filter((p) => p.sen !== item.sen), 3).map((p) => p.name);
    return choiceRound({
      prompt: 'Wang Ringgit Malaysia ini bernilai berapa?',
      html: moneyVisual([item.sen]),
      correct: item.name,
      wrong: wrongs,
      explain: `Wang ${item.name} mempunyai nilai ${item.name}. Warnanya berbeza mengikut nilai.`,
    });
  },
});

registerGame({
  id: 'bw-a2',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'match',
  generate: (level, ctx) => {
    const values = shuffle([5, 10, 20, 50, 100, 500, 1000, 2000]).slice(0, 4);
    const pairs = values.map((v) => ({
      id: 'm' + v,
      left: rm(v),
      leftHtml: moneyHTML(v),
      right: rm(v),
    }));
    return matchRound({
      prompt: 'Padankan wang dengan nilai bertulis yang betul.',
      pairs,
      explain: 'Kira nilai wang dengan teliti sebelum memadankan.',
    });
  },
});

registerGame({
  id: 'bw-a3',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'numpad',
  generate: (level, ctx) => {
    const n = ri(3, 4 + Math.min(level, 2));
    const list = Array.from({ length: n }, () => pick(coins));
    const answer = list.reduce((a, b) => a + b, 0);
    return numpadRound({
      prompt: 'Berapakah jumlah nilai syiling ini?',
      html: moneyVisual(list),
      answer,
      explain: `${list.map(rm).join(' + ')} = ${rm(answer)}.`,
    });
  },
});

registerGame({
  id: 'bw-a4',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'numpad',
  generate: (level, ctx) => {
    const n = ri(2, 3);
    const list = Array.from({ length: n }, () => pick([100, 500, 1000, 2000, 5000]));
    const answer = list.reduce((a, b) => a + b, 0);
    return numpadRound({
      prompt: 'Berapakah jumlah nilai wang kertas ini?',
      html: moneyVisual(list),
      answer,
      explain: `${list.map(rm).join(' + ')} = ${rm(answer)}.`,
    });
  },
});

registerGame({
  id: 'bw-a5',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => exactMoneyRound({}),
});

registerGame({
  id: 'bw-a6',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const budget = ri(5, 20) * 100;
    const affordable = ri(2, budget / 100 - 1) * 100;
    const pool = [
      { emoji: '📕', label: 'Buku latihan', price: affordable },
      { emoji: '✏️', label: 'Set pensel', price: affordable - 100 > 0 ? Math.max(100, affordable - 100) : 100 },
      { emoji: '🎒', label: 'Beg sekolah', price: budget + 500 },
      { emoji: '🚲', label: 'Basikal', price: budget + 3000 },
      { emoji: '🎮', label: 'Konsol permainan', price: budget + 8000 },
    ];
    const options = shuffle([
      { html: `📕 Buku latihan <span class="price">${rm(pool[0].price)}</span>`, label: 'Buku latihan', correct: true },
      { html: `🎒 Beg sekolah <span class="price">${rm(pool[2].price)}</span>`, label: 'Beg sekolah', correct: false },
      { html: `🚲 Basikal <span class="price">${rm(pool[3].price)}</span>`, label: 'Basikal', correct: false },
      { html: `🎮 Konsol permainan <span class="price">${rm(pool[4].price)}</span>`, label: 'Konsol', correct: false },
    ]);
    return choiceRound({
      prompt: `Di Kedai Mini, kamu ada ${rm(budget)} sahaja. Barang mana yang MAMPU dibeli?`,
      options,
      explain: `Buku latihan ${rm(pool[0].price)} masih dalam bajet ${rm(budget)}. Barang lain melebihi wang kamu.`,
    });
  },
});

registerGame({
  id: 'bw-a7',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'numpad',
  generate: (level, ctx) => {
    const price = ri(3, 18) * 50;
    const paid = pick([1000, 2000, 5000, 10000].filter((p) => p > price));
    const change = paid - price;
    return numpadRound({
      prompt: `Kamu membeli barang berharga ${rm(price)} dan membayar ${rm(paid)}. Berapakah baki wang kamu?`,
      html: moneySumHTML([paid]),
      answer: change,
      explain: `Baki = ${rm(paid)} − ${rm(price)} = ${rm(change)}.`,
    });
  },
});

registerGame({
  id: 'bw-a8',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'sort',
  generate: (level, ctx) => {
    const values = sample([5, 10, 20, 50, 100, 500, 1000, 2000, 5000, 10000], 4);
    const answer = [...values].sort((a, b) => a - b).map((v) => 'v' + v);
    return sortRound({
      prompt: 'Susun nilai wang daripada KECIL kepada BESAR.',
      items: values.map((v) => ({ id: 'v' + v, label: rm(v), html: moneyHTML(v) })),
      answer,
      explain: 'Susunan betul: ' + [...values].sort((a, b) => a - b).map(rm).join(' → ') + '.',
    });
  },
});

registerGame({
  id: 'bw-a9',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => exactMoneyRound({ prompt: level >= 2 ? 'Pilih wang yang cukup untuk membayar TEPAT.' : undefined, maxItems: 3 }),
});

registerGame({
  id: 'bw-a10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const coinList = Array.from({ length: 4 }, () => pick(coins));
    const coinSum = coinList.reduce((a, b) => a + b, 0);
    const rounds = [
      moneyChoice({ question: 'Cabaran 1: Wang ini bernilai berapa?', sen: pick([500, 1000, 2000, 5000]), explain: 'Kenal pasti nilai pada wang.' }),
      numpadRound({
        prompt: 'Cabaran 2: Jumlahkan syiling ini.',
        html: moneyVisual(coinList),
        answer: coinSum,
        explain: `${coinList.map(rm).join(' + ')} = ${rm(coinSum)}.`,
      }),
      exactMoneyRound({ prompt: 'Cabaran 3: Pilih wang yang jumlahnya tepat.' }),
      (() => {
        const values = shuffle([100, 500, 1000, 2000]).slice(0, 4);
        return sortRound({
          prompt: 'Cabaran 4: Susun daripada kecil kepada besar.',
          items: values.map((v) => ({ id: 'c' + v, label: rm(v), html: moneyHTML(v) })),
          answer: [...values].sort((a, b) => a - b).map((v) => 'c' + v),
          explain: 'Nilai kecil dahulu: ' + [...values].sort((a, b) => a - b).map(rm).join(', ') + '.',
        });
      })(),
      choiceRound({
        prompt: 'Cabaran 5: Wang RM20 dan RM5. Berapakah jumlahnya?',
        correct: 'RM25.00',
        wrong: ['RM15.00', 'RM30.00', 'RM205.00'],
        explain: 'RM20 + RM5 = RM25.',
      }),
    ];
    return { rounds };
  },
});

// ====== Kategori B: Pengurusan Wang ======
registerGame({
  id: 'bw-b1',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Nasi dan lauk untuk makan', group: 'perlu' },
      { label: 'Air minuman', group: 'perlu' },
      { label: 'Buku latihan sekolah', group: 'perlu' },
      { label: 'Ais krim', group: 'hendak' },
      { label: 'Pelekat kartun', group: 'hendak' },
      { label: 'Tiket filem', group: 'hendak' },
      { label: 'Kasut sekolah', group: 'perlu' },
      { label: 'Permainan video', group: 'hendak' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Klasifikasikan setiap item: KEPERLUAN atau KEHENDAK?',
      groups: [
        { id: 'perlu', label: 'Keperluan' },
        { id: 'hendak', label: 'Kehendak' },
      ],
      items,
      explain: 'Keperluan diperlukan untuk hidup dan belajar. Kehendak menyeronokkan tetapi boleh ditangguhkan.',
    });
  },
});

registerGame({
  id: 'bw-b2',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'budget',
  generate: (level, ctx) =>
    budgetRoundFor(
      [
        { emoji: '🍱', label: 'Makanan sihat', price: 1200, need: true },
        { emoji: '🚌', label: 'Pengangkutan ke sekolah', price: 500, need: true },
        { emoji: '📚', label: 'Buku latihan', price: 400, need: true },
        { emoji: '🍦', label: 'Ais krim', price: 300 },
        { emoji: '🎬', label: 'Tiket filem', price: 600 },
        { emoji: '✨', label: 'Pelekat', price: 200 },
      ],
      2500,
      'Bajet mingguan RM25.00. Semua keperluan berjumlah RM21.00. Baki RM4.00 boleh digunakan untuk kehendak.',
      'Bajet Mingguan: pilih semua KEPERLUAN dan kehendak yang masih dalam bajet RM25.00.'
    ),
});

registerGame({
  id: 'bw-b3',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Bajet kamu RM20. Rancangan mana paling bijak?',
        correct: 'Makan RM10, simpan RM6, hiburan RM4',
        wrong: ['Hiburan RM20, simpan RM0', 'Makan RM5 dan mainan RM15', 'Belanja semua RM20 tanpa simpanan'],
        why: 'Rancangan bijak mesti ada keperluan, simpanan dan baki untuk hiburan.',
      },
      {
        prompt: 'Wang poket RM15. Apakah rancangan yang seimbang?',
        correct: 'Makan RM6, simpan RM5, kehendak RM4',
        wrong: ['Simpan RM0, belanja RM15', 'Simpan RM15, tiada makan', 'Belanja RM20'],
        why: 'Seimbang bermaksud cukup makan, ada simpanan dan sedikit untuk keseronokan.',
      },
      {
        prompt: 'Bajet RM30 untuk satu minggu. Pilihan mana paling munasabah?',
        correct: 'Makan RM12, pengangkutan RM6, simpanan RM8, lain-lain RM4',
        wrong: ['Makan RM3 sahaja', 'Belanja RM30 pada hari pertama', 'Pinjam wang untuk filem'],
        why: 'Belanjawan perlu meliputi keperluan, simpanan dan perbelanjaan kecil lain.',
      },
      {
        prompt: 'Kamu ada RM25. Mana tindakan yang mengelakkan pembaziran?',
        correct: 'Beli keperluan dahulu dan simpan baki',
        wrong: ['Beli semua barang yang nampak menarik', 'Belanja semua pada gula-gula', 'Pinjam wang untuk membeli mainan'],
        why: 'Beli keperluan dahulu dan simpan baki mengelakkan pembaziran.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'bw-b4',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const item = pick(['Buku latihan', 'Bekas air', 'Pensel warna', 'Payung', 'Beg sekolah']);
    const cheap = ri(3, 12) * 100;
    const expensive = cheap + ri(2, 10) * 100;
    return choiceRound({
      prompt: `Di Kedai A, ${item} berharga ${rm(cheap)}. Di Kedai B, ${item} yang SAMA berharga ${rm(expensive)}. Kedai mana lebih bijak untuk membeli?`,
      correct: `Kedai A (${rm(cheap)})`,
      wrong: [`Kedai B (${rm(expensive)})`, 'Kedua-duanya sama sahaja', 'Jangan beli langsung'],
      explain: `Kedai A lebih murah sebanyak ${rm(expensive - cheap)} untuk barang yang sama.`,
    });
  },
});

registerGame({
  id: 'bw-b5',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const unit1 = ri(2, 6) * 100;
    const unit2 = unit1 + ri(1, 4) * 100;
    const n1 = ri(2, 4);
    const n2 = ri(2, 4);
    const price1 = unit1 * n1;
    const price2 = unit2 * n2;
    const text = (k, n, p, u) => `Tawaran ${k}: ${n} biji dengan harga ${rm(p)} (${rm(u)} sebiji)`;
    return choiceRound({
      prompt: 'Tawaran mana lebih BERBALOI (harga sebiji lebih murah)?',
      options: shuffle([
        { label: text('A', n1, price1, unit1), correct: true },
        { label: text('B', n2, price2, unit2), correct: false },
      ]),
      explain: `Harga sebiji A ialah ${rm(unit1)}, lebih murah daripada B (${rm(unit2)}).`,
    });
  },
});

registerGame({
  id: 'bw-b6',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'budget',
  generate: (level, ctx) =>
    budgetRoundFor(
      [
        { emoji: '📗', label: 'Buku latihan', price: 700, need: true },
        { emoji: '🥤', label: 'Bekas air', price: 500, need: true },
        { emoji: '🚌', label: 'Tambah nilai kad pengangkutan', price: 300, need: true },
        { emoji: '🧸', label: 'Mainan kecil', price: 600 },
        { emoji: '🏷️', label: 'Pelekat', price: 200 },
      ],
      2000,
      'Keperluan berjumlah RM15.00 daripada bajet RM20.00. Pilih kehendak yang masih muat.',
      'Perbelanjaan Terhad: pilih keperluan dan pastikan jumlah TIDAK MELEBIHI RM20.00.'
    ),
});

registerGame({
  id: 'bw-b7',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'sort',
  generate: (level, ctx) => {
    const pools = [
      {
        prompt: 'Susun perbelanjaan daripada keutamaan TERTINGGI kepada terendah.',
        items: [
          { id: 'a', label: 'Makanan sihat', value: 1 },
          { id: 'b', label: 'Pengangkutan ke sekolah', value: 2 },
          { id: 'c', label: 'Simpanan kecemasan', value: 3 },
          { id: 'd', label: 'Tiket filem', value: 4 },
        ],
        why: 'Keperluan asas dahulu, kemudian simpanan, barulah hiburan.',
      },
      {
        prompt: 'Susun keutamaan untuk wang poket mingguan.',
        items: [
          { id: 'a', label: 'Bayar makanan', value: 1 },
          { id: 'b', label: 'Beli alat tulis yang habis', value: 2 },
          { id: 'c', label: 'Simpan untuk sasaran', value: 3 },
          { id: 'd', label: 'Beli pelekat baru', value: 4 },
        ],
        why: 'Makan dan alat belajar didahulukan, simpanan selepas itu, kehendak terakhir.',
      },
      {
        prompt: 'Susun tabiat kewangan daripada yang paling penting diamalkan.',
        items: [
          { id: 'a', label: 'Catat perbelanjaan', value: 1 },
          { id: 'b', label: 'Tetapkan bajet', value: 2 },
          { id: 'c', label: 'Simpan setiap minggu', value: 3 },
          { id: 'd', label: 'Belanja untuk hiburan', value: 4 },
        ],
        why: 'Rekod dahulu, tetapkan bajet, simpan, kemudian baru hiburan.',
      },
    ];
    const p = take(ctx, pools);
    return sortRound({ prompt: p.prompt, items: p.items, answer: p.items.map((i) => i.id), explain: p.why });
  },
});

registerGame({
  id: 'bw-b8',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu mahu set pelekat RM15 tetapi wang simpanan hanya RM20 untuk sasaran buku RM20. Apa patut dibuat?',
        correct: 'Tangguhkan pembelian dan simpan wang',
        wrong: ['Beli sekarang juga', 'Pinjam wang kawan', 'Gunakan wang simpanan sasaran'],
        why: 'Kehendak boleh ditangguhkan supaya sasaran simpanan tercapai.',
      },
      {
        prompt: 'Kasut sekolah rosak dan kamu perlukan kasut baru. Ini…',
        correct: 'Keutamaan untuk dibeli sekarang',
        wrong: ['Patut ditangguhkan', 'Tidak perlu dibeli', 'Patut diminta sebagai hadiah sahaja'],
        why: 'Kasut sekolah ialah keperluan pembelajaran, jadi ia keutamaan.',
      },
      {
        prompt: 'Kamu melihat mainan diskaun 50% tetapi sudah ada mainan serupa.',
        correct: 'Tangguhkan pembelian',
        wrong: ['Beli dua', 'Beli kerana diskaun', 'Pinjam wang untuk membeli'],
        why: 'Diskaun bukan sebab untuk membeli barang yang tidak diperlukan.',
      },
      {
        prompt: 'Rakan mengajak membeli gula-gula setiap hari selepas sekolah.',
        correct: 'Tangguhkan dan pilih sekali-sekala sahaja',
        wrong: ['Beli setiap hari', 'Minta rakan belanja', 'Gunakan wang tambang'],
        why: 'Membeli setiap hari membazir. Lebih baik sekali-sekala.',
      },
      {
        prompt: 'Buku cerita yang kamu mahu sedang diskaun, dan kamu ada wang lebih selepas simpanan.',
        correct: 'Boleh beli jika bajet membenarkan',
        wrong: ['Mesti beli semua buku', 'Jangan beli walaupun ada bajet', 'Pinjam wang untuk beli lebih banyak'],
        why: 'Jika keperluan dan simpanan sudah diurus, membeli dalam bajet adalah wajar.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'bw-b9',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Masukkan RM5 ke balang simpanan', group: 'simpanan' },
      { label: 'Beli buku latihan', group: 'keperluan' },
      { label: 'Bayar tambang bas ke sekolah', group: 'keperluan' },
      { label: 'Beli pelekat kartun', group: 'kehendak' },
      { label: 'Beli tiket filem', group: 'kehendak' },
      { label: 'Simpan RM2 untuk sasaran basikal', group: 'simpanan' },
      { label: 'Beli air minuman', group: 'keperluan' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Rekod Wang: kategorikan setiap transaksi simulasi.',
      groups: [
        { id: 'simpanan', label: 'Simpanan' },
        { id: 'keperluan', label: 'Keperluan' },
        { id: 'kehendak', label: 'Kehendak' },
      ],
      items,
      explain: 'Merekod transaksi membantu kita tahu ke mana wang pergi.',
    });
  },
});

registerGame({
  id: 'bw-b10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      choiceRound({
        prompt: 'Cabaran 1: RM40 + RM5 + RM2 = ?',
        correct: 'RM47.00',
        wrong: ['RM45.00', 'RM65.00', 'RM37.00'],
        explain: '40 + 5 + 2 = RM47.',
      }),
      budgetRoundFor(
        [
          { emoji: '🍱', label: 'Makanan', price: 1000, need: true },
          { emoji: '📚', label: 'Buku', price: 500, need: true },
          { emoji: '🎮', label: 'Permainan', price: 900 },
          { emoji: '🍬', label: 'Gula-gula', price: 400 },
        ],
        2000,
        'Keperluan RM15.00, bajet RM20.00. Baki RM5.00 sahaja untuk kehendak.',
        'Cabaran 2: Rancang bajet RM20.00 dengan semua keperluan.'
      ),
      groupsRound({
        prompt: 'Cabaran 3: Keperluan atau kehendak?',
        groups: [
          { id: 'perlu', label: 'Keperluan' },
          { id: 'hendak', label: 'Kehendak' },
        ],
        items: shuffle([
          { label: 'Payung waktu hujan', group: 'perlu' },
          { label: 'Stiker koleksi', group: 'hendak' },
          { label: 'Makan tengah hari', group: 'perlu' },
          { label: 'Permainan arcade', group: 'hendak' },
        ]),
        explain: 'Utamakan keperluan sebelum kehendak.',
      }),
      choiceRound({
        prompt: 'Cabaran 4: Wang simpanan RM30, sasaran RM50. Berapa lagi perlu disimpan?',
        correct: 'RM20.00',
        wrong: ['RM10.00', 'RM80.00', 'RM30.00'],
        explain: 'RM50 − RM30 = RM20.',
      }),
      groupsRound({
        prompt: 'Cabaran 5: Kategorikan transaksi.',
        groups: [
          { id: 'simpanan', label: 'Simpanan' },
          { id: 'kehendak', label: 'Kehendak' },
        ],
        items: shuffle([
          { label: 'Simpan RM10 di rumah', group: 'simpanan' },
          { label: 'Beli mainan baharu', group: 'kehendak' },
          { label: 'Simpan untuk basikal', group: 'simpanan' },
          { label: 'Beli gula-gula', group: 'kehendak' },
        ]),
        explain: 'Simpanan membina masa depan; kehendak boleh ditangguhkan.',
      }),
    ];
    return { rounds };
  },
});

// ====== Kategori C: Simpanan & Keputusan Bijak ======
registerGame({
  id: 'bw-c1',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'numpad',
  generate: (level, ctx) => {
    const weekly = ri(2, 6) * 100;
    const weeks = ri(3, 6);
    const total = weekly * weeks;
    return numpadRound({
      prompt: `Kamu menyimpan ${rm(weekly)} setiap minggu selama ${weeks} minggu. Berapakah jumlah dalam balang simpanan?`,
      html: `<div class="jar-visual" aria-hidden="true">🫙<span class="jar-coins">${'🪙'.repeat(
        Math.min(weeks, 6)
      )}</span></div>`,
      answer: total,
      explain: `${rm(weekly)} × ${weeks} minggu = ${rm(total)}.`,
    });
  },
});

registerGame({
  id: 'bw-c2',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const weekly = ri(2, 5) * 100;
    const goal = weekly * ri(4, 10);
    const weeks = Math.ceil(goal / weekly);
    const wrongs = shuffle([weeks - 1, weeks + 1, weeks + 2].filter((w) => w > 0 && w !== weeks)).map((w) => `${w} minggu`);
    return choiceRound({
      prompt: `Sasaran simpanan kamu ${rm(goal)}. Kamu menyimpan ${rm(weekly)} setiap minggu. Berapa minggu diperlukan?`,
      correct: `${weeks} minggu`,
      wrong: wrongs,
      explain: `${rm(goal)} ÷ ${rm(weekly)} = ${weeks} minggu.`,
    });
  },
});

registerGame({
  id: 'bw-c3',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'numpad',
  generate: (level, ctx) => {
    const start = ri(1, 5) * 100;
    const weekly = ri(2, 4) * 100;
    const weeks = ri(2, 5);
    const total = start + weekly * weeks;
    return numpadRound({
      prompt: `Kamu sudah simpan ${rm(start)}. Setiap minggu kamu tambah ${rm(
        weekly
      )}. Berapakah jumlah simpanan selepas ${weeks} minggu?`,
      answer: total,
      explain: `${rm(start)} + (${rm(weekly)} × ${weeks}) = ${rm(total)}.`,
    });
  },
});

registerGame({
  id: 'bw-c4',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Apakah tujuan utama DANA KECEMASAN?',
        correct: 'Untuk keadaan tidak dijangka seperti peralatan rosak',
        wrong: ['Untuk membeli mainan terbaru', 'Untuk belanja makanan ringan', 'Untuk membeli hadiah hari jadi'],
        why: 'Dana kecemasan membantu kita apabila berlaku perkara tidak dijangka.',
      },
      {
        prompt: 'Kamu ada simpanan kecemasan. Bila patut digunakan?',
        correct: 'Apabila kasut sekolah rosak dan perlu diganti segera',
        wrong: ['Apabila ada jualan besar', 'Apabila rakan ajak ke panggung', 'Apabila mahu pelekat baharu'],
        why: 'Dana kecemasan untuk keperluan mendesak, bukan kehendak.',
      },
      {
        prompt: 'Mengapa dana kecemasan penting untuk keluarga?',
        correct: 'Membantu menghadapi perbelanjaan mendadak tanpa hutang',
        wrong: ['Supaya boleh belanja lebih banyak', 'Supaya tidak perlu bekerja', 'Supaya boleh membeli barang mahal'],
        why: 'Dana kecemasan mengelakkan hutang ketika kecemasan.',
      },
      {
        prompt: 'Berapa yang sesuai disimpan dahulu sebagai dana kecemasan kecil?',
        correct: 'Sebahagian kecil wang poket setiap minggu sehingga cukup',
        wrong: ['Semua wang dibelanjakan', 'Tiada simpanan langsung', 'Pinjam wang untuk simpanan'],
        why: 'Simpanan kecil yang konsisten membina dana kecemasan.',
      },
      {
        prompt: 'Dana kecemasan kamu habis digunakan untuk membaiki basikal. Apa seterusnya?',
        correct: 'Mula menyimpan semula sedikit demi sedikit',
        wrong: ['Berhenti menyimpan', 'Belanja baki wang', 'Pinjam lebih banyak wang'],
        why: 'Selepas digunakan, bina semula dana kecemasan secara berperingkat.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'bw-c5',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'budget',
  generate: (level, ctx) =>
    budgetRound({
      prompt: 'Wang hadiah RM50.00 (simulasi). Masukkan simpanan ke dalam pelan kamu, kemudian pilih hadiah dalam bajet.',
      budget: 5000,
      items: [
        { emoji: '🏦', label: 'Simpanan untuk sasaran', price: 2000, need: true },
        { emoji: '📚', label: 'Buku cerita', price: 1500 },
        { emoji: '🎁', label: 'Hadiah untuk keluarga', price: 1200 },
        { emoji: '🍦', label: 'Ais krim', price: 500 },
        { emoji: '🎧', label: 'Fon telinga', price: 3500 },
      ],
      explain: 'Simpan dahulu sebahagian wang hadiah, kemudian belanja dalam bajet yang tinggal.',
    }),
});

registerGame({
  id: 'bw-c6',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Pilihan A: Beg RM80 tahan 2 tahun. Pilihan B: Beg RM40 tahan 6 bulan. Mana lebih bijak?',
        correct: 'Pilihan A kerana tahan lebih lama',
        wrong: ['Pilihan B kerana murah', 'Kedua-duanya sama', 'Jangan beli beg'],
        why: 'Nilai jangka panjang lebih penting daripada harga awal sahaja.',
      },
      {
        prompt: 'Buku latihan RM8 baharu atau buku terpakai RM3 masih elok. Mana lebih bijak jika kandungan sama?',
        correct: 'Buku terpakai RM3',
        wrong: ['Buku baharu RM8', 'Beli kedua-duanya', 'Jangan beli buku'],
        why: 'Jika kandungan sama dan buku masih elok, pilihan lebih murah menjimatkan wang.',
      },
      {
        prompt: 'Alat tulis murah cepat rosak. Alat tulis sederhana harga tahan lama. Mana lebih berbaloi?',
        correct: 'Alat tulis yang tahan lama',
        wrong: ['Yang paling murah selalu', 'Yang paling mahal selalu', 'Beli banyak yang murah'],
        why: 'Nilai keseluruhan mengambil kira ketahanan, bukan harga sahaja.',
      },
      {
        prompt: 'Kamu perlukan 3 buku. Beli 1 demi 1 atau set 3 dengan harga diskaun?',
        correct: 'Set 3 jika memang perlu dan lebih murah',
        wrong: ['Beli 5 set', 'Beli satu yang paling mahal', 'Jangan beli'],
        why: 'Diskaun berbaloi jika barang memang diperlukan.',
      },
      {
        prompt: 'Dua pilihan hadiah untuk rakan: RM10 yang tidak digunakan atau RM6 yang sangat berguna. Mana lebih baik?',
        correct: 'RM6 yang berguna',
        wrong: ['RM10 yang tidak digunakan', 'Yang paling mahal', 'Tiada hadiah'],
        why: 'Nilai kepada penerima lebih penting daripada harga.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'bw-c7',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Beli makanan berlebihan lalu dibuang', group: 'bazir' },
      { label: 'Simpan sebahagian wang poket', group: 'bijak' },
      { label: 'Membeli kerana iklan tanpa fikir', group: 'bazir' },
      { label: 'Bawa botol air sendiri', group: 'bijak' },
      { label: 'Membaiki barang yang rosak kecil', group: 'bijak' },
      { label: 'Membiarkan air paip mengalir', group: 'bazir' },
      { label: 'Membandingkan harga sebelum membeli', group: 'bijak' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Tabiat mana MEMBAZIR dan mana BIJAK?',
      groups: [
        { id: 'bazir', label: 'Membazir' },
        { id: 'bijak', label: 'Bijak' },
      ],
      items,
      explain: 'Membazir membuang nilai. Tabiat bijak menyimpan nilai untuk masa depan.',
    });
  },
});

registerGame({
  id: 'bw-c8',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'numpad',
  generate: (level, ctx) => {
    const goal = ri(20, 80) * 100;
    const saved = ri(5, goal / 100 - 2) * 100;
    const remain = goal - saved;
    return numpadRound({
      prompt: `Sasaran kamu ${rm(goal)} dan kamu sudah menyimpan ${rm(
        saved
      )}. Berapa banyak lagi yang perlu disimpan?`,
      answer: remain,
      explain: `${rm(goal)} − ${rm(saved)} = ${rm(remain)}.`,
    });
  },
});

registerGame({
  id: 'bw-c9',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Rakan meminjam RM10 dan berjanji bayar. Apa tindakan paling bertanggungjawab?',
        correct: 'Catatlah pinjaman dan ingatkan dengan sopan',
        wrong: ['Lupakan sahaja', 'Minta lebih banyak wang', 'Berhenti berkawan'],
        why: 'Merekod pinjaman dan berbincang dengan sopan ialah tindakan bertanggungjawab.',
      },
      {
        prompt: 'Kamu terlupa bajet dan wang hampir habis. Apa patut dibuat?',
        correct: 'Belanja keperluan sahaja dan rehatkan perbelanjaan lain',
        wrong: ['Pinjam wang untuk hiburan', 'Beli barang berharga', 'Minta rakan belanja setiap hari'],
        why: 'Kekalkan perbelanjaan pada keperluan apabila wang terhad.',
      },
      {
        prompt: 'Melihat iklan "beli sekarang, bayar kemudian". Apa fikiran bijak?',
        correct: 'Fikir sama ada benar-benar perlu dan mampu',
        wrong: ['Terus beli kerana mudah', 'Beli banyak sekaligus', 'Pinjam wang kawan'],
        why: 'Fikirkan keperluan dan kemampuan sebelum berbelanja.',
      },
      {
        prompt: 'Kamu ingin sesuatu yang mahal. Cara paling sihat?',
        correct: 'Tetapkan sasaran simpanan dan simpan sedikit demi sedikit',
        wrong: ['Gunakan wang kecemasan', 'Pinjam tanpa memberitahu ibu bapa', 'Minta wang dengan merengek'],
        why: 'Menabung mengikut sasaran membina tabiat kewangan baik.',
      },
      {
        prompt: 'Wang hadiah RM50. Keputusan mana menunjukkan pengurusan bijak?',
        correct: 'Simpan sebahagian, belanja sebahagian untuk keperluan',
        wrong: ['Belanja semua dalam sehari', 'Beri semua kepada orang asing', 'Simpan di tempat yang tidak selamat'],
        why: 'Imbangkan simpanan dan perbelanjaan keperluan.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'bw-c10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      numpadRound({
        prompt: 'Cabaran 1: Simpanan RM4.00 seminggu selama 6 minggu. Jumlahnya?',
        answer: 2400,
        explain: 'RM4 × 6 = RM24.00.',
      }),
      choiceRound({
        prompt: 'Cabaran 2: Sasaran RM24, simpanan RM18. Baki?',
        correct: 'RM6.00',
        wrong: ['RM4.00', 'RM42.00', 'RM12.00'],
        explain: 'RM24 − RM18 = RM6.',
      }),
      budgetRound({
        prompt: 'Cabaran 3: Rancang wang hadiah RM30.00. Simpanan WAJIB dipilih.',
        budget: 3000,
        items: [
          { emoji: '🏦', label: 'Simpanan', price: 1000, need: true },
          { emoji: '📚', label: 'Buku latihan', price: 800, need: true },
          { emoji: '🎬', label: 'Filem', price: 700 },
          { emoji: '🧸', label: 'Mainan', price: 1500 },
        ],
        explain: 'Simpanan dan keperluan dahulu, kemudian kehendak dalam bajet.',
      }),
      groupsRound({
        prompt: 'Cabaran 4: Tabiat ini membazir atau bijak?',
        groups: [
          { id: 'bazir', label: 'Membazir' },
          { id: 'bijak', label: 'Bijak' },
        ],
        items: shuffle([
          { label: 'Simpan sisa wang poket', group: 'bijak' },
          { label: 'Beli makanan dan buang', group: 'bazir' },
          { label: 'Bandingkan harga', group: 'bijak' },
          { label: 'Belanja ikut emosi', group: 'bazir' },
        ]),
        explain: 'Tabiat bijak mengelakkan pembaziran.',
      }),
      exactMoneyRound({ prompt: 'Cabaran 5: Pilih wang yang jumlahnya tepat.' }),
    ];
    return { rounds };
  },
});
