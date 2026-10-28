-- ==============================================================================
-- SkillSprint AI - PostgreSQL Schema Migration: 003_stage3_recommendations_and_practice.sql
-- Stage 3: Region-Based Recommendations, Practice Lab, Listening Drill Speeds,
-- Pronunciation Self-Assessment, and Streak Freeze System
-- ==============================================================================

-- 1. Regional Language Recommendations Table
CREATE TABLE IF NOT EXISTS regional_recommendations (
    id VARCHAR(50) PRIMARY KEY,
    region VARCHAR(50) NOT NULL, -- 'south_asia', 'east_asia', 'europe', 'americas', 'middle_east', 'global'
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    priority INT NOT NULL DEFAULT 1,
    badge_label VARCHAR(50) NOT NULL, -- 'Regional Heritage', 'High Commerce', 'Top Career Growth', 'Popular Culture'
    reason_summary TEXT NOT NULL,
    estimated_speakers_millions INT NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'beginner_friendly', 'medium', 'advanced'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO regional_recommendations (id, region, language_code, priority, badge_label, reason_summary, estimated_speakers_millions, difficulty_level)
VALUES
    ('rec_sa_te', 'south_asia', 'te', 1, 'Tech Hub Hub', 'Primary language of Hyderabad & Andhra Pradesh tech corridors; rapid mobile ecosystem growth.', 96, 'medium'),
    ('rec_sa_hi', 'south_asia', 'hi', 2, 'National Lingua Franca', 'Spoken by over 600M across India, government, commerce, and media.', 609, 'beginner_friendly'),
    ('rec_sa_ja', 'south_asia', 'ja', 3, 'Global Career Mobility', 'High bilateral tech exchange, semiconductor partnerships, and engineering visas.', 125, 'advanced'),
    ('rec_ea_ja', 'east_asia', 'ja', 1, 'Regional Innovation', 'Dominant in game design, robotics, and creative arts across East Asia.', 125, 'beginner_friendly'),
    ('rec_ea_ko', 'east_asia', 'ko', 2, 'Cultural Renaissance', 'Global K-entertainment, tech conglomerates (Samsung, LG), and cutting-edge digital culture.', 82, 'medium'),
    ('rec_ea_zh', 'east_asia', 'zh', 3, 'Pan-Asian Commerce', 'Spoken by 1.1 billion people; foundational for Asian trade corridors.', 1120, 'advanced'),
    ('rec_eu_es', 'europe', 'es', 1, 'Global Utility', 'Second most spoken native language on Earth; opens 21 countries.', 595, 'beginner_friendly'),
    ('rec_eu_de', 'europe', 'de', 2, 'Industrial Engine', 'Leading industrial, manufacturing, and research economy in Europe.', 134, 'medium'),
    ('rec_eu_fr', 'europe', 'fr', 3, 'Diplomacy & Arts', 'Official language of international bodies, literature, and culinary arts.', 310, 'medium'),
    ('rec_am_es', 'americas', 'es', 1, 'Domestic & Continental', 'Fastest growing language in North America and dominant throughout Central & South America.', 595, 'beginner_friendly'),
    ('rec_am_ja', 'americas', 'ja', 2, 'High Tech & Gaming', 'Massive cultural adoption, anime conventions, and Japanese entertainment industries.', 125, 'advanced'),
    ('rec_am_fr', 'americas', 'fr', 3, 'Bilingual Heritage', 'Co-official in Canada and strong cultural presence throughout the Caribbean.', 310, 'medium')
ON CONFLICT (id) DO NOTHING;

-- 2. User Streak Freeze System Table (Max 2 Active Freezes)
CREATE TABLE IF NOT EXISTS streak_freeze_inventory (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    active_freezes INT NOT NULL DEFAULT 2, -- max 2
    max_freezes INT NOT NULL DEFAULT 2,
    freezes_used_total INT NOT NULL DEFAULT 0,
    last_freeze_used_at TIMESTAMPTZ,
    last_replenished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Streak Freeze Usage Logs
CREATE TABLE IF NOT EXISTS streak_freeze_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    missed_date DATE NOT NULL,
    saved_streak_count INT NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Practice Lab Sessions (Variable Speeds & Pronunciation Scores)
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    practice_type VARCHAR(50) NOT NULL, -- 'listening_drill', 'pronunciation_assessment', 'grammar_clinic'
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    playback_speed NUMERIC(3,2) NOT NULL DEFAULT 1.00, -- 0.75, 1.00, 1.25
    accuracy_score NUMERIC(5,2), -- 0.00 to 100.00%
    feedback_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_user ON practice_sessions(user_id, created_at DESC);
