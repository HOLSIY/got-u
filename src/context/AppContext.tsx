import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { useBranding } from './BrandingContext';
import {
  ScreenType,
  AuthMode,
  NavigationTab,
  User,
  Chat,
  Message,
  Story,
  NotificationItem,
  CallSession,
  CallRecord,
  CallType,
  MessageType,
  UserMood,
  MoodPrivacy,
  EventDetails,
  TimelineMoment,
  MemoryCapsule,
  Post,
} from '../types';
import {
  getUserIsolatedInitialStore,
  MOCK_USERS,
  MOCK_NOTIFICATIONS,
} from '../data/mockData';
import { registerGlobalUser, getAllGlobalUsers } from '../utils/userSearch';
import { DEFAULT_NEXUS_AVATAR } from '../utils/constants';
import { RTC_CONFIGURATION, getLocalUserMedia, stopMediaStream } from '../lib/webrtc';
import { callSounds } from '../utils/callSounds';
import { compressAvatar, compressCover } from '../utils/imageCompressor';

interface AppContextType {
  screen: ScreenType;
  authMode: AuthMode;
  activeTab: NavigationTab;
  activeChatId: string | null;
  currentUser: User;
  chats: Chat[];
  messages: Record<string, Message[]>;
  stories: Story[];
  notifications: NotificationItem[];
  selectedCategory: string;
  searchQuery: string;
  theme: 'dark' | 'light';
  seenStoryIds: string[];
  globalChatPin: string | null;
  setGlobalChatPin: (pin: string | null) => void;
  imageQuality: 'Original' | 'HD' | '2K' | '4K';
  setImageQuality: (q: 'Original' | 'HD' | '2K' | '4K') => void;
  isPhoneFrameMode: boolean;
  activeCall: CallSession | null;
  incomingCall: CallRecord | null;
  callHistory: CallRecord[];
  allUsers: User[];
  activeMediaViewer: { url: string; title?: string } | null;
  activeProfilePhotoViewer: { url: string; name?: string; username?: string } | null;
  openProfilePhotoViewer: (url: string, name?: string, username?: string) => void;
  closeProfilePhotoViewer: () => void;
  activePostViewer: Post | null;
  openPostViewer: (post: Post) => void;
  closePostViewer: () => void;
  targetReelTarget: { reelId: string; commentId?: string } | null;
  openReel: (reelId: string, commentId?: string) => void;
  clearReelTarget: () => void;
  selectedProfileUser: User | null;
  openUserProfile: (userOrUserId: User | string) => Promise<void>;
  closeUserProfile: () => void;

  // Friend Requests
  friendRequests: Record<string, 'none' | 'pending_sent' | 'pending_received' | 'accepted'>;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (targetUserId: string) => Promise<void>;
  rejectFriendRequest: (targetUserId: string) => Promise<void>;
  cancelFriendRequest: (targetUserId: string) => Promise<void>;
  removeFriend: (targetUserId: string) => Promise<void>;

  // Settings
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (val: boolean) => void;
  readReceiptsEnabled: boolean;
  setReadReceiptsEnabled: (val: boolean) => void;
  blockedUsers: string[];
  blockUser: (targetUserId: string) => Promise<void>;
  unblockUser: (targetUserId: string) => Promise<void>;
  autoDownloadMedia: boolean;
  setAutoDownloadMedia: (val: boolean) => void;
  storageUsageMB: number;
  clearCache: () => void;

  // Stories
  addStory: (
    mediaUrl: string,
    caption?: string,
    mediaType?: 'image' | 'video',
    privacy?: 'public' | 'close_friends'
  ) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  markStoryAsSeen: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;

  // Chat Drafts & Real-time Typing Status
  chatDrafts: Record<string, string>;
  saveChatDraft: (chatId: string, draft: string) => void;
  clearChatDraft: (chatId: string) => void;
  typingUsers: Record<string, string[]>;
  setTypingStatus: (chatId: string, isTyping: boolean) => Promise<void>;

  // Chat Lock & PIN
  lockedChatPins: Record<string, string>;
  unlockedChatsInSession: Record<string, boolean>;
  lockChatWithPin: (chatId: string, pin: string) => void;
  unlockChatWithPin: (chatId: string, pin: string) => boolean;
  removeChatLock: (chatId: string) => void;

