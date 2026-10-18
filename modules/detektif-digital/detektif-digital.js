// Modul 3: Detektif Digital — 30 permainan keselamatan, penipuan & etika digital.
// Semua contoh adalah simulasi selamat. Tiada pautan sebenar atau kandungan berbahaya.

import { registerGame } from '../../js/engine.js';
import {
  choiceRound,
  sortRound,
  matchRound,
  multiRound,
  groupsRound,
  budgetRound,
  take,
} from '../../js/games-kit.js';
import { ri, pick, shuffle } from '../../js/shared.js';

const BADGE = 'Detektif Digital';

const SIM = (text) => `<div class="sim-message"><span class="sim-tag">Contoh simulasi</span><div>${text}</div></div>`;

// ====== Kategori A: Keselamatan & Privasi ======
registerGame({
  id: 'dd-a1',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Nama penuh dan alamat rumah', group: 'rahsia' },
      { label: 'Nombor telefon keluarga', group: 'rahsia' },
      { label: 'Kata laluan akaun', group: 'rahsia' },
      { label: 'Warna kegemaran', group: 'kongsi' },
      { label: 'Haiwan peliharaan kegemaran', group: 'kongsi' },
      { label: 'Nama sekolah dan kelas', group: 'rahsia' },
      { label: 'Makanan kegemaran', group: 'kongsi' },
      { label: 'Gambar kad pengenalan', group: 'rahsia' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Maklumat mana perlu DIRAHSIAKAN dan mana boleh dikongsi?',
      groups: [
        { id: 'rahsia', label: 'Rahsia' },
        { id: 'kongsi', label: 'Boleh kongsi' },
      ],
      items,
      explain: 'Maklumat peribadi seperti alamat, nombor telefon, kata laluan dan nama sekolah perlu dirahsiakan.',
    });
  },
});

registerGame({
  id: 'dd-a2',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const style = take(ctx, ['strongest', 'weakest', 'passphrase'], 'a2');
    if (style === 'passphrase') {
      return choiceRound({
        prompt: 'Antara contoh kata laluan ini (bukan kata laluan sebenar), mana paling selamat?',
        correct: 'BiruKucing#2026',
        wrong: ['123456789', 'password', 'namakucing'],
        explain: 'Kata laluan panjang dengan huruf besar, huruf kecil, nombor dan simbol lebih selamat.',
      });
    }
    if (style === 'weakest') {
      return choiceRound({
        prompt: 'Contoh kata laluan mana PALING mudah diteka?',
        correct: '123456',
        wrong: ['BiruKucing#2026', 'AyamTidur!9', 'Bintang_Hijau7'],
        explain: 'Nombor berturutan seperti 123456 sangat mudah diteka.',
      });
    }
    return choiceRound({
      prompt: 'Pilih ciri kata laluan yang SELAMAT.',
      correct: 'Panjang dan ada huruf besar, nombor serta simbol',
      wrong: ['Nama sendiri sahaja', 'Tarikh lahir sahaja', 'Nombor telefon', 'Perkataan "password"'],
      explain: 'Kata laluan selamat panjang serta bercampur huruf, nombor dan simbol. Jangan kongsi dengan sesiapa.',
    });
  },
});

registerGame({
  id: 'dd-a3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu memuat naik gambar dengan nama sekolah dan jadual harian. Apakah risikonya?',
        correct: 'Orang tidak dikenali boleh tahu lokasi dan rutin kamu',
        wrong: ['Gambar jadi lebih cantik', 'Tiada risiko langsung', 'Internet jadi lebih laju'],
        why: 'Jejak digital boleh mendedahkan lokasi dan rutin kepada orang tidak dikenali.',
      },
      {
        prompt: 'Komen yang ditulis ketika marah kemudian dipadam. Adakah ia benar-benar hilang?',
        correct: 'Tidak, ia mungkin sudah disimpan atau ditangkap layar',
        wrong: ['Ya, terus hilang selamanya', 'Ya, jika kita tutup telefon', 'Tidak, kerana internet tiada memori'],
        why: 'Jejak digital sukar dipadam sepenuhnya kerana orang lain boleh menyimpan tangkap layar.',
      },
      {
        prompt: 'Mengapa kita perlu fikir sebelum berkongsi gambar rakan?',
        correct: 'Rakan mungkin tidak mahu gambar itu dikongsi',
        wrong: ['Supaya gambar lebih terang', 'Kerana gambar kecil', 'Supaya telefon lebih laju'],
        why: 'Setiap orang berhak memberi izin sebelum gambar mereka dikongsi.',
      },
      {
        prompt: 'Apa yang perlu dibuat jika gambar lama memalukan masih ada di internet?',
        correct: 'Minta bantuan orang dewasa untuk memadam dan laporkan',
        wrong: ['Biarkan sahaja', 'Kongsi kepada lebih ramai orang', 'Buat akaun baru'],
        why: 'Orang dewasa boleh membantu melaporkan dan memadam kandungan.',
      },
      {
        prompt: 'Apa maksud jejak digital?',
        correct: 'Semua tinggalan aktiviti kita di internet',
        wrong: ['Langkah kaki di lantai', 'Nombor telefon baharu', 'Gambar di dinding bilik'],
        why: 'Jejak digital ialah rekod aktiviti kita dalam talian.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-a4',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Orang tidak dikenali menghantar mesej meminta alamat rumah. Apa tindakan selamat?',
        correct: 'Jangan beri, sekat dan beritahu orang dewasa',
        wrong: ['Berikan alamat', 'Berikan alamat sekolah', 'Hantar gambar rumah'],
        why: 'Jangan berkongsi alamat dengan orang tidak dikenali. Beritahu orang dewasa yang dipercayai.',
      },
      {
        prompt: 'Seorang "rakan baru" dalam talian mengajak bertemu di taman. Apa patut dibuat?',
        correct: 'Tolak dan beritahu ibu bapa atau penjaga',
        wrong: ['Pergi seorang diri', 'Pergi bersama rakan tanpa memberitahu', 'Berikan nombor telefon dahulu'],
        why: 'Jangan sekali-kali bertemu orang yang hanya dikenali dalam talian tanpa kebenaran dan pengawasan dewasa.',
      },
      {
        prompt: 'Akaun tidak dikenali berkata dia "kawan ibu". Dia minta kata laluan. Apa tindakan?',
        correct: 'Jangan beri dan semak dengan ibu sendiri',
        wrong: ['Berikan kerana dia dewasa', 'Berikan separuh sahaja', 'Hantar gambar kad pelajar'],
        why: 'Penipu boleh menyamar sebagai orang yang dikenali. Semak dengan orang dewasa.',
      },
      {
        prompt: 'Dalam permainan dalam talian, pemain lain meminta no telefon untuk "hadiah". Apa tindakan?',
        correct: 'Tolak dan laporkan dalam permainan',
        wrong: ['Berikan no telefon', 'Berikan no telefon rakan', 'Berikan no telefon sekolah'],
        why: 'Jangan berkongsi nombor telefon. Gunakan butang lapor dalam aplikasi.',
      },
      {
        prompt: 'Orang tidak dikenali menghantar gambar yang tidak sesuai. Apa tindakan?',
        correct: 'Jangan teruskan interaksi, sekat dan beritahu orang dewasa',
        wrong: ['Balas dengan gambar lain', 'Kongsi kepada rakan', 'Terus berbual'],
        why: 'Berhenti berinteraksi, sekat dan minta bantuan orang dewasa yang dipercayai.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-a5',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Minta kata laluan', correct: true },
      { label: 'Minta bayaran atau nombor kad bank', correct: true },
      { label: 'Hadiah wang yang terlalu besar', correct: true },
      { label: 'Desak jawab dalam 10 minit', correct: true },
      { label: 'Menyapa dengan sopan', correct: false },
      { label: 'Menggunakan ejaan yang kemas', correct: false },
    ]);
    return multiRound({
      prompt: 'Pilih SEMUA tanda mencurigakan dalam mesej simulasi ini: "TAHNIAH! Kamu menang RM5,000! Beri kata laluan dan nombor kad bank dalam 10 minit sebelum hadiah dibatalkan."',
      items,
      explain: 'Tanda bahaya: minta kata laluan, minta maklumat kewangan, hadiah luar biasa dan desakan segera. Jangan balas.',
    });
  },
});

