import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  MapPin,
  Quote,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  ShieldAlert,
  Loader2,
  Sparkles,
  Edit3,
  UserX,
  Check,
  Link as LinkIcon,
  Lock,
} from 'lucide-react';
import { Post, PostComment } from '../../types';
import { useApp } from '../../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { EditPostModal } from './EditPostModal';
import { formatUsername } from '../../utils/constants';
import { socialApi } from '../../services/api/socialApi';
import {
  trackPostView,
  trackPostLike,
  trackPostComment,
} from '../../utils/personalization';
import {
  doc,
  collection,
  addDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  increment,
} from 'firebase/firestore';

interface PostCardProps {
  post: Post;
  onOpenReportModal?: (postId: string) => void;
  onPostDeleted?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onOpenReportModal, onPostDeleted }) => {
  const { currentUser, allUsers, openPostViewer, openUserProfile, blockUser, setActiveTab } = useApp();
  const currentUserId = currentUser?.id || (currentUser as any)?.uid;
  const postAuthorId = post?.authorId || (post as any)?.author_id || (post as any)?.author?.id || (post as any)?.userId;
  const isOwner = Boolean(currentUserId && postAuthorId && currentUserId === postAuthorId);
  const authorUser = allUsers?.find((u) => u.id === postAuthorId);
  const isAuthorMediaHidden = !isOwner && authorUser && authorUser.mediaVisibility === false;

  // Local state
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(post?.isLikedByMe));
  const [likeCount, setLikeCount] = useState<number>(post?.likeCount || 0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(Boolean(post?.isBookmarkedByMe));
  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentCount, setCommentCount] = useState<number>(post?.commentCount || 0);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [commentModError, setCommentModError] = useState<string | null>(null);

  // Carousel state
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Video playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Menu and modal states
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  // Check Firestore for user's like status & comment list
  useEffect(() => {
    let unsubscribeLikes: () => void = () => {};
    let unsubscribeComments: () => void = () => {};

    if (!post?.id || !currentUser?.id) {
      return;
    }

    try {
      // Check like doc
      const likeDocRef = doc(db, 'posts', post.id, 'likes', currentUser.id);
      unsubscribeLikes = onSnapshot(
        likeDocRef,
        (snap) => {
          setIsLiked(snap.exists());
        },
        (err) => {
          console.warn('PostCard likes listener notice:', err);
        }
      );

      // Listen to comments
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
      unsubscribeComments = onSnapshot(
        commentsQuery,
        (snapshot) => {
          const fetched: PostComment[] = [];
          const seenCommentIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const cObj = { ...docSnap.data(), id: docSnap.id } as PostComment;
            if (!seenCommentIds.has(cObj.id)) {
              seenCommentIds.add(cObj.id);
              fetched.push(cObj);
            }
          });
          setComments(fetched);
          setCommentCount(fetched.length);
        },
        (err) => {
          console.warn('PostCard comments listener notice:', err);
        }
      );
    } catch (e) {
      console.warn('Firestore snapshot setup skipped:', e);
    }

    return () => {
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [post?.id, currentUser?.id]);

  // IntersectionObserver to auto-pause videos when out of viewport & track silent post views
  useEffect(() => {
    if (!cardRef.current) return;

    let viewTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Track view after 1.5 seconds in view
            viewTimer = setTimeout(() => {
              trackPostView(post, 3, currentUser.id);
            }, 1500);
          } else {
            if (viewTimer) clearTimeout(viewTimer);
            if (videoRef.current) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => {
      if (viewTimer) clearTimeout(viewTimer);
      observer.disconnect();
    };
  }, [post, currentUser.id]);

  // Handle Carousel Scroll
  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.offsetWidth;
    const scrollLeft = carouselRef.current.scrollLeft;
    const newIdx = Math.round(scrollLeft / width);
    if (newIdx !== currentMediaIndex) {
      setCurrentMediaIndex(newIdx);
    }
  };

  const scrollToMediaIndex = (idx: number) => {
    if (!carouselRef.current) return;
    const width = carouselRef.current.offsetWidth;
    carouselRef.current.scrollTo({
      left: width * idx,
      behavior: 'smooth',
    });
    setCurrentMediaIndex(idx);
  };

  // Toggle Like with Firestore atomic update
  const handleToggleLike = async () => {
    if (!post?.id || !currentUser?.id) return;
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextIsLiked) {
      trackPostLike(post, currentUser.id);
    }

    try {
      const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.id);
      const postRef = doc(db, 'posts', post.id);

      if (nextIsLiked) {
        await setDoc(likeRef, {
          userId: currentUser.id,
          userName: currentUser.fullName || currentUser.username || 'User',
          createdAt: Date.now(),
        }).catch(() => {});
        await updateDoc(postRef, { likeCount: increment(1) }).catch(() => {});
      } else {
        await deleteDoc(likeRef).catch(() => {});
        await updateDoc(postRef, { likeCount: increment(-1) }).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Like update notice:', err?.message || err);
    }
  };

  // Video Play/Pause toggle
  const togglePlayVideo = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Submit Comment with AI Content Moderation
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.id || !currentUser?.id || !newCommentText.trim() || isPostingComment) return;

    setCommentModError(null);
    setIsPostingComment(true);

    try {
      // 1. Moderate comment with AI safety API (safe timeout with fallback)
      try {
        const modCtrl = new AbortController();
        const timeoutId = setTimeout(() => modCtrl.abort(), 5000);

        const modRes = await fetch('/api/feed/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: newCommentText,
          }),
          signal: modCtrl.signal,
        });
        clearTimeout(timeoutId);

        if (modRes.ok) {
          const modResult = await modRes.json();
          if (modResult && modResult.isSafe === false) {
            setCommentModError(modResult.reason || 'Comment blocked by AI Safety System.');
            setIsPostingComment(false);
            return;
          }
        }
      } catch (modErr) {
        console.warn('Comment moderation notice:', modErr);
      }

      // 2. Add comment to Firestore
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      await addDoc(commentsRef, {
        postId: post.id,
        authorId: currentUser.id,
        authorName: currentUser.fullName || currentUser.username || 'User',
        authorUsername: currentUser.username || 'user',
        authorAvatar: currentUser.avatarUrl || '',
        text: newCommentText.trim(),
        createdAt: Date.now(),
      }).catch((fErr) => {
        console.warn('Comment write notice:', fErr?.message || fErr);
      });

      // 3. Increment comment count on post
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, { commentCount: increment(1) }).catch(() => {});

      trackPostComment(post, currentUser.id);

      setNewCommentText('');
    } catch (err: any) {
      console.warn('Notice while posting comment:', err?.message || err);
      setCommentModError('Unable to post comment at the moment. Please try again.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post?.id || !commentId) return;
    try {
      const commentDocRef = doc(db, 'posts', post.id, 'comments', commentId);
      await deleteDoc(commentDocRef).catch(() => {});

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, { commentCount: increment(-1) }).catch(() => {});
    } catch (err: any) {
      console.warn('Notice while deleting comment:', err?.message || err);
    }
  };

  // Delete own post
  const handleDeletePost = async () => {
    if (!post?.id || !isOwner || isDeleting) return;
    setIsDeleting(true);
    try {
      // 1. Invoke server-side deletion with ownership enforcement
      if (currentUserId) {
        await socialApi.deletePost(post.id, currentUserId).catch((err) => {
          console.warn('[PostCard] Server delete notification:', err?.message || err);
        });
      }

      // 2. Synchronize Firestore document
      const postRef = doc(db, 'posts', post.id);
      await deleteDoc(postRef).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
      });

      setShowDeleteConfirm(false);
      setShowMenu(false);
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err: any) {
      console.warn('Failed to delete post:', err?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMenu(false);
    }, 1500);
  };

  // Block author
  const handleBlockAuthor = async () => {
    if (!post?.authorId) return;
    try {
      await blockUser(post.authorId);
      setBlockMessage(`Blocked @${post.authorUsername}`);
      setTimeout(() => {
        setBlockMessage(null);
        setShowMenu(false);
      }, 1500);
    } catch (err) {
      console.warn('Failed to block user:', err);
    }
  };

  // Relative time helper
  const formatRelativeTime = (timestamp?: number | string) => {
    if (!timestamp) return 'Just now';
    const timeMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(timeMs)) return 'Just now';
    const diffSec = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  // Helper to highlight hashtags
  const renderTextWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('#')) {
        return (
          <span key={idx} className="text-[#ff2d60] font-semibold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      ref={cardRef}
      className="w-full bg-white dark:bg-[#11131b] border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xs dark:shadow-xl dark:shadow-black/20 transition-all duration-200 mb-5 relative"
    >
      {/* 1. Post Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={() => openUserProfile(post.authorId)}
          className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-none"
        >
          <div className="relative shrink-0 transition-transform group-hover:scale-105">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/10 shadow-2xs"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-black" />
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-bold text-[#0f172a] dark:text-white leading-none group-hover:text-[#ff2d60] transition-colors">
                {post.authorName}
              </h3>
              <span className="text-[10px] font-medium text-[#475569] dark:text-slate-400">
                {formatUsername(post.authorUsername)}
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[10px] font-medium text-[#475569] dark:text-slate-400">
                {formatRelativeTime(post.createdAt)}
              </span>

              {post.locationName && (
                <span className="inline-flex items-center space-x-0.5 text-[10px] text-[#ff2d60] font-medium bg-[#ff2d60]/10 px-2 py-0.5 rounded-full">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>{post.locationName}</span>
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Post Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Post options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-9 w-44 bg-white dark:bg-[#1a1d29] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl py-1.5 z-30 text-xs animate-fade-in divide-y divide-slate-100 dark:divide-white/5">
              {isOwner ? (
                // Owner actions
                <>
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#ff2d60]" />
                    <span>Edit Post</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                </>
              ) : (
                // Non-owner actions
                <>
                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (onOpenReportModal) onOpenReportModal(post.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>Report Post</span>
                  </button>
                  <button
                    onClick={handleBlockAuthor}
                    className="w-full text-left px-3.5 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center space-x-2 cursor-pointer font-medium"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{blockMessage || `Block @${post.authorUsername}`}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Quote Display (if present) */}
      {post.quoteText && (
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-gradient-to-r from-purple-100/90 via-pink-100/70 to-slate-100/50 dark:from-purple-900/40 dark:via-pink-900/30 dark:to-transparent border-l-4 border-[#ff2d60] relative overflow-hidden shadow-2xs">
          <p className="text-xs sm:text-sm font-serif italic text-[#0f172a] dark:text-white leading-relaxed feed-quote-text" data-quote-text>
            "{post.quoteText}"
          </p>
          {post.quoteAuthor && (
            <p className="text-[10px] sm:text-xs font-bold text-[#334155] dark:text-[#ff2d60] mt-1.5 uppercase tracking-wider feed-quote-author" data-quote-author>
              — {post.quoteAuthor}
            </p>
          )}
        </div>
      )}

      {/* 3. Text / Caption Content */}
      {post.caption && (
        <div className="px-4 py-3 text-xs text-[#0f172a] dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
          {renderTextWithHashtags(post.caption)}
        </div>
      )}

      {/* 4. Multi-Media Carousel (Instagram Style) */}
      {post.media && post.media.length > 0 && (
        isAuthorMediaHidden ? (
          <div className="mx-4 my-2 p-6 rounded-2xl bg-slate-100 dark:bg-[#141620] border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Media hidden by user privacy settings</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">@{post.authorUsername} has turned off media visibility.</p>
          </div>
        ) : (
        <div className="relative w-full bg-black/90 group overflow-hidden">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none w-full max-h-[460px]"
          >
            {post.media.map((item, idx) => (
              <div key={item.id || idx} className="w-full shrink-0 snap-center relative flex items-center justify-center bg-black">
                {item.type === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center min-h-[280px]">
                    <video
                      ref={videoRef}
                      src={item.url}
                      className="w-full max-h-[440px] object-contain cursor-pointer"
                      loop
                      muted={isMuted}
                      playsInline
                      onClick={() => setActiveTab('reels')}
                    />

                    {/* Reel World Quick Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('reels');
                      }}
                      className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 hover:bg-black/80 transition-all cursor-pointer shadow-lg z-10"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ff2d60] animate-pulse" />
                      <span>Watch in Reel World</span>
                    </button>

                    {/* Custom Video Overlay Controls */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayVideo();
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md">
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/80 z-10"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Post attachment ${idx + 1}`}
                    onClick={() => openPostViewer(post)}
                    className="w-full max-h-[460px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Pagination Counter Badge (e.g. 1 / 3) */}
          {post.media.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-white/10 shadow-md">
              {currentMediaIndex + 1} / {post.media.length}
            </div>
          )}

          {/* Desktop Left/Right Navigation Arrows */}
          {post.media.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => scrollToMediaIndex(currentMediaIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {currentMediaIndex < post.media.length - 1 && (
                <button
                  onClick={() => scrollToMediaIndex(currentMediaIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Dot Indicators */}
              <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center space-x-1.5 pointer-events-none">
                {post.media.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentMediaIndex ? 'w-4 bg-[#ff2d60]' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        )
      )}

      {/* 5. Engagement Action Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
        <div className="flex items-center space-x-5">
          {/* Like Button */}
          <button
            onClick={handleToggleLike}
            className={`flex items-center space-x-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isLiked ? 'text-[#ff2d60] scale-105' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 transition-transform ${isLiked ? 'fill-[#ff2d60] animate-bounce-once' : ''}`} />
            <span>{likeCount}</span>
          </button>

          {/* Comment Toggle Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentCount}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `got u Feed Post by ${post.authorName}`,
                  text: post.caption || post.quoteText || 'Check out this post on got u!',
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={`transition-colors cursor-pointer ${
            isBookmarked ? 'text-[#ff2d60]' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-[#ff2d60]' : ''}`} />
        </button>
      </div>

      {/* 6. Comment Section Drawer */}
      {showComments && (
        <div className="bg-slate-50 dark:bg-[#0b0c13] border-t border-slate-200 dark:border-white/10 p-4 space-y-3 animate-slide-down">
          {/* Moderation Warning Toast if blocked */}
          {commentModError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{commentModError}</span>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-2 italic">
                No comments yet. Be the first to start the conversation!
              </p>
            ) : (
              comments.map((c, idx) => (
                <div key={c.id ? `${c.id}-${idx}` : `comment-${idx}`} className="flex items-start space-x-2.5 group/c">
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 bg-white dark:bg-white/5 rounded-2xl p-2.5 border border-slate-200 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#0f172a] dark:text-white">{c.authorName}</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-[9px] font-medium text-[#475569] dark:text-slate-400">{formatRelativeTime(c.createdAt)}</span>
                        {c.authorId === currentUser.id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-400 hover:text-rose-500 opacity-0 group-hover/c:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#0f172a] dark:text-slate-300 mt-1 leading-snug">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-1">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
            />

            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment... (AI moderated)"
              className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
            />

            <button
              type="submit"
              disabled={isPostingComment || !newCommentText.trim()}
              className="w-8 h-8 rounded-full bg-[#ff2d60] text-white flex items-center justify-center shadow-md hover:opacity-95 transition-opacity disabled:opacity-40 shrink-0 cursor-pointer"
            >
              {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={(updated) => {
            // Updated in Firestore
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#12141c] text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Post?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to permanently delete this post? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
