import { getItem, putItem, deleteItem, clearStore, isClientSide } from './indexedDbService';

const STORE = 'playbackProgress';

export interface PlaybackProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
}

export async function saveProgress(videoId: string, currentTime: number, duration: number): Promise<void> {
  if (!isClientSide()) return;
  const progress: PlaybackProgress = {
    videoId,
    currentTime,
    duration,
    lastUpdated: Date.now(),
  };
  await putItem(STORE, progress);
}

export async function getProgress(videoId: string): Promise<PlaybackProgress | undefined> {
  if (!isClientSide()) return undefined;
  return getItem<PlaybackProgress>(STORE, videoId);
}

export async function removeProgress(videoId: string): Promise<void> {
  if (!isClientSide()) return;
  await deleteItem(STORE, videoId);
}

export async function clearAllProgress(): Promise<void> {
  if (!isClientSide()) return;
  await clearStore(STORE);
}

export async function getAllProgress(): Promise<PlaybackProgress[]> {
  if (!isClientSide()) return [];
  const { getAll } = await import('./indexedDbService');
  return getAll<PlaybackProgress>(STORE);
}
