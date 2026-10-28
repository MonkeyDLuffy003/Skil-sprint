/**
 * SkillSprint AI - Region-Based Language Recommendation Service
 * 
 * Strict requirement:
 * Detect user region or locale, recommend relevant languages
 * (e.g. South Asia -> Hindi/Telugu/Tamil + global; East Asia -> Japanese/Korean/Mandarin; Europe/Americas -> Spanish/French/German),
 * explain why.
 */

export type RegionKey = 'south_asia' | 'east_asia' | 'europe' | 'americas' | 'global';

export interface RecommendedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flagEmoji: string;
  badgeLabel: string;
  reasonSummary: string;
  estimatedSpeakersMillions: number;
  difficultyLevel: 'beginner_friendly' | 'medium' | 'advanced';
  priority: number;
}

const REGIONAL_CATALOG: Record<RegionKey, RecommendedLanguage[]> = {
  south_asia: [
    {
      code: 'te',
      name: 'Telugu',
      nativeName: 'తెలుగు',
      flagEmoji: '🇮🇳',
      badgeLabel: 'Tech Corridor Powerhouse',
      reasonSummary: 'Primary language of Hyderabad & Andhra Pradesh technology hubs; essential for software and regional commerce.',
      estimatedSpeakersMillions: 96,
      difficultyLevel: 'medium',
      priority: 1,
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flagEmoji: '🇮🇳',
      badgeLabel: 'National Lingua Franca',
      reasonSummary: 'Spoken by over 600M across India; foundational for national governance, entertainment, and digital markets.',
      estimatedSpeakersMillions: 609,
      difficultyLevel: 'beginner_friendly',
      priority: 2,
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagEmoji: '🇯🇵',
      badgeLabel: 'High Bilateral Career Demand',
      reasonSummary: 'Accelerated Indo-Japan tech partnerships, semiconductor initiatives, and high engineering visa quotas.',
      estimatedSpeakersMillions: 125,
      difficultyLevel: 'advanced',
      priority: 3,
    },
  ],
  east_asia: [
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagEmoji: '🇯🇵',
      badgeLabel: 'Regional Innovation',
      reasonSummary: 'Dominant in game engineering, AI hardware, robotics, and creative arts across East Asia.',
      estimatedSpeakersMillions: 125,
      difficultyLevel: 'beginner_friendly',
      priority: 1,
    },
    {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flagEmoji: '🇰🇷',
      badgeLabel: 'Global Media & Tech',
      reasonSummary: 'Explosive K-content adoption and headquarters of electronics giants (Samsung, SK, Hyundai).',
      estimatedSpeakersMillions: 82,
      difficultyLevel: 'medium',
      priority: 2,
    },
    {
      code: 'zh',
      name: 'Mandarin Chinese',
      nativeName: '中文',
      flagEmoji: '🇨🇳',
      badgeLabel: 'Pan-Asian Commerce',
      reasonSummary: 'Spoken by 1.1 billion people; foundational for supply chains and global commerce.',
      estimatedSpeakersMillions: 1120,
      difficultyLevel: 'advanced',
      priority: 3,
    },
  ],
  europe: [
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flagEmoji: '🇪🇸',
      badgeLabel: 'Global Continental Reach',
      reasonSummary: 'Second most spoken native language worldwide; connects 21 nations and growing European mobility.',
      estimatedSpeakersMillions: 595,
      difficultyLevel: 'beginner_friendly',
      priority: 1,
    },
    {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flagEmoji: '🇩🇪',
      badgeLabel: 'Industrial Powerhouse',
      reasonSummary: 'Leading economy of the European Union; top demand in automotive, engineering, and scientific research.',
      estimatedSpeakersMillions: 134,
      difficultyLevel: 'medium',
      priority: 2,
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flagEmoji: '🇫🇷',
      badgeLabel: 'Diplomacy & Culture',
      reasonSummary: 'Official language of EU institutions, the UN, international law, and culinary culture.',
      estimatedSpeakersMillions: 310,
      difficultyLevel: 'medium',
      priority: 3,
    },
  ],
  americas: [
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flagEmoji: '🇪🇸',
      badgeLabel: 'Essential Continental Asset',
      reasonSummary: 'Fastest-growing language across North America with 42M+ US speakers; dominant throughout the Americas.',
      estimatedSpeakersMillions: 595,
      difficultyLevel: 'beginner_friendly',
      priority: 1,
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagEmoji: '🇯🇵',
      badgeLabel: 'Entertainment & Gaming',
      reasonSummary: 'Massive cultural footprint in gaming, animation, and tech collaboration across American tech hubs.',
      estimatedSpeakersMillions: 125,
      difficultyLevel: 'advanced',
      priority: 2,
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flagEmoji: '🇫🇷',
      badgeLabel: 'Pan-American Diplomacy',
      reasonSummary: 'Co-official in Canada and influential across Caribbean trade and diplomatic missions.',
      estimatedSpeakersMillions: 310,
      difficultyLevel: 'medium',
      priority: 3,
    },
  ],
  global: [
    {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flagEmoji: '🇪🇸',
      badgeLabel: 'Global Communication',
      reasonSummary: 'Widely accessible phonetic grammar opening conversations across 5 continents.',
      estimatedSpeakersMillions: 595,
      difficultyLevel: 'beginner_friendly',
      priority: 1,
    },
    {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagEmoji: '🇯🇵',
      badgeLabel: 'Global Tech & Culture',
      reasonSummary: 'Beloved cultural medium and vital economic engine in engineering and technology.',
      estimatedSpeakersMillions: 125,
      difficultyLevel: 'advanced',
      priority: 2,
    },
  ],
};

