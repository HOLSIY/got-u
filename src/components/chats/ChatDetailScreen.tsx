import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Mic,
  Send,
  Camera,
  Plus,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  MapPin,
  BarChart2,
  Trash2,
  Edit2,
  Copy,
  CornerUpLeft,
  X,
  Play,
  Pause,
  Sparkles,
  Calendar,
  Heart,
  Download,
  FileDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Message, User, MessageType } from '../../types';
import { UserProfileModal } from '../profile/UserProfileModal';
import { MoodBadge } from '../profile/MoodBadge';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { EventGroupDashboard } from '../groups/EventGroupDashboard';
import { FriendshipTimelineModal } from '../timeline/FriendshipTimelineModal';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { compressImageFile } from '../../utils/imageCompressor';

// Smart Filename Truncator with extension preservation
const truncateFileNameWithExt = (rawName: string, maxLen: number = 24): string => {
  if (!rawName) return 'Document';
  const trimmed = rawName.trim();
  if (trimmed.length <= maxLen) return trimmed;

  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return trimmed.slice(0, maxLen - 3) + '...';
  }

  const ext = trimmed.slice(lastDot); // e.g. '.pdf'
  const base = trimmed.slice(0, lastDot);
  const remaining = maxLen - ext.length - 3;
  if (remaining <= 3) {
    return base.slice(0, 6) + '...' + ext;
  }

  const prefixLen = Math.ceil(remaining * 0.6);
  const suffixLen = Math.floor(remaining * 0.4);
  return `${base.slice(0, prefixLen)}...${base.slice(base.length - suffixLen)}${ext}`;
};

