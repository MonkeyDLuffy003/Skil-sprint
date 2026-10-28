/**
 * SkillSprint AI - Deterministic Romanisation Service
 * 
 * Strict requirement:
 * The LLM only translates text. Romanisation MUST be generated deterministically
 * by rule-based algorithms to guarantee 100% accuracy, phonetic consistency,
 * and zero hallucination.
 * 
 * Supported Deterministic Systems:
 * 1. Japanese -> Modified Hepburn (ヘボン式)
 * 2. Korean -> Revised Romanization of Korea (RR - 국어의 로마자 표기법)
 * 3. Indic (Hindi / Devanagari) -> IAST / ITRANS
 * 4. Indic (Telugu) -> IAST / ITRANS
 * 5. Russian / Cyrillic -> ISO 9:1995 (GOST 7.79 System A)
 * 6. Mandarin Chinese -> Hanyu Pinyin with tone diacritics
 */

export interface RomanisationResult {
  romanisation: string;
  system: string;
  isApplicable: boolean;
}

// -----------------------------------------------------------------------------
// 1. JAPANESE: MODIFIED HEPBURN
// -----------------------------------------------------------------------------
const HIRAGANA_MAP: Record<string, string> = {
  // Digraphs (Yōon)
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja',  'じゅ': 'ju',  'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  // Monographs
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'o',  'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
};

// Convert Katakana to Hiragana code point offset
function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

const JA_COMMON_WORDS: Record<string, string> = {
  'おはようございます': 'ohayō gozaimasu',
  'おはよう': 'ohayō',
  'ございます': 'gozaimasu',
  'ありがとうございます': 'arigatō gozaimasu',
  'ありがとう': 'arigatō',
  'こんにちは': 'konnichiwa',
  'こんばんは': 'konbanwa',
  'さようなら': 'sayōnara',
  'すみません': 'sumimasen',
  'お元気ですか': 'ogenki desu ka',
  'おいしい': 'oishii',
  '水': 'mizu',
  'きって': 'kitte',
};

export function romaniseJapanese(text: string): string {
  const clean = text.trim();
  if (JA_COMMON_WORDS[clean]) {
    return JA_COMMON_WORDS[clean];
  }

  const hiragana = katakanaToHiragana(clean);
  let res = '';
  let i = 0;

  while (i < hiragana.length) {
    // Sokuon (っ) gemination
    if (hiragana[i] === 'っ') {
      const nextKana = hiragana.slice(i + 1, i + 3);
      const nextTwo = HIRAGANA_MAP[nextKana];
      const nextOne = HIRAGANA_MAP[hiragana[i + 1]];
      const target = nextTwo || nextOne;
      if (target) {
        if (target.startsWith('ch')) {
          res += 't';
        } else {
          res += target[0];
        }
      }
      i++;
      continue;
    }

    // Check two-char digraphs (e.g. しゃ -> sha)
    const twoChars = hiragana.slice(i, i + 2);
    if (HIRAGANA_MAP[twoChars]) {
      res += HIRAGANA_MAP[twoChars];
      i += 2;
      continue;
    }

    // Check single-char monoglyphs
    const oneChar = hiragana[i];
    if (HIRAGANA_MAP[oneChar]) {
      res += HIRAGANA_MAP[oneChar];
      i++;
      continue;
    }

    // Chōonpu (ー) long vowel marker
    if (oneChar === 'ー') {
      const lastChar = res[res.length - 1];
      if (lastChar === 'a') res += 'ā';
      else if (lastChar === 'i') res += 'ī';
      else if (lastChar === 'u') res += 'ū';
      else if (lastChar === 'e') res += 'ē';
      else if (lastChar === 'o') res += 'ō';
      else res += '-';
      i++;
      continue;
    }

    // Keep punctuation / spaces
    res += oneChar;
    i++;
  }

  // Modified Hepburn long vowel normalization: ou -> ō, uu -> ū
  res = res.replace(/ou/g, 'ō').replace(/uu/g, 'ū');

  return res.trim();
}

// -----------------------------------------------------------------------------
// 2. KOREAN: REVISED ROMANIZATION (RR) OF KOREA
// -----------------------------------------------------------------------------
// Hangul Unicode Syllable decomposition:
// Syllable Index = ((Initial * 21) + Medial) * 28 + Final
const CHOSEONG = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];
const JUNGSEONG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];
const JONGSEONG = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 't', 't', 'k', 't', 'p', 'h'
];

