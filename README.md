# Got U - Scalable Social & Media Architecture

Got U is a modern, high-performance social media and real-time communication platform.

---

## 1. System Architecture

```text
                                  +-----------------------+
                                  |     React 19 Client   |
                                  +-----------+-----------+
                                              |
                                              | (HTTP / REST / WebSockets)
                                              v
                                  +-----------------------+
                                  |     Node.js Server    |
                                  +---+-------+-------+---+
                                      |       |       |
                 +--------------------+       |       +--------------------+
                 |                            |                            |
                 v                            v                            v
      +--------------------+      +--------------------+      +--------------------+
      |  Firebase/Auth/FS  |      |   PostgreSQL 16    |      |   MinIO / AWS S3   |
      | (Real-time & Auth) |      | (Relational Meta)  |      |  (Object Storage)  |
      +--------------------+      +--------------------+      +--------------------+
```

### PostgreSQL vs. Object Storage Separation
* **PostgreSQL 16**: Exclusively stores relational entities, social graph relationships, engagement metrics, user accounts, and media metadata. Binary video and photo streams are **never** stored inside PostgreSQL.
* **MinIO / AWS S3**: Stores physical binary media assets, chunks, transcoded HLS stream playlists (`.m3u8`), segments (`.ts`), MP4 quality variants (360p, 720p, 1080p), and WebP thumbnails.

---

## 2. Media Lifecycle & Storage Partitioning Strategy

### Storage Key Layout
Storage keys are structured in a deterministic, balanced 3-level hierarchical tree derived from a SHA-256 hash of the unique `media_id`, preventing directory hotspots on high-scale S3/MinIO partitions:

```text
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/original.{ext}
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/thumbnail.webp
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/variants/360p.mp4
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/variants/720p.mp4
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/variants/1080p.mp4
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/hls/master.m3u8
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/hls/360p/index.m3u8
media/{prefix1}/{prefix2}/{prefix3}/{mediaId}/hls/360p/segment_001.ts
```

### Lifecycle State Machine
```text
  [ Client Init ]
         |
         v
    ( pending )  ---> Creates DB row + Storage key + Presigned upload URL
         |
         v
   ( uploading ) ---> Direct client upload to Object Storage
         |
         v
    ( uploaded ) ---> Byte existence & SHA-256 integrity verified
         |
         v
   ( processing ) --> BullMQ worker runs probing -> thumbnails -> transcoding -> HLS
         |
    +----+----+
    |         |
    v         v
 ( ready ) ( failed )
    |
    v
 ( deleted ) -------> Soft-deleted with scheduled object purge
```

---

## 3. Database Schema Overview

### Core Tables & Migrations (`server/db/migrations/`)
* **`001_initial_schema.sql`**: Initial relational entities (`users`, `profiles`, `posts`, `media_assets`, `media_variants`, `comments`, `post_likes`, `user_followers`, `notifications`, `upload_sessions`, `video_processing_jobs`).
* **`002_media_storage_enhancements.sql`**: Enriched `media_assets` with SHA-256 checksums, storage provider metadata, and `media_variants` with resolution, codec, and high-performance composite indexes.
* **`003_resumable_upload_sessions.sql`**: Production-grade multipart resumable upload sessions (`media_upload_sessions`) and part audit tracking (`media_upload_parts`).

### Key Media Tables
1. **`media_assets`**: Authoritative system-of-record for media assets.
   - Columns: `id` (UUID), `owner_id`, `post_id`, `storage_key`, `bucket`, `storage_provider`, `media_type`, `mime_type`, `file_size`, `width`, `height`, `duration`, `aspect_ratio`, `thumbnail_url`, `hls_master_url`, `checksum`, `original_filename`, `status`, `is_deleted`, `deleted_at`, `created_at`, `updated_at`.
2. **`media_variants`**: Processed derivatives and renditions for each media asset.
   - Columns: `id` (UUID), `media_asset_id`, `variant_name`, `variant_type`, `storage_key`, `bucket`, `resolution`, `codec`, `quality_label`, `width`, `height`, `bitrate`, `file_size`, `mime_type`, `checksum`, `public_url`, `status`, `created_at`, `updated_at`.
3. **`video_processing_jobs`**: Durable queue record and worker stage tracking.
   - Stages: `queued` $\to$ `probing` $\to$ `thumbnails` $\to$ `transcoding` $\to$ `hls` $\to$ `ready` / `failed`.

---

## 4. Keyset / Cursor-Based Pagination

For high-scale infinite scroll and media queries, pagination uses an opaque base64 cursor encoding `(created_at, id)`:
```sql
SELECT * FROM media_assets
WHERE owner_id = $1 AND is_deleted = FALSE
  AND (created_at < $2 OR (created_at = $2 AND id < $3))
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

---

## 5. Local Docker & Infrastructure Setup

To start all backend infrastructure locally with Docker Desktop:

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start PostgreSQL, Redis, and MinIO
docker compose up -d

# 3. Verify container status
docker compose ps

# 4. Run database migrations
npm run migrate

# 5. Run dedicated video processing worker (in separate terminal)
npm run worker

# 6. Run full verification test suite
npm run test:all
```

---

