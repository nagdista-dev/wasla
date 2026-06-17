import { api } from '../api';
import type { Channel, ChannelLatestVideo, LatestVideo } from '../types';
import { loadCachedHomeVideos, saveHomeVideos } from './videoCacheService';

type ChannelApiResponse = {
  success: boolean;
  data?: {
    latestVideo?: LatestVideo;
    videos?: LatestVideo[];
    title?: string;
    link?: string;
    thumbnail?: string;
    publishedDate?: string;
    published?: string;
    channelName?: string;
  };
  error?: string;
  cached?: boolean;
};

interface HomeFeedMessages {
  couldNotFetch: string;
  noVideoFound: string;
}

function getLatestVideo(channel: Channel, data: ChannelApiResponse['data']): LatestVideo | undefined {
  if (data?.latestVideo) return data.latestVideo;

  const firstVideo = data?.videos?.[0];
  if (firstVideo) return firstVideo;

  if (data?.title || data?.link) {
    return {
      title: data.title || 'Untitled',
      link: data.link || `https://www.youtube.com/channel/${channel.id}`,
      thumbnail: data.thumbnail,
      publishedDate: data.publishedDate || data.published || '',
      channelName: data.channelName || channel.name,
    };
  }

  return undefined;
}

export async function loadHomeFeedFromCache(channels: Channel[]): Promise<ChannelLatestVideo[]> {
  return loadCachedHomeVideos(channels);
}

export async function refreshHomeFeed(
  channels: Channel[],
  messages: HomeFeedMessages,
  fallbackItems: ChannelLatestVideo[] = []
): Promise<ChannelLatestVideo[]> {
  if (channels.length === 0) return [];
  const fallbackByChannelId = new Map(fallbackItems.map((item) => [item.channel.id, item]));
  let successfulFetches = 0;

  const results = await Promise.allSettled(
    channels.map((channel) =>
      api.get<ChannelApiResponse>(`/channel/${encodeURIComponent(channel.id)}`).then((response) => ({
        channel,
        response,
      })),
    ),
  );

  const items: ChannelLatestVideo[] = results.map((result, index) => {
    const channel = channels[index];

    if (result.status === 'rejected') {
      const fallback = fallbackByChannelId.get(channel.id);
      if (fallback) return { ...fallback, loading: false };
      return {
        channel,
        loading: false,
        error: messages.couldNotFetch,
      };
    }

    const data = result.value.response.data.data;

    if (!result.value.response.data.success || !data) {
      const fallback = fallbackByChannelId.get(channel.id);
      if (fallback) return { ...fallback, loading: false };
      return {
        channel,
        loading: false,
        error: result.value.response.data.error || messages.couldNotFetch,
      };
    }

    successfulFetches += 1;
    return {
      channel,
      video: getLatestVideo(channel, data),
      loading: false,
      error: data.latestVideo || data.videos?.[0] || data.title ? undefined : messages.noVideoFound,
    };
  });

  if (successfulFetches > 0) {
    await saveHomeVideos(items).catch(() => {
      /* Fetched data should still render even if browser storage is unavailable. */
    });
  }
  return items;
}