export class RecommendationService {
  /**
   * Determine RegionKey from timezone, browser locale, or geographic hint
   */
  public static detectRegion(localeOrTimezone?: string): RegionKey {
    if (!localeOrTimezone) {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        localeOrTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || navigator.language;
      } else {
        return 'south_asia';
      }
    }

    const lower = localeOrTimezone.toLowerCase();

    // South Asia
    if (
      lower.includes('kolkata') ||
      lower.includes('calcutta') ||
      lower.includes('delhi') ||
      lower.includes('mumbai') ||
      lower.includes('asia/karachi') ||
      lower.includes('asia/dhaka') ||
      lower.includes('asia/colombo') ||
      lower.endsWith('-in') ||
      lower.includes('en-in') ||
      lower.includes('hi-in') ||
      lower.includes('te-in')
    ) {
      return 'south_asia';
    }

    // East Asia
    if (
      lower.includes('tokyo') ||
      lower.includes('seoul') ||
      lower.includes('shanghai') ||
      lower.includes('hong_kong') ||
      lower.includes('taipei') ||
      lower.endsWith('-jp') ||
      lower.endsWith('-kr') ||
      lower.endsWith('-cn')
    ) {
      return 'east_asia';
    }

    // Europe
    if (
      lower.includes('europe') ||
      lower.includes('london') ||
      lower.includes('paris') ||
      lower.includes('berlin') ||
      lower.includes('madrid') ||
      lower.includes('rome')
    ) {
      return 'europe';
    }

    // Americas
    if (
      lower.includes('america') ||
      lower.includes('new_york') ||
      lower.includes('los_angeles') ||
      lower.includes('chicago') ||
      lower.includes('sao_paulo') ||
      lower.includes('mexico') ||
      lower.endsWith('-us') ||
      lower.endsWith('-ca') ||
      lower.endsWith('-mx')
    ) {
      return 'americas';
    }

    return 'global';
  }

  /**
   * Get recommendations for a specific region
   */
  public static getRecommendations(region: RegionKey): RecommendedLanguage[] {
    return REGIONAL_CATALOG[region] || REGIONAL_CATALOG.global;
  }
}
