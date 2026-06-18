import { getItem, putItem, deleteItem, clearStore, isClientSide } from './indexedDbService';

const STORE = 'playbackProgress';
export const PLAYBACK_PROGRESS_EVENT = 'wasla:playback-progress';

export interface PlaybackProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
}

function isValidProgress(value: PlaybackProgress | undefined): value is PlaybackProgress {
  if (!value) return false;
  return (
    typeof value.videoId === 'string' &&
    value.videoId.length > 0 &&
    Number.isFinite(value.currentTime) &&
    Number.isFinite(value.duration) &&
    value.currentTime >= 0 &&
    value.duration > 0 &&
    value.currentTime <= value.duration + 2
  );
}

function notifyProgressChanged(videoId: string, progress?: PlaybackProgress): void {
  if (!isClientSide()) return;
  window.dispatchEvent(
    new CustomEvent(PLAYBACK_PROGRESS_EVENT, {
      detail: { videoId, progress },
    })
  );
}

export async function saveProgress(videoId: string, currentTime: number, duration: number): Promise<void> {
  if (!isClientSide()) return;
  if (!videoId || !Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;
  const progress: PlaybackProgress = {
    videoId,
    currentTime: Math.min(Math.max(currentTime, 0), duration),
    duration,
    lastUpdated: Date.now(),
  };
  await putItem(STORE, progress);
  notifyProgressChanged(videoId, progress);
}

export async function getProgress(videoId: string): Promise<PlaybackProgress | undefined> {
  if (!isClientSide()) return undefined;
  const progress = await getItem<PlaybackProgress>(STORE, videoId);
  if (!isValidProgress(progress)) {
    if (progress) await removeProgress(videoId);
    return undefined;
  }
  return progress;
}

export async function removeProgress(videoId: string): Promise<void> {
  if (!isClientSide()) return;
  await deleteItem(STORE, videoId);
  notifyProgressChanged(videoId);
}

export async function clearAllProgress(): Promise<void> {
  if (!isClientSide()) return;
  await clearStore(STORE);
}

export async function getAllProgress(): Promise<PlaybackProgress[]> {
  if (!isClientSide()) return [];
  const { getAll } = await import('./indexedDbService');
  const items = await getAll<PlaybackProgress>(STORE);
  return items.filter(isValidProgress);
}
