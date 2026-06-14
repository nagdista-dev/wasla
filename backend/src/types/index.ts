export interface VideoData {
  title: string;
  link: string;
  thumbnail?: string;
  publishedDate: string;
  channelName: string;
  relativeTime?: string;
  views?: number;
  duration?: string;
}

export interface ChannelFeedData {
  channelName: string;
  videos: VideoData[];
  latestVideo: VideoData;
  cached?: boolean;
}

export interface ChannelDetails {
  channelName: string;
  handle?: string;
  avatar?: string;
  banner?: string;
  videos: VideoData[];
}

export interface ChannelDetailsResponse {
  success: boolean;
  data?: ChannelDetails;
  error?: string;
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

export interface PlaylistResponse {
  success: boolean;
  data?: {
    playlistId: string;
    playlistName: string;
    channelName?: string;
    videos: VideoData[];
  };
  error?: string;
}

// Force emission of JS file
export const __typesOnly = true;
