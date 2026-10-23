import React, { useState } from 'react';
import { Bell, AtSign, MessageCircle, UserCheck, PhoneCall, Check, X, Heart, Video, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User, NotificationItem } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';

export const ActivityScreen: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    openChat,
    acceptFriendRequest,
    rejectFriendRequest,
    allUsers,
    openReel,
    openPostViewer,
    openUserProfile,
    setActiveTab,
    currentUser,
  } = useApp();

  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-[#ff2d60]" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-amber-400" />;
      case 'follow':
      case 'request':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'call':
        return <PhoneCall className="w-4 h-4 text-red-400" />;
      case 'video':
      case 'reel':
        return <Video className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    markNotificationAsRead(item.id);

    // 1. Reel-specific direct navigation (like on reel, comment on reel, mention on reel)
    const isReel =
      item.reelId ||
      item.entityType === 'reel' ||
      item.targetRoute?.includes('/reels') ||
      item.targetMetadata?.reelId;

    if (isReel) {
      const reelId = item.reelId || item.entityId || item.targetMetadata?.reelId;
      const commentId = item.commentId || item.replyId || item.targetMetadata?.commentId;
      if (reelId) {
        openReel(reelId, commentId);
        return;
      }
    }

    // 2. Post-specific direct navigation (like on post, comment on post, reply on post)
    const isPost =
      item.postId ||
      item.entityType === 'post' ||
      item.targetRoute?.includes('/posts') ||
      item.targetMetadata?.postId;

    if (isPost) {
      const postId = item.postId || item.entityId || item.targetMetadata?.postId;
      if (postId) {
        try {
          const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`);
          if (res.ok) {
            const data = await res.json();
            const postObj = data.post || data.data;
            if (postObj && postObj.id) {
              openPostViewer(postObj);
              return;
            }
          }
        } catch {}

        showToast('This post has been removed or is no longer available');
        return;
      }
    }

    // 3. Follow / Request direct navigation -> open user profile
    if (item.type === 'follow' || item.type === 'request' || item.targetRoute?.includes('/users')) {
      const targetUserId = item.actorUserId || item.senderUserId || item.entityId;
      if (targetUserId) {
        openUserProfile(targetUserId);
        return;
      }
    }

    // 4. Direct Message navigation -> open specific chat
    if (
      item.type === 'message' ||
      item.type === 'dm' ||
      item.targetRoute?.includes('/chats') ||
      item.conversationId
    ) {
      const chatId = item.conversationId || item.entityId || (item.senderUserId ? `dm_${item.senderUserId}` : null);
      if (chatId) {
        openChat(chatId);
        return;
      }
    }

    // 5. Missed Call navigation -> open calls tab
    if (item.type === 'call') {
      setActiveTab('calls');
      return;
    }

    // 6. Generic Mention / Reply fallback
    if (item.senderUserId) {
      openUserProfile(item.senderUserId);
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => markNotificationAsRead(n.id));
    if (currentUser?.id) {
      fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      }).catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-slate-100 dark:bg-[#0a0b0e] text-slate-900 dark:text-slate-100">
      {/* Toast Notice for Deleted Content */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-semibold shadow-2xl backdrop-blur-md border border-white/10 dark:border-black/10 transition-all animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between z-20 shrink-0 bg-white/90 dark:bg-[#0a0b0e]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Activity</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Mentions, replies & friend requests</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="text-xs font-semibold text-[#ff2d60] hover:underline cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Bell className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs text-slate-500 mt-1">Interactions on your posts and reels will appear here</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-3 relative ${
                item.isRead
                  ? 'bg-white dark:bg-[#141620]/60 border-slate-200/90 dark:border-white/5 text-slate-800 dark:text-slate-300 shadow-xs'
                  : 'bg-rose-50/90 dark:bg-gradient-to-r dark:from-[#ff2d60]/10 dark:via-[#141620] dark:to-[#141620] border-rose-300 dark:border-[#ff2d60]/40 text-slate-900 dark:text-slate-200 shadow-md shadow-rose-950/10'
              }`}
            >
              {/* Unread Small Red Indicator Badge */}
              {!item.isRead && (
                <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-[#ff2d60] shadow-[0_0_8px_#ff2d60] animate-pulse shrink-0" />
              )}

              {/* Avatar or Icon Badge */}
              <div
                onClick={(e) => {
                  if (item.userAvatar || item.senderUserId) {
                    e.stopPropagation();
                    const targetUser = allUsers.find((u) => u.id === item.senderUserId) || {
                      id: item.senderUserId || 'user_target',
                      fullName: item.title || 'User',
                      username: `@${(item.title || 'user').toLowerCase().replace(/\s+/g, '')}`,
                      email: '',
                      avatarUrl: item.userAvatar || '',
                      isOnline: true,
                    };
                    setSelectedUserForProfile(targetUser);
                  }
                }}
                className="relative shrink-0 mt-0.5 cursor-pointer group"
              >
                {item.userAvatar ? (
                  <img
                    src={item.userAvatar}
                    alt={item.title || 'Notification'}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-white/10 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                    {getIcon(item.type || 'system')}
                  </div>
                )}

                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-200 dark:bg-[#1e202e] border border-slate-300 dark:border-white/20 flex items-center justify-center shadow">
                  {getIcon(item.type || 'system')}
                </span>
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className={`text-xs truncate ${item.isRead ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-extrabold text-slate-900 dark:text-white'}`}>
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 ml-2">{item.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{item.description}</p>

                {item.type === 'request' && (
                  <div className="mt-2">
                    {item.actionState === 'accepted' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Friends Connected
                      </span>
                    ) : item.actionState === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        <X className="w-3 h-3" /> Request Declined
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptFriendRequest(item.senderUserId || 'user_jessica');
                            markNotificationAsRead(item.id);
                          }}
                          className="px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white shadow-md flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rejectFriendRequest(item.senderUserId || 'user_jessica');
                            markNotificationAsRead(item.id);
                          }}
                          className="px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}
    </div>
  );
};
