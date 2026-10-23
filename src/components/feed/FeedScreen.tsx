import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Sparkles,
  Flame,
  Clock,
  ShieldCheck,
  Search,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { ReportPostModal } from './ReportPostModal';
import { Post } from '../../types';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { GotULogo } from '../common/GotULogo';
import { useBranding } from '../../context/BrandingContext';
import { useApp } from '../../context/AppContext';
import { rankPostsPersonalized } from '../../utils/personalization';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { socialApi } from '../../services/api/socialApi';
import { feedCache } from '../../services/cache/clientCache';

// Lightweight Skeleton Card for instant visual feedback
const PostSkeleton: React.FC = () => (
  <div className="w-full bg-white dark:bg-[#11131b] border border-slate-200/80 dark:border-white/10 rounded-3xl p-4 shadow-xs mb-5 animate-pulse space-y-3">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded-md" />
        <div className="h-2.5 w-16 bg-slate-100 dark:bg-white/5 rounded-md" />
      </div>
    </div>
    <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/10 rounded-md" />
    <div className="h-36 w-full bg-slate-100 dark:bg-white/5 rounded-2xl" />
  </div>
);

export const FeedScreen: React.FC = () => {
  const { branding } = useBranding();
  const { currentUser } = useApp();

  // Synchronous cache retrieval for INSTANT non-blocking load
  const [posts, setPosts] = useState<Post[]>(() => {
    const cachedMem = feedCache.get('following_feed');
    if (cachedMem && Array.isArray(cachedMem) && cachedMem.length > 0) return cachedMem;
    try {
      const cached = localStorage.getItem('got_u_feed_posts_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'latest' | 'trending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState<boolean>(false);
  const touchStartY = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);

  // Scroll container ref
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // STRICT REQUIREMENT: Always start naturally at the very top of the Feed on load/open
  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Primary API Feed Fetcher with Keyset Pagination
  const fetchFeedPosts = useCallback(
    async (cursor: string | null = null, isRefresh = false) => {
      if (isFetchingRef.current && !isRefresh) return;
      isFetchingRef.current = true;

      if (isRefresh) {
        setIsPullRefreshing(true);
      } else if (!cursor) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await socialApi.getFollowingFeed({ cursor, limit: 20 });
        if (res.success && res.data && Array.isArray(res.data.posts)) {
          const newPosts = res.data.posts;
          setHasMore(res.data.hasMore);
          setNextCursor(res.data.nextCursor);

          setPosts((prev) => {
            const combined = isRefresh || !cursor ? newPosts : [...prev, ...newPosts];
            const seen = new Set<string>();
            const deduplicated: Post[] = [];
            for (const p of combined) {
              if (p && p.id && !seen.has(p.id)) {
                seen.add(p.id);
                deduplicated.push(p);
              }
            }
            feedCache.set('following_feed', deduplicated);
            try {
              localStorage.setItem('got_u_feed_posts_cache', JSON.stringify(deduplicated));
            } catch {}
            return deduplicated;
          });
        } else {
          syncFirestoreFallback();
        }
      } catch (err) {
        syncFirestoreFallback();
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsPullRefreshing(false);
        setPullDistance(0);
        isFetchingRef.current = false;
      }
    },
    []
  );

  // Firestore Fallback Synchronization
  const syncFirestoreFallback = useCallback(() => {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(25));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: Post[] = [];
            const seenIds = new Set<string>();
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const postObj = { ...data, id: docSnap.id } as Post;
              if (!seenIds.has(postObj.id)) {
                seenIds.add(postObj.id);
                fetched.push(postObj);
              }
            });
            setPosts(fetched);
            feedCache.set('following_feed', fetched);
          }
          setIsLoading(false);
          setIsPullRefreshing(false);
          setPullDistance(0);
        },
        () => {
          setIsLoading(false);
          setIsPullRefreshing(false);
          setPullDistance(0);
        }
      );
    } catch {
      setIsLoading(false);
      setIsPullRefreshing(false);
      setPullDistance(0);
      return () => {};
    }
  }, []);

  useEffect(() => {
    fetchFeedPosts(null);
  }, [fetchFeedPosts]);


  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (feedContainerRef.current && feedContainerRef.current.scrollTop <= 2) {
      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || touchStartY.current === null || isPullRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Only allow pulling down when at top
    if (diff > 0 && feedContainerRef.current && feedContainerRef.current.scrollTop <= 2) {
      // Apply rubber-band damping
      const damping = Math.min(80, diff * 0.45);
      setPullDistance(damping);
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    touchStartY.current = null;

    if (pullDistance > 45 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      setPullDistance(52);
      fetchFeedPosts(null, true);
    } else {
      setPullDistance(0);
    }
  };

  // Infinite scroll trigger with pagination safety
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (
      target.scrollHeight - target.scrollTop - target.clientHeight < 350 &&
      hasMore &&
      !isLoadingMore &&
      !isFetchingRef.current &&
      nextCursor
    ) {
      fetchFeedPosts(nextCursor);
    }
  };

  // Filter & Search logic with real personalized ranking
  const rankedAllPosts = React.useMemo(() => {
    return rankPostsPersonalized(posts, currentUser);
  }, [posts, currentUser]);

  const filteredPosts = rankedAllPosts.filter((p) => {
    // Filter out rejected posts
    if (p.moderationStatus === 'rejected') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const matchCaption = p.caption?.toLowerCase().includes(queryLower);
      const matchQuote = p.quoteText?.toLowerCase().includes(queryLower);
      const matchAuthor = p.authorName?.toLowerCase().includes(queryLower);
      const matchLocation = p.locationName?.toLowerCase().includes(queryLower);
      if (!matchCaption && !matchQuote && !matchAuthor && !matchLocation) return false;
    }

    // Filter tabs
    if (filter === 'latest') {
      // In latest tab, show purely chronological
      return true;
    }
    if (filter === 'trending') {
      return (p.likeCount || 0) + (p.commentCount || 0) >= 6;
    }
    return true;
  }).sort((a, b) => {
    if (filter === 'latest') {
      return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
    }
    return 0; // Maintain personalized order
  });

  return (
    <div
      ref={feedContainerRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full flex flex-col bg-slate-50 dark:bg-[#0a0b10] overflow-y-auto relative scroll-smooth overscroll-y-contain"
    >
      {/* Pull-to-refresh visual indicator banner */}
      {(pullDistance > 0 || isPullRefreshing) && (
        <div
          style={{ height: `${pullDistance}px` }}
          className="w-full overflow-hidden flex items-center justify-center transition-[height] duration-150 ease-out bg-slate-100/80 dark:bg-black/40 backdrop-blur-xs border-b border-slate-200/50 dark:border-white/5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 py-2">
            {isPullRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 text-[#ff2d60] animate-spin" />
                <span>Refreshing feed...</span>
              </>
            ) : pullDistance > 45 ? (
              <>
                <Sparkles className="w-4 h-4 text-[#ff2d60]" />
                <span>Release to refresh</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 text-slate-400 animate-bounce" />
                <span>Pull down to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sticky Top Header Bar with Safe Area Top Spacing */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0a0b10]/95 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 px-4 pt-3.5 pb-3 sm:pt-4 shadow-2xs">
        <div className="max-w-md mx-auto space-y-3">
          {/* Top Branding Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 shrink-0">
              <div className="shrink-0 flex items-center justify-center">
                <GotULogo size={38} variant="icon" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-extrabold text-[#0f172a] dark:text-white tracking-tight">
                    {branding.appName}
                  </h1>
                  <span className="flex items-center space-x-0.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>AI Moderated</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{branding.tagline}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex items-center justify-between space-x-2 pt-1">
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-[#ff2d60] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setFilter('latest')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
                  filter === 'latest'
                    ? 'bg-[#ff2d60] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Newest</span>
              </button>
              <button
                onClick={() => setFilter('trending')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
                  filter === 'trending'
                    ? 'bg-[#ff2d60] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Trending</span>
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="relative flex-1 max-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feed..."
                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-2 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#ff2d60]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed Vertical Scroll Stream */}
      <div className="flex-1 max-w-md mx-auto w-full px-3 py-4 space-y-4 pb-24">
        {isLoading && posts.length === 0 ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white dark:bg-[#11131c] rounded-3xl border border-slate-200 dark:border-white/10 p-8 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
              <GotULogo size={36} variant="icon" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your feed is quiet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                {searchQuery
                  ? `No posts matched "${searchQuery}". Try a different keyword.`
                  : 'Be the first to share a photo, video, or inspiring quote with the got u community!'}
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-purple-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create First Post</span>
            </button>
          </div>
        ) : (
          <>
            {filteredPosts.map((post, idx) => (
              <ErrorBoundary key={post?.id ? `${post.id}-${idx}` : `post-${idx}`} name="Post">
                <PostCard
                  post={post}
                  onOpenReportModal={(id) => setReportPostId(id)}
                />
              </ErrorBoundary>
            ))}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4 space-x-2 text-xs font-semibold text-slate-400">
                <Loader2 className="w-4 h-4 text-[#ff2d60] animate-spin" />
                <span>Loading more posts...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreatePostModal
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={() => {
            fetchFeedPosts(null, true);
          }}
        />
      )}

      {reportPostId && (
        <ReportPostModal
          postId={reportPostId}
          onClose={() => setReportPostId(null)}
        />
      )}
    </div>
  );
};

