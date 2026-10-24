import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquare,
  Phone,
  Video,
  UserCheck,
  UserPlus,
  UserMinus,
  Clock,
  Check,
  Ban,
  Lock,
  Unlock,
  Image as ImageIcon,
  Users,
  Shield,
  Film,
  Play,
  FileText,
  Loader2,
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { MoodBadge } from './MoodBadge';
import { useApp } from '../../context/AppContext';
import { User, Post } from '../../types';
import { SetPINModal } from '../auth/SetPINModal';
import { PINUnlockModal } from '../auth/PINUnlockModal';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { registerGlobalUser, getAllGlobalUsers } from '../../utils/userSearch';
import { formatUsername } from '../../utils/constants';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  const {
    currentUser,
    createNewChatWithUser,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockedUsers,
    blockUser,
    unblockUser,
    chats,
    startCall,
    lockChatWithPin,
    unlockChatWithPin,
    removeChatLock,
    openMediaViewer,
    openProfilePhotoViewer,
    openPostViewer,
    setActiveTab,
  } = useApp();

  const [liveUser, setLiveUser] = useState<User>(user);
  const [showSetPin, setShowSetPin] = useState(false);
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'photos' | 'reels'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState<boolean>(false);

  // Fetch target user's real persistent reels
  const fetchTargetUserReels = useCallback(async () => {
    if (!liveUser?.id) return;
    setIsLoadingReels(true);
    try {
      const res = await fetch(`/api/users/${liveUser.id}/reels`, {
        headers: {
          'x-user-id': currentUser?.id || liveUser.id,
          Authorization: `Bearer ${currentUser?.id || liveUser.id}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.reels || data.items || [];
        setUserReels(list);
      }
    } catch (e) {
      console.warn('Failed to fetch user reels in modal:', e);
    } finally {
      setIsLoadingReels(false);
    }
  }, [liveUser?.id, currentUser?.id]);

  useEffect(() => {
    fetchTargetUserReels();
  }, [fetchTargetUserReels]);

  const handleOpenReel = (reel: any) => {
    onClose();
    window.dispatchEvent(new CustomEvent('gotu:open-reel', { detail: { reelId: reel.id } }));
    setActiveTab?.('reels');
  };

  // Listen to user's real posts
  useEffect(() => {
    if (!liveUser?.id) return;
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef,
        where('authorId', '==', liveUser.id),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      const unsub = onSnapshot(q, (snap) => {
        const fetched: Post[] = [];
        snap.forEach((d) => {
          fetched.push({ ...d.data(), id: d.id } as Post);
        });
        setUserPosts(fetched);
      }, (e) => {
        console.warn('UserProfileModal posts listener notice:', e);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error querying user posts:', e);
    }
  }, [liveUser?.id]);

  // Sync / load canonical user document from Firestore in real-time
  useEffect(() => {
    setLiveUser(user);
    if (!user?.id) return;

    // 1. If viewing current user, use currentUser directly
    if (user.id === currentUser.id) {
      setLiveUser(currentUser);
      return;
    }

    // 2. Check cached global users list
    const cached = getAllGlobalUsers().find((u) => u.id === user.id);
    if (cached) {
      setLiveUser((prev) => ({
        ...prev,
        ...cached,
        coverUrl: cached.coverUrl || prev.coverUrl,
      }));
    }

    // 3. Firestore doc listener for canonical user document
    const userRef = doc(db, 'users', user.id);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const canonical: User = {
            id: user.id,
            fullName: d.name || d.fullName || user.fullName || 'Nexus User',
            username: d.username || user.username || '@nexus',
            email: d.email || user.email || '',
            avatarUrl: d.avatarUrl || d.photoURL || user.avatarUrl,
            coverUrl: d.coverUrl || d.coverPhoto || d.coverImage || user.coverUrl,
            bio: d.bio ?? user.bio,
            phone: d.phone ?? user.phone,
            mood: d.mood ?? user.mood,
            isMoodHidden: d.isMoodHidden ?? user.isMoodHidden,
            isOnline: d.status === 'online' || user.isOnline,
            messagesCount: d.messagesCount ?? user.messagesCount,
            groupsCount: d.groupsCount ?? user.groupsCount,
            spacesCount: d.spacesCount ?? user.spacesCount,
          };
          setLiveUser(canonical);
          registerGlobalUser(canonical);
        }
      },
      (err) => {
        console.warn('Live user profile subscription notice:', err);
      }
    );

    return () => unsub();
  }, [user?.id, currentUser]);

  const isMe = liveUser.id === currentUser.id;
  const friendStatus = friendRequests[liveUser.id] || 'none';
  const isBlocked = blockedUsers.includes(liveUser.id);

  // Check if a private chat exists with this user
  const privateChat = chats.find(
    (c) => !c.isGroup && c.members?.some((m) => m.id === liveUser.id)
  );

  const handleFriendAction = () => {
    if (friendStatus === 'accepted') {
      createNewChatWithUser(liveUser);
      onClose();
    } else if (friendStatus === 'none') {
      sendFriendRequest(liveUser.id);
    } else if (friendStatus === 'pending_received') {
      acceptFriendRequest(liveUser.id);
    }
  };

  // Determine cover image: ONLY use default if NO real cover image exists anywhere
  const realCover =
    liveUser.coverUrl ||
    (liveUser as any).coverPhoto ||
    (liveUser as any).coverImage ||
    user.coverUrl ||
    (user as any).coverPhoto ||
    (user as any).coverImage;

  const DEFAULT_COVER =
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200';

  const coverUrlToRender = realCover && realCover.trim().length > 0 ? realCover : DEFAULT_COVER;

  // Determine avatar
  const avatarToRender = liveUser.avatarUrl || user.avatarUrl;

  return (
    <>
      {/* Full screen profile view container with zero outer side margins */}
      <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100 flex flex-col w-full h-full overflow-y-auto no-scrollbar animate-in fade-in duration-200">
        <div className="w-full max-w-2xl mx-auto min-h-full flex flex-col relative bg-white dark:bg-[#0a0b0e] shadow-2xl">
          {/* Edge-to-Edge Cover Photo Banner spanning 100% width */}
          <div className="relative w-full h-64 sm:h-72 shrink-0 overflow-hidden bg-slate-200 dark:bg-[#12141d]">
            <img
              src={coverUrlToRender}
              alt="Profile Cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover select-none"
            />
            {/* Top Subtle Vignette overlay for readable close button */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />

            {/* Bottom Gentle Edge Transition fading naturally into page background */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-white/50 dark:via-[#0a0b0e]/50 to-white dark:to-[#0a0b0e] pointer-events-none z-10" />

            {/* Floating Glass Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9.5 h-9.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer z-30 shadow-xl"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Details Header — Overlaps lower part of cover transition naturally */}
          <div className="px-5 sm:px-8 pb-10 -mt-16 sm:-mt-20 relative z-20 flex flex-col items-center text-center space-y-3.5 flex-1">
            {/* Avatar Photo */}
            <div
              onClick={() => openProfilePhotoViewer(avatarToRender, liveUser.fullName, liveUser.username)}
              className="relative cursor-pointer group flex flex-col items-center"
            >
              <div className="relative">
                <img
                  src={avatarToRender}
                  alt={liveUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-[#0a0b0e] shadow-2xl bg-white dark:bg-[#0a0b0e] group-hover:scale-105 transition-transform"
                />
              </div>
            </div>

            {/* User Full Name & Username */}
            <div className="pt-0.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2 flex-wrap">
                <span>{liveUser.fullName}</span>
                <VerifiedBadge size="sm" />
                {isMe && (
                  <span className="text-[10px] bg-[#ff2d60]/20 text-[#ff2d60] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    YOU
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-[#ff2d60] mt-0.5">
                {formatUsername(liveUser.username)}
              </p>

              {/* Live Mood Status Badge */}
              {liveUser.mood && (
                <div className="mt-2 flex justify-center">
                  <MoodBadge mood={liveUser.mood} size="md" isHidden={liveUser.isMoodHidden} />
                </div>
              )}
            </div>

            {/* Bio Box */}
            {liveUser.bio && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 w-full max-w-lg bg-slate-50 dark:bg-white/[0.03] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-left leading-relaxed shadow-xs">
                "{liveUser.bio}"
              </p>
            )}

            {/* Stats Bar */}
            <div className="w-full max-w-lg grid grid-cols-3 gap-2 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-[#12141d] border border-slate-200 dark:border-white/5 text-center shadow-inner">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">{userPosts.length}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Posts</span>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">{liveUser.groupsCount || chats.filter(c => c.isGroup && c.members?.some(m => m.id === liveUser.id)).length}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Groups</span>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">{friendStatus === 'accepted' ? 'Friend' : 'Member'}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Status</span>
              </div>
            </div>

            {/* Connection Actions (Visible for other users) */}
            {!isMe && (
              <div className="w-full max-w-lg flex flex-col gap-2.5 pt-1">
                {/* Primary Friend / Message Action */}
                {friendStatus === 'accepted' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          createNewChatWithUser(liveUser);
                          onClose();
                        }}
                        className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#ff2d60] to-[#ff6b35] text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer transition-all"
                      >
                        <MessageSquare className="w-4.5 h-4.5" />
                        <span>Send Message</span>
                      </button>

                      <button
                        onClick={() => removeFriend(liveUser.id)}
                        className="h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors"
                        title="Remove Friend"
                      >
                        <UserMinus className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          startCall(liveUser, 'audio');
                          onClose();
                        }}
                        className="flex-1 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Audio Call</span>
                      </button>
                      <button
                        onClick={() => {
                          startCall(liveUser, 'video');
                          onClose();
                        }}
                        className="flex-1 h-10 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        <span>Video Call</span>
                      </button>
                    </div>
                  </div>
                ) : friendStatus === 'none' ? (
                  <button
                    onClick={handleFriendAction}
                    className="w-full h-12 rounded-2xl bg-[#ff2d60] hover:bg-[#ff2d60]/90 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <UserPlus className="w-4.5 h-4.5" />
                    <span>Send Friend Request</span>
                  </button>
                ) : friendStatus === 'pending_received' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(liveUser.id)}
                      className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-4.5 h-4.5" />
                      <span>Accept Request</span>
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(liveUser.id)}
                      className="h-12 px-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 h-12 rounded-2xl bg-white/10 text-amber-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2">
                      <Clock className="w-4.5 h-4.5" />
                      <span>Request Pending</span>
                    </div>
                    <button
                      onClick={() => cancelFriendRequest(liveUser.id)}
                      className="h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center cursor-pointer"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                )}

                {/* Chat Lock Option */}
                {privateChat && (
                  <button
                    onClick={() => {
                      if (privateChat.isLocked) {
                        setShowUnlockPin(true);
                      } else {
                        setShowSetPin(true);
                      }
                    }}
                    className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {privateChat.isLocked ? (
                      <>
                        <Unlock className="w-4 h-4 text-amber-400" />
                        <span>Unlock Private Chat</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Lock Private Chat with PIN</span>
                      </>
                    )}
                  </button>
                )}

                {/* Block/Unblock Option — Always in normal vertical flow */}
                <button
                  onClick={() => {
                    if (isBlocked) {
                      unblockUser(liveUser.id);
                    } else {
                      if (confirm(`Are you sure you want to block ${liveUser.fullName}?`)) {
                        blockUser(liveUser.id);
                      }
                    }
                  }}
                  className={`w-full h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isBlocked
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>{isBlocked ? 'Unblock Account' : 'Block Account'}</span>
                </button>
              </div>
            )}

            {/* Tabs: POSTS, PHOTOS, REELS */}
            <div className="w-full max-w-lg pt-4 text-left">
              <div className="flex items-center justify-around border-b border-slate-200 dark:border-white/10 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveProfileTab('posts')}
                  className={`pb-2.5 px-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                    activeProfileTab === 'posts'
                      ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Posts</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 font-bold">
                    {userPosts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProfileTab('photos')}
                  className={`pb-2.5 px-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                    activeProfileTab === 'photos'
                      ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 font-bold">
                    {userPosts.reduce((acc, p) => acc + (p.media?.length || 0), 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProfileTab('reels')}
                  className={`pb-2.5 px-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer relative ${
                    activeProfileTab === 'reels'
                      ? 'text-[#ff2d60] border-b-2 border-[#ff2d60]'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Reels</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ff2d60]/15 text-[#ff2d60] font-bold">
                    {userReels.length}
                  </span>
                </button>
              </div>

              {!isMe && liveUser.mediaVisibility === false ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-1">
                    <Lock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Media hidden by user</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">@{liveUser.username} has set media visibility to OFF.</p>
                </div>
              ) : activeProfileTab === 'reels' ? (
                <div>
                  {isLoadingReels ? (
                    <div className="w-full py-8 flex flex-col items-center justify-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mb-1 text-[#ff2d60]" />
                      <span className="text-xs">Loading Reels...</span>
                    </div>
                  ) : userReels.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
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
                            onClick={() => handleOpenReel(reel)}
                            className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-white/10 bg-slate-900 shadow-xs hover:shadow-md transition-all"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt="Reel"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-2 text-center text-slate-400">
                                <Film className="w-5 h-5 text-white/50 mb-1" />
                                <span className="text-[9px] line-clamp-2 text-white/70">{reel.caption || 'Reel'}</span>
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-1.5 pt-4 bg-gradient-to-t from-black/80 to-transparent flex items-center text-white pointer-events-none">
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                <Play className="w-2.5 h-2.5 fill-white" />
                                <span>{views}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center text-xs text-slate-400">
                      No Reels uploaded yet.
                    </div>
                  )}
                </div>
              ) : activeProfileTab === 'photos' ? (
                <div>
                  {userPosts.some((p) => p.media && p.media.length > 0) ? (
                    <div className="grid grid-cols-3 gap-2">
                      {userPosts.flatMap((p) => (p.media || []).map((m, idx) => ({ m, p, idx }))).map(({ m, p, idx }) => (
                        <div
                          key={`${p.id}-${idx}`}
                          onClick={() => openPostViewer(p)}
                          className="aspect-square rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#12141d]"
                        >
                          <img
                            src={m.url}
                            alt="Photo"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center text-xs text-slate-400">
                      No photos shared yet.
                    </div>
                  )}
                </div>
              ) : (
                /* Posts Tab */
                <div>
                  {userPosts.length > 0 ? (
                    <div className="space-y-2">
                      {userPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => openPostViewer(post)}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 cursor-pointer hover:border-[#ff2d60]/30 transition-colors"
                        >
                          <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                            {post.caption || post.quoteText}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {post.likeCount || 0} likes • {post.commentCount || 0} comments
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center text-xs text-slate-400">
                      No public posts yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Set 4-Digit PIN Modal */}
      {showSetPin && privateChat && (
        <SetPINModal
          title={`Lock Chat with ${liveUser.fullName}`}
          onSavePin={(pin) => {
            lockChatWithPin(privateChat.id, pin);
            setShowSetPin(false);
          }}
          onClose={() => setShowSetPin(false)}
        />
      )}

      {/* Unlock PIN Verification Modal */}
      {showUnlockPin && privateChat && (
        <PINUnlockModal
          chatTitle={liveUser.fullName}
          onUnlock={(pin) => {
            const ok = unlockChatWithPin(privateChat.id, pin);
            if (ok) {
              removeChatLock(privateChat.id);
              setShowUnlockPin(false);
            }
            return ok;
          }}
          onClose={() => setShowUnlockPin(false)}
        />
      )}
    </>
  );
};
