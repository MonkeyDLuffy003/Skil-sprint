/**
 * SkillSprint AI - Stage 6 Unit & Integration Tests
 * Stage 6: Android App Bundle (.aab), Release Keystore, ProGuard/R8, and Google Play Store Readiness
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'client_flutter/android');
const APP_DIR = path.join(ANDROID_DIR, 'app');
const FASTLANE_DIR = path.join(PROJECT_ROOT, 'fastlane/metadata/android/en-US');

test('1. Gradle Build Configuration: Validates Target SDK 34, Min SDK 24, and R8 shrinking', () => {
  const buildGradlePath = path.join(APP_DIR, 'build.gradle');
  assert.ok(fs.existsSync(buildGradlePath), 'app/build.gradle must exist');

  const content = fs.readFileSync(buildGradlePath, 'utf8');

  // Verify SDK versions
  assert.match(content, /compileSdkVersion\s+34/, 'compileSdkVersion must be 34');
  assert.match(content, /targetSdkVersion\s+34/, 'targetSdkVersion must be 34 (Android 14 requirement)');
  assert.match(content, /minSdkVersion\s+24/, 'minSdkVersion must be 24 (Android 7.0+)');
  assert.match(content, /applicationId\s+["']com\.skillsprint\.ai["']/, 'applicationId must be com.skillsprint.ai');

  // Verify R8 Shrinking & Proguard
  assert.match(content, /minifyEnabled\s+true/, 'Release build must enable R8 code minification');
  assert.match(content, /shrinkResources\s+true/, 'Release build must enable resource shrinking');
  assert.match(content, /proguardFiles/, 'Release build must reference ProGuard rules');

  // Verify Billing Client Dependency
  assert.match(content, /com\.android\.billingclient:billing:6/, 'Must include Google Play Billing Client 6.x+');
});

test('2. Android Manifest: Required permissions and deep link intent filters', () => {
  const manifestPath = path.join(APP_DIR, 'src/main/AndroidManifest.xml');
  assert.ok(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');

  const manifest = fs.readFileSync(manifestPath, 'utf8');

  // Check required permissions
  const requiredPermissions = [
    'android.permission.INTERNET',
    'android.permission.RECORD_AUDIO',
    'android.permission.VIBRATE',
    'com.android.vending.BILLING',
    'android.permission.POST_NOTIFICATIONS',
  ];

  for (const perm of requiredPermissions) {
    assert.ok(
      manifest.includes(perm),
      `AndroidManifest.xml must declare ${perm}`
    );
  }

  // Check Application Package & Label
  assert.match(manifest, /package="com\.skillsprint\.ai"/);
  assert.match(manifest, /android:label="SkillSprint AI"/);

  // Check Referral Deep Link Schema (skillsprint://referral)
  assert.match(manifest, /android:scheme="skillsprint"/);
  assert.match(manifest, /android:host="referral"/);
});

test('3. ProGuard / R8 Rules: Preserves Flutter engine and Google Play Billing', () => {
  const proguardPath = path.join(APP_DIR, 'proguard-rules.pro');
  assert.ok(fs.existsSync(proguardPath), 'proguard-rules.pro must exist');

  const rules = fs.readFileSync(proguardPath, 'utf8');

  // Flutter Channel bindings
  assert.match(rules, /-keep class io\.flutter\.\*\*/, 'Must preserve Flutter classes');
  assert.match(rules, /MethodChannel\$MethodCallHandler/, 'Must preserve Flutter method channels');

  // Google Play Billing
  assert.match(rules, /-keep class com\.android\.vending\.billing\.\*\*/, 'Must preserve Play Billing vendor classes');
  assert.match(rules, /-keep class com\.android\.billingclient\.api\.\*\*/, 'Must preserve BillingClient API');

  // De-obfuscation mapping preservation
  assert.match(rules, /-keepattributes SourceFile,LineNumberTable/, 'Must keep LineNumberTable for Play Console stacktraces');
});

