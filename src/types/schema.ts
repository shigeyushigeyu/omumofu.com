export interface UserProfile {
  uid: string;
  displayName: string;
  profileImageUrl: string;
  bio: string;
  tags: string[];
  kokoro?: string;
  tokimeki?: string[];
  privacySettings: {
    searchable: boolean;
    chatAcceptance: 'all' | 'mutual' | 'none';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  authorId: string;
  type: 'image' | 'novel';
  title: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likeCount: number;
  commentCount: number;
  isR18: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  userId: string;
  createdAt: Date;
}

export interface ChatRoom {
  id: string;
  members: string[]; // 参加者のUID配列
  lastMessage: string;
  lastUpdatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface EventContentBlock {
  id: string;
  type: 'text' | 'image';
  value: string;
}

export interface EventModel {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  coverImageUrl?: string;
  contents: EventContentBlock[];
  maxAttendees: number;
  currentAttendees: number;
  status: 'open' | 'full' | 'closed';
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}