registerGame({
  id: 'dd-a6',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Nama samaran kegemaran', group: 'boleh' },
      { label: 'Alamat rumah penuh', group: 'jangan' },
      { label: 'Gambar rakan tanpa izin', group: 'jangan' },
      { label: 'Hobi dan minat', group: 'boleh' },
      { label: 'Nombor kad bank', group: 'jangan' },
      { label: 'Lagu kegemaran', group: 'boleh' },
      { label: 'Lokasi sekolah', group: 'jangan' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Kongsi atau jangan kongsi?',
      groups: [
        { id: 'boleh', label: 'Boleh dikongsi' },
        { id: 'jangan', label: 'Jangan dikongsi' },
      ],
      items,
      explain: 'Berkongsi minat adalah selamat. Maklumat peribadi dan gambar orang lain tanpa izin tidak selamat.',
    });
  },
});

registerGame({
  id: 'dd-a7',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Apakah amalan terbaik untuk menjaga peranti?',
        correct: 'Kunci skrin dengan PIN atau kata laluan',
        wrong: ['Biarkan skrin terbuka', 'Kongsi PIN dengan semua orang', 'Pasang aplikasi dari sumber tidak dikenali'],
        why: 'Kunci skrin menghalang orang lain menggunakan peranti kamu.',
      },
      {
        prompt: 'Aplikasi meminta kebenaran yang tidak berkaitan dengan fungsinya. Apa patut dibuat?',
        correct: 'Tolak kebenaran itu dan tanya orang dewasa',
        wrong: ['Terima semua kebenaran', 'Berikan maklumat tambahan', 'Kongsi kata laluan'],
        why: 'Hanya beri kebenaran yang benar-benar diperlukan oleh aplikasi.',
      },
      {
        prompt: 'Kemas kini perisian muncul di skrin. Apa tindakan?',
        correct: 'Pasang kemas kini bersama orang dewasa',
        wrong: ['Abaikan selama-lamanya', 'Matikan peranti', 'Padam semua aplikasi'],
        why: 'Kemas kini penting untuk membaiki kelemahan keselamatan.',
      },
      {
        prompt: 'Kawan meminta menggunakan telefon kamu tanpa kebenaran ibu bapa. Apa tindakan?',
        correct: 'Minta izin orang dewasa dahulu',
        wrong: ['Berikan terus', 'Berikan kata laluan', 'Tinggalkan telefon di meja awam'],
        why: 'Peranti peribadi perlu dijaga dan digunakan dengan izin.',
      },
      {
        prompt: 'Kamu menggunakan Wi-Fi awam percuma di tempat awam. Apa yang perlu dielakkan?',
        correct: 'Membuka akaun atau memasukkan kata laluan',
        wrong: ['Menonton video biasa', 'Mendengar muzik', 'Membaca berita'],
        why: 'Wi-Fi awam mungkin tidak selamat untuk memasukkan maklumat peribadi.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-a8',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Aplikasi meminta akses lokasi tepat sepanjang masa. Risikonya?',
        correct: 'Orang lain boleh tahu di mana kamu berada',
        wrong: ['Bateri bertambah', 'Telefon jadi lebih ringan', 'Internet lebih laju'],
        why: 'Lokasi tepat boleh mendedahkan tempat tinggal dan rutin harian.',
      },
      {
        prompt: 'Kamu ingin memuat naik gambar di restoran. Apa tindakan bijak?',
        correct: 'Kongsi selepas pulang dan jangan tanda lokasi tepat',
        wrong: ['Tanda lokasi tepat serta-merta', 'Kongsi alamat rumah', 'Kongsi jadual harian'],
        why: 'Menangguhkan perkongsian dan mengelakkan lokasi tepat lebih selamat.',
      },
      {
        prompt: 'Rakan meminta kamu hidupkan lokasi berkongsi sepanjang masa. Apa patut dibuat?',
        correct: 'Bincang dengan ibu bapa dan hadkan kepada masa perlu',
        wrong: ['Hidupkan selama-lamanya', 'Kongsi dengan semua kenalan', 'Kongsi lokasi sekolah'],
        why: 'Perkongsian lokasi perlu terhad dan dengan kebenaran orang dewasa.',
      },
      {
        prompt: 'Mengapa "check-in" tempat percutian semasa bercuti boleh berisiko?',
        correct: 'Orang tahu rumah sedang kosong',
        wrong: ['Gambar menjadi kabur', 'Tiket lebih mahal', 'Cuaca berubah'],
        why: 'Perkongsian lokasi semasa bercuti boleh mendedahkan rumah tidak berpenghuni.',
      },
      {
        prompt: 'Apa tetapan privasi lokasi yang lebih selamat untuk kanak-kanak?',
        correct: 'Hanya aplikasi perlu dan semasa digunakan',
        wrong: ['Semua aplikasi sepanjang masa', 'Berkongsi dengan orang tidak dikenali', 'Tiada langsung kawalan'],
        why: 'Hadkan akses lokasi kepada aplikasi yang benar-benar perlu.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-a9',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu menerima ancaman dalam talian. Siapa yang patut diberitahu DAHULU?',
        correct: 'Ibu bapa atau penjaga',
        wrong: ['Orang yang mengancam', 'Rakan sekelas', 'Akaun media sosial'],
        why: 'Beritahu ibu bapa atau penjaga dengan segera. Jangan balas ancaman itu.',
      },
      {
        prompt: 'Kamu berasa tidak selamat selepas berbual dalam talian. Apa langkah pertama?',
        correct: 'Berhenti berinteraksi dan beritahu orang dewasa',
        wrong: ['Teruskan berbual', 'Hantar gambar', 'Balas dengan marah'],
        why: 'Berhenti berinteraksi, simpan bukti dan beritahu orang dewasa yang dipercayai.',
      },
      {
        prompt: 'Di sekolah, siapa orang dewasa yang boleh membantu jika ada masalah dalam talian?',
        correct: 'Guru yang dipercayai atau guru kaunseling',
        wrong: ['Pelawat yang tidak dikenali', 'Akaun palsu', 'Tiada sesiapa'],
        why: 'Guru dan kaunselor sekolah boleh membantu dan melindungi murid.',
      },
      {
        prompt: 'Rakan menerima mesej yang membuatkan dia takut. Bagaimana kamu membantu?',
        correct: 'Temankan dia berjumpa orang dewasa yang dipercayai',
        wrong: ['Suruh dia balas', 'Kongsi mesej itu kepada semua', 'Minta dia simpan sendiri'],
        why: 'Sokongan rakan dan bantuan orang dewasa ialah tindakan yang betul.',
      },
      {
        prompt: 'Bila kamu patut menghubungi talian bantuan kecemasan?',
        correct: 'Apabila ada bahaya sebenar dan segera',
        wrong: ['Apabila bosan', 'Apabila ingin bermain', 'Apabila permainan lambat'],
        why: 'Talian kecemasan untuk keadaan bahaya sebenar yang memerlukan bantuan segera.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-a10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      groupsRound({
        prompt: 'Cabaran 1: Rahsia atau boleh dikongsi?',
        groups: [
          { id: 'rahsia', label: 'Rahsia' },
          { id: 'kongsi', label: 'Boleh dikongsi' },
        ],
        items: shuffle([
          { label: 'Alamat rumah', group: 'rahsia' },
          { label: 'Hobi melukis', group: 'kongsi' },
          { label: 'Kata laluan', group: 'rahsia' },
          { label: 'Warna kegemaran', group: 'kongsi' },
        ]),
        explain: 'Maklumat peribadi perlu dirahsiakan.',
      }),
      choiceRound({
        prompt: 'Cabaran 2: Mesej daripada orang tidak dikenali minta gambar. Apa tindakan?',
        correct: 'Jangan hantar dan beritahu orang dewasa',
        wrong: ['Hantar gambar', 'Hantar gambar rakan', 'Berikan lokasi'],
        explain: 'Jangan berkongsi gambar dengan orang tidak dikenali.',
      }),
      multiRound({
        prompt: 'Cabaran 3: Pilih amalan keselamatan peranti yang betul.',
        items: shuffle([
          { label: 'Kunci skrin peranti', correct: true },
          { label: 'Kemas kini perisian', correct: true },
          { label: 'Kongsi kata laluan', correct: false },
          { label: 'Pasang aplikasi dari sumber tidak dikenali', correct: false },
        ]),
        explain: 'Kunci skrin dan kemas kini melindungi peranti.',
      }),
      choiceRound({
        prompt: 'Cabaran 4: Rakan ditipu dalam talian. Apa yang kamu lakukan?',
        correct: 'Bantu dia beritahu ibu bapa atau guru',
        wrong: ['Ketawakan dia', 'Minta dia terus berurusan', 'Kongsi kes itu kepada semua orang'],
        explain: 'Bantuan orang dewasa diperlukan segera.',
      }),
      groupsRound({
        prompt: 'Cabaran 5: Lokasi — selamat atau tidak selamat untuk dikongsi?',
        groups: [
          { id: 'selamat', label: 'Selamat (terhad)' },
          { id: 'bahaya', label: 'Berisiko' },
        ],
        items: shuffle([
          { label: 'Nama bandar semasa bercuti selepas pulang', group: 'selamat' },
          { label: 'Lokasi tepat rumah', group: 'bahaya' },
          { label: 'Tanda lokasi restoran semasa di sana', group: 'bahaya' },
          { label: 'Negara kegemaran untuk melancong', group: 'selamat' },
        ]),
        explain: 'Elakkan berkongsi lokasi tepat secara langsung.',
      }),
    ];
    return { rounds };
  },
});

