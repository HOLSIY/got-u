-- ============================================================================
-- GOT U SOCIAL PLATFORM - INITIAL RELATIONAL POSTGRESQL SCHEMA
-- Migration: 001_initial_schema.sql
-- Description: Core scalable metadata tables, indexes, constraints, and relations
-- ============================================================================

-- Enable pgcrypto / uuid-ossp for secure server-side UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 0. Schema Migrations Ledger Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1. Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active_created ON users (created_at DESC) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- 2. Profiles Extension Table (Decouples heavy profile blobs from core user auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cover_url TEXT,
    phone VARCHAR(50),
    gender VARCHAR(50),
    dob DATE,
    messages_count INT NOT NULL DEFAULT 0,
    groups_count INT NOT NULL DEFAULT 0,
    spaces_count INT NOT NULL DEFAULT 0,
    mood_json JSONB,
    media_visibility BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Posts Table (Feeds, Reels, Status Updates, Quotes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_type VARCHAR(30) NOT NULL DEFAULT 'photo', -- 'photo' | 'video' | 'text' | 'quote' | 'mixed'
    caption TEXT,
    quote_text TEXT,
    quote_author VARCHAR(150),
    location_name VARCHAR(255),
    visibility VARCHAR(30) NOT NULL DEFAULT 'public', -- 'public' | 'friends' | 'private'
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'approved', -- 'approved' | 'rejected' | 'pending' | 'processing'
    moderation_category VARCHAR(100),
    tags TEXT[],
    audio_track JSONB,
    like_count INT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count INT NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    share_count INT NOT NULL DEFAULT 0 CHECK (share_count >= 0),
    view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-Speed Composite Indexes for Feed Discovery & Cursor-Based Pagination
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts (author_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_feed_cursor ON posts (visibility, moderation_status, is_deleted, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_posts_type_created ON posts (post_type, created_at DESC) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- 4. Media Assets Table (Object Storage Metadata, never binary blobs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    storage_key TEXT NOT NULL,
    bucket VARCHAR(100) NOT NULL,
    media_type VARCHAR(30) NOT NULL, -- 'image' | 'video' | 'audio'
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    width INT,
    height INT,
    duration NUMERIC(8,2),
    aspect_ratio NUMERIC(6,3),
    thumbnail_url TEXT,
    hls_master_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'uploading', -- 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_post ON media_assets (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets (status) WHERE status != 'ready';

-- ----------------------------------------------------------------------------
-- 5. Media Variants Table (Adaptive Bitrates: 360p, 720p, 1080p, Thumbnails, HLS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    variant_name VARCHAR(50) NOT NULL, -- 'original' | '360p' | '480p' | '720p' | '1080p' | 'thumbnail' | 'hls_master'
    storage_key TEXT NOT NULL,
    bucket VARCHAR(100) NOT NULL,
    quality_label VARCHAR(20),
    width INT,
    height INT,
    bitrate INT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    public_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_variants_asset ON media_variants (media_asset_id, variant_name);

-- ----------------------------------------------------------------------------
-- 6. Comments Table (Threaded & Linear Post Discussions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_timeline ON comments (post_id, created_at ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. Post Likes (High-Throughput Relation & Composite Primary Key)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. User Followers Table (Social Graph Relationships)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_followers (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'accepted', -- 'pending' | 'accepted' | 'blocked'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_following ON user_followers (following_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON user_followers (follower_id, status, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Notifications Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'call'
    entity_type VARCHAR(50) NOT NULL, -- 'post' | 'comment' | 'user' | 'media'
    entity_id TEXT NOT NULL,
    message TEXT,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 10. Upload Sessions Table (Chunked & Resumable Direct Upload State)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    chunk_size INT NOT NULL,
    total_chunks INT NOT NULL,
    uploaded_chunks INT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    storage_key TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'aborted' | 'expired'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions (user_id, status, expires_at);

-- ----------------------------------------------------------------------------
-- 11. Video Processing Jobs Table (Asynchronous Worker Transcoding Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'queued', -- 'queued' | 'processing' | 'ready' | 'failed'
    stage VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'probing' | 'thumbnails' | 'transcoding' | 'hls' | 'ready'
    progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    input_key TEXT NOT NULL,
    output_hls_key TEXT,
    output_thumbnail_key TEXT,
    duration_sec NUMERIC(8,2),
    processing_host VARCHAR(150),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status_created ON video_processing_jobs (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_media_asset ON video_processing_jobs (media_asset_id);
