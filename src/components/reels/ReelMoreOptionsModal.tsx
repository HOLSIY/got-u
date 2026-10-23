import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  BarChart3,
  Flag,
  Bookmark,
  Volume2,
  Check,
  Music,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Post } from '../../types';
import { useApp } from '../../context/AppContext';

interface ReelMoreOptionsModalProps {
  post: Post;
  isSaved: boolean;
  onToggleSave: () => void;
  onOpenAnalytics?: () => void;
  onOpenAudio?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const ReelMoreOptionsModal: React.FC<ReelMoreOptionsModalProps> = ({
  post,
  isSaved,
  onToggleSave,
  onOpenAnalytics,
  onOpenAudio,
  onDelete,
  onClose,
}) => {
  const { currentUser, sendFriendRequest, friendRequests } = useApp();
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  const postAuthorId = post.authorId || (post as any).userId || post.author?.id;
  const cleanAuthorUsername = (post.authorUsername || (post as any).userUsername || post.author?.username || '').replace(/^@/, '').toLowerCase();
  const cleanCurrentUsername = (currentUser?.username || '').replace(/^@/, '').toLowerCase();
  const isMe =
    Boolean(currentUser?.id && (postAuthorId === currentUser.id || postAuthorId === (currentUser as any).uid)) ||
    Boolean((currentUser as any)?.uid && postAuthorId === (currentUser as any).uid) ||
    Boolean(cleanCurrentUsername && cleanAuthorUsername && cleanCurrentUsername === cleanAuthorUsername) ||
    currentUser?.role === 'admin';

  const isFriendOrPending = friendRequests[post.authorId] === 'accepted' || friendRequests[post.authorId] === 'pending_sent';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = () => {
    setReported(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" />

      <div className="relative w-full max-w-sm bg-white dark:bg-[#12141e] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-white/10 p-5 shadow-2xl z-10 text-slate-900 dark:text-white flex flex-col gap-3 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
          <div>
            <h3 className="text-sm font-bold">Reel Options</h3>
            {isMe && <span className="text-[10px] font-semibold text-[#ff2d60]">Creator Controls</span>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-black dark:text-slate-300 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-1 py-1">
          {/* Creator Analytics (If me or accessible) */}
          <button
            onClick={() => {
              onClose();
              onOpenAnalytics?.();
            }}
            className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-xs font-semibold"
          >
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="flex-1">View 7-Day Performance & Trends</span>
          </button>

          {/* Audio Info */}
          <button
            onClick={() => {
              onClose();
              onOpenAudio?.();
            }}
            className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-xs font-semibold"
          >
            <Music className="w-4 h-4 text-[#ff2d60]" />
            <span className="flex-1">Audio Track Details</span>
          </button>

          {/* Save / Bookmark */}
          <button
            onClick={() => {
              onToggleSave();
              onClose();
            }}
            className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-xs font-semibold"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
            <span className="flex-1">{isSaved ? 'Remove from Saved' : 'Save to Favorites'}</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-xs font-semibold"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span className="flex-1">{copied ? 'Link Copied!' : 'Copy Reel Link'}</span>
          </button>

          {/* Follow / Friend Creator */}
          {!isMe && !isFriendOrPending && (
            <button
              onClick={() => {
                sendFriendRequest(post.authorId);
                onClose();
              }}
              className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left text-xs font-semibold text-[#ff2d60]"
            >
              <UserPlus className="w-4 h-4" />
              <span className="flex-1">Follow @{post.authorUsername}</span>
            </button>
          )}

          {/* Report (for non-authors) */}
          {!isMe && (
            <button
              onClick={handleReport}
              className="w-full h-11 px-3 rounded-xl flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer text-left text-xs font-semibold text-rose-500"
            >
              <Flag className="w-4 h-4" />
              <span className="flex-1">{reported ? 'Reported to Moderation' : 'Report Reel'}</span>
            </button>
          )}

          {/* Authority Delete Option (Only for creator of this reel) */}
          {isMe && (
            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => {
                  onClose();
                  onDelete?.();
                }}
                className="w-full h-12 px-3 rounded-xl flex items-center gap-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left text-xs font-bold border border-rose-500/20 active:scale-98"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="font-bold text-sm">Delete Reel</span>
                  <span className="text-[10px] text-rose-500/80 dark:text-rose-300/70 font-normal">
                    Permanently delete your video from reels
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