// ====== Kategori B: Penipuan & Maklumat Palsu ======
registerGame({
  id: 'dd-b1',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Menjanjikan hadiah besar tanpa sebab', correct: true },
      { label: 'Meminta kata laluan atau kod OTP', correct: true },
      { label: 'Mendesak supaya bertindak segera', correct: true },
      { label: 'Minta bayaran pendahuluan untuk hadiah', correct: true },
      { label: 'Menggunakan bahasa yang sopan', correct: false },
      { label: 'Menawarkan maklumat tentang produk', correct: false },
    ]);
    return multiRound({
      prompt: 'Pilih SEMUA tanda penipuan digital yang perlu kamu kenali.',
      items,
      explain: 'Penipuan biasanya menjanjikan sesuatu luar biasa, meminta maklumat rahsia dan mendesak segera.',
    });
  },
});

registerGame({
  id: 'dd-b2',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Mesej mengandungi pautan "hadiah percuma" daripada nombor tidak dikenali. Apa tindakan selamat?',
        correct: 'Jangan klik, padam dan beritahu orang dewasa',
        wrong: ['Klik untuk melihat', 'Kongsi pautan kepada rakan', 'Masukkan kata laluan'],
        why: 'Jangan klik pautan tidak dikenali. Padam dan beritahu orang dewasa.',
      },
      {
        prompt: 'Pautan pendek yang tidak jelas tujuannya dihantar oleh "rakan". Apa patut dibuat?',
        correct: 'Tanya rakan secara bersemuka atau melalui panggilan',
        wrong: ['Klik terus', 'Berikan kepada adik', 'Kongsi di media sosial'],
        why: 'Akaun rakan mungkin digodam. Sahkan dahulu melalui saluran lain.',
      },
      {
        prompt: 'Laman meminta nombor kad bank untuk "mengaktifkan akaun permainan". Apa tindakan?',
        correct: 'Tinggalkan laman itu serta-merta',
        wrong: ['Masukkan nombor kad', 'Masukkan nombor telefon', 'Minta rakan isi'],
        why: 'Jangan masukkan maklumat kewangan. Beli/muat naik dalam permainan melalui saluran rasmi dengan ibu bapa.',
      },
      {
        prompt: 'Butang "klik di sini untuk menang" muncul dalam permainan. Apa maksudnya?',
        correct: 'Kemungkinan besar penipuan atau iklan mengelirukan',
        wrong: ['Hadiah sebenar dijamin', 'Cara menambah mata', 'Cara membaiki permainan'],
        why: 'Tawaran menang dengan satu klik biasanya tidak benar.',
      },
      {
        prompt: 'Rakan menghantar fail yang tidak diminta. Apa tindakan?',
        correct: 'Jangan buka, tanya rakan dahulu',
        wrong: ['Buka terus', 'Hantar kepada orang lain', 'Pasang aplikasi tambahan'],
        why: 'Sahkan fail dengan rakan melalui saluran lain sebelum membukanya.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-b3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const msg = SIM(
      '<strong>TAHNIAH!</strong> Nombor telefon kamu dipilih untuk memenangi RM10,000 dan telefon baharu. Untuk menuntut hadiah, berikan kata laluan akaun dan bayar RM50 sebagai "cukai".'
    );
    const pool = [
      {
        prompt: 'Mesej tersebut menjanjikan hadiah luar biasa. Apa kesimpulan kamu?',
        correct: 'Ini penipuan — hadiah tidak meminta kata laluan atau bayaran',
        wrong: ['Ini hadiah sebenar', 'Perlu bayar segera', 'Perlu beri kata laluan'],
        why: 'Hadiah sebenar tidak meminta kata laluan atau bayaran pendahuluan.',
      },
      {
        prompt: 'Kamu menerima mesej "kamu pemenang" tetapi tidak pernah menyertai peraduan. Apa tindakan?',
        correct: 'Abaikan dan padam mesej',
        wrong: ['Hantar maklumat peribadi', 'Bayar cukai hadiah', 'Kongsi kepada semua rakan'],
        why: 'Jika kamu tidak menyertai peraduan, mesej itu hampir pasti penipuan.',
      },
      {
        prompt: 'Mengapa penipu menggunakan "hadiah percuma"?',
        correct: 'Untuk mendapatkan maklumat peribadi atau wang',
        wrong: ['Kerana mereka baik hati', 'Untuk membantu sekolah', 'Untuk membaiki internet'],
        why: 'Umpan hadiah digunakan untuk mencuri maklumat atau wang.',
      },
      {
        prompt: 'Seseorang memberi hadiah tetapi meminta kod OTP "untuk pengesahan". Apa tindakan?',
        correct: 'Jangan beri kod OTP kepada sesiapa',
        wrong: ['Berikan kod OTP', 'Berikan nombor telefon', 'Berikan kata laluan'],
        why: 'Kod OTP adalah rahsia. Tiada hadiah sebenar memerlukannya.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({
      prompt: 'Nilai mesej simulasi di bawah: "TAHNIAH! Kamu menang RM10,000. Beri kata laluan dan bayar RM50 untuk menuntut hadiah."',
      html: msg,
      correct: q.correct,
      wrong: q.wrong,
      explain: q.why,
    });
  },
});

