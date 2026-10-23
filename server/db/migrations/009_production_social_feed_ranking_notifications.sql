-- ============================================================================
-- GOT U SOCIAL PLATFORM - HIGH-SCALE FEED, RANKING & NOTIFICATIONS SCHEMA
-- Migration: 009_production_social_feed_ranking_notifications.sql
-- ============================================================================

-- 1. Ensure pgcrypto extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance notifications table for structured, deterministic navigation
DO $$
BEGIN
    -- If notifications table exists, alter columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications
            ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS actor_user_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS post_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS reel_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS comment_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS reply_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS target_route VARCHAR(255),
            ADD COLUMN IF NOT EXISTS target_metadata JSONB,
            ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ELSE
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            recipient_user_id VARCHAR(128) NOT NULL,
            actor_user_id VARCHAR(128),
            notification_type VARCHAR(50) NOT NULL, -- 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'message'
            entity_type VARCHAR(50) NOT NULL,       -- 'post' | 'reel' | 'comment' | 'user' | 'chat'
            entity_id VARCHAR(128) NOT NULL,
            post_id VARCHAR(128),
            reel_id VARCHAR(128),
            comment_id VARCHAR(128),
            reply_id VARCHAR(128),
            conversation_id VARCHAR(128),
            target_route VARCHAR(255),
            target_metadata JSONB,
            message TEXT,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_lookup 
    ON notifications (recipient_user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_target_entity 
    ON notifications (entity_type, entity_id);

-- 3. Watch Time & Playback Events (Streaming Analytics)
CREATE TABLE IF NOT EXISTS watch_time_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id VARCHAR(128) NOT NULL,
    viewer_id VARCHAR(128),
    started_at TIMESTAMPTZ,
    watch_duration_ms INT NOT NULL DEFAULT 0,
    completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    rewatched BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_events_media_time 
    ON watch_time_events (media_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_events_viewer_time 
    ON watch_time_events (viewer_id, created_at DESC);

-- 4. Aggregated Content Engagement Metrics (For Sub-Millisecond Candidate Scoring)
CREATE TABLE IF NOT EXISTS content_engagement_metrics (
    entity_type VARCHAR(20) NOT NULL, -- 'post' | 'reel'
    entity_id VARCHAR(128) NOT NULL,
    views_count INT NOT NULL DEFAULT 0,
    completes_count INT NOT NULL DEFAULT 0,
    replays_count INT NOT NULL DEFAULT 0,
    skips_count INT NOT NULL DEFAULT 0,
    total_watch_time_ms BIGINT NOT NULL DEFAULT 0,
    avg_watch_time_ms INT NOT NULL DEFAULT 0,
    completion_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
    like_count INT NOT NULL DEFAULT 0,
    comment_count INT NOT NULL DEFAULT 0,
    share_count INT NOT NULL DEFAULT 0,
    save_count INT NOT NULL DEFAULT 0,
    engagement_score NUMERIC(10,4) NOT NULL DEFAULT 0,
    freshness_score NUMERIC(10,4) NOT NULL DEFAULT 0,
    trending_velocity NUMERIC(10,4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_metrics_ranking 
    ON content_engagement_metrics (entity_type, engagement_score DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_metrics_trending 
    ON content_engagement_metrics (entity_type, trending_velocity DESC, updated_at DESC);

-- 5. User Recent Impressions (For Fast O(1) Feed Deduplication)
CREATE TABLE IF NOT EXISTS user_recent_impressions (
    user_id VARCHAR(128) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_impressions_seen 
    ON user_recent_impressions (user_id, seen_at DESC);

-- 6. User Category & Creator Affinities (For Personalization Signals)
CREATE TABLE IF NOT EXISTS user_category_affinities (
    user_id VARCHAR(128) NOT NULL,
    category VARCHAR(60) NOT NULL,
    score NUMERIC(8,4) NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);
