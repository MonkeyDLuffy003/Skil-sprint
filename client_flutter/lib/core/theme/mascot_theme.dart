import 'package:flutter/material.dart';

enum MascotType { foxy, bunny, panda, kitty }

class MascotThemeData {
  final MascotType type;
  final String name;
  final String species;
  final String tagline;
  final Color primary;
  final Color primaryDark;
  final Color primaryLight;
  final Color background;
  final Color cardBorder;
  final Color textPrimary;
  final String greeting;
  final List<String> tutorialDialogue;

  const MascotThemeData({
    required this.type,
    required this.name,
    required this.species,
    required this.tagline,
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
    required this.background,
    required this.cardBorder,
    required this.textPrimary,
    required this.greeting,
    required this.tutorialDialogue,
  });

  ThemeData toThemeData() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.light(
        primary: primary,
        secondary: primaryDark,
        surface: background,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        foregroundColor: textPrimary,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 16),
          elevation: 2,
        ),
      ),
    );
  }
}

class MascotThemes {
  static const Map<MascotType, MascotThemeData> all = {
    MascotType.foxy: MascotThemeData(
      type: MascotType.foxy,
      name: 'Foxy',
      species: 'Swift Fox',
      tagline: 'Bold, agile & curious adventurer',
      primary: Color(0xFFEA580C),
      primaryDark: Color(0xFFC2410C),
      primaryLight: Color(0xFFFFEDD5),
      background: Color(0xFFFFF7ED),
      cardBorder: Color(0xFFFED7AA),
      textPrimary: Color(0xFF431407),
      greeting: "Hey friend! I'm Foxy. Ready to sprint through your first words?",
      tutorialDialogue: [
        "Sprint into learning! 5 minutes every day creates unbreakable habits.",
        "Notice how phrases fit together. Words aren't memorized—they're unlocked!",
        "Keep up your daily streak to fuel my fiery tail!",
      ],
    ),
    MascotType.bunny: MascotThemeData(
      type: MascotType.bunny,
      name: 'Bunny',
      species: 'Cheerful Rabbit',
      tagline: 'Gentle, attentive & enthusiastic',
      primary: Color(0xFFDB2777),
      primaryDark: Color(0xFFBE185D),
      primaryLight: Color(0xFFFCE7F3),
      background: Color(0xFFFDF2F8),
      cardBorder: Color(0xFFFBCFE8),
      textPrimary: Color(0xFF500724),
      greeting: "Hop in! I'm Bunny. We're going to make learning delightful!",
      tutorialDialogue: [
        "Listen closely with big ears! Hearing real sounds tunes your ear.",
        "Mistakes are just gentle hops on the journey. Review them with love!",
        "Celebrate every new phrase you speak!",
      ],
    ),
    MascotType.panda: MascotThemeData(
      type: MascotType.panda,
      name: 'Panda',
      species: 'Zen Bamboo Panda',
      tagline: 'Mindful, calm & wise master',
      primary: Color(0xFF059669),
      primaryDark: Color(0xFF047857),
      primaryLight: Color(0xFFD1FAE5),
      background: Color(0xFFF0FDF4),
      cardBorder: Color(0xFFA7F3D0),
      textPrimary: Color(0xFF064E3B),
      greeting: "Peace to you. I'm Panda. Slow, mindful steps lead to fluency.",
      tutorialDialogue: [
        "A bamboo shoot grows silently before shooting upward. Be patient.",
        "Spaced repetition is the ancient rhythm of enduring memory.",
        "Breathe deeply when you meet challenging grammar. You've got this.",
      ],
    ),
    MascotType.kitty: MascotThemeData(
      type: MascotType.kitty,
      name: 'Kitty',
      species: 'Cosmic Violet Cat',
      tagline: 'Inquisitive, playful & sharp',
      primary: Color(0xFF7C3AED),
      primaryDark: Color(0xFF6D28D9),
      primaryLight: Color(0xFFEDE9FE),
      background: Color(0xFFF5F3FF),
      cardBorder: Color(0xFFDDD6FE),
      textPrimary: Color(0xFF2E1065),
      greeting: "Purr-fect timing! I'm Kitty. Let's pounce on new languages!",
      tutorialDialogue: [
        "Language is a puzzle of secret codes. Let's unravel each one!",
        "Curiosity is our greatest superpower. Explore without fear!",
        "Spin rewards, unlock achievements, and rule the leaderboards!",
      ],
    ),
  };
}
