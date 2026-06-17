import { useCallback, useEffect, useRef } from 'react';
import { saveProgress, getProgress, removeProgress, type PlaybackProgress } from '../services/playbackProgressService';

const SAVE_INTERVAL_MS = 4000;

export function usePlaybackResume(videoId?: string) {
  const lastSavedRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePosition = useCallback((currentTime: number, duration: number) => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
  }, []);

  const doSave = useCallback(async () => {
    if (!videoId || durationRef.current <= 0) return;
    if (Date.now() - lastSavedRef.current < 1000) return;
    await saveProgress(videoId, currentTimeRef.current, durationRef.current);
    lastSavedRef.current = Date.now();
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    intervalRef.current = setInterval(() => {
      doSave();
    }, SAVE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [videoId, doSave]);

  const saveOnPause = useCallback(async () => {
    await doSave();
  }, [doSave]);

  const saveBeforeUnload = useCallback(() => {
    if (!videoId || durationRef.current <= 0) return;
    try {
      localStorage.setItem(
        `wasla_resume_${videoId}`,
        JSON.stringify({
          currentTime: currentTimeRef.current,
          duration: durationRef.current,
          lastUpdated: Date.now(),
        })
      );
    } catch { /* ignore */ }
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    const handler = () => saveBeforeUnload();
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      doSave();
    };
  }, [videoId, saveBeforeUnload, doSave]);

  const loadProgress = useCallback(async (): Promise<PlaybackProgress | null> => {
    if (!videoId) return null;
    try {
      const stored = localStorage.getItem(`wasla_resume_${videoId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.removeItem(`wasla_resume_${videoId}`);
        return parsed;
      }
    } catch { /* ignore */ }
    const progress = await getProgress(videoId);
    return progress || null;
  }, [videoId]);

  const clearProgress = useCallback(async () => {
    if (!videoId) return;
    await removeProgress(videoId);
    try {
      localStorage.removeItem(`wasla_resume_${videoId}`);
    } catch { /* ignore */ }
  }, [videoId]);

  return {
    updatePosition,
    saveOnPause,
    loadProgress,
    clearProgress,
  };
}
