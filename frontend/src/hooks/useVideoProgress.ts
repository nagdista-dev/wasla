import { useEffect, useMemo, useState } from 'react';
import {
  getProgress,
  PLAYBACK_PROGRESS_EVENT,
  type PlaybackProgress,
} from '../services/playbackProgressService';
import { extractVideoId } from '../utils/videoUtils';

export function useVideoProgress(videoLink?: string) {
  const videoId = useMemo(() => (videoLink ? extractVideoId(videoLink) : null), [videoLink]);
  const [progress, setProgress] = useState<PlaybackProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!videoId) {
        setProgress(null);
        return;
      }
      const stored = await getProgress(videoId);
      if (!cancelled) {
        setProgress(stored ?? null);
      }
    };

    load();

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ videoId: string; progress?: PlaybackProgress }>).detail;
      if (detail?.videoId !== videoId) return;
      setProgress(detail.progress ?? null);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'wasla_playback_progress_sync') return;
      load();
    };

    window.addEventListener(PLAYBACK_PROGRESS_EVENT, handleProgress);
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(PLAYBACK_PROGRESS_EVENT, handleProgress);
      window.removeEventListener('storage', handleStorage);
    };
  }, [videoId]);

  if (!progress || progress.duration <= 0) return null;

  const watchedPercentage = Math.min(100, Math.max(0, (progress.currentTime / progress.duration) * 100));
  if (watchedPercentage <= 0) return null;

  return {
    ...progress,
    watchedPercentage,
  };
}
