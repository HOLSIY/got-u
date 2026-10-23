import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Check,
  Plus,
  Send,
  X,
  Sparkles,
  Music,
  Disc,
  Loader2,
  AlertCircle,
  Film,
  Scaling,
  Maximize2,
  Minimize2,
  Waves,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Post, PostComment } from '../../types';
import { db } from '../../lib/firebase';
import { ReelEngagementSummaryModal } from './ReelEngagementSummaryModal';
import { ReelAudioModal } from './ReelAudioModal';
import { ReelMoreOptionsModal } from './ReelMoreOptionsModal';
import { DeleteReelConfirmationModal } from './DeleteReelConfirmationModal';
import { CreateReelModal } from './CreateReelModal';
import { HlsReelPlayer, AspectRatioMode } from './HlsReelPlayer';
import { trackReelWatch, rankReelsDiscovery } from '../../utils/personalization';
import { socialApi } from '../../services/api/socialApi';
import { videoPlayerManager } from '../../services/player/videoPlayerManager';
import { reelsCache } from '../../services/cache/clientCache';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  increment,
  orderBy,
  limit
} from 'firebase/firestore';

interface ReelItemProps {
  post: Post;
  index: number;
  isActive: boolean;
  isPreload: boolean;
  preloadTier?: 'active' | 'next' | 'metadata' | 'paused' | 'none';
  isMuted: boolean;
  isRiverFlowMode: boolean;
  onToggleMute: () => void;
  onOpenComments: (post: Post) => void;
  onOpenAnalytics: (post: Post) => void;
  onOpenAudio: (post: Post) => void;
  onOpenMore: (post: Post) => void;
  onReelEnded?: (index: number) => void;
}