registerGame({
  id: 'dd-b4',
  badgeLabel: BADGE,
  rounds: 3,
  type: 'groups',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Air membeku pada 0°C.', group: 'fakta' },
      { label: 'Ais krim coklat paling sedap.', group: 'pendapat' },
      { label: 'Malaysia terletak di Asia Tenggara.', group: 'fakta' },
      { label: 'Filem ini membosankan.', group: 'pendapat' },
      { label: 'Sehari mempunyai 24 jam.', group: 'fakta' },
      { label: 'Hijau ialah warna terbaik.', group: 'pendapat' },
      { label: 'Bumi mengelilingi Matahari.', group: 'fakta' },
      { label: 'Haiwan comel tidak patut dipelihara.', group: 'pendapat' },
    ]).slice(0, 6);
    return groupsRound({
      prompt: 'Berita atau cerita? Klasifikasikan sebagai FAKTA atau PENDAPAT.',
      groups: [
        { id: 'fakta', label: 'Fakta' },
        { id: 'pendapat', label: 'Pendapat' },
      ],
      items,
      explain: 'Fakta boleh disemak dengan bukti. Pendapat ialah pandangan atau perasaan seseorang.',
    });
  },
});

registerGame({
  id: 'dd-b5',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'sort',
  generate: (level, ctx) => {
    const pools = [
      {
        prompt: 'Susun langkah menyemak maklumat yang mencurigakan.',
        items: [
          { id: 'a', label: 'Berhenti dan baca dengan teliti' },
          { id: 'b', label: 'Semak siapa penulis dan sumber asal' },
          { id: 'c', label: 'Cari sumber kedua yang boleh dipercayai' },
          { id: 'd', label: 'Buat kesimpulan dan jangan terus kongsi' },
        ],
        why: 'Semak sumber dahulu, cari sumber kedua, kemudian baru buat kesimpulan.',
      },
      {
        prompt: 'Susun langkah jika kamu menerima berita yang terlalu mengejutkan.',
        items: [
          { id: 'a', label: 'Jangan terus percaya' },
          { id: 'b', label: 'Baca tajuk dan kandungan penuh' },
          { id: 'c', label: 'Semak sumber berita' },
          { id: 'd', label: 'Tanya orang dewasa sebelum berkongsi' },
        ],
        why: 'Berita palsu mudah tersebar jika kita berkongsi tanpa menyemak.',
      },
      {
        prompt: 'Susun langkah menyemak gambar yang meragukan.',
        items: [
          { id: 'a', label: 'Perhatikan butiran pelik pada gambar' },
          { id: 'b', label: 'Semak akaun yang memuat naik' },
          { id: 'c', label: 'Cari gambar yang sama di sumber lain' },
          { id: 'd', label: 'Jika ragu-ragu, jangan kongsi' },
        ],
        why: 'Gambar boleh diedit atau diambil daripada peristiwa lain.',
      },
    ];
    const p = take(ctx, pools);
    return sortRound({ prompt: p.prompt, items: p.items, answer: p.items.map((i) => i.id), explain: p.why });
  },
});

