-- ============================================================================
-- GOT U SOCIAL PLATFORM - GLOBAL CONTENT ARCHITECTURE & SCHEMA RECONCILIATION
-- Migration: 010_global_social_content_architecture.sql
-- Description: Unifies Reels and Posts across all users into one shared global
--              discovery pool. Removes strict UUID constraints to support
--              alphanumeric social/Firebase identifiers cleanly.
--              Adds high-performance composite discovery indexes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure users table supports alphanumeric social identifiers
ALTER TABLE users 
    ALTER COLUMN id TYPE VARCHAR(128) USING id::text,
    ALTER COLUMN id SET DEFAULT ('usr_' || substr(md5(random()::text), 1, 16));

-- 2. Alter reels table to support alphanumeric IDs and complete creator metadata
DO $$
BEGIN
    -- Drop existing foreign keys that enforce strict UUIDs if present
    ALTER TABLE reels DROP CONSTRAINT IF EXISTS reels_author_id_fkey;
    ALTER TABLE reels DROP CONSTRAINT IF EXISTS reels_media_asset_id_fkey;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE reels
    ALTER COLUMN id TYPE VARCHAR(128) USING id::text,
    ALTER COLUMN author_id TYPE VARCHAR(128) USING author_id::text,
    ALTER COLUMN media_asset_id TYPE VARCHAR(128) USING media_asset_id::text;

-- Ensure all required columns exist on reels
ALTER TABLE reels
    ADD COLUMN IF NOT EXISTS reel_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS author_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS author_username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS author_avatar TEXT,
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS bucket VARCHAR(100) DEFAULT 'reels',
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'video/mp4',
    ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS playback_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS caption TEXT,
    ADD COLUMN IF NOT EXISTS audio_title VARCHAR(150) DEFAULT 'Original Audio',
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) NOT NULL DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS template VARCHAR(50) DEFAULT 'classic',
    ADD COLUMN IF NOT EXISTS width INT DEFAULT 1080,
    ADD COLUMN IF NOT EXISTS height INT DEFAULT 1920,
    ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(6,3) DEFAULT 0.563,
    ADD COLUMN IF NOT EXISTS orientation VARCHAR(30) DEFAULT 'portrait',
    ADD COLUMN IF NOT EXISTS duration NUMERIC(8,2) DEFAULT 15,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) NOT NULL DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shares_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS saves_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- High-Performance Composite Discovery Indexes
CREATE INDEX IF NOT EXISTS idx_reels_global_discovery_fast
    ON reels (visibility, status, is_deleted, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_reels_author_profile
    ON reels (author_id, visibility, is_deleted, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_reels_user_id_lookup
    ON reels (user_id, visibility, is_deleted, created_at DESC)
    WHERE is_deleted = FALSE;

-- 3. Alter media_assets table
DO $$
BEGIN
    ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_owner_id_fkey;
    ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_post_id_fkey;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE media_assets
    ALTER COLUMN id TYPE VARCHAR(128) USING id::text,
    ALTER COLUMN owner_id TYPE VARCHAR(128) USING owner_id::text,
    ALTER COLUMN post_id TYPE VARCHAR(128) USING post_id::text;

-- 4. Alter posts table
DO $$
BEGIN
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE posts
    ALTER COLUMN id TYPE VARCHAR(128) USING id::text,
    ALTER COLUMN author_id TYPE VARCHAR(128) USING author_id::text;

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS playback_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS author_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS author_username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS author_avatar TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_global_discovery
    ON posts (visibility, is_deleted, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_author_lookup
    ON posts (author_id, visibility, is_deleted, created_at DESC)
    WHERE is_deleted = FALSE;