  // Actions
  setScreen: (screen: ScreenType) => void;
  setAuthMode: (mode: AuthMode) => void;
  setActiveTab: (tab: NavigationTab) => void;
  openChat: (chatId: string) => void;
  closeChat: () => void;
  sendMessage: (
    chatId: string,
    content: string,
    type?: MessageType,
    extra?: Partial<Message>
  ) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  createNewChatWithUser: (user: User) => Promise<string>;
  createNewGroup: (name: string, members: User[]) => Promise<string>;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  togglePhoneFrameMode: () => void;
  startCall: (user: User, type: CallType) => Promise<void>;
  acceptIncomingCall: (call: CallRecord) => Promise<void>;
  declineIncomingCall: (call: CallRecord) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => Promise<void>;
  openMediaViewer: (url: string, title?: string) => void;
  closeMediaViewer: () => void;
  login: (emailOrUsername: string, password?: string) => Promise<void>;
  signup: (fullName: string, username: string, email: string, password?: string, avatarUrl?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateProfile: (updated: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => void;
  isGlobalAiAssistantOpen: boolean;
  setIsGlobalAiAssistantOpen: (open: boolean) => void;
  markNotificationAsRead: (id: string) => Promise<void>;

  // Feature 2: Live Mood Chat
  saveUserMood: (mood: UserMood, privacy: MoodPrivacy, isHidden: boolean) => Promise<void>;

  // Feature 3: Event Groups
  createEventGroup: (name: string, eventDetails: EventDetails, members: User[]) => Promise<string>;
  updateEventDetails: (chatId: string, eventDetails: EventDetails) => Promise<void>;

  // Feature 4: Smart Friendship Timeline
  timelineMoments: Record<string, TimelineMoment[]>;
  addTimelineMoment: (chatId: string, moment: Omit<TimelineMoment, 'id' | 'createdAt'>) => Promise<void>;

  // Feature 5: Memory Capsules
  memoryCapsules: MemoryCapsule[];
  unreadCapsulesCount: number;
  markCapsuleNotificationsAsRead: () => Promise<void>;
  createMemoryCapsule: (capsule: Omit<MemoryCapsule, 'id' | 'createdAt' | 'isUnlocked'>) => Promise<void>;
  unlockMemoryCapsule: (capsuleId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to sanitize objects for Firestore (removes undefined values which cause setDoc/updateDoc errors)
function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (value === undefined ? null : value))
  );
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminLogin } = useBranding();
  const [screen, setScreen] = useState<ScreenType>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [activeTab, setActiveTab] = useState<NavigationTab>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const initialStore = getUserIsolatedInitialStore('guest');
  const [currentUser, setCurrentUser] = useState<User>(initialStore.user);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [stories, setStories] = useState<Story[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    let savedReadIds: string[] = [];
    try {
      const saved = localStorage.getItem('nexus_read_notif_ids');
      savedReadIds = saved ? JSON.parse(saved) : [];
    } catch {}
    return MOCK_NOTIFICATIONS.map((n) => ({
      ...n,
      isRead: n.isRead || savedReadIds.includes(n.id),
    }));
  });
  const [friendRequests, setFriendRequests] = useState<Record<string, 'none' | 'pending_sent' | 'pending_received' | 'accepted'>>({});
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [imageQuality, setImageQuality] = useState<'Original' | 'HD' | '2K' | '4K'>('Original');
  const [allUsers, setAllUsers] = useState<User[]>(() => getAllGlobalUsers());
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  // WebRTC Peer Connection & Media Track Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callUnsubsRef = useRef<Unsubscribe[]>([]);
  const ringingTimeoutRef = useRef<number | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);
  const isGoogleSignInActiveRef = useRef<boolean>(false);
  const [timelineMoments, setTimelineMoments] = useState<Record<string, TimelineMoment[]>>({
    c1: [
      {
        id: 'm1',
        chatId: 'c1',
        creatorId: 'u1',
        creatorName: 'Abebe Bikila',
        title: 'First Coffee Catchup ☕️',
        caption: 'Met at Paris Cafe to discuss our upcoming trip!',
        date: '2025-06-15',
        type: 'milestone',
        createdAt: Date.now() - 86400000 * 30,
      },
    ],
  });
  const [readCapsuleIds, setReadCapsuleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_read_capsule_ids');
      return saved ? JSON.parse(saved) : ['cap1'];
    } catch {
      return ['cap1'];
    }
  });

  const [memoryCapsules, setMemoryCapsules] = useState<MemoryCapsule[]>([
    {
      id: 'cap1',
      senderId: 'u2',
      senderName: 'Sarah Jenkins',
      recipientId: 'guest',
      recipientName: 'You',
      title: 'Open after Graduation 🎓',
      unlockTimestamp: Date.now() - 1000, // Ready to open!
      createdAt: Date.now() - 86400000 * 10,
      contentType: 'letter',
      content: 'Congratulations on completing this journey! I always knew you would accomplish great things.',
      isUnlocked: true,
      isPrivate: true,
      isRead: true,
    },
  ]);

  // Active listeners ref for cleanup
  const listenersRef = useRef<Unsubscribe[]>([]);
  const msgListenersRef = useRef<Record<string, Unsubscribe>>({});
  const heartbeatIntervalRef = useRef<any>(null);

  // Chat Drafts & Real-time Typing Status
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('nexus_chat_drafts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const saveChatDraft = (chatId: string, draft: string) => {
    setChatDrafts((prev) => {
      let next = { ...prev };
      if (!draft.trim()) {
        delete next[chatId];
      } else {
        next[chatId] = draft;
      }
      try {
        localStorage.setItem('nexus_chat_drafts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearChatDraft = (chatId: string) => {
    setChatDrafts((prev) => {
      const next = { ...prev };
      delete next[chatId];
      try {
        localStorage.setItem('nexus_chat_drafts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setTypingStatus = async (chatId: string, isTyping: boolean) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userName = currentUser.fullName || currentUser.username || 'Someone';

    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const updatePayload: Record<string, any> = {};
      if (isTyping) {
        updatePayload[`typing.${uid}`] = {
          name: userName,
          timestamp: Date.now(),
        };
      } else {
        updatePayload[`typing.${uid}`] = deleteField();
      }
      await updateDoc(chatDocRef, updatePayload).catch(() => {});
    } catch (e) {
      console.warn('Typing sync notice:', e);
    }
  };

  // Clean listeners helper
  const clearListeners = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    listenersRef.current.forEach((unsub) => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {
        console.warn(e);
      }
    });
    listenersRef.current = [];

    Object.values(msgListenersRef.current).forEach((unsub) => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {
        console.warn(e);
      }
    });
    msgListenersRef.current = {};
  };

  // Sync Firebase Auth & Firestore Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      clearListeners();

      if (fbUser) {
        const uid = fbUser.uid;

        // 1. Fetch / Sync User Doc in Firestore
        const userDocRef = doc(db, 'users', uid);
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const newUserDoc = {
              uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
              username: '@' + (fbUser.email?.split('@')[0] || 'nexus_' + uid.slice(0, 4)),
              email: fbUser.email || '',
              avatarUrl: fbUser.photoURL || DEFAULT_NEXUS_AVATAR,
              bio: 'Exploring got u ✨',
              status: 'online',
              lastActive: Date.now(),
              createdAt: new Date().toISOString(),
              friendRequests: {},
              blockedUsers: [],
            };
            await setDoc(userDocRef, newUserDoc).catch(() => {});
          } else {
            await updateDoc(userDocRef, {
              status: 'online',
              lastActive: Date.now(),
            }).catch(() => {});
          }
        } catch (e) {
          console.warn('User doc check notice:', e);
        }

        // Active Heartbeat every 20 seconds while tab is open
        const heartbeatTimer = setInterval(() => {
          if (document.visibilityState === 'visible') {
            updateDoc(userDocRef, {
              status: 'online',
              lastActive: Date.now(),
            }).catch(() => {});
          }
        }, 20000);

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            updateDoc(userDocRef, {
              status: 'online',
              lastActive: Date.now(),
            }).catch(() => {});
          } else {
            updateDoc(userDocRef, {
              status: 'offline',
              lastActive: Date.now(),
            }).catch(() => {});
          }
        };

        const handleBeforeUnload = () => {
          updateDoc(userDocRef, {
            status: 'offline',
            lastActive: Date.now(),
          }).catch(() => {});
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        listenersRef.current.push(() => {
          clearInterval(heartbeatTimer);
          window.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          updateDoc(userDocRef, {
            status: 'offline',
            lastActive: Date.now(),
          }).catch(() => {});
        });

        // 2. Real-time User Doc Listener
        const userUnsub = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const updatedUser: User = {
              id: uid,
              fullName: d.name || d.fullName || fbUser.displayName || 'Nexus User',
              username: d.username || '@' + (fbUser.email?.split('@')[0] || 'nexus'),
              email: fbUser.email || d.email || '',
              avatarUrl: d.avatarUrl || fbUser.photoURL || DEFAULT_NEXUS_AVATAR,
              coverUrl: d.coverUrl,
              bio: d.bio || 'Exploring got u ✨',
              phone: d.phone,
              isOnline: true,
              messagesCount: d.messagesCount || 0,
              groupsCount: d.groupsCount || 0,
              spacesCount: d.spacesCount || 0,
              mediaVisibility: d.mediaVisibility !== undefined ? d.mediaVisibility : true,
              lockedChatPins: d.lockedChatPins || {},
              mood: d.mood,
              moodPrivacy: d.moodPrivacy,
              isMoodHidden: d.isMoodHidden,
            };
            setCurrentUser(updatedUser);
            registerGlobalUser(updatedUser);

            if (d.lockedChatPins) {
              setLockedChatPins((prev) => ({ ...prev, ...d.lockedChatPins }));
            }
            if (d.friendRequests) setFriendRequests(d.friendRequests);
            if (d.blockedUsers) setBlockedUsers(d.blockedUsers);
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`));
        listenersRef.current.push(userUnsub);

        // 3. Real-time Chats Listener
        const chatsQ = query(collection(db, 'chats'), where('memberIds', 'array-contains', uid));
        const chatsUnsub = onSnapshot(chatsQ, (snap) => {
          const loadedChats: Chat[] = [];
          const activeTyping: Record<string, string[]> = {};

          snap.forEach((docSnap) => {
            const d = docSnap.data();

            if (d.typing && typeof d.typing === 'object') {
              const now = Date.now();
              const typingNames: string[] = [];
              Object.entries(d.typing).forEach(([otherUid, val]: [string, any]) => {
                if (otherUid !== uid && val && (now - (val.timestamp || 0)) < 10000) {
                  typingNames.push(val.name || 'Someone');
                }
              });
              if (typingNames.length > 0) {
                activeTyping[docSnap.id] = typingNames;
              }
            }

            loadedChats.push({
              id: docSnap.id,
              name: d.name || 'Chat',
              isGroup: d.isGroup || false,
              avatarUrl: d.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
              members: d.members || [],
              lastMessage: d.lastMessage || '',
              lastMessageTime: d.lastMessageTime || 'Just now',
              unreadCount: d.unreadCounts ? d.unreadCounts[uid] || 0 : (d.unreadCount || 0),
              category: d.category || (d.isGroup ? 'Groups' : 'All'),
              isPinned: typeof d.isPinned === 'object' ? !!d.isPinned[uid] : !!d.isPinned,
              isMuted: typeof d.isMuted === 'object' ? !!d.isMuted[uid] : !!d.isMuted,
              groupAdmins: d.groupAdmins || [],
              updatedAt: d.updatedAt || Date.now(),
            });
          });

          loadedChats.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
          setChats(loadedChats);
          setTypingUsers(activeTyping);

          // Listen to messages for each user chat
          loadedChats.forEach((c) => {
            if (!msgListenersRef.current[c.id]) {
              const msgQ = query(collection(db, 'chats', c.id, 'messages'), orderBy('createdAt', 'asc'));
              msgListenersRef.current[c.id] = onSnapshot(msgQ, (msgSnap) => {
                const msgList: Message[] = [];
                msgSnap.forEach((mSnap) => {
                  const mData = mSnap.data();
                  msgList.push({
                    id: mSnap.id,
                    chatId: c.id,
                    senderId: mData.senderId,
                    senderName: mData.senderName || '',
                    senderAvatar: mData.senderAvatar,
                    content: mData.text || mData.content || '',
                    type: mData.type || 'text',
                    timestamp: mData.timestamp || 'Just now',
                    createdAt: mData.createdAt,
                    isSentByMe: mData.senderId === uid,
                    status: mData.status || 'delivered',
                    reactions: mData.reactions || [],
                    mediaUrls: mData.mediaUrls || (mData.fileUrl ? [mData.fileUrl] : undefined),
                    fileUrl: mData.fileUrl,
                    fileName: mData.fileName,
                    fileSize: mData.fileSize,
                    duration: mData.duration,
                    replyTo: mData.replyTo,
                    isEdited: mData.isEdited || false,
                  });
                });
                setMessages((prev) => ({ ...prev, [c.id]: msgList }));
              }, (err) => handleFirestoreError(err, OperationType.GET, `chats/${c.id}/messages`));
            }
          });
        }, (err) => handleFirestoreError(err, OperationType.GET, 'chats'));
        listenersRef.current.push(chatsUnsub);

        // 4. Real-time Stories Listener
        const storiesQ = query(collection(db, 'stories'));
        const storiesUnsub = onSnapshot(storiesQ, (snap) => {
          const loadedStories: Story[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            loadedStories.push({
              id: docSnap.id,
              userId: d.userId,
              userName: d.userId === uid ? 'You' : (d.userName || 'User'),
              userAvatar: d.userAvatar || '',
              thumbnailUrl: d.thumbnailUrl || d.mediaUrl || '',
              mediaUrl: d.mediaUrl || '',
              caption: d.caption,
              mediaType: d.mediaType || 'image',
              unreadCount: 0,
              isYou: d.userId === uid,
              timestamp: d.timestamp || 'Just now',
              createdAt: d.createdAt || Date.now(),
              privacy: d.privacy || 'public',
              viewers: d.viewers || [],
              reactions: d.reactions || [],
            });
          });
          loadedStories.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
          setStories(loadedStories);
        }, (err) => handleFirestoreError(err, OperationType.GET, 'stories'));
        listenersRef.current.push(storiesUnsub);

        // 5. Real-time Notifications Listener
        const notifQ = query(collection(db, 'notifications'), where('recipientUserId', '==', uid));
        const notifUnsub = onSnapshot(notifQ, (snap) => {
          let savedReadNotifIds: string[] = [];
          try {
            const saved = localStorage.getItem('nexus_read_notif_ids');
            savedReadNotifIds = saved ? JSON.parse(saved) : [];
          } catch {
            savedReadNotifIds = [];
          }

          const loadedNotifs: NotificationItem[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            loadedNotifs.push({
              id: docSnap.id,
              title: d.title || 'Notification',
              description: d.description || d.message || '',
              timestamp: d.timestamp || 'Just now',
              type: d.type || d.notification_type || 'system',
              userAvatar: d.userAvatar || d.actorAvatar,
              isRead: d.isRead || savedReadNotifIds.includes(docSnap.id) || false,
              senderUserId: d.senderUserId || d.actorUserId,
              actorUserId: d.actorUserId || d.senderUserId,
              actionState: d.actionState || 'pending',
              postId: d.postId || d.post_id,
              reelId: d.reelId || d.reel_id,
              commentId: d.commentId || d.comment_id,
              replyId: d.replyId || d.reply_id,
              conversationId: d.conversationId || d.conversation_id,
              entityType: d.entityType || d.entity_type,
              entityId: d.entityId || d.entity_id,
              targetRoute: d.targetRoute || d.target_route,
              targetMetadata: d.targetMetadata || d.target_metadata,
            });
          });
          setNotifications(loadedNotifs);
        }, (err) => handleFirestoreError(err, OperationType.GET, 'notifications'));
        listenersRef.current.push(notifUnsub);

        // 6. Real-time Global Users Sync
        const usersQ = query(collection(db, 'users'), limit(100));
        const usersUnsub = onSnapshot(usersQ, (snap) => {
          const loaded: User[] = [];
          const now = Date.now();
          snap.forEach((uDoc) => {
            const ud = uDoc.data();
            const isGenuinelyOnline = ud.status === 'online' && (now - (ud.lastActive || 0) < 60 * 1000);
            const uObj: User = {
              id: uDoc.id,
              fullName: ud.name || ud.fullName || 'Nexus User',
              username: ud.username || '@nexus',
              email: ud.email || '',
              avatarUrl: ud.avatarUrl || DEFAULT_NEXUS_AVATAR,
              coverUrl: ud.coverUrl,
              bio: ud.bio || '',
              phone: ud.phone,
              isOnline: isGenuinelyOnline,
              mediaVisibility: ud.mediaVisibility !== undefined ? ud.mediaVisibility : true,
              mood: ud.mood,
              moodPrivacy: ud.moodPrivacy,
              isMoodHidden: ud.isMoodHidden,
              lastSeen: ud.lastActive ? new Date(ud.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Offline',
            };
            loaded.push(uObj);
            registerGlobalUser(uObj);
          });
          setAllUsers(loaded);
        }, (err) => console.warn('Users listener sync notice:', err));
        listenersRef.current.push(usersUnsub);

        // 7. Real-time Incoming Calls Listener
        const incomingCallQ = query(
          collection(db, 'calls'),
          where('receiverId', '==', uid),
          where('status', '==', 'ringing'),
          limit(1)
        );
        const incomingCallUnsub = onSnapshot(incomingCallQ, (snap) => {
          if (!snap.empty) {
            const firstDoc = snap.docs[0];
            const data = { id: firstDoc.id, ...firstDoc.data() } as CallRecord;
            // Only accept ringing calls created within the last 45s
            if (Date.now() - Number(data.createdAt || 0) < 45000) {
              if (currentCallIdRef.current !== firstDoc.id) {
                setIncomingCall(data);
                callSounds.startIncomingRingtone();
              }
            }
          } else {
            setIncomingCall((prev) => {
              if (prev) {
                callSounds.stopAll();
              }
              return null;
            });
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, 'calls'));
        listenersRef.current.push(incomingCallUnsub);

        // 8. Real-time Call History Listener
        const callsQ = query(
          collection(db, 'calls'),
          where('callerId', '==', uid),
          limit(30)
        );
        const callsReceiverQ = query(
          collection(db, 'calls'),
          where('receiverId', '==', uid),
          limit(30)
        );

        const handleCallsUpdate = (callerDocs: CallRecord[], receiverDocs: CallRecord[]) => {
          const map = new Map<string, CallRecord>();
          callerDocs.forEach((c) => map.set(c.id, c));
          receiverDocs.forEach((c) => map.set(c.id, c));
          const sorted = Array.from(map.values()).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
          setCallHistory(sorted);
        };

        let callerList: CallRecord[] = [];
        let receiverList: CallRecord[] = [];

        const callsCallerUnsub = onSnapshot(callsQ, (snap) => {
          callerList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallRecord));
          handleCallsUpdate(callerList, receiverList);
        }, () => {});
        listenersRef.current.push(callsCallerUnsub);

        const callsReceiverUnsub = onSnapshot(callsReceiverQ, (snap) => {
          receiverList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallRecord));
          handleCallsUpdate(callerList, receiverList);
        }, () => {});
        listenersRef.current.push(callsReceiverUnsub);

        // 9. Real-time Memory Capsules Sync
        const capRecipientQ = query(
          collection(db, 'memoryCapsules'),
          where('recipientId', '==', uid),
          limit(20)
        );
        const capRecipientUnsub = onSnapshot(capRecipientQ, (snap) => {
          if (!snap.empty) {
            const fetchedCaps: MemoryCapsule[] = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              isUnlocked: Date.now() >= (d.data().unlockTimestamp || 0),
            } as MemoryCapsule));
            setMemoryCapsules((prev) => {
              const map = new Map<string, MemoryCapsule>();
              prev.forEach((c) => map.set(c.id, c));
              fetchedCaps.forEach((c) => map.set(c.id, c));
              return Array.from(map.values());
            });
          }
        }, () => {});
        listenersRef.current.push(capRecipientUnsub);

        setScreen('main');
      } else {
        setScreen('welcome');
      }
    });

    return () => {
      unsubscribeAuth();
      clearListeners();
    };
  }, []);

  // Friend Requests Handlers
  const sendFriendRequest = async (targetUserId: string) => {
    if (!currentUser.id) return;
    const newRequests = { ...friendRequests, [targetUserId]: 'pending_sent' as const };
    setFriendRequests(newRequests);

    try {
      await updateDoc(doc(db, 'users', currentUser.id), { friendRequests: newRequests });

      const targetRef = doc(db, 'users', targetUserId);
      const targetSnap = await getDoc(targetRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const updatedTargetReqs = { ...(targetData.friendRequests || {}), [currentUser.id]: 'pending_received' };
        await updateDoc(targetRef, { friendRequests: updatedTargetReqs });
      }

      const notifId = 'notif_req_' + Date.now();
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUserId: targetUserId,
        senderUserId: currentUser.id,
        title: 'Friend Request',
        description: `${currentUser.fullName} sent you a friend request.`,
        timestamp: 'Just now',
        createdAt: Date.now(),
        type: 'request',
        userAvatar: currentUser.avatarUrl,
        isRead: false,
        actionState: 'pending',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUserId}`);
    }
  };

  const acceptFriendRequest = async (targetUserId: string) => {
    if (!currentUser.id) return;
    const newRequests = { ...friendRequests, [targetUserId]: 'accepted' as const };
    setFriendRequests(newRequests);

    try {
      await updateDoc(doc(db, 'users', currentUser.id), { friendRequests: newRequests });

      const targetRef = doc(db, 'users', targetUserId);
      const targetSnap = await getDoc(targetRef);
      let targetName = 'User';
      let targetAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600';

      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        targetName = targetData.name || targetData.fullName || 'User';
        targetAvatar = targetData.avatarUrl || targetAvatar;
        const updatedTargetReqs = { ...(targetData.friendRequests || {}), [currentUser.id]: 'accepted' };
        await updateDoc(targetRef, { friendRequests: updatedTargetReqs });
      }

      // Update current user's local notification view
      setNotifications((prev) =>
        prev.map((n) =>
          n.senderUserId === targetUserId && n.type === 'request'
            ? {
                ...n,
                description: `You are now friends with ${targetName}.`,
                actionState: 'accepted',
              }
            : n
        )
      );

      // Notification to target user (Sender of original request)
      const notifId = 'notif_acc_' + Date.now();
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUserId: targetUserId,
        senderUserId: currentUser.id,
        title: 'Friend Request Accepted',
        description: `You are now friends with ${currentUser.fullName}.`,
        timestamp: 'Just now',
        createdAt: Date.now(),
        type: 'request',
        userAvatar: currentUser.avatarUrl,
        isRead: false,
        actionState: 'accepted',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUserId}`);
    }
  };

  const rejectFriendRequest = async (targetUserId: string) => {
    if (!currentUser.id) return;
    const newRequests = { ...friendRequests, [targetUserId]: 'none' as const };
    setFriendRequests(newRequests);
    try {
      await updateDoc(doc(db, 'users', currentUser.id), { friendRequests: newRequests });
    } catch (err) {
      console.warn(err);
    }
  };

  const cancelFriendRequest = async (targetUserId: string) => {
    await rejectFriendRequest(targetUserId);
  };

  const removeFriend = async (targetUserId: string) => {
    await rejectFriendRequest(targetUserId);
  };

  // Settings Handlers
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(true);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(true);
  const [autoDownloadMedia, setAutoDownloadMedia] = useState<boolean>(true);
  const [storageUsageMB, setStorageUsageMB] = useState<number>(1240);

  const blockUser = async (targetUserId: string) => {
    const updatedBlocked = blockedUsers.includes(targetUserId) ? blockedUsers : [...blockedUsers, targetUserId];
    setBlockedUsers(updatedBlocked);
    if (currentUser.id) {
      try {
        await updateDoc(doc(db, 'users', currentUser.id), { blockedUsers: updatedBlocked });
      } catch (err) { console.warn(err); }
    }
  };

  const unblockUser = async (targetUserId: string) => {
    const updatedBlocked = blockedUsers.filter((id) => id !== targetUserId);
    setBlockedUsers(updatedBlocked);
    if (currentUser.id) {
      try {
        await updateDoc(doc(db, 'users', currentUser.id), { blockedUsers: updatedBlocked });
      } catch (err) { console.warn(err); }
    }
  };

  const clearCache = () => {
    setStorageUsageMB(45);
  };

  // Stories Handlers
  const [seenStoryIds, setSeenStoryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_seen_story_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [globalChatPin, setGlobalChatPinState] = useState<string | null>(() => {
    return localStorage.getItem('nexus_global_chat_pin');
  });

  const setGlobalChatPin = (pin: string | null) => {
    setGlobalChatPinState(pin);
    if (pin) {
      localStorage.setItem('nexus_global_chat_pin', pin);
    } else {
      localStorage.removeItem('nexus_global_chat_pin');
    }
    if (currentUser.id) {
      setDoc(doc(db, 'users', currentUser.id), { globalChatPin: pin }, { merge: true }).catch(console.warn);
    }
  };

  const addStory = async (
    mediaUrl: string,
    caption?: string,
    mediaType: 'image' | 'video' = 'image',
    privacy: 'public' | 'close_friends' = 'public'
  ) => {
    if (!currentUser.id) return;
    const storyId = 'story_' + Date.now();
    const storyData = {
      id: storyId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userAvatar: currentUser.avatarUrl,
      thumbnailUrl: mediaUrl,
      mediaUrl,
      caption: caption || '',
      mediaType,
      createdAt: Date.now(),
      privacy,
      viewers: [],
      reactions: [],
    };
    try {
      await setDoc(doc(db, 'stories', storyId), storyData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stories/${storyId}`);
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      await deleteDoc(doc(db, 'stories', storyId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `stories/${storyId}`);
    }
  };

  const markStoryAsSeen = async (storyId: string) => {
    setSeenStoryIds((prev) => {
      if (prev.includes(storyId)) return prev;
      const next = [...prev, storyId];
      try {
        localStorage.setItem('nexus_seen_story_ids', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    if (!currentUser.id) return;
    try {
      const storyRef = doc(db, 'stories', storyId);
      const snap = await getDoc(storyRef);
      if (snap.exists()) {
        const d = snap.data();
        const currentViewers = d.viewers || [];
        if (!currentViewers.some((v: any) => v.userId === currentUser.id)) {
          const newViewer = {
            id: 'v_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.fullName,
            userAvatar: currentUser.avatarUrl,
            viewedAt: 'Just now',
          };
          await updateDoc(storyRef, { viewers: [...currentViewers, newViewer] });
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const reactToStory = async (storyId: string, emoji: string) => {
    if (!currentUser.id) return;
    try {
      const storyRef = doc(db, 'stories', storyId);
      const snap = await getDoc(storyRef);
      if (snap.exists()) {
        const d = snap.data();
        const currentReactions = d.reactions || [];
        const existing = currentReactions.find((r: any) => r.userId === currentUser.id && r.emoji === emoji);
        if (!existing) {
          const newReaction = {
            id: 'r_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.fullName,
            userAvatar: currentUser.avatarUrl,
            emoji,
            timestamp: 'Just now',
          };
          await updateDoc(storyRef, { reactions: [...currentReactions, newReaction] });
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Simple fast deterministic PIN hash for chat locking
  const hashPinSync = (pin: string): string => {
    let hash = 0x811c9dc5;
    const str = pin + '_nexus_chat_lock_salt_2026';
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return 'hp_' + (hash >>> 0).toString(16);
  };

  // Chat Locks
  const [lockedChatPins, setLockedChatPins] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('nexus_locked_chat_pins');
      return saved ? JSON.parse(saved) : { chat_denpasar: 'hp_953ad1e' };
    } catch {
      return { chat_denpasar: 'hp_953ad1e' };
    }
  });
  const [unlockedChatsInSession, setUnlockedChatsInSession] = useState<Record<string, boolean>>({});

  const lockChatWithPin = (chatId: string, pin: string) => {
    const hashed = hashPinSync(pin);
    setLockedChatPins((prev) => {
      const next = { ...prev, [chatId]: hashed };
      localStorage.setItem('nexus_locked_chat_pins', JSON.stringify(next));
      return next;
    });

    if (auth.currentUser) {
      const uRef = doc(db, 'users', auth.currentUser.uid);
      getDoc(uRef).then((snap) => {
        const existingPins = snap.exists() && snap.data()?.lockedChatPins ? snap.data().lockedChatPins : {};
        updateDoc(uRef, { lockedChatPins: { ...existingPins, [chatId]: hashed } }).catch(() => {});
      }).catch(() => {});
    }
  };

  const unlockChatWithPin = (chatId: string, pin: string): boolean => {
    const hashed = hashPinSync(pin);
    if (lockedChatPins[chatId] === hashed || lockedChatPins[chatId] === pin) {
      setUnlockedChatsInSession((prev) => ({ ...prev, [chatId]: true }));
      return true;
    }
    return false;
  };

  const removeChatLock = (chatId: string) => {
    setLockedChatPins((prev) => {
      const copy = { ...prev };
      delete copy[chatId];
      localStorage.setItem('nexus_locked_chat_pins', JSON.stringify(copy));
      return copy;
    });

    if (auth.currentUser) {
      const uRef = doc(db, 'users', auth.currentUser.uid);
      getDoc(uRef).then((snap) => {
        if (snap.exists() && snap.data()?.lockedChatPins) {
          const updatedPins = { ...snap.data().lockedChatPins };
          delete updatedPins[chatId];
          updateDoc(uRef, { lockedChatPins: updatedPins }).catch(() => {});
        }
      }).catch(() => {});
    }
  };

  // UI States
  const [isGlobalAiAssistantOpen, setIsGlobalAiAssistantOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nexus_theme') as 'dark' | 'light') || 'dark';
  });

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('nexus_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState<boolean>(true);
  const [activeMediaViewer, setActiveMediaViewer] = useState<{ url: string; title?: string } | null>(null);
  const [activeProfilePhotoViewer, setActiveProfilePhotoViewer] = useState<{
    url: string;
    name?: string;
    username?: string;
  } | null>(null);
  const [activePostViewer, setActivePostViewer] = useState<Post | null>(null);

  const openProfilePhotoViewer = (url: string, name?: string, username?: string) => {
    setActiveProfilePhotoViewer({ url, name, username });
  };

  const closeProfilePhotoViewer = () => {
    setActiveProfilePhotoViewer(null);
  };

  const openPostViewer = (post: Post) => {
    setActivePostViewer(post);
  };

  const closePostViewer = () => {
    setActivePostViewer(null);
  };

  const [targetReelTarget, setTargetReelTarget] = useState<{ reelId: string; commentId?: string } | null>(null);

  const openReel = (reelId: string, commentId?: string) => {
    setTargetReelTarget({ reelId, commentId });
    setActiveTab('reels');
  };

  const clearReelTarget = () => {
    setTargetReelTarget(null);
  };

  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);

  const openUserProfile = async (userOrUserId: User | string) => {
    if (!userOrUserId) return;
    if (typeof userOrUserId === 'object') {
      if (userOrUserId.id === currentUser.id) {
        setActiveTab('profile');
        setSelectedProfileUser(null);
        return;
      }
      setSelectedProfileUser(userOrUserId);
      return;
    }

    const userId = userOrUserId;
    if (userId === currentUser.id) {
      setActiveTab('profile');
      setSelectedProfileUser(null);
      return;
    }

    // Check allUsers cache first
    const cachedUser = allUsers.find((u) => u.id === userId);
    if (cachedUser) {
      setSelectedProfileUser(cachedUser);
      return;
    }

    // Fetch user from Firestore
    try {
      const userDocRef = doc(db, 'users', userId);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const uData = { id: snap.id, ...snap.data() } as User;
        setSelectedProfileUser(uData);
        return;
      }
    } catch (e) {
      console.warn('Error fetching user document for profile view:', e);
    }
  };

  const closeUserProfile = () => {
    setSelectedProfileUser(null);
  };

  const openChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const closeChat = () => {
    setActiveChatId(null);
  };

  const sendMessage = async (
    chatId: string,
    content: string,
    type: MessageType = 'text',
    extra: Partial<Message> = {}
  ) => {
    if (!currentUser.id) return;
    const msgId = 'msg_' + Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic local state update
    const nowMs = Date.now();
    const newMsg: Message = {
      id: msgId,
      chatId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatarUrl,
      content,
      type,
      timestamp: timeStr,
      createdAt: nowMs,
      isSentByMe: true,
      status: 'sent',
      reactions: [],
      ...extra,
    };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []).filter((m) => m.id !== msgId), newMsg],
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              lastMessage: type === 'text' ? content : `[${type}] ${content}`,
              lastMessageTime: 'Just now',
              updatedAt: Date.now(),
            }
          : c
      )
    );

    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
      await setDoc(msgRef, {
        id: msgId,
        chatId,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        senderAvatar: currentUser.avatarUrl,
        text: content,
        content,
        type,
        timestamp: timeStr,
        createdAt: Date.now(),
        status: 'delivered',
        isRead: false,
        ...extra,
      });

      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: type === 'text' ? content : `[${type}] ${content}`,
        lastMessageTime: 'Just now',
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/messages/${msgId}`);
    }
  };

  const addReaction = async (chatId: string, messageId: string, emoji: string) => {
    if (!currentUser.id) return;
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      const snap = await getDoc(msgRef);
      if (snap.exists()) {
        const d = snap.data();
        const reactions = d.reactions ? [...d.reactions] : [];
        const existing = reactions.find((r: any) => r.emoji === emoji);
        if (existing) {
          existing.count += 1;
          if (!existing.users.includes(currentUser.id)) {
            existing.users.push(currentUser.id);
          }
        } else {
          reactions.push({ emoji, count: 1, users: [currentUser.id] });
        }
        await updateDoc(msgRef, { reactions });
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const deleteMessage = async (chatId: string, messageId: string) => {
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (err) {
      console.warn(err);
    }
  };

  const editMessage = async (chatId: string, messageId: string, newContent: string) => {
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        text: newContent,
        content: newContent,
        isEdited: true,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const togglePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const toggleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  const createNewChatWithUser = async (user: User): Promise<string> => {
    if (!currentUser.id) return '';
    const existing = chats.find((c) => !c.isGroup && c.members.some((m) => m.id === user.id));
    if (existing) {
      openChat(existing.id);
      return existing.id;
    }

    const newChatId = 'chat_' + [currentUser.id, user.id].sort().join('_');
    const chatRef = doc(db, 'chats', newChatId);

    try {
      const snap = await getDoc(chatRef);
      if (!snap.exists()) {
        const newChatData = {
          id: newChatId,
          name: user.fullName,
          isGroup: false,
          avatarUrl: user.avatarUrl,
          memberIds: [currentUser.id, user.id],
          members: [
            { id: currentUser.id, fullName: currentUser.fullName, username: currentUser.username, avatarUrl: currentUser.avatarUrl },
            { id: user.id, fullName: user.fullName, username: user.username, avatarUrl: user.avatarUrl },
          ],
          lastMessage: 'Started conversation',
          lastMessageTime: 'Just now',
          updatedAt: Date.now(),
          unreadCount: 0,
          category: 'All',
        };
        await setDoc(chatRef, newChatData);
        setChats((prev) => {
          if (prev.some((c) => c.id === newChatId)) return prev;
          return [newChatData, ...prev];
        });
      }
    } catch (err) {
      console.warn('Error creating chat doc:', err);
    }

    openChat(newChatId);
    return newChatId;
  };

  const createNewGroup = async (name: string, members: User[]): Promise<string> => {
    if (!currentUser.id) return '';
    const newGroupId = 'group_' + Date.now();
    const allMembers = [currentUser, ...members];
    const groupRef = doc(db, 'chats', newGroupId);

    try {
      const newGroupData = {
        id: newGroupId,
        name,
        isGroup: true,
        avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600',
        memberIds: allMembers.map((m) => m.id),
        members: allMembers.map((m) => ({ id: m.id, fullName: m.fullName, username: m.username, avatarUrl: m.avatarUrl })),
        lastMessage: `Group "${name}" created`,
        lastMessageTime: 'Just now',
        updatedAt: Date.now(),
        unreadCount: 0,
        category: 'Groups',
        groupAdmins: [currentUser.id],
      };
      await setDoc(groupRef, newGroupData);
      setChats((prev) => {
        if (prev.some((c) => c.id === newGroupId)) return prev;
        return [newGroupData, ...prev];
      });
    } catch (err) {
      console.warn('Error creating group doc:', err);
    }

    openChat(newGroupId);
    return newGroupId;
  };

  const togglePhoneFrameMode = () => {
    setIsPhoneFrameMode((prev) => !prev);
  };

  // Helper to safely clean up all WebRTC media streams, peer connections, and listeners
  const cleanupCallSession = (endStatus: 'ended' | 'declined' | 'missed' | 'failed' = 'ended') => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (ringingTimeoutRef.current !== null) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    callUnsubsRef.current.forEach((unsub) => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    });
    callUnsubsRef.current = [];

    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
      } catch (e) {
        console.warn('Error closing RTCPeerConnection:', e);
      }
      peerConnectionRef.current = null;
    }

    callSounds.stopAll();
    if (endStatus === 'ended' || endStatus === 'declined') {
      callSounds.playEndCallTone();
    }

    currentCallIdRef.current = null;
    callStartTimeRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);

    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 300);
  };

  // 1. Start Outgoing WebRTC Call
  const startCall = async (user: User, type: CallType) => {
    if (!currentUser.id) return;
    cleanupCallSession();

    // Set initial ringing UI state
    setActiveCall({
      id: '',
      peerUser: user,
      type,
      status: 'ringing',
      isIncoming: false,
      durationSec: 0,
      isMuted: false,
      isVideoOn: type === 'video',
      isFrontCamera: true,
      localStream: null,
      remoteStream: null,
    });

    callSounds.startOutgoingRinging();

    // 1. Capture local microphone & camera (with graceful simulated fallback if denied)
    const mediaRes = await getLocalUserMedia(
      type === 'video',
      'user',
      currentUser.fullName || currentUser.username
    );

    if (!mediaRes.stream) {
      callSounds.stopAll();
      callSounds.playEndCallTone();
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              error: mediaRes.error || 'Media device access was denied or failed.',
            }
          : null
      );
      setTimeout(() => cleanupCallSession('failed'), 4000);
      return;
    }

    localStreamRef.current = mediaRes.stream;
    setActiveCall((prev) =>
      prev
        ? {
            ...prev,
            localStream: mediaRes.stream,
            isFallbackStream: mediaRes.isFallback,
            error: mediaRes.isFallback ? mediaRes.error : undefined,
          }
        : null
    );

    // 2. Initialize RTCPeerConnection
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    mediaRes.stream.getTracks().forEach((track) => {
      pc.addTrack(track, mediaRes.stream!);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setActiveCall((prev) => (prev ? { ...prev, remoteStream: event.streams[0] } : null));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        callSounds.stopAll();
        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                status: 'connected',
                connectionState: 'connected',
              }
            : null
        );
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn('WebRTC connection state changed:', pc.connectionState);
      }
    };

    // 3. Create Call Document in Firestore
    const callDocRef = doc(collection(db, 'calls'));
    const callId = callDocRef.id;
    currentCallIdRef.current = callId;

    setActiveCall((prev) => (prev ? { ...prev, id: callId } : null));

    // Collect Caller ICE candidates (rate-limited to avoid excessive document writes)
    let callerCandidateCount = 0;
    pc.onicecandidate = (event) => {
      if (event.candidate && callerCandidateCount < 6) {
        callerCandidateCount++;
        addDoc(collection(db, 'calls', callId, 'callerCandidates'), event.candidate.toJSON()).catch((e) =>
          console.warn('Caller candidate sync notice:', e?.message || e)
        );
      }
    };

    // 4. Create and set SDP Offer
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await pc.setLocalDescription(offer);

      const callData: CallRecord = {
        id: callId,
        callerId: currentUser.id,
        callerName: currentUser.fullName,
        callerAvatar: currentUser.avatarUrl,
        callerUsername: currentUser.username,
        receiverId: user.id,
        receiverName: user.fullName,
        receiverAvatar: user.avatarUrl,
        receiverUsername: user.username,
        callType: type,
        status: 'ringing',
        offer: {
          type: offer.type,
          sdp: offer.sdp || '',
        },
        createdAt: Date.now(),
      };

      await setDoc(callDocRef, callData);
    } catch (e: any) {
      console.error('Error creating offer:', e);
      cleanupCallSession('failed');
      return;
    }

    // 5. Listen to Call document for Answer or status updates
    const callDocUnsub = onSnapshot(callDocRef, async (snap) => {
      if (!snap.exists()) {
        cleanupCallSession('ended');
        return;
      }

      const data = snap.data() as CallRecord;

      if (data.status === 'declined' || data.status === 'ended' || data.status === 'missed') {
        cleanupCallSession(data.status);
        return;
      }

      if (data.answer && pc && !pc.currentRemoteDescription) {
        try {
          const rtcAnswer = typeof RTCSessionDescription === 'function'
            ? new RTCSessionDescription(data.answer)
            : (data.answer as RTCSessionDescriptionInit);
          await pc.setRemoteDescription(rtcAnswer);
          callSounds.stopAll();
          callSounds.playConnectedChime();
          callStartTimeRef.current = Date.now();
          setActiveCall((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'connected',
                }
              : null
          );
        } catch (e) {
          console.error('Error applying remote answer:', e);
        }
      }
    }, (err) => console.warn('Call doc listener notice:', err));
    callUnsubsRef.current.push(callDocUnsub);

    // 6. Listen for Receiver ICE candidates
    const receiverCandidatesCol = collection(db, 'calls', callId, 'receiverCandidates');
    const receiverCandidatesUnsub = onSnapshot(receiverCandidatesCol, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          if (pc && pc.remoteDescription) {
            try {
              const candidate = typeof RTCIceCandidate === 'function'
                ? new RTCIceCandidate(candidateData)
                : (candidateData as RTCIceCandidateInit);
              await pc.addIceCandidate(candidate);
            } catch (e) {
              console.warn('Error adding receiver ICE candidate:', e);
            }
          }
        }
      });
    }, (err) => console.warn('Receiver candidates listener notice:', err));
    callUnsubsRef.current.push(receiverCandidatesUnsub);

    // 7. Ringing Timeout (35s)
    ringingTimeoutRef.current = window.setTimeout(async () => {
      if (currentCallIdRef.current === callId) {
        await updateDoc(callDocRef, {
          status: 'missed',
          endedAt: Date.now(),
          duration: 0,
        }).catch(() => {});
        cleanupCallSession('missed');
      }
    }, 35000);
  };

  // 2. Accept Incoming WebRTC Call
  const acceptIncomingCall = async (call: CallRecord) => {
    callSounds.stopAll();
    setIncomingCall(null);
    currentCallIdRef.current = call.id;

    const callerUser: User = {
      id: call.callerId,
      fullName: call.callerName,
      username: call.callerUsername || '@user',
      email: '',
      avatarUrl: call.callerAvatar,
      isOnline: true,
    };

    setActiveCall({
      id: call.id,
      peerUser: callerUser,
      type: call.callType,
      status: 'connecting',
      isIncoming: true,
      durationSec: 0,
      isMuted: false,
      isVideoOn: call.callType === 'video',
      isFrontCamera: true,
      localStream: null,
      remoteStream: null,
    });

    // 1. Capture local media
    const mediaRes = await getLocalUserMedia(
      call.callType === 'video',
      'user',
      currentUser.fullName || currentUser.username
    );

    if (!mediaRes.stream) {
      callSounds.playEndCallTone();
      setActiveCall((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              error: mediaRes.error || 'Media device access failed.',
            }
          : null
      );
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'failed',
        endedAt: Date.now(),
      }).catch(() => {});
      setTimeout(() => cleanupCallSession('failed'), 4000);
      return;
    }

    localStreamRef.current = mediaRes.stream;
    setActiveCall((prev) =>
      prev
        ? {
            ...prev,
            localStream: mediaRes.stream,
            isFallbackStream: mediaRes.isFallback,
            error: mediaRes.isFallback ? mediaRes.error : undefined,
          }
        : null
    );

    // 2. Create RTCPeerConnection
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    mediaRes.stream.getTracks().forEach((track) => {
      pc.addTrack(track, mediaRes.stream!);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setActiveCall((prev) => (prev ? { ...prev, remoteStream: event.streams[0] } : null));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        callSounds.stopAll();
        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                status: 'connected',
                connectionState: 'connected',
              }
            : null
        );
      }
    };

    // 3. Send Receiver ICE candidates (rate-limited)
    let receiverCandidateCount = 0;
    pc.onicecandidate = (event) => {
      if (event.candidate && receiverCandidateCount < 6) {
        receiverCandidateCount++;
        addDoc(collection(db, 'calls', call.id, 'receiverCandidates'), event.candidate.toJSON()).catch((e) =>
          console.warn('Receiver candidate sync notice:', e?.message || e)
        );
      }
    };

    // 4. Set Remote Description (Caller Offer) and Create Answer
    try {
      if (!call.offer) {
        throw new Error('No offer found in call document');
      }

      const rtcOffer = typeof RTCSessionDescription === 'function'
        ? new RTCSessionDescription(call.offer)
        : (call.offer as RTCSessionDescriptionInit);
      await pc.setRemoteDescription(rtcOffer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', call.id), {
        answer: {
          type: answer.type,
          sdp: answer.sdp || '',
        },
        status: 'connected',
        startedAt: Date.now(),
      });

      callSounds.playConnectedChime();
      callStartTimeRef.current = Date.now();
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    } catch (e: any) {
      console.error('Error answering call:', e);
      cleanupCallSession('failed');
      return;
    }

    // 5. Listen for Caller ICE Candidates
    const callerCandidatesCol = collection(db, 'calls', call.id, 'callerCandidates');
    const callerCandidatesUnsub = onSnapshot(callerCandidatesCol, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          if (pc && pc.remoteDescription) {
            try {
              const candidate = typeof RTCIceCandidate === 'function'
                ? new RTCIceCandidate(candidateData)
                : (candidateData as RTCIceCandidateInit);
              await pc.addIceCandidate(candidate);
            } catch (e) {
              console.warn('Error adding caller ICE candidate:', e);
            }
          }
        }
      });
    }, (err) => console.warn('Caller candidates listener notice:', err));
    callUnsubsRef.current.push(callerCandidatesUnsub);

    // 6. Listen to Call document for hangup/end
    const callDocUnsub = onSnapshot(doc(db, 'calls', call.id), (snap) => {
      if (!snap.exists()) {
        cleanupCallSession('ended');
        return;
      }
      const data = snap.data() as CallRecord;
      if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
        cleanupCallSession(data.status);
      }
    }, (err) => console.warn('Call doc status listener notice:', err));
    callUnsubsRef.current.push(callDocUnsub);
  };

  // 3. Decline Incoming Call
  const declineIncomingCall = async (call: CallRecord) => {
    callSounds.stopAll();
    callSounds.playEndCallTone();
    setIncomingCall(null);

    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'declined',
        endedAt: Date.now(),
        duration: 0,
      });
    } catch (e) {
      console.warn('Error declining call:', e);
    }
  };

  // 4. End Current Active Call
  const endCall = async () => {
    const callId = currentCallIdRef.current;
    const duration = callStartTimeRef.current
      ? Math.max(0, Math.floor((Date.now() - callStartTimeRef.current) / 1000))
      : 0;

    if (callId) {
      try {
        await updateDoc(doc(db, 'calls', callId), {
          status: 'ended',
          endedAt: Date.now(),
          duration,
        });
      } catch (e) {
        console.warn('Error updating endCall in Firestore:', e);
      }
    }

    cleanupCallSession('ended');
  };

  // 5. Toggle Audio Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setActiveCall((prev) => (prev ? { ...prev, isMuted: !audioTrack.enabled } : null));
      }
    }
  };

  // 6. Toggle Video On/Off
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setActiveCall((prev) => (prev ? { ...prev, isVideoOn: videoTrack.enabled } : null));
      }
    }
  };

  // 7. Flip Front / Rear Camera
  const flipCamera = async () => {
    if (!activeCall || !localStreamRef.current || !peerConnectionRef.current) return;
    const nextFacingMode = activeCall.isFrontCamera ? 'environment' : 'user';

    try {
      const newStreamResult = await getLocalUserMedia(
        true,
        nextFacingMode,
        currentUser.fullName || currentUser.username
      );
      if (newStreamResult.stream) {
        const newVideoTrack = newStreamResult.stream.getVideoTracks()[0];
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

        if (oldVideoTrack) {
          oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
        }

        localStreamRef.current.addTrack(newVideoTrack);

        // Replace track in RTCPeerConnection sender
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }

        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                isFrontCamera: nextFacingMode === 'user',
                localStream: localStreamRef.current,
              }
            : null
        );
      }
    } catch (e) {
      console.warn('Error flipping camera:', e);
    }
  };

  const openMediaViewer = (url: string, title?: string) => {
    setActiveMediaViewer({ url, title });
  };

  const closeMediaViewer = () => {
    setActiveMediaViewer(null);
  };

  const login = async (emailOrUsername: string, password?: string) => {
    const cleanInput = emailOrUsername.trim();
    if (!cleanInput || !password) {
      throw new Error('Incorrect username or password.');
    }

    // 1. Check Server-Side Authentication & Role Verification (e.g. Master Admin)
    try {
      const adminResult = await adminLogin(cleanInput, password);
      if (adminResult.success) {
        // Silently open private Administration Dashboard
        window.location.hash = '#/admin';
        try {
          window.dispatchEvent(new Event('hashchange'));
        } catch {
          try {
            const evt = document.createEvent('Event');
            evt.initEvent('hashchange', true, true);
            window.dispatchEvent(evt);
          } catch {}
        }
        return;
      }
    } catch (err) {
      // Non-blocking server auth check, fall through to user database
    }

    // 2. Scalable Indexed Username / Email Lookup in Firestore
    let targetEmail = '';
    const formattedUsername = cleanInput.startsWith('@') ? cleanInput : '@' + cleanInput;

    try {
      // Scalable indexed query with limit(1) - handles billion+ scale without collection scans
      const userQ = query(
        collection(db, 'users'),
        where('username', '==', formattedUsername),
        limit(1)
      );
      const snap = await getDocs(userQ);
      if (!snap.empty) {
        targetEmail = snap.docs[0].data().email;
      } else {
        // Fallback check for raw username without @ prefix
        const rawQ = query(
          collection(db, 'users'),
          where('username', '==', cleanInput),
          limit(1)
        );
        const rawSnap = await getDocs(rawQ);
        if (!rawSnap.empty) {
          targetEmail = rawSnap.docs[0].data().email;
        }
      }
    } catch (e) {
      console.warn('Error querying username in Firestore:', e);
    }

    // If username query found a user, use targetEmail. Otherwise, if input is direct email, use cleanInput.
    if (!targetEmail) {
      if (cleanInput.includes('@') && !cleanInput.startsWith('@')) {
        targetEmail = cleanInput;
      } else {
        throw new Error('Incorrect username or password.');
      }
    }

    try {
      await signInWithEmailAndPassword(auth, targetEmail, password);
      setScreen('main');
    } catch (err: any) {
      throw new Error('Incorrect username or password.');
    }
  };

  const signup = async (
    fullName: string,
    username: string,
    email: string,
    password?: string,
    avatarUrl?: string
  ) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const formattedUsername = username.startsWith('@') ? username : '@' + username;

    // Check if username already exists in Firestore
    try {
      const usernameQ = query(collection(db, 'users'), where('username', '==', formattedUsername));
      const usernameSnap = await getDocs(usernameQ);
      if (!usernameSnap.empty) {
        throw new Error('This username is already exists.');
      }
    } catch (e: any) {
      if (e.message === 'This username is already exists.') {
        throw e;
      }
      console.warn('Username query error:', e);
    }

    const res = await createUserWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    const newUserDoc = {
      uid,
      name: fullName,
      username: formattedUsername,
      email,
      avatarUrl: avatarUrl || DEFAULT_NEXUS_AVATAR,
      bio: 'Exploring got u ✨',
      status: 'online',
      createdAt: new Date().toISOString(),
      friendRequests: {},
      blockedUsers: [],
    };

    await setDoc(doc(db, 'users', uid), newUserDoc);
    setScreen('suggested_friends');
  };

  const loginWithGoogle = async () => {
    if (isGoogleSignInActiveRef.current) {
      console.warn('Google sign-in already in progress, skipping duplicate call.');
      return;
    }
    isGoogleSignInActiveRef.current = true;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const formattedUsername = '@' + (fbUser.email ? fbUser.email.split('@')[0] : 'user_' + fbUser.uid.slice(0, 4));
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          name: fbUser.displayName || 'Nexus User',
          username: formattedUsername,
          email: fbUser.email || '',
          avatarUrl: fbUser.photoURL || DEFAULT_NEXUS_AVATAR,
          bio: 'Exploring got u ✨',
          status: 'online',
          createdAt: new Date().toISOString(),
          friendRequests: {},
          blockedUsers: [],
        });
        setScreen('suggested_friends');
      } else {
        setScreen('main');
      }
    } catch (err: any) {
      const msg = err?.message || String(err || '');
      const code = err?.code || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked' ||
        msg.includes('Pending promise') ||
        msg.includes('popup') ||
        msg.includes('ASSERTION')
      ) {
        console.warn('Google Sign-In popup notice:', msg);
        throw new Error('Google Sign-In was cancelled or blocked by the browser. Please use email sign-in or check popup permissions.');
      }
      throw err;
    } finally {
      setTimeout(() => {
        isGoogleSignInActiveRef.current = false;
      }, 600);
    }
  };

  const updateProfile = async (updated: Partial<User>) => {
    // Defensively compress avatarUrl or coverUrl if provided as base64 or raw data
    const safeUpdated = { ...updated };
    if (safeUpdated.avatarUrl && safeUpdated.avatarUrl.startsWith('data:')) {
      try {
        safeUpdated.avatarUrl = await compressAvatar(safeUpdated.avatarUrl);
      } catch (err) {
        console.warn('Avatar compression notice:', err);
      }
    }
    if (safeUpdated.coverUrl && safeUpdated.coverUrl.startsWith('data:')) {
      try {
        safeUpdated.coverUrl = await compressCover(safeUpdated.coverUrl);
      } catch (err) {
        console.warn('Cover compression notice:', err);
      }
    }

    setCurrentUser((prev) => {
      const newUser = { ...prev, ...safeUpdated };
      try {
        localStorage.setItem('nexus_saved_user_' + (newUser.id || 'me'), JSON.stringify(newUser));
      } catch (e) {
        console.warn(e);
      }
      return newUser;
    });

    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const firestorePayload: Record<string, any> = {};
      if (safeUpdated.fullName !== undefined) {
        firestorePayload.name = safeUpdated.fullName;
        firestorePayload.fullName = safeUpdated.fullName;
      }
      if (safeUpdated.username !== undefined) firestorePayload.username = safeUpdated.username;
      if (safeUpdated.avatarUrl !== undefined) firestorePayload.avatarUrl = safeUpdated.avatarUrl;
      if (safeUpdated.coverUrl !== undefined) firestorePayload.coverUrl = safeUpdated.coverUrl;
      if (safeUpdated.bio !== undefined) firestorePayload.bio = safeUpdated.bio;
      if (safeUpdated.phone !== undefined) firestorePayload.phone = safeUpdated.phone;
      if (safeUpdated.mediaVisibility !== undefined) firestorePayload.mediaVisibility = safeUpdated.mediaVisibility;

      try {
        await setDoc(userRef, firestorePayload, { merge: true });
      } catch (err) {
        console.warn('Firestore updateProfile warning:', err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const logout = async () => {
    clearListeners();
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }

    setChats([]);
    setMessages({});
    setStories([]);
    setNotifications([]);
    setFriendRequests({});
    setBlockedUsers([]);
    setLockedChatPins({});
    setUnlockedChatsInSession({});
    setActiveChatId(null);
    setScreen('welcome');
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      const saved = localStorage.getItem('nexus_read_notif_ids');
      const existing: string[] = saved ? JSON.parse(saved) : [];
      if (!existing.includes(id)) {
        const next = [...existing, id];
        localStorage.setItem('nexus_read_notif_ids', JSON.stringify(next));
      }
    } catch (err) {
      console.warn(err);
    }
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (e) {
        console.warn(e);
      }
    }
    // Also notify PostgreSQL notification service
    fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
  };

  // Feature 2: Mood Chat implementation
  const saveUserMood = async (mood: UserMood, privacy: MoodPrivacy, isHidden: boolean) => {
    setCurrentUser((prev) => ({
      ...prev,
      mood,
      moodPrivacy: privacy,
      isMoodHidden: isHidden,
    }));
    if (auth.currentUser) {
      const uRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(uRef, cleanFirestoreData({ mood, moodPrivacy: privacy, isMoodHidden: isHidden })).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`)
      );
    }
  };

  // Feature 3: Event Groups implementation
  const createEventGroup = async (name: string, eventDetails: EventDetails, members: User[]) => {
    const newGroupId = `event_group_${Date.now()}`;
    const allMembers = [currentUser, ...members.filter((m) => m.id !== currentUser.id)];
    const newChat: Chat = {
      id: newGroupId,
      name,
      isGroup: true,
      avatarUrl: `https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=200&auto=format&fit=crop&q=80`,
      members: allMembers,
      lastMessage: `🎉 Event group created for ${eventDetails.title}`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      category: 'Groups',
      isEventGroup: true,
      eventDetails,
      aiAssistantEnabled: true,
    };

    setChats((prev) => [newChat, ...prev]);

    if (auth.currentUser) {
      const chatDocRef = doc(db, 'chats', newGroupId);
      await setDoc(chatDocRef, cleanFirestoreData({
        id: newGroupId,
        name,
        isGroup: true,
        avatarUrl: newChat.avatarUrl,
        members: allMembers,
        lastMessageText: newChat.lastMessage,
        lastMessageTimestamp: newChat.lastMessageTime,
        unreadCount: 0,
        isEventGroup: true,
        eventDetails,
        aiAssistantEnabled: true,
      })).catch((err) => handleFirestoreError(err, OperationType.CREATE, `chats/${newGroupId}`));
    }

    return newGroupId;
  };

  const updateEventDetails = async (chatId: string, eventDetails: EventDetails) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, eventDetails } : c))
    );
    if (auth.currentUser) {
      const chatDocRef = doc(db, 'chats', chatId);
      await updateDoc(chatDocRef, cleanFirestoreData({ eventDetails })).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`)
      );
    }
  };

  // Feature 4: Smart Friendship Timeline implementation
  const addTimelineMoment = async (chatId: string, momentData: Omit<TimelineMoment, 'id' | 'createdAt'>) => {
    const newMoment: TimelineMoment = {
      ...momentData,
      id: `moment_${Date.now()}`,
      createdAt: Date.now(),
    };
    setTimelineMoments((prev) => ({
      ...prev,
      [chatId]: [newMoment, ...(prev[chatId] || [])],
    }));

    if (auth.currentUser) {
      const mDocRef = doc(db, 'chats', chatId, 'timelineMoments', newMoment.id);
      await setDoc(mDocRef, cleanFirestoreData(newMoment)).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/timelineMoments/${newMoment.id}`)
      );
    }
  };

  // Feature 5: Memory Capsules implementation
  const unreadCapsulesCount = memoryCapsules.filter(
    (c) =>
      (c.recipientId === currentUser.id || c.recipientId === 'guest' || c.recipientName === 'You') &&
      c.isUnlocked &&
      !c.isRead &&
      !readCapsuleIds.includes(c.id)
  ).length;

  const markCapsuleNotificationsAsRead = async () => {
    const allCapsuleIds = memoryCapsules.map((c) => c.id);
    const updatedReadIds = Array.from(new Set([...readCapsuleIds, ...allCapsuleIds]));
    setReadCapsuleIds(updatedReadIds);
    try {
      localStorage.setItem('nexus_read_capsule_ids', JSON.stringify(updatedReadIds));
    } catch {}

    setMemoryCapsules((prev) => prev.map((c) => ({ ...c, isRead: true })));

    // Mark notifications of type capsule as read
    setNotifications((prev) =>
      prev.map((n) =>
        n.type === 'capsule' || n.title?.toLowerCase().includes('capsule')
          ? { ...n, isRead: true }
          : n
      )
    );

    if (auth.currentUser) {
      try {
        const unreadCaps = memoryCapsules.filter((c) => !c.isRead);
        for (const cap of unreadCaps) {
          updateDoc(doc(db, 'memoryCapsules', cap.id), { isRead: true }).catch(() => {});
        }
      } catch {}
    }
  };

  const createMemoryCapsule = async (capsuleData: Omit<MemoryCapsule, 'id' | 'createdAt' | 'isUnlocked'>) => {
    const newCapsule: MemoryCapsule = {
      ...capsuleData,
      id: `capsule_${Date.now()}`,
      createdAt: Date.now(),
      isUnlocked: Date.now() >= capsuleData.unlockTimestamp,
      isRead: false,
    };
    setMemoryCapsules((prev) => [newCapsule, ...prev]);

    if (auth.currentUser) {
      const capDocRef = doc(db, 'memoryCapsules', newCapsule.id);
      await setDoc(capDocRef, cleanFirestoreData(newCapsule)).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `memoryCapsules/${newCapsule.id}`)
      );

      // Send real notification to recipient if targeted
      if (capsuleData.recipientId && capsuleData.recipientId !== currentUser.id) {
        const notifId = 'notif_cap_' + Date.now();
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUserId: capsuleData.recipientId,
          senderUserId: currentUser.id,
          title: 'New Memory Capsule 🎁',
          description: `${currentUser.fullName} locked a memory capsule for you: "${capsuleData.title}".`,
          timestamp: 'Just now',
          createdAt: Date.now(),
          isRead: false,
          type: 'capsule',
          capsuleId: newCapsule.id,
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`));
      }
    }
  };

  const unlockMemoryCapsule = async (capsuleId: string) => {
    setMemoryCapsules((prev) =>
      prev.map((c) => (c.id === capsuleId ? { ...c, isUnlocked: true } : c))
    );
    if (auth.currentUser) {
      const capDocRef = doc(db, 'memoryCapsules', capsuleId);
      await updateDoc(capDocRef, { isUnlocked: true }).catch((err) =>
        handleFirestoreError(err, OperationType.UPDATE, `memoryCapsules/${capsuleId}`)
      );
    }
  };

  return (
    <AppContext.Provider
      value={{
        screen,
        authMode,
        activeTab,
        activeChatId,
        currentUser,
        chats,
        messages,
        stories,
        notifications,
        selectedCategory,
        searchQuery,
        theme,
        seenStoryIds,
        globalChatPin,
        setGlobalChatPin,
        imageQuality,
        setImageQuality,
        isPhoneFrameMode,
        activeCall,
        activeMediaViewer,
        activeProfilePhotoViewer,
        openProfilePhotoViewer,
        closeProfilePhotoViewer,
        activePostViewer,
        openPostViewer,
        closePostViewer,
        targetReelTarget,
        openReel,
        clearReelTarget,
        selectedProfileUser,
        openUserProfile,
        closeUserProfile,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        cancelFriendRequest,
        removeFriend,
        pushNotificationsEnabled,
        setPushNotificationsEnabled,
        readReceiptsEnabled,
        setReadReceiptsEnabled,
        blockedUsers,
        blockUser,
        unblockUser,
        autoDownloadMedia,
        setAutoDownloadMedia,
        storageUsageMB,
        clearCache,
        addStory,
        deleteStory,
        markStoryAsSeen,
        reactToStory,
        lockedChatPins,
        unlockedChatsInSession,
        lockChatWithPin,
        unlockChatWithPin,
        removeChatLock,
        setScreen,
        setAuthMode,
        setActiveTab,
        openChat,
        closeChat,
        sendMessage,
        addReaction,
        deleteMessage,
        editMessage,
        togglePinChat,
        toggleMuteChat,
        createNewChatWithUser,
        createNewGroup,
        setSelectedCategory,
        setSearchQuery,
        togglePhoneFrameMode,
        startCall,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
        toggleMute,
        toggleVideo,
        flipCamera,
        incomingCall,
        callHistory,
        allUsers,
        openMediaViewer,
        closeMediaViewer,
        login,
        signup,
        loginWithGoogle,
        updateProfile,
        logout,
        setTheme,
        isGlobalAiAssistantOpen,
        setIsGlobalAiAssistantOpen,
        markNotificationAsRead,

        // Feature exports
        chatDrafts,
        saveChatDraft,
        clearChatDraft,
        typingUsers,
        setTypingStatus,
        saveUserMood,
        createEventGroup,
        updateEventDetails,
        timelineMoments,
        addTimelineMoment,
        memoryCapsules,
        unreadCapsulesCount,
        markCapsuleNotificationsAsRead,
        createMemoryCapsule,
        unlockMemoryCapsule,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