registerGame({
  id: 'dd-b6',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Gambar dalam berita kelihatan pelik dan tidak logik. Apa maksudnya?',
        correct: 'Gambar mungkin telah diedit',
        wrong: ['Gambar pasti benar', 'Gambar itu sihir', 'Kamera selalu salah'],
        why: 'Gambar boleh diedit. Semak sumber dan cari gambar asal.',
      },
      {
        prompt: 'Satu gambar viral didakwa berlaku di Malaysia, tetapi ada tanda bahasa asing pada papan tanda. Apa langkah seterusnya?',
        correct: 'Semak lokasi sebenar dan sumber berita',
        wrong: ['Terus kongsi', 'Percaya kerana viral', 'Tambah cerita sendiri'],
        why: 'Butiran dalam gambar boleh menunjukkan ia berasal dari tempat lain.',
      },
      {
        prompt: 'Mengapa kita perlu berhati-hati dengan tangkap layar perbualan?',
        correct: 'Tangkap layar boleh dipotong atau diubah',
        wrong: ['Tangkap layar selalu palsu', 'Tangkap layar tidak jelas', 'Tangkap layar haram'],
        why: 'Tangkap layar boleh dimanipulasi. Semak konteks penuh.',
      },
      {
        prompt: 'Video pendek sangat lucu dan meminta kamu kongsi segera. Apa tindakan?',
        correct: 'Periksa sumber dahulu sebelum berkongsi',
        wrong: ['Kongsi serta-merta', 'Kongsi kepada semua kumpulan', 'Tambah kapsyen mengelirukan'],
        why: 'Kandungan viral belum tentu benar. Semak sumber.',
      },
      {
        prompt: 'Gambar "sebelum dan selepas" digunakan untuk mengiklankan produk. Apa perlu difikirkan?',
        correct: 'Pencahayaan dan suntingan boleh mengubah penampilan',
        wrong: ['Produk pasti berkesan', 'Gambar tidak boleh diedit', 'Iklan tidak pernah salah'],
        why: 'Suntingan dan pencahayaan boleh membuat perbezaan besar dalam gambar.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-b7',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Mesej berkata akaun akan ditutup dalam 10 minit jika tidak klik pautan. Itu taktik apa?',
        correct: 'Taktik mendesak supaya kita panik',
        wrong: ['Bantuan sebenar', 'Peringatan mesra', 'Hadiah istimewa'],
        why: 'Penipu mendesak supaya kita bertindak tanpa berfikir.',
      },
      {
        prompt: 'Mengapa penipu menggunakan perkataan "SEGERA" dan "AMARAN"?',
        correct: 'Untuk membuat kita takut dan bertindak cepat',
        wrong: ['Kerana mereka prihatin', 'Kerana sistem perlukan', 'Kerana bahasa mudah'],
        why: 'Tekanan masa mengurangkan peluang kita berfikir dengan teliti.',
      },
      {
        prompt: 'Apa tindakan terbaik apabila mesej mendesak meminta wang?',
        correct: 'Berhenti, bertenang dan semak dengan orang dewasa',
        wrong: ['Bayar segera', 'Balas dengan marah', 'Hantar wang sedikit dahulu'],
        why: 'Jangan bertindak kerana desakan. Semak dengan orang dewasa dahulu.',
      },
      {
        prompt: 'Panggilan "dari bank" meminta kamu memberikan kod OTP segera. Apa patut dibuat?',
        correct: 'Tutup panggilan dan hubungi nombor rasmi bank dengan bantuan ibu bapa',
        wrong: ['Berikan kod OTP', 'Berikan nombor akaun', 'Teruskan panggilan'],
        why: 'Bank tidak akan meminta kod OTP. Tutup dan semak melalui saluran rasmi dengan ibu bapa.',
      },
      {
        prompt: 'Kawan menghantar mesej "tolong bayar sekarang, saya dalam masalah". Apa langkah selamat?',
        correct: 'Hubungi kawan itu melalui panggilan untuk sahkan',
        wrong: ['Bayar segera', 'Hantar wang kepada akaun lain', 'Kongsi mesej itu'],
        why: 'Akaun kawan mungkin digodam. Sahkan melalui panggilan.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-b8',
  badgeLabel: BADGE,
  rounds: 4,
  type: 'multi',
  generate: (level, ctx) => {
    const items = shuffle([
      { label: 'Akaun baharu dicipta semalam', correct: true },
      { label: 'Tiada gambar profil', correct: true },
      { label: 'Nama pengguna dengan ejaan pelik', correct: true },
      { label: 'Terus meminta wang atau hadiah', correct: true },
      { label: 'Mempunyai banyak gambar biasa', correct: false },
      { label: 'Berkongsi hobi yang sama', correct: false },
    ]);
    return multiRound({
      prompt: 'Pilih SEMUA petunjuk akaun yang mencurigakan.',
      items,
      explain: 'Akaun baharu, tanpa gambar, ejaan pelik dan terus meminta wang ialah tanda bahaya.',
    });
  },
});

registerGame({
  id: 'dd-b9',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Sebelum menekan pautan dalam mesej, apa yang perlu dibuat?',
        correct: 'Semak pengirim, tujuan pautan dan fikir risikonya',
        wrong: ['Klik segera', 'Kongsi dahulu', 'Berikan maklumat peribadi'],
        why: 'Fikir sebelum klik: semak pengirim dan tujuan pautan.',
      },
      {
        prompt: 'Butang "muat turun sekarang" muncul pada laman yang tidak dikenali. Apa tindakan?',
        correct: 'Tinggalkan laman dan jangan muat turun',
        wrong: ['Muat turun', 'Pasang aplikasi', 'Berikan kebenaran'],
        why: 'Fail daripada sumber tidak dikenali boleh mengandungi perisian berbahaya.',
      },
      {
        prompt: 'Kawan menghantar pautan dengan mesej "tengok ni, kelakar!". Apa langkah selamat?',
        correct: 'Tanya kawan secara terus sebelum membuka',
        wrong: ['Buka segera', 'Kongsi kepada semua', 'Masukkan nombor telefon'],
        why: 'Akaun kawan boleh digodam. Sahkan dahulu.',
      },
      {
        prompt: 'Mengapa kata laluan yang sama tidak patut digunakan untuk semua akaun?',
        correct: 'Jika satu akaun terjejas, semua akaun berisiko',
        wrong: ['Supaya mudah diingat', 'Supaya telefon laju', 'Supaya boleh dikongsi'],
        why: 'Gunakan kata laluan berbeza untuk setiap akaun.',
      },
      {
        prompt: 'Laman meminta butiran peribadi untuk "pengesahan umur". Apa patut dibuat?',
        correct: 'Tanya orang dewasa sebelum memberikan apa-apa maklumat',
        wrong: ['Isi semua butiran', 'Berikan nombor telefon', 'Berikan alamat rumah'],
        why: 'Jangan berikan butiran peribadi tanpa kebenaran orang dewasa.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-b10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      groupsRound({
        prompt: 'Cabaran 1: Fakta atau pendapat?',
        groups: [
          { id: 'fakta', label: 'Fakta' },
          { id: 'pendapat', label: 'Pendapat' },
        ],
        items: shuffle([
          { label: 'Air mendidih pada 100°C di aras laut.', group: 'fakta' },
          { label: 'Kucing lebih comel daripada arnab.', group: 'pendapat' },
          { label: 'Malaysia mempunyai 13 negeri dan 3 wilayah persekutuan.', group: 'fakta' },
          { label: 'Buku ini membosankan.', group: 'pendapat' },
        ]),
        explain: 'Fakta boleh disemak; pendapat ialah pandangan peribadi.',
      }),
      sortRound({
        prompt: 'Cabaran 2: Susun langkah menyemak berita.',
        items: [
          { id: 'a', label: 'Baca penuh, bukan tajuk sahaja' },
          { id: 'b', label: 'Semak sumber' },
          { id: 'c', label: 'Cari sumber kedua' },
          { id: 'd', label: 'Baru kongsi jika benar' },
        ],
        explain: 'Jangan berkongsi sebelum menyemak.',
      }),
      choiceRound({
        prompt: 'Cabaran 3: Mesej desakan "akaun ditutup dalam 5 minit". Apa tindakan?',
        correct: 'Berhenti dan semak dengan orang dewasa',
        wrong: ['Klik segera', 'Berikan kata laluan', 'Hubungi nombor dalam mesej'],
        explain: 'Desakan adalah tanda penipuan.',
      }),
      multiRound({
        prompt: 'Cabaran 4: Pilih tanda penipuan.',
        items: shuffle([
          { label: 'Meminta kod OTP', correct: true },
          { label: 'Mendesak segera', correct: true },
          { label: 'Menjanjikan hadiah tanpa menyertai peraduan', correct: true },
          { label: 'Memberi salam', correct: false },
          { label: 'Menulis dengan ejaan betul', correct: false },
        ]),
        explain: 'Utamakan keselamatan, bukan kesopanan mesej.',
      }),
      choiceRound({
        prompt: 'Cabaran 5: Gambar viral dari tempat lain. Apa tindakan?',
        correct: 'Semak sumber sebelum mempercayai atau berkongsi',
        wrong: ['Terus percaya', 'Tambah cerita', 'Kongsi kepada semua'],
        explain: 'Gambar boleh datang dari tempat dan masa yang berbeza.',
      }),
    ];
    return { rounds };
  },
});

