import { Post } from '../types';

export const INITIAL_FEED_POSTS: Post[] = [
  {
    id: 'post_init_1',
    userId: 'user_alex',
    userName: 'Alex Rivera',
    userUsername: '@alexr',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    type: 'standard',
    caption: 'Clean geometry and soft shadows in industrial design.',
    media: [
      {
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
        type: 'image',
      },
    ],
    likesCount: 128,
    commentsCount: 14,
    sharesCount: 6,
    createdAt: Date.now() - 3600000,
  },
];
