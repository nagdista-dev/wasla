import { getItem, getAllFromIndex, putItem, deleteItem, clearStore, isClientSide } from './indexedDbService';

const STORE = 'watchHistory';

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

export async function recordWatch(video: {
  videoId: string;
  title: string;
  channelId?: string;
  channelName?: string;
  thumbnail?: string;
  duration?: string;
  link: string;
}, watchTimeSeconds?: number, durationSeconds?: number): Promise<void> {
  if (!isClientSide()) return;
  const existing = await getEntry(video.videoId);
  const now = Date.now();

  const totalWatchTime = (existing?.totalWatchTime || 0) + (watchTimeSeconds || 0);
  const totalDuration = durationSeconds || existing?.durationSeconds || 0;
  const completionPercentage = totalDuration > 0
    ? Math.min(100, Math.round((totalWatchTime / totalDuration) * 100))
    : existing?.completionPercentage || 0;

  const entry: WatchHistoryEntry = {
    videoId: video.videoId,
    title: video.title,
    channelId: video.channelId || existing?.channelId,
    channelName: video.channelName || existing?.channelName,
    thumbnail: video.thumbnail || existing?.thumbnail,
    watchDate: existing?.watchDate || now,
    lastViewedAt: now,
    totalWatchTime,
    completionPercentage,
    duration: video.duration || existing?.duration,
    durationSeconds: totalDuration,
    link: video.link,
  };

  await putItem(STORE, entry);
}

export async function getEntry(videoId: string): Promise<WatchHistoryEntry | undefined> {
  if (!isClientSide()) return undefined;
  return getItem<WatchHistoryEntry>(STORE, videoId);
}

export async function getAllHistory(): Promise<WatchHistoryEntry[]> {
  if (!isClientSide()) return [];
  return getAllFromIndex<WatchHistoryEntry>(STORE, 'lastViewedAt', 'prev');
}

export async function removeEntry(videoId: string): Promise<void> {
  if (!isClientSide()) return;
  await deleteItem(STORE, videoId);
}

export async function clearAllHistory(): Promise<void> {
  if (!isClientSide()) return;
  await clearStore(STORE);
}

export async function searchHistory(query: string): Promise<WatchHistoryEntry[]> {
  if (!isClientSide() || !query.trim()) return getAllHistory();
  const all = await getAllHistory();
  const lower = query.toLowerCase();
  return all.filter(
    (e) =>
      e.title.toLowerCase().includes(lower) ||
      e.channelName?.toLowerCase().includes(lower)
  );
}