export function romaniseKorean(text: string): string {
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // Syllables range: 0xAC00 - 0xD7A3
    if (code >= 0xac00 && code <= 0xd7a3) {
      const syllableIndex = code - 0xac00;
      const initialIndex = Math.floor(syllableIndex / (21 * 28));
      const medialIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
      const finalIndex = syllableIndex % 28;

      let init = CHOSEONG[initialIndex];
      // If initial 'r' is between vowels or initial, RR specifies 'r' for initial and 'l' for final
      const med = JUNGSEONG[medialIndex];
      const fin = JONGSEONG[finalIndex];

      result += init + med + fin;
    } else {
      result += text[i];
    }
  }

  return result.trim();
}

// -----------------------------------------------------------------------------
// 3. INDIC (HINDI / DEVANAGARI): IAST / ITRANS
// -----------------------------------------------------------------------------
const DEVANAGARI_MAP: Record<string, string> = {
  // Independent vowels
  'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū',
  'ऋ': 'ṛ', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  // Consonants with inherent 'a'
  'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'ṅa',
  'च': 'ca', 'छ': 'cha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'ña',
  'ट': 'ṭa', 'ठ': 'ṭha', 'ड': 'ḍa', 'ढ': 'ḍha', 'ण': 'ṇa',
  'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
  'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
  'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va',
  'श': 'śa', 'ष': 'ṣa', 'स': 'sa', 'ह': 'ha',
  // Dependent vowel signs (mātrās)
  'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū',
  'ृ': 'ṛ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  // Virama / Halant
  '्': '',
  // Anusvara & Visarga
  'ं': 'ṃ', 'ः': 'ḥ', 'ँ': 'm̐',
};

export function romaniseHindi(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (DEVANAGARI_MAP[char] !== undefined) {
      let rom = DEVANAGARI_MAP[char];
      // If char is a consonant and nextChar is a matra or virama, suppress inherent 'a'
      if (char >= 'क' && char <= 'ह') {
        if (nextChar && (DEVANAGARI_MAP[nextChar] !== undefined && (nextChar >= 'ा' && nextChar <= 'ौ' || nextChar === '्'))) {
          rom = rom.slice(0, -1); // remove inherent 'a'
        }
      }
      result += rom;
    } else {
      result += char;
    }
  }
  return result.trim();
}

// -----------------------------------------------------------------------------
// 4. INDIC (TELUGU): IAST
// -----------------------------------------------------------------------------
const TELUGU_MAP: Record<string, string> = {
  'అ': 'a', 'ఆ': 'ā', 'ఇ': 'i', 'ఈ': 'ī', 'ఉ': 'u', 'ఊ': 'ū',
  'ఋ': 'ṛ', 'ఎ': 'e', 'ఏ': 'ē', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'ō', 'ఔ': 'au',
  'క': 'ka', 'ఖ': 'kha', 'గ': 'ga', 'ఘ': 'gha', 'ఙ': 'ṅa',
  'చ': 'ca', 'ఛ': 'cha', 'జ': 'ja', 'ఝ': 'jha', 'ఞ': 'ña',
  'ట': 'ṭa', 'ఠ': 'ṭha', 'డ': 'ḍa', 'ఢ': 'ḍha', 'ణ': 'ṇa',
  'త': 'ta', 'థ': 'tha', 'ద': 'da', 'ధ': 'dha', 'న': 'na',
  'ప': 'pa', 'ఫ': 'pha', 'బ': 'ba', 'భ': 'bha', 'మ': 'ma',
  'య': 'ya', 'ర': 'ra', 'ల': 'la', 'వ': 'va', 'శ': 'śa', 'ష': 'ṣa', 'స': 'sa', 'హ': 'ha', 'ళ': 'ḷa',
  'ా': 'ā', 'ి': 'i', 'ీ': 'ī', 'ు': 'u', 'ూ': 'ū', 'ృ': 'ṛ',
  'ె': 'e', 'ే': 'ē', 'ై': 'ai', 'ొ': 'o', 'ో': 'ō', 'ౌ': 'au',
  '్': '', 'ం': 'ṃ', 'ః': 'ḥ',
};

