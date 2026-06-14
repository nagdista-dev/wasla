export interface Channel {
  id: string;
  name: string;
  handle?: string;
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
