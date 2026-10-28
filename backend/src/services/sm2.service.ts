/**
 * SkillSprint AI - Spaced Repetition Review Engine (SuperMemo SM-2)
 * 
 * Strict requirement:
 * Spaced-repetition review of mistakes (SM-2 algorithm or similar), daily review pool.
 * Calculates next review timestamp, ease factor, and intervals based on quality ratings.
 */

export interface SM2Input {
  quality: number; // 0 (complete blackout) to 5 (perfect response)
  repetitions: number;
  previousInterval: number; // in days
  previousEaseFactor: number; // default 2.50
}

export interface SM2Output {
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReviewAt: Date;
  isMastered: boolean;
}

export class SM2Service {
  /**
   * Calculate next SM-2 interval and ease factor
   */
  public static calculate(input: SM2Input, now: Date = new Date()): SM2Output {
    const { quality, previousInterval } = input;
    let repetitions = input.repetitions;
    let easeFactor = input.previousEaseFactor;
    let intervalDays: number;

    // Quality check (0-5)
    const clampedQuality = Math.max(0, Math.min(5, Math.round(quality)));

    if (clampedQuality >= 3) {
      // Successful recall
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(previousInterval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Failed recall -> reset repetitions and start over at 1 day
      repetitions = 0;
      intervalDays = 1;
    }

    // Ease Factor formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    const qDiff = 5 - clampedQuality;
    easeFactor = easeFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02));

    // Hard floor for ease factor: 1.30
    if (easeFactor < 1.30) {
      easeFactor = 1.30;
    }

    // Round to 2 decimal places
    easeFactor = Math.round(easeFactor * 100) / 100;

    const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const isMastered = repetitions >= 3 && clampedQuality >= 4;

    return {
      intervalDays,
      repetitions,
      easeFactor,
      nextReviewAt,
      isMastered,
    };
  }

  /**
   * Convenience helper when a user gets an exercise wrong during a live lesson
   */
  public static initialMistake(now: Date = new Date()): {
    intervalDays: number;
    repetitions: number;
    easeFactor: number;
    nextReviewAt: Date;
    status: 'active';
  } {
    return {
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 2.50,
      nextReviewAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      status: 'active',
    };
  }
}
