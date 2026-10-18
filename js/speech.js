// Audio pertuturan CILIKVERSE PPKI.
// Hanya suara Bahasa Melayu digunakan. Suara Bahasa Indonesia atau suara lalai peranti
// tidak pernah dipilih sebagai sandaran. Jika tiada suara Melayu dipasang, aplikasi
// kekal berfungsi dengan arahan bertulis.

const isBrowser = typeof window !== 'undefined';

function normalizeLang(lang) {
  return String(lang || '').trim().replace(/_/g, '-').toLowerCase();
}

function langParts(voice) {
  return normalizeLang(voice && voice.lang).split('-').filter(Boolean);
}

export const SPEECH_VOICE_OPTIONS = Object.freeze({
  automatic: '',
  yasmin: 'online-ms-MY-yasmin',
  osman: 'online-ms-MY-osman',
});

export function isMalayVoice(voice) {
  if (!voice) return false;
  const parts = langParts(voice);
  const base = parts[0] || '';
  const region = parts[1] || '';
  const identity = `${voice.name || ''} ${voice.voiceURI || ''}`;

  // Terima Melayu Malaysia sahaja. Kod bahasa ml-IN (Malayalam) dan ta-IN (Tamil)
  // serta tag lain seperti ms-SG tidak pernah dianggap suara Melayu Malaysia.
  if (base !== 'ms' || region !== 'my') return false;
  if (/\b(?:malayalam|tamil|indian|india|indonesian|singapore)\b/i.test(identity)) return false;
  return true;
}

function voiceIdentity(voice) {
  return `${voice && voice.name || ''} ${voice && voice.voiceURI || ''}`;
}

function namedMalayVoice(voices, name) {
  if (!Array.isArray(voices)) return null;
  const identity = (voice) => voiceIdentity(voice);
  const pattern = new RegExp(`\\b${name}\\b`, 'i');
  // Label pilihan khusus menyatakan “online”, jadi jangan tandakan suara tempatan
  // yang hanya bernama Yasmin/Osman sebagai suara dalam talian.
  return voices.find((voice) =>
    isMalayVoice(voice) && pattern.test(identity(voice)) && /\bonline\b/i.test(identity(voice))
  ) || null;
}

function knownVoiceOption(key) {
  return Object.values(SPEECH_VOICE_OPTIONS).includes(String(key || ''));
}

export function voiceKey(voice) {
  if (!voice) return '';
  return String(voice.voiceURI || `${normalizeLang(voice.lang)}|${voice.name || ''}`);
}

const MALAY_DIGITS = ['sifar', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];