export const ChatDetailScreen: React.FC = () => {
  const {
    activeChatId,
    chats,
    messages,
    closeChat,
    sendMessage,
    addReaction,
    deleteMessage,
    editMessage,
    currentUser,
    startCall,
    openMediaViewer,
    updateEventDetails,
    timelineMoments,
    addTimelineMoment,
    createEventGroup,
    chatDrafts,
    saveChatDraft,
    clearChatDraft,
    typingUsers,
    setTypingStatus,
    allUsers,
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);

  // Modal & Sheet States
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showEventDashboard, setShowEventDashboard] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const chatMessages = activeChatId ? messages[activeChatId] || [] : [];

  // Initialize draft when activeChatId changes
  useEffect(() => {
    if (activeChatId && chatDrafts[activeChatId]) {
      setInputText(chatDrafts[activeChatId]);
    } else {
      setInputText('');
    }
  }, [activeChatId]);

  // Clean up typing status on unmount
  useEffect(() => {
    return () => {
      if (activeChatId) {
        setTypingStatus(activeChatId, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeChatId, setTypingStatus]);

  // Handle typing change with debouncing and draft persistence
  const handleInputChange = (val: string) => {
    setInputText(val);
    if (!activeChatId) return;

    // Save draft locally
    saveChatDraft(activeChatId, val);

    // Update real-time typing status
    if (val.trim().length > 0) {
      setTypingStatus(activeChatId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (activeChatId) {
          setTypingStatus(activeChatId, false);
        }
      }, 2500);
    } else {
      setTypingStatus(activeChatId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Real-time presence listener and profile resolution for the other participant in 1-on-1 chats
  const otherMemberRaw = (!activeChat?.isGroup && activeChat?.members)
    ? activeChat.members.find((m) => !currentUser?.id || m.id !== currentUser.id) || activeChat.members[0]
    : null;
  const otherUserId = otherMemberRaw?.id;
  const otherUser = otherUserId ? allUsers.find((u) => u.id === otherUserId) || otherMemberRaw : otherMemberRaw;
  const [otherUserPresence, setOtherUserPresence] = useState<{ isOnline: boolean; lastActive?: number; mediaVisibility?: boolean } | null>(null);

  const headerTitle = activeChat?.isGroup ? activeChat.name : (otherUser?.fullName || activeChat?.name || 'Chat');
  const headerAvatar = activeChat?.isGroup ? activeChat.avatarUrl : (otherUser?.avatarUrl || activeChat?.avatarUrl || '');

  useEffect(() => {
    if (!otherUserId || activeChat?.isGroup) {
      setOtherUserPresence(null);
      return;
    }
    const userRef = doc(db, 'users', otherUserId);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const isOnline = data.status === 'online' && (Date.now() - (data.lastActive || 0) < 60 * 1000);
        setOtherUserPresence({
          isOnline,
          lastActive: data.lastActive,
          mediaVisibility: data.mediaVisibility !== undefined ? data.mediaVisibility : true,
        });
      } else {
        setOtherUserPresence(null);
      }
    }, (err) => {
      console.warn('Presence listener warning:', err);
    });
    return () => unsub();
  }, [otherUserId, activeChat?.isGroup]);

  // Privacy and online visibility check
  const isMediaVisibilityAllowed = (otherUserPresence?.mediaVisibility !== undefined ? otherUserPresence.mediaVisibility : otherUser?.mediaVisibility) !== false;
  const isOtherUserGenuinelyOnline = Boolean(otherUserPresence?.isOnline ?? otherUser?.isOnline);
  const showGreenOnlineDot = Boolean(!activeChat?.isGroup && isMediaVisibilityAllowed && isOtherUserGenuinelyOnline);

  // Helper to format date strings for day separators
  const getMessageDateString = (msg: Message): string => {
    if (msg.createdAt && typeof msg.createdAt === 'number') {
      return new Date(msg.createdAt).toDateString();
    }
    return new Date().toDateString();
  };

  const getMessageDateLabel = (dateStr: string): string => {
    const msgDate = new Date(dateStr);
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (dateStr === todayStr) return 'TODAY';
    if (dateStr === yesterdayStr) return 'YESTERDAY';

    return msgDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    // Reset input so subsequent uploads of same file trigger onChange
    e.target.value = '';
    setShowAttachmentMenu(false);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      try {
        const compressedUrl = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.78,
          maxSizeBytes: 300 * 1024,
        });
        await sendMessage(activeChat.id, '📷 Photo', 'image', {
          mediaUrls: [compressedUrl],
          fileUrl: compressedUrl,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(0)} KB`,
        });
      } catch (err) {
        console.warn('Error compressing image, reading raw:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const rawUrl = event.target.result as string;
            sendMessage(activeChat.id, '📷 Photo', 'image', {
              mediaUrls: [rawUrl],
              fileUrl: rawUrl,
              fileName: file.name,
              fileSize: `${(file.size / 1024).toFixed(0)} KB`,
            });
          }
        };
        reader.readAsDataURL(file);
      }
    } else if (isVideo) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawUrl = event.target.result as string;
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          sendMessage(activeChat.id, `🎥 Video: ${file.name} (${sizeMb} MB)`, 'video', {
            mediaUrls: [rawUrl],
            fileUrl: rawUrl,
            fileName: file.name,
            fileSize: `${sizeMb} MB`,
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const rawUrl = event.target.result as string;
          const sizeFormatted = file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`;

          sendMessage(activeChat.id, `📎 Document: ${file.name} (${sizeFormatted})`, 'file', {
            mediaUrls: [rawUrl],
            fileUrl: rawUrl,
            fileName: file.name,
            fileSize: sizeFormatted,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendLocation = () => {
    if (!activeChat) return;
    setShowAttachmentMenu(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          sendMessage(
            activeChat.id,
            `📍 Live Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            'text'
          );
        },
        () => {
          sendMessage(activeChat.id, '📍 Location: Denpasar, Bali, Indonesia (8.6705° S, 115.2126° E)', 'text');
        },
        { timeout: 5000 }
      );
    } else {
      sendMessage(activeChat.id, '📍 Location: Denpasar, Bali, Indonesia', 'text');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Voice recording timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSec((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSec(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  if (!activeChat) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-[#0a0b0e] text-center">
        <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">
          Loading conversation...
        </p>
        <button
          onClick={closeChat}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Chats
        </button>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(activeChat.id, inputText, 'text', replyingTo ? {
      replyTo: {
        id: replyingTo.id,
        senderName: replyingTo.senderName || 'User',
        content: replyingTo.content,
      }
    } : {});
    
    // Clear draft & typing status
    clearChatDraft(activeChat.id);
    setTypingStatus(activeChat.id, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
  };

  const handleSendVoiceNote = () => {
    setIsRecordingVoice(false);
    sendMessage(activeChat.id, 'Voice message (0:12)', 'voice', {
      audioDurationSec: 12,
    });
  };

  const handleSendImageSample = () => {
    setShowAttachmentMenu(false);
    sendMessage(activeChat.id, 'Shared travel photo from Bali', 'image', {
      mediaUrls: ['/src/assets/images/camper_van_1785509349602.jpg'],
    });
  };

  // Helper to render text with @mentions highlighted
  const renderMessageContent = (content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) {
      const parts = content.split(/(@\w+)/g);
      return parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span key={i} className="text-indigo-600 dark:text-[#00D4FF] font-bold underline bg-indigo-50 dark:bg-[#00D4FF]/10 px-1 rounded">
              {part}
            </span>
          );
        }
        return part;
      });
    }

    return content;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-100 dark:bg-[#0a0b0e]">
      {/* Background Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 via-slate-100 to-slate-100 dark:from-[#2e1d1a]/80 dark:via-[#1a1216]/90 dark:to-[#0a0b0e]" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-purple-200/30 dark:bg-[#ff6b35]/15 blur-[120px] rounded-full" />
      </div>

      {/* Top Glass Header */}
      <div className="w-full max-w-full min-w-0 px-4 py-3 bg-white/95 dark:bg-[#12141d]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={closeChat}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-transparent flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            onClick={() => {
              if (!activeChat.isGroup) {
                if (otherUser) {
                  setSelectedUserForProfile(otherUser);
                }
              } else {
                setShowGroupMembersModal(true);
              }
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-85 transition-opacity overflow-hidden"
          >
            <img
              src={headerAvatar}
              alt={headerTitle}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
            />

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-full">
                  {headerTitle}
                </h2>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate flex items-center gap-1.5 min-h-[14px] max-w-full">
                {activeChat.isGroup ? (
                  <span className="truncate hover:underline max-w-full">
                    {activeChat.members.map((m) => (allUsers.find((u) => u.id === m.id)?.fullName || m.fullName)?.split(' ')[0] || 'User').join(', ') || `${activeChat.members.length} members`}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 truncate max-w-full">
                    <span className="truncate">{otherUser?.username || '@user'}</span>
                    {showGreenOnlineDot && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Real Audio Call Button (1-on-1 Chats) */}
          {!activeChat.isGroup && otherUser && (
            <button
              onClick={() => {
                startCall(otherUser, 'audio');
              }}
              title="Start Voice Call"
              className="w-8.5 h-8.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* Real Video Call Button (1-on-1 Chats) */}
          {!activeChat.isGroup && otherUser && (
            <button
              onClick={() => {
                startCall(otherUser, 'video');
              }}
              title="Start Video Call"
              className="w-8.5 h-8.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* Feature 1 & 3: Premium AI Assistant Co-Pilot Button */}
          <button
            onClick={() => setShowAiAssistant(true)}
            title="got u Assistant & Conversation Insights"
            className="w-8.5 h-8.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20 relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full animate-pulse" />
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </button>

          {/* Event Group Dashboard Button */}
          {(activeChat.isEventGroup || activeChat.eventDetails) && (
            <button
              onClick={() => setShowEventDashboard(true)}
              title="Open Event Dashboard & Shared Album"
              className="w-8.5 h-8.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Friendship Timeline Button (Direct Chats) */}
          {!activeChat.isGroup && (
            <button
              onClick={() => setShowTimeline(true)}
              title="Open Friendship Timeline & Highlights"
              className="w-8.5 h-8.5 rounded-full bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 border border-rose-200 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-300 transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500/40" />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Scrollable Messages Area */}
      <div className="flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 sm:space-y-5 z-10">
        {chatMessages.map((msg, idx) => {
          const isMe = msg.isSentByMe;
          const currDateStr = getMessageDateString(msg);
          const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
          const prevDateStr = prevMsg ? getMessageDateString(prevMsg) : null;
          const showDateSeparator = idx === 0 || currDateStr !== prevDateStr;
          const dateLabel = getMessageDateLabel(currDateStr);

          return (
            <React.Fragment key={msg.id}>
              {/* Day Separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-3 select-none w-full min-w-0 overflow-hidden">
                  <div className="flex-grow max-w-[50px] sm:max-w-[100px] h-[1px] bg-slate-300 dark:bg-white/10" />
                  <span className="mx-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-3 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/10 shadow-xs truncate">
                    {dateLabel}
                  </span>
                  <div className="flex-grow max-w-[50px] sm:max-w-[100px] h-[1px] bg-slate-300 dark:bg-white/10" />
                </div>
              )}

              <div
                className={`w-full max-w-full min-w-0 flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
              >
                {/* Sender Name for Groups */}
                {!isMe && activeChat.isGroup && (
                  <div className="flex items-center gap-1.5 ml-9 mb-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-full">
                    <span className="truncate">{msg.senderName || 'Member'}</span>
                  </div>
                )}

                <div className={`flex items-end gap-2 max-w-[88%] sm:max-w-[80%] min-w-0 ${isMe ? 'flex-row-reverse ml-auto' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className="relative shrink-0 z-10 self-end mb-0.5">
                    <img
                      src={isMe ? currentUser.avatarUrl : (msg.senderAvatar || activeChat.avatarUrl)}
                      alt={isMe ? 'You' : 'Sender'}
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        if (!isMe) {
                          const senderUser = allUsers.find((u) => u.id === msg.senderId) ||
                            activeChat.members.find((m) => m.id === msg.senderId) || {
                              id: msg.senderId,
                              fullName: msg.senderName || activeChat.name,
                              username: msg.senderUsername || `@${(msg.senderName || 'user').toLowerCase().replace(/\s+/g, '')}`,
                              email: '',
                              avatarUrl: msg.senderAvatar || activeChat.avatarUrl,
                              isOnline: true,
                            };
                          setSelectedUserForProfile(senderUser);
                        }
                      }}
                      className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700/60 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>

                  {/* Speech Bubble Box */}
                  <div
                    onClick={() => setSelectedMessage(msg)}
                    className={`relative p-3.5 sm:p-4 rounded-[20px] text-[13.5px] leading-relaxed cursor-pointer transition-all hover:scale-[1.008] shadow-xs dark:shadow-md min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] ${
                      isMe
                        ? 'bg-white dark:bg-[#1a1c23] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100'
                        : 'bg-white dark:bg-[#131620] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {/* Bubble Header: Timestamp */}
                    <div className="text-[9.5px] font-medium text-slate-400 dark:text-slate-400 mb-1 flex items-center justify-end">
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Reply Reference Header */}
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-xl border-l-2 text-[11px] min-w-0 max-w-full overflow-hidden ${
                        isMe
                          ? 'bg-slate-100 dark:bg-white/10 border-indigo-500 dark:border-[#00D4FF] text-slate-800 dark:text-slate-200'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-400 dark:border-white/20 text-slate-800 dark:text-slate-200'
                      }`}>
                        <span className="font-bold block truncate">{msg.replyTo.senderName}</span>
                        <span className="truncate block opacity-80">{msg.replyTo.content}</span>
                      </div>
                    )}

                    {/* Image Type Message */}
                    {msg.type === 'image' && (() => {
                      const imgSrc = (msg.mediaUrls && msg.mediaUrls[0]) || msg.fileUrl || (msg.content && (msg.content.startsWith('data:image') || msg.content.startsWith('http')) ? msg.content : null);
                      const hasCaption = msg.content && msg.content !== '📷 Photo' && !msg.content.startsWith('data:image') && !msg.content.startsWith('http');

                      return (
                        <div className="space-y-2 min-w-0 max-w-full overflow-hidden">
                          {imgSrc ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                openMediaViewer(imgSrc, 'Shared Photo');
                              }}
                              className="relative overflow-hidden rounded-2xl bg-black/40 max-w-full"
                            >
                              <img
                                src={imgSrc}
                                alt="Shared Photo"
                                referrerPolicy="no-referrer"
                                className="w-full max-h-80 object-cover rounded-2xl hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="p-2 bg-red-500/10 text-red-400 text-xs rounded-xl truncate">
                              📷 Image attached ({msg.fileName || 'Photo'})
                            </div>
                          )}

                          {hasCaption && (
                            <div className="font-medium leading-snug break-words [overflow-wrap:anywhere] max-w-full">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Video Type Message */}
                    {msg.type === 'video' && (() => {
                      const videoSrc = (msg.mediaUrls && msg.mediaUrls[0]) || msg.fileUrl || (msg.content && (msg.content.startsWith('data:video') || msg.content.startsWith('http')) ? msg.content : null);
                      const hasCaption = msg.content && !msg.content.startsWith('🎥 Video') && !msg.content.startsWith('data:video') && !msg.content.startsWith('http');

                      return (
                        <div className="space-y-2 max-w-[280px] sm:max-w-sm min-w-0 overflow-hidden">
                          {videoSrc ? (
                            <div className="rounded-2xl overflow-hidden bg-black/80 max-w-full">
                              <video
                                src={videoSrc}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-80 rounded-2xl object-contain"
                              />
                            </div>
                          ) : (
                            <div className="p-2.5 bg-purple-500/10 text-purple-400 text-xs rounded-xl flex items-center gap-2 truncate">
                              <span className="truncate">🎥 Video: {msg.fileName || 'Video Attachment'}</span>
                            </div>
                          )}

                          {hasCaption && (
                            <div className="font-medium leading-snug break-words [overflow-wrap:anywhere] max-w-full">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Document / File Type Message */}
                    {msg.type === 'file' && (() => {
                      const fileSrc = msg.fileUrl || (msg.mediaUrls && msg.mediaUrls[0]) || '';
                      const rawName = msg.fileName || msg.content?.replace(/^📎 Document:\s*/, '') || 'Document.pdf';
                      const displayName = truncateFileNameWithExt(rawName, 24);
                      const ext = (rawName.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
                      const size = msg.fileSize || '';

                      return (
                        <div className="space-y-1.5 w-full max-w-[270px] sm:max-w-xs min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full min-w-0 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-[#00D4FF] flex items-center justify-center font-black text-[11px] shrink-0 uppercase tracking-wider">
                              {ext}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p
                                className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                                title={rawName}
                              >
                                {displayName}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full font-medium">
                                {ext} • {size || 'File'}
                              </p>
                            </div>
                            {fileSrc && (
                              <a
                                href={fileSrc}
                                download={rawName}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                                title="Download / Open Document"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          {msg.content && !msg.content.startsWith('📎 Document') && (
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 break-words [overflow-wrap:anywhere] max-w-full overflow-hidden">
                              {msg.content}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Standard Text Message */}
                    {msg.type === 'text' && (
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-medium max-w-full overflow-hidden">
                        {renderMessageContent(msg.content, msg.mentions)}
                      </div>
                    )}

                    {/* Collage Type Message */}
                    {msg.type === 'images_collage' && (
                      <div className="space-y-2">
                        <p className="mb-2 font-medium">{msg.content}</p>
                        <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden relative">
                          {msg.mediaUrls?.map((url, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                openMediaViewer(url, 'Shared Media');
                              }}
                              className="relative h-28 overflow-hidden rounded-xl cursor-pointer group/img"
                            >
                              <img
                                src={url}
                                alt="Attached photo"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                              {idx === 2 && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center font-extrabold text-sm text-white">
                                  +2 photos
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Voice Note Message */}
                    {msg.type === 'voice' && (
                      <div className="flex items-center gap-3 py-1 pr-2 min-w-[180px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayingAudioId(playingAudioId === msg.id ? null : msg.id);
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md cursor-pointer shrink-0 transition-colors bg-slate-900 dark:bg-white/20 text-white"
                        >
                          {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>

                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-0.5 h-4">
                            {[30, 60, 40, 80, 100, 70, 50, 90, 40, 60, 30, 80, 50, 90].map((h, i) => (
                              <div
                                key={i}
                                style={{ height: `${h}%` }}
                                className={`w-1 rounded-full transition-all ${
                                  playingAudioId === msg.id
                                    ? 'bg-[#ff2d60] dark:bg-[#00D4FF] animate-pulse'
                                    : 'bg-slate-300 dark:bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            0:12 • Voice Note
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Emoji Reactions below bubble */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-2.5 right-3 flex items-center gap-1 bg-white dark:bg-[#0a0a0a] border border-slate-200/90 dark:border-white/15 px-2 py-0.5 rounded-full shadow-xs dark:shadow-lg text-[10px] font-bold text-slate-800 dark:text-white z-10">
                        {msg.reactions.map((r, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            <span>{r.emoji}</span>
                            <span>{r.count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {/* Live typing indicator bubble */}
        {activeChat && typingUsers[activeChat.id] && typingUsers[activeChat.id].length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-xs text-slate-700 dark:text-slate-200 w-fit animate-pulse shadow-xs ml-1">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
            </span>
            <span className="font-semibold text-[11px]">
              {typingUsers[activeChat.id].join(', ')} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Replying banner */}
      {replyingTo && (
        <div className="px-5 py-2 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 z-20">
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className="w-4 h-4 text-indigo-600 dark:text-[#2D31FA]" />
            <span className="truncate">
              Replying to <strong className="text-slate-900 dark:text-white">{replyingTo.senderName || 'User'}</strong>: "{replyingTo.content}"
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Inputs for Local Device Selection */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => handleFileUpload(e, 'image')}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileUpload(e, 'image')}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept="*/*"
        onChange={(e) => handleFileUpload(e, 'file')}
        className="hidden"
      />

      {/* Attachment Drawer Modal */}
      {showAttachmentMenu && (
        <div className="px-5 py-3 bg-white dark:bg-[#0a0a0a] border-t border-slate-200 dark:border-white/10 grid grid-cols-4 gap-3 z-30">
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs text-slate-800 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span>Gallery</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs text-slate-800 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-[#00D4FF] flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <span>Camera</span>
          </button>

          <button
            onClick={() => documentInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs text-slate-800 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span>Document</span>
          </button>

          <button
            onClick={handleSendLocation}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs text-slate-800 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <span>Location</span>
          </button>
        </div>
      )}

      {/* Message Action Modal Popup */}
      {selectedMessage && (
        <div
          onClick={() => setSelectedMessage(null)}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/15 rounded-3xl p-4 shadow-2xl space-y-3 text-slate-900 dark:text-slate-100"
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Message Actions</div>

            {/* Quick emoji reaction bar */}
            <div className="flex items-center justify-around py-2 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
              {['🔥', '❤️', '👍', '😂', '😮', '🚀'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    addReaction(activeChat.id, selectedMessage.id, emoji);
                    setSelectedMessage(null);
                  }}
                  className="text-xl hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-1 text-xs text-slate-800 dark:text-slate-200 font-medium">
              <button
                onClick={() => {
                  setReplyingTo(selectedMessage);
                  setSelectedMessage(null);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-left cursor-pointer"
              >
                <CornerUpLeft className="w-4 h-4 text-indigo-600 dark:text-[#00D4FF]" />
                <span>Reply</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedMessage.content);
                  setSelectedMessage(null);
                  alert('Copied message text!');
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Copy Text</span>
              </button>

              {selectedMessage.isSentByMe && (
                <button
                  onClick={() => {
                    deleteMessage(activeChat.id, selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 text-left cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Message</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Input Dock Bar */}
      <footer className="w-full max-w-full min-w-0 px-3 sm:px-5 py-3 z-20 shrink-0 overflow-x-hidden">
        <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[28px] p-1.5 sm:p-2 pl-4 sm:pl-5 shadow-md dark:shadow-lg backdrop-blur-xl w-full min-w-0">
          <div
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type message..."
            className="flex-1 min-w-0 bg-transparent border-none text-sm focus:ring-0 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white font-medium"
          />

          <div className="flex items-center gap-1 sm:gap-2 pr-1 shrink-0">
            <button
              onClick={() => setShowAiAssistant(true)}
              className="p-1.5 sm:p-2 text-indigo-600 dark:text-[#00D4FF] hover:text-indigo-800 dark:hover:text-white cursor-pointer transition-colors"
              title="AI Writing Assistant for this text"
            >
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform animate-pulse" />
            </button>

            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#ff2d60] dark:bg-gradient-to-tr dark:from-[#2D31FA] dark:to-[#00D4FF] flex items-center justify-center shadow-md shadow-[#ff2d60]/20 dark:shadow-lg dark:shadow-[#2D31FA]/30 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 text-white" />
            </button>
          </div>
        </div>
      </footer>

      {selectedUserForProfile && (
        <UserProfileModal
          user={selectedUserForProfile}
          onClose={() => setSelectedUserForProfile(null)}
        />
      )}

      {/* Feature 1: AI Assistant Drawer */}
      {activeChat && (
        <AIAssistantDrawer
          isOpen={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          chat={activeChat}
          messages={chatMessages}
          currentUser={currentUser}
          initialInputText={inputText}
          onApplyToInput={(revisedText) => setInputText(revisedText)}
          onSendMessage={(text) => sendMessage(activeChat.id, text, 'text')}
          onConvertToEventGroup={async (eventData) => {
            const newGroupId = await createEventGroup(
              `${activeChat.name} Event`,
              {
                eventType: 'Custom Event',
                title: `${activeChat.name} Event`,
                date: eventData.dates?.[0] || new Date().toISOString().split('T')[0],
                time: '12:00',
                locationName: eventData.locations?.[0] || 'TBD',
                budgetTotal: eventData.budget ? parseFloat(eventData.budget) : 0,
                whoPaysWhat: 'Equal Split',
                rsvp: {},
                polls: [],
                tasks: (eventData.tasks || []).map((t: string, i: number) => ({ id: i.toString(), title: t, isCompleted: false })),
                expenses: [],
                announcements: ['Event created from AI chat discussion!'],
                checklist: [],
              },
              activeChat.members
            );
            setShowAiAssistant(false);
          }}
        />
      )}

      {/* Feature 3: Event Group Dashboard */}
      {activeChat && (activeChat.isEventGroup || activeChat.eventDetails) && (
        <EventGroupDashboard
          chat={activeChat}
          messages={chatMessages}
          currentUser={currentUser}
          isOpen={showEventDashboard}
          onClose={() => setShowEventDashboard(false)}
          onUpdateEventDetails={(updatedDetails) => updateEventDetails(activeChat.id, updatedDetails)}
        />
      )}

      {/* Feature 4: Friendship Timeline Modal */}
      {activeChat && !activeChat.isGroup && (
        <FriendshipTimelineModal
          isOpen={showTimeline}
          onClose={() => setShowTimeline(false)}
          chat={activeChat}
          currentUser={currentUser}
          moments={timelineMoments[activeChat.id] || []}
          onAddMoment={(moment) => addTimelineMoment(activeChat.id, moment)}
        />
      )}

      {/* Group Members List Modal */}
      {activeChat && activeChat.isGroup && showGroupMembersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#12141d] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white relative flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <img
                  src={activeChat.avatarUrl}
                  alt={activeChat.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-white/10"
                />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeChat.name}</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {activeChat.members.length} members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGroupMembersModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {activeChat.members.map((m) => {
                const liveMember = allUsers.find((u) => u.id === m.id) || m;
                const isMe = Boolean(currentUser?.id && liveMember.id === currentUser.id);
                const isAdmin = activeChat.groupAdmins?.includes(liveMember.id);

                return (
                  <div
                    key={liveMember.id}
                    onClick={() => {
                      setShowGroupMembersModal(false);
                      setSelectedUserForProfile(liveMember);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={liveMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'}
                          alt={liveMember.fullName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {isMe ? `${liveMember.fullName} (You)` : liveMember.fullName}
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#ff2d60]/15 text-[#ff2d60] rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {liveMember.username || '@user'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#ff2d60] font-semibold">View</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
