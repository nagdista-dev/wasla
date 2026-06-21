export interface Channel {
  id: string;
  name: string;
  handle?: string;
  username?: string;
  categories: string[];
  favorite?: boolean;
}

export interface LatestVideo {
  title: string;
  link: string;
  thumbnail?: string;
  publishedDate: string;
  channelName: string;
  relativeTime?: string;
  views?: number;
  duration?: string;
  description?: string;
  isLive?: boolean;
}

export interface ChannelLatestVideo {
  channel: Channel;
  video?: LatestVideo;
  loading: boolean;
  error?: string;
}

export interface ChannelDetailsData {
  channelName: string;
  handle?: string;
  avatar?: string;
  banner?: string;
  videos: LatestVideo[];
}

export interface ChannelDetailsResponse {
  success: boolean;
  data?: ChannelDetailsData;
  error?: string;
}

export interface Playlist {
  id: string;
  name: string;
  url?: string;
  thumbnail?: string;
  channelName?: string;
  description?: string;
  videoCount?: number;
  categories: string[];
  timestamp: number;
}

export interface WatchLaterItem {
  id: string;
  video: LatestVideo;
  channelName: string;
  channelId: string;
  savedAt: number;
  watched: boolean;
}

export interface CourseProgress {
  completedIds: string[];
  startDate?: string;
  completedDate?: string;
}

export interface FavoriteVideo {
  id: string;
  videoUrl: string;
  title: string;
  thumbnail?: string;
  channelName?: string;
  category?: string;
  savedAt: number;
}

export interface CourseVideo {
  id: string;
  videoUrl: string;
  title: string;
  thumbnail?: string;
  notes?: string;
  completed?: boolean;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  category?: string;
  videos: CourseVideo[];
  createdAt: number;
  updatedAt: number;
}

export interface WatchHistoryEntry {
  videoId: string;
  title: string;
  channelId?: string;
  channelName?: string;
  thumbnail?: string;
  watchDate: number;
  lastViewedAt: number;
  totalWatchTime: number;
  completionPercentage: number;
  duration?: string;
  durationSeconds?: number;
  link: string;
}

export interface PlaybackProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
}

export interface CommunityPost {
  id: string;
  channelId: string;
  channelName: string;
  channelCategories: string[];
  title?: string;
  content: string;
  link?: string;
  publishedAt: string;
  thumbnail?: string;
  images: string[];
  source: 'rsshub' | 'rsshub-fallback';
  fetchedAt: number;
}
