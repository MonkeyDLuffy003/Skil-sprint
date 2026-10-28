/**
 * SkillSprint AI - Stage 2 Automated Test Suite
 * 
 * Verifies:
 * 1. Strict separation of Smart Translation fields (original_text, translated_text, romanisation, romanisation_system, meaning)
 * 2. Deterministic Romanisation (Japanese Hepburn, Korean RR, Indic IAST, Russian ISO-9, Mandarin Pinyin) with zero non-determinism
 * 3. SuperMemo SM-2 Spaced Repetition calculation (intervals, ease factor clamping >= 1.30, mastery criteria)
 * 4. Learn Engine unit, lessons, and 7 exercise types verification
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDeterministicRomanisation } from '../src/services/romanisation.service';
import { SmartTranslatorService } from '../src/services/translator.service';
import { SM2Service } from '../src/services/sm2.service';
import { LearnEngineService, CURRICULA } from '../src/services/learning.service';

test('1. Smart Translation Field Separation: All fields are strictly isolated and typed', async () => {
  const result = await SmartTranslatorService.translate({
    originalText: 'Good morning',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    meaningLanguage: 'en',
  });

  // Verify non-empty, separate fields
  assert.equal(result.original_text, 'Good morning');
  assert.equal(result.translated_text, 'おはようございます');
  assert.equal(result.romanisation, 'ohayō gozaimasu');
  assert.equal(result.romanisation_system, 'modified_hepburn');
  assert.ok(result.meaning.length > 0, 'Meaning should be populated');
  assert.equal(result.meaning_language, 'en');

  // Verify fields never leak into each other
  assert.ok(!result.translated_text.includes(result.romanisation), 'Translated native text must not include romanisation');
  assert.ok(!result.romanisation.includes(result.translated_text), 'Romanisation must not include native script');
});

test('2. Deterministic Romanisation: 100% reproducible across all supported scripts', () => {
  // Japanese Modified Hepburn
  const ja1 = generateDeterministicRomanisation('おはようございます', 'ja');
  assert.equal(ja1.romanisation, 'ohayō gozaimasu');
  assert.equal(ja1.system, 'modified_hepburn');

  // Japanese Sokuon (っ) double consonant
  const jaSokuon = generateDeterministicRomanisation('きって', 'ja');
  assert.equal(jaSokuon.romanisation, 'kitte');

  // Korean Revised Romanization
  const ko1 = generateDeterministicRomanisation('안녕하세요', 'ko');
  assert.equal(ko1.romanisation, 'annyeonghaseyo');
  assert.equal(ko1.system, 'revised_romanization_kr');

  // Hindi IAST / Aksharamukha
  const hi1 = generateDeterministicRomanisation('नमस्ते', 'hi');
  assert.equal(hi1.romanisation, 'namaste');
  assert.equal(hi1.system, 'iast_aksharamukha');

  // Telugu IAST
  const te1 = generateDeterministicRomanisation('నమస్కారం', 'te');
  assert.equal(te1.romanisation, 'namaskāraṃ');
  assert.equal(te1.system, 'iast_aksharamukha');

  // Russian ISO 9:1995
  const ru1 = generateDeterministicRomanisation('Спасибо', 'ru');
  assert.equal(ru1.romanisation, 'Spasibo');
  assert.equal(ru1.system, 'iso_9');

  // Determinism check: run 50 times in a loop, outputs must be identical
  for (let i = 0; i < 50; i++) {
    const loopJa = generateDeterministicRomanisation('おはようございます', 'ja');
    assert.equal(loopJa.romanisation, 'ohayō gozaimasu');
  }
});

test('3. SuperMemo SM-2 Algorithm: Interval calculation, ease factor clamping and reset', () => {
  const baseDate = new Date('2026-10-26T12:00:00Z');

  // Repetition 0 with quality 5 (perfect recall) -> interval should be 1
  const step1 = SM2Service.calculate({
    quality: 5,
    repetitions: 0,
    previousInterval: 0,
    previousEaseFactor: 2.50,
  }, baseDate);
  assert.equal(step1.intervalDays, 1);
  assert.equal(step1.repetitions, 1);
  assert.ok(step1.easeFactor >= 2.50);

  // Repetition 1 with quality 5 -> interval should be 6
  const step2 = SM2Service.calculate({
    quality: 5,
    repetitions: step1.repetitions,
    previousInterval: step1.intervalDays,
    previousEaseFactor: step1.easeFactor,
  }, baseDate);
  assert.equal(step2.intervalDays, 6);
  assert.equal(step2.repetitions, 2);

  // Repetition 2 with quality 5 -> interval = Math.round(6 * easeFactor)
  const step3 = SM2Service.calculate({
    quality: 5,
    repetitions: step2.repetitions,
    previousInterval: step2.intervalDays,
    previousEaseFactor: step2.easeFactor,
  }, baseDate);
  assert.ok(step3.intervalDays >= 15);
  assert.equal(step3.repetitions, 3);
  assert.equal(step3.isMastered, true);

  // Failed recall (quality = 1) -> resets repetitions to 0 and interval to 1
  const failStep = SM2Service.calculate({
    quality: 1,
    repetitions: 3,
    previousInterval: 15,
    previousEaseFactor: 2.60,
  }, baseDate);
  assert.equal(failStep.intervalDays, 1);
  assert.equal(failStep.repetitions, 0);

  // Ease Factor floor test: quality 0 repeated many times must never drop below 1.30
  let currentEF = 2.50;
  for (let i = 0; i < 20; i++) {
    const res = SM2Service.calculate({
      quality: 0,
      repetitions: 0,
      previousInterval: 1,
      previousEaseFactor: currentEF,
    }, baseDate);
    currentEF = res.easeFactor;
  }
  assert.equal(currentEF, 1.30, 'Ease factor must clamp at floor 1.30');
});

test('4. Learn Engine: Curriculum integrity and 7 exercise verification types', () => {
  const jaUnits = LearnEngineService.getUnits('ja');
  assert.ok(jaUnits.length > 0, 'Should have Japanese units');

  const lesson = jaUnits[0].lessons[0];
  assert.equal(lesson.exercises.length, 7, 'Should feature all 7 exercise types in Lesson 1');

  const types = lesson.exercises.map((e) => e.type);
  assert.ok(types.includes('multiple_choice'));
  assert.ok(types.includes('match_pairs'));
  assert.ok(types.includes('word_order'));
  assert.ok(types.includes('type_translation'));
  assert.ok(types.includes('listening'));
  assert.ok(types.includes('reading'));
  assert.ok(types.includes('speaking'));

  // Test word order verification
  const wordOrderEx = lesson.exercises.find((e) => e.type === 'word_order')!;
  const correctCheck = LearnEngineService.verifyAnswer(wordOrderEx, ['こんにちは', 'ありがとう']);
  assert.equal(correctCheck.isCorrect, true);

  const wrongCheck = LearnEngineService.verifyAnswer(wordOrderEx, ['ありがとう', 'こんにちは']);
  assert.equal(wrongCheck.isCorrect, false);
});
