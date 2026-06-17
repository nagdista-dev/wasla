import type { Channel, ChannelLatestVideo, LatestVideo } from '../types';
import { extractVideoId } from '../utils/videoUtils';
import { getAll, getItem, isClientSide, putItem, replaceStoreItems } from './indexedDbService';

const VIDEO_CACHE_STORE = 'homeVideoCache';
const METADATA_STORE = 'appMetadata';
const LAST_SYNC_KEY = 'homeVideoCache:lastSync';

interface MetadataRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

export interface CachedHomeVideoItem {
  channelId: string;
  channel: Channel;
  videoId?: string;
  video?: LatestVideo;
  error?: string;
  fetchedAt: number;
}

function isChannel(value: unknown): value is Channel {
  if (!value || typeof value !== 'object') return false;
  const channel = value as Channel;
  return (
    typeof channel.id === 'string' &&
    typeof channel.name === 'string' &&
    Array.isArray(channel.categories)
  );
}

function isVideo(value: unknown): value is LatestVideo {
  if (!value || typeof value !== 'object') return false;
  const video = value as LatestVideo;
  return (
    typeof video.title === 'string' &&
    typeof video.link === 'string' &&
    typeof video.publishedDate === 'string' &&
    typeof video.channelName === 'string'
  );
}

function isCachedHomeVideoItem(value: unknown): value is CachedHomeVideoItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as CachedHomeVideoItem;
  return (
    typeof item.channelId === 'string' &&
    isChannel(item.channel) &&
    Number.isFinite(item.fetchedAt) &&
    (item.video === undefined || isVideo(item.video)) &&
    (item.error === undefined || typeof item.error === 'string')
  );
}

export async function loadCachedHomeVideos(channels: Channel[]): Promise<ChannelLatestVideo[]> {
  if (!isClientSide() || channels.length === 0) return [];

  const cached = await getAll<CachedHomeVideoItem>(VIDEO_CACHE_STORE);
  const byChannelId = new Map(
    cached
      .filter(isCachedHomeVideoItem)
      .map((item) => [item.channelId, item])
  );

  return channels.flatMap((channel) => {
    const item = byChannelId.get(channel.id);
    if (!item) return [];
    return [{
      channel,
      video: item.video,
      error: item.error,
      loading: false,
    }];
  });
}

export async function findCachedHomeVideoById(videoId: string): Promise<(LatestVideo & { channelId?: string }) | null> {
  if (!isClientSide() || !videoId) return null;

  const cached = await getAll<CachedHomeVideoItem>(VIDEO_CACHE_STORE);
  const match = cached
    .filter(isCachedHomeVideoItem)
    .find((item) => item.video && (item.videoId === videoId || extractVideoId(item.video.link) === videoId));

  return match?.video ? { ...match.video, channelId: match.channelId } : null;
}

export async function saveHomeVideos(items: ChannelLatestVideo[], fetchedAt = Date.now()): Promise<void> {
  if (!isClientSide()) return;

  const cacheItems: CachedHomeVideoItem[] = items.map((item) => ({
    channelId: item.channel.id,
    channel: item.channel,
    videoId: item.video ? extractVideoId(item.video.link) || undefined : undefined,
    video: item.video,
    error: item.error,
    fetchedAt,
  }));

  await replaceStoreItems(VIDEO_CACHE_STORE, cacheItems);
  await putItem<MetadataRecord<number>>(METADATA_STORE, {
    key: LAST_SYNC_KEY,
    value: fetchedAt,
    updatedAt: Date.now(),
  });
}

export async function getHomeVideosLastSync(): Promise<number | undefined> {
  if (!isClientSide()) return undefined;
  const record = await getItem<MetadataRecord<number>>(METADATA_STORE, LAST_SYNC_KEY);
  return typeof record?.value === 'number' ? record.value : undefined;
}
