/**
 * SkillSprint AI - Subscription & Entitlement Service (Stage 5)
 * 
 * Features:
 * 1. Product Catalog:
 *    - 'skillsprint_pro_monthly' ($7.99/month)
 *    - 'skillsprint_pro_annual' ($59.99/year - 37% savings)
 * 2. Google Play Billing In-App Purchase (IAP) Verification:
 *    - Validates purchase token and package name
 *    - Sets expiration dates (30 days for monthly, 365 days for annual)
 * 3. Feature Entitlements & Paywalls:
 *    - Free Tier Limits:
 *      * Max 10 translations / day
 *      * Max 2 SM-2 flashcard reviews / day
 *      * Max 1 roleplay scenario / day
 *      * Standard 1.0x playback speed only
 *      * No offline audio caching
 *    - Pro Tier:
 *      * Unlimited translations
 *      * Unlimited SM-2 flashcards
 *      * All conversational roleplay scenarios unlocked
 *      * Variable playback speeds (0.75x, 1.0x, 1.25x)
 *      * High-fidelity neural voice synthesis
 *      * Ad-free, priority queue
 */

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionProvider = 'google_play' | 'stripe' | 'milestone_reward';

export interface SubscriptionPlan {
  productId: string;
  name: string;
  priceUsd: number;
  interval: 'month' | 'year';
  description: string;
  savingsBadge?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  provider: SubscriptionProvider;
  productId: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  orderId: string;
  purchaseToken: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  tier: SubscriptionTier;
  reason?: string;
  upgradePrompt?: {
    title: string;
    description: string;
    recommendedPlan: string;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  skillsprint_pro_monthly: {
    productId: 'skillsprint_pro_monthly',
    name: 'SkillSprint Pro Monthly',
    priceUsd: 7.99,
    interval: 'month',
    description: 'Unlimited AI translation sprints, all roleplays, and fast pronunciation coaching.',
  },
  skillsprint_pro_annual: {
    productId: 'skillsprint_pro_annual',
    name: 'SkillSprint Pro Annual',
    priceUsd: 59.99,
    interval: 'year',
    description: 'Billed annually ($4.99/mo). Best value for dedicated multilingual fluency.',
    savingsBadge: 'Save 37%',
  },
};

export class SubscriptionService {
  private static subscriptions: Map<string, UserSubscription> = new Map(); // userId -> Subscription
  private static dailyUsage: Map<string, { translations: number; sm2Reviews: number; roleplays: number; date: string }> = new Map();

  /**
   * Reset store (for testing)
   */
  public static resetStore(): void {
    this.subscriptions.clear();
    this.dailyUsage.clear();
  }

  /**
   * Get current active subscription for a user
   */
  public static getSubscription(userId: string): UserSubscription | null {
    const sub = this.subscriptions.get(userId);
    if (!sub) return null;

    // Check expiration
    if (new Date(sub.currentPeriodEnd) < new Date()) {
      sub.status = 'expired';
      sub.tier = 'free';
    }

    return sub;
  }