function malayNumber(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(n)) return String(value);
  if (n < 10) return MALAY_DIGITS[n];
  if (n === 10) return 'sepuluh';
  if (n === 11) return 'sebelas';
  if (n < 20) return `${MALAY_DIGITS[n - 10]} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${MALAY_DIGITS[tens]} puluh${ones ? ` ${MALAY_DIGITS[ones]}` : ''}`;
  }
  if (n === 100) return 'seratus';
  if (n < 200) return `seratus ${malayNumber(n - 100)}`;
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return `${MALAY_DIGITS[hundreds]} ratus${rest ? ` ${malayNumber(rest)}` : ''}`;
  }
  if (n === 1000) return 'seribu';
  if (n < 2000) return `seribu ${malayNumber(n - 1000)}`;
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${malayNumber(thousands)} ribu${rest ? ` ${malayNumber(rest)}` : ''}`;
  }
  if (n < 1_000_000_000) {
    const millions = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    return `${malayNumber(millions)} juta${rest ? ` ${malayNumber(rest)}` : ''}`;
  }
  const billions = Math.floor(n / 1_000_000_000);
  const rest = n % 1_000_000_000;
  return `${malayNumber(billions)} bilion${rest ? ` ${malayNumber(rest)}` : ''}`;
}

function ringgitAmountSpeech(rawAmount) {
  const [wholePart, fractionPart = ''] = String(rawAmount).replace(/,/g, '').split('.');
  const ringgit = Number.parseInt(wholePart, 10);
  const sen = fractionPart ? Number.parseInt(fractionPart.padEnd(2, '0').slice(0, 2), 10) : 0;
  if (!Number.isSafeInteger(ringgit) || ringgit < 0 || !Number.isInteger(sen)) return rawAmount;
  const parts = [];
  if (ringgit > 0 || sen === 0) parts.push(`${malayNumber(ringgit)} ringgit`);
  if (sen > 0) parts.push(`${malayNumber(sen)} sen`);
  return parts.join(' ');
}

function expandMoneyForSpeech(text) {
  // Dalam arahan papan nombor, angka perpuluhan diterangkan semula dengan perkataan; elakkan
  // TTS menyebut kedua-duanya dengan mengubah contoh itu kepada bentuk RM hanya untuk audio.
  let spoken = String(text || '').replace(
    /\b(\d+(?:,\d{3})*\.\d{1,2})\s+bermaksud\s+(?:[a-z]+\s+)*ringgit(?:\s+(?:[a-z]+\s+)*sen)?/gi,
    (_match, amount) => `RM${amount}`
  ).replace(
    /\bRM\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d]|,[\d]|\.[\d])/gi,
    (_match, amount) => ringgitAmountSpeech(amount)
  );
  // Sesetengah arahan/demo menulis "3.50 ringgit" tanpa awalan RM.
  spoken = spoken.replace(
    /\b(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*ringgit\b/gi,
    (_match, amount) => ringgitAmountSpeech(amount)
  );
  // Baca nilai sen berangka sebagai perkataan, seperti dalam sampel rujukan.
  return spoken.replace(/\b(\d[\d,]*)\s*sen\b/gi, (_match, amount) => {
    const value = Number.parseInt(amount.replace(/,/g, ''), 10);
    return Number.isSafeInteger(value) ? `${malayNumber(value)} sen` : _match;
  });
}

// Penyesuaian untuk TTS sahaja; ejaan pada skrin tidak berubah.
// Jumlah RM dihuraikan sebagai perkataan supaya RM5.00 dibaca "lima ringgit" dan RM10 sebagai "sepuluh ringgit".
// Suku kata bersempang membantu bunyi akhir /t/ dalam "ringgit"; "awak" disebut sebagai "anda".
export function speechText(text) {
  return expandMoneyForSpeech(String(text || ''))
    .replace(/[\uFE0E\uFE0F]/g, '')
    .replace(/\bawak\b/gi, (word) => {
      if (word === word.toUpperCase()) return 'ANDA';
      return word[0] === word[0].toUpperCase() ? 'Anda' : 'anda';
    })
    .replace(/[→➡➜➝]/g, 'kanan')
    .replace(/[←⬅◀]/g, 'kiri')
    .replace(/[↑⬆]/g, 'atas')
    .replace(/[↓⬇]/g, 'bawah')
    .replace(/\bringgit\b/gi, 'ring-git');
}

function plainSpeech(value) {
  return String(value == null ? '' : value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' dan ')
    .replace(/&lt;/gi, ' kurang daripada ')
    .replace(/&gt;/gi, ' lebih daripada ')
    .replace(/&quot;|&#34;/gi, ' ')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function itemSpeech(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return plainSpeech(item);
  return plainSpeech(item.label != null && item.label !== '' ? item.label : item.html || '');
}

// Bina skrip audio bagi kandungan sebenar pusingan, tanpa menggunakan penanda betul/salah.
export function speechRoundLines(round) {
  if (!round || typeof round !== 'object') return [];
  const lines = [];
  const prompt = plainSpeech([round.prompt, round.html].filter(Boolean).join(' '));
  if (prompt) lines.push(`Soalan: ${prompt}`);

  const numbered = (values, title, word = 'Pilihan') => {
    const clean = (Array.isArray(values) ? values : []).map(itemSpeech).filter(Boolean);
    if (!clean.length) return;
    lines.push(title);
    clean.forEach((text, index) => lines.push(`${word} ${index + 1}: ${text}`));
  };

  switch (round.kind) {
    case 'choice': {
      const options = (Array.isArray(round.options) ? round.options : []).map(itemSpeech).filter(Boolean);
      if (options.length) {
        lines.push('Pilihan jawapan:');
        options.forEach((text, index) => lines.push(`${String.fromCharCode(65 + index)}. ${text}`));
      }
      break;
    }
    case 'multi':
      numbered(round.items, 'Pilihan jawapan:');
      break;
    case 'sort':
      numbered(round.items, 'Item untuk disusun:', 'Item');
      break;
    case 'match':
      numbered(round.left, 'Kad di sebelah kiri:', 'Kad');
      numbered(round.right, 'Kad di sebelah kanan:', 'Kad');
      break;
    case 'groups':
      numbered(round.items, 'Item untuk dikelaskan:', 'Item');
      numbered(round.groups, 'Pilihan kumpulan:', 'Kumpulan');
      break;
    case 'budget': {
      const money = round.format !== 'minutes';
      const format = (value) => money
        ? `${(Number(value) / 100).toFixed(2)} ringgit`
        : `${Number(value)} minit`;
      if (Number.isFinite(Number(round.budget))) lines.push(`Bajet: ${format(round.budget)}.`);
      const items = (Array.isArray(round.items) ? round.items : []).filter((item) => itemSpeech(item));
      if (items.length) {
        lines.push('Pilihan barang:');
        items.forEach((item, index) => lines.push(`Pilihan ${index + 1}: ${itemSpeech(item)}, ${format(item.price)}.`));
      }
      break;
    }
    case 'code':
      lines.push('Arahan yang boleh dipilih: atas, kanan, bawah dan kiri.');
      break;
    case 'numpad':
    default:
      break;
  }

  return lines.map((line) => line.slice(0, 480));
}

export function pickVoice(voices, preferredKey = '') {
  if (!Array.isArray(voices)) return null;
  const malay = voices.filter(isMalayVoice);
  if (!malay.length) return null;

  const preferred = String(preferredKey || '');
  if (preferred === SPEECH_VOICE_OPTIONS.yasmin) return namedMalayVoice(malay, 'Yasmin');
  if (preferred === SPEECH_VOICE_OPTIONS.osman) return namedMalayVoice(malay, 'Osman');
  if (preferred) {
    const chosen = malay.find((voice) => voiceKey(voice) === preferred || String(voice.voiceURI || '') === preferred);
    if (chosen) return chosen;
  }

  // Automatik hanya memilih ms-MY; utamakan suara yang peranti tandakan sebagai lalai.
  return malay.find((voice) => voice.default) || malay[0];
}

export const Speech = {
  enabled: true,
  rate: 0.92,
  pitch: 1.05,
  volume: 1,
  voice: null,
  voices: [],
  preferredVoiceKey: '',
  supported: isBrowser && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  log: [], // jejak permintaan teks TTS untuk ujian automatik & penyahpepijatan
  count: 0,
  speaking: false,
  _finishCurrent: null,
  _voicesHandler: null,

  refreshVoices() {
    if (!this.supported) {
      this.voices = [];
      this.voice = null;
      return this.voices;
    }
    try {
      const available = window.speechSynthesis.getVoices();
      this.voices = Array.isArray(available) ? available.filter(isMalayVoice) : [];
      this.voice = pickVoice(this.voices, this.preferredVoiceKey);
    } catch (e) {
      this.voices = [];
      this.voice = null;
    }
    return this.voices;
  },

  init(settings = {}) {
    if (!isBrowser) return;
    this.enabled = settings.tts !== false && settings.sound !== false;
    this.rate = Number(settings.speechRate) || 0.92;
    const savedVoice = String(settings.speechVoice || '');
    this.preferredVoiceKey = knownVoiceOption(savedVoice) ? savedVoice : SPEECH_VOICE_OPTIONS.automatic;
    if (!this.supported) return;

    const synth = window.speechSynthesis;
    if (this._voicesHandler && synth.removeEventListener) {
      synth.removeEventListener('voiceschanged', this._voicesHandler);
    }
    this._voicesHandler = () => {
      this.refreshVoices();
      try {
        window.dispatchEvent(new Event('cilikverse:voiceschanged'));
      } catch (e) {
        /* Pelayar lama mungkin tiada Custom Event yang serasi. */
      }
    };
    if (synth.addEventListener) {
      synth.addEventListener('voiceschanged', this._voicesHandler);
    } else {
      synth.onvoiceschanged = this._voicesHandler;
    }
    this._voicesHandler();
  },

  getMalayVoices() {
    return this.refreshVoices().slice();
  },

  hasVoiceOption(key) {
    const option = String(key || '');
    const voices = this.getMalayVoices();
    if (option === SPEECH_VOICE_OPTIONS.automatic) return voices.length > 0;
    if (option === SPEECH_VOICE_OPTIONS.yasmin) return !!namedMalayVoice(voices, 'Yasmin');
    if (option === SPEECH_VOICE_OPTIONS.osman) return !!namedMalayVoice(voices, 'Osman');
    return false;
  },

  setVoice(key) {
    const selected = String(key || '');
    this.preferredVoiceKey = knownVoiceOption(selected) ? selected : SPEECH_VOICE_OPTIONS.automatic;
    this.refreshVoices();
    return this.voice;
  },

  hasMalayVoice() {
    this.refreshVoices();
    return !!this.voice;
  },

  statusText() {
    if (!this.supported) return 'Pelayar ini tidak menyokong bacaan suara.';
    this.refreshVoices();
    if (!this.voice) {
      if (this.preferredVoiceKey === SPEECH_VOICE_OPTIONS.yasmin) return 'Yasmin online - Malay tidak tersedia melalui suara pelayar/peranti ini. Audio tidak dimainkan.';
      if (this.preferredVoiceKey === SPEECH_VOICE_OPTIONS.osman) return 'Osman online - Malay tidak tersedia melalui suara pelayar/peranti ini. Audio tidak dimainkan.';
      return 'Tiada suara Bahasa Melayu Malaysia (ms-MY) tersedia. Suara bahasa lain tidak akan digunakan.';
    }
    const lang = this.voice.lang || 'ms-MY';
    return `Suara Melayu Malaysia aktif: ${this.voice.name || 'Melayu'} (${lang}).`;
  },

  voiceKey(voice) {
    return voiceKey(voice);
  },

  setEnabled(v) {
    this.enabled = !!v;
    if (!v) this.stop();
  },

  setRate(v) {
    this.rate = Math.max(0.5, Math.min(1.4, Number(v) || 0.92));
  },

  available() {
    return this.supported;
  },

  stop() {
    if (this.supported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        /* abaikan */
      }
    }
    const finish = this._finishCurrent;
    this._finishCurrent = null;
    this.speaking = false;
    if (finish) finish(false);
  },

  // Bercakap dan pulangkan Promise yang selesai apabila audio tamat (atau tamat masa).
  speak(text, { interrupt = true, rate = null } = {}) {
    if (!isBrowser || !this.supported || !this.enabled) return Promise.resolve(false);
    const clean = String(text || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[🤖💰🕵️⭐🏁🔊💡🎉🏅📚🪙🏦📒🌟🦸🏆🔒🔍✓✕▶]/g, ' ')
      .replace(/[\uFE0E\uFE0F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500);
    if (!clean) return Promise.resolve(false);
    if (interrupt) this.stop();

    this.count += 1;
    this.log.push(clean);
    if (this.log.length > 200) this.log.shift();

    // Refresh sebelum sebutan, kerana sesetengah pelayar memuatkan suara secara lewat.
    this.refreshVoices();
    if (!this.voice) return Promise.resolve(false);

    return new Promise((resolve) => {
      let done = false;
      const finish = (ok = true) => {
        if (done) return;
        done = true;
        this.speaking = false;
        if (this._finishCurrent === finish) this._finishCurrent = null;
        resolve(ok);
      };
      this._finishCurrent = finish;
      try {
        const u = new SpeechSynthesisUtterance(speechText(clean));
        const voiceLang = normalizeLang(this.voice.lang);
        u.lang = voiceLang.startsWith('ms') ? this.voice.lang : 'ms-MY';
        u.voice = this.voice;
        u.rate = rate || this.rate;
        u.pitch = this.pitch;
        u.volume = this.volume;
        u.onend = () => finish(true);
        u.onerror = () => finish(false);
        this.speaking = true;
        window.speechSynthesis.speak(u);
        // Jaring keselamatan: sesetengah pelayar tidak memanggil onend.
        const estimate = Math.min(20000, 900 + clean.split(/\s+/).length * 420);
        setTimeout(() => finish(false), estimate);
      } catch (e) {
        finish(false);
      }
    });
  },

  // Sebut senarai pendek satu demi satu.
  async speakAll(lines, gap = 220) {
    for (const line of lines) {
      if (!line) continue;
      await this.speak(line);
      await new Promise((r) => setTimeout(r, gap));
    }
  },
};
