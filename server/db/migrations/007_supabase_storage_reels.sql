-- ============================================================================
-- Migration: 007_supabase_storage_reels.sql
-- Description: Adds Supabase storage metadata and processing status to reels
-- ============================================================================

ALTER TABLE reels
    ADD COLUMN IF NOT EXISTS reel_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'video/mp4',
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS duration NUMERIC(8,2) DEFAULT 15,
    ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_reels_processing_status ON reels (processing_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reels_storage_path ON reels (storage_path);
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels (user_id);