## 6. Comprehensive API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | System health check (API, Database, Redis, Storage) |
| `/api/health/database` | `GET` | PostgreSQL pool connectivity & latency |
| `/api/health/redis` | `GET` | Redis connectivity & ping latency |
| `/api/health/storage` | `GET` | Storage provider health & latency |
| `/api/storage/info` | `GET` | Active storage provider and bucket configuration |
| `/api/media/upload/init` | `POST` | Initializes media upload, assigns hierarchical key & presigned URL |
| `/api/media/upload/complete` | `POST` | Verifies storage upload, transitions state, triggers worker |
| `/api/media/upload/direct` | `POST` | Direct upload single-step helper (Base64/Binary) |
| `/api/media/:id` | `GET` | Retrieves media metadata and signed variant URLs |
| `/api/media/:id/variants` | `GET` | Retrieves all derivative variants for a media asset |
| `/api/media/:id` | `DELETE` | Soft-deletes a media asset and triggers object cleanup |
| `/api/media/user/:ownerId` | `GET` | Keyset cursor-paginated list of user media assets |
| `/api/media/upload/session/init` | `POST` | Initializes resumable multipart upload session |
| `/api/media/upload/session/:id/part-url` | `GET` | Generates presigned URL for specific upload part |
| `/api/media/upload/session/:id/part` | `POST/PUT` | Direct stream upload of multipart chunk |
| `/api/media/upload/session/:id/part-complete` | `POST` | Records client completion of part with ETag |
| `/api/media/upload/session/:id/status` | `GET` | Queries upload session status, completed & missing parts |
| `/api/media/upload/session/:id/complete` | `POST` | Assembles parts, completes upload, enqueues transcoding |
| `/api/media/upload/session/:id/abort` | `POST` | Aborts upload session and cleans up temporary chunk files |
| `/api/media/:id/delivery` | `GET` | Generates CDN & playback manifest for Android / Web players |
| `/api/video/stream/:id` | `GET` | RFC 7233 HTTP 206 Partial Content range-request video streaming |
| `/api/health/media` | `GET` | Media subsystem health check (Storage, DB, Queue, Policies) |
| `/api/jobs/video-processing/status` | `GET` | BullMQ queue metrics (waiting, active, completed, failed) |
| `/api/auth/sync` | `POST` | Authenticates & auto-provisions user via Firebase Identity Bridge |
| `/api/admin/migration/status` | `GET` | Retrieves migration checkpoint progress, ledger, & flags |
| `/api/admin/migration/metrics` | `GET` | Retrieves real-time migration & identity observability metrics |
| `/api/admin/feature-flags` | `POST` | Updates system cutover flags (`SOCIAL_DATA_SOURCE`) |

---

## 7. Firebase → PostgreSQL Migration Architecture (Step 8)

### System Ownership Matrix

| Subsystem | Primary Authority | Storage Layer | Real-time / Synchronization |
| :--- | :--- | :--- | :--- |
| **User Authentication** | Firebase Auth | Firebase Auth & PostgreSQL `users` bridge | Identity Bridge Adapter |
| **Posts & Feed** | PostgreSQL 16 | PostgreSQL `posts`, `post_media` | Keyset Cursor REST API |
| **Reels** | PostgreSQL 16 | PostgreSQL `reels`, `media_assets` | Keyset Cursor REST API |
| **Post/Reel Likes** | PostgreSQL 16 | PostgreSQL `post_likes`, `reel_likes` | Idempotent REST API |
| **Comments & Replies** | PostgreSQL 16 | PostgreSQL `comments`, `reel_comments` | Relational Nested Threads |
| **Saves & Bookmarks** | PostgreSQL 16 | PostgreSQL `post_saves`, `reel_saves` | Relational Storage |
| **Follow Graph** | PostgreSQL 16 | PostgreSQL `follows` | Directed Adjacency Indexes |
| **Media Metadata** | PostgreSQL 16 | PostgreSQL `media_assets`, `media_variants` | Relational Indexing |
| **Media Physical Bytes** | MinIO / AWS S3 | Object Storage hierarchical keys | HLS / Partial Range Stream |
| **Chat & Messaging** | Firebase Firestore | Firestore `/chats`, `/messages` | Firestore Snapshot Listeners |
| **Stories** | Firebase Firestore | Firestore `/stories` | Firestore TTL Listeners |
| **WebRTC Signaling** | Firebase Firestore | Firestore `/calls`, `/candidates` | Real-time WebRTC Listeners |
| **Timelines & Moments** | Firebase Firestore | Firestore `/timelineMoments` | Firestore Snapshot Listeners |
| **Time-Locked Capsules**| Firebase Firestore | Firestore `/memoryCapsules` | Firestore Snapshot Listeners |

### Migration Commands

```bash
# 1. Validate migration in dry-run mode (Zero database writes)
npm run migrate:firebase -- --dry-run

# 2. Run batched, resumable migration for all social collections
npm run migrate:firebase

# 3. Run migration for specific collection with custom batch size
npm run migrate:firebase -- --collection=posts --batch-size=250 --resume

# 4. Execute dedicated migration test suite
npm run test:migration
```

### Cutover Feature Flags

The system supports gradual, reversible cutover via the `system_feature_flags` table or environment variables:
* `SOCIAL_DATA_SOURCE=postgres`: (Default) High-performance PostgreSQL backend for feeds and engagement.
* `SOCIAL_DATA_SOURCE=shadow`: Serves requests while recording background telemetry comparisons between PostgreSQL and Firebase.
* `SOCIAL_DATA_SOURCE=firebase`: Reverts social queries to Firebase in case of incident.