// ====== Kategori C: Etika Digital ======
registerGame({
  id: 'dd-c1',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Rakan membuat kesilapan dalam permainan. Apa komen paling sopan?',
        correct: 'Tidak mengapa, kita cuba lagi sama-sama.',
        wrong: ['Kamu memang bodoh!', 'Jangan main langsung!', 'Kamu rosakkan permainan!'],
        why: 'Bahasa sopan menyokong rakan dan mengekalkan suasana baik.',
      },
      {
        prompt: 'Kamu tidak setuju dengan pendapat rakan dalam kumpulan chat. Apa tindakan?',
        correct: 'Balas dengan hormat dan beri alasan',
        wrong: ['Hina pendapatnya', 'Keluarkan dia dari kumpulan', 'Sebar pendapatnya untuk ditertawakan'],
        why: 'Boleh tidak bersetuju tanpa menyinggung perasaan.',
      },
      {
        prompt: 'Menerima mesej yang menyakitkan hati. Apa balasan terbaik?',
        correct: 'Jangan balas ketika marah; beritahu orang dewasa',
        wrong: ['Balas dengan lebih kasar', 'Kongsi mesej itu', 'Minta rakan semua menyerang'],
        why: 'Bertenang dan dapatkan bantuan mengelakkan keadaan menjadi lebih buruk.',
      },
      {
        prompt: 'Cara menulis mesej yang jelas dan sopan ialah…',
        correct: 'Gunakan ayat lengkap dan elakkan huruf besar semua',
        wrong: ['MENULIS SEMUA HURUF BESAR', 'Hanya menggunakan emoji', 'Menulis dengan singkatan yang mengelirukan'],
        why: 'Huruf besar semua boleh kelihatan seperti menjerit.',
      },
      {
        prompt: 'Rakan meminta pendapat tentang lukisan. Apa respons yang membina?',
        correct: 'Warna cantik! Cuba tambah bayang di sini.',
        wrong: ['Lukisan ini teruk.', 'Jangan melukis lagi.', 'Siapa ajar kamu melukis?'],
        why: 'Pujian ikhlas dengan cadangan membantu rakan bertambah baik.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c2',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Sekumpulan murid menghina murid lain berulang kali dalam kumpulan chat. Ini ialah…',
        correct: 'Buli siber',
        wrong: ['Gurauan biasa', 'Permainan', 'Cara berkawan'],
        why: 'Menghina berulang kali dalam talian ialah buli siber.',
      },
      {
        prompt: 'Kamu dibuli dalam talian. Apa langkah yang betul?',
        correct: 'Simpan bukti, sekat, dan beritahu orang dewasa',
        wrong: ['Balas dengan ugutan', 'Padam semua bukti', 'Kongsi kepada semua orang'],
        why: 'Simpan bukti, sekat pengirim dan dapatkan bantuan orang dewasa.',
      },
      {
        prompt: 'Rakan menjadi sasaran komen jahat. Apa yang boleh kamu lakukan?',
        correct: 'Sokong rakan dan laporkan komen itu',
        wrong: ['Sertai komen jahat', 'Berdiam diri', 'Kongsi komen itu'],
        why: 'Sokongan dan laporan membantu menghentikan buli siber.',
      },
      {
        prompt: 'Mengapa buli siber sangat serius?',
        correct: 'Ia boleh mencederakan perasaan dan berlaku sepanjang masa',
        wrong: ['Kerana telefon mahal', 'Kerana internet perlahan', 'Kerana mesej panjang'],
        why: 'Kandungan dalam talian boleh dilihat berulang kali dan memberi kesan mendalam.',
      },
      {
        prompt: 'Kawan menghantar meme yang memperlekehkan seseorang. Apa tindakan?',
        correct: 'Jangan kongsi dan beritahu kawan ia boleh menyakitkan hati',
        wrong: ['Kongsi kepada semua', 'Tambah lagi', 'Ketawakan bersama'],
        why: 'Jangan sebarkan kandungan yang memperlekehkan orang lain.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c3',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Rakan memberitahu dia dibuli dalam talian. Apa tindakan pertama kamu?',
        correct: 'Dengar dengan sabar dan dorong dia berjumpa orang dewasa',
        wrong: ['Minta dia abaikan sahaja', 'Sebar cerita itu', 'Ketawakan dia'],
        why: 'Sokongan dan bantuan orang dewasa adalah penting.',
      },
      {
        prompt: 'Rakan berkongsi pautan mencurigakan. Apa bantuan paling baik?',
        correct: 'Beritahu dia jangan klik dan semak dengan orang dewasa',
        wrong: ['Klik bersama', 'Kongsi kepada kumpulan lain', 'Minta dia beri kata laluan'],
        why: 'Bantu rakan mengelakkan penipuan.',
      },
      {
        prompt: 'Rakan berasa tertekan kerana masa skrin terlalu lama. Bagaimana membantu?',
        correct: 'Ajak dia berehat dan buat aktiviti luar',
        wrong: ['Minta dia main lebih lama', 'Beri lebih banyak video', 'Abaikan dia'],
        why: 'Aktiviti luar dan rehat membantu keseimbangan.',
      },
      {
        prompt: 'Rakan ingin berkongsi gambar kamu tanpa izin. Apa patut kamu katakan?',
        correct: 'Minta dia tidak berkongsi kerana kamu tidak selesa',
        wrong: ['Berdiam sahaja', 'Kongsi gambar dia juga', 'Marah dengan kasar'],
        why: 'Setiap orang berhak menolak perkongsian gambar sendiri.',
      },
      {
        prompt: 'Rakan menerima ugutan untuk berjumpa orang tidak dikenali. Apa yang kamu lakukan?',
        correct: 'Bantu dia segera memberitahu ibu bapa atau guru',
        wrong: ['Suruh dia pergi', 'Temankan tanpa beritahu sesiapa', 'Kongsi kepada rakan lain'],
        why: 'Bahaya sebenar memerlukan bantuan orang dewasa dengan segera.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c4',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu ingin menggunakan lukisan orang lain dalam projek sekolah. Apa patut dibuat?',
        correct: 'Minta izin dan berikan kredit kepada pencipta',
        wrong: ['Gunakan tanpa memberitahu', 'Katakan ia lukisan kamu', 'Jual lukisan itu'],
        why: 'Karya orang lain perlu izin dan kredit.',
      },
      {
        prompt: 'Lagu kegemaran tidak boleh dimuat naik semula sebagai video sendiri kerana…',
        correct: 'Ia karya orang lain dan dilindungi hak cipta',
        wrong: ['Ia terlalu panjang', 'Ia terlalu pendek', 'Ia tidak popular'],
        why: 'Muat naik semula tanpa izin melanggar hak cipta.',
      },
      {
        prompt: 'Gambar daripada internet untuk tugasan. Apa langkah bertanggungjawab?',
        correct: 'Semak kebenaran penggunaan dan tulis sumbernya',
        wrong: ['Gunakan sahaja', 'Padam sumber', 'Letak sebagai gambar sendiri'],
        why: 'Sentiasa semak lesen dan berikan kredit.',
      },
      {
        prompt: 'Perisian percuma dengan syarat "jangan jual semula". Apa maksudnya?',
        correct: 'Boleh digunakan mengikut syarat, tidak boleh dijual semula',
        wrong: ['Boleh dijual', 'Boleh diubah jadi milik sendiri', 'Tidak boleh digunakan langsung'],
        why: 'Setiap lesen ada syarat yang perlu dihormati.',
      },
      {
        prompt: 'Rakan meniru kerja kamu dan mendakwa ia kerjanya. Apa tindakan bijak?',
        correct: 'Bercakap dengan guru secara tenang',
        wrong: ['Balas dengan meniru kerjanya', 'Sebar di media sosial', 'Musnahkan kerjanya'],
        why: 'Berbincang dengan guru ialah cara menyelesaikan dengan adil.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c5',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Rakan berkongsi lukisan. Komen mana paling MEMBINA?',
        correct: 'Cantiknya warna kamu! Cuba tambah bayang pada pokok.',
        wrong: ['Lukisan teruk.', 'Siapa suruh kamu melukis?', 'Bakat kamu tiada.'],
        why: 'Komen membina memberi semangat dan cadangan yang berguna.',
      },
      {
        prompt: 'Rakan menyanyikan lagu dalam video. Apa komen yang baik?',
        correct: 'Suara kamu merdu, teruskan berlatih!',
        wrong: ['Sumalah suara kamu.', 'Jangan menyanyi lagi.', 'Orang lain lebih baik.'],
        why: 'Pujian ikhlas menggalakkan usaha.',
      },
      {
        prompt: 'Kawan membuat kesilapan ejaan dalam projek. Apa respons membantu?',
        correct: 'Beritahu dengan sopan dan tunjukkan ejaan betul',
        wrong: ['Ketawakan di kumpulan', 'Sebar tangkap layar', 'Beritahu semua orang'],
        why: 'Bantuan sopan lebih berkesan daripada mempermalukan.',
      },
      {
        prompt: 'Komen yang membina sepatutnya…',
        correct: 'Spesifik, sopan dan memberi cadangan',
        wrong: ['Kasar dan umum', 'Hanya berkata "teruk"', 'Menyebut nama orang lain'],
        why: 'Komen membina membantu orang bertambah baik.',
      },
      {
        prompt: 'Seseorang memuat naik video usaha pertama. Apa komen yang menyokong?',
        correct: 'Usaha yang bagus! Teruskan mencuba.',
        wrong: ['Video paling teruk.', 'Jangan muat naik lagi.', 'Buangkan video ini.'],
        why: 'Sokongan membantu orang terus belajar.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c6',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu mengambil gambar rakan yang comel. Sebelum memuat naik, apa patut dibuat?',
        correct: 'Minta izin rakan dahulu',
        wrong: ['Muat naik terus', 'Tanda nama rakan', 'Kongsi kepada semua'],
        why: 'Minta izin sebelum berkongsi gambar orang lain.',
      },
      {
        prompt: 'Rakan menghantar gambar kepadamu dan berpesan "jangan kongsi". Apa tindakan?',
        correct: 'Simpan sebagai rahsia dan jangan kongsi',
        wrong: ['Kongsi kepada kumpulan lain', 'Muat naik sebagai status', 'Hantar kepada sepupu'],
        why: 'Hormati permintaan rakan.',
      },
      {
        prompt: 'Ibu bapa mengambil gambar kamu untuk album keluarga. Adakah ia perlu izin?',
        correct: 'Ya, dalam keluarga kita tetap perlu hormat persetujuan',
        wrong: ['Tidak perlu langsung', 'Hanya perlu jika diminta', 'Hanya untuk gambar sekolah'],
        why: 'Persetujuan dan rasa hormat penting walaupun dalam keluarga.',
      },
      {
        prompt: 'Kamu ingin menggunakan cerita rakan dalam pembentangan. Apa patut dibuat?',
        correct: 'Minta izin dan sebut nama jika dibenarkan',
        wrong: ['Gunakan tanpa izin', 'Tukar nama dan dakwa sendiri', 'Kongsi tanpa memberitahu'],
        why: 'Cerita orang lain juga perlu izin.',
      },
      {
        prompt: 'Rakan berkata "boleh kongsi, tetapi jangan tanda nama saya". Apa maksudnya?',
        correct: 'Boleh kongsi tanpa nama, hormati syaratnya',
        wrong: ['Boleh tanda nama', 'Tidak boleh dikongsi langsung', 'Boleh jual gambar'],
        why: 'Hormati syarat yang ditetapkan oleh pemilik kandungan.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c7',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'Kamu dan rakan bertengkar dalam kumpulan chat. Apa langkah terbaik?',
        correct: 'Bertenang dan berbincang secara peribadi dengan sopan',
        wrong: ['Teruskan berdebat di kumpulan', 'Hina rakan', 'Keluarkan rakan dari kumpulan'],
        why: 'Perbincangan peribadi yang tenang menyelesaikan konflik dengan lebih baik.',
      },
      {
        prompt: 'Rakan tersalah faham mesej kamu. Apa tindakan?',
        correct: 'Jelaskan maksud sebenar dengan tenang',
        wrong: ['Marah rakan', 'Sekat rakan', 'Sebar perbualan'],
        why: 'Penjelasan tenang mengelakkan salah faham berpanjangan.',
      },
      {
        prompt: 'Dua rakan bertengkar dan meminta kamu memilih pihak. Apa tindakan bijak?',
        correct: 'Dengar kedua-dua pihak dan galakkan mereka berbincang',
        wrong: ['Pilih pihak yang lebih popular', 'Sebar rahsia kedua-duanya', 'Tertawakan mereka'],
        why: 'Menjadi pendamai membantu menyelesaikan konflik.',
      },
      {
        prompt: 'Kamu tersilap kata sesuatu yang menyinggung perasaan rakan. Apa patut dibuat?',
        correct: 'Minta maaf dengan ikhlas',
        wrong: ['Diamkan diri', 'Salahkan rakan', 'Ulang lagi'],
        why: 'Meminta maaf memulihkan hubungan.',
      },
      {
        prompt: 'Perbualan semakin panas. Apa tindakan paling selamat?',
        correct: 'Berhenti seketika, tarik nafas dan sambung kemudian',
        wrong: ['Balas dengan lebih keras', 'Gunakan kata-kata kesat', 'Ajak orang lain menyerang'],
        why: 'Rehat sebentar membantu kita berfikir dengan lebih baik.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c8',
  badgeLabel: BADGE,
  rounds: 2,
  type: 'budget',
  generate: (level, ctx) =>
    budgetRound({
      prompt: 'Rancang masa skrin 120 minit. Tugasan, senaman dan masa keluarga WAJIB dimasukkan.',
      budget: 120,
      format: 'minutes',
      items: [
        { emoji: '📚', label: 'Kerja sekolah', price: 40, need: true },
        { emoji: '🏃', label: 'Senaman / bermain di luar', price: 30, need: true },
        { emoji: '👨‍👩‍👧', label: 'Masa bersama keluarga', price: 20, need: true },
        { emoji: '🎮', label: 'Permainan video', price: 25 },
        { emoji: '📺', label: 'Menonton video', price: 45 },
        { emoji: '💬', label: 'Sembang dengan rakan', price: 20 },
      ],
      explain: 'Masa skrin seimbang memasukkan belajar, pergerakan dan keluarga, bukan hiburan sahaja.',
    }),
});

