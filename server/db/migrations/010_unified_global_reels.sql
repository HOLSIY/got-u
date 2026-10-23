-- ============================================================================
-- GOT U SOCIAL PLATFORM - UNIFIED GLOBAL REELS ARCHITECTURE
-- Migration: 010_unified_global_reels.sql
-- Description: Enforces global public reels discovery invariant:
--              (visibility = 'public' AND status = 'ready' AND is_deleted = false)
--              Decoupled from viewer identity or follow scopes.
-- ============================================================================

-- 1. Ensure columns exist and have consistent defaults
ALTER TABLE reels
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(30) DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS author_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS author_username VARCHAR(100),
    ADD COLUMN IF NOT EXISTS author_avatar TEXT,
    ADD COLUMN IF NOT EXISTS playback_url TEXT,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2. Drop strict UUID foreign keys if they prevent non-UUID Firebase user IDs
DO $$
BEGIN
    -- Alter author_id to VARCHAR(128) if currently UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reels' AND column_name = 'author_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE reels DROP CONSTRAINT IF EXISTS reels_author_id_fkey;
        ALTER TABLE reels ALTER COLUMN author_id TYPE VARCHAR(128) USING author_id::varchar;
    END IF;

    -- Alter id to VARCHAR(128) if currently UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reels' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE reels ALTER COLUMN id TYPE VARCHAR(128) USING id::varchar;
    END IF;

    -- Alter media_asset_id to VARCHAR(128) if currently UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reels' AND column_name = 'media_asset_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE reels DROP CONSTRAINT IF EXISTS reels_media_asset_id_fkey;
        ALTER TABLE reels ALTER COLUMN media_asset_id TYPE VARCHAR(128) USING media_asset_id::varchar;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Notice altering column types: %', SQLERRM;
END $$;

-- 3. Composite Index for Global Discovery (Invariant: public + ready + not deleted)
CREATE INDEX IF NOT EXISTS idx_reels_global_ready_discovery 
    ON reels (visibility, status, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reels_global_proc_discovery 
    ON reels (visibility, processing_status, is_deleted, created_at DESC);

-- 4. Media Variants connection verification
CREATE TABLE IF NOT EXISTS media_variants (
    id VARCHAR(128) PRIMARY KEY,
    media_asset_id VARCHAR(128) NOT NULL,
    variant_name VARCHAR(50) NOT NULL DEFAULT 'original',
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(100) DEFAULT 'video/mp4',
    file_size BIGINT DEFAULT 0,
    width INT,
    height INT,
    bitrate INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_variants_asset_lookup 
    ON media_variants (media_asset_id);
