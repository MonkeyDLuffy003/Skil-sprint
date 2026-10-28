/**
 * SkillSprint AI - Conversational Roleplay Dialogues Service
 * Stage 4: Interactive multi-turn conversational roleplays with NPC counterparts and Mascot tutors.
 */

export interface DialogueHint {
  native: string;
  romanisation?: string;
  translation: string;
}

export interface DialogueTurn {
  id: string;
  scenarioId: string;
  turnIndex: number;
  speakerRole: 'mascot_tutor' | 'npc_counterpart' | 'user';
  npcName: string;
  promptNative: string;
  promptRomanisation?: string;
  promptTranslation: string;
  expectedResponseHints: DialogueHint[];
  acceptableAnswers: string[];
  keyTokens: string[];
  correctionGuidance: string;
}

export interface DialogueScenario {
  id: string;
  languageCode: string;
  scenarioType: 'cafe_order' | 'hotel_checkin' | 'asking_directions' | 'job_interview';
  title: string;
  description: string;
  settingContext: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalTurns: number;
  xpReward: number;
  icon: string;
  turns: DialogueTurn[];
}

export interface DialogueEvaluationResult {
  isAcceptable: boolean;
  score: number; // 0 - 100
  feedback: string;
  suggestedAnswer: DialogueHint;
  userSaidNormalized: string;
  xpEarned: number;
  isScenarioComplete: boolean;
  starsEarned?: number;
}

export interface UserDialogueProgress {
  userId: string;
  scenarioId: string;
  turnsCompleted: number;
  isCompleted: boolean;
  accuracyScore: number;
  masteryStars: number;
  lastPlayedAt: string;
}