registerGame({
  id: 'dd-c9',
  badgeLabel: BADGE,
  rounds: 5,
  type: 'choice',
  generate: (level, ctx) => {
    const pool = [
      {
        prompt: 'AI memberikan jawapan yang sangat yakin tetapi pelik. Apa patut dibuat?',
        correct: 'Semak dengan buku atau orang dewasa',
        wrong: ['Percaya sepenuhnya', 'Kongsi sebagai fakta', 'Jadikan jawapan itu tugasan siap'],
        why: 'AI boleh tersalah. Semak dengan sumber yang boleh dipercayai.',
      },
      {
        prompt: 'Adakah AI sentiasa memberikan maklumat terkini?',
        correct: 'Tidak, jawapan AI boleh lapuk atau salah',
        wrong: ['Ya, sentiasa terkini', 'Ya, kerana internet', 'Tidak, kerana AI tidur'],
        why: 'AI belajar daripada data lama dan boleh tersilap.',
      },
      {
        prompt: 'Kamu menggunakan AI untuk kerja sekolah. Apakah cara yang bertanggungjawab?',
        correct: 'Gunakan untuk belajar dan tulis semula dengan kata sendiri',
        wrong: ['Salin bulat-bulat', 'Katakan ia tulisan kamu', 'Serahkan tanpa membaca'],
        why: 'AI boleh membantu belajar, tetapi kerja mesti difahami dan ditulis sendiri.',
      },
      {
        prompt: 'AI memberi jawapan tentang wang yang meragukan. Apa tindakan bijak?',
        correct: 'Tanya ibu bapa atau guru dan semak sumber rasmi',
        wrong: ['Terus gunakan jawapan', 'Ikut arahan AI tanpa semak', 'Kongsi jawapan kepada rakan'],
        why: 'Keputusan kewangan perlu disemak dengan orang dewasa.',
      },
      {
        prompt: 'Mengapa AI boleh memberikan jawapan berat sebelah?',
        correct: 'Ia belajar daripada data yang mungkin tidak lengkap',
        wrong: ['Kerana AI selalu betul', 'Kerana AI tidak suka kanak-kanak', 'Kerana AI tiada elektrik'],
        why: 'Kualiti dan kepelbagaian data mempengaruhi jawapan AI.',
      },
    ];
    const q = take(ctx, pool);
    return choiceRound({ prompt: q.prompt, correct: q.correct, wrong: q.wrong, explain: q.why });
  },
});

