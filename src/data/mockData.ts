import { User, NotificationItem } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    fullName: 'Alex Rivera',
    username: '@alexr',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Product Designer & Visual Creator. Passionate about clean UX and motion.',
    isOnline: true,
    followersCount: 1240,
    followingCount: 380,
    postsCount: 24,
  },
  {
    id: 'user_sophia',
    name: 'Sophia Chen',
    fullName: 'Sophia Chen',
    username: '@sophiac',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    bio: 'Mobile Engineer & Tech Enthusiast. Building next-gen apps.',
    isOnline: false,
    followersCount: 950,
    followingCount: 210,
    postsCount: 18,
  },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    userId: 'user_alex',
    type: 'like',
    title: 'New Like',
    body: 'Sophia Chen liked your photo.',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    isRead: false,
    createdAt: Date.now() - 3600000,
  },
];

export function getUserIsolatedInitialStore(_userId: string) {
  return {
    user: MOCK_USERS[0],
    chats: [],
    contacts: MOCK_USERS,
    stories: [],
    posts: [],
  };
}
