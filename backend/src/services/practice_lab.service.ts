/**
 * SkillSprint AI - Practice Lab Service
 * 
 * Strict requirement:
 * Practice lab:
 * 1. Listening practice with variable speed (0.75x, 1.0x, 1.25x).
 * 2. Pronunciation self-assessment / speaking drills.
 * 3. Grammar tips with contextual examples.
 */

export interface ListeningDrill {
  id: string;
  phrase: string;
  nativeScript: string;
  romanisation: string;
  meaning: string;
  supportedSpeeds: number[]; // [0.75, 1.0, 1.25]
  clue: string;
}

export interface GrammarTipItem {
  id: string;
  topic: string;
  languageCode: string;
  explanation: string;
  keyRule: string;
  examples: { native: string; romanisation?: string; translation: string; note?: string }[];
}

export const LISTENING_DRILLS: Record<string, ListeningDrill[]> = {
  ja: [
    {
      id: 'drill_ja_1',
      phrase: 'おはようございます',
      nativeScript: 'おはようございます',
      romanisation: 'ohayō gozaimasu',
      meaning: 'Good morning (polite)',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Listen carefully to the elongated vowel "ō" in ohayō.',
    },
    {
      id: 'drill_ja_2',
      phrase: 'ありがとうございます',
      nativeScript: 'ありがとうございます',
      romanisation: 'arigatō gozaimasu',
      meaning: 'Thank you very much (polite)',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Distinguish the clean "to" vs "tō" duration.',
    },
    {
      id: 'drill_ja_3',
      phrase: 'お元気ですか',
      nativeScript: 'お元気ですか',
      romanisation: 'ogenki desu ka',
      meaning: 'How are you? (healthy)',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Note how the final question particle "ka" rises in pitch.',
    },
  ],
  es: [
    {
      id: 'drill_es_1',
      phrase: 'Buenos días, ¿cómo estás?',
      nativeScript: 'Buenos días, ¿cómo estás?',
      romanisation: 'Buenos días, ¿cómo estás?',
      meaning: 'Good morning, how are you?',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Notice the rolled "r" and acute accent on "días".',
    },
  ],
  te: [
    {
      id: 'drill_te_1',
      phrase: 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
      nativeScript: 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
      romanisation: 'namaskāraṃ, mīru elā unnāru?',
      meaning: 'Hello, how are you? (respectful)',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Notice the retroflex elongation on "kāraṃ".',
    },
  ],
  hi: [
    {
      id: 'drill_hi_1',
      phrase: 'नमस्ते, आप कैसे हैं?',
      nativeScript: 'नमस्ते, आप कैसे हैं?',
      romanisation: 'namaste, āp kaise haiṃ?',
      meaning: 'Hello, how are you? (respectful)',
      supportedSpeeds: [0.75, 1.0, 1.25],
      clue: 'Listen to the nasalization on "haiṃ".',
    },
  ],
};

export const GRAMMAR_TIPS: Record<string, GrammarTipItem[]> = {
  ja: [
    {
      id: 'gt_ja_particles',
      topic: 'Topic Marker Particle (は - wa)',
      languageCode: 'ja',
      explanation: 'In Japanese, the character は is pronounced "wa" when serving as the sentence topic marker, spotlighting what the conversation is about.',
      keyRule: 'Written as は (ha), pronounced as "wa" when marking topics.',
      examples: [
        {
          native: '私は学生です',
          romanisation: 'watashi wa gakusei desu',
          translation: 'As for me, I am a student',
          note: 'は marks わたし (watashi) as the topic.',
        },
        {
          native: '今日はいい天気ですね',
          romanisation: 'kyō wa ii tenki desu ne',
          translation: 'Today the weather is nice, isn\'t it?',
          note: 'は marks きょう (today) as the topic.',
        },
      ],
    },
    {
      id: 'gt_ja_desu',
      topic: 'Polite Copula (です - desu)',
      languageCode: 'ja',
      explanation: 'です (desu) equates to "is/am/are" in English and elevates the sentence to polite standard Japanese.',
      keyRule: 'The "u" at the end of "desu" is devoiced; it sounds like "dess".',
      examples: [
        {
          native: 'おいしいです',
          romanisation: 'oishii desu',
          translation: 'It is delicious',
        },
      ],
    },
  ],
  es: [
    {
      id: 'gt_es_ser_estar',
      topic: 'Ser vs. Estar (Two Kinds of "To Be")',
      languageCode: 'es',
      explanation: 'Spanish distinguishes between permanent identity/essence (Ser) and temporary states or locations (Estar).',
      keyRule: 'Ser = Characteristics & Origins; Estar = Emotions, Health, & Locations.',
      examples: [
        {
          native: 'Soy de España',
          translation: 'I am from Spain (Origin - Ser)',
        },
        {
          native: 'Estoy muy feliz hoy',
          translation: 'I am very happy today (Temporary state - Estar)',
        },
      ],
    },
  ],
  te: [
    {
      id: 'gt_te_respect',
      topic: 'Respectful Pronouns (మీరు - Mīru)',
      languageCode: 'te',
      explanation: 'Telugu uses "నువ్వు" (nuvvu) for close friends or younger people, and "మీరు" (mīru) for polite, formal conversation with elders and professionals.',
      keyRule: 'Use మీరు (mīru) in business, professional, and unfamiliar social contexts.',
      examples: [
        {
          native: 'మీరు ఎలా ఉన్నారు?',
          romanisation: 'mīru elā unnāru?',
          translation: 'How are you? (Polite / Formal)',
        },
      ],
    },
  ],
  hi: [
    {
      id: 'gt_hi_respect',
      topic: 'Respectful Pronouns (आप - Āp vs तुम - Tum)',
      languageCode: 'hi',
      explanation: 'Hindi uses आप (āp) for respectful formal conversation, and तुम (tum) for peers and close friends.',
      keyRule: 'Always use आप (āp) in professional or respectful settings.',
      examples: [
        {
          native: 'आप कैसे हैं?',
          romanisation: 'āp kaise haiṃ?',
          translation: 'How are you? (Formal/Polite)',
        },
      ],
    },
  ],
};

export class PracticeLabService {
  /**
   * Validate and retrieve listening playback speed
   */
  public static validatePlaybackSpeed(speed: number): number {
    const valid = [0.75, 1.0, 1.25];
    return valid.includes(speed) ? speed : 1.0;
  }

  /**
   * Calculate pronunciation accuracy score between user speech and target
   */
  public static evaluatePronunciation(
    userTranscribed: string,
    targetText: string
  ): { scorePercentage: number; feedback: string } {
    const cleanUser = userTranscribed.trim().toLowerCase();
    const cleanTarget = targetText.trim().toLowerCase();

    if (!cleanUser) {
      return { scorePercentage: 0, feedback: 'No voice detected. Please try speaking into your mic again.' };
    }

    if (cleanUser === cleanTarget) {
      return { scorePercentage: 100, feedback: 'Flawless native pronunciation! Perfect phoneme accuracy.' };
    }

    // Levenshtein similarity
    const distance = this.levenshtein(cleanUser, cleanTarget);
    const maxLen = Math.max(cleanUser.length, cleanTarget.length);
    const score = Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));

    let feedback = 'Good attempt! Try focusing on the exact syllables.';
    if (score >= 85) {
      feedback = 'Great pronunciation! Very natural cadence.';
    } else if (score < 60) {
      feedback = 'Listen to the 0.75x slow audio model and try matching the rhythm.';
    }

    return { scorePercentage: score, feedback };
  }

  private static levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
