-- ==============================================================================
-- SkillSprint AI - PostgreSQL Schema Migration: 001_initial_stage1.sql
-- Stage 1: Auth, Profiles, Mascots, Themes, and Atomic Registration Capacity
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Singleton Capacity Control Table (Atomic Row Locking target)
CREATE TABLE IF NOT EXISTS registration_capacity (
    id INT PRIMARY KEY DEFAULT 1,
    current_count INT NOT NULL DEFAULT 0,
    max_cap INT NOT NULL DEFAULT 800,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT singleton_capacity_row CHECK (id = 1)
);

-- Seed singleton capacity row
INSERT INTO registration_capacity (id, current_count, max_cap, is_paused)
VALUES (1, 0, 800, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    google_sub VARCHAR(255) UNIQUE,
    facebook_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'deleted'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    gender VARCHAR(50), -- 'female', 'male', 'non_binary', 'prefer_not_to_say', or custom
    native_language VARCHAR(10) NOT NULL DEFAULT 'en',
    target_language VARCHAR(10) NOT NULL DEFAULT 'es',
    onboarding_step VARCHAR(50) NOT NULL DEFAULT 'mascot_selection', -- 'mascot_selection', 'tutorial', 'completed'
    xp INT NOT NULL DEFAULT 0,
    streak_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Mascot Preferences Table
CREATE TYPE mascot_name AS ENUM ('foxy', 'bunny', 'panda', 'kitty');

CREATE TABLE IF NOT EXISTS mascot_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    mascot mascot_name NOT NULL DEFAULT 'foxy',
    haptics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sound_effects_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Waitlist Table (when capacity >= 800)
CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    position INT NOT NULL,
    source VARCHAR(50) DEFAULT 'app_signup_gate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(position);

-- 6. Refresh Tokens & Auth Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON auth_sessions(refresh_token_hash);

-- 7. Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at DESC);
