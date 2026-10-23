import React, { useState, useMemo } from 'react';
import {
  Search,
  Camera,
  MoreVertical,
  Pin,
  CheckCheck,
  Sparkles,
  X,
  Plus,
  Filter,
  MessageSquarePlus,
  Lock,
  Gift,
  HeartHandshake,
  UserPlus,
  Bot,
  Edit3,
  MessageCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Chat, Story, Message } from '../../types';
import { MOCK_USERS } from '../../data/mockData';
import { NewChatModal } from './NewChatModal';
import { StoryViewerModal } from '../stories/StoryViewerModal';
import { AddStoryModal } from '../stories/AddStoryModal';
import { PINUnlockModal } from '../auth/PINUnlockModal';
import { MoodBadge } from '../profile/MoodBadge';
import { MoodSelectorModal } from '../profile/MoodSelectorModal';
import { CapsuleViewerModal } from '../capsules/CapsuleViewerModal';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';

export const ChatListScreen: React.FC = () => {
  const {
    currentUser,
    setActiveTab,
    friendRequests,
    chats,
    messages,
    chatDrafts,
    typingUsers,
    stories,
    seenStoryIds,
    openChat,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    togglePinChat,
    toggleMuteChat,
    unlockedChatsInSession,
    unlockChatWithPin,
    saveUserMood,
    memoryCapsules,
    unreadCapsulesCount,
    markCapsuleNotificationsAsRead,
    createMemoryCapsule,
    unlockMemoryCapsule,
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilterScope, setSearchFilterScope] = useState<'all' | 'chats' | 'messages'>('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<Story[] | null>(null);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [lockedChatTarget, setLockedChatTarget] = useState<Chat | null>(null);

  // Features 2 & 5 Modal States
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showCapsulesVault, setShowCapsulesVault] = useState(false);

  // User's own stories
  const userStories = stories.filter((s) => s.isYou || (currentUser?.id && s.userId === currentUser.id));
  const myStory = userStories[0];

  // Group friends' stories strictly by userId so each user gets ONE story card
  const friendStoriesGroupedMap = new Map<string, Story[]>();
  stories.forEach((s) => {
    if (!s.isYou && (!currentUser?.id || s.userId !== currentUser.id) && friendRequests[s.userId] === 'accepted') {
      const existing = friendStoriesGroupedMap.get(s.userId) || [];
      existing.push(s);
      friendStoriesGroupedMap.set(s.userId, existing);
    }
  });

  const friendStoryGroups = Array.from(friendStoriesGroupedMap.values());
  const allStoryGroups = userStories.length > 0 ? [userStories, ...friendStoryGroups] : friendStoryGroups;

  const categories = ['All', 'Favorites', 'Work', 'Groups', 'Communities'];

  const handleChatClick = (chat: Chat) => {
    if (chat.isLocked && !unlockedChatsInSession[chat.id]) {
      setLockedChatTarget(chat);
    } else {
      openChat(chat.id);
    }
  };

  // Global search through messages across all conversations in real time
  const matchedMessages = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { chat: Chat; message: Message }[] = [];

    chats.forEach((chat) => {
      const chatMsgs = messages[chat.id] || [];
      chatMsgs.forEach((msg) => {
        if (msg.content && msg.content.toLowerCase().includes(q)) {
          results.push({ chat, message: msg });
        }
      });
    });

    return results;
  }, [searchQuery, chats, messages]);

  // Filter chats by category and search term
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Groups'
          ? chat.isGroup
          : chat.category === selectedCategory;

      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase();
      const matchesChatName = chat.name.toLowerCase().includes(q);
      const lastMsgContent = typeof chat.lastMessage === 'string' ? chat.lastMessage : chat.lastMessage?.content || '';
      const matchesLastMsg = lastMsgContent.toLowerCase().includes(q);
      const hasMatchingMsgInChat = (messages[chat.id] || []).some(
        (m) => m.content && m.content.toLowerCase().includes(q)
      );

      return matchesCategory && (matchesChatName || matchesLastMsg || hasMatchingMsgInChat);
    });
  }, [chats, selectedCategory, searchQuery, messages]);

  // Separate pinned and unpinned chats, sorted by latest message timestamp
  const pinnedChats = filteredChats
    .filter((c) => c.isPinned)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  const unpinnedChats = filteredChats
    .filter((c) => !c.isPinned)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

  // Helper to highlight matching text in search results
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-slate-900 dark:text-white rounded-xs px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-[#050505]">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2 flex flex-col gap-3 shrink-0 bg-white/95 dark:bg-[#0a0b0e]/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white tracking-tight">
            Chats
          </h1>

          <div className="flex items-center gap-2">
            {/* Global Search Quick Trigger */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) {
                  setSearchQuery('');
                }
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-[#ff2d60] text-white border-[#ff2d60] shadow-md shadow-[#ff2d60]/20'
                  : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200'
              }`}
              title="Search conversations & messages"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Compact "Available" Status Button */}
            <button
              onClick={() => setShowMoodSelector(true)}
              className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Status"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                Available
              </span>
            </button>

            {/* Memory Capsule Vault Trigger with Real Unread Notification Count */}
            <button
              onClick={() => {
                setShowCapsulesVault(true);
                markCapsuleNotificationsAsRead();
              }}
              className="w-9 h-9 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-300 transition-all hover:scale-105 cursor-pointer relative"
              title="Memory Capsules Vault"
            >
              <Gift className="w-4 h-4 text-purple-400" />
              {unreadCapsulesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#ff2d60] text-[9px] font-black text-white flex items-center justify-center shadow-md animate-scale-in">
                  {unreadCapsulesCount}
                </span>
              )}
            </button>

            {/* Friend Activity & Discover Button */}
            <button
              onClick={() => setActiveTab('contacts')}
              className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 transition-all hover:scale-105 cursor-pointer relative"
              title="Friend Activity & Global Contacts"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Search Input & Scopes */}
        {isSearchOpen && (
          <div className="space-y-2 pt-1 animate-slide-down">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats, contacts, or message text..."
                className="w-full h-10 pl-10 pr-9 rounded-2xl bg-white dark:bg-[#141620] border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#ff2d60] shadow-xs"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Scopes: All, Chats, Messages */}
            {searchQuery && (
              <div className="flex items-center gap-1.5 pb-1">
                {(['all', 'chats', 'messages'] as const).map((scope) => {
                  const isSel = searchFilterScope === scope;
                  const count =
                    scope === 'all'
                      ? filteredChats.length + matchedMessages.length
                      : scope === 'chats'
                      ? filteredChats.length
                      : matchedMessages.length;

                  return (
                    <button
                      key={scope}
                      onClick={() => setSearchFilterScope(scope)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      <span className="capitalize">{scope}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Stories / Status Bar at top (Rectangular with Gradient Rings, 1 per user) */}
        <div className="flex items-center gap-3.5 overflow-x-auto py-1.5 no-scrollbar">
          {/* My Story Tile */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
            <div className="relative">
              {/* Outer Ring Wrapper */}
              <div
                onClick={() => {
                  if (userStories.length > 0) {
                    setSelectedStoryGroup(userStories);
                  } else {
                    setShowAddStoryModal(true);
                  }
                }}
                className={`relative w-[58px] h-[68px] rounded-[20px] p-[2.5px] transition-transform duration-200 group-hover:scale-105 shadow-xs ${
                  userStories.length > 0
                    ? userStories.every((s) => seenStoryIds.includes(s.id))
                      ? 'bg-slate-300 dark:bg-slate-700'
                      : 'bg-gradient-to-tr from-[#762DFA] via-[#e1306c] to-[#00D4FF]'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                {/* Inner whitespace gap padding container */}
                <div className="w-full h-full rounded-[17.5px] p-[2px] bg-white dark:bg-[#0a0b0e] flex items-center justify-center overflow-hidden relative">
                  <img
                    src={myStory ? (myStory.thumbnailUrl || myStory.mediaUrl) : (currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80')}
                    alt="Your story"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-[15.5px]"
                  />

                  {/* Top Segmented Progress Bar overlay for user's stories */}
                  {userStories.length > 0 && (
                    <div className="absolute top-1 inset-x-1 flex gap-0.5 z-10 px-0.5">
                      {userStories.map((s) => (
                        <div
                          key={s.id}
                          className={`h-0.5 flex-1 rounded-full ${
                            seenStoryIds.includes(s.id) ? 'bg-white/40' : 'bg-white shadow-xs'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Solid Blue Circle Plus Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddStoryModal(true);
                }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#3b82f6] hover:bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-[#0a0b0e] shadow-md transition-transform hover:scale-110 cursor-pointer z-10"
                title="Create story"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
              </button>
            </div>

            <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white truncate max-w-[60px] text-center tracking-tight">
              Your Loop
            </span>
          </div>

          {/* Friends' Stories Tiles */}
          {friendStoryGroups.map((group) => {
            const firstStory = group[0];
            const isAllSeen = group.every((s) => seenStoryIds.includes(s.id));

            return (
              <div
                key={firstStory.userId}
                onClick={() => setSelectedStoryGroup(group)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className="relative">
                  {/* Outer Gradient Ring Wrapper */}
                  <div className={`relative w-[58px] h-[68px] rounded-[20px] p-[2.5px] transition-transform duration-200 group-hover:scale-105 shadow-xs ${
                    isAllSeen
                      ? 'bg-slate-300 dark:bg-slate-700/80'
                      : 'bg-gradient-to-tr from-[#762DFA] via-[#e1306c] to-[#00D4FF]'
                  }`}>
                    {/* Inner Whitespace Gap Container */}
                    <div className="w-full h-full rounded-[17.5px] p-[2px] bg-white dark:bg-[#0a0b0e] flex items-center justify-center overflow-hidden relative">
                      <img
                        src={firstStory.thumbnailUrl || firstStory.mediaUrl}
                        alt={firstStory.userName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-[15.5px]"
                      />

                      {/* Top Segmented Progress Indicators */}
                      <div className="absolute top-1 inset-x-1 flex gap-0.5 z-10 px-0.5">
                        {group.map((s) => (
                          <div
                            key={s.id}
                            className={`h-0.5 flex-1 rounded-full transition-colors ${
                              seenStoryIds.includes(s.id) ? 'bg-white/40' : 'bg-white shadow-xs'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <span className={`text-[10.5px] truncate max-w-[60px] text-center tracking-tight ${
                  isAllSeen
                    ? 'text-slate-400 dark:text-slate-500 font-medium'
                    : 'text-slate-900 dark:text-slate-200 font-bold group-hover:text-black dark:group-hover:text-white'
                }`}>
                  {firstStory.userName.toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Filter Categories Row */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  if (cat === 'Groups') {
                    setActiveTab('groups');
                  } else {
                    setSelectedCategory(cat);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#ff2d60] text-white font-extrabold shadow-md shadow-[#ff2d60]/20'
                    : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Conversation List Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {/* If Searching Messages Scope only or All with matched messages */}
        {searchQuery.trim() && (searchFilterScope === 'messages' || searchFilterScope === 'all') && matchedMessages.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#ff2d60]" />
                <span>Matching Messages ({matchedMessages.length})</span>
              </span>
            </div>

            {matchedMessages.slice(0, searchFilterScope === 'messages' ? 20 : 5).map(({ chat, message }) => (
              <div
                key={message.id}
                onClick={() => handleChatClick(chat)}
                className="p-3 rounded-2xl bg-white dark:bg-[#151824] hover:bg-slate-50 dark:hover:bg-[#1a1e2e] border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={chat.avatarUrl}
                      alt={chat.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {chat.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {message.senderName || 'Participant'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{message.timestamp}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 pl-7 leading-relaxed">
                  {highlightMatch(message.content, searchQuery)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Regular / Filtered Chats (Hidden if searchFilterScope is 'messages') */}
        {searchFilterScope !== 'messages' && (
          <>
            {filteredChats.length === 0 && matchedMessages.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No chats or messages found matching "{searchQuery}"
              </div>
            ) : (
              <>
                {[...pinnedChats, ...unpinnedChats].map((chat) => {
                  const currentTypers = typingUsers[chat.id] || [];
                  const isTyping = currentTypers.length > 0;
                  const typingText = currentTypers.join(', ');
                  const draftText = chatDrafts[chat.id];
                  const hasDraft = Boolean(draftText && draftText.trim());

                  return (
                    <div
                      key={chat.id}
                      onClick={() => handleChatClick(chat)}
                      className="group relative flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#12141d]/40 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer border border-slate-200/80 dark:border-white/5 shadow-xs"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={chat.avatarUrl}
                          alt={chat.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-white/10 shadow-md"
                        />

                        {/* Group Icon Badge */}
                        {chat.isGroup && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-100 dark:bg-[#0a0a0a] border border-slate-300 dark:border-white/20 flex items-center justify-center text-[9px] text-[#00D4FF]">
                            👥
                          </span>
                        )}

                        {/* Lock Badge */}
                        {chat.isLocked && !unlockedChatsInSession[chat.id] && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ff2d60] border border-white flex items-center justify-center text-[9px] text-white shadow-md">
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#ff2d60] dark:group-hover:text-white transition-colors flex items-center gap-1.5">
                            {highlightMatch(chat.name, searchQuery)}
                            {chat.isLocked && (
                              <Lock className="w-3 h-3 text-[#ff2d60] inline-block shrink-0" />
                            )}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                            {chat.lastMessageTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs">
                          {isTyping ? (
                            <span className="text-emerald-500 font-bold truncate flex items-center gap-1.5 text-[11px] animate-pulse">
                              <span className="flex gap-0.5 items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
                              </span>
                              <span>{typingText ? `${typingText} is typing...` : 'typing...'}</span>
                            </span>
                          ) : hasDraft ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium truncate flex items-center gap-1 text-[11px]">
                              <Edit3 className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="font-bold text-amber-500">Draft:</span>
                              <span className="truncate opacity-90">{draftText}</span>
                            </span>
                          ) : (
                            <p className="text-slate-600 dark:text-slate-300 truncate text-[11px] font-medium leading-tight">
                              {chat.isLocked && !unlockedChatsInSession[chat.id]
                                ? '🔒 Chat locked with PIN'
                                : highlightMatch(
                                    (typeof chat.lastMessage === 'string' ? chat.lastMessage : chat.lastMessage?.content) || 'No messages yet',
                                    searchQuery
                                  )}
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {chat.isPinned && (
                              <Pin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 fill-slate-500 dark:fill-slate-400 rotate-45" />
                            )}

                            {chat.unreadCount > 0 && (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-[#ff2d60] text-[9px] font-black text-white flex items-center justify-center shadow-md">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} />
      )}

      {selectedStoryGroup && (
        <StoryViewerModal
          userStories={selectedStoryGroup}
          allStoryGroups={allStoryGroups}
          onClose={() => setSelectedStoryGroup(null)}
        />
      )}

      {showAddStoryModal && (
        <AddStoryModal onClose={() => setShowAddStoryModal(false)} />
      )}

      {showAiAssistant && (
        <AIAssistantDrawer
          isOpen={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          chat={chats[0] || { id: 'ai-chat', name: 'Nexus AI Co-Pilot', isGroup: false, avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', members: [currentUser], unreadCount: 0 }}
          messages={[]}
          currentUser={currentUser}
        />
      )}

      {lockedChatTarget && (
        <PINUnlockModal
          chatTitle={lockedChatTarget.name}
          onUnlock={(pin) => {
            const success = unlockChatWithPin(lockedChatTarget.id, pin);
            if (success) {
              const targetId = lockedChatTarget.id;
              setLockedChatTarget(null);
              openChat(targetId);
            }
            return success;
          }}
          onClose={() => setLockedChatTarget(null)}
        />
      )}

      {/* Feature 2: Mood Selector Modal */}
      <MoodSelectorModal
        isOpen={showMoodSelector}
        onClose={() => setShowMoodSelector(false)}
        currentMood={currentUser?.mood}
        currentPrivacy={currentUser?.moodPrivacy || 'public'}
        isMoodHidden={currentUser?.isMoodHidden || false}
        onSaveMood={saveUserMood}
      />

      {/* Feature 5: Memory Capsules Vault Modal */}
      <CapsuleViewerModal
        isOpen={showCapsulesVault}
        onClose={() => setShowCapsulesVault(false)}
        currentUser={currentUser}
        availableUsers={Object.values(MOCK_USERS)}
        capsules={memoryCapsules}
        onCreateCapsule={createMemoryCapsule}
        onUnlockCapsule={unlockMemoryCapsule}
      />
    </div>
  );
};

