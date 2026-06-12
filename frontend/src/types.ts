export interface Channel {
  id: string;
  name: string;
  handle?: string;
  categories: string[];
}

export interface LatestVideo {
  title: string;
  link: string;
  thumbnail?: string;
  publishedDate: string;
  channelName: string;
  relativeTime?: string;
}

export interface ChannelLatestVideo {
  channel: Channel;
  video?: LatestVideo;
  loading: boolean;
  error?: string;
}