const ReelItemComponent: React.FC<ReelItemProps> = ({
  post,
  index,
  isActive,
  isPreload,
  preloadTier,
  isMuted,
  isRiverFlowMode,
  onToggleMute,
  onOpenComments,
  onOpenAnalytics,
  onOpenAudio,
  onOpenMore,
  onReelEnded,
}) => {
  const { currentUser, sendFriendRequest, friendRequests, openUserProfile } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(post.isLikedByMe));
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(post.isBookmarkedByMe));
  const [commentCount, setCommentCount] = useState<number>(post.commentCount || 0);
  const [showHeartPop, setShowHeartPop] = useState<boolean>(false);
  const [showPlayIcon, setShowPlayIcon] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState<boolean>(false);

  const initialRatio = useMemo(() => {
    if (typeof (post as any).aspectRatio === 'number' && (post as any).aspectRatio > 0) {
      return (post as any).aspectRatio;
    }
    if (typeof (post as any).aspect_ratio === 'number' && (post as any).aspect_ratio > 0) {
      return (post as any).aspect_ratio;
    }
    const m = post.media?.find((x) => x.type === 'video') || post.media?.[0];
    if (typeof (m as any)?.aspectRatio === 'number' && (m as any).aspectRatio > 0) {
      return (m as any).aspectRatio;
    }
    if (m?.width && m?.height && m.width > 0 && m.height > 0) {
      return m.width / m.height;
    }
    if ((post as any).width && (post as any).height && (post as any).width > 0 && (post as any).height > 0) {
      return (post as any).width / (post as any).height;
    }
    return null;
  }, [post]);



  const videoMedia = post.media?.find((m) => m.type === 'video') || post.media?.[0];
  const videoUrl =
    videoMedia?.url ||
    (videoMedia as any)?.playbackUrl ||
    (videoMedia as any)?.directUrl ||
    post.videoUrl ||
    (post as any)?.playbackUrl ||
    (post as any)?.playback_url ||
    (post as any)?.media_url ||
    '';
  const fallbackDirectUrl =
    (videoMedia as any)?.directUrl ||
    (videoMedia as any)?.playbackUrl ||
    post.videoUrl ||
    videoUrl ||
    '';
  const posterUrl =
    videoMedia?.thumbnailUrl ||
    (post as any)?.thumbnailUrl ||
    (post as any)?.thumbnail_url ||
    undefined;

  const isFriendOrPending = friendRequests[post.authorId] === 'accepted' || friendRequests[post.authorId] === 'pending_sent';
  const postAuthorId = post.authorId || (post as any).userId || post.author?.id;
  const cleanAuthorUsername = (post.authorUsername || (post as any).userUsername || post.author?.username || '').replace(/^@/, '').toLowerCase();
  const cleanCurrentUsername = (currentUser?.username || '').replace(/^@/, '').toLowerCase();
  const isMe =
    Boolean(currentUser?.id && (postAuthorId === currentUser.id || postAuthorId === (currentUser as any).uid)) ||
    Boolean((currentUser as any)?.uid && postAuthorId === (currentUser as any).uid) ||
    Boolean(cleanCurrentUsername && cleanAuthorUsername && cleanCurrentUsername === cleanAuthorUsername) ||
    currentUser?.role === 'admin';

  // Real-time like status from Firestore if real post
  useEffect(() => {
    if (!post.id || !currentUser.id) return;
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.id);
    const unsub = onSnapshot(
      likeRef,
      (snap) => {
        setIsLiked(snap.exists());
      },
      () => {}
    );
    return () => unsub();
  }, [post.id, currentUser.id]);

  // Real-time comment count if real post
  useEffect(() => {
    if (!post.id) return;
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const unsub = onSnapshot(
      commentsRef,
      (snap) => {
        setCommentCount(snap.size);
      },
      () => {}
    );
    return () => unsub();
  }, [post.id]);

  // Autoplay / Pause management and meaningful view/engagement event reporting
  useEffect(() => {
    if (isActive) {
      setHasVideoError(false);

      // Report play event
      fetch('/api/reels/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: post.id,
          event: 'play',
          userId: currentUser.id,
        }),
      }).catch(() => {});

      // Track meaningful reel watch (>=3s) for both personalization and deduplicated view counting
      const watchTimer = setTimeout(() => {
        trackReelWatch(
          post.id,
          post.authorId,
          post.authorName,
          post.caption,
          4,
          false,
          currentUser.id
        );

        fetch('/api/reels/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: post.id,
            event: 'watch_duration',
            watchDuration: 3,
            userId: currentUser.id,
          }),
        }).catch(() => {});
      }, 3000);

      setIsPlaying(true);
      return () => clearTimeout(watchTimer);
    } else {
      setIsPlaying(false);
    }
  }, [isActive, post.id, post.authorId, post.authorName, post.caption, currentUser.id]);

  // Single Tap to HOLD/PAUSE, Double Tap to GIVE LOVE!
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const pressHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressHolding, setIsPressHolding] = useState<boolean>(false);

  // Single Tap -> Toggle HOLD / PAUSE
  const handleToggleHold = () => {
    setIsPlaying((prev) => !prev);
  };

  // Double Tap -> GIVE LOVE ❤️
  const handleGiveLove = () => {
    // 1. Show big radiant heart pop animation
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 850);

    // 2. Ensure video stays playing smoothly
    setIsPlaying(true);

    // 3. Mark as liked if not already liked
    if (!isLiked) {
      handleToggleLike();
    }
  };

  // Screen click handler with exact debounce separating single tap (HOLD) from double tap (LOVE)
  const handleScreenClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('form')) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap > 0 && timeSinceLastTap < 280) {
      // DOUBLE TAP DETECTED -> CANCEL HOLD TIMER & GIVE LOVE!
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      handleGiveLove();
    } else {
      // FIRST TAP -> Wait 240ms before toggling hold/pause to check if double tap follows
      lastTapTimeRef.current = now;
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      tapTimerRef.current = setTimeout(() => {
        handleToggleHold();
        tapTimerRef.current = null;
      }, 240);
    }
  };

  // Press & Hold Gesture: holding finger/mouse down holds video paused & clears screen
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('form')) {
      return;
    }
    pressHoldTimerRef.current = setTimeout(() => {
      setIsPressHolding(true);
      setIsPlaying(false);
    }, 250);
  };

  const handlePointerUp = () => {
    if (pressHoldTimerRef.current) {
      clearTimeout(pressHoldTimerRef.current);
      pressHoldTimerRef.current = null;
    }
    if (isPressHolding) {
      setIsPressHolding(false);
      setIsPlaying(true);
    }
  };

  const handleToggleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;

    // Optimistic UI update
    setIsLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextLiked) {
        const res = await socialApi.likeReel(post.id);
        if (!res.success) {
          // Fallback event
          fetch('/api/reels/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: post.id, event: 'like', userId: currentUser.id }),
          }).catch(() => {});
        }
      } else {
        const res = await socialApi.unlikeReel(post.id);
        if (!res.success) {
          fetch('/api/reels/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: post.id, event: 'unlike', userId: currentUser.id }),
          }).catch(() => {});
        }
      }
    } catch {
      // Rollback optimistic state
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    }

    if (post.id) {
      try {
        const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.id);
        const postRef = doc(db, 'posts', post.id);

        if (nextLiked) {
          await setDoc(likeRef, {
            userId: currentUser.id,
            userName: currentUser.fullName,
            userAvatar: currentUser.avatarUrl,
            createdAt: Date.now(),
          });
          await updateDoc(postRef, { likeCount: increment(1) }).catch(() => {});
        } else {
          await deleteDoc(likeRef);
          await updateDoc(postRef, { likeCount: increment(-1) }).catch(() => {});
        }
      } catch (err) {
        console.warn('Like sync error:', err);
      }
    }
  };

  const handleToggleSave = async () => {
    const prevSaved = isSaved;
    const nextSaved = !prevSaved;
    setIsSaved(nextSaved);

    try {
      if (nextSaved) {
        await socialApi.saveReel(post.id);
      } else {
        await socialApi.unsaveReel(post.id);
      }
    } catch {
      setIsSaved(prevSaved);
    }

    if (post.id) {
      try {
        const saveRef = doc(db, 'users', currentUser.id, 'saved_reels', post.id);
        if (nextSaved) {
          await setDoc(saveRef, { postId: post.id, savedAt: Date.now() });
        } else {
          await deleteDoc(saveRef);
        }
      } catch (e) {
        console.warn('Save sync error:', e);
      }
    }
  };


  const handleShare = async () => {
    const shareData = {
      title: `${post.authorName} on got u`,
      text: post.caption || 'Check out this Reel on got u!',
      url: window.location.href,
    };

    fetch('/api/reels/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: post.id,
        event: 'share',
        userId: currentUser.id,
      }),
    }).catch(() => {});

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        if (post.id) {
          await updateDoc(doc(db, 'posts', post.id), { shareCount: increment(1) }).catch(() => {});
        }
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
      if (post.id) {
        await updateDoc(doc(db, 'posts', post.id), { shareCount: increment(1) }).catch(() => {});
      }
    }
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMe && !isFriendOrPending) {
      sendFriendRequest(post.authorId);
    }
  };

  const retryVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasVideoError(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = useCallback((_curr: number, _dur: number, prog: number) => {
    requestAnimationFrame(() => {
      setProgress(prog);
    });
  }, []);

  const handleEnded = useCallback(() => {
    onReelEnded?.(index);
  }, [onReelEnded, index]);

  return (
    <div
      onClick={handleScreenClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full snap-start snap-always shrink-0 bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
      style={{ height: '100%' }}
    >
      {/* Main Edge-to-Edge Video with Adaptive HLS + MP4 Fallback + Aspect Ratio Engine */}
      {videoUrl ? (
        <HlsReelPlayer
          reelId={post.id}
          src={videoUrl}
          fallbackSrc={fallbackDirectUrl}
          poster={posterUrl}
          isActive={isActive}
          isPlaying={isPlaying}
          isPreload={isPreload}
          preloadTier={preloadTier}
          isMuted={isMuted}
          isRiverFlowMode={isRiverFlowMode}
          aspectRatioMode="auto"
          initialAspectRatio={initialRatio}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="w-full h-full"
        />
      ) : (
        /* Minimal unobtrusive loader if media source is pending */
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white/90 animate-spin" />
          </div>
        </div>
      )}

      {/* Subtle Bottom Gradient ONLY behind creator info and caption */}
      <div className={`absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none transition-opacity duration-200 ${isPressHolding ? 'opacity-0' : 'opacity-100'}`} />

      {/* Sleek, Non-Intrusive Pause Button Indicator */}
      {!isPlaying && !isPressHolding && !showHeartPop && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-300 ease-out animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/95 shadow-2xl transition-transform duration-200 transform scale-100">
            <Pause className="w-6 h-6 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Double Tap Floating Heart Pop ("Give Love") */}
      {showHeartPop && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
          <div className="animate-ping drop-shadow-[0_0_35px_rgba(255,45,96,1)]">
            <Heart className="w-28 h-28 fill-[#ff2d60] stroke-none text-[#ff2d60]" />
          </div>
          <div className="mt-2 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-[#ff2d60]/50 text-white font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-1.5 animate-scale-in">
            <Heart className="w-3.5 h-3.5 fill-[#ff2d60] stroke-none" />
            <span>Loved!</span>
          </div>
        </div>
      )}

      {/* Professional Instagram Reels-style Vertical Action Rail */}
      <div className={`absolute right-2 sm:right-3.5 bottom-6 flex flex-col items-center gap-3 z-30 pointer-events-auto select-none transition-opacity duration-200 ${isPressHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Compact Creator Avatar with Follow '+' badge */}
        <div className="relative flex flex-col items-center mb-0.5">
          <img
            src={post.authorAvatar}
            alt={post.authorName}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/90 shadow-xl"
            loading="lazy"
          />
          {!isMe && !isFriendOrPending && (
            <button
              onClick={handleFollow}
              className="absolute -bottom-1 -right-0.5 w-4 h-4 rounded-full bg-[#ff2d60] hover:bg-pink-600 text-white flex items-center justify-center ring-1.5 ring-black shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-90"
              title="Follow creator"
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </button>
          )}
          {isFriendOrPending && !isMe && (
            <div className="absolute -bottom-1 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-1 ring-black shadow-xs">
              <Check className="w-2 h-2 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLike();
            }}
            className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-75 transition-transform cursor-pointer"
            title="Like"
          >
            <Heart
              className={`w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors ${
                isLiked ? 'fill-[#ff2d60] text-[#ff2d60]' : 'text-white stroke-[2]'
              }`}
            />
          </button>
          <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] -mt-0.5 tracking-tight select-none">
            {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(post);
            }}
            className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-75 transition-transform cursor-pointer"
            title="Comments"
          >
            <MessageCircle className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-[2]" />
          </button>
          <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] -mt-0.5 tracking-tight select-none">
            {commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount}
          </span>
        </div>

        {/* Save / Bookmark Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSave();
            }}
            className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-75 transition-transform cursor-pointer"
            title="Save Reel"
          >
            <Bookmark
              className={`w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors ${
                isSaved ? 'fill-amber-400 text-amber-400' : 'text-white stroke-[2]'
              }`}
            />
          </button>
          <span className="text-[10px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] -mt-0.5 tracking-tight select-none">
            {isSaved ? 'Saved' : 'Save'}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="w-9 h-9 flex items-center justify-center text-white hover:scale-110 active:scale-75 transition-transform cursor-pointer"
            title="Share Reel"
          >
            <Share2 className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-[2]" />
          </button>
          <span className="text-[10px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] -mt-0.5 tracking-tight select-none">
            {post.shareCount || 'Share'}
          </span>
        </div>

        {/* More ⋯ Options Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMore(post);
            }}
            className="w-9 h-8 flex items-center justify-center text-white/90 hover:text-white hover:scale-110 active:scale-75 transition-transform cursor-pointer"
            title="More Options"
          >
            <MoreHorizontal className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          </button>
        </div>

        {/* Spinning Vinyl Audio Disc at bottom right of action rail */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAudio(post);
          }}
          className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-black ring-1.5 ring-white/60 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer overflow-hidden mt-0.5"
          title="Audio Track"
        >
          <Disc
            className={`w-4.5 h-4.5 text-white/90 ${isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '3s' }}
          />
        </button>
      </div>

      {/* Creator Information & Music Row (Bottom-Left) */}
      <div className={`absolute left-3.5 sm:left-4 right-14 sm:right-16 bottom-5 z-30 flex flex-col gap-1.5 text-white pointer-events-auto max-w-[calc(100%-4rem)] transition-opacity duration-200 ${isPressHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Creator Name & Username */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openUserProfile(post.authorId);
            }}
            className="flex items-center gap-1.5 text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-sm font-black text-white group-hover:text-[#ff2d60] transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {post.authorName}
            </span>
            <span className="text-xs font-semibold text-white/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              @{post.authorUsername}
            </span>
          </button>

          {!isMe && !isFriendOrPending && (
            <button
              onClick={handleFollow}
              className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-[10px] font-extrabold text-white border border-white/30 transition-all cursor-pointer"
            >
              Follow
            </button>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsCaptionExpanded(!isCaptionExpanded);
            }}
            className="cursor-pointer"
          >
            <p
              className={`text-xs text-white/95 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] font-normal ${
                isCaptionExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {post.caption}
            </p>
          </div>
        )}

        {/* Music / Audio Row (Tapping opens audio sheet) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAudio(post);
          }}
          className="inline-flex items-center gap-2 text-[11px] text-white/90 hover:text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate max-w-full text-left transition-colors cursor-pointer group"
          title="View audio track"
        >
          <Music className="w-3.5 h-3.5 text-[#ff2d60] shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">
            {post.caption?.includes('Music') ? 'Midnight Horizons • Lofi Chillhop' : `Original Audio • @${post.authorUsername}`}
          </span>
        </button>
      </div>

      {/* Slim 2px Scrubbing Progress Bar at Bottom Edge */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20 z-30">
        <div
          className="h-full bg-[#ff2d60] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const ReelItem = memo(ReelItemComponent);

export const ReelWorldScreen: React.FC = () => {
  const { currentUser, targetReelTarget, clearReelTarget } = useApp();
  const [serverReels, setServerReels] = useState<Post[]>(() => {
    try {
      const cached = reelsCache.get<Post[]>('reels_list');
      if (Array.isArray(cached) && cached.length > 0) return cached;
      const stored = sessionStorage.getItem('gotu_reels_fast_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    try {
      const cached = reelsCache.get<Post[]>('reels_list');
      if (Array.isArray(cached) && cached.length > 0) return false;
      const stored = sessionStorage.getItem('gotu_reels_fast_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isGlobalMuted, setIsGlobalMuted] = useState<boolean>(false);
  const [isCreateReelOpen, setIsCreateReelOpen] = useState<boolean>(false);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [selectedAnalyticsReel, setSelectedAnalyticsReel] = useState<Post | null>(null);
  const [selectedAudioPost, setSelectedAudioPost] = useState<Post | null>(null);
  const [selectedMorePost, setSelectedMorePost] = useState<Post | null>(null);
  const [reelPendingDelete, setReelPendingDelete] = useState<Post | null>(null);
  const [isDeletingReel, setIsDeletingReel] = useState<boolean>(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Permanent deletion executed only after two confirmations in DeleteReelConfirmationModal
  const handleConfirmDeleteReel = useCallback(async () => {
    if (!reelPendingDelete?.id) return;
    const targetId = reelPendingDelete.id;
    setIsDeletingReel(true);

    try {
      const tokenOrUserId = currentUser?.id || 'admin';

      // 1. Call backend to perform soft delete in PostgreSQL AND physical file removal in Supabase Storage
      const res = await fetch(`/api/reels/${targetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': tokenOrUserId,
          Authorization: `Bearer ${tokenOrUserId}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || 'Failed to delete Reel');
      }

      // 2. Clean up Firestore documents if any
      deleteDoc(doc(db, 'reels', targetId)).catch(() => {});
      deleteDoc(doc(db, 'posts', targetId)).catch(() => {});

      // 3. Purge from local feed states
      setUserCreatedReels((prev) => prev.filter((p) => p.id !== targetId));
      setServerReels((prev) => prev.filter((p) => p.id !== targetId));

      try {
        localStorage.removeItem('gotu_real_reels');
      } catch {}

      // 4. Dispatch global deletion event so profile and tabs stay in sync
      window.dispatchEvent(new CustomEvent('gotu:reel-deleted', { detail: { reelId: targetId } }));

      // 5. Adjust active index smoothly
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));

      setDeleteToast('Reel permanently deleted');
      setTimeout(() => setDeleteToast(null), 2500);
      setReelPendingDelete(null);
    } catch (err: any) {
      console.error('Error permanently deleting reel:', err);
      alert(err.message || 'Could not delete Reel. Please try again.');
    } finally {
      setIsDeletingReel(false);
    }
  }, [reelPendingDelete, currentUser]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch from /api/reels/feed (Fast CDN & Server Processed Video Streams)
  const fetchFeedBatch = useCallback(async (cursor?: string) => {
    try {
      const res = await socialApi.getReelsFeed({ cursor: cursor || undefined, limit: 15, tokenOrUserId: currentUser?.id });
      if (res.success && res.data) {
        const rawList = (res.data as any).reels || (res.data as any).videos || [];
        if (Array.isArray(rawList)) {
          const mapped: Post[] = rawList.map((v: any) => {
            const w = v.width || v.media?.[0]?.width;
            const h = v.height || v.media?.[0]?.height;
            const ratio = v.aspectRatio || v.aspect_ratio || v.media?.[0]?.aspectRatio || ((w && h) ? Number((w / h).toFixed(3)) : undefined);
            const authorUsername = (v.authorUsername || v.creator?.username || 'creator').replace(/^@/, '');
            const authorName = v.authorName || v.creator?.fullName || 'Creator';
            return {
              id: v.id || v.videoId,
              authorId: v.authorId || v.creator?.id || 'creator',
              authorName,
              authorUsername,
              authorAvatar: v.authorAvatar || v.creator?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorUsername || authorName)}`,
              content: v.content || v.caption || '',
              caption: v.caption || v.content || '',
              postType: 'video' as const,
              width: w,
              height: h,
              aspectRatio: ratio,
              media: v.media?.map((m: any) => ({
                ...m,
                width: m.width || w,
                height: m.height || h,
                aspectRatio: m.aspectRatio || ratio,
              })) || [
                {
                  type: 'video' as const,
                  url: v.videoUrl || v.mediaUrl || (v.mediaUrls && v.mediaUrls[0]) || '',
                  thumbnailUrl: v.thumbnailUrl || v.videoThumbnail,
                  playbackUrl: v.videoUrl || v.mediaUrl || (v.mediaUrls && v.mediaUrls[0]) || '',
                  directUrl: v.fallbackUrl || v.videoUrl || v.mediaUrl,
                  width: w,
                  height: h,
                  aspectRatio: ratio,
                },
              ],
              likesCount: v.likesCount ?? v.likeCount ?? 0,
              likeCount: v.likeCount ?? v.likesCount ?? 0,
              commentsCount: v.commentsCount ?? v.commentCount ?? 0,
              commentCount: v.commentCount ?? v.commentsCount ?? 0,
              sharesCount: v.sharesCount ?? v.shareCount ?? 0,
              shareCount: v.shareCount ?? v.sharesCount ?? 0,
              viewsCount: v.viewsCount || 0,
              isLikedByMe: v.isLikedByMe || v.likedByCurrentUser || false,
              createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date(v.createdAt || Date.now()).toISOString(),
              moderationStatus: 'approved' as const,
              visibility: 'public',
            };
          });

          setServerReels((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const fresh = mapped.filter((p) => !seen.has(p.id));
            const updated = [...prev, ...fresh];
            reelsCache.set('reels_list', updated);
            try {
              sessionStorage.setItem('gotu_reels_fast_cache', JSON.stringify(updated.slice(0, 10)));
            } catch {}
            return updated;
          });
          setNextCursor(res.data.nextCursor || null);
        }
      }
    } catch (e) {
      console.warn('Feed fetch notice:', e);
    } finally {
      setIsInitialLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // Purge any legacy stale localStorage key to ensure state is server-authoritative
    try {
      localStorage.removeItem('gotu_real_reels');
    } catch {}
    fetchFeedBatch();
  }, [fetchFeedBatch]);

  // Ephemeral in-memory state for immediate feedback on upload (NEVER persisted in localStorage)
  const [userCreatedReels, setUserCreatedReels] = useState<Post[]>([]);

  // River Flow Mode: Continuous infinite stream playback like Instagram reels (auto-advance) vs loop current
  const [isRiverFlowMode, setIsRiverFlowMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('gotu_reels_river_mode');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // Combine Real User Uploaded Reels and Fresh Server Processed Reels
  const allReels: Post[] = useMemo(() => {
    const seen = new Set<string>();
    const combined: Post[] = [];

    // 1. In-memory freshly created real reels
    userCreatedReels.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        combined.push(r);
      }
    });

    // 2. Fresh server processed real reels
    serverReels.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        combined.push(r);
      }
    });

    return rankReelsDiscovery(combined, currentUser);
  }, [userCreatedReels, serverReels, currentUser]);

  // Listen for real reels uploaded anywhere in the app
  useEffect(() => {
    const handleReelCreated = (event: any) => {
      const reel = event.detail?.reel;
      if (reel && reel.id) {
        setUserCreatedReels((prev) => {
          const filtered = prev.filter((p) => p.id !== reel.id);
          return [reel, ...filtered];
        });
        setActiveIndex(0);
        if (containerRef.current) {
          containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // Immediately fetch the server feed so the canonical PostgreSQL record is in sync
        fetchFeedBatch();
      }
    };

    const handleOpenReel = async (event: any) => {
      const targetReelId = event.detail?.reelId;
      const targetCommentId = event.detail?.commentId;
      if (!targetReelId) return;

      const targetIdx = allReels.findIndex((r) => r.id === targetReelId);
      if (targetIdx >= 0) {
        setActiveIndex(targetIdx);
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: targetIdx * containerRef.current.clientHeight,
            behavior: 'smooth',
          });
        }
        if (targetCommentId) {
          setActiveCommentPost(allReels[targetIdx]);
        }
      } else {
        // Asynchronously fetch reel by ID if not currently in client candidate window
        try {
          const res = await fetch(`/api/reels/${targetReelId}`);
          if (res.ok) {
            const data = await res.json();
            const v = data.reel || data.data;
            if (v && v.id) {
              const playback = v.playbackUrl || v.playback_url || v.videoUrl || v.video_url || v.media?.playbackUrl || v.media?.videoUrl || v.mediaUrl || '';
              const resolvedAuthorId = v.author?.id || v.authorId || v.author_id || v.creator?.id || 'creator';
              const resolvedAuthorName = v.author?.full_name || v.authorName || v.author_name || v.creator?.fullName || 'Creator';
              const rawUsername = v.author?.username || v.authorUsername || v.author_username || v.creator?.username || 'creator';
              const cleanUsername = String(rawUsername).replace(/^@/, '');
              const resolvedAuthorAvatar = v.author?.avatar_url || v.authorAvatar || v.author_avatar || v.creator?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanUsername || resolvedAuthorName)}`;

              const mapped: Post = {
                id: v.id,
                authorId: resolvedAuthorId,
                authorName: resolvedAuthorName,
                authorUsername: cleanUsername,
                authorAvatar: resolvedAuthorAvatar,
                content: v.content || v.caption || '',
                caption: v.caption || v.content || '',
                postType: 'video',
                videoUrl: playback,
                mediaUrl: playback,
                width: v.width || v.media?.width || 1080,
                height: v.height || v.media?.height || 1920,
                aspectRatio: v.aspectRatio || v.aspect_ratio || v.media?.aspectRatio || 0.563,
                media: [{
                  type: 'video',
                  url: playback,
                  playbackUrl: playback,
                  directUrl: playback,
                  thumbnailUrl: v.thumbnailUrl || v.thumbnail_url || v.media?.thumbnailUrl,
                  width: v.width || v.media?.width || 1080,
                  height: v.height || v.media?.height || 1920,
                  aspectRatio: v.aspectRatio || v.aspect_ratio || v.media?.aspectRatio || 0.563,
                }],
                likesCount: v.likesCount || v.likes_count || v.engagement?.likes || 0,
                commentsCount: v.commentsCount || v.comments_count || v.engagement?.comments || 0,
                sharesCount: v.sharesCount || v.shares_count || v.engagement?.shares || 0,
                viewsCount: v.viewsCount || v.views_count || v.engagement?.views || 1,
                isLikedByMe: Boolean(v.engagement?.likedByMe || v.isLikedByMe),
                createdAt: v.createdAt || v.created_at || new Date().toISOString(),
                moderationStatus: 'approved',
                visibility: v.visibility || 'public',
              };
              setServerReels((prev) => [mapped, ...prev]);
              setActiveIndex(0);
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
              if (targetCommentId) {
                setActiveCommentPost(mapped);
              }
              return;
            }
          }
        } catch {}

        // Fallback if deleted or removed: Never crash or show blank screen
        setDeleteToast('This reel is no longer available');
        setTimeout(() => setDeleteToast(null), 3000);
      }
    };

    window.addEventListener('gotu:reel-created', handleReelCreated);
    window.addEventListener('gotu:open-reel', handleOpenReel);
    return () => {
      window.removeEventListener('gotu:reel-created', handleReelCreated);
      window.removeEventListener('gotu:open-reel', handleOpenReel);
    };
  }, [allReels]);

  // Handle direct AppContext targetReelTarget navigation (e.g. from tapping a notification)
  useEffect(() => {
    if (targetReelTarget?.reelId) {
      window.dispatchEvent(new CustomEvent('gotu:open-reel', {
        detail: {
          reelId: targetReelTarget.reelId,
          commentId: targetReelTarget.commentId,
        },
      }));
      clearReelTarget();
    }
  }, [targetReelTarget, clearReelTarget]);

  // Listen to Comments for the activeCommentPost
  useEffect(() => {
    if (!activeCommentPost) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, 'posts', activeCommentPost.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const fetched: PostComment[] = [];
        snap.forEach((d) => fetched.push({ ...d.data(), id: d.id } as PostComment));
        setComments(fetched);
      },
      (err) => {
        console.warn('Reels comments listener notice:', err);
      }
    );
    return () => unsub();
  }, [activeCommentPost]);

  // Handle Scroll to update active index and trigger prefetch / cursor pagination
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    if (height === 0) return;
    const scrollTop = containerRef.current.scrollTop;
    const newIdx = Math.round(scrollTop / height);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < allReels.length) {
      setActiveIndex(newIdx);

      // Endless feed prefetching
      if (newIdx >= allReels.length - 4 && nextCursor && !isLoadingMore) {
        setIsLoadingMore(true);
        fetchFeedBatch(nextCursor).finally(() => setIsLoadingMore(false));
      }
    }
  }, [activeIndex, allReels.length, nextCursor, isLoadingMore, fetchFeedBatch]);

  // River Flow Handler: When a video finishes, seamlessly advance to next reel like a continuous river
  const handleReelEnded = useCallback(
    (endedIndex: number) => {
      if (isRiverFlowMode && endedIndex === activeIndex) {
        if (allReels.length > 0) {
          const nextIdx = (endedIndex + 1) % allReels.length;
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: nextIdx * containerRef.current.clientHeight,
              behavior: 'smooth',
            });
          }
          setActiveIndex(nextIdx);
        }
      }
    },
    [isRiverFlowMode, activeIndex, allReels.length]
  );

  const handleToggleMute = useCallback(() => {
    setIsGlobalMuted((prev) => !prev);
  }, []);

  const handleOpenComments = useCallback((post: Post) => {
    setActiveCommentPost(post);
  }, []);

  const handleOpenAnalytics = useCallback((post: Post) => {
    setSelectedAnalyticsReel(post);
  }, []);

  const handleOpenAudio = useCallback((post: Post) => {
    setSelectedAudioPost(post);
  }, []);

  const handleOpenMore = useCallback((post: Post) => {
    setSelectedMorePost(post);
  }, []);

  // Keyboard navigation (Arrow Up / Arrow Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeCommentPost || selectedAnalyticsReel || selectedAudioPost || selectedMorePost) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < allReels.length - 1 && containerRef.current) {
          const nextIdx = activeIndex + 1;
          containerRef.current.scrollTo({
            top: nextIdx * containerRef.current.clientHeight,
            behavior: 'smooth',
          });
          setActiveIndex(nextIdx);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0 && containerRef.current) {
          const prevIdx = activeIndex - 1;
          containerRef.current.scrollTo({
            top: prevIdx * containerRef.current.clientHeight,
            behavior: 'smooth',
          });
          setActiveIndex(prevIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, allReels.length, activeCommentPost, selectedAnalyticsReel, selectedAudioPost, selectedMorePost]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPost || !newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const commentText = newComment.trim();
    setNewComment('');

    const newCommentItem: PostComment = {
      id: `c_${Date.now()}`,
      postId: activeCommentPost.id,
      authorId: currentUser.id,
      authorName: currentUser.fullName,
      authorUsername: currentUser.username.replace('@', ''),
      authorAvatar: currentUser.avatarUrl,
      text: commentText,
      createdAt: Date.now(),
      likeCount: 0,
    };

    setComments((prev) => [...prev, newCommentItem]);

    try {
      const commentsRef = collection(db, 'posts', activeCommentPost.id, 'comments');
      await addDoc(commentsRef, newCommentItem);
      await updateDoc(doc(db, 'posts', activeCommentPost.id), {
        commentCount: increment(1),
      }).catch(() => {});
    } catch (err) {
      console.warn('Error posting comment:', err);
    }

    setIsSubmittingComment(false);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col select-none">
      {/* Top Floating Glass Header */}
      <div className="absolute top-0 inset-x-0 z-40 px-4 pt-3 pb-2 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-base font-black text-white tracking-tight drop-shadow-md">
            Reels
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white/90">
            <Sparkles className="w-3 h-3 text-[#ff2d60]" />
            <span>Discover</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* River Flow Continuous Stream Mode Toggle (River Flow vs Loop) */}
          <button
            onClick={() => {
              const next = !isRiverFlowMode;
              setIsRiverFlowMode(next);
              try {
                localStorage.setItem('gotu_reels_river_mode', String(next));
              } catch {}
            }}
            className={`h-8 px-2.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isRiverFlowMode
                ? 'bg-gradient-to-r from-cyan-600/70 to-blue-600/70 border-cyan-400/60 text-white'
                : 'bg-black/50 border-white/20 text-white/70 hover:text-white'
            }`}
            title={isRiverFlowMode ? 'River Flow ON: Videos stream non-stop to the next reel like a river' : 'River Flow OFF: Continuously loops current reel'}
          >
            <Waves className={`w-3.5 h-3.5 ${isRiverFlowMode ? 'animate-pulse text-cyan-200' : 'text-white/60'}`} />
            <span className="hidden sm:inline text-[11px] font-semibold">{isRiverFlowMode ? 'River Flow' : 'Loop'}</span>
          </button>

          <button
            onClick={() => setIsCreateReelOpen(true)}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#ff2d60] to-purple-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#ff2d60]/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Edge-to-Edge Scrollable Reels Feed with Snap Behavior */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {allReels.length > 0 ? (
          allReels.map((reel, index) => {
            // Intelligent preloading window:
            // - Active Reel (index === activeIndex): Highest priority, plays immediately
            // - Next Reel (index === activeIndex + 1): Lightweight preload (metadata only)
            // - Previous Reel (index === activeIndex - 1): Paused, resources released
            // - Others: Only high-res poster is rendered (0 video decoding / network overhead)
            const isNear = index >= activeIndex - 1 && index <= activeIndex + 2;

            if (!isNear) {
              const poster = reel.media?.[0]?.thumbnailUrl || (reel as any).thumbnailUrl;
              return (
                <div
                  key={reel.id}
                  className="w-full h-full snap-start snap-always shrink-0 bg-black flex items-center justify-center relative overflow-hidden"
                  style={{ height: '100%' }}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt=""
                      className="w-full h-full object-cover opacity-70"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                      <Film className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                </div>
              );
            }

            const preloadTier =
              index === activeIndex
                ? 'active'
                : index === activeIndex + 1
                ? 'next'
                : index === activeIndex + 2
                ? 'metadata'
                : 'paused';

            return (
              <ReelItem
                key={reel.id}
                post={reel}
                index={index}
                isActive={index === activeIndex}
                isPreload={index === activeIndex + 1 || index === activeIndex + 2}
                preloadTier={preloadTier}
                isMuted={isGlobalMuted}
                isRiverFlowMode={isRiverFlowMode}
                onToggleMute={handleToggleMute}
                onOpenComments={handleOpenComments}
                onOpenAnalytics={handleOpenAnalytics}
                onOpenAudio={handleOpenAudio}
                onOpenMore={handleOpenMore}
                onReelEnded={handleReelEnded}
              />
            );
          })
        ) : isInitialLoading ? (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center select-none relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-black to-slate-950/80 animate-pulse" />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl">
                <Film className="w-8 h-8 text-[#ff2d60] animate-pulse" />
              </div>
              <span className="text-xs font-semibold text-white/60 tracking-wide">Loading Reels...</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#ff2d60]/20 to-purple-600/20 border border-white/10 flex items-center justify-center mb-5 shadow-2xl backdrop-blur-xl">
              <Film className="w-10 h-10 text-[#ff2d60]" />
            </div>
            <h2 className="text-xl font-black tracking-tight mb-2">No Reels Yet</h2>
            <p className="text-sm text-white/60 max-w-xs mb-6 leading-relaxed">
              Be the first creator to capture and share a real video reel with the community.
            </p>
            <button
              onClick={() => setIsCreateReelOpen(true)}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#ff2d60] to-purple-600 hover:opacity-95 active:scale-95 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-[#ff2d60]/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Reel</span>
            </button>
          </div>
        )}
      </div>

      {/* Real Comments Bottom Sheet Modal */}
      {activeCommentPost && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            onClick={() => setActiveCommentPost(null)}
            className="flex-1 cursor-pointer"
          />

          <div className="w-full max-w-md mx-auto bg-white dark:bg-[#12141d] rounded-t-3xl border-t border-slate-200 dark:border-white/10 shadow-2xl p-4 flex flex-col max-h-[60vh] text-slate-900 dark:text-white animate-slide-up">
            {/* Comments Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#ff2d60]" />
                <h3 className="text-sm font-extrabold">Comments ({comments.length})</h3>
              </div>

              <button
                onClick={() => setActiveCommentPost(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img
                      src={c.authorAvatar}
                      alt={c.authorName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                    <div className="flex-1 bg-slate-100 dark:bg-white/5 p-2.5 rounded-2xl border border-slate-200/60 dark:border-white/5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.authorName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                  <span>No comments yet. Be the first to join the conversation!</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-10 px-4 rounded-full bg-slate-100 dark:bg-[#1a1d2b] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ff2d60]"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="w-10 h-10 rounded-full bg-[#ff2d60] hover:bg-pink-600 disabled:opacity-50 text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Audio Modal */}
      {selectedAudioPost && (
        <ReelAudioModal
          post={selectedAudioPost}
          onClose={() => setSelectedAudioPost(null)}
        />
      )}

      {/* More Options Modal */}
      {selectedMorePost && (
        <ReelMoreOptionsModal
          post={selectedMorePost}
          isSaved={Boolean(selectedMorePost.isBookmarkedByMe)}
          onToggleSave={() => {
            const nextSaved = !selectedMorePost.isBookmarkedByMe;
            selectedMorePost.isBookmarkedByMe = nextSaved;
            const saveRef = doc(db, 'users', currentUser.id, 'saved_reels', selectedMorePost.id);
            if (nextSaved) {
              setDoc(saveRef, { postId: selectedMorePost.id, savedAt: Date.now() }).catch(() => {});
            } else {
              deleteDoc(saveRef).catch(() => {});
            }
          }}
          onOpenAnalytics={() => {
            setSelectedAnalyticsReel(selectedMorePost);
          }}
          onOpenAudio={() => {
            setSelectedAudioPost(selectedMorePost);
          }}
          onDelete={() => {
            if (selectedMorePost) {
              setReelPendingDelete(selectedMorePost);
              setSelectedMorePost(null);
            }
          }}
          onClose={() => setSelectedMorePost(null)}
        />
      )}

      {/* Two-Step Permanent Deletion Confirmation Modal */}
      <DeleteReelConfirmationModal
        isOpen={Boolean(reelPendingDelete)}
        onClose={() => setReelPendingDelete(null)}
        onConfirmDelete={handleConfirmDeleteReel}
        isDeleting={isDeletingReel}
      />

      {/* Immediate Deletion Confirmation Toast */}
      {deleteToast && (
        <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none z-50 animate-fade-in">
          <div className="px-4 py-2 rounded-full bg-rose-600/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-2xl flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-white" />
            <span>{deleteToast}</span>
          </div>
        </div>
      )}

      {/* Real-time 7-Day Engagement Summary Visualization Modal */}
      {selectedAnalyticsReel && (
        <ReelEngagementSummaryModal
          post={selectedAnalyticsReel}
          onClose={() => setSelectedAnalyticsReel(null)}
        />
      )}

      {/* Create New Reel Modal */}
      {isCreateReelOpen && (
        <CreateReelModal
          onClose={() => setIsCreateReelOpen(false)}
          onReelCreated={(newReel) => {
            const authorId = newReel.authorId || newReel.userId || currentUser?.id || 'current_user';
            const authorName = newReel.authorName || newReel.userName || currentUser?.fullName || currentUser?.name || 'You';
            const authorUsername = (newReel.authorUsername || newReel.userUsername || currentUser?.username || 'you').replace(/^@/, '');
            const authorAvatar = newReel.authorAvatar || newReel.userAvatar || currentUser?.avatarUrl || currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorUsername || 'user')}`;
            const vidUrl = newReel.videoUrl || newReel.mediaUrl || '';
            const detectedWidth = newReel.width || newReel.media?.[0]?.width || 1080;
            const detectedHeight = newReel.height || newReel.media?.[0]?.height || 1920;
            const computedRatio = newReel.aspectRatio || (detectedWidth && detectedHeight ? Number((detectedWidth / detectedHeight).toFixed(3)) : undefined);

            const formatted: Post = {
              id: newReel.id || `reel_${Date.now()}`,
              authorId,
              authorName,
              authorUsername,
              authorAvatar,
              userId: authorId,
              userName: authorName,
              userUsername: `@${authorUsername}`,
              userAvatar: authorAvatar,
              postType: 'video',
              type: 'reel',
              caption: newReel.caption || '',
              content: newReel.caption || '',
              videoUrl: vidUrl,
              mediaUrl: vidUrl,
              thumbnailUrl: newReel.thumbnailUrl || vidUrl,
              width: detectedWidth,
              height: detectedHeight,
              aspectRatio: computedRatio,
              media: newReel.media || [
                {
                  id: `media_${Date.now()}`,
                  type: 'video',
                  url: vidUrl,
                  playbackUrl: vidUrl,
                  directUrl: vidUrl,
                  thumbnailUrl: newReel.thumbnailUrl || vidUrl,
                  width: detectedWidth,
                  height: detectedHeight,
                },
              ],
              audioTrackTitle: newReel.audioTrackTitle || newReel.audioTrack?.title || 'Original Audio',
              audioTrackArtist: newReel.audioTrackArtist || newReel.audioTrack?.artist || `@${authorUsername}`,
              likeCount: 0,
              likesCount: 0,
              commentCount: 0,
              commentsCount: 0,
              shareCount: 0,
              sharesCount: 0,
              viewsCount: 1,
              isLikedByMe: false,
              isBookmarkedByMe: false,
              createdAt: new Date().toISOString(),
              moderationStatus: 'approved',
              visibility: 'public',
            };

              setUserCreatedReels((prev) => {
                const filtered = prev.filter((p) => p.id !== formatted.id);
                return [formatted, ...filtered];
              });
              setActiveIndex(0);
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
              // Refresh global feed from backend
              fetchFeedBatch();
            }}
          />
      )}
    </div>
  );
};