  /**
   * Verify Google Play Billing Purchase Token
   * Simulates the Google Play Developer API server-side token validation
   */
  public static verifyGooglePlayPurchase(params: {
    userId: string;
    productId: string;
    purchaseToken: string;
    orderId: string;
    packageName?: string;
  }): UserSubscription {
    const { userId, productId, purchaseToken, orderId, packageName = 'com.skillsprint.ai' } = params;

    // Verification sanity checks
    if (!purchaseToken || purchaseToken.length < 10) {
      throw new Error('INVALID_PURCHASE_TOKEN: Invalid Google Play receipt token.');
    }
    if (!productId || !SUBSCRIPTION_PLANS[productId]) {
      throw new Error(`UNKNOWN_PRODUCT_ID: Product ${productId} not found in Google Play Console catalog.`);
    }
    if (packageName !== 'com.skillsprint.ai') {
      throw new Error('SECURITY_VIOLATION: Package name does not match registered application.');
    }

    const plan = SUBSCRIPTION_PLANS[productId];
    const durationDays = plan.interval === 'year' ? 365 : 30;

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription: UserSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      provider: 'google_play',
      productId,
      tier: 'pro',
      status: 'active',
      orderId: orderId || `GPA.${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseToken,
      currentPeriodStart: startDate.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
      autoRenew: true,
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Grant a free promotional Pro Pass (e.g. from Spin Wheel or Referral milestone)
   */
  public static grantProPass(userId: string, durationDays: number): UserSubscription {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription: UserSubscription = {
      id: `sub_reward_${Date.now()}`,
      userId,
      provider: 'milestone_reward',
      productId: 'skillsprint_pro_reward_pass',
      tier: 'pro',
      status: 'active',
      orderId: `REWARD-${durationDays}D`,
      purchaseToken: 'milestone_reward_pass_token',
      currentPeriodStart: startDate.toISOString(),
      currentPeriodEnd: endDate.toISOString(),
      autoRenew: false,
    };

    this.subscriptions.set(userId, subscription);
    return subscription;
  }

  /**
   * Check feature entitlement against user tier and daily consumption caps
   */
  public static checkFeatureEntitlement(
    userId: string,
    feature: 'translation' | 'sm2_review' | 'variable_speed' | 'advanced_roleplay' | 'offline_audio'
  ): EntitlementCheckResult {
    const sub = this.getSubscription(userId);
    const isPro = sub?.status === 'active' && sub?.tier === 'pro';

    if (isPro) {
      return { allowed: true, tier: 'pro' };
    }

    // Free tier feature gating
    const today = new Date().toISOString().split('T')[0];
    const usage = this.dailyUsage.get(userId) || { translations: 0, sm2Reviews: 0, roleplays: 0, date: today };

    // Reset daily counters if day rolled over
    if (usage.date !== today) {
      usage.translations = 0;
      usage.sm2Reviews = 0;
      usage.roleplays = 0;
      usage.date = today;
      this.dailyUsage.set(userId, usage);
    }

    switch (feature) {
      case 'translation':
        if (usage.translations >= 10) {
          return {
            allowed: false,
            tier: 'free',
            reason: 'Free tier limit reached (10 translations/day). Upgrade to Pro for unlimited AI translations.',
            upgradePrompt: {
              title: 'Unlock Unlimited Translations',
              description: 'Never pause your curiosity. Pro members get infinite real-time translations & romanisations.',
              recommendedPlan: 'skillsprint_pro_monthly',
            },
          };
        }
        usage.translations++;
        this.dailyUsage.set(userId, usage);
        return { allowed: true, tier: 'free' };

      case 'sm2_review':
        if (usage.sm2Reviews >= 2) {
          return {
            allowed: false,
            tier: 'free',
            reason: 'Daily free review cap reached (2 flashcards/day). Upgrade to Pro to clear your full Spaced Repetition queue.',
            upgradePrompt: {
              title: 'Master Your Vocabulary Faster',
              description: 'Clear backlogged SRS queues and achieve permanent memory retention with Pro.',
              recommendedPlan: 'skillsprint_pro_monthly',
            },
          };
        }
        usage.sm2Reviews++;
        this.dailyUsage.set(userId, usage);
        return { allowed: true, tier: 'free' };

      case 'variable_speed':
        return {
          allowed: false,
          tier: 'free',
          reason: 'Variable audio speeds (0.75x slow & 1.25x native) are exclusive to SkillSprint Pro.',
          upgradePrompt: {
            title: 'Listen at Your Own Speed',
            description: 'Slow down intricate phonemes or speed up for native listening mastery.',
            recommendedPlan: 'skillsprint_pro_annual',
          },
        };

      case 'offline_audio':
        return {
          allowed: false,
          tier: 'free',
          reason: 'Offline audio caching requires an active SkillSprint Pro subscription.',
          upgradePrompt: {
            title: 'Learn Anywhere, Even Offline',
            description: 'Download audio lessons and practice without consuming mobile data.',
            recommendedPlan: 'skillsprint_pro_annual',
          },
        };

      case 'advanced_roleplay':
        if (usage.roleplays >= 1) {
          return {
            allowed: false,
            tier: 'free',
            reason: 'Free tier gives 1 roleplay sprint per day. Upgrade to Pro for unlimited multi-turn dialogues.',
            upgradePrompt: {
              title: 'Converse Freely with Mascots',
              description: 'Access all job interviews, boutique hotel check-ins, and street conversations unlimited.',
              recommendedPlan: 'skillsprint_pro_monthly',
            },
          };
        }
        usage.roleplays++;
        this.dailyUsage.set(userId, usage);
        return { allowed: true, tier: 'free' };

      default:
        return { allowed: true, tier: 'free' };
    }
  }
}
