import { useState, useEffect, useCallback } from 'react';
import { recordWatch, getEntry, getAllHistory, removeEntry, clearAllHistory, searchHistory, type WatchHistoryEntry } from '../services/watchHistoryService';

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getAllHistory();
      setHistory(entries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addEntry = useCallback(async (
    video: {
      videoId: string;
      title: string;
      channelId?: string;
      channelName?: string;
      thumbnail?: string;
      duration?: string;
      link: string;
    },
    watchTimeSeconds?: number,
    durationSeconds?: number,
  ) => {
    await recordWatch(video, watchTimeSeconds, durationSeconds);
    refresh();
  }, [refresh]);

  const remove = useCallback(async (videoId: string) => {
    await removeEntry(videoId);
    setHistory((prev) => prev.filter((e) => e.videoId !== videoId));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllHistory();
    setHistory([]);
  }, []);

  const search = useCallback(async (query: string) => {
    const results = await searchHistory(query);
    setHistory(results);
  }, []);

  const getByVideoId = useCallback(async (videoId: string) => {
    return getEntry(videoId);
  }, []);

  return {
    history,
    loading,
    refresh,
    addEntry,
    remove,
    clearAll,
    search,
    getByVideoId,
  };
}
