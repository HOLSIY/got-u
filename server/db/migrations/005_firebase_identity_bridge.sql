-- ============================================================================
-- GOT U SOCIAL PLATFORM - FIREBASE IDENTITY BRIDGE & MIGRATION LEDGER
-- Migration: 005_firebase_identity_bridge.sql
-- Description: Identity bridge for Firebase UID mapping, migration checkpoints,
--              error ledger, and system feature flags for gradual cutover
-- ============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance users table for bidirectional Firebase identity synchronization
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'firebase',
    ADD COLUMN IF NOT EXISTS firebase_synced_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS firebase_metadata JSONB DEFAULT '{}'::jsonb;

-- Index on firebase_uid is critical for O(1) identity bridge lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid_lookup ON users (firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users (email);

-- 3. Migration Checkpoint Ledger (For resumable, bounded, batched migration runs)
CREATE TABLE IF NOT EXISTS migration_checkpoints (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'firebase_social_posts', 'firebase_social_comments', 'firebase_social_likes'
    collection_name VARCHAR(100) NOT NULL,
    last_processed_id TEXT,
    last_processed_timestamp TIMESTAMPTZ,
    records_processed INT NOT NULL DEFAULT 0,
    records_migrated INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    records_duplicates INT NOT NULL DEFAULT 0,
    records_failed INT NOT NULL DEFAULT 0,
    batch_size INT NOT NULL DEFAULT 100,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress', -- 'pending' | 'in_progress' | 'completed' | 'failed'
    error_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_checkpoints_status ON migration_checkpoints (status, updated_at DESC);

-- 4. Migration Error Log (Isolates and records failed records without stopping migration)
CREATE TABLE IF NOT EXISTS migration_error_log (
    id SERIAL PRIMARY KEY,
    checkpoint_id VARCHAR(100) REFERENCES migration_checkpoints(id) ON DELETE CASCADE,
    collection_name VARCHAR(100) NOT NULL,
    source_document_id TEXT NOT NULL,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    payload_snippet JSONB,
    retry_count INT NOT NULL DEFAULT 0,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mig_error_checkpoint ON migration_error_log (checkpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mig_error_unresolved ON migration_error_log (collection_name, resolved) WHERE resolved = FALSE;

-- 5. System Feature Flags Table (For gradual cutover: postgres, firebase, shadow)
CREATE TABLE IF NOT EXISTS system_feature_flags (
    flag_key VARCHAR(100) PRIMARY KEY,
    flag_value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default feature flags if not present
INSERT INTO system_feature_flags (flag_key, flag_value, description)
VALUES 
    ('SOCIAL_DATA_SOURCE', 'postgres', 'Source of truth for social feeds: postgres | firebase | shadow'),
    ('ENABLE_SHADOW_VALIDATION', 'false', 'Enable asynchronous shadow comparison telemetry'),
    ('ALLOW_AUTO_PROVISIONING', 'true', 'Auto-provision PostgreSQL user on verified Firebase login')
ON CONFLICT (flag_key) DO NOTHING;
