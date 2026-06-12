export interface VideoData {
  title: string;
  link: string;
  thumbnail?: string;
  publishedDate: string;
  channelName: string;
  relativeTime?: string;
}

export interface ChannelFeedData {
  channelName: string;
  videos: VideoData[];
  latestVideo: VideoData;
  cached?: boolean;
}

export interface ChannelResponse {
  success: boolean;
  data?: ChannelFeedData;
  error?: string;
  cached?: boolean;
}

export interface CacheEntry {
  id: string;
  data: ChannelFeedData;
  timestamp: number;
}

export interface UpdateChannelRequest {
  name: string;
  categories?: string[];
}

// Force emission of JS file
export const __typesOnly = true;