test('4. Fastlane Play Store Listing: Character limits and copy integrity', () => {
  const titlePath = path.join(FASTLANE_DIR, 'title.txt');
  const shortDescPath = path.join(FASTLANE_DIR, 'short_description.txt');
  const fullDescPath = path.join(FASTLANE_DIR, 'full_description.txt');
  const privacyUrlPath = path.join(FASTLANE_DIR, 'privacy_policy_url.txt');

  assert.ok(fs.existsSync(titlePath), 'title.txt must exist');
  assert.ok(fs.existsSync(shortDescPath), 'short_description.txt must exist');
  assert.ok(fs.existsSync(fullDescPath), 'full_description.txt must exist');
  assert.ok(fs.existsSync(privacyUrlPath), 'privacy_policy_url.txt must exist');

  const title = fs.readFileSync(titlePath, 'utf8').trim();
  const shortDesc = fs.readFileSync(shortDescPath, 'utf8').trim();
  const fullDesc = fs.readFileSync(fullDescPath, 'utf8').trim();
  const privacyUrl = fs.readFileSync(privacyUrlPath, 'utf8').trim();

  // Google Play Character limits:
  // Title: max 30 characters
  // Short Description: max 80 characters
  // Full Description: max 4000 characters
  assert.ok(title.length <= 30, `Title "${title}" length (${title.length}) exceeds 30 chars`);
  assert.ok(title.length >= 5, 'Title must not be empty');

  assert.ok(shortDesc.length <= 80, `Short description length (${shortDesc.length}) exceeds 80 chars`);
  assert.ok(shortDesc.length >= 10, 'Short description must be descriptive');

  assert.ok(fullDesc.length <= 4000, `Full description length (${fullDesc.length}) exceeds 4000 chars`);
  assert.ok(fullDesc.length >= 200, 'Full description must be detailed');

  // Content requirements: Mascots, SM-2 SRS, Pronunciation, Roleplay
  assert.match(fullDesc, /Kaito/);
  assert.match(fullDesc, /Hina/);
  assert.match(fullDesc, /Luna/);
  assert.match(fullDesc, /Felix/);
  assert.match(fullDesc, /SM-2/);
  assert.match(fullDesc, /Pronunciation/);
  assert.match(fullDesc, /Spin Wheel/);

  assert.ok(privacyUrl.startsWith('https://'), 'Privacy policy URL must be valid HTTPS');
});

test('5. Anti-Brand Compliance: Strictly zero competitor brand mentions ("Duolingo")', () => {
  const scanDirs = ['fastlane', 'public', 'backend/src', 'client_flutter/android', 'src'];
  const forbidden = /duolingo/i;

  for (const dir of scanDirs) {
    const fullDirPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDirPath)) continue;

    const files = fs.readdirSync(fullDirPath, { recursive: true }) as string[];
    for (const f of files) {
      const filePath = path.join(fullDirPath, f);
      if (fs.statSync(filePath).isFile()) {
        const text = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          !forbidden.test(text),
          `Forbidden competitor brand found in ${filePath}!`
        );
      }
    }
  }
});

test('6. Release Keystore & Bundle Artifact: Verifies signing configs and .aab file', () => {
  const keyPropsPath = path.join(ANDROID_DIR, 'key.properties');
  assert.ok(fs.existsSync(keyPropsPath), 'key.properties must exist');

  const keyProps = fs.readFileSync(keyPropsPath, 'utf8');
  assert.match(keyProps, /keyAlias=skillsprint_release/);
  assert.match(keyProps, /storeFile=\.\.\/keystore\/skillsprint_release\.jks/);

  // App bundle output verification
  const aabPath = path.join(PROJECT_ROOT, 'client_flutter/build/app/outputs/bundle/release/app-release.aab');
  assert.ok(fs.existsSync(aabPath), 'app-release.aab must be generated');

  const stats = fs.statSync(aabPath);
  assert.ok(stats.size > 0, 'AAB file size must be greater than 0 bytes');
});

test('7. Play Store Policy Compliance: Privacy policy and Terms of Service disclosures', () => {
  const privacyPath = path.join(PROJECT_ROOT, 'public/privacy.html');
  const termsPath = path.join(PROJECT_ROOT, 'public/terms.html');

  assert.ok(fs.existsSync(privacyPath), 'public/privacy.html must exist');
  assert.ok(fs.existsSync(termsPath), 'public/terms.html must exist');

  const privacyHtml = fs.readFileSync(privacyPath, 'utf8');
  const termsHtml = fs.readFileSync(termsPath, 'utf8');

  // Privacy Policy: Data Safety, Audio ephemeral treatment, and Account Deletion
  assert.match(privacyHtml, /Data Safety/i);
  assert.match(privacyHtml, /Pronunciation Lab/i);
  assert.match(privacyHtml, /Account Deletion/i);
  assert.match(privacyHtml, /TLS 1\.3/);

  // Terms of Service: Subscription cancellation and renewal rules
  assert.match(termsHtml, /Google Play/i);
  assert.match(termsHtml, /Auto-Renewal/i);
  assert.match(termsHtml, /Cancellation/i);
  assert.match(termsHtml, /Anti-Abuse/i);
});
