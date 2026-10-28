#!/usr/bin/env bash
# ==============================================================================
# SkillSprint AI - Google Play Store Release Readiness Auditor
# Performs strict validation against Google Play policies and guidelines
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

FAILED=0

echo "=========================================================="
echo "SkillSprint AI: Verifying Google Play Store Release Readiness"
echo "=========================================================="

# Check 1: Target SDK >= 34 in build.gradle
echo -n "[Check 1] Target SDK >= 34: "
if grep -q "targetSdkVersion 34" "${PROJECT_ROOT}/client_flutter/android/app/build.gradle"; then
    echo "✅ PASS (Target SDK 34)"
else
    echo "❌ FAIL (Must be targetSdkVersion 34)"
    FAILED=$((FAILED + 1))
fi

# Check 2: Min SDK >= 24
echo -n "[Check 2] Min SDK >= 24: "
if grep -q "minSdkVersion 24" "${PROJECT_ROOT}/client_flutter/android/app/build.gradle"; then
    echo "✅ PASS (Min SDK 24)"
else
    echo "❌ FAIL (Must be minSdkVersion >= 24)"
    FAILED=$((FAILED + 1))
fi

# Check 3: Application ID com.skillsprint.ai
echo -n "[Check 3] Application ID: "
if grep -q 'applicationId "com.skillsprint.ai"' "${PROJECT_ROOT}/client_flutter/android/app/build.gradle"; then
    echo "✅ PASS (com.skillsprint.ai)"
else
    echo "❌ FAIL (applicationId mismatch)"
    FAILED=$((FAILED + 1))
fi

# Check 4: R8 / ProGuard Shrinking enabled
echo -n "[Check 4] R8 Code & Resource Shrinking: "
if grep -q "minifyEnabled true" "${PROJECT_ROOT}/client_flutter/android/app/build.gradle" && \
   grep -q "shrinkResources true" "${PROJECT_ROOT}/client_flutter/android/app/build.gradle"; then
    echo "✅ PASS (minifyEnabled & shrinkResources enabled)"
else
    echo "❌ FAIL (R8 shrinking must be active)"
    FAILED=$((FAILED + 1))
fi

# Check 5: AndroidManifest Permissions
echo -n "[Check 5] Required Manifest Permissions: "
MANIFEST="${PROJECT_ROOT}/client_flutter/android/app/src/main/AndroidManifest.xml"
REQ_PERMS=("android.permission.INTERNET" "android.permission.RECORD_AUDIO" "android.permission.VIBRATE" "com.android.vending.BILLING" "android.permission.POST_NOTIFICATIONS")
ALL_PERMS_FOUND=true
for perm in "${REQ_PERMS[@]}"; do
    if ! grep -q "$perm" "$MANIFEST"; then
        echo "Missing $perm!"
        ALL_PERMS_FOUND=false
    fi
done
if [ "$ALL_PERMS_FOUND" = true ]; then
    echo "✅ PASS (All 5 permissions verified)"
else
    echo "❌ FAIL (Missing required permissions)"
    FAILED=$((FAILED + 1))
fi

# Check 6: ProGuard Rules Integrity
echo -n "[Check 6] ProGuard Preservations: "
PROGUARD="${PROJECT_ROOT}/client_flutter/android/app/proguard-rules.pro"
if grep -q "com.android.vending.billing" "$PROGUARD" && grep -q "io.flutter" "$PROGUARD"; then
    echo "✅ PASS (Flutter & Billing rules preserved)"
else
    echo "❌ FAIL (ProGuard rules missing critical keeps)"
    FAILED=$((FAILED + 1))
fi

# Check 7: Fastlane Store Metadata Character Limits
echo -n "[Check 7] Store Metadata Character Limits: "
TITLE_LEN=$(wc -m < "${PROJECT_ROOT}/fastlane/metadata/android/en-US/title.txt" | tr -d ' ')
SHORT_DESC_LEN=$(wc -m < "${PROJECT_ROOT}/fastlane/metadata/android/en-US/short_description.txt" | tr -d ' ')
FULL_DESC_LEN=$(wc -m < "${PROJECT_ROOT}/fastlane/metadata/android/en-US/full_description.txt" | tr -d ' ')

if [ "$TITLE_LEN" -le 30 ] && [ "$SHORT_DESC_LEN" -le 80 ] && [ "$FULL_DESC_LEN" -le 4000 ]; then
    echo "✅ PASS (Title: ${TITLE_LEN}/30, Short: ${SHORT_DESC_LEN}/80, Full: ${FULL_DESC_LEN}/4000)"
else
    echo "❌ FAIL (Metadata exceeded character limits)"
    FAILED=$((FAILED + 1))
fi

# Check 8: Zero Competitor Mentions (Duolingo)
echo -n "[Check 8] Strict Anti-Brand / Competitor Rule: "
BRAND_MENTIONS=$(grep -ri "duolingo" "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/backend" "${PROJECT_ROOT}/fastlane" "${PROJECT_ROOT}/public" "${PROJECT_ROOT}/client_flutter" 2>/dev/null || true)
if [ -z "$BRAND_MENTIONS" ]; then
    echo "✅ PASS (0 competitor brand mentions)"
else
    echo "❌ FAIL (Competitor mentions found!)"
    FAILED=$((FAILED + 1))
fi

# Check 9: Google Play Policy Compliance Documents
echo -n "[Check 9] Privacy Policy & Terms of Service: "
if [ -f "${PROJECT_ROOT}/public/privacy.html" ] && [ -f "${PROJECT_ROOT}/public/terms.html" ]; then
    echo "✅ PASS (privacy.html and terms.html exist)"
else
    echo "❌ FAIL (Missing policy documents)"
    FAILED=$((FAILED + 1))
fi

echo "=========================================================="
if [ "$FAILED" -eq 0 ]; then
    echo "🎉 ALL 9 AUDIT CHECKS PASSED: READY FOR PLAY CONSOLE SUBMISSION!"
    exit 0
else
    echo "❌ AUDIT FAILED with $FAILED errors."
    exit 1
fi
