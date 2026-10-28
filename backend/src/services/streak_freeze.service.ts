/**
 * SkillSprint AI - Streak Freeze Mechanic Service
 * 
 * Strict requirement:
 * Streak freeze mechanic (max 2 freezes).
 * Consumes freeze automatically on missed days to protect user streaks.
 * Capped strictly at 2 freezes maximum.
 */

export interface StreakEvaluationResult {
  streakPreserved: boolean;
  freezeConsumed: boolean;
  newStreak: number;
  remainingFreezes: number;
  statusMessage: string;
}

export class StreakFreezeService {
  public static readonly MAX_FREEZES = 2;

  /**
   * Evaluate user's daily streak given last activity date, current streak, and active freezes
   */
  public static evaluateDailyStreak(
    lastActivityDateStr: string | null,
    currentDateStr: string,
    currentStreak: number,
    activeFreezes: number
  ): StreakEvaluationResult {
    // If no previous activity, start clean at 1
    if (!lastActivityDateStr) {
      return {
        streakPreserved: true,
        freezeConsumed: false,
        newStreak: 1,
        remainingFreezes: Math.min(this.MAX_FREEZES, activeFreezes),
        statusMessage: 'Welcome to your first sprint! Streak initialized at 1 day.',
      };
    }

    const last = new Date(lastActivityDateStr);
    const now = new Date(currentDateStr);

    // Normalize to UTC date difference
    const diffTime = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Practiced on the same day -> streak already incremented or active
      return {
        streakPreserved: true,
        freezeConsumed: false,
        newStreak: currentStreak,
        statusMessage: 'You already extended your sprint streak today! Keep going!',
        remainingFreezes: activeFreezes,
      };
    } else if (diffDays === 1) {
      // Practiced on consecutive day -> normal streak increment
      return {
        streakPreserved: true,
        freezeConsumed: false,
        newStreak: currentStreak + 1,
        statusMessage: `Streak extended! You are now on a ${currentStreak + 1}-day sprint!`,
        remainingFreezes: activeFreezes,
      };
    } else if (diffDays === 2) {
      // Missed exactly 1 day: check if a streak freeze is available
      if (activeFreezes > 0) {
        const remaining = activeFreezes - 1;
        return {
          streakPreserved: true,
          freezeConsumed: true,
          newStreak: currentStreak + 1, // saved streak continues!
          remainingFreezes: remaining,
          statusMessage: `Streak saved! You missed yesterday, but your Streak Freeze activated. ${remaining} freeze(s) left.`,
        };
      } else {
        // No freeze available -> streak resets
        return {
          streakPreserved: false,
          freezeConsumed: false,
          newStreak: 1,
          remainingFreezes: 0,
          statusMessage: 'Streak lapsed due to missed day. Starting a fresh sprint streak today!',
        };
      }
    } else {
      // Missed more than 1 day -> streak resets to 1
      return {
        streakPreserved: false,
        freezeConsumed: false,
        newStreak: 1,
        remainingFreezes: activeFreezes,
        statusMessage: 'Absence exceeded freeze protection window. Starting fresh sprint streak at 1 day.',
      };
    }
  }

  /**
   * Replenish streak freezes (capped strictly at MAX_FREEZES = 2)
   */
  public static replenishFreezes(currentFreezes: number, amountToAdd: number = 1): number {
    return Math.min(this.MAX_FREEZES, Math.max(0, currentFreezes + amountToAdd));
  }
}
