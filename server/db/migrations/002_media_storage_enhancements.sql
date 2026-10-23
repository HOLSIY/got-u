-- ============================================================================
-- GOT U SOCIAL PLATFORM - MEDIA STORAGE & DERIVATIVES ENHANCEMENT SCHEMA
-- Migration: 002_media_storage_enhancements.sql
-- Description: Adds checksums, variant types, storage provider metadata, and indexes
-- ============================================================================

-- 1. Enrich media_assets table with checksum, storage provider, and metadata
ALTER TABLE media_assets 
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS checksum VARCHAR(128),
    ADD COLUMN IF NOT EXISTS processing_error TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Enrich media_variants table with scalable resolution, codec, checksum, and status
ALTER TABLE media_variants
    ADD COLUMN IF NOT EXISTS variant_type VARCHAR(50) NOT NULL DEFAULT 'derivative',
    ADD COLUMN IF NOT EXISTS resolution VARCHAR(30),
    ADD COLUMN IF NOT EXISTS codec VARCHAR(50),
    ADD COLUMN IF NOT EXISTS checksum VARCHAR(128),
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ready',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. High-Performance Indexes for Scale
CREATE INDEX IF NOT EXISTS idx_media_assets_checksum ON media_assets (checksum) WHERE checksum IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_type_status ON media_assets (media_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_lifecycle ON media_assets (status, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_variants_asset_type ON media_variants (media_asset_id, variant_type);
CREATE INDEX IF NOT EXISTS idx_media_variants_status ON media_variants (status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_composite ON video_processing_jobs (media_asset_id, status, created_at DESC);