export const DIALOGUE_SCENARIOS: DialogueScenario[] = [
  {
    id: 'ja_cafe_order',
    languageCode: 'ja',
    scenarioType: 'cafe_order',
    title: 'Ordering at a Kyoto Kissaten',
    description: 'Order your favorite drink and specify table preferences at a cozy traditional coffee shop in Kyoto.',
    settingContext: 'You walk into a quaint kissaten cafe in Kyoto. The barista welcomes you warmly behind the wooden counter.',
    difficulty: 'beginner',
    totalTurns: 4,
    xpReward: 25,
    icon: '☕',
    turns: [
      {
        id: 'ja_cafe_t1',
        scenarioId: 'ja_cafe_order',
        turnIndex: 1,
        speakerRole: 'npc_counterpart',
        npcName: 'Kenji (Barista)',
        promptNative: 'いらっしゃいませ！何名様ですか？',
        promptRomanisation: 'Irasshaimase! Nan-mei sama desu ka?',
        promptTranslation: 'Welcome! How many people in your party?',
        expectedResponseHints: [
          { native: '一人です', romanisation: 'Hitori desu', translation: 'Just one person' },
          { native: '二人です', romanisation: 'Futari desu', translation: 'Two people' },
        ],
        acceptableAnswers: ['一人です', 'ひとりです', '二人です', 'ふたりです', '一人', '二人', 'hitori desu', 'futari desu', 'one person', 'just one'],
        keyTokens: ['一人', 'ひとり', '二人', 'ふたり', 'hitori', 'futari', 'one'],
        correctionGuidance: "State your party count clearly. In Japanese, 'Hitori desu' means 'One person' and 'Futari desu' means 'Two people'.",
      },
      {
        id: 'ja_cafe_t2',
        scenarioId: 'ja_cafe_order',
        turnIndex: 2,
        speakerRole: 'npc_counterpart',
        npcName: 'Kenji (Barista)',
        promptNative: 'ご注文はお決まりですか？',
        promptRomanisation: 'Gochuumon wa okimari desu ka?',
        promptTranslation: 'Have you decided on your order?',
        expectedResponseHints: [
          { native: 'アイスコーヒーをお願いします', romanisation: 'Aisu kōhī o onegaishimasu', translation: 'An iced coffee, please' },
          { native: '抹茶ラテをください', romanisation: 'Matcha rate o kudasai', translation: 'Matcha latte please' },
        ],
        acceptableAnswers: [
          'アイスコーヒーをお願いします',
          'アイスコーヒーをください',
          '抹茶ラテをお願いします',
          '抹茶ラテをください',
          'コーヒーをお願いします',
          'aisu kouhii o onegaishimasu',
          'aisu kohi o onegaishimasu',
          'matcha latte please',
          'iced coffee please',
        ],
        keyTokens: ['コーヒー', 'アイスコーヒー', '抹茶', 'お願い', 'ください', 'coffee', 'latte'],
        correctionGuidance: "Use '<item> o onegaishimasu' or '<item> o kudasai' to politely request your beverage.",
      },
      {
        id: 'ja_cafe_t3',
        scenarioId: 'ja_cafe_order',
        turnIndex: 3,
        speakerRole: 'npc_counterpart',
        npcName: 'Kenji (Barista)',
        promptNative: 'サイズはいかがなさいますか？',
        promptRomanisation: 'Saizu wa ikaga nasaimasu ka?',
        promptTranslation: 'What size would you like?',
        expectedResponseHints: [
          { native: 'レギュラーサイズで', romanisation: 'Regyurā saizu de', translation: 'Regular size, please' },
          { native: 'ラージサイズでお願いします', romanisation: 'Rāji saizu de onegaishimasu', translation: 'Large size please' },
        ],
        acceptableAnswers: [
          'レギュラーサイズで',
          'レギュラーで',
          'ラージサイズで',
          'ラージで',
          'regular size',
          'regular',
          'large size',
          'regyuraa',
          'raaji',
        ],
        keyTokens: ['レギュラー', 'ラージ', 'サイズ', 'regular', 'large', 'small'],
        correctionGuidance: "Tell the barista the cup size: 'Regyurā' (Regular) or 'Rāji' (Large) followed by 'de'.",
      },
      {
        id: 'ja_cafe_t4',
        scenarioId: 'ja_cafe_order',
        turnIndex: 4,
        speakerRole: 'npc_counterpart',
        npcName: 'Kenji (Barista)',
        promptNative: '店内でお召し上がりですか？',
        promptRomanisation: "Ten'nai de omeshiagari desu ka?",
        promptTranslation: 'Will you be having this inside the cafe?',
        expectedResponseHints: [
          { native: '店内でお願いします', romanisation: "Ten'nai de onegaishimasu", translation: 'For here, please' },
          { native: '持ち帰りで', romanisation: 'Mochikaeri de', translation: 'To go / Takeaway' },
        ],
        acceptableAnswers: [
          '店内で',
          '店内でお願いします',
          '持ち帰りで',
          '持ち帰りでお願いします',
          'テイクアウトで',
          'for here',
          'to go',
          'takeout',
          'tennai',
          'mochikaeri',
        ],
        keyTokens: ['店内', '持ち帰り', 'テイクアウト', 'here', 'go', 'takeaway', 'takeout'],
        correctionGuidance: "Say 'Ten'nai de' (for here) or 'Mochikaeri de' / 'Teikuauto de' (to go).",
      },
    ],
  },
  {
    id: 'es_hotel_checkin',
    languageCode: 'es',
    scenarioType: 'hotel_checkin',
    title: 'Checking into a Madrid Boutique Hotel',
    description: 'Greet the front desk clerk, present your reservation details, and enquire about amenities.',
    settingContext: 'You arrive at the hotel reception in central Madrid after a long flight.',
    difficulty: 'beginner',
    totalTurns: 4,
    xpReward: 25,
    icon: '🏨',
    turns: [
      {
        id: 'es_hotel_t1',
        scenarioId: 'es_hotel_checkin',
        turnIndex: 1,
        speakerRole: 'npc_counterpart',
        npcName: 'Lucía (Recepcionista)',
        promptNative: '¡Buenas tardes! ¿En qué puedo ayudarle hoy?',
        promptRomanisation: '¡Buenas tardes! ¿En qué puedo ayudarle hoy?',
        promptTranslation: 'Good afternoon! How may I assist you today?',
        expectedResponseHints: [
          { native: 'Tengo una reserva a nombre de Alex', translation: 'I have a reservation under the name Alex' },
          { native: 'Buenas tardes, quiero hacer el check-in', translation: 'Good afternoon, I would like to check in' },
        ],
        acceptableAnswers: [
          'tengo una reserva',
          'tengo una reserva a mi nombre',
          'buenas tardes, quiero hacer el check-in',
          'hola, tengo una reserva',
          'i have a reservation',
          'check in please',
        ],
        keyTokens: ['reserva', 'check-in', 'nombre', 'tarde', 'reservation'],
        correctionGuidance: "Politely state that you have a reservation: 'Tengo una reserva a nombre de [su nombre]'.",
      },
      {
        id: 'es_hotel_t2',
        scenarioId: 'es_hotel_checkin',
        turnIndex: 2,
        speakerRole: 'npc_counterpart',
        npcName: 'Lucía (Recepcionista)',
        promptNative: '¿Me permite su pasaporte o documento de identidad, por favor?',
        promptRomanisation: '¿Me permite su pasaporte o documento de identidad, por favor?',
        promptTranslation: 'May I see your passport or identity card, please?',
        expectedResponseHints: [
          { native: 'Aquí tiene mi pasaporte', translation: 'Here is my passport' },
          { native: 'Por supuesto, aquí está', translation: 'Of course, here it is' },
        ],
        acceptableAnswers: [
          'aquí tiene mi pasaporte',
          'aquí tiene',
          'aquí está mi pasaporte',
          'por supuesto, aquí está',
          'claro, tome',
          'here is my passport',
        ],
        keyTokens: ['pasaporte', 'aquí', 'tome', 'passport', 'here'],
        correctionGuidance: "Handing over documents is accompanied by 'Aquí tiene mi pasaporte' or 'Por supuesto'.",
      },
      {
        id: 'es_hotel_t3',
        scenarioId: 'es_hotel_checkin',
        turnIndex: 3,
        speakerRole: 'npc_counterpart',
        npcName: 'Lucía (Recepcionista)',
        promptNative: '¿Desea incluir el desayuno buffet en su estancia?',
        promptRomanisation: '¿Desea incluir el desayuno buffet en su estancia?',
        promptTranslation: 'Would you like to include the buffet breakfast during your stay?',
        expectedResponseHints: [
          { native: 'Sí, por favor', translation: 'Yes, please' },
          { native: 'No, gracias, solo la habitación', translation: 'No thanks, just the room' },
        ],
        acceptableAnswers: [
          'sí, por favor',
          'sí, gracias',
          'no, gracias',
          'no, solo la habitación',
          'yes please',
          'no thanks',
        ],
        keyTokens: ['sí', 'no', 'por favor', 'gracias', 'desayuno', 'yes', 'no'],
        correctionGuidance: "Answer affirmatively with 'Sí, por favor' or decline politely with 'No, gracias'.",
      },
      {
        id: 'es_hotel_t4',
        scenarioId: 'es_hotel_checkin',
        turnIndex: 4,
        speakerRole: 'npc_counterpart',
        npcName: 'Lucía (Recepcionista)',
        promptNative: 'Aquí tiene su tarjeta para la habitación 304. ¿Tiene alguna pregunta?',
        promptRomanisation: 'Aquí tiene su tarjeta para la habitación 304. ¿Tiene alguna pregunta?',
        promptTranslation: 'Here is your keycard for room 304. Do you have any questions?',
        expectedResponseHints: [
          { native: '¿A qué hora es el check-out?', translation: 'What time is check-out?' },
          { native: '¿Dónde está el ascensor?', translation: 'Where is the elevator?' },
        ],
        acceptableAnswers: [
          '¿a qué hora es el check-out?',
          'a qué hora es el check-out',
          '¿dónde está el ascensor?',
          'dónde está el ascensor',
          'muchas gracias',
          'no, todo perfecto gracias',
          'where is the elevator',
        ],
        keyTokens: ['check-out', 'hora', 'ascensor', 'gracias', 'elevator', 'checkout'],
        correctionGuidance: "Ask about departure time with '¿A qué hora es el check-out?' or the lift with '¿Dónde está el ascensor?'.",
      },
    ],
  },
  {
    id: 'fr_asking_directions',
    languageCode: 'fr',
    scenarioType: 'asking_directions',
    title: 'Asking for Directions near the Louvre',
    description: 'Ask a Parisian pedestrian for the nearest metro station and landmark walking directions.',
    settingContext: 'You are near the Palais Royal gardens in Paris, looking for the nearest Metro stop.',
    difficulty: 'intermediate',
    totalTurns: 4,
    xpReward: 25,
    icon: '🗺️',
    turns: [
      {
        id: 'fr_dir_t1',
        scenarioId: 'fr_asking_directions',
        turnIndex: 1,
        speakerRole: 'npc_counterpart',
        npcName: 'Camille (Parisienne)',
        promptNative: 'Bonjour ! Vous cherchez quelque chose ?',
        promptRomanisation: 'Bonjour ! Vous cherchez quelque chose ?',
        promptTranslation: 'Hello! Are you looking for something?',
        expectedResponseHints: [
          { native: 'Pardon, où se trouve la station de métro ?', translation: 'Excuse me, where is the metro station?' },
          { native: 'Excusez-moi, comment aller au Louvre ?', translation: 'Excuse me, how do I get to the Louvre?' },
        ],
        acceptableAnswers: [
          'pardon, où se trouve la station de métro',
          'où est la station de métro',
          'excusez-moi, où est le métro',
          'comment aller au louvre',
          'where is the metro station',
        ],
        keyTokens: ['métro', 'station', 'louvre', 'pardon', 'excusez-moi', 'metro', 'where'],
        correctionGuidance: "Start politely with 'Pardon' or 'Excusez-moi', followed by 'où se trouve...' (where is...).",
      },
      {
        id: 'fr_dir_t2',
        scenarioId: 'fr_asking_directions',
        turnIndex: 2,
        speakerRole: 'npc_counterpart',
        npcName: 'Camille (Parisienne)',
        promptNative: "Prenez cette rue tout droit, puis tournez à gauche. C'est clair ?",
        promptRomanisation: "Prenez cette rue tout droit, puis tournez à gauche. C'est clair ?",
        promptTranslation: "Go straight down this street, then turn left. Is that clear?",
        expectedResponseHints: [
          { native: "Oui, c'est très clair, merci !", translation: "Yes, that's very clear, thank you!" },
          { native: "C'est loin d'ici à pied ?", translation: "Is it far from here on foot?" },
        ],
        acceptableAnswers: [
          "oui c'est très clair merci",
          "oui merci beaucoup",
          "c'est loin d'ici",
          "c'est loin à pied",
          "merci c'est clair",
          "yes thank you",
        ],
        keyTokens: ['oui', 'merci', 'clair', 'loin', 'pied', 'thanks', 'clear'],
        correctionGuidance: "Confirm comprehension with 'Oui, merci' or ask about walking distance with 'C'est loin à pied ?'.",
      },
      {
        id: 'fr_dir_t3',
        scenarioId: 'fr_asking_directions',
        turnIndex: 3,
        speakerRole: 'npc_counterpart',
        npcName: 'Camille (Parisienne)',
        promptNative: "Non, c'est à seulement cinq minutes à pied. Avez-vous un plan ?",
        promptRomanisation: "Non, c'est à seulement cinq minutes à pied. Avez-vous un plan ?",
        promptTranslation: "No, it is only five minutes on foot. Do you have a map?",
        expectedResponseHints: [
          { native: "Oui, j'ai mon téléphone avec GPS", translation: "Yes, I have my phone with GPS" },
          { native: "Non, mais vos explications suffisent", translation: "No, but your explanation is enough" },
        ],
        acceptableAnswers: [
          "oui j'ai mon téléphone",
          "oui sur mon téléphone",
          "oui merci",
          "non mais ça va aller",
          "yes i have my phone",
        ],
        keyTokens: ['téléphone', 'plan', 'gps', 'oui', 'non', 'phone', 'map'],
        correctionGuidance: "State if you have a phone/map: 'Oui, j'ai mon téléphone' (Yes, I have my phone).",
      },
      {
        id: 'fr_dir_t4',
        scenarioId: 'fr_asking_directions',
        turnIndex: 4,
        speakerRole: 'npc_counterpart',
        npcName: 'Camille (Parisienne)',
        promptNative: 'Parfait ! Passez une excellente journée à Paris !',
        promptRomanisation: 'Parfait ! Passez une excellente journée à Paris !',
        promptTranslation: 'Perfect! Have a wonderful day in Paris!',
        expectedResponseHints: [
          { native: 'Merci beaucoup, bonne journée à vous aussi !', translation: 'Thank you very much, have a nice day too!' },
          { native: 'Merci infiniment pour votre aide !', translation: 'Thanks a million for your help!' },
        ],
        acceptableAnswers: [
          'merci beaucoup, bonne journée à vous aussi',
          'merci bonne journée',
          'bonne journée à vous',
          'merci pour votre aide',
          'thank you have a nice day',
        ],
        keyTokens: ['merci', 'bonne', 'journée', 'aide', 'thanks', 'day'],
        correctionGuidance: "Wish them a good day back with 'Merci, bonne journée à vous aussi !'.",
      },
    ],
  },
  {
    id: 'de_job_interview',
    languageCode: 'de',
    scenarioType: 'job_interview',
    title: 'Tech Job Interview in Berlin',
    description: 'Introduce your qualifications, explain your motivation, and ask an insightful question in German.',
    settingContext: 'You are seated in a bright conference room at a Berlin software studio for your interview.',
    difficulty: 'advanced',
    totalTurns: 4,
    xpReward: 25,
    icon: '💼',
    turns: [
      {
        id: 'de_work_t1',
        scenarioId: 'de_job_interview',
        turnIndex: 1,
        speakerRole: 'npc_counterpart',
        npcName: 'Dr. Weber (Teamleiter)',
        promptNative: 'Guten Tag! Schön, dass Sie da sind. Wie war Ihre Anreise heute?',
        promptRomanisation: 'Guten Tag! Schön, dass Sie da sind. Wie war Ihre Anreise heute?',
        promptTranslation: "Good day! Nice that you're here. How was your journey today?",
        expectedResponseHints: [
          { native: 'Guten Tag! Sehr gut danke, die U-Bahn war pünktlich.', translation: 'Good day! Very good thanks, the subway was on time.' },
          { native: 'Vielen Dank für die Einladung, alles verlief reibungslos.', translation: 'Thank you for the invitation, everything went smoothly.' },
        ],
        acceptableAnswers: [
          'guten tag sehr gut danke',
          'sehr gut danke die u-bahn war pünktlich',
          'vielen dank für die einladung',
          'alles gut danke',
          'good day thank you',
        ],
        keyTokens: ['guten', 'tag', 'danke', 'u-bahn', 'einladung', 'gut', 'good'],
        correctionGuidance: "Answer the friendly opening: 'Guten Tag, sehr gut danke!' or 'Vielen Dank für die Einladung!'.",
      },
      {
        id: 'de_work_t2',
        scenarioId: 'de_job_interview',
        turnIndex: 2,
        speakerRole: 'npc_counterpart',
        npcName: 'Dr. Weber (Teamleiter)',
        promptNative: 'Können Sie uns kurz Ihren beruflichen Schwerpunkt schildern?',
        promptRomanisation: 'Können Sie uns kurz Ihren beruflichen Schwerpunkt schildern?',
        promptTranslation: 'Could you briefly describe your professional focus?',
        expectedResponseHints: [
          { native: 'Ich arbeite seit drei Jahren als Full-Stack Entwickler.', translation: 'I have been working as a full-stack engineer for three years.' },
          { native: 'Mein Schwerpunkt liegt in modernen Webtechnologien und mobilen Apps.', translation: 'My focus is on modern web technologies and mobile apps.' },
        ],
        acceptableAnswers: [
          'ich arbeite als softwareentwickler',
          'ich bin entwickler',
          'mein schwerpunkt liegt in webtechnologien',
          'software engineer',
          'full stack developer',
        ],
        keyTokens: ['entwickler', 'arbeit', 'schwerpunkt', 'developer', 'software', 'engineer'],
        correctionGuidance: "Summarize your role: 'Ich arbeite als Entwickler' (I work as an engineer).",
      },
      {
        id: 'de_work_t3',
        scenarioId: 'de_job_interview',
        turnIndex: 3,
        speakerRole: 'npc_counterpart',
        npcName: 'Dr. Weber (Teamleiter)',
        promptNative: 'Warum möchten Sie speziell in unserem Team arbeiten?',
        promptRomanisation: 'Warum möchten Sie speziell in unserem Team arbeiten?',
        promptTranslation: 'Why do you want to work specifically with our team?',
        expectedResponseHints: [
          { native: 'Weil Ihre innovativen Produkte mich sehr begeistern.', translation: 'Because your innovative products excite me very much.' },
          { native: 'Weil meine Fähigkeiten ideal zu Ihren Herausforderungen passen.', translation: 'Because my skills are an ideal fit for your challenges.' },
        ],
        acceptableAnswers: [
          'weil ihre produkte mich begeistern',
          'weil das team sehr innovativ ist',
          'weil meine fähigkeiten gut passen',
          'because of your innovative products',
        ],
        keyTokens: ['begeistern', 'produkte', 'innovativ', 'team', 'passen', 'innovative'],
        correctionGuidance: "Express enthusiasm with 'Weil Ihre Produkte mich sehr begeistern' (Because your products excite me).",
      },
      {
        id: 'de_work_t4',
        scenarioId: 'de_job_interview',
        turnIndex: 4,
        speakerRole: 'npc_counterpart',
        npcName: 'Dr. Weber (Teamleiter)',
        promptNative: 'Haben Sie noch offene Fragen an uns?',
        promptRomanisation: 'Haben Sie noch offene Fragen an uns?',
        promptTranslation: 'Do you have any remaining questions for us?',
        expectedResponseHints: [
          { native: 'Wie sieht die Einarbeitungsphase für neue Entwickler aus?', translation: 'What does the onboarding phase look like for new developers?' },
          { native: 'Vielen Dank, alles ist für mich vorerst sehr klar.', translation: 'Thank you very much, everything is very clear for now.' },
        ],
        acceptableAnswers: [
          'wie sieht die einarbeitungsphase aus',
          'wie ist das team organisiert',
          'vielen dank alles ist klar',
          'alles klar danke',
          'what does the onboarding look like',
        ],
        keyTokens: ['einarbeitung', 'team', 'klar', 'danke', 'fragen', 'onboarding'],
        correctionGuidance: "Ask about the onboarding process with 'Wie sieht die Einarbeitung aus?' or conclude with 'Alles ist klar, danke'.",
      },
    ],
  },
];

