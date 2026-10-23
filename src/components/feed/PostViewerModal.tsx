import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MapPin,
  Quote,
  Send,
  Trash2,
  Sparkles,
  Loader2,
  Check,
  MoreVertical,
  Edit3,
  ShieldAlert,
  UserX,
  Link as LinkIcon,
} from 'lucide-react';
import { Post, PostComment } from '../../types';
import { useApp } from '../../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { EditPostModal } from './EditPostModal';
import { ReportPostModal } from './ReportPostModal';
import { formatUsername } from '../../utils/constants';
import { socialApi } from '../../services/api/socialApi';
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

interface PostViewerModalProps {
  post: Post;
  onClose: () => void;
}

export const PostViewerModal: React.FC<PostViewerModalProps> = ({ post: initialPost, onClose }) => {
  const { currentUser, blockUser } = useApp();

  const [post, setPost] = useState<Post>(initialPost);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(initialPost.isLikedByMe));
  const [likeCount, setLikeCount] = useState<number>(initialPost.likeCount || 0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(Boolean(initialPost.isBookmarkedByMe));
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [commentModError, setCommentModError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Menu and modal states
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  // Carousel & video state
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = currentUser?.id || (currentUser as any)?.uid;
  const postAuthorId = post?.authorId || (post as any)?.author_id || (post as any)?.author?.id || (post as any)?.userId;
  const isOwner = Boolean(currentUserId && postAuthorId && currentUserId === postAuthorId);

  // Real-time synchronization of post document
  useEffect(() => {
    if (!initialPost?.id) return;
    const postDocRef = doc(db, 'posts', initialPost.id);
    const unsubPost = onSnapshot(
      postDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPost({ ...data, id: snap.id } as Post);
          if (typeof data.likeCount === 'number') {
            setLikeCount(data.likeCount);
          }
        }
      },
      (err) => {
        console.warn('Post doc listener notice:', err);
      }
    );
    return () => unsubPost();
  }, [initialPost?.id]);

  // Real-time synchronization of likes and comments
  useEffect(() => {
    if (!post?.id || !currentUser?.id) return;

    let unsubLikes = () => {};
    let unsubComments = () => {};

    try {
      // Like doc listener
      const likeDocRef = doc(db, 'posts', post.id, 'likes', currentUser.id);
      unsubLikes = onSnapshot(
        likeDocRef,
        (snap) => {
          setIsLiked(snap.exists());
        },
        (err) => {
          console.warn('Post likes listener notice:', err);
        }
      );

      // Comments query listener
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
      unsubComments = onSnapshot(
        commentsQuery,
        (snapshot) => {
          const fetched: PostComment[] = [];
          const seenIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const c = { ...docSnap.data(), id: docSnap.id } as PostComment;
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              fetched.push(c);
            }
          });
          setComments(fetched);
        },
        (err) => {
          console.warn('Post comments listener notice:', err);
        }
      );
    } catch (e) {
      console.warn('Realtime post listener warning:', e);
    }

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [post?.id, currentUser?.id]);

  // Like Toggle
  const handleToggleLike = async () => {
    if (!post?.id || !currentUser?.id) return;
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

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
      console.warn('Like toggle notice:', err?.message || err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.id || !currentUser?.id || !newCommentText.trim() || isPostingComment) return;

    setCommentModError(null);
    setIsPostingComment(true);

    try {
      // Optional AI moderation check
      try {
        const modRes = await fetch('/api/feed/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newCommentText }),
        });
        const modResult = await modRes.json();
        if (modResult && modResult.isSafe === false) {
          setCommentModError(modResult.reason || 'Comment blocked by AI Safety System.');
          setIsPostingComment(false);
          return;
        }
      } catch {
        // Fallback if moderation route unavailable
      }

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

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, { commentCount: increment(1) }).catch(() => {});

      setNewCommentText('');
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.warn('Notice while adding comment:', err?.message || err);
      setCommentModError('Unable to post comment at the moment. Please try again.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Delete Comment
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

  // Share action
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post?.authorName || 'User'} on got u`,
        text: post?.caption || post?.quoteText || 'Check out this post on got u!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
          console.warn('[PostViewer] Server delete notification:', err?.message || err);
        });
      }

      // 2. Synchronize Firestore document
      const postRef = doc(db, 'posts', post.id);
      await deleteDoc(postRef).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
      });
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      console.warn('Failed to delete post from viewer:', err?.message || err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Block author
  const handleBlockAuthor = async () => {
    if (!post?.authorId) return;
    try {
      await blockUser(post.authorId);
      setBlockMessage(`Blocked @${post.authorUsername || 'user'}`);
      setTimeout(() => {
        setBlockMessage(null);
        setShowMenu(false);
      }, 1500);
    } catch (err) {
      console.warn('Failed to block user:', err);
    }
  };

  // Format relative time helper
  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return 'Just now';
    const timeMs = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
    if (isNaN(timeMs)) return 'Just now';
    const diffSec = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const hasMedia = post.media && post.media.length > 0;
  const currentMedia = hasMedia ? post.media[currentMediaIndex] : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#10121a] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 dark:border-white/10 flex flex-col md:flex-row"
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer z-30 shadow-lg"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side / Main Media Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px] max-h-[50vh] md:max-h-[85vh] overflow-hidden select-none">
          {hasMedia && currentMedia ? (
            currentMedia.type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={currentMedia.url}
                  poster={currentMedia.thumbnailUrl}
                  loop
                  playsInline
                  muted={isMuted}
                  className="max-h-[85vh] max-w-full object-contain"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }
                  }}
                />
                {/* Play/Pause overlay */}
                {!isPlaying && (
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                        setIsPlaying(true);
                      }
                    }}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white cursor-pointer"
                  >
                    <Play className="w-6 h-6 ml-1" />
                  </button>
                )}
                {/* Sound toggle */}
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) videoRef.current.muted = !isMuted;
                  }}
                  className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/80"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <img
                src={currentMedia.url}
                alt={post.caption || 'Post media'}
                referrerPolicy="no-referrer"
                className="max-h-[85vh] max-w-full object-contain"
              />
            )
          ) : post.quoteText ? (
            <div className="p-8 text-center flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white w-full h-full min-h-[300px]">
              <Quote className="w-10 h-10 text-[#ff2d60] mb-4 opacity-80" />
              <p className="text-lg md:text-xl font-bold italic leading-relaxed max-w-md">
                "{post.quoteText}"
              </p>
              {post.quoteAuthor && (
                <span className="text-xs text-slate-400 font-semibold mt-3 tracking-wide">
                  — {post.quoteAuthor}
                </span>
              )}
            </div>
          ) : (
            <div className="p-8 text-center flex items-center justify-center text-slate-400 text-sm">
              {post.caption || 'Post details'}
            </div>
          )}

          {/* Multiple Media Carousel Navigation Controls */}
          {hasMedia && post.media.length > 1 && (
            <>
              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer backdrop-blur-xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {currentMediaIndex < post.media.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex((prev) => Math.min(post.media.length - 1, prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer backdrop-blur-xs"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              {/* Pagination Dots */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
                {post.media.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentMediaIndex ? 'bg-[#ff2d60] w-4' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Author Info, Caption, Comments, Engagement Actions */}
        <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col h-[400px] md:h-[85vh] bg-white dark:bg-[#10121a] text-slate-900 dark:text-slate-100">
          {/* Header: Author Row */}
          <div className="p-4 border-b border-slate-200/90 dark:border-white/10 flex items-center gap-3 shrink-0 relative">
            <img
              src={post.authorAvatar}
              alt={post.authorName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {post.authorName}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                <span>{formatUsername(post.authorUsername)}</span>
                <span>•</span>
                <span>{formatTime(post.createdAt)}</span>
              </p>
            </div>
            {post.locationName && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#ff2d60] font-semibold bg-[#ff2d60]/10 px-2 py-0.5 rounded-full shrink-0">
                <MapPin className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">{post.locationName}</span>
              </span>
            )}

            {/* Post Options Menu in Viewer */}
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
                        onClick={handleShare}
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
                    <>
                      <button
                        onClick={handleShare}
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
                          setShowReportModal(true);
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

          {/* Scrollable Comments & Caption Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {/* Post Caption as Primary Item */}
            {post.caption && (
              <div className="flex gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0 leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                    {post.authorName}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 break-words">
                    {post.caption}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">
                    {formatTime(post.createdAt)}
                  </span>
                </div>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[11px]">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 items-start group">
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-100 dark:bg-white/5 p-2.5 rounded-2xl border border-slate-200/60 dark:border-white/5">
                      <span className="font-bold text-[11px] text-slate-900 dark:text-white block">
                        {c.authorName}
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 break-words mt-0.5 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{formatTime(c.createdAt)}</span>
                      {(c.authorId === currentUser.id || post.authorId === currentUser.id) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Engagement Actions Row */}
          <div className="p-4 border-t border-slate-200/90 dark:border-white/10 shrink-0 bg-slate-50/60 dark:bg-[#141620]/60">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  onClick={handleToggleLike}
                  className="flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-90 cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isLiked
                        ? 'fill-[#ff2d60] text-[#ff2d60]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#ff2d60]'
                    }`}
                  />
                  <span className={isLiked ? 'text-[#ff2d60]' : 'text-slate-700 dark:text-slate-300'}>
                    {likeCount}
                  </span>
                </button>

                {/* Comment Counter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <MessageCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span>{comments.length}</span>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                  title="Share Post"
                >
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Bookmark Button */}
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current text-[#ff2d60]' : ''}`} />
              </button>
            </div>

            {/* Error banner if moderation failed */}
            {commentModError && (
              <p className="text-[10px] text-red-500 font-semibold mb-2">{commentModError}</p>
            )}

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-9 px-3.5 rounded-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#ff2d60]"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || isPostingComment}
                className="w-9 h-9 rounded-full bg-[#ff2d60] hover:bg-[#ff2d60]/90 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-all shrink-0"
              >
                {isPostingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={(updated) => {
            setPost((prev) => ({ ...prev, ...updated }));
          }}
        />
      )}

      {/* Report Post Modal */}
      {showReportModal && (
        <ReportPostModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
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
