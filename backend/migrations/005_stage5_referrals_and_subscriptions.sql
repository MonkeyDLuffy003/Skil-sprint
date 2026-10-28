-- SkillSprint AI Database Migration
-- Stage 5: Referral Engine with Anti-Abuse, Milestone Spin Wheel, and Google Play Subscriptions

-- 1. Referral Codes and Records
CREATE TABLE IF NOT EXISTS user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(32) NOT NULL,
    referee_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'phone_verified', 'paid_conversion', 'rejected'
    conversion_type VARCHAR(20), -- 'phone_otp', 'subscription_purchase'
    reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    fraud_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON user_referrals(referral_code);

-- 2. Milestone Spin Wheel Rewards
CREATE TABLE IF NOT EXISTS spin_wheel_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_tier INT NOT NULL, -- 5, 10, 20
    sector_id VARCHAR(50) NOT NULL,
    reward_title VARCHAR(100) NOT NULL,
    reward_type VARCHAR(30) NOT NULL, -- 'xp', 'streak_freeze', 'pro_pass', 'mascot_skin'
    reward_value INT NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT TRUE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_rewards_user ON spin_wheel_rewards(user_id);

-- 3. Subscriptions (Google Play & Web)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL, -- 'google_play', 'stripe', 'milestone_reward'
    product_id VARCHAR(100) NOT NULL, -- 'skillsprint_pro_monthly', 'skillsprint_pro_annual', 'lifetime_vip'
    purchase_token TEXT,
    order_id VARCHAR(100),
    tier VARCHAR(20) NOT NULL DEFAULT 'pro', -- 'free', 'pro'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'grace_period', 'cancelled', 'expired'
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
