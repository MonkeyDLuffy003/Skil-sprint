/**
 * SkillSprint AI - Stage 4 Unit & Integration Tests
 * Stage 4: Interactive Conversational Role-Playing Dialogues with Mascots
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DialogueService, DIALOGUE_SCENARIOS } from '../src/services/dialogue.service.js';

test('1. Scenario Catalog Retrieval: Filters by language, difficulty, and returns valid metadata', () => {
  const allScenarios = DialogueService.getScenarios();
  assert.ok(allScenarios.length >= 4, 'Should have at least 4 roleplay scenarios loaded');

  // Filter by Japanese
  const jaScenarios = DialogueService.getScenarios('ja');
  assert.equal(jaScenarios.length, 1);
  assert.equal(jaScenarios[0].id, 'ja_cafe_order');
  assert.equal(jaScenarios[0].languageCode, 'ja');
  assert.equal(jaScenarios[0].difficulty, 'beginner');

  // Filter by Advanced difficulty
  const advScenarios = DialogueService.getScenarios(undefined, 'advanced');
  assert.equal(advScenarios.length, 1);
  assert.equal(advScenarios[0].id, 'de_job_interview');
  assert.equal(advScenarios[0].languageCode, 'de');

  // Fetch single scenario by ID
  const hotelScenario = DialogueService.getScenarioById('es_hotel_checkin');
  assert.ok(hotelScenario !== null);
  assert.equal(hotelScenario?.scenarioType, 'hotel_checkin');
  assert.equal(hotelScenario?.xpReward, 25);
});

test('2. Multi-turn Structure: Each scenario has 4 complete turns with prompts, romanisation, and hints', () => {
  for (const scenario of DIALOGUE_SCENARIOS) {
    assert.equal(scenario.turns.length, 4, `Scenario ${scenario.id} should have exactly 4 turns`);
    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i];
      assert.equal(turn.turnIndex, i + 1, `Turn index should match ${i + 1}`);
      assert.ok(turn.promptNative.length > 0, 'Prompt native should not be empty');
      assert.ok(turn.promptTranslation.length > 0, 'Prompt translation should not be empty');
      assert.ok(turn.expectedResponseHints.length >= 1, 'Should have at least 1 expected response hint');
      assert.ok(turn.acceptableAnswers.length >= 2, 'Should have at least 2 acceptable answers');
      assert.ok(turn.correctionGuidance.length > 0, 'Should have correction guidance');
    }
  }
});

test('3. Turn Evaluation: Handles exact native answers and acceptable variations', () => {
  // Test Japanese Cafe Turn 1: "いらっしゃいませ！何名様ですか？"
  const exactResult = DialogueService.evaluateTurnResponse('ja_cafe_order', 1, '一人です');
  assert.equal(exactResult.isAcceptable, true);
  assert.equal(exactResult.score, 100);
  assert.ok(exactResult.feedback.includes('Excellent'));
  assert.equal(exactResult.isScenarioComplete, false);
  assert.equal(exactResult.xpEarned, 5); // Partial turn XP

  // Test Spanish Hotel Turn 1: "Tengo una reserva"
  const spanishResult = DialogueService.evaluateTurnResponse('es_hotel_checkin', 1, 'Hola, tengo una reserva');
  assert.equal(spanishResult.isAcceptable, true);
  assert.ok(spanishResult.score >= 80);
});

test('4. Correction Guidance: Offers mascot constructive tip for off-topic or empty answers', () => {
  // Completely off-topic answer to French directions turn 1
  const invalidResult = DialogueService.evaluateTurnResponse('fr_asking_directions', 1, 'pizza and burger please');
  assert.equal(invalidResult.isAcceptable, false);
  assert.ok(invalidResult.score <= 40);
  assert.ok(invalidResult.feedback.includes('Pardon') || invalidResult.feedback.includes('Excusez-moi'), 
    'Should offer constructive guidance on asking where the metro is');
  assert.equal(invalidResult.xpEarned, 0);
  assert.equal(invalidResult.isScenarioComplete, false);

  // Empty string handling
  const emptyResult = DialogueService.evaluateTurnResponse('fr_asking_directions', 1, '');
  assert.equal(emptyResult.isAcceptable, false);
  assert.equal(emptyResult.score, 0);
});

test('5. Scenario Completion: Awards +25 XP and calculates mastery stars on final turn', () => {
  // Final Turn (Turn 4) of German Job Interview: "Haben Sie noch offene Fragen an uns?"
  const finalTurnResult = DialogueService.evaluateTurnResponse(
    'de_job_interview',
    4,
    'Wie sieht die Einarbeitungsphase für neue Entwickler aus?'
  );

  assert.equal(finalTurnResult.isAcceptable, true);
  assert.equal(finalTurnResult.score, 100);
  assert.equal(finalTurnResult.isScenarioComplete, true);
  assert.equal(finalTurnResult.xpEarned, 25, 'Should award the full +25 XP upon completing final turn');
  assert.equal(finalTurnResult.starsEarned, 3, 'Score of 100 should earn 3 mastery stars');

  // Check star thresholds
  assert.equal(DialogueService.calculateMasteryStars(92), 3);
  assert.equal(DialogueService.calculateMasteryStars(75), 2);
  assert.equal(DialogueService.calculateMasteryStars(50), 1);
  assert.equal(DialogueService.calculateMasteryStars(30), 0);
});