registerGame({
  id: 'dd-c10',
  badgeLabel: BADGE,
  rounds: 1,
  type: 'mixed',
  generate: (level, ctx) => {
    const rounds = [
      choiceRound({
        prompt: 'Misi 1: Komen mana paling sopan?',
        correct: 'Usaha kamu bagus, teruskan!',
        wrong: ['Karya kamu teruk.', 'Jangan tunjuk lagi.', 'Orang lain lebih baik.'],
        explain: 'Kata-kata sopan menyokong orang lain.',
      }),
      choiceRound({
        prompt: 'Misi 2: Rakan dibuli dalam talian. Apa yang kamu buat?',
        correct: 'Sokong dia dan bawa kepada guru atau ibu bapa',
        wrong: ['Sertai buli', 'Berdiam diri', 'Sebar cerita'],
        explain: 'Sokongan dan bantuan orang dewasa penting.',
      }),
      groupsRound({
        prompt: 'Misi 3: Perkongsian ini perlu izin atau tidak?',
        groups: [
          { id: 'perlu', label: 'Perlu izin' },
          { id: 'tidak', label: 'Tidak perlu' },
        ],
        items: shuffle([
          { label: 'Gambar rakan di kelas', group: 'perlu' },
          { label: 'Cerita rakan untuk pembentangan', group: 'perlu' },
          { label: 'Warna kegemaran kamu sendiri', group: 'tidak' },
          { label: 'Hobi yang kamu minati', group: 'tidak' },
        ]),
        explain: 'Karya dan cerita orang lain memerlukan izin.',
      }),
      budgetRound({
        prompt: 'Misi 4: Rancang masa skrin 90 minit dengan seimbang.',
        budget: 90,
        format: 'minutes',
        items: [
          { emoji: '📚', label: 'Kerja sekolah', price: 30, need: true },
          { emoji: '🏃', label: 'Aktiviti luar', price: 20, need: true },
          { emoji: '🎮', label: 'Permainan video', price: 25 },
          { emoji: '📺', label: 'Video', price: 40 },
        ],
        explain: 'Seimbangkan belajar, pergerakan dan hiburan.',
      }),
      choiceRound({
        prompt: 'Misi 5: AI memberi jawapan yang meragukan. Apa tindakan?',
        correct: 'Semak dengan sumber lain atau orang dewasa',
        wrong: ['Percaya sepenuhnya', 'Kongsi sebagai fakta', 'Salin tanpa membaca'],
        explain: 'AI boleh tersalah. Semak semula.',
      }),
    ];
    return { rounds };
  },
});
