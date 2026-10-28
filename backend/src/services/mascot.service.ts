/**
 * SkillSprint AI - Mascot & Dynamic Theme Design System
 * 
 * 4 Original Mascots with complete theme palettes:
 * - Foxy (Energetic Fox Explorer)
 * - Bunny (Cheerful Rabbit Linguist)
 * - Panda (Zen Bamboo Master)
 * - Kitty (Playful Amethyst Whiz)
 */

export type MascotId = 'foxy' | 'bunny' | 'panda' | 'kitty';

export interface MascotTheme {
  id: MascotId;
  name: string;
  species: string;
  tagline: string;
  personality: string;
  welcomeGreeting: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    background: string;
    cardBackground: string;
    cardBorder: string;
    textPrimary: string;
    textMuted: string;
    badgeBg: string;
    gradient: string;
  };
  tutorialLines: string[];
}

export const MASCOTS: Record<MascotId, MascotTheme> = {
  foxy: {
    id: 'foxy',
    name: 'Foxy',
    species: 'Swift Fox',
    tagline: 'Bold, agile & curious adventurer',
    personality: 'Keen instinct, quick sprints, never gives up!',
    welcomeGreeting: "Hey friend! I'm Foxy. Ready to sprint through your first words?",
    colors: {
      primary: '#EA580C', // Orange-600
      primaryDark: '#C2410C',
      primaryLight: '#FFEDD5',
      accent: '#F59E0B',
      background: '#FFF7ED',
      cardBackground: '#FFFFFF',
      cardBorder: '#FED7AA',
      textPrimary: '#431407',
      textMuted: '#9A3412',
      badgeBg: '#FFEDD5',
      gradient: 'from-orange-500 to-amber-500',
    },
    tutorialLines: [
      "Sprint into learning! Even 5 minutes every day creates unbreakable habits.",
      "Notice how phrases fit together. Words aren't memorized—they are discovered!",
      "Track your streak! Every completed lesson fuels my fiery tail.",
    ],
  },
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    species: 'Cheerful Rabbit',
    tagline: 'Gentle, attentive & enthusiastic',
    personality: 'Warm encouragement, attentive ear for pronunciation!',
    welcomeGreeting: "Hop in! I'm Bunny. We're going to make learning delightful!",
    colors: {
      primary: '#DB2777', // Pink-600
      primaryDark: '#BE185D',
      primaryLight: '#FCE7F3',
      accent: '#10B981',
      background: '#FDF2F8',
      cardBackground: '#FFFFFF',
      cardBorder: '#FBCFE8',
      textPrimary: '#500724',
      textMuted: '#9D174D',
      badgeBg: '#FCE7F3',
      gradient: 'from-pink-500 to-rose-400',
    },
    tutorialLines: [
      "Listen closely with big ears! Hearing real voices tunes your native ear.",
      "Mistakes are just hops on the path. Review them to build confidence!",
      "Celebrate tiny wins! Every word you speak is a new door opened.",
    ],
  },
  panda: {
    id: 'panda',
    name: 'Panda',
    species: 'Zen Bamboo Panda',
    tagline: 'Mindful, calm & wise master',
    personality: 'Steady discipline, peaceful mastery, deep roots.',
    welcomeGreeting: "Peace to you. I'm Panda. Slow, mindful steps lead to fluency.",
    colors: {
      primary: '#059669', // Emerald-600
      primaryDark: '#047857',
      primaryLight: '#D1FAE5',
      accent: '#65A30D',
      background: '#F0FDF4',
      cardBackground: '#FFFFFF',
      cardBorder: '#A7F3D0',
      textPrimary: '#064E3B',
      textMuted: '#047857',
      badgeBg: '#D1FAE5',
      gradient: 'from-emerald-600 to-teal-500',
    },
    tutorialLines: [
      "A bamboo sprout grows quietly before shooting into the sky. Be patient.",
      "Spaced repetition is the ancient secret of enduring memory.",
      "Breathe deeply when you encounter a tricky grammar rule. You are capable.",
    ],
  },
  kitty: {
    id: 'kitty',
    name: 'Kitty',
    species: 'Cosmic Violet Cat',
    tagline: 'Inquisitive, playful & sharp',
    personality: 'Prowling curiosity, sharp precision, playful rewards.',
    welcomeGreeting: "Purr-fect timing! I'm Kitty. Let's pounce on new languages!",
    colors: {
      primary: '#7C3AED', // Violet-600
      primaryDark: '#6D28D9',
      primaryLight: '#EDE9FE',
      accent: '#F59E0B',
      background: '#F5F3FF',
      cardBackground: '#FFFFFF',
      cardBorder: '#DDD6FE',
      textPrimary: '#2E1065',
      textMuted: '#6D28D9',
      badgeBg: '#EDE9FE',
      gradient: 'from-purple-600 to-indigo-600',
    },
    tutorialLines: [
      "Language is a puzzle with secret codes. Let's unravel it together!",
      "Never fear unfamiliar sounds—curiosity is our superpower.",
      "Spin the daily rewards, unlock achievements, and let's conquer new tongues!",
    ],
  },
};
