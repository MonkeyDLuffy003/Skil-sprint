-- ==============================================================================
-- SkillSprint AI - PostgreSQL Schema Migration: 004_stage4_dialogues_and_roleplay.sql
-- Stage 4: Interactive Conversational Role-Playing Dialogues with Mascots
-- ==============================================================================

-- 1. Scenarios Table
CREATE TABLE IF NOT EXISTS dialogue_scenarios (
    id VARCHAR(50) PRIMARY KEY,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    scenario_type VARCHAR(50) NOT NULL, -- 'cafe_order', 'hotel_checkin', 'asking_directions', 'job_interview'
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    setting_context TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    total_turns INT NOT NULL DEFAULT 4,
    xp_reward INT NOT NULL DEFAULT 25,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scenario Turns & Branching Prompts
CREATE TABLE IF NOT EXISTS dialogue_turns (
    id VARCHAR(50) PRIMARY KEY,
    scenario_id VARCHAR(50) NOT NULL REFERENCES dialogue_scenarios(id) ON DELETE CASCADE,
    turn_index INT NOT NULL,
    speaker_role VARCHAR(20) NOT NULL, -- 'mascot_tutor', 'npc_counterpart', 'user'
    npc_name VARCHAR(100) NOT NULL,
    prompt_native TEXT NOT NULL,
    prompt_romanisation TEXT,
    prompt_translation TEXT NOT NULL,
    audio_clue_url VARCHAR(255),
    expected_response_hints JSONB NOT NULL, -- Array of suggested responses with romanisation & meaning
    acceptable_answers JSONB NOT NULL,
    correction_guidance TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Scenario Progress & Mastery
CREATE TABLE IF NOT EXISTS user_dialogue_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id VARCHAR(50) NOT NULL REFERENCES dialogue_scenarios(id) ON DELETE CASCADE,
    turns_completed INT NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    accuracy_score NUMERIC(5,2),
    last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mastery_stars INT NOT NULL DEFAULT 0 -- 1 to 3 stars
);

CREATE INDEX IF NOT EXISTS idx_user_dialogue ON user_dialogue_progress(user_id, scenario_id);
