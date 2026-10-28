/**
 * SkillSprint AI - Backend REST API Server (Stage 1)
 * Framework: Fastify / Express with TypeScript
 */

import express, { Request, Response, NextFunction } from 'express';
import { loadConfig, isAllowlistedAdmin } from './config/env.js';
import { defaultRegistrationStore } from './services/atomic_registration.js';
import { AuthService } from './services/auth.service.js';
import { MASCOTS, MascotId } from './services/mascot.service.js';
import { ReferralService } from './services/referral.service.js';
import { SubscriptionService } from './services/subscription.service.js';

const config = loadConfig();
const app = express();
const authService = new AuthService(defaultRegistrationStore, config);

app.use(express.json());

// CORS & Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'skillsprint-api',
    stage: 1,
  });
});

// Public Capacity & Platform Stats
app.get('/api/stats', async (req: Request, res: Response) => {
  const cap = await defaultRegistrationStore.getCapacityState();
  res.json({
    availableSlots: cap.availableSlots,
    maxCap: cap.maxCap,
    isPaused: cap.isPaused,
    totalUsersCount: cap.totalUsersCount,
    preRegistrationsCount: cap.preRegistrationsCount,
  });
});

// Mascots List & Themes
app.get('/api/mascots', (req: Request, res: Response) => {
  res.json(MASCOTS);
});

// Google Authentication Endpoint
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'Missing idToken in request body' });
  }

  try {
    const session = await authService.handleGoogleSignIn(idToken);
    return res.json(session);
  } catch (err: any) {
    if (err.code === 'CAPACITY_REACHED') {
      return res.status(429).json({
        error: 'CAPACITY_REACHED',
        message: err.message,
        waitlistPosition: err.waitlistPosition,
      });
    }
    return res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

// Email Sign Up Endpoint (New Learners)
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const session = await authService.handleEmailSignUp(email, password, displayName || 'Learner');
    return res.json(session);
  } catch (err: any) {
    if (err.code === 'CAPACITY_REACHED') {
      return res.status(429).json({
        error: 'CAPACITY_REACHED',
        message: err.message,
        waitlistPosition: err.waitlistPosition,
      });
    }
    return res.status(400).json({ error: err.message || 'Sign up failed' });
  }
});

// Email Log In Endpoint (Returning Learners)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const session = await authService.handleEmailLogin(email, password);
    return res.json(session);
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
});

// Update Mascot Preference
app.post('/api/user/mascot', (req: Request, res: Response) => {
  const { userId, mascot } = req.body;
  if (!userId || !mascot || !MASCOTS[mascot as MascotId]) {
    return res.status(400).json({ error: 'Invalid userId or mascot ID' });
  }

  try {
    const updated = defaultRegistrationStore.updateMascot(userId, mascot as MascotId);
    return res.json({ success: true, preference: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Developer Dashboard (Strict Admin Only)
app.get('/api/admin/metrics', async (req: Request, res: Response) => {
  const adminEmail = (req.headers['x-admin-email'] as string) || '';

  if (!isAllowlistedAdmin(adminEmail, config.ADMIN_EMAIL_ALLOWLIST)) {
    return res.status(403).json({ error: 'Forbidden: Strictly restricted to verified developer.' });
  }

  const capacityState = await defaultRegistrationStore.getCapacityState();
  const waitlist = defaultRegistrationStore.getWaitlist();

  res.json({
    metrics: capacityState,
    waitlistQueue: waitlist.slice(0, 50),
    serverTime: new Date().toISOString(),
  });
});

// ================= STAGE 5: REFERRALS & SUBSCRIPTIONS ================= //

// Get or Create Referral Code
app.get('/api/referrals/code', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'guest';
  const mascot = (req.query.mascot as string) || 'fox';
  const code = ReferralService.getOrCreateReferralCode(userId, mascot);
  return res.json({ referralCode: code });
});

// Milestone Progress & Spin Tokens Available
app.get('/api/referrals/progress', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'guest';
  const progress = ReferralService.getMilestoneProgress(userId);
  return res.json(progress);
});

// Register a Referral
app.post('/api/referrals/register', (req: Request, res: Response) => {
  const { referrerId, referralCode, refereeId, refereePhone, refereeEmail } = req.body;
  if (!referrerId || !referralCode || !refereeId) {
    return res.status(400).json({ error: 'Missing referrerId, referralCode, or refereeId' });
  }

  try {
    const record = ReferralService.registerReferral({
      referrerId,
      referralCode,
      refereeId,
      refereePhone,
      refereeEmail,
      clientIp: req.ip,
    });
    return res.json({ success: true, referral: record });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Verify Phone OTP (Anti-Abuse)
app.post('/api/referrals/verify-otp', (req: Request, res: Response) => {
  const { referralId, otpCode } = req.body;
  if (!referralId || !otpCode) {
    return res.status(400).json({ error: 'Missing referralId or otpCode' });
  }

  try {
    const record = ReferralService.verifyReferralViaOtp(referralId, otpCode);
    return res.json({ success: true, referral: record });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Execute Spin Wheel
app.post('/api/referrals/spin', (req: Request, res: Response) => {
  const { userId, targetSectorId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const spinResult = ReferralService.executeSpinWheel(userId, targetSectorId);
    return res.json(spinResult);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Google Play Billing Verification
app.post('/api/subscriptions/verify-play-purchase', (req: Request, res: Response) => {
  const { userId, productId, purchaseToken, orderId } = req.body;
  if (!userId || !productId || !purchaseToken) {
    return res.status(400).json({ error: 'Missing userId, productId, or purchaseToken' });
  }

  try {
    const sub = SubscriptionService.verifyGooglePlayPurchase({
      userId,
      productId,
      purchaseToken,
      orderId: orderId || `GPA.${Date.now()}`,
      packageName: 'com.skillsprint.ai',
    });
    return res.json({ success: true, subscription: sub });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Feature Entitlement Check
app.get('/api/subscriptions/entitlements', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'guest';
  const feature = (req.query.feature as any) || 'translation';
  const result = SubscriptionService.checkFeatureEntitlement(userId, feature);
  return res.json(result);
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.BACKEND_PORT || 4000;
  app.listen(PORT, () => {
    console.log(`[SkillSprint Backend] Running on port ${PORT}`);
  });
}
