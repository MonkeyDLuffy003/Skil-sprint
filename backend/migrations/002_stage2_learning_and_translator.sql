-- ==============================================================================
-- SkillSprint AI - PostgreSQL Schema Migration: 002_stage2_learning_and_translator.sql
-- Stage 2: Learning Engine, Units, Lessons, Exercises, Smart Translator, and Flashcards
-- ==============================================================================

-- 1. Supported Languages
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    script VARCHAR(50) NOT NULL, -- Latin, Devanagari, Japanese (Kanji/Kana), Hangul, Cyrillic, etc.
    flag_emoji VARCHAR(10) NOT NULL,
    has_romanisation BOOLEAN NOT NULL DEFAULT FALSE,
    default_romanisation_system VARCHAR(50),
    region VARCHAR(50) NOT NULL -- 'east_asia', 'south_asia', 'europe', 'americas', 'middle_east'
);

INSERT INTO languages (code, name, native_name, script, flag_emoji, has_romanisation, default_romanisation_system, region)
VALUES
    ('es', 'Spanish', 'Español', 'Latin', '🇪🇸', FALSE, NULL, 'americas'),
    ('ja', 'Japanese', '日本語', 'Japanese', '🇯🇵', TRUE, 'hepburn', 'east_asia'),
    ('hi', 'Hindi', 'हिन्दी', 'Devanagari', '🇮🇳', TRUE, 'aksharamukha_iast', 'south_asia'),
    ('te', 'Telugu', 'తెలుగు', 'Telugu', '🇮🇳', TRUE, 'aksharamukha_iast', 'south_asia'),
    ('ko', 'Korean', '한국어', 'Hangul', '🇰🇷', TRUE, 'revised_romanization_kr', 'east_asia'),
    ('fr', 'French', 'Français', 'Latin', '🇫🇷', FALSE, NULL, 'europe'),
    ('de', 'German', 'Deutsch', 'Latin', '🇩🇪', FALSE, NULL, 'europe'),
    ('zh', 'Mandarin Chinese', '中文', 'Simplified Han', '🇨🇳', TRUE, 'pinyin', 'east_asia'),
    ('ru', 'Russian', 'Русский', 'Cyrillic', '🇷🇺', TRUE, 'iso_9', 'europe')
ON CONFLICT (code) DO NOTHING;

-- 2. Learning Units
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(50) PRIMARY KEY,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    unit_order INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    min_level INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Lessons within Units
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(50) PRIMARY KEY,
    unit_id VARCHAR(50) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    lesson_order INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    xp_reward INT NOT NULL DEFAULT 15,
    duration_minutes INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Exercises within Lessons
CREATE TYPE exercise_type_enum AS ENUM (
    'multiple_choice',
    'match_pairs',
    'word_order',
    'type_translation',
    'listening',
    'reading',
    'speaking'
);

CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(50) PRIMARY KEY,
    lesson_id VARCHAR(50) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    exercise_order INT NOT NULL,
    type exercise_type_enum NOT NULL,
    prompt TEXT NOT NULL,
    native_text TEXT,
    romanisation TEXT,
    romanisation_system VARCHAR(50),
    audio_url VARCHAR(255),
    options JSONB, -- Array of choice strings or word tokens
    correct_answer JSONB NOT NULL, -- Target answer string or array of ordered tokens
    grammar_tip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. User Progress & Learning State
CREATE TABLE IF NOT EXISTS user_learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    current_unit_id VARCHAR(50) REFERENCES units(id),
    current_lesson_id VARCHAR(50) REFERENCES lessons(id),
    completed_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    daily_goal_xp INT NOT NULL DEFAULT 30,
    today_xp INT NOT NULL DEFAULT 0,
    streak_days INT NOT NULL DEFAULT 0,
    streak_freeze_count INT NOT NULL DEFAULT 2,
    last_activity_date DATE,
    placement_test_completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_language UNIQUE (user_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_progress_user_lang ON user_learning_progress(user_id, language_code);

-- 6. Spaced-Repetition Review of Mistakes (SuperMemo SM-2)
CREATE TABLE IF NOT EXISTS user_mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(50) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    incorrect_count INT NOT NULL DEFAULT 1,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    interval_days INT NOT NULL DEFAULT 1,
    ease_factor NUMERIC(3,2) NOT NULL DEFAULT 2.50,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'mastered'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistakes_review ON user_mistakes(user_id, next_review_at);

-- 7. Smart Translations Table (Separate Romanisation Fields)
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_language VARCHAR(10) NOT NULL REFERENCES languages(code),
    target_language VARCHAR(10) NOT NULL REFERENCES languages(code),
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    romanisation TEXT,
    romanisation_system VARCHAR(50),
    meaning TEXT NOT NULL,
    meaning_language VARCHAR(10) NOT NULL,
    pronunciation_url VARCHAR(255),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translations_user ON translations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translations_cache ON translations(source_language, target_language, md5(original_text));

-- 8. Flashcards Table
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    translation_id UUID REFERENCES translations(id) ON DELETE SET NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    romanisation TEXT,
    romanisation_system VARCHAR(50),
    notes TEXT,
    interval_days INT NOT NULL DEFAULT 1,
    ease_factor NUMERIC(3,2) NOT NULL DEFAULT 2.50,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id, next_review_at);
