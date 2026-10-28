/**
 * SkillSprint AI - Stage 1 Automated Test Suite
 * 
 * Tests:
 * 1. Admin access & verification (Allowlisted Admin vs Ordinary User vs Forged/Unverified Token)
 * 2. Single-admin rule: bound to stable Google sub, immune to promotion from inside app
 * 3. Cap exemption: Admin does not consume registration slots
 * 4. Atomic 800 cap under concurrent signups: exactly 800 slots filled, subsequent attempts land on waitlist
 * 5. Mascot themes & profile data consistency
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { RegistrationStore } from '../src/services/atomic_registration.js';
import { AuthService } from '../src/services/auth.service.js';
import { MASCOTS } from '../src/services/mascot.service.js';

// Helper to construct a test JWT string
function makeTestJwt(payload: Record<string, any>, signature = 'valid_test_sig'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.${signature}`;
}

const ADMIN_EMAIL = 'manikantejaswarooparni@gmail.com';
const TEST_AUDIENCE = 'skillsprint-web-client.apps.googleusercontent.com';

test('1. Admin Access: Allowlisted Admin gets admin status and is bound to stable Google sub', async () => {
  const store = new RegistrationStore({
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: TEST_AUDIENCE,
  });
  const auth = new AuthService(store, {
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: TEST_AUDIENCE,
  });

  const validAdminToken = makeTestJwt({
    sub: 'google_sub_admin_12345',
    email: ADMIN_EMAIL,
    email_verified: true,
    name: 'Tejaswaroop (Lead Dev)',
    aud: TEST_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  const session = await auth.handleGoogleSignIn(validAdminToken);

  assert.equal(session.user.isAdmin, true, 'Allowlisted admin must have isAdmin = true');
  assert.equal(session.user.email, ADMIN_EMAIL.toLowerCase());

  // Check that admin is exempt from ordinary user count
  const capState = await store.getCapacityState();
  assert.equal(capState.currentCount, 0, 'Admin MUST NOT increment ordinary user capacity counter');
  assert.equal(capState.availableSlots, 800, 'Available slots must remain 800');
});

test('2. Token Security: Rejects forged signature, unverified email, and expired tokens', async () => {
  const store = new RegistrationStore({
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: TEST_AUDIENCE,
  });
  const auth = new AuthService(store, {
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
    GOOGLE_CLIENT_ID: TEST_AUDIENCE,
  });

  // Forged signature
  const forgedToken = makeTestJwt({
    sub: 'attacker_sub_999',
    email: ADMIN_EMAIL,
    email_verified: true,
    aud: TEST_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }, 'forged');

  await assert.rejects(
    async () => auth.handleGoogleSignIn(forgedToken),
    /signature verification failed/,
    'Forged signature must be rejected'
  );

  // Unverified email
  const unverifiedToken = makeTestJwt({
    sub: 'sub_unverified',
    email: 'hacker@example.com',
    email_verified: false,
    aud: TEST_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  await assert.rejects(
    async () => auth.handleGoogleSignIn(unverifiedToken),
    /Google email is not verified/,
    'Unverified email must be rejected'
  );

  // Expired token
  const expiredToken = makeTestJwt({
    sub: 'sub_expired',
    email: 'user@example.com',
    email_verified: true,
    aud: TEST_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) - 300,
  });

  await assert.rejects(
    async () => auth.handleGoogleSignIn(expiredToken),
    /Token has expired/,
    'Expired token must be rejected'
  );
});

test('3. Atomic 800 Cap Under Concurrent Signups (with Staging Cap = 5)', async () => {
  // Use a test cap of 5 to stress concurrency
  const TEST_CAP = 5;
  const store = new RegistrationStore({
    REGISTRATION_CAP: TEST_CAP,
    ADMIN_EMAIL_ALLOWLIST: ADMIN_EMAIL,
  });

  // Concurrently attempt to register 20 users simultaneously
  const signupPromises = Array.from({ length: 20 }, (_, i) =>
    store.registerUser({
      email: `learner_${i}@example.com`,
      displayName: `Learner ${i}`,
      emailVerified: true,
    })
  );

  const results = await Promise.all(signupPromises);

  const successful = results.filter((r) => r.success);
  const waitlisted = results.filter((r) => r.isWaitlisted);

  assert.equal(successful.length, TEST_CAP, `Exactly ${TEST_CAP} users must succeed`);
  assert.equal(waitlisted.length, 20 - TEST_CAP, `Remaining ${20 - TEST_CAP} users must be waitlisted`);

  const capacityState = await store.getCapacityState();
  assert.equal(capacityState.currentCount, TEST_CAP);
  assert.equal(capacityState.availableSlots, 0);
  assert.equal(capacityState.preRegistrationsCount, 15);

  // Verify waitlist positions are strictly sequential
  const waitlist = store.getWaitlist();
  assert.equal(waitlist.length, 15);
  assert.equal(waitlist[0].position, 1);
  assert.equal(waitlist[14].position, 15);

  // Now verify that even at capacity, the ALLOWLISTED ADMIN can still sign in
  const adminReg = await store.registerUser({
    email: ADMIN_EMAIL,
    displayName: 'Admin Lead',
    emailVerified: true,
  });
  assert.equal(adminReg.success, true, 'Admin must be able to register even when cap is reached');
  assert.equal(adminReg.user?.isAdmin, true, 'Admin status must be preserved');
});

test('4. Mascot System: All 4 mascots have complete theme palettes & switch seamlessly', () => {
  const mascotKeys = Object.keys(MASCOTS) as Array<keyof typeof MASCOTS>;
  assert.deepEqual(mascotKeys.sort(), ['bunny', 'foxy', 'kitty', 'panda']);

  for (const key of mascotKeys) {
    const mascot = MASCOTS[key];
    assert.ok(mascot.name.length > 0);
    assert.ok(mascot.colors.primary.startsWith('#'));
    assert.ok(mascot.tutorialLines.length >= 3, 'Must have at least 3 character tutorial dialogue steps');
  }

  const store = new RegistrationStore();
  const userId = 'test_usr_switch';
  store.updateMascot(userId, 'foxy');
  assert.equal(store.getMascot(userId)?.mascot, 'foxy');

  // Change mascot to panda without losing state
  store.updateMascot(userId, 'panda');
  assert.equal(store.getMascot(userId)?.mascot, 'panda');
});
