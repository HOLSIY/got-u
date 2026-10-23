import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Eye,
  Lock,
  ChevronRight,
  LogOut,
  Edit,
  Camera,
  Settings,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Sparkles,
  Film,
  Play,
  FileText,
  Plus,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EditProfileModal } from './EditProfileModal';
import { SettingsScreen } from '../settings/SettingsScreen';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { MoodBadge } from './MoodBadge';
import { MoodSelectorModal } from './MoodSelectorModal';
import { Post } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ImageCropperModal } from '../media/ImageCropperModal';
import { uploadToCloudStorage } from '../../utils/cloudStorage';
import { formatUsername } from '../../utils/constants';

export const ProfileScreen: React.FC = () => {
  const {
    currentUser,
    setActiveTab,
    logout,
    openMediaViewer,
    openProfilePhotoViewer,
    openPostViewer,
    updateProfile,
    saveUserMood,
    chats,
    friendRequests,
  } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [lockChatEnabled, setLockChatEnabled] = useState(false);
  const [mediaVisibility, setMediaVisibility] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'photos' | 'reels'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState<boolean>(false);
  const [croppingCover, setCroppingCover] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch real persistent reels from backend
  const fetchUserReels = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingReels(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/reels`, {
        headers: {
          'x-user-id': currentUser.id,
          Authorization: `Bearer ${currentUser.id}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.reels || data.items || [];
        setUserReels(list);
      }
    } catch (e) {
      console.warn('Failed to fetch user reels in profile:', e);
    } finally {
      setIsLoadingReels(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchUserReels();
    const handleReelCreated = () => fetchUserReels();
    const handleReelDeleted = (e: any) => {
      const deletedId = e?.detail?.reelId;
      if (deletedId) {
        setUserReels((prev) => prev.filter((r) => r.id !== deletedId));
      } else {
        fetchUserReels();
      }
    };

    window.addEventListener('gotu:reel-created', handleReelCreated);
    window.addEventListener('gotu:reel-deleted', handleReelDeleted);
    return () => {
      window.removeEventListener('gotu:reel-created', handleReelCreated);
      window.removeEventListener('gotu:reel-deleted', handleReelDeleted);
    };
  }, [fetchUserReels]);

  const handleOpenReelFromProfile = (reel: any) => {
    window.dispatchEvent(new CustomEvent('gotu:open-reel', { detail: { reelId: reel.id } }));
    setActiveTab('reels');
  };

  // Real-time listener for current user's posts
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('authorId', '==', currentUser.id),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const fetched: Post[] = [];
          snap.forEach((d) => {
            fetched.push({ ...d.data(), id: d.id } as Post);
          });
          setUserPosts(fetched);
        },
        (err) => {
          console.warn('User posts listener notice:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('Failed to listen to user posts:', e);
    }
  }, [currentUser?.id]);

  const friendsCount = Object.values(friendRequests || {}).filter((s) => s === 'accepted').length;
  const groupsCount = chats.filter((c) => c.isGroup).length;
  const totalPostsCount = userPosts.length;

  // Extract all media items from user's posts
  const userMediaItems: { url: string; post: Post }[] = [];
  userPosts.forEach((post) => {
    if (post.media && post.media.length > 0) {
      post.media.forEach((m) => {
        userMediaItems.push({ url: m.url, post });
      });
    }
  });

  const handleCoverFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCroppingCover(file);
    }
    e.target.value = '';
  };

  const handleCoverCropConfirmed = async (blob: Blob, dataUrl: string) => {
    setCroppingCover(null);
    try {
      // Optimistic update
      await updateProfile({ coverUrl: dataUrl });
      const uploadRes = await uploadToCloudStorage(
        blob,
        `users/${currentUser.id}/cover_${Date.now()}.jpg`,
        { contentType: 'image/jpeg', compressType: 'cover' }
      );
      if (uploadRes.success && uploadRes.url) {
        await updateProfile({ coverUrl: uploadRes.url });
      }
    } catch (err) {
      console.warn('Cover upload error:', err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-y-auto bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100 pb-20">
      {/* Top Section: Cover Photo extending to the top of screen */}
      <div className="relative w-full h-64 sm:h-72 bg-slate-200 dark:bg-[#12141d] shrink-0 overflow-hidden group">
        {currentUser.coverUrl ? (
          <img
            src={currentUser.coverUrl}
            alt="Profile Cover"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#ff2d60]/40 via-[#762DFA]/40 to-[#00D4FF]/40 flex items-center justify-center text-xs text-white/60 font-semibold tracking-wide">
            Add Cover Photo
          </div>
        )}

        {/* Subtle Top & Bottom Gradient Transitions so cover image stays vivid & blends downward */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-slate-100/50 dark:via-[#0a0b0e]/50 to-slate-100 dark:to-[#0a0b0e] pointer-events-none z-10" />

        {/* Floating Top Nav Bar inside Cover Photo */}
        <div className="absolute top-4 inset-x-0 px-5 flex items-center justify-between z-20">
          <button
            onClick={() => setActiveTab('chats')}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all shadow-lg cursor-pointer"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => coverInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              title="Change Cover Photo"
            >
              <Camera className="w-3.5 h-3.5 text-[#ff2d60]" />
              <span>Edit Cover</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all shadow-lg cursor-pointer"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFileSelected}
          className="hidden"
        />
      </div>

      {/* Main Profile Header Info (overlaid slightly over cover photo transition) */}
      <div className="px-6 pt-0 pb-6 flex flex-col items-center text-center -mt-16 sm:-mt-20 z-20">
        {/* Profile Avatar */}
        <div
          className="relative mb-3 group cursor-pointer flex flex-col items-center"
          onClick={() => openProfilePhotoViewer(currentUser.avatarUrl, currentUser.fullName, currentUser.username)}
        >
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              referrerPolicy="no-referrer"
              className="w-28 h-28 rounded-full object-cover border-4 border-slate-100 dark:border-[#0a0b0e] shadow-2xl group-hover:scale-105 transition-all bg-slate-100 dark:bg-[#0a0b0e]"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
              className="absolute bottom-1 right-1 p-2.5 rounded-full bg-[#ff2d60] text-white border-2 border-white dark:border-[#0a0b0e] shadow-lg hover:scale-110 transition-transform cursor-pointer"
              title="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Display Name */}
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5 flex items-center justify-center gap-2 flex-wrap">
          <span>{currentUser.fullName}</span>
          <VerifiedBadge size="sm" />
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
          {currentUser.phone ? `${currentUser.phone} • ` : ''}{formatUsername(currentUser.username)}
        </p>

        {/* Feature 2: Live Mood Status Row */}
        <div className="mb-3 flex justify-center">
          <button
            onClick={() => setShowMoodSelector(true)}
            className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {currentUser.mood ? (
              <MoodBadge mood={currentUser.mood} size="md" isHidden={currentUser.isMoodHidden} showText={true} />
            ) : (
              <span className="text-xs text-purple-600 dark:text-purple-300 font-medium">Set Mood Status</span>
            )}
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider ml-1">Change</span>
          </button>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 max-w-sm mb-5 leading-relaxed">
          {currentUser.bio}
        </p>

        {/* Action Buttons Row: Edit Profile & Settings */}
        <div className="w-full flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] text-xs font-extrabold text-white shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Stat Summary Cards Row */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs dark:shadow-md">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Friends</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {friendsCount}
            </span>
          </div>

          <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs dark:shadow-md">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Groups</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {groupsCount}
            </span>
          </div>

          <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs dark:shadow-md">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Posts</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {totalPostsCount}
            </span>
          </div>
        </div>

        {/* Profile Content Navigation Tabs: POSTS, PHOTOS, REELS */}
        <div className="w-full mb-4">
          <div className="flex items-center justify-around border-b border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveProfileTab('posts')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                activeProfileTab === 'posts'
                  ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Posts</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 font-bold">
                {userPosts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveProfileTab('photos')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                activeProfileTab === 'photos'
                  ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 font-bold">
                {userMediaItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveProfileTab('reels')}
              className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                activeProfileTab === 'reels'
                  ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Reels</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#ff2d60]/15 text-[#ff2d60] font-bold">
                {userReels.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="w-full mb-6 text-left">
          {/* 1. REELS TAB: Real persistent Reels belonging to user */}
          {activeProfileTab === 'reels' && (
            <div>
              {isLoadingReels ? (
                <div className="w-full py-12 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#ff2d60]" />
                  <span className="text-xs font-semibold">Loading persistent Reels...</span>
                </div>
              ) : userReels.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                  {userReels.map((reel) => {
                    const thumb =
                      reel.media?.thumbnailUrl ||
                      reel.thumbnail_url ||
                      (reel.media && reel.media[0]?.thumbnailUrl) ||
                      (reel.media && reel.media[0]?.url);
                    const views =
                      reel.engagement?.views ||
                      reel.viewsCount ||
                      reel.views ||
                      0;

                    return (
                      <div
                        key={reel.id}
                        onClick={() => handleOpenReelFromProfile(reel)}
                        className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group border border-slate-200/80 dark:border-white/10 bg-slate-900 shadow-sm hover:shadow-lg transition-all"
                        title={reel.caption || 'Watch Reel'}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt="Reel thumbnail"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-950 to-slate-800 text-slate-400 p-2 text-center">
                            <Film className="w-6 h-6 text-white/50 mb-1" />
                            <span className="text-[10px] line-clamp-2 text-white/70">
                              {reel.caption || 'Reel'}
                            </span>
                          </div>
                        )}

                        {/* Bottom Gradient with views counter and play icon */}
                        <div className="absolute inset-x-0 bottom-0 p-2 pt-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white pointer-events-none">
                          <div className="flex items-center gap-1 text-[11px] font-bold drop-shadow">
                            <Play className="w-3 h-3 fill-white" />
                            <span>{views}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="w-full p-8 rounded-2xl bg-white dark:bg-[#141620] border border-slate-200/80 dark:border-white/5 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#ff2d60]/10 flex items-center justify-center text-[#ff2d60] mb-3">
                    <Film className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    No Reels shared yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                    Share vertical videos with original audio to GotU Reels.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reels')}
                    className="px-4 py-2 rounded-xl bg-[#ff2d60] hover:bg-[#ff2d60]/90 text-white text-xs font-bold transition-transform active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Reel</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. PHOTOS TAB: Photo media from real user posts */}
          {activeProfileTab === 'photos' && (
            <div>
              {userMediaItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {userMediaItems.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => openPostViewer(item.post)}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-white/10 shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt="User Media"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-[#141620] border border-slate-200/80 dark:border-white/5 text-center text-xs text-slate-400">
                  No photos shared yet. Add images to your posts in Feed!
                </div>
              )}
            </div>
          )}

          {/* 3. POSTS TAB: User's posts */}
          {activeProfileTab === 'posts' && (
            <div>
              {userPosts.length > 0 ? (
                <div className="space-y-2">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => openPostViewer(post)}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#141620] border border-slate-200 dark:border-white/5 cursor-pointer hover:border-[#ff2d60]/40 transition-colors"
                    >
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                        {post.caption || post.quoteText}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
                        <span>{post.likeCount || 0} likes</span>
                        <span>•</span>
                        <span>{post.commentCount || 0} comments</span>
                        {post.media && post.media.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#ff2d60] font-semibold">{post.media.length} media attached</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-[#141620] border border-slate-200/80 dark:border-white/5 text-center text-xs text-slate-400">
                  No posts shared yet. Create a post in Feed!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options List Cards */}
        <div className="w-full space-y-2 text-left">
          {/* Settings Shortcut */}
          <div
            onClick={() => setShowSettingsModal(true)}
            className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#181b29] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">App Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Media Visibility */}
          <div
            onClick={() => {
              const currentVal = currentUser.mediaVisibility !== false;
              updateProfile({ mediaVisibility: !currentVal });
            }}
            className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#181b29] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">Media visibility</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {currentUser.mediaVisibility !== false ? 'Visible to friends in feed & profile' : 'Hidden from feed & other users'}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentUser.mediaVisibility !== false ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {currentUser.mediaVisibility !== false ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* Lock Chat Toggle */}
          <div className="bg-white dark:bg-[#141620] border border-slate-200/90 dark:border-white/8 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">Lock Chat</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Require PIN or biometrics to open</span>
              </div>
            </div>
            <button
              onClick={() => setLockChatEnabled(!lockChatEnabled)}
              className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                lockChatEnabled ? 'bg-[#ff2d60] justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full mt-6 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal onClose={() => setShowEditModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e]">
          <SettingsScreen onClose={() => setShowSettingsModal(false)} />
        </div>
      )}

      {/* Feature 2: Mood Selector Modal */}
      <MoodSelectorModal
        isOpen={showMoodSelector}
        onClose={() => setShowMoodSelector(false)}
        currentMood={currentUser.mood}
        currentPrivacy={currentUser.moodPrivacy || 'public'}
        isMoodHidden={currentUser.isMoodHidden || false}
        onSaveMood={saveUserMood}
      />

      {/* Cover Image Cropper */}
      {croppingCover && (
        <ImageCropperModal
          imageSrc={croppingCover}
          aspectRatio={2.5}
          cropShape="rect"
          title="Crop Profile Cover"
          onCancel={() => setCroppingCover(null)}
          onConfirm={handleCoverCropConfirmed}
        />
      )}
    </div>
  );
};