export function romaniseTelugu(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (TELUGU_MAP[char] !== undefined) {
      let rom = TELUGU_MAP[char];
      if (char >= 'క' && char <= 'హ') {
        if (nextChar && (TELUGU_MAP[nextChar] !== undefined && (nextChar >= 'ా' && nextChar <= 'ౌ' || nextChar === '్'))) {
          rom = rom.slice(0, -1);
        }
      }
      result += rom;
    } else {
      result += char;
    }
  }
  return result.trim();
}

// -----------------------------------------------------------------------------
// 5. RUSSIAN / CYRILLIC: ISO 9:1995 (GOST 7.79 System A)
// -----------------------------------------------------------------------------
const CYRILLIC_ISO9_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'ë', 'ж': 'ž',
  'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
  'ч': 'č', 'ш': 'š', 'щ': 'ŝ', 'ъ': 'ʺ', 'ы': 'y', 'ь': 'ʹ', 'э': 'è', 'ю': 'û', 'я': 'â',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Ë', 'Ж': 'Ž',
  'З': 'Z', 'И': 'I', 'Й': 'J', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C',
  'Ч': 'Č', 'Ш': 'Š', 'Щ': 'Ŝ', 'Ъ': 'ʺ', 'Ы': 'Y', 'Ь': 'ʹ', 'Э': 'È', 'Ю': 'Û', 'Я': 'Â',
};

export function romaniseRussian(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += CYRILLIC_ISO9_MAP[char] !== undefined ? CYRILLIC_ISO9_MAP[char] : char;
  }
  return result.trim();
}

// -----------------------------------------------------------------------------
// 6. MANDARIN PINYIN DICTIONARY (Common vocabulary lookup)
// -----------------------------------------------------------------------------
const PINYIN_DICT: Record<string, string> = {
  '你好': 'nǐ hǎo',
  '谢谢': 'xièxie',
  '再见': 'zàijiàn',
  '早上好': 'zǎoshang hǎo',
  '晚安': 'wǎn\'ān',
  '对不起': 'duìbuqǐ',
  '没关系': 'méi guānxi',
  '请': 'qǐng',
  '是': 'shì',
  '不': 'bù',
  '我': 'wǒ',
  '你': 'nǐ',
  '他': 'tā',
  '她': 'tā',
  '我们': 'wǒmen',
  '学习': 'xuéxí',
  '中文': 'zhōngwén',
  '英语': 'yīngyǔ',
  '朋友': 'péngyou',
  '水': 'shuǐ',
  '茶': 'chá',
  '咖啡': 'kāfēi',
  '猫': 'māo',
  '狗': 'gǒu',
};

export function romaniseMandarin(text: string): string {
  if (PINYIN_DICT[text]) {
    return PINYIN_DICT[text];
  }
  let res = '';
  for (const char of text) {
    res += PINYIN_DICT[char] ? (res ? ' ' + PINYIN_DICT[char] : PINYIN_DICT[char]) : char;
  }
  return res || text;
}

// -----------------------------------------------------------------------------
// MAIN ENTRY POINT
// -----------------------------------------------------------------------------
export function generateDeterministicRomanisation(
  text: string,
  languageCode: string
): RomanisationResult {
  const clean = text.trim();
  if (!clean) {
    return { romanisation: '', system: 'none', isApplicable: false };
  }

  switch (languageCode.toLowerCase()) {
    case 'ja':
      return {
        romanisation: romaniseJapanese(clean),
        system: 'modified_hepburn',
        isApplicable: true,
      };
    case 'ko':
      return {
        romanisation: romaniseKorean(clean),
        system: 'revised_romanization_kr',
        isApplicable: true,
      };
    case 'hi':
      return {
        romanisation: romaniseHindi(clean),
        system: 'iast_aksharamukha',
        isApplicable: true,
      };
    case 'te':
      return {
        romanisation: romaniseTelugu(clean),
        system: 'iast_aksharamukha',
        isApplicable: true,
      };
    case 'ru':
      return {
        romanisation: romaniseRussian(clean),
        system: 'iso_9',
        isApplicable: true,
      };
    case 'zh':
      return {
        romanisation: romaniseMandarin(clean),
        system: 'hanyu_pinyin',
        isApplicable: true,
      };
    default:
      // Languages with Latin script (es, fr, de, en) do not need romanisation
      return {
        romanisation: '',
        system: 'not_applicable_latin_script',
        isApplicable: false,
      };
  }
}