export class DialogueService {
  /**
   * Retrieves all roleplay scenarios, optionally filtered by language and difficulty
   */
  static getScenarios(languageCode?: string, difficulty?: string): DialogueScenario[] {
    return DIALOGUE_SCENARIOS.filter((scenario) => {
      if (languageCode && scenario.languageCode !== languageCode) return false;
      if (difficulty && scenario.difficulty !== difficulty) return false;
      return true;
    });
  }

  /**
   * Retrieves a specific scenario by ID
   */
  static getScenarioById(scenarioId: string): DialogueScenario | null {
    return DIALOGUE_SCENARIOS.find((s) => s.id === scenarioId) || null;
  }

  /**
   * Normalizes input text for resilient phonetic/fuzzy match
   */
  static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"¡¿]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Evaluates user spoken or typed turn response against acceptable options and key tokens
   */
  static evaluateTurnResponse(
    scenarioId: string,
    turnIndex: number,
    userResponse: string
  ): DialogueEvaluationResult {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const turn = scenario.turns.find((t) => t.turnIndex === turnIndex);
    if (!turn) {
      throw new Error(`Turn ${turnIndex} not found in scenario ${scenarioId}`);
    }

    const normalizedUser = this.normalizeText(userResponse);
    if (!normalizedUser) {
      return {
        isAcceptable: false,
        score: 0,
        feedback: "Please type or say your response to continue the conversation.",
        suggestedAnswer: turn.expectedResponseHints[0],
        userSaidNormalized: '',
        xpEarned: 0,
        isScenarioComplete: false,
      };
    }

    // 1. Check exact match with acceptable answers and expected hints
    const acceptablePool = [
      ...turn.acceptableAnswers,
      ...turn.expectedResponseHints.map((h) => h.native),
      ...turn.expectedResponseHints.map((h) => h.translation),
    ];

    const exactMatch = acceptablePool.some((ans) => {
      const normAns = this.normalizeText(ans);
      return normalizedUser === normAns || normalizedUser.includes(normAns) || normAns.includes(normalizedUser);
    });

    // 2. Token overlap score
    const matchedTokens = turn.keyTokens.filter((token) =>
      normalizedUser.includes(this.normalizeText(token))
    );
    const tokenScore = turn.keyTokens.length > 0 ? (matchedTokens.length / turn.keyTokens.length) * 100 : 50;

    let finalScore = exactMatch ? 100 : Math.round(Math.max(tokenScore, 30));
    const isAcceptable = exactMatch || matchedTokens.length > 0 || finalScore >= 60;

    if (!isAcceptable) {
      finalScore = Math.min(finalScore, 40);
    }

    const isLastTurn = turnIndex >= scenario.totalTurns;
    const xpEarned = isAcceptable && isLastTurn ? scenario.xpReward : isAcceptable ? 5 : 0;

    let feedback = '';
    if (finalScore >= 90) {
      feedback = '✨ Excellent! Perfectly natural response in this context.';
    } else if (finalScore >= 65) {
      feedback = '👍 Great job! Your reply was understood clearly.';
    } else {
      feedback = `💡 ${turn.correctionGuidance}`;
    }

    // Calculate stars if complete
    let starsEarned: number | undefined;
    if (isLastTurn && isAcceptable) {
      starsEarned = finalScore >= 85 ? 3 : finalScore >= 65 ? 2 : 1;
    }

    return {
      isAcceptable,
      score: finalScore,
      feedback,
      suggestedAnswer: turn.expectedResponseHints[0],
      userSaidNormalized: normalizedUser,
      xpEarned,
      isScenarioComplete: isLastTurn && isAcceptable,
      starsEarned,
    };
  }

  /**
   * Calculates overall mastery stars for a scenario session
   */
  static calculateMasteryStars(averageAccuracy: number): number {
    if (averageAccuracy >= 85) return 3;
    if (averageAccuracy >= 65) return 2;
    if (averageAccuracy >= 40) return 1;
    return 0;
  }
}
