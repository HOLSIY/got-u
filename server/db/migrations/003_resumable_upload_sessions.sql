-- ============================================================================
-- GOT U SOCIAL PLATFORM - RESUMABLE MULTIPART UPLOAD SESSIONS
-- Migration: 003_resumable_upload_sessions.sql
-- Description: State tracking for chunked, resumable, direct-to-storage uploads
-- ============================================================================

-- 1. Media Upload Sessions Table
CREATE TABLE IF NOT EXISTS media_upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'local', -- 's3' | 'minio' | 'local'
    upload_id TEXT, -- S3/MinIO multipart upload ID or local session token
    object_key TEXT NOT NULL,
    total_size BIGINT NOT NULL CHECK (total_size > 0),
    part_size INT NOT NULL CHECK (part_size > 0),
    total_parts INT NOT NULL CHECK (total_parts > 0),
    completed_parts INT NOT NULL DEFAULT 0 CHECK (completed_parts >= 0),
    checksum VARCHAR(128),
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending' | 'uploading' | 'completing' | 'completed' | 'aborted' | 'expired' | 'failed'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Media Upload Parts Table (Per-part verification & idempotent retries)
CREATE TABLE IF NOT EXISTS media_upload_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_session_id UUID NOT NULL REFERENCES media_upload_sessions(id) ON DELETE CASCADE,
    part_number INT NOT NULL CHECK (part_number > 0),
    etag TEXT,
    checksum VARCHAR(128),
    size BIGINT NOT NULL CHECK (size >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'completed', -- 'pending' | 'completed' | 'failed'
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_upload_session_part UNIQUE (upload_session_id, part_number)
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_asset ON media_upload_sessions (media_asset_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_owner ON media_upload_sessions (owner_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON media_upload_sessions (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_upload_parts_session ON media_upload_parts (upload_session_id, part_number);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expired ON media_upload_sessions (status, expires_at) WHERE status IN ('pending', 'uploading');
