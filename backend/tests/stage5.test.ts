/**
 * SkillSprint AI - Stage 5 Unit & Integration Tests
 * Stage 5: Referral Engine with Anti-Abuse, Milestone Spin Wheel, and Google Play Subscriptions
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReferralService, SPIN_WHEEL_SECTORS } from '../src/services/referral.service.js';
import { SubscriptionService, SUBSCRIPTION_PLANS } from '../src/services/subscription.service.js';

beforeEach(() => {
  ReferralService.resetStore();
  SubscriptionService.resetStore();
});

test('1. Referral Code Generation: Generates unique formatted codes for learners', () => {
  const code1 = ReferralService.getOrCreateReferralCode('user_alpha', 'fox');
  assert.ok(code1.startsWith('SPRINT-FOX-'), 'Code should follow SPRINT-FOX-XXXXX convention');

  // Idempotency: same user gets identical code
  const code2 = ReferralService.getOrCreateReferralCode('user_alpha', 'fox');
  assert.equal(code1, code2);

  // Different user gets different code
  const codePanda = ReferralService.getOrCreateReferralCode('user_beta', 'panda');
  assert.ok(codePanda.startsWith('SPRINT-PANDA-'));
  assert.notEqual(code1, codePanda);
});

test('2. Anti-Abuse: Rejects self-referrals and duplicate referees', () => {
  const code = ReferralService.getOrCreateReferralCode('referrer_user_1', 'fox');

  // Attempt self-referral
  assert.throws(
    () => {
      ReferralService.registerReferral({
        referrerId: 'referrer_user_1',
        referralCode: code,
        refereeId: 'referrer_user_1', // same ID!
      });
    },
    /ANTI_ABUSE_ERROR/,
    'Should strictly forbid referring oneself'
  );

  // Valid first referral
  const validRef = ReferralService.registerReferral({
    referrerId: 'referrer_user_1',
    referralCode: code,
    refereeId: 'referee_user_1',
    refereePhone: '+15551112222',
  });
  assert.equal(validRef.status, 'pending');

  // Duplicate referee attempt
  assert.throws(
    () => {
      ReferralService.registerReferral({
        referrerId: 'referrer_user_2',
        referralCode: 'SPRINT-PANDA-999',
        refereeId: 'referee_user_1', // already referred!
        refereePhone: '+15559998888',
      });
    },
    /DUPLICATE_REFEREE_ERROR/,
    'Should reject duplicate referee registrations'
  );
});

test('3. Verification Flow: Transitions from pending to phone_verified or paid_conversion', () => {
  const ref = ReferralService.registerReferral({
    referrerId: 'referrer_123',
    referralCode: 'SPRINT-OWL-101',
    refereeId: 'new_student_456',
    refereePhone: '+15553334444',
  });

  assert.equal(ref.status, 'pending');

  // Invalid OTP test
  assert.throws(
    () => ReferralService.verifyReferralViaOtp(ref.id, '000000'),
    /INVALID_OTP/
  );

  // Valid OTP test
  const verifiedRef = ReferralService.verifyReferralViaOtp(ref.id, '123456');
  assert.equal(verifiedRef.status, 'phone_verified');
  assert.equal(verifiedRef.conversionType, 'phone_otp');
  assert.ok(verifiedRef.verifiedAt);

  // Test Paid Conversion Route for another referee
  const ref2 = ReferralService.registerReferral({
    referrerId: 'referrer_123',
    referralCode: 'SPRINT-OWL-101',
    refereeId: 'paid_student_789',
    refereePhone: '+15557778888',
  });

  const converted = ReferralService.verifyReferralViaPaidConversion('paid_student_789');
  assert.ok(converted !== null);
  assert.equal(converted?.status, 'paid_conversion');
  assert.equal(converted?.conversionType, 'subscription_purchase');
});

test('4. Milestone Tiers & Spin Tokens: Unlocks at exactly 5, 10, and 20 verified referrals', () => {
  const referrerId = 'top_ambassador_1';

  // 0 verified
  let progress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(progress.verifiedCount, 0);
  assert.equal(progress.spinsAvailable, 0);
  assert.equal(progress.nextMilestone, 5);

  // Seed 4 verified (just below Tier 1)
  ReferralService.seedMockReferrals(referrerId, 4, 'phone_verified');
  progress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(progress.verifiedCount, 4);
  assert.equal(progress.spinsAvailable, 0);
  assert.equal(progress.nextMilestone, 5);

  // Add 1 more -> reaches 5 (Tier 1 unlocked!)
  ReferralService.seedMockReferrals(referrerId, 1, 'phone_verified');
  progress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(progress.verifiedCount, 5);
  assert.deepEqual(progress.unlockedTiers, [5]);
  assert.equal(progress.spinsAvailable, 1, 'Should award 1 spin token for milestone 5');
  assert.equal(progress.nextMilestone, 10);

  // Reach 10 (Tier 2 unlocked!)
  ReferralService.seedMockReferrals(referrerId, 5, 'phone_verified');
  progress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(progress.verifiedCount, 10);
  assert.deepEqual(progress.unlockedTiers, [5, 10]);
  assert.equal(progress.spinsAvailable, 2);
  assert.equal(progress.nextMilestone, 20);

  // Reach 20 (All 3 Tiers unlocked!)
  ReferralService.seedMockReferrals(referrerId, 10, 'paid_conversion');
  progress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(progress.verifiedCount, 20);
  assert.deepEqual(progress.unlockedTiers, [5, 10, 20]);
  assert.equal(progress.spinsAvailable, 3);
  assert.equal(progress.nextMilestone, null);
});

test('5. Spin Wheel Engine: Consumes tokens, calculates angle, and grants sector prize', () => {
  const referrerId = 'spinner_user_7';
  ReferralService.seedMockReferrals(referrerId, 5, 'phone_verified');

  // Verify spin available
  const initialProgress = ReferralService.getMilestoneProgress(referrerId);
  assert.equal(initialProgress.spinsAvailable, 1);

  // Spin wheel targeting 'pro_7d' sector
  const spinResult = ReferralService.executeSpinWheel(referrerId, 'pro_7d');
  assert.equal(spinResult.sector.id, 'pro_7d');
  assert.equal(spinResult.sector.title, '1 Week Pro Pass');
  assert.equal(spinResult.remainingSpins, 0);
  assert.ok(spinResult.rotationDegrees >= 1800, 'Should spin at least 5 complete rotations');

  // Attempting to spin with 0 tokens left must throw
  assert.throws(
    () => ReferralService.executeSpinWheel(referrerId),
    /NO_SPINS_AVAILABLE/
  );
});

test('6. Google Play Billing Verification: Validates receipt token, sets start/end dates', () => {
  const userId = 'android_learner_99';
  const orderId = 'GPA.1234-5678-9012';
  const purchaseToken = 'gplay_token_xyz_987654321';

  // Security check: Reject invalid product
  assert.throws(
    () => {
      SubscriptionService.verifyGooglePlayPurchase({
        userId,
        productId: 'fake_product_id',
        purchaseToken,
        orderId,
      });
    },
    /UNKNOWN_PRODUCT_ID/
  );

  // Verify valid Monthly subscription ($7.99/mo)
  const monthlySub = SubscriptionService.verifyGooglePlayPurchase({
    userId,
    productId: 'skillsprint_pro_monthly',
    purchaseToken,
    orderId,
  });

  assert.equal(monthlySub.tier, 'pro');
  assert.equal(monthlySub.status, 'active');
  assert.equal(monthlySub.provider, 'google_play');
  assert.equal(monthlySub.autoRenew, true);

  // Verify 30-day duration
  const start = new Date(monthlySub.currentPeriodStart).getTime();
  const end = new Date(monthlySub.currentPeriodEnd).getTime();
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 30);

  // Check stored active subscription
  const fetched = SubscriptionService.getSubscription(userId);
  assert.equal(fetched?.id, monthlySub.id);
  assert.equal(fetched?.tier, 'pro');
});

test('7. Entitlement System: Enforces Free tier daily limits vs Pro unlimited privileges', () => {
  const freeUserId = 'free_learner_1';
  const proUserId = 'pro_learner_2';

  // Set up Pro user
  SubscriptionService.verifyGooglePlayPurchase({
    userId: proUserId,
    productId: 'skillsprint_pro_annual',
    purchaseToken: 'play_token_annual_verified',
    orderId: 'GPA.8888-9999-0000',
  });

  // 1. Variable Audio Speed Entitlement
  const freeSpeedCheck = SubscriptionService.checkFeatureEntitlement(freeUserId, 'variable_speed');
  assert.equal(freeSpeedCheck.allowed, false, 'Free users should not access variable playback speeds');
  assert.ok(freeSpeedCheck.upgradePrompt);

  const proSpeedCheck = SubscriptionService.checkFeatureEntitlement(proUserId, 'variable_speed');
  assert.equal(proSpeedCheck.allowed, true, 'Pro users have unlimited variable playback speeds');

  // 2. Translation Daily Limit Check (10 max for free)
  for (let i = 1; i <= 10; i++) {
    const check = SubscriptionService.checkFeatureEntitlement(freeUserId, 'translation');
    assert.equal(check.allowed, true, `Translation #${i} should be allowed on free tier`);
  }
  // 11th translation on free tier should be blocked
  const blockedCheck = SubscriptionService.checkFeatureEntitlement(freeUserId, 'translation');
  assert.equal(blockedCheck.allowed, false);
  assert.ok(blockedCheck.reason?.includes('Free tier limit reached'));

  // Pro user has no limit
  for (let i = 1; i <= 25; i++) {
    const proCheck = SubscriptionService.checkFeatureEntitlement(proUserId, 'translation');
    assert.equal(proCheck.allowed, true);
  }

  // 3. Promotional Reward Pass Grant
  SubscriptionService.grantProPass(freeUserId, 7);
  const grantedCheck = SubscriptionService.checkFeatureEntitlement(freeUserId, 'variable_speed');
  assert.equal(grantedCheck.allowed, true, 'Granted 7-day Pro pass should grant full Pro features');
});
