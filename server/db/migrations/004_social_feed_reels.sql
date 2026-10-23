-- ============================================================================
-- GOT U SOCIAL PLATFORM - SOCIAL FEED, REELS & ENGAGEMENT SCHEMA
-- Migration: 004_social_feed_reels.sql
-- Description: Relational Posts, Reels, Media Junctions, Likes, Comments,
--              Saves, Shares, Views, Follow Graph & High-Performance Indexes
-- ============================================================================

-- 1. Ensure pgcrypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Add save_count and client_mutation_id (for idempotency) to posts if missing
ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS save_count INT NOT NULL DEFAULT 0 CHECK (save_count >= 0),
    ADD COLUMN IF NOT EXISTS client_mutation_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_mutation ON posts (author_id, client_mutation_id) 
    WHERE client_mutation_id IS NOT NULL;

-- 3. Post-Media Junction Table (For multiple attachments / carousels / mixed media)
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_media_pair UNIQUE (post_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_order ON post_media (post_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_post_media_asset ON post_media (media_asset_id);

-- 4. Dedicated Reels Table (Vertical short-form video metadata referencing media_assets)
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    caption TEXT,
    audio_track JSONB,
    visibility VARCHAR(30) NOT NULL DEFAULT 'public', -- 'public' | 'followers' | 'private'
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'approved', -- 'approved' | 'rejected' | 'pending'
    client_mutation_id VARCHAR(128),
    like_count INT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count INT NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    share_count INT NOT NULL DEFAULT 0 CHECK (share_count >= 0),
    save_count INT NOT NULL DEFAULT 0 CHECK (save_count >= 0),
    view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-Speed Indexes for Reels Discovery & Author Queries
CREATE INDEX IF NOT EXISTS idx_reels_author_created ON reels (author_id, created_at DESC, id DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reels_discovery ON reels (visibility, moderation_status, is_deleted, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_reels_media_asset ON reels (media_asset_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reels_author_mutation ON reels (author_id, client_mutation_id) 
    WHERE client_mutation_id IS NOT NULL;

-- 5. Reel Likes (Idempotent composite PK)
CREATE TABLE IF NOT EXISTS reel_likes (
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_likes_user ON reel_likes (user_id, created_at DESC);

-- 6. Reel Comments Table
CREATE TABLE IF NOT EXISTS reel_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_timeline ON reel_comments (reel_id, created_at ASC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reel_comments_author ON reel_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_parent ON reel_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- 7. Comment Likes (For both post comments and reel comments)
CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL DEFAULT 'post', -- 'post' | 'reel'
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes (user_id, created_at DESC);

-- 8. Post Saves & Reel Saves (Bookmarks)
CREATE TABLE IF NOT EXISTS post_saves (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reel_saves (
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_saves_user ON reel_saves (user_id, created_at DESC);

-- 9. Post Shares & Reel Shares
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'in_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post ON post_shares (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_shares_user ON post_shares (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reel_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'in_app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_shares_reel ON reel_shares (reel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_shares_user ON reel_shares (user_id, created_at DESC);

-- 10. Deduplicated Media / Post / Reel Views Tracking Table
CREATE TABLE IF NOT EXISTS media_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- 'post' | 'reel' | 'media'
    entity_id UUID NOT NULL,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewer_ip VARCHAR(50),
    watch_time_seconds NUMERIC(8,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_views_entity ON media_views (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_views_viewer ON media_views (viewer_id, created_at DESC) WHERE viewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_views_dedup ON media_views (entity_type, entity_id, viewer_id, created_at DESC);

-- 11. Follow Graph Self-Follow Check Constraint (Prevent following self)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_not_self_follow'
    ) THEN
        ALTER TABLE user_followers ADD CONSTRAINT chk_not_self_follow CHECK (follower_id != following_id);
    END IF;
END $$;
