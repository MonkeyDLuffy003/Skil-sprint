/**
 * SkillSprint AI - Stage 3 Automated Test Suite
 * 
 * Verifies:
 * 1. Region-based language recommendations and explanations
 * 2. Listening practice drills with variable playback speeds (0.75x, 1.0x, 1.25x)
 * 3. Pronunciation self-assessment scoring & feedback
 * 4. Streak Freeze mechanic (max 2 freezes, auto-consumption, streak preservation, clamping)
 * 5. Grammar tips and real context examples
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationService } from '../src/services/recommendation.service';
import { PracticeLabService, LISTENING_DRILLS, GRAMMAR_TIPS } from '../src/services/practice_lab.service';
import { StreakFreezeService } from '../src/services/streak_freeze.service';

test('1. Region-Based Recommendations: Detects locale & recommends relevant languages with reasons', () => {
  // Test South Asia (India / Kolkata)
  const saRegion = RecommendationService.detectRegion('Asia/Kolkata');
  assert.equal(saRegion, 'south_asia');
  const saRecs = RecommendationService.getRecommendations(saRegion);
  assert.ok(saRecs.length >= 3);
  const saCodes = saRecs.map((r) => r.code);
  assert.ok(saCodes.includes('te'), 'South Asia should feature Telugu for tech corridor relevance');
  assert.ok(saCodes.includes('hi'), 'South Asia should feature Hindi as national lingua franca');
  assert.ok(saRecs[0].reasonSummary.length > 20, 'Recommendation must include detailed rationale');

  // Test East Asia (Tokyo)
  const eaRegion = RecommendationService.detectRegion('Asia/Tokyo');
  assert.equal(eaRegion, 'east_asia');
  const eaRecs = RecommendationService.getRecommendations(eaRegion);
  assert.equal(eaRecs[0].code, 'ja');

  // Test Europe (London / Berlin)
  const euRegion = RecommendationService.detectRegion('Europe/Berlin');
  assert.equal(euRegion, 'europe');
  const euRecs = RecommendationService.getRecommendations(euRegion);
  const euCodes = euRecs.map((r) => r.code);
  assert.ok(euCodes.includes('es'));
  assert.ok(euCodes.includes('de'));

  // Test Americas (New York)
  const amRegion = RecommendationService.detectRegion('America/New_York');
  assert.equal(amRegion, 'americas');
  const amRecs = RecommendationService.getRecommendations(amRegion);
  assert.equal(amRecs[0].code, 'es');
});

test('2. Practice Lab: Variable listening playback speeds (0.75x, 1.0x, 1.25x)', () => {
  // Verified valid speeds
  assert.equal(PracticeLabService.validatePlaybackSpeed(0.75), 0.75);
  assert.equal(PracticeLabService.validatePlaybackSpeed(1.0), 1.0);
  assert.equal(PracticeLabService.validatePlaybackSpeed(1.25), 1.25);

  // Fallback for invalid speeds
  assert.equal(PracticeLabService.validatePlaybackSpeed(2.5), 1.0);
  assert.equal(PracticeLabService.validatePlaybackSpeed(-0.5), 1.0);

  // Check listening drill data
  const jaDrills = LISTENING_DRILLS['ja'];
  assert.ok(jaDrills.length >= 3);
  assert.deepEqual(jaDrills[0].supportedSpeeds, [0.75, 1.0, 1.25]);
});

test('3. Pronunciation Assessment: Scoring accuracy and phoneme feedback', () => {
  const perfect = PracticeLabService.evaluatePronunciation('ohayō gozaimasu', 'ohayō gozaimasu');
  assert.equal(perfect.scorePercentage, 100);
  assert.ok(perfect.feedback.includes('Flawless'));

  const close = PracticeLabService.evaluatePronunciation('ohayo gozaimas', 'ohayō gozaimasu');
  assert.ok(close.scorePercentage >= 80, 'Close attempt should score >= 80%');

  const empty = PracticeLabService.evaluatePronunciation('', 'ohayō gozaimasu');
  assert.equal(empty.scorePercentage, 0);
  assert.ok(empty.feedback.includes('No voice detected'));
});

test('4. Streak Freeze Mechanic: Automatic consumption on missed day, saves streak, strictly max 2 freezes', () => {
  // Day 1: normal activity
  const day1 = StreakFreezeService.evaluateDailyStreak(
    null,
    '2026-10-24T10:00:00Z',
    0,
    2
  );
  assert.equal(day1.newStreak, 1);
  assert.equal(day1.remainingFreezes, 2);
  assert.equal(day1.freezeConsumed, false);

  // Day 2: consecutive practice -> streak becomes 2
  const day2 = StreakFreezeService.evaluateDailyStreak(
    '2026-10-24T10:00:00Z',
    '2026-10-25T10:00:00Z',
    1,
    2
  );
  assert.equal(day2.newStreak, 2);
  assert.equal(day2.remainingFreezes, 2);
  assert.equal(day2.freezeConsumed, false);

  // Day 4: user missed Day 3 (2 days gap) -> Streak Freeze activates!
  const day4WithFreeze = StreakFreezeService.evaluateDailyStreak(
    '2026-10-25T10:00:00Z',
    '2026-10-27T10:00:00Z',
    2,
    2 // has 2 freezes
  );
  assert.equal(day4WithFreeze.streakPreserved, true);
  assert.equal(day4WithFreeze.freezeConsumed, true);
  assert.equal(day4WithFreeze.newStreak, 3, 'Streak should continue incrementing');
  assert.equal(day4WithFreeze.remainingFreezes, 1, 'Freeze count decremented to 1');

  // User with 0 freezes misses a day -> streak resets
  const day4NoFreeze = StreakFreezeService.evaluateDailyStreak(
    '2026-10-25T10:00:00Z',
    '2026-10-27T10:00:00Z',
    2,
    0 // 0 freezes left
  );
  assert.equal(day4NoFreeze.streakPreserved, false);
  assert.equal(day4NoFreeze.newStreak, 1, 'Streak must reset to 1');
  assert.equal(day4NoFreeze.remainingFreezes, 0);

  // Strict clamp: max 2 freezes
  const replenished = StreakFreezeService.replenishFreezes(1, 5);
  assert.equal(replenished, 2, 'Must clamp strictly at MAX_FREEZES = 2');
});

test('5. Grammar Tips & Contextual Rules: Available across languages', () => {
  const jaTips = GRAMMAR_TIPS['ja'];
  assert.ok(jaTips.length >= 2);
  assert.equal(jaTips[0].languageCode, 'ja');
  assert.ok(jaTips[0].examples.length > 0);
  assert.ok(jaTips[0].examples[0].native.length > 0);
  assert.ok(jaTips[0].examples[0].translation.length > 0);
});
