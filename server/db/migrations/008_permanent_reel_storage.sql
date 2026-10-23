-- ============================================================================
-- Migration: 008_permanent_reel_storage.sql
-- Description: Ensures complete permanent metadata schema for Reels
-- ============================================================================

ALTER TABLE reels
    ADD COLUMN IF NOT EXISTS reel_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS bucket VARCHAR(100) DEFAULT 'reels',
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'video/mp4',
    ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS width INT DEFAULT 1080,
    ADD COLUMN IF NOT EXISTS height INT DEFAULT 1920,
    ADD COLUMN IF NOT EXISTS aspect_ratio NUMERIC(6,3) DEFAULT 0.563,
    ADD COLUMN IF NOT EXISTS orientation VARCHAR(30) DEFAULT 'portrait',
    ADD COLUMN IF NOT EXISTS duration NUMERIC(8,2) DEFAULT 15,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_reels_owner_user_id ON reels (owner_user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reels_storage_path_perm ON reels (storage_path);
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels (status) WHERE is_deleted = FALSE;
