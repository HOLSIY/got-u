import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Send, Heart, Eye, Globe, Users, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { UserProfileModal } from '../profile/UserProfileModal';

interface StoryViewerModalProps {
  story?: Story;
  userStories?: Story[];
  allStoryGroups?: Story[][];
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  userStories: initialUserStories,
  allStoryGroups,
  onClose,
}) => {
  const { deleteStory, currentUser, friendRequests, markStoryAsSeen, reactToStory, sendMessage, createNewChatWithUser } = useApp();

  // Determine active list of stories for this user
  const storiesList = initialUserStories && initialUserStories.length > 0
    ? initialUserStories
    : (story ? [story] : []);

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);

  const activeStoryGroup = (allStoryGroups && allStoryGroups[currentGroupIndex]) || storiesList;
  const currentStory = activeStoryGroup[currentStoryIndex] || activeStoryGroup[0] || story;

  useEffect(() => {
    if (!currentStory) {
      onClose();
    }
  }, [currentStory, onClose]);

  if (!currentStory) {
    return null;
  }

  const isOwner = Boolean(currentStory.isYou || (currentUser?.id && currentStory.userId === currentUser.id));
  const isFriend = friendRequests[currentStory.userId] === 'accepted';

  // Mark active story as seen
  useEffect(() => {
    if (currentStory) {
      markStoryAsSeen(currentStory.id);
    }
  }, [currentStory?.id]);

  // Handle story progress timer
  useEffect(() => {
    if (isPaused || isInputFocused || showViewersSheet || replyText.trim().length > 0) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNextStory();
          return 0;
        }
        return prev + 2; // 50 ticks * 100ms = 5s
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, isInputFocused, showViewersSheet, replyText, currentStoryIndex, currentGroupIndex]);

  const handleNextStory = () => {
    setProgress(0);
    if (currentStoryIndex < activeStoryGroup.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (allStoryGroups && currentGroupIndex < allStoryGroups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    setProgress(0);
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentGroupIndex > 0 && allStoryGroups) {
      setCurrentGroupIndex((prev) => prev - 1);
      const prevGroup = allStoryGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup ? prevGroup.length - 1 : 0);
    } else {
      setProgress(0);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() && currentStory) {
      const chatId = await createNewChatWithUser({
        id: currentStory.userId,
        fullName: currentStory.userName,
        username: '@' + currentStory.userName.toLowerCase(),
        email: '',
        avatarUrl: currentStory.userAvatar,
        isOnline: true,
      });
      sendMessage(chatId, `Replied to story: "${replyText}"`);
      setReplyText('');
      setIsInputFocused(false);
      setReactionBurst('💌');
      setTimeout(() => setReactionBurst(null), 1200);
    }
  };

  const handleEmojiReact = (emoji: string) => {
    if (currentStory) {
      reactToStory(currentStory.id, emoji);
      setReactionBurst(emoji);
      setTimeout(() => setReactionBurst(null), 1200);
    }
  };

  const viewers = Array.isArray(currentStory.viewers) ? currentStory.viewers : [];
  const reactions = Array.isArray(currentStory.reactions) ? currentStory.reactions : [];

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center story-viewer-content">
      {/* Story Container */}
      <div
        className="relative w-full h-full max-w-sm bg-slate-900 flex flex-col justify-between overflow-hidden shadow-2xl"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Background Image / Media */}
        <img
          src={currentStory.thumbnailUrl || currentStory.mediaUrl}
          alt={currentStory.userName}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 z-1 pointer-events-none" />

        {/* Tap Left / Right Navigation Touch Zones */}
        <div className="absolute inset-y-16 inset-x-0 z-10 flex">
          <div
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }}
            className="w-1/3 h-full cursor-pointer flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }}
            className="w-2/3 h-full cursor-pointer flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Floating Burst Animation */}
        {reactionBurst && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center animate-ping">
            <span className="text-6xl">{reactionBurst}</span>
          </div>
        )}

        {/* Top Header Controls */}
        <div className="relative z-20 p-4 space-y-3">
          {/* Segmented Progress Indicators (Instagram Style ━━ ━━ ━━) */}
          <div className="flex items-center gap-1.5 w-full">
            {activeStoryGroup.map((_, idx) => {
              let widthPct = 0;
              if (idx < currentStoryIndex) widthPct = 100;
              else if (idx === currentStoryIndex) widthPct = progress;
              else widthPct = 0;

              return (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Info Bar */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                setIsPaused(true);
                const storyUser: User = {
                  id: currentStory.userId,
                  fullName: currentStory.userName,
                  username: `@${currentStory.userName.toLowerCase().replace(/\s+/g, '')}`,
                  email: '',
                  avatarUrl: currentStory.userAvatar,
                  isOnline: true,
                };
                setSelectedUserForProfile(storyUser);
              }}
              className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity z-30"
            >
              <img
                src={currentStory.userAvatar}
                alt={currentStory.userName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                    <span>{currentStory.userName}</span>
                    <VerifiedBadge size="xs" showText={false} />
                  </h3>
                  {currentStory.privacy === 'close_friends' ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/40 text-emerald-200 border border-emerald-400/40 flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" /> Close Friends
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-slate-200 border border-white/20 flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-300">{currentStory.timestamp}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 z-30">
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this story?')) {
                      deleteStory(currentStory.id);
                      onClose();
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-red-400 flex items-center justify-center cursor-pointer border border-white/20"
                  title="Delete story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center cursor-pointer border border-white/20"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Caption (If Any) */}
        {currentStory.caption && (
          <div className="relative z-20 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-white bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 inline-block shadow-2xl">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Bottom Bar: Analytics for Owner vs Interactive Bar for Viewers */}
        <div className="relative z-20 p-4">
          {isOwner ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewersSheet(!showViewersSheet);
                }}
                className="w-full bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 flex items-center justify-between text-white hover:bg-black/90 transition-colors cursor-pointer shadow-2xl"
              >
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4.5 h-4.5 text-[#ff2d60]" />
                  <span className="text-xs font-bold">
                    {viewers.length} {viewers.length === 1 ? 'View' : 'Views'} • {reactions.length} {reactions.length === 1 ? 'Reaction' : 'Reactions'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 bg-white/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  {showViewersSheet ? 'Hide Details' : 'View Analytics'}
                </span>
              </button>

              {showViewersSheet && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#12141d]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 max-h-60 overflow-y-auto space-y-3 shadow-2xl animate-in slide-in-from-bottom-3 duration-200"
                >
                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-white/10 text-center">
                    <div className="bg-white/5 p-2 rounded-xl">
                      <span className="text-xs font-bold text-white block">{viewers.length}</span>
                      <span className="text-[9px] text-slate-400">Total Views</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl">
                      <span className="text-xs font-bold text-amber-400 block">{reactions.length}</span>
                      <span className="text-[9px] text-slate-400">Reactions</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-400 block capitalize">{currentStory.privacy || 'Public'}</span>
                      <span className="text-[9px] text-slate-400">Audience</span>
                    </div>
                  </div>

                  {/* Story Reactions List */}
                  {reactions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Reactions ({reactions.length})
                      </div>
                      {reactions.map((r) => (
                        <div key={r.id} className="flex items-center justify-between bg-white/[0.03] p-2 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <img src={r.userAvatar} alt={r.userName} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-xs font-semibold text-white">{r.userName}</span>
                          </div>
                          <span className="text-base">{r.emoji}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Story Viewers List */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Viewer List ({viewers.length})
                    </div>
                    {viewers.length === 0 ? (
                      <div className="text-xs text-slate-500 py-2 text-center">
                        No views yet. Share with friends!
                      </div>
                    ) : (
                      viewers.map((v) => (
                        <div key={v.id} className="flex items-center justify-between bg-white/[0.02] p-2 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <img
                              src={v.userAvatar}
                              alt={v.userName}
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                            <span className="text-xs font-semibold text-white">{v.userName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{v.viewedAt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
              {/* Quick Reaction Bar */}
              <div className="flex items-center justify-around bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 shadow-xl">
                {['❤️', '🔥', '😂', '😮', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiReact(emoji)}
                    className="text-lg hover:scale-125 transition-transform cursor-pointer p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${currentStory.userName}...`}
                  className="flex-1 bg-black/60 border border-white/20 backdrop-blur-md rounded-full px-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white shadow-lg"
                />

                <button
                  type="button"
                  onClick={() => handleEmojiReact('❤️')}
                  className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-black/80 shadow-lg"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                </button>

                {replyText.trim() && (
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-[#ff2d60] flex items-center justify-center text-white cursor-pointer hover:bg-[#ff2d60]/90 shadow-lg"
                  >
                    <Send className="w-4.5 h-4.5 ml-0.5" />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          onClose={() => {
            setSelectedUserForProfile(null);
            setIsPaused(false);
          }}
        />
      )}
    </div>
  );
};


